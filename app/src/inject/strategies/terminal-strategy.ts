import * as vscode from 'vscode';
import { CLI_TERMINAL_PATTERNS } from '../../core/constants';
import type { InjectionStrategy } from '../../core/types';

/**
 * Injects text into terminal-based AI tools (Claude Code, Aider, etc.)
 * via the official terminal.sendText() API. Most reliable injection method.
 */
export class TerminalStrategy implements InjectionStrategy {
  readonly name = 'terminal';

  async canHandle(target: string): Promise<boolean> {
    return this.findAITerminal(target) !== undefined;
  }

  async inject(text: string, target: string): Promise<boolean> {
    const terminal = this.findAITerminal(target);
    if (!terminal) return false;

    terminal.sendText(text, false); // false = don't add newline
    terminal.show();
    return true;
  }

  private findAITerminal(target: string): vscode.Terminal | undefined {
    const pattern = CLI_TERMINAL_PATTERNS[target];
    if (!pattern) return undefined;

    return vscode.window.terminals.find((t) => pattern.test(t.name));
  }
}
