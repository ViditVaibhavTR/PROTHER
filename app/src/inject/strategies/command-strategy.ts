import * as vscode from 'vscode';
import { EXTENSION_COMMANDS } from '../../core/constants';
import type { InjectionStrategy } from '../../core/types';

/**
 * Injects text into AI extension input boxes WITHOUT submitting.
 *
 * - Copilot Chat: uses isPartialQuery (always replaces input content)
 * - Claude Code: paste into focused input
 *   When clearFirst=true (enhance): opens new conversation first for clean input
 */
export class CommandStrategy implements InjectionStrategy {
  readonly name = 'command';

  async canHandle(target: string): Promise<boolean> {
    return target in EXTENSION_COMMANDS;
  }

  async inject(text: string, target: string, clearFirst = false): Promise<boolean> {
    const config = EXTENSION_COMMANDS[target];
    if (!config) return false;

    if (config.useBuiltInChat) {
      // Copilot Chat: isPartialQuery REPLACES the input content
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

    // For Claude Code — enhance mode: new conversation → paste into clean input
    if (clearFirst && target === 'anthropic.claude-code') {
      try {
        const previousClipboard = await vscode.env.clipboard.readText();
        await vscode.env.clipboard.writeText(text);

        // Fresh conversation = guaranteed empty input
        await vscode.commands.executeCommand('claude-vscode.newConversation');
        await new Promise((r) => setTimeout(r, 1000));

        // Double focus to ensure new conversation's input is active
        await vscode.commands.executeCommand('claude-vscode.focus');
        await new Promise((r) => setTimeout(r, 200));
        await vscode.commands.executeCommand('claude-vscode.focus');
        await new Promise((r) => setTimeout(r, 200));

        // Paste into the now-empty input
        await vscode.commands.executeCommand('editor.action.clipboardPasteAction');

        // Restore clipboard
        setTimeout(async () => {
          try { await vscode.env.clipboard.writeText(previousClipboard); } catch { /* ignore */ }
        }, 1000);

        return true;
      } catch {
        return false;
      }
    }

    // Normal injection: focus → paste
    try {
      const previousClipboard = await vscode.env.clipboard.readText();
      await vscode.env.clipboard.writeText(text);

      await vscode.commands.executeCommand(config.openCommand);
      await new Promise((r) => setTimeout(r, 400));

      await vscode.commands.executeCommand('editor.action.clipboardPasteAction');

      setTimeout(async () => {
        try { await vscode.env.clipboard.writeText(previousClipboard); } catch { /* ignore */ }
      }, 1000);

      return true;
    } catch {
      return false;
    }
  }
}
