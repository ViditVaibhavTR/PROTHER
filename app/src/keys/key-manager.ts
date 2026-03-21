import * as vscode from 'vscode';
import { SECRET_KEY_PREFIX } from '../core/constants';
import { ApiKeyError } from '../core/errors';

export type LLMProvider = 'gemini' | 'anthropic' | 'openai' | 'groq';

/**
 * Manages API keys using VS Code SecretStorage (OS keychain).
 * Keys are NEVER stored in settings.json or logged.
 */
export class KeyManager implements vscode.Disposable {
  constructor(private readonly secrets: vscode.SecretStorage) {}

  async getKey(provider: LLMProvider): Promise<string | undefined> {
    return this.secrets.get(`${SECRET_KEY_PREFIX}${provider}`);
  }

  async setKey(provider: LLMProvider, value: string): Promise<void> {
    if (!value || !value.trim()) {
      throw new ApiKeyError(`Empty key rejected for provider: ${provider}`);
    }
    await this.secrets.store(`${SECRET_KEY_PREFIX}${provider}`, value.trim());
  }

  async deleteKey(provider: LLMProvider): Promise<void> {
    await this.secrets.delete(`${SECRET_KEY_PREFIX}${provider}`);
  }

  /**
   * Get a key, prompting the user if it's not yet stored.
   * Used as a lightweight Phase 1 bootstrap until OnboardingManager exists.
   */
  async getOrPrompt(provider: LLMProvider, displayName: string): Promise<string | undefined> {
    const existing = await this.getKey(provider);
    if (existing) {
      return existing;
    }

    const key = await vscode.window.showInputBox({
      title: `Prother: Enter your ${displayName} API key`,
      prompt: `Your key is stored securely in the OS keychain and never leaves your machine.`,
      password: true,
      ignoreFocusOut: true,
      validateInput: (v) => (v.trim().length < 10 ? 'That looks too short for an API key' : undefined),
    });

    if (!key) {
      return undefined;
    }

    await this.setKey(provider, key);
    void vscode.window.showInformationMessage(`Prother: ${displayName} key saved securely.`);
    return key.trim();
  }

  dispose(): void {
    // SecretStorage lifecycle is managed by VS Code
  }
}
