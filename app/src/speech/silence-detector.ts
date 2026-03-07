import * as vscode from 'vscode';
import { DEFAULT_SILENCE_TIMEOUT } from '../core/constants';
import { TypedEvent } from '../core/events';

/**
 * Detects silence (no speech activity) after a configurable timeout.
 * Fires onSilenceDetected when the user stops speaking.
 */
export class SilenceDetector implements vscode.Disposable {
  private timer: ReturnType<typeof setTimeout> | null = null;
  private readonly timeoutMs: number;

  private readonly _onSilenceDetected = new TypedEvent<void>();
  readonly onSilenceDetected = this._onSilenceDetected.event;

  constructor(timeoutMs?: number) {
    this.timeoutMs =
      timeoutMs ??
      vscode.workspace.getConfiguration('prother').get<number>('speech.silenceTimeout', DEFAULT_SILENCE_TIMEOUT);
  }

  /** Call whenever speech activity is detected (resets timer) */
  onSpeechActivity(): void {
    this.clearTimer();
    this.timer = setTimeout(() => {
      this._onSilenceDetected.fire();
    }, this.timeoutMs);
  }

  /** Start the silence timer (initial call when listening begins) */
  start(): void {
    this.onSpeechActivity();
  }

  /** Stop and clear the timer */
  stop(): void {
    this.clearTimer();
  }

  private clearTimer(): void {
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  dispose(): void {
    this.clearTimer();
    this._onSilenceDetected.dispose();
  }
}
