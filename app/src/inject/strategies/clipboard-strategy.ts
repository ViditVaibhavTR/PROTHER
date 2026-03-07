import * as vscode from 'vscode';
import type { InjectionStrategy } from '../../core/types';

/**
 * Universal fallback: copies text to clipboard and attempts paste.
 * For webview-based extensions (Cline, Continue), shows a notification
 * since auto-paste into webviews is unreliable.
 */
export class ClipboardStrategy implements InjectionStrategy {
  readonly name = 'clipboard';

  async canHandle(_target: string): Promise<boolean> {
    return true; // Universal fallback — always available
  }

  async inject(text: string, _target: string): Promise<boolean> {
    let previousClipboard = '';

    try {
      previousClipboard = await vscode.env.clipboard.readText();
    } catch {
      // Clipboard read can fail in some environments; continue anyway
    }

    try {
      await vscode.env.clipboard.writeText(text);

      // Show notification for manual paste (reliable across all targets)
      vscode.window.showInformationMessage('Prother: Prompt copied — paste with Ctrl+V', 'OK');

      return true;
    } catch {
      return false;
    } finally {
      // Restore previous clipboard after delay
      if (previousClipboard) {
        setTimeout(async () => {
          try {
            await vscode.env.clipboard.writeText(previousClipboard);
          } catch {
            // Best effort restore
          }
        }, 1000);
      }
    }
  }
}
