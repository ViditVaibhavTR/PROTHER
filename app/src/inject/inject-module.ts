import * as vscode from 'vscode';
import { ExtensionDetector } from './extension-detector';
import { CommandStrategy } from './strategies/command-strategy';
import { TerminalStrategy } from './strategies/terminal-strategy';
import { ClipboardStrategy } from './strategies/clipboard-strategy';
import type { AIExtension, InjectResult, InjectionStrategy } from '../core/types';

/**
 * Orchestrates text injection into AI extensions.
 * Tries strategies in priority order: Command → Terminal → Clipboard.
 * Falls back to clipboard-copy with notification as ultimate fallback.
 */
export class InjectModule implements vscode.Disposable {
  private readonly strategies: InjectionStrategy[];
  private readonly detector: ExtensionDetector;

  constructor() {
    this.strategies = [new CommandStrategy(), new TerminalStrategy(), new ClipboardStrategy()];
    this.detector = new ExtensionDetector();
  }

  dispose(): void {
    // Strategies and detector hold no subscriptions, but interface is consistent
  }

  async inject(text: string, preferredTarget?: string): Promise<InjectResult> {
    const installed = this.detector.detectExtensions();

    if (installed.length === 0) {
      // No AI extensions found — clipboard fallback
      await vscode.env.clipboard.writeText(text);
      vscode.window.showInformationMessage(
        'Prother: No AI extensions detected. Prompt copied to clipboard.',
        'OK',
      );
      return { success: true, method: 'clipboard-manual', error: 'No AI extensions detected' };
    }

    const target = preferredTarget ?? (await this.selectTarget(installed));

    // Try strategies in cascade order
    for (const strategy of this.strategies) {
      if (await strategy.canHandle(target)) {
        const success = await strategy.inject(text, target);
        if (success) {
          return {
            success: true,
            method: strategy.name as InjectResult['method'],
            target,
            fallbackUsed: strategy.name !== 'command',
          };
        }
      }
    }

    // Ultimate fallback — should not reach here since ClipboardStrategy always handles
    await vscode.env.clipboard.writeText(text);
    vscode.window.showInformationMessage(
      'Prother: Prompt copied to clipboard. Paste into your AI assistant.',
      'OK',
    );
    return { success: true, method: 'clipboard-manual', target };
  }

  /** Detect installed AI extensions */
  detectExtensions(): AIExtension[] {
    return this.detector.detectExtensions();
  }

  private async selectTarget(installed: AIExtension[]): Promise<string> {
    if (installed.length === 1) return installed[0].id;

    // Prefer visible panel
    const visible = installed.find((ext) => ext.isVisible);
    if (visible) return visible.id;

    // Check configured default
    const configured = vscode.workspace
      .getConfiguration('prother')
      .get<string>('inject.defaultTarget');
    if (configured && configured !== 'auto' && installed.some((e) => e.id === configured)) {
      return configured;
    }

    // Ask user
    const choice = await vscode.window.showQuickPick(
      installed.map((e) => ({ label: e.displayName, description: e.id, id: e.id })),
      { placeHolder: 'Which AI assistant should receive the prompt?' },
    );
    return choice?.id ?? installed[0].id;
  }
}
