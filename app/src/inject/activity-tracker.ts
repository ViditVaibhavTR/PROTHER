import * as vscode from 'vscode';
import { CLI_TERMINAL_PATTERNS } from '../core/constants';

/** How long a "last active" signal stays valid (5 minutes) */
const STALENESS_MS = 5 * 60 * 1000;

/**
 * Tracks which AI extension the user most recently interacted with.
 *
 * Two signals:
 * 1. recordInjection() — called by InjectModule after a successful injection,
 *    so the next injection goes to the same target automatically.
 * 2. Active terminal changes — if the user switches to a Claude terminal,
 *    prefer terminal injection.
 */
export class ActivityTracker implements vscode.Disposable {
  private lastTarget: string | null = null;
  private lastTime = 0;
  private readonly disposables: vscode.Disposable[] = [];

  constructor() {
    // Track active terminal changes — for CLI tools like Claude Code
    this.disposables.push(
      vscode.window.onDidChangeActiveTerminal((terminal) => {
        if (!terminal) return;
        for (const [id, pattern] of Object.entries(CLI_TERMINAL_PATTERNS)) {
          if (pattern.test(terminal.name)) {
            this.lastTarget = id;
            this.lastTime = Date.now();
            break;
          }
        }
      }),
    );

    // Track visible editor changes — if user switches to the chat tab
    // of an AI extension, VS Code fires onDidChangeVisibleTextEditors
    // (This is a weak signal but helps with terminal-based detection)
  }

  /** Record that an injection was sent to a specific target */
  recordInjection(targetId: string): void {
    this.lastTarget = targetId;
    this.lastTime = Date.now();
  }

  /**
   * Returns the extension ID of the most recently active AI extension,
   * or null if no recent activity (stale after 5 minutes).
   */
  getLastActiveTarget(): string | null {
    if (!this.lastTarget) return null;
    if (Date.now() - this.lastTime > STALENESS_MS) return null;
    return this.lastTarget;
  }

  dispose(): void {
    for (const d of this.disposables) {
      d.dispose();
    }
  }
}
