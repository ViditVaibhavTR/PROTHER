import * as vscode from 'vscode';
import { AI_EXTENSION_DEFS } from '../core/constants';
import type { AIExtension } from '../core/types';

/**
 * Detects installed AI coding extensions (Copilot, Cline, Continue, Claude Code).
 */
export class ExtensionDetector {
  /** Scan for all installed AI extensions */
  detectExtensions(): AIExtension[] {
    const results: AIExtension[] = [];

    for (const def of AI_EXTENSION_DEFS) {
      if (def.detectionMethod === 'extension-api') {
        const ext = vscode.extensions.getExtension(def.id);
        if (ext) {
          results.push({
            ...def,
            installed: true,
            active: ext.isActive,
            isVisible: false, // Best-effort; VS Code API doesn't reliably expose panel visibility
          });
        }
      } else if (def.detectionMethod === 'terminal-scan') {
        const terminal = vscode.window.terminals.find((t) => /claude/i.test(t.name));
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
}
