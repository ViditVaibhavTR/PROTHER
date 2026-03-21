import * as vscode from 'vscode';

interface Target {
  id: string;
  label: string;
  icon: string;
}

const TARGETS: Target[] = [
  { id: 'anthropic.claude-code', label: 'Claude Code', icon: 'hubot' },
  { id: 'github.copilot-chat', label: 'Copilot', icon: 'copilot' },
];

/**
 * Status bar item that shows the current injection target.
 * Click to cycle between Claude Code and Copilot.
 */
export class TargetSelector implements vscode.Disposable {
  private readonly item: vscode.StatusBarItem;
  private currentIndex = 0;

  constructor() {
    this.item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 99);
    this.item.command = 'prother.cycleTarget';
    this.updateDisplay();
    this.item.show();
  }

  /** Get the currently selected target extension ID */
  getSelectedTarget(): string {
    return TARGETS[this.currentIndex].id;
  }

  /** Cycle to the next target */
  cycle(): void {
    this.currentIndex = (this.currentIndex + 1) % TARGETS.length;
    this.updateDisplay();
  }

  private updateDisplay(): void {
    const target = TARGETS[this.currentIndex];
    this.item.text = `$(${target.icon}) → ${target.label}`;
    this.item.tooltip = `Prother target: ${target.label} (click to switch)`;
  }

  dispose(): void {
    this.item.dispose();
  }
}
