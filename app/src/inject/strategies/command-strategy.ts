import * as vscode from 'vscode';
import { EXTENSION_COMMANDS } from '../../core/constants';
import type { InjectionStrategy } from '../../core/types';

/**
 * Injects text via VS Code extension commands.
 * Best path for Copilot Chat (workbench.action.chat.open with query param).
 * For Cline/Continue, opens the panel then falls through to clipboard strategy.
 */
export class CommandStrategy implements InjectionStrategy {
  readonly name = 'command';

  async canHandle(target: string): Promise<boolean> {
    return target in EXTENSION_COMMANDS;
  }

  async inject(text: string, target: string): Promise<boolean> {
    const config = EXTENSION_COMMANDS[target];
    if (!config) return false;

    if (config.useBuiltInChat) {
      try {
        await vscode.commands.executeCommand(config.openCommand, { query: text });
        return true;
      } catch {
        return false;
      }
    }

    // For non-chat extensions: open panel, fall through to clipboard
    try {
      await vscode.commands.executeCommand(config.openCommand);
      await new Promise((r) => setTimeout(r, 300));
      return false; // Signal that clipboard strategy should take over
    } catch {
      return false;
    }
  }
}
