import { execFile } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { SpeechError } from '../core/errors';

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
 * Pre-download the Whisper model in the background.
 * Call this on extension activation so the first transcription is fast.
 */
export function preloadWhisperModel(): Promise<void> {
  return new Promise((resolve) => {
    const scriptPath = findScript();
    if (!scriptPath) {
      resolve(); // silently skip if script not found
      return;
    }

    execFile('python', [scriptPath, '--preload'], {
      timeout: 120_000, // 2 min for model download
      windowsHide: true,
      env: { ...process.env },
    }, (error) => {
      // Resolve regardless — preload is best-effort
      if (error) {
        // Model will download on first transcription instead
      }
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

    execFile('python', [scriptPath, wavPath], {
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
        } else {
          reject(new SpeechError(
            'Transcription failed: ' + msg,
            'Speech recognition failed. Check that Python and Moonshine ONNX are installed.',
          ));
        }
        return;
      }

      resolve(stdout.trim());
    });
  });
}
