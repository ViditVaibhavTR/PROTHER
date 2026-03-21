import * as vscode from 'vscode';

type EnhanceState = 'disabled' | 'ready' | 'confirm' | 'enhancing' | 'no-key';

/**
 * Status bar button for enhancing prompts.
 *
 * States:
 *   disabled  — no prompt spoken yet
 *   ready     — prompt available, first click shows confirm
 *   confirm   — waiting for second click to enhance (or "Type New")
 *   enhancing — spinner while LLM processes
 *   no-key    — Gemini key not configured
 */
export class EnhanceButton implements vscode.Disposable {
  private readonly item: vscode.StatusBarItem;
  private state: EnhanceState = 'disabled';
  private lastPromptPreview = '';
  private confirmTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 98);
    this.item.command = 'prother.enhance';
    this.updateDisplay();
    this.item.show();
  }

  /** Current state */
  getState(): EnhanceState {
    return this.state;
  }

  /** Update state when a new prompt is available */
  setPromptAvailable(prompt: string): void {
    this.lastPromptPreview = prompt.length > 30 ? prompt.substring(0, 30) + '...' : prompt;
    this.state = 'ready';
    this.clearConfirmTimer();
    this.updateDisplay();
  }

  /** Enter confirm state (first click happened) */
  setConfirm(): void {
    this.state = 'confirm';
    this.updateDisplay();

    // Auto-reset after 10s if user doesn't click again
    this.clearConfirmTimer();
    this.confirmTimer = setTimeout(() => {
      if (this.state === 'confirm') {
        this.state = 'ready';
        this.updateDisplay();
      }
    }, 10_000);
  }

  /** Show enhancing spinner */
  setEnhancing(): void {
    this.state = 'enhancing';
    this.clearConfirmTimer();
    this.updateDisplay();
  }

  /** Reset to ready after enhancement completes */
  setDone(): void {
    this.state = this.lastPromptPreview ? 'ready' : 'disabled';
    this.updateDisplay();
  }

  /** Show no-key state */
  setNoKey(): void {
    this.state = 'no-key';
    this.updateDisplay();
  }

  /** Reset to disabled (no prompt) */
  reset(): void {
    this.lastPromptPreview = '';
    this.state = 'disabled';
    this.clearConfirmTimer();
    this.updateDisplay();
  }

  private clearConfirmTimer(): void {
    if (this.confirmTimer) {
      clearTimeout(this.confirmTimer);
      this.confirmTimer = null;
    }
  }

  private updateDisplay(): void {
    switch (this.state) {
      case 'disabled':
        this.item.text = '$(sparkle) Enhance';
        this.item.tooltip = 'Speak a prompt first, then click to enhance';
        this.item.color = new vscode.ThemeColor('disabledForeground');
        break;
      case 'ready':
        this.item.text = '$(sparkle) Enhance';
        this.item.tooltip = `Click to enhance: "${this.lastPromptPreview}"`;
        this.item.color = undefined;
        break;
      case 'confirm':
        this.item.text = '$(sparkle) Click to Enhance!';
        this.item.tooltip = `Click again to enhance: "${this.lastPromptPreview}"`;
        this.item.color = new vscode.ThemeColor('statusBarItem.warningBackground');
        break;
      case 'enhancing':
        this.item.text = '$(loading~spin) Enhancing...';
        this.item.tooltip = 'Enhancing prompt with Gemini...';
        this.item.color = undefined;
        break;
      case 'no-key':
        this.item.text = '$(sparkle) Enhance';
        this.item.tooltip = 'Set up Gemini key to enable enhancement';
        this.item.color = new vscode.ThemeColor('disabledForeground');
        break;
    }
  }

  dispose(): void {
    this.clearConfirmTimer();
    this.item.dispose();
  }
}
