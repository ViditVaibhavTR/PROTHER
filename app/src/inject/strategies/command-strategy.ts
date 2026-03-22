import * as vscode from 'vscode';
import { EXTENSION_COMMANDS } from '../../core/constants';
import type { InjectionStrategy } from '../../core/types';

/**
 * Injects text into AI extension input boxes WITHOUT submitting.
 *
 * - Copilot Chat: uses isPartialQuery (replaces input content)
 * - Claude Code: focus → paste (normal), blur → focus → selectAll → paste (enhance/replace)
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

    // Claude Code enhance: blur → focus → selectAll → paste (replaces original)
    if (clearFirst && target === 'anthropic.claude-code') {
      try {
        const previousClipboard = await vscode.env.clipboard.readText();
        await vscode.env.clipboard.writeText(text);

        // Blur then refocus — resets focus state cleanly
        await vscode.commands.executeCommand('claude-vscode.blur');
        await new Promise((r) => setTimeout(r, 100));
        await vscode.commands.executeCommand('claude-vscode.focus');
        await new Promise((r) => setTimeout(r, 300));

        // Select all text in the now-focused input
        await vscode.commands.executeCommand('editor.action.selectAll');
        await new Promise((r) => setTimeout(r, 100));

        // Paste — replaces the selection
        await vscode.commands.executeCommand('editor.action.clipboardPasteAction');

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
