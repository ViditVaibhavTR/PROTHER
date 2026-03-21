import * as vscode from 'vscode';
import type { KeyManager } from '../keys/key-manager';
import { validateGeminiKey } from '../keys/key-validator';

/**
 * Handles first-time user onboarding for Gemini API key setup.
 * Shows a guided flow: open Google AI Studio → paste key → validate → done.
 */
export class OnboardingManager {
  constructor(
    private readonly keyManager: KeyManager,
    private readonly globalState: vscode.Memento,
  ) {}

  /** Check if onboarding is needed and show it */
  async checkAndStart(): Promise<void> {
    // Don't show if already dismissed
    if (this.globalState.get<boolean>('prother.onboarding.dismissed')) return;

    // Don't show if key already exists
    const existingKey = await this.keyManager.getKey('gemini');
    if (existingKey) return;

    const choice = await vscode.window.showInformationMessage(
      'Prother: Get a FREE Gemini API key to enable prompt enhancement (~1,500/day, no credit card).',
      'Set Up Now',
      'Later',
    );

    if (choice === 'Set Up Now') {
      await this.runSetup();
    } else {
      await this.globalState.update('prother.onboarding.dismissed', true);
    }
  }

  /** Run the guided API key setup */
  async runSetup(): Promise<boolean> {
    // Step 1: Open Google AI Studio
    const openStudio = await vscode.window.showInformationMessage(
      'Step 1: Open Google AI Studio to create a free API key.',
      'Open AI Studio',
    );

    if (openStudio === 'Open AI Studio') {
      await vscode.env.openExternal(vscode.Uri.parse('https://aistudio.google.com/app/apikey'));
    }

    // Step 2: Prompt for key
    const key = await vscode.window.showInputBox({
      title: 'Step 2: Paste your Gemini API key',
      prompt: 'Your key is stored securely in the OS keychain and never leaves your machine.',
      password: true,
      ignoreFocusOut: true,
      validateInput: (v) => (v.trim().length < 10 ? 'That looks too short for an API key' : undefined),
    });

    if (!key) return false;

    // Step 3: Validate
    const result = await vscode.window.withProgress(
      { location: vscode.ProgressLocation.Notification, title: 'Testing Gemini connection...' },
      () => validateGeminiKey(key.trim()),
    );

    if (!result.valid) {
      vscode.window.showErrorMessage(`Prother: Key validation failed — ${result.error}`);
      return false;
    }

    // Save key
    await this.keyManager.setKey('gemini', key.trim());
    vscode.window.showInformationMessage('Prother: Gemini key saved! Enhancement is now enabled.');
    await this.globalState.update('prother.onboarding.dismissed', true);
    return true;
  }
}
