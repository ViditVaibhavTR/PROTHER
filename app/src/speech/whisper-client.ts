import { execFile } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { SpeechError } from '../core/errors';

/**
 * Transcribe a WAV audio buffer using local faster-whisper.
 * Writes WAV to temp file, calls Python transcribe.py, returns text.
 * Zero API keys needed — runs entirely on-device.
 */
export async function transcribeAudio(wavBuffer: Buffer): Promise<string> {
  // Write WAV to temp file
  const tempWav = path.join(os.tmpdir(), 'prother-transcribe-' + Date.now() + '.wav');
  fs.writeFileSync(tempWav, wavBuffer);

  try {
    const text = await runTranscription(tempWav);
    return text.trim();
  } finally {
    // Cleanup temp file
    try { fs.unlinkSync(tempWav); } catch { /* ignore */ }
  }
}

function runTranscription(wavPath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    // Find the transcribe.py script
    // When running from source: app/scripts/transcribe.py
    // When installed as VSIX: extension/scripts/transcribe.py
    const scriptCandidates = [
      path.join(__dirname, '..', 'scripts', 'transcribe.py'),
      path.join(__dirname, '..', '..', 'scripts', 'transcribe.py'),
      path.join(__dirname, 'scripts', 'transcribe.py'),
    ];

    let scriptPath = '';
    for (const candidate of scriptCandidates) {
      if (fs.existsSync(candidate)) {
        scriptPath = candidate;
        break;
      }
    }

    if (!scriptPath) {
      reject(new SpeechError(
        'transcribe.py not found in: ' + scriptCandidates.join(', '),
        'Transcription script not found. Reinstall the extension.',
      ));
      return;
    }

    execFile('python', [scriptPath, wavPath], {
      timeout: 30000, // 30s max for transcription
      windowsHide: true,
      env: { ...process.env },
    }, (error, stdout, stderr) => {
      if (error) {
        const msg = stderr?.trim() || error.message;
        if (msg.includes('faster-whisper not installed')) {
          reject(new SpeechError(
            msg,
            'faster-whisper is not installed. Run: pip install faster-whisper',
          ));
        } else {
          reject(new SpeechError(
            'Transcription failed: ' + msg,
            'Speech recognition failed. Check that Python and faster-whisper are installed.',
          ));
        }
        return;
      }

      resolve(stdout.trim());
    });
  });
}
