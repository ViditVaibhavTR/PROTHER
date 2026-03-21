import * as vscode from 'vscode';
import { ExtensionDetector } from './extension-detector';
import { CommandStrategy } from './strategies/command-strategy';
import { TerminalStrategy } from './strategies/terminal-strategy';
import { ClipboardStrategy } from './strategies/clipboard-strategy';
import type { AIExtension, InjectResult, InjectionStrategy } from '../core/types';

/**
 * Orchestrates text injection into AI extensions.
 * Target is selected via the status bar TargetSelector — no popups.
 * Tries strategies in priority order: Command → Terminal → Clipboard.
 */
export class InjectModule implements vscode.Disposable {
  private readonly strategies: InjectionStrategy[];
  private readonly detector: ExtensionDetector;
  private readonly getTarget: () => string;

  constructor(getTarget: () => string) {
    this.strategies = [new CommandStrategy(), new TerminalStrategy(), new ClipboardStrategy()];
    this.detector = new ExtensionDetector();
    this.getTarget = getTarget;
  }

  dispose(): void {
    // Strategies and detector hold no subscriptions
  }

  async inject(text: string, preferredTarget?: string): Promise<InjectResult> {
    const installed = this.detector.detectExtensions();

    if (installed.length === 0) {
      await vscode.env.clipboard.writeText(text);
      vscode.window.showInformationMessage(
        'Prother: No AI extensions detected. Prompt copied to clipboard.',
        'OK',
      );
      return { success: true, method: 'clipboard-manual', error: 'No AI extensions detected' };
    }

    const target = preferredTarget ?? this.selectTarget(installed);

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

    // Ultimate fallback
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

  private selectTarget(installed: AIExtension[]): string {
    // Use the status bar selection
    const selected = this.getTarget();
    if (installed.some((e) => e.id === selected)) return selected;
    // Fallback: first installed
    return installed[0].id;
  }
}
