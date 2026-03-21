import * as vscode from 'vscode';
import { spawn, ChildProcess } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { TypedEvent } from '../core/events';
import { SpeechError } from '../core/errors';

const MAX_RECORDING_MS = 60_000; // 60s safety cap

/**
 * Records audio using a **pre-warmed** PowerShell process.
 *
 * On construction, spawns PowerShell and compiles the C# interop once (~2-3s).
 * After warm-up, start()/stop() are near-instant (~10ms) because they just
 * send commands to the already-running process via stdin.
 *
 * Protocol (extension ↔ PowerShell via stdin/stdout lines):
 *   Extension sends          PowerShell responds
 *   ─────────────────────    ────────────────────
 *   (process starts)     →   "READY"
 *   "record <filepath>"  →   "RECORDING"
 *   "stop"               →   "SAVED"
 *   "exit"               →   (process exits)
 */
export class AudioRecorder implements vscode.Disposable {
  private proc: ChildProcess | null = null;
  private tempWav = '';
  private recording = false;
  private warm = false;
  private safetyTimer: ReturnType<typeof setTimeout> | null = null;

  // Pending resolvers for async command responses
  private readyResolver: (() => void) | null = null;
  private recordingResolver: (() => void) | null = null;
  private savedResolver: (() => void) | null = null;

  private readonly _onError = new TypedEvent<SpeechError>();
  readonly onError = this._onError.event;

  private readonly _onStopped = new TypedEvent<void>();
  readonly onStopped = this._onStopped.event;

  /** Whether recording is available (Windows desktop only) */
  isAvailable(): boolean {
    if (vscode.env.remoteName) return false;
    return process.platform === 'win32';
  }

  /** Get reason why recording is unavailable */
  getUnavailableReason(): string {
    if (vscode.env.remoteName) {
      return 'Voice input is not available in remote environments.';
    }
    if (process.platform !== 'win32') {
      return 'Voice input currently requires Windows. macOS/Linux support coming in Phase 4.';
    }
    return 'Voice input is not available.';
  }

  isRecording(): boolean {
    return this.recording;
  }

  isWarm(): boolean {
    return this.warm;
  }

  /**
   * Spawn the PowerShell process and compile the C# interop.
   * Call this once on extension activation — it resolves when the
   * process is ready to accept "record" commands instantly.
   */
  async warmUp(): Promise<void> {
    if (this.warm || this.proc) return;
    if (!this.isAvailable()) return;

    this.spawnProcess();

    // Wait for "READY" signal (C# compiled, process warm)
    return new Promise<void>((resolve) => {
      this.readyResolver = resolve;
      // Timeout: if PowerShell doesn't respond in 10s, resolve anyway
      setTimeout(() => {
        if (this.readyResolver) {
          this.readyResolver = null;
          resolve();
        }
      }, 10_000);
    });
  }

  /**
   * Start recording audio. Near-instant if warmUp() was called.
   * Resolves when PowerShell confirms "RECORDING".
   */
  async start(): Promise<void> {
    if (this.recording) {
      await this.stop();
    }

    if (!this.isAvailable()) {
      throw new SpeechError(
        'Audio recorder not available',
        this.getUnavailableReason(),
      );
    }

    // If not warm yet, warm up now (first-time fallback)
    if (!this.warm || !this.proc) {
      await this.warmUp();
    }

    if (!this.proc) {
      throw new SpeechError(
        'PowerShell process not available',
        'Could not start audio recording. Try reloading VS Code.',
      );
    }

    this.tempWav = path.join(os.tmpdir(), 'prother-' + Date.now() + '.wav');

    // Send record command — PowerShell responds with "RECORDING"
    return new Promise<void>((resolve, reject) => {
      this.recordingResolver = () => {
        this.recording = true;

        // Safety cap: auto-stop after 60s
        this.safetyTimer = setTimeout(() => {
          if (this.recording) {
            void this.stop();
          }
        }, MAX_RECORDING_MS);

        resolve();
      };

      try {
        const wavPathForPs = this.tempWav.replace(/\\/g, '\\\\');
        this.proc!.stdin?.write('record ' + wavPathForPs + '\n');
      } catch (err) {
        this.recordingResolver = null;
        reject(new SpeechError(
          'Failed to send record command: ' + (err instanceof Error ? err.message : String(err)),
          'Could not start recording. Try reloading VS Code.',
        ));
      }

      // Timeout: if no "RECORDING" response in 3s, reject
      setTimeout(() => {
        if (this.recordingResolver) {
          this.recordingResolver = null;
          reject(new SpeechError(
            'Timeout waiting for RECORDING response',
            'Recording did not start. Try pressing Ctrl+Shift+V again.',
          ));
        }
      }, 3000);
    });
  }

  /** Stop recording and return the WAV file as a Buffer */
  async stop(): Promise<Buffer | null> {
    if (!this.recording) return null;
    this.recording = false;

    if (this.safetyTimer) {
      clearTimeout(this.safetyTimer);
      this.safetyTimer = null;
    }

    if (!this.proc) return null;

    // Send stop command — PowerShell responds with "SAVED"
    await new Promise<void>((resolve) => {
      this.savedResolver = resolve;

      try {
        this.proc!.stdin?.write('stop\n');
      } catch {
        this.savedResolver = null;
        resolve();
      }

      // Timeout: if no "SAVED" response in 5s, resolve anyway
      setTimeout(() => {
        if (this.savedResolver) {
          this.savedResolver = null;
          resolve();
        }
      }, 5000);
    });

    this._onStopped.fire();

    // Read the WAV file
    try {
      if (fs.existsSync(this.tempWav)) {
        const wav = fs.readFileSync(this.tempWav);
        this.cleanupWav();
        // WAV header is 44 bytes — if just the header, no audio
        if (wav.length <= 44) return null;
        return wav;
      }
    } catch {
      // File read failed
    }

    this.cleanupWav();
    return null;
  }

  /** Spawn the long-lived PowerShell process */
  private spawnProcess(): void {
    const scriptPath = path.join(os.tmpdir(), 'prother-recorder.ps1');
    fs.writeFileSync(scriptPath, buildPsLoopScript(), 'utf8');

    this.proc = spawn('powershell', [
      '-NoProfile',
      '-NonInteractive',
      '-ExecutionPolicy', 'Bypass',
      '-File', scriptPath,
    ], {
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: true,
    });

    // Parse stdout lines for protocol messages
    let buffer = '';
    this.proc.stdout?.on('data', (data: Buffer) => {
      buffer += data.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? ''; // keep incomplete last line

      for (const rawLine of lines) {
        const line = rawLine.trim();
        if (line === 'READY') {
          this.warm = true;
          if (this.readyResolver) {
            this.readyResolver();
            this.readyResolver = null;
          }
        } else if (line === 'RECORDING') {
          if (this.recordingResolver) {
            this.recordingResolver();
            this.recordingResolver = null;
          }
        } else if (line === 'SAVED') {
          if (this.savedResolver) {
            this.savedResolver();
            this.savedResolver = null;
          }
        } else if (line.startsWith('ERROR:')) {
          const msg = line.replace('ERROR:', '').trim();
          this._onError.fire(
            new SpeechError(msg, 'Audio recording failed. Check your microphone.'),
          );
        }
      }
    });

    this.proc.stderr?.on('data', (data: Buffer) => {
      const msg = data.toString().trim();
      if (msg) {
        this._onError.fire(
          new SpeechError('PowerShell: ' + msg, 'Audio recording failed.'),
        );
      }
    });

    this.proc.on('error', (err) => {
      this._onError.fire(
        new SpeechError(
          'PowerShell process error: ' + err.message,
          'Could not start audio recording.',
        ),
      );
      this.proc = null;
      this.warm = false;
    });

    this.proc.on('close', () => {
      this.proc = null;
      this.warm = false;
      this.recording = false;
    });
  }

  private cleanupWav(): void {
    try {
      if (this.tempWav && fs.existsSync(this.tempWav)) {
        fs.unlinkSync(this.tempWav);
      }
    } catch { /* best effort */ }
    this.tempWav = '';
  }

  dispose(): void {
    this.recording = false;
    if (this.safetyTimer) {
      clearTimeout(this.safetyTimer);
      this.safetyTimer = null;
    }
    if (this.proc) {
      try {
        this.proc.stdin?.write('exit\n');
      } catch { /* ignore */ }
      setTimeout(() => this.proc?.kill(), 1000);
    }
    this.cleanupWav();
    this._onError.dispose();
    this._onStopped.dispose();
  }
}

/**
 * Build the PowerShell script that runs as a long-lived command loop.
 * Phase 1: Compile C# interop (slow, happens once).
 * Phase 2: Loop waiting for commands via stdin (instant responses).
 */
function buildPsLoopScript(): string {
  const lines = [
    '# Prother audio recorder — long-lived PowerShell process',
    '# Protocol: receives commands on stdin, responds on stdout',
    '',
    '# Phase 1: Compile C# interop (slow, ~2s)',
    'Add-Type -TypeDefinition @"',
    'using System;',
    'using System.Runtime.InteropServices;',
    'using System.Text;',
    'public class WinMM {',
    '    [DllImport("winmm.dll", CharSet = CharSet.Auto)]',
    '    public static extern int mciSendString(string command, StringBuilder returnValue, int returnLength, IntPtr hwndCallback);',
    '}',
    '"@',
    '',
    '[Console]::Out.WriteLine("READY")',
    '[Console]::Out.Flush()',
    '',
    '# Phase 2: Command loop',
    '$recording = $false',
    'while ($true) {',
    '    try {',
    '        $line = [Console]::In.ReadLine()',
    '    } catch {',
    '        break',
    '    }',
    '    if ($null -eq $line) { break }',
    '    $line = $line.Trim()',
    '',
    '    if ($line -eq "exit") {',
    '        if ($recording) {',
    '            [WinMM]::mciSendString("stop prother_rec", $null, 0, [IntPtr]::Zero) | Out-Null',
    '            [WinMM]::mciSendString("close prother_rec", $null, 0, [IntPtr]::Zero) | Out-Null',
    '        }',
    '        break',
    '    }',
    '',
    '    if ($line.StartsWith("record ")) {',
    '        $file = $line.Substring(7).Trim()',
    '        $sb = New-Object System.Text.StringBuilder 256',
    '        $r = [WinMM]::mciSendString("open new Type waveaudio Alias prother_rec", $sb, 256, [IntPtr]::Zero)',
    '        if ($r -ne 0) {',
    '            [Console]::Out.WriteLine("ERROR:Cannot open audio device (code $r)")',
    '            [Console]::Out.Flush()',
    '            continue',
    '        }',
    '        $r = [WinMM]::mciSendString("record prother_rec", $sb, 256, [IntPtr]::Zero)',
    '        if ($r -ne 0) {',
    '            [WinMM]::mciSendString("close prother_rec", $null, 0, [IntPtr]::Zero) | Out-Null',
    '            [Console]::Out.WriteLine("ERROR:Cannot start recording (code $r)")',
    '            [Console]::Out.Flush()',
    '            continue',
    '        }',
    '        $recording = $true',
    '        $global:wavFile = $file',
    '        [Console]::Out.WriteLine("RECORDING")',
    '        [Console]::Out.Flush()',
    '        continue',
    '    }',
    '',
    '    if ($line -eq "stop") {',
    '        if ($recording) {',
    '            [WinMM]::mciSendString("stop prother_rec", $null, 0, [IntPtr]::Zero) | Out-Null',
    '            [WinMM]::mciSendString("save prother_rec ""$($global:wavFile)""", $null, 0, [IntPtr]::Zero) | Out-Null',
    '            [WinMM]::mciSendString("close prother_rec", $null, 0, [IntPtr]::Zero) | Out-Null',
    '            $recording = $false',
    '        }',
    '        [Console]::Out.WriteLine("SAVED")',
    '        [Console]::Out.Flush()',
    '        continue',
    '    }',
    '}',
  ];
  return lines.join('\r\n');
}
