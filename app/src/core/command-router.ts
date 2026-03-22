import * as vscode from 'vscode';
import { ProthState } from './types';
import type { Trigger } from './types';
import { TypedEvent } from './events';
import { ERROR_DISPLAY_TIMEOUT_MS } from './constants';
import { SpeechModule } from '../speech/speech-module';
import { InjectModule } from '../inject/inject-module';
import { StatusBar } from '../ui/status-bar';
import { showError, showInfo } from '../ui/notifications';

/**
 * Central dispatcher and state machine.
 * IDLE → LISTENING → PROCESSING → INJECTING → IDLE
 * Toggle: Ctrl+Shift+V while listening stops and injects.
 * Stores last prompt for the Enhance button.
 */
export class CommandRouter implements vscode.Disposable {
  private state: ProthState = ProthState.IDLE;
  private _lastPrompt = '';
  private recoveryTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly disposables: vscode.Disposable[] = [];
  private readonly outputChannel: vscode.OutputChannel;

  private readonly _onStateChange = new TypedEvent<ProthState>();
  readonly onStateChange = this._onStateChange.event;

  private readonly _onLastPromptChange = new TypedEvent<string>();
  readonly onLastPromptChange = this._onLastPromptChange.event;

  constructor(
    private readonly speechModule: SpeechModule,
    private readonly injectModule: InjectModule,
    private readonly statusBar: StatusBar,
    outputChannel: vscode.OutputChannel,
  ) {
    this.outputChannel = outputChannel;

    // Subscribe to final transcripts
    this.disposables.push(
      this.speechModule.onTranscript(async (event) => {
        if (event.isFinal) {
          await this.handleFinalTranscript(event.text);
        }
      }),
    );

    // Subscribe to speech errors
    this.disposables.push(
      this.speechModule.onError((err) => {
        this.outputChannel.appendLine(`[ERROR] Speech: ${err.message}`);
        this.transitionTo(ProthState.ERROR);
        showError(err.userMessage);
        this.recoverToIdle();
      }),
    );

    // Subscribe to speech status changes
    this.disposables.push(
      this.speechModule.onStatusChange((status) => {
        if (status === 'listening') {
          this.statusBar.setState(ProthState.LISTENING);
        } else if (status === 'unavailable') {
          this.statusBar.setState(ProthState.DISABLED);
        }
      }),
    );
  }

  /** The last successfully spoken prompt (for enhance button) */
  get lastPrompt(): string {
    return this._lastPrompt;
  }

  /** Activate voice input */
  async activate(trigger: Trigger): Promise<void> {
    this.outputChannel.appendLine(`[INFO] Activate triggered via: ${trigger}`);

    // Toggle: if already listening, stop recording → transcribe → inject
    if (this.state === ProthState.LISTENING) {
      this.outputChannel.appendLine('[INFO] Toggle: stopping recording and transcribing');
      this.transitionTo(ProthState.PROCESSING);
      await this.speechModule.stopAndTranscribe();
      return;
    }

    // Only activate from IDLE
    if (this.state !== ProthState.IDLE) {
      this.outputChannel.appendLine(`[WARN] Cannot activate from state: ${this.state}`);
      return;
    }

    // Check if speech is available
    if (!this.speechModule.isAvailable()) {
      showError('Voice input is not available in this environment.');
      return;
    }

    try {
      this.transitionTo(ProthState.LISTENING);
      await this.speechModule.startListening();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.outputChannel.appendLine(`[ERROR] Activation failed: ${message}`);
      this.transitionTo(ProthState.ERROR);
      showError('Failed to start listening. Check that your microphone is available.');
      this.recoverToIdle();
    }
  }

  /** Stop listening without injecting */
  deactivate(): void {
    this.speechModule.stopListening();
    this.transitionTo(ProthState.IDLE);
  }

  /** Handle a completed transcript */
  private async handleFinalTranscript(text: string): Promise<void> {
    if (!text.trim()) {
      showInfo('No speech detected. Try again.');
      this.transitionTo(ProthState.IDLE);
      return;
    }

    this.outputChannel.appendLine(`[INFO] Transcript: "${text}"`);

    // Store last prompt for enhance button
    this._lastPrompt = text;
    this._onLastPromptChange.fire(text);

    await this.processAndInject(text);
  }

  /** Process transcript and inject into target. clearFirst=true opens new conversation (for enhance). */
  async processAndInject(text: string, clearFirst = false): Promise<void> {
    try {
      this.transitionTo(ProthState.INJECTING);
      const result = await this.injectModule.inject(text, undefined, clearFirst);

      if (result.success) {
        this.outputChannel.appendLine(
          `[INFO] Injected via ${result.method} into ${result.target ?? 'clipboard'}`,
        );
      } else {
        this.outputChannel.appendLine(`[WARN] Injection failed: ${result.error}`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.outputChannel.appendLine(`[ERROR] Process/inject failed: ${message}`);
      showError('Failed to inject prompt. Text copied to clipboard.');

      try {
        await vscode.env.clipboard.writeText(text);
      } catch {
        // Can't even write to clipboard
      }
    } finally {
      this.transitionTo(ProthState.IDLE);
    }
  }

  private transitionTo(newState: ProthState): void {
    this.outputChannel.appendLine(`[STATE] ${this.state} → ${newState}`);
    this.state = newState;
    this.statusBar.setState(newState);
    this._onStateChange.fire(newState);
  }

  private recoverToIdle(): void {
    // Clear previous recovery timer to prevent stacking
    if (this.recoveryTimer) {
      clearTimeout(this.recoveryTimer);
    }
    this.recoveryTimer = setTimeout(() => {
      this.recoveryTimer = null;
      if (this.state === ProthState.ERROR) {
        this.transitionTo(ProthState.IDLE);
      }
    }, ERROR_DISPLAY_TIMEOUT_MS);
  }

  getState(): ProthState {
    return this.state;
  }

  dispose(): void {
    if (this.recoveryTimer) {
      clearTimeout(this.recoveryTimer);
    }
    for (const d of this.disposables) {
      d.dispose();
    }
    this._onStateChange.dispose();
    this._onLastPromptChange.dispose();
  }
}
