import * as vscode from 'vscode';
import { spawn, ChildProcess } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { TypedEvent } from '../core/events';
import { SpeechError } from '../core/errors';

const MAX_RECORDING_MS = 60_000; // 60s safety cap

/**
 * Records audio using SoX (Sound eXchange) portable.
 *
 * SoX is bundled as vendor/sox-14.4.2/sox.exe (~2MB).
 * Uses `-t waveaudio default` to capture from the default Windows audio device.
 * Recording starts instantly (no PowerShell compile step).
 *
 * Flow:
 *   start() → spawn sox.exe recording to temp WAV
 *   stop()  → kill sox process, read WAV file
 */
export class AudioRecorder implements vscode.Disposable {
  private proc: ChildProcess | null = null;
  private tempWav = '';
  private recording = false;
  private safetyTimer: ReturnType<typeof setTimeout> | null = null;
  private soxPath: string | null = null;

  private readonly _onError = new TypedEvent<SpeechError>();
  readonly onError = this._onError.event;

  private readonly _onStopped = new TypedEvent<void>();
  readonly onStopped = this._onStopped.event;

  /** Whether recording is available (Windows + SoX found) */
  isAvailable(): boolean {
    if (vscode.env.remoteName) return false;
    if (process.platform !== 'win32') return false;
    return this.findSox() !== null;
  }

  /** Get reason why recording is unavailable */
  getUnavailableReason(): string {
    if (vscode.env.remoteName) {
      return 'Voice input is not available in remote environments.';
    }
    if (process.platform !== 'win32') {
      return 'Voice input currently requires Windows.';
    }
    if (!this.findSox()) {
      return 'SoX audio tool not found. Reinstall the extension.';
    }
    return 'Voice input is not available.';
  }

  isRecording(): boolean {
    return this.recording;
  }

  /** No warm-up needed for SoX — it starts instantly */
  async warmUp(): Promise<void> {
    // Just verify SoX exists
    this.findSox();
  }

  /** Start recording audio from the default microphone */
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

    const sox = this.findSox();
    if (!sox) {
      throw new SpeechError(
        'SoX not found',
        'SoX audio tool not found. Reinstall the extension.',
      );
    }

    this.tempWav = path.join(os.tmpdir(), 'prother-' + Date.now() + '.wav');

    // sox -t waveaudio default -r 16000 -c 1 -b 16 output.wav
    this.proc = spawn(sox, [
      '-t', 'waveaudio', 'default',  // input: default Windows audio device
      '-r', '16000',                   // 16kHz sample rate (optimal for Whisper/Moonshine)
      '-c', '1',                       // mono
      '-b', '16',                      // 16-bit
      this.tempWav,                    // output WAV file
    ], {
      windowsHide: true,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    this.proc.on('error', (err) => {
      this._onError.fire(
        new SpeechError(
          'SoX process error: ' + err.message,
          'Could not start audio recording.',
        ),
      );
      this.recording = false;
    });

    this.proc.on('close', () => {
      this.proc = null;
    });

    this.recording = true;

    // Safety cap: auto-stop after 60s
    this.safetyTimer = setTimeout(() => {
      if (this.recording) {
        void this.stop();
      }
    }, MAX_RECORDING_MS);
  }

  /** Stop recording and return the WAV file as a Buffer */
  async stop(): Promise<Buffer | null> {
    if (!this.recording) return null;
    this.recording = false;

    if (this.safetyTimer) {
      clearTimeout(this.safetyTimer);
      this.safetyTimer = null;
    }

    if (this.proc) {
      // Send Ctrl+C (SIGINT) to stop SoX gracefully — it finalizes the WAV header
      this.proc.kill('SIGINT');

      // Wait for process to finish (max 3s)
      const currentProc = this.proc;
      await new Promise<void>((resolve) => {
        const timeout = setTimeout(() => {
          currentProc?.kill();
          resolve();
        }, 3000);

        currentProc.on('close', () => {
          clearTimeout(timeout);
          resolve();
        });
      });
    }

    this._onStopped.fire();

    // Read the WAV file
    try {
      if (fs.existsSync(this.tempWav)) {
        const wav = fs.readFileSync(this.tempWav);
        // WAV header is 44 bytes — if just the header, no audio
        if (wav.length <= 44) return null;
        return wav;
      }
    } catch {
      // File read failed
    } finally {
      this.cleanupWav();
    }

    return null;
  }

  /** Find the bundled SoX executable */
  private findSox(): string | null {
    if (this.soxPath) return this.soxPath;

    const candidates = [
      path.join(__dirname, '..', 'vendor', 'sox-14.4.2', 'sox.exe'),
      path.join(__dirname, '..', '..', 'vendor', 'sox-14.4.2', 'sox.exe'),
      path.join(__dirname, 'vendor', 'sox-14.4.2', 'sox.exe'),
    ];

    for (const candidate of candidates) {
      if (fs.existsSync(candidate)) {
        this.soxPath = candidate;
        return candidate;
      }
    }

    return null;
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
    if (this.recording) {
      this.recording = false;
      this.proc?.kill('SIGINT');
    }
    if (this.safetyTimer) {
      clearTimeout(this.safetyTimer);
    }
    this.cleanupWav();
    this._onError.dispose();
    this._onStopped.dispose();
  }
}
