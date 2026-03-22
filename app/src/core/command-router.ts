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
 *
 * Voice text injects immediately into ALL targets.
 * Enhance uses clearFirst=true to open new conversation before pasting.
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

    this.disposables.push(
      this.speechModule.onTranscript(async (event) => {
        if (event.isFinal) {
          await this.handleFinalTranscript(event.text);
        }
      }),
    );

    this.disposables.push(
      this.speechModule.onError((err) => {
        this.outputChannel.appendLine(`[ERROR] Speech: ${err.message}`);
        this.transitionTo(ProthState.ERROR);
        showError(err.userMessage);
        this.recoverToIdle();
      }),
    );

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

  get lastPrompt(): string {
    return this._lastPrompt;
  }

  async activate(trigger: Trigger): Promise<void> {
    this.outputChannel.appendLine(`[INFO] Activate triggered via: ${trigger}`);

    if (this.state === ProthState.LISTENING) {
      this.outputChannel.appendLine('[INFO] Toggle: stopping recording and transcribing');
      this.transitionTo(ProthState.PROCESSING);
      await this.speechModule.stopAndTranscribe();
      return;
    }

    if (this.state !== ProthState.IDLE) {
      this.outputChannel.appendLine(`[WARN] Cannot activate from state: ${this.state}`);
      return;
    }

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

  deactivate(): void {
    this.speechModule.stopListening();
    this.transitionTo(ProthState.IDLE);
  }

  private async handleFinalTranscript(text: string): Promise<void> {
    if (!text.trim()) {
      showInfo('No speech detected. Try again.');
      this.transitionTo(ProthState.IDLE);
      return;
    }

    this.outputChannel.appendLine(`[INFO] Transcript: "${text}"`);

    this._lastPrompt = text;
    this._onLastPromptChange.fire(text);

    // Inject immediately into ALL targets (no deferred notification)
    await this.processAndInject(text);
  }

  /** Process and inject. clearFirst=true opens new conversation for enhance. */
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
    if (this.recoveryTimer) clearTimeout(this.recoveryTimer);
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
    if (this.recoveryTimer) clearTimeout(this.recoveryTimer);
    for (const d of this.disposables) d.dispose();
    this._onStateChange.dispose();
    this._onLastPromptChange.dispose();
  }
}
