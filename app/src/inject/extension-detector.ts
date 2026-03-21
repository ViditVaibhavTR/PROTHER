import * as vscode from 'vscode';
import { AI_EXTENSION_DEFS } from '../core/constants';
import type { AIExtension } from '../core/types';

/**
 * Detects installed AI coding extensions and which one is currently active.
 *
 * Uses multiple signals:
 * - Extension API: is the extension installed & active?
 * - Tab groups: is a tab belonging to the extension visible/active?
 * - Active terminal: is a Claude-like terminal focused?
 */
export class ExtensionDetector {
  /** Scan for all installed AI extensions */
  detectExtensions(): AIExtension[] {
    const results: AIExtension[] = [];
    const activeTabLabels = this.getActiveTabLabels();

    for (const def of AI_EXTENSION_DEFS) {
      if (def.detectionMethod === 'extension-api') {
        const ext = vscode.extensions.getExtension(def.id);
        if (ext) {
          results.push({
            ...def,
            installed: true,
            active: ext.isActive,
            isVisible: this.isExtensionVisible(def.id, activeTabLabels),
          });
        }
      } else if (def.detectionMethod === 'terminal-scan') {
        const terminal = vscode.window.terminals.find((t) => /claude|anthropic/i.test(t.name));
        if (terminal) {
          results.push({
            ...def,
            installed: true,
            active: true,
            isVisible: terminal === vscode.window.activeTerminal,
          });
        }
      }
    }

    return results;
  }

  /** Check if an AI extension's panel/tab is currently visible */
  private isExtensionVisible(extensionId: string, activeTabLabels: string[]): boolean {
    // Map extension IDs to tab label patterns
    const tabPatterns: Record<string, RegExp> = {
      'anthropic.claude-code': /claude/i,
      'github.copilot-chat': /copilot|chat/i,
      'saoudrizwan.claude-dev': /cline/i,
      'continue.continue': /continue/i,
    };

    const pattern = tabPatterns[extensionId];
    if (!pattern) return false;

    return activeTabLabels.some((label) => pattern.test(label));
  }

  /** Get labels of all active tabs across all tab groups */
  private getActiveTabLabels(): string[] {
    const labels: string[] = [];
    try {
      // vscode.window.tabGroups is available in VS Code 1.73+
      for (const group of vscode.window.tabGroups.all) {
        if (group.activeTab?.label) {
          labels.push(group.activeTab.label);
        }
      }
    } catch {
      // tabGroups API not available — return empty
    }
    return labels;
  }
}
