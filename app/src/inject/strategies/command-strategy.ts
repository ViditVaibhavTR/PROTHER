import * as vscode from 'vscode';
import { EXTENSION_COMMANDS } from '../../core/constants';
import type { InjectionStrategy } from '../../core/types';

/**
 * Injects text into AI extension input boxes WITHOUT submitting.
 *
 * - Copilot Chat: uses isPartialQuery to place text in input box
 * - Claude Code / Cline / Continue: opens panel, copies to clipboard,
 *   pastes into the focused input via editor.action.clipboardPasteAction
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
      // Copilot Chat: isPartialQuery puts text in input without submitting
      try {
        await vscode.commands.executeCommand(config.openCommand, {
          query: text,
          isPartialQuery: true,
        });
        return true;
      } catch {
        return false;
      }
    }

    // For Claude Code / Cline / Continue:
    // 1. Save current clipboard
    // 2. Copy prompt to clipboard
    // 3. Open/focus the extension panel
    // 4. Paste into the focused input
    // 5. Restore clipboard
    try {
      const previousClipboard = await vscode.env.clipboard.readText();
      await vscode.env.clipboard.writeText(text);

      // Open/focus the extension panel
      await vscode.commands.executeCommand(config.openCommand);
      // Small delay for panel to focus and input to be ready
      await new Promise((r) => setTimeout(r, 400));

      // Paste into the focused input
      await vscode.commands.executeCommand('editor.action.clipboardPasteAction');

      // Restore previous clipboard after a moment
      setTimeout(async () => {
        try {
          await vscode.env.clipboard.writeText(previousClipboard);
        } catch { /* ignore */ }
      }, 1000);

      return true;
    } catch {
      return false;
    }
  }
}
