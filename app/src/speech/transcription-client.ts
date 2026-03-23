import { execFile, execFileSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { SpeechError } from '../core/errors';

/** Cache the discovered Python command so we only probe once */
let cachedPython: string | null = null;

/**
 * Find a working Python executable.
 * Tries: python, python3, py (Windows launcher).
 */
function findPython(): string {
  if (cachedPython) return cachedPython;

  for (const cmd of ['python', 'python3', 'py']) {
    try {
      execFileSync(cmd, ['--version'], { timeout: 3000, windowsHide: true, stdio: 'pipe' });
      cachedPython = cmd;
      return cmd;
    } catch {
      // Try next
    }
  }

  throw new SpeechError(
    'Python not found in PATH',
    'Python is required for voice-to-text. Install Python 3.10+ from python.org and ensure it\'s in your PATH.',
  );
}

/**
 * Transcribe a WAV audio buffer using local Moonshine ONNX.
 * Writes WAV to temp file, calls Python transcribe.py, returns text.
 * Zero API keys needed — runs entirely on-device.
 */
export async function transcribeAudio(wavBuffer: Buffer): Promise<string> {
  const tempWav = path.join(os.tmpdir(), 'prother-transcribe-' + Date.now() + '.wav');
  fs.writeFileSync(tempWav, wavBuffer);

  try {
    const text = await runTranscription(tempWav);
    return text.trim();
  } finally {
    try { fs.unlinkSync(tempWav); } catch { /* ignore */ }
  }
}

/**
 * Pre-download the Moonshine model in the background.
 * Call this on extension activation so the first transcription is fast.
 */
export function preloadModel(): Promise<void> {
  return new Promise((resolve) => {
    const scriptPath = findScript();
    if (!scriptPath) {
      resolve();
      return;
    }

    let python: string;
    try {
      python = findPython();
    } catch {
      resolve(); // No Python — skip preload silently
      return;
    }

    execFile(python, [scriptPath, '--preload'], {
      timeout: 120_000, // 2 min for model download
      windowsHide: true,
      env: { ...process.env },
    }, () => {
      // Resolve regardless — preload is best-effort
      resolve();
    });
  });
}

function findScript(): string | null {
  const candidates = [
    path.join(__dirname, '..', 'scripts', 'transcribe.py'),
    path.join(__dirname, '..', '..', 'scripts', 'transcribe.py'),
    path.join(__dirname, 'scripts', 'transcribe.py'),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return null;
}

function runTranscription(wavPath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const scriptPath = findScript();

    if (!scriptPath) {
      reject(new SpeechError(
        'transcribe.py not found',
        'Transcription script not found. Reinstall the extension.',
      ));
      return;
    }

    let python: string;
    try {
      python = findPython();
    } catch (err) {
      reject(err);
      return;
    }

    execFile(python, [scriptPath, wavPath], {
      timeout: 30000,
      windowsHide: true,
      env: { ...process.env },
    }, (error, stdout, stderr) => {
      if (error) {
        const msg = stderr?.trim() || error.message;
        if (msg.includes('moonshine not installed')) {
          reject(new SpeechError(
            msg,
            'Moonshine is not installed. Run: pip install useful-moonshine-onnx',
          ));
        } else if (msg.includes('ENOENT') || msg.includes('not found') || msg.includes('not recognized')) {
          reject(new SpeechError(
            'Python not found: ' + msg,
            'Python is required for voice-to-text. Install Python 3.10+ from python.org.',
          ));
        } else {
          reject(new SpeechError(
            'Transcription failed: ' + msg,
            'Speech recognition failed. Check Output > Prother for details.',
          ));
        }
        return;
      }

      resolve(stdout.trim());
    });
  });
}
