import * as vscode from 'vscode';
import { ProthState } from '../core/types';

const STATE_CONFIG: Record<ProthState, { text: string; icon: string; tooltip: string }> = {
  [ProthState.SETUP]: { text: 'Prother Setup', icon: 'gear', tooltip: 'Click to set up Prother' },
  [ProthState.IDLE]: { text: 'Prother', icon: 'mic', tooltip: 'Press Alt+V to start speaking' },
  [ProthState.LISTENING]: { text: 'Listening...', icon: 'pulse', tooltip: 'Speaking... press Alt+V to stop' },
  [ProthState.PROCESSING]: { text: 'Prother', icon: 'loading~spin', tooltip: 'Processing...' },
  [ProthState.ENHANCING]: { text: 'Enhancing...', icon: 'loading~spin', tooltip: 'Enhancing prompt with AI...' },
  [ProthState.PREVIEW]: { text: 'Prother', icon: 'eye', tooltip: 'Preview enhanced prompt' },
  [ProthState.INJECTING]: { text: 'Injecting...', icon: 'loading~spin', tooltip: 'Injecting into AI assistant...' },
  [ProthState.CANCELLED]: { text: 'Prother', icon: 'mic', tooltip: 'Cancelled' },
  [ProthState.ERROR]: { text: 'Prother', icon: 'warning', tooltip: 'Error occurred — see Output > Prother' },
  [ProthState.DISABLED]: { text: 'Prother', icon: 'mic-off', tooltip: 'Prother requires VS Code Desktop' },
  [ProthState.REMOTE]: { text: 'Prother (Remote)', icon: 'remote', tooltip: 'Audio unavailable in remote environments' },
};

export class StatusBar implements vscode.Disposable {
  private readonly item: vscode.StatusBarItem;
  private currentState: ProthState = ProthState.IDLE;

  constructor() {
    this.item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    this.item.command = 'prother.activate';
    this.setState(ProthState.IDLE);
    this.item.show();
  }

  setState(state: ProthState): void {
    this.currentState = state;
    const config = STATE_CONFIG[state];
    this.item.text = `$(${config.icon}) ${config.text}`;
    this.item.tooltip = config.tooltip;
  }

  getState(): ProthState {
    return this.currentState;
  }

  dispose(): void {
    this.item.dispose();
  }
}
