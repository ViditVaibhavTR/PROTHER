import * as vscode from 'vscode';
import { TypedEvent } from '../core/events';
import { SpeechError } from '../core/errors';
import { TranscriptBuilder } from './transcript-builder';
import { AudioRecorder } from './audio-recorder';
import { transcribeAudio } from './transcription-client';
import type { TranscriptEvent, SpeechStatus } from '../core/types';

export type { SpeechStatus };

/**
 * Captures voice input using PowerShell-based native audio recording,
 * then transcribes via local faster-whisper.
 *
 * Zero visible UI — status bar provides all feedback.
 * Zero API keys — runs entirely on-device.
 * Toggle: Ctrl+Shift+V starts, Ctrl+Shift+V again stops and transcribes.
 * Pre-warmed: PowerShell process starts on activation, so recording is instant.
 */
export class SpeechModule implements vscode.Disposable {
  private isListening = false;
  private readonly transcriptBuilder = new TranscriptBuilder();
  private readonly audioRecorder: AudioRecorder;
  private readonly disposables: vscode.Disposable[] = [];

  private readonly _onTranscript = new TypedEvent<TranscriptEvent>();
  readonly onTranscript = this._onTranscript.event;

  private readonly _onError = new TypedEvent<SpeechError>();
  readonly onError = this._onError.event;

  private readonly _onStatusChange = new TypedEvent<SpeechStatus>();
  readonly onStatusChange = this._onStatusChange.event;

  constructor() {
    this.audioRecorder = new AudioRecorder();
    this.disposables.push(this.audioRecorder);

    // Handle recorder errors
    this.disposables.push(
      this.audioRecorder.onError((err) => {
        this._onError.fire(err);
        this.stopListening();
      }),
    );
  }

  /** Pre-warm the audio recorder (call on extension activation) */
  async warmUp(): Promise<void> {
    if (this.isAvailable()) {
      await this.audioRecorder.warmUp();
    }
  }

  /** Check if speech capture is available */
  isAvailable(): boolean {
    return this.audioRecorder.isAvailable();
  }

  /** Get reason why speech is unavailable */
  getUnavailableReason(): string {
    return this.audioRecorder.getUnavailableReason();
  }

  /** Start voice capture */
  async startListening(): Promise<void> {
    if (this.isListening) {
      this.stopListening();
    }

    if (!this.isAvailable()) {
      this._onError.fire(
        new SpeechError('Speech not available', this.getUnavailableReason()),
      );
      this._onStatusChange.fire('unavailable');
      return;
    }

    try {
      this.transcriptBuilder.reset();
      // Await start() — resolves when PowerShell confirms "RECORDING"
      await this.audioRecorder.start();
      this.isListening = true;
      this._onStatusChange.fire('listening');
    } catch (err) {
      const speechErr =
        err instanceof SpeechError
          ? err
          : new SpeechError(
              err instanceof Error ? err.message : String(err),
              'Failed to start voice input. Check that your microphone is available.',
            );
      this._onError.fire(speechErr);
      this.isListening = false;
      this._onStatusChange.fire('idle');
    }
  }

  /** Stop listening without transcribing */
  stopListening(): void {
    this.isListening = false;
    void this.audioRecorder.stop();
    this._onStatusChange.fire('idle');
  }

  /** Stop recording, transcribe locally via faster-whisper, emit transcript */
  async stopAndTranscribe(): Promise<void> {
    if (!this.isListening) return;
    this.isListening = false;

    this._onStatusChange.fire('processing');

    try {
      const wavBuffer = await this.audioRecorder.stop();

      if (!wavBuffer) {
        this._onError.fire(
          new SpeechError('No audio captured', 'No speech detected. Try speaking louder or closer to the mic.'),
        );
        this._onStatusChange.fire('idle');
        return;
      }

      const text = await transcribeAudio(wavBuffer);

      if (text) {
        this.transcriptBuilder.reset();
        this.transcriptBuilder.addPartial(text);
        this.transcriptBuilder.finalize();
        this._onTranscript.fire({ text, isFinal: true });
      } else {
        this._onError.fire(
          new SpeechError('Whisper returned empty', 'No speech detected. Try speaking louder or closer to the mic.'),
        );
      }
    } catch (err) {
      this._onError.fire(
        err instanceof SpeechError
          ? err
          : new SpeechError(
              err instanceof Error ? err.message : String(err),
              'Transcription failed. Check that Python and faster-whisper are installed.',
            ),
      );
    } finally {
      this._onStatusChange.fire('idle');
    }
  }

  /** Force-finalize and return whatever transcript we have */
  finalizeAndGet(): string {
    this.transcriptBuilder.finalize();
    return this.transcriptBuilder.getFullTranscript();
  }

  /** Whether there's any captured text */
  hasTranscript(): boolean {
    return !this.transcriptBuilder.isEmpty();
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
