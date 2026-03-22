import * as vscode from 'vscode';
import type { KeyManager, LLMProvider } from '../keys/key-manager';
import type { OnboardingManager } from '../onboarding/onboarding-manager';

interface ProviderInfo {
  id: LLMProvider;
  label: string;
  icon: string;
}

const PROVIDERS: ProviderInfo[] = [
  { id: 'gemini', label: 'Gemini', icon: 'zap' },
  { id: 'openai', label: 'OpenAI', icon: 'beaker' },
  { id: 'anthropic', label: 'Anthropic', icon: 'hubot' },
  { id: 'groq', label: 'Groq', icon: 'rocket' },
];

/**
 * Status bar item showing the current LLM provider.
 * Click to open a QuickPick to switch providers.
 */
export class ProviderSelector implements vscode.Disposable {
  private readonly item: vscode.StatusBarItem;
  private readonly disposables: vscode.Disposable[] = [];

  constructor(
    private readonly keyManager: KeyManager,
    private readonly onboardingManager: OnboardingManager,
  ) {
    this.item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 97);
    this.item.command = 'prother.switchProvider';
    this.updateDisplay();
    this.item.show();

    // Update display when settings change
    this.disposables.push(
      vscode.workspace.onDidChangeConfiguration((e) => {
        if (e.affectsConfiguration('prother.llm.defaultProvider')) {
          this.updateDisplay();
        }
      }),
    );
  }

  /** Get the current provider from settings */
  private getCurrentProvider(): ProviderInfo {
    const id = vscode.workspace
      .getConfiguration('prother')
      .get<string>('llm.defaultProvider', 'gemini');
    return PROVIDERS.find((p) => p.id === id) ?? PROVIDERS[0];
  }

  /** Show QuickPick to switch providers */
  async showPicker(): Promise<void> {
    const current = this.getCurrentProvider();

    const items = await Promise.all(
      PROVIDERS.map(async (p) => {
        const hasKey = !!(await this.keyManager.getKey(p.id));
        const isCurrent = p.id === current.id;
        return {
          label: `$(${p.icon}) ${p.label}`,
          description: isCurrent ? '(active)' : hasKey ? '(key saved)' : '(no key)',
          id: p.id,
          hasKey,
        };
      }),
    );

    const picked = await vscode.window.showQuickPick(items, {
      placeHolder: 'Switch LLM provider for enhancement',
    });

    if (!picked) return;

    if (!picked.hasKey) {
      // No key for this provider — run setup
      const success = await this.onboardingManager.runSetup();
      if (!success) return;
    } else {
      // Has key — just switch
      await vscode.workspace
        .getConfiguration('prother')
        .update('llm.defaultProvider', picked.id, true);
    }

    this.updateDisplay();
  }

  private updateDisplay(): void {
    const provider = this.getCurrentProvider();
    this.item.text = `$(${provider.icon}) ${provider.label}`;
    this.item.tooltip = `Enhancement provider: ${provider.label} (click to switch)`;
  }

  dispose(): void {
    this.item.dispose();
    for (const d of this.disposables) {
      d.dispose();
    }
  }
}
