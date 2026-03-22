import * as vscode from 'vscode';
import type { KeyManager, LLMProvider } from '../keys/key-manager';
import { validateKey } from '../keys/key-validator';

interface ProviderOption {
  id: LLMProvider;
  label: string;
  description: string;
  keyUrl: string;
}

const PROVIDERS: ProviderOption[] = [
  {
    id: 'gemini',
    label: '$(star) Gemini 2.5 Flash (Free - Recommended)',
    description: 'No credit card, ~250 requests/day',
    keyUrl: 'https://aistudio.google.com/app/apikey',
  },
  {
    id: 'groq',
    label: 'Groq Llama 3.1',
    description: 'Free tier available, very fast',
    keyUrl: 'https://console.groq.com/keys',
  },
  {
    id: 'openai',
    label: 'OpenAI GPT-4o Mini',
    description: 'Paid, high quality',
    keyUrl: 'https://platform.openai.com/api-keys',
  },
  {
    id: 'anthropic',
    label: 'Anthropic Claude Haiku',
    description: 'Paid, fast',
    keyUrl: 'https://console.anthropic.com/settings/keys',
  },
];

/**
 * Handles API key setup for all LLM providers.
 * Shows a provider picker, guided key setup, and validation.
 */
export class OnboardingManager {
  constructor(
    private readonly keyManager: KeyManager,
    private readonly globalState: vscode.Memento,
  ) {}

  /** Check if onboarding is needed (first-time, no key at all) */
  async checkAndStart(): Promise<void> {
    if (this.globalState.get<boolean>('prother.onboarding.dismissed')) return;

    // Check if ANY provider key exists
    for (const p of PROVIDERS) {
      const key = await this.keyManager.getKey(p.id);
      if (key) return; // has at least one key, skip onboarding
    }

    const choice = await vscode.window.showInformationMessage(
      'Prother: Set up a FREE Gemini API key to enable prompt enhancement (~250 req/day, no credit card).',
      'Set Up Now',
      'Later',
    );

    if (choice === 'Set Up Now') {
      await this.runSetup();
    } else {
      await this.globalState.update('prother.onboarding.dismissed', true);
    }
  }

  /** Show provider picker and run guided setup */
  async runSetup(): Promise<boolean> {
    // Step 1: Pick provider
    const picked = await vscode.window.showQuickPick(
      PROVIDERS.map((p) => ({
        label: p.label,
        description: p.description,
        id: p.id,
        keyUrl: p.keyUrl,
      })),
      { placeHolder: 'Which LLM provider do you want to use for enhancement?' },
    );

    if (!picked) return false;

    const provider = picked as { id: LLMProvider; keyUrl: string; label: string };

    // Step 2: Open API key page
    const openPage = await vscode.window.showInformationMessage(
      `Open ${provider.label.replace(/\$\(star\) /, '')} to create an API key.`,
      'Open Key Page',
    );

    if (openPage === 'Open Key Page') {
      await vscode.env.openExternal(vscode.Uri.parse(provider.keyUrl));
    }

    // Step 3: Prompt for key
    const key = await vscode.window.showInputBox({
      title: `Paste your ${provider.label.replace(/\$\(star\) /, '')} API key`,
      prompt: 'Stored securely in OS keychain. Never leaves your machine.',
      password: true,
      ignoreFocusOut: true,
      validateInput: (v) => (v.trim().length < 10 ? 'That looks too short for an API key' : undefined),
    });

    if (!key) return false;

    // Step 4: Validate
    const result = await vscode.window.withProgress(
      { location: vscode.ProgressLocation.Notification, title: 'Testing connection...' },
      () => validateKey(provider.id, key.trim()),
    );

    if (!result.valid) {
      vscode.window.showErrorMessage(`Prother: Key validation failed — ${result.error}`);
      return false;
    }

    // Step 5: Save key and set as default provider
    await this.keyManager.setKey(provider.id, key.trim());
    await vscode.workspace.getConfiguration('prother').update('llm.defaultProvider', provider.id, true);

    vscode.window.showInformationMessage(
      `Prother: ${provider.label.replace(/\$\(star\) /, '')} key saved! Enhancement is now enabled.`,
    );
    await this.globalState.update('prother.onboarding.dismissed', true);
    return true;
  }
}
