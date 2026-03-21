import * as vscode from 'vscode';

type EnhanceState = 'disabled' | 'ready' | 'enhancing' | 'no-key';

/**
 * Status bar button for enhancing the last spoken prompt.
 * Sits next to the Prother mic button and target selector.
 *
 * States:
 *   disabled  — no prompt spoken yet
 *   ready     — prompt available, click to enhance
 *   enhancing — spinner while LLM processes
 *   no-key    — Gemini key not configured
 */
export class EnhanceButton implements vscode.Disposable {
  private readonly item: vscode.StatusBarItem;
  private state: EnhanceState = 'disabled';
  private lastPromptPreview = '';

  constructor() {
    this.item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 98);
    this.item.command = 'prother.enhance';
    this.updateDisplay();
    this.item.show();
  }

  /** Update state when a new prompt is available */
  setPromptAvailable(prompt: string): void {
    this.lastPromptPreview = prompt.length > 30 ? prompt.substring(0, 30) + '...' : prompt;
    this.state = 'ready';
    this.updateDisplay();
  }

  /** Show enhancing spinner */
  setEnhancing(): void {
    this.state = 'enhancing';
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
    this.updateDisplay();
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
        this.item.color = undefined; // default color
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
    this.item.dispose();
  }
}
