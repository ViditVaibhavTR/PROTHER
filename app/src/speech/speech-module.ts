import * as vscode from 'vscode';
import { TypedEvent } from '../core/events';
import { SpeechError } from '../core/errors';
import { SPEECH_EXTENSION_ID } from '../core/constants';
import { TranscriptBuilder } from './transcript-builder';
import { SilenceDetector } from './silence-detector';
import { SpeechEventType } from '../core/types';
import type { TranscriptEvent, VsCodeSpeechApi } from '../core/types';

type SpeechStatus = 'listening' | 'processing' | 'idle';

/**
 * Wraps VS Code Speech API for voice-to-text.
 * Manages microphone session lifecycle, accumulates transcripts,
 * and detects end-of-utterance via silence timeout.
 */
export class SpeechModule implements vscode.Disposable {
  private session: vscode.Disposable | null = null;
  private readonly transcriptBuilder = new TranscriptBuilder();
  private readonly silenceDetector: SilenceDetector;
  private readonly disposables: vscode.Disposable[] = [];

  private readonly _onTranscript = new TypedEvent<TranscriptEvent>();
  readonly onTranscript = this._onTranscript.event;

  private readonly _onError = new TypedEvent<SpeechError>();
  readonly onError = this._onError.event;

  private readonly _onStatusChange = new TypedEvent<SpeechStatus>();
  readonly onStatusChange = this._onStatusChange.event;

  constructor() {
    this.silenceDetector = new SilenceDetector();
    this.disposables.push(this.silenceDetector);

    // When silence is detected, finalize and emit the complete transcript
    this.disposables.push(
      this.silenceDetector.onSilenceDetected(() => {
        this.transcriptBuilder.finalize();
        const text = this.transcriptBuilder.getFullTranscript();
        if (text) {
          this._onTranscript.fire({ text, isFinal: true });
        }
        this.stopListening();
      }),
    );
  }

  /** Check if the speech environment is available */
  isAvailable(): boolean {
    if (vscode.env.remoteName) return false;
    if (!this.getSpeechApi()) return false;
    if (!vscode.extensions.getExtension(SPEECH_EXTENSION_ID)) return false;
    return true;
  }

  /** Start a speech-to-text session */
  async startListening(): Promise<void> {
    if (this.session) {
      this.stopListening();
    }

    const speechApi = this.getSpeechApi();
    if (!speechApi) {
      this._onError.fire(
        new SpeechError('Speech not available', 'Voice input is not available in this environment.'),
      );
      return;
    }

    try {
      this.transcriptBuilder.reset();
      this._onStatusChange.fire('listening');

      const tokenSource = new vscode.CancellationTokenSource();
      const speechSession = speechApi.createSpeechToTextSession(tokenSource.token);

      const resultDisposable = speechSession.onDidChange((e) => {
        if (e.type === SpeechEventType.Recognizing) {
          this.transcriptBuilder.addPartial(e.text);
          this.silenceDetector.onSpeechActivity();
          this._onTranscript.fire({
            text: this.transcriptBuilder.getFullTranscript(),
            isFinal: false,
          });
        } else if (e.type === SpeechEventType.Recognized) {
          this.transcriptBuilder.addPartial(e.text);
          this.transcriptBuilder.finalize();
          this.silenceDetector.onSpeechActivity();
          this._onTranscript.fire({
            text: this.transcriptBuilder.getFullTranscript(),
            isFinal: false,
          });
        }
      });

      this.session = {
        dispose: () => {
          resultDisposable.dispose();
          tokenSource.cancel();
          tokenSource.dispose();
        },
      };

      this.silenceDetector.start();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this._onError.fire(new SpeechError(`Speech session failed: ${message}`));
      this._onStatusChange.fire('idle');
    }
  }

  /** Stop listening and clean up */
  stopListening(): void {
    this.silenceDetector.stop();
    if (this.session) {
      this.session.dispose();
      this.session = null;
    }
    this._onStatusChange.fire('idle');
  }

  /** Force-finalize and return whatever transcript we have so far */
  finalizeAndGet(): string {
    this.transcriptBuilder.finalize();
    return this.transcriptBuilder.getFullTranscript();
  }

  /** Whether there's any captured text */
  hasTranscript(): boolean {
    return !this.transcriptBuilder.isEmpty();
  }

  /** Get the speech API if available, or null */
  private getSpeechApi(): VsCodeSpeechApi | null {
    const speech = (vscode as Record<string, unknown>).speech;
    if (typeof speech === 'undefined') return null;
    return speech as VsCodeSpeechApi;
  }

  dispose(): void {
    this.stopListening();
    for (const d of this.disposables) {
      d.dispose();
    }
    this._onTranscript.dispose();
    this._onError.dispose();
    this._onStatusChange.dispose();
  }
}
