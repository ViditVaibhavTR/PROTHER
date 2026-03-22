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
 * For Claude Code: deferred injection — shows [Send Raw] / [Enhance] notification
 * so the input is always empty when we paste (solves the append-instead-of-replace bug).
 * For Copilot: injects immediately via isPartialQuery (already replaces).
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

  /** Fired when user clicks [Enhance] in the deferred notification */
  private readonly _onEnhanceRequested = new TypedEvent<string>();
  readonly onEnhanceRequested = this._onEnhanceRequested.event;

  constructor(
    private readonly speechModule: SpeechModule,
    private readonly injectModule: InjectModule,
    private readonly statusBar: StatusBar,
    outputChannel: vscode.OutputChannel,
    private readonly getTarget: () => string,
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

  /** The last successfully spoken prompt */
  get lastPrompt(): string {
    return this._lastPrompt;
  }

  /** Activate voice input */
  async activate(trigger: Trigger): Promise<void> {
    this.outputChannel.appendLine(`[INFO] Activate triggered via: ${trigger}`);

    // Toggle: if already listening, stop recording → transcribe
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

    const target = this.getTarget();

    // Claude Code: deferred injection — don't paste yet, let user choose
    if (target === 'anthropic.claude-code') {
      this.transitionTo(ProthState.IDLE);
      const preview = text.length > 80 ? text.substring(0, 80) + '...' : text;
      const choice = await vscode.window.showInformationMessage(
        `"${preview}"`,
        'Send Raw',
        'Enhance',
      );

      if (choice === 'Send Raw') {
        await this.processAndInject(text);
      } else if (choice === 'Enhance') {
        this._onEnhanceRequested.fire(text);
      }
      // If dismissed — text stays in lastPrompt, user can click Enhance button later
      return;
    }

    // Copilot / others: inject immediately (isPartialQuery replaces)
    await this.processAndInject(text);
  }

  /** Process transcript and inject into target */
  async processAndInject(text: string): Promise<void> {
    try {
      this.transitionTo(ProthState.INJECTING);
      const result = await this.injectModule.inject(text);

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
    this._onEnhanceRequested.dispose();
  }
}
