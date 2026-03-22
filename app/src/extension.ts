import * as vscode from 'vscode';
import { ProthState } from './core/types';
import { StatusBar } from './ui/status-bar';
import { TargetSelector } from './ui/target-selector';
import { EnhanceButton } from './ui/enhance-button';
import { SpeechModule } from './speech/speech-module';
import { InjectModule } from './inject/inject-module';
import { CommandRouter } from './core/command-router';
import { KeyManager } from './keys/key-manager';
import { LLMRouter } from './llm/llm-router';
import { EnhanceModule } from './enhance/enhance-module';
import { OnboardingManager } from './onboarding/onboarding-manager';
import { ProviderSelector } from './ui/provider-selector';
import { UsageTracker } from './telemetry/usage-tracker';
import { showRemoteWarning } from './ui/notifications';
import { ISSUES_URL } from './core/constants';
import { preloadWhisperModel } from './speech/whisper-client';

let rejectionHandlerRegistered = false;

export function activate(context: vscode.ExtensionContext): void {
  const outputChannel = vscode.window.createOutputChannel('Prother');
  context.subscriptions.push(outputChannel);
  outputChannel.appendLine('[INFO] Prother activating...');

  // Global unhandled rejection handler
  if (!rejectionHandlerRegistered) {
    process.on('unhandledRejection', (reason: unknown) => {
      const message = reason instanceof Error ? reason.message : String(reason);
      vscode.window.showErrorMessage(
        'Prother: Something went wrong. See Output > Prother for details.',
      );
      outputChannel.appendLine(`[ERROR] Unhandled rejection: ${message}`);
    });
    rejectionHandlerRegistered = true;
  }

  // --- Environment checks ---

  const isRemote = !!vscode.env.remoteName;
  if (isRemote) {
    showRemoteWarning();
    outputChannel.appendLine(`[WARN] Remote environment detected: ${vscode.env.remoteName}`);
  }

  // --- Core components ---

  const statusBar = new StatusBar();
  const targetSelector = new TargetSelector();
  const enhanceButton = new EnhanceButton();
  const keyManager = new KeyManager(context.secrets);
  const speechModule = new SpeechModule();
  const injectModule = new InjectModule(() => targetSelector.getSelectedTarget());
  const llmRouter = new LLMRouter(keyManager);
  const enhanceModule = new EnhanceModule(llmRouter);
  const usageTracker = new UsageTracker(context.globalState);
  const onboardingManager = new OnboardingManager(keyManager, context.globalState);
  const providerSelector = new ProviderSelector(keyManager, onboardingManager);

  context.subscriptions.push(statusBar, targetSelector, enhanceButton, providerSelector, keyManager, speechModule, injectModule);

  // Pre-warm audio recorder
  if (!speechModule.isAvailable()) {
    outputChannel.appendLine('[WARN] Voice input not available in this environment');
  } else {
    speechModule.warmUp().then(() => {
      outputChannel.appendLine('[INFO] Audio recorder warmed up and ready');
    }).catch((err: unknown) => {
      const msg = err instanceof Error ? err.message : String(err);
      outputChannel.appendLine(`[WARN] Audio warm-up failed: ${msg}`);
    });

    // Lazy-download Whisper model in background (so first transcription is fast)
    preloadWhisperModel().then(() => {
      outputChannel.appendLine('[INFO] Whisper model ready');
    });
  }

  const commandRouter = new CommandRouter(speechModule, injectModule, statusBar, outputChannel);
  context.subscriptions.push(commandRouter);

  // Update enhance button when a new prompt is spoken
  context.subscriptions.push(
    commandRouter.onLastPromptChange((prompt) => {
      enhanceButton.setPromptAvailable(prompt);
      // Track usage
      void usageTracker.recordPrompt(prompt.split(/\s+/).length, false);
    }),
  );

  // Set initial state
  if (isRemote) {
    statusBar.setState(ProthState.REMOTE);
  } else {
    statusBar.setState(ProthState.IDLE);
  }

  // Check if Gemini key exists for enhance button state
  keyManager.getKey('gemini').then((key) => {
    if (!key) enhanceButton.setNoKey();
  }).catch(() => { /* ignore */ });

  // --- Register commands ---

  context.subscriptions.push(
    vscode.commands.registerCommand('prother.activate', async () => {
      await commandRouter.activate('hotkey');
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('prother.switchProvider', async () => {
      await providerSelector.showPicker();
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('prother.cycleTarget', () => {
      targetSelector.cycle();
      outputChannel.appendLine(`[INFO] Target: ${targetSelector.getSelectedTarget()}`);
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('prother.enhance', async () => {
      const lastVoice = commandRouter.lastPrompt;

      // No voice prompt → show input box directly
      if (!lastVoice) {
        const typed = await vscode.window.showInputBox({
          title: 'Prother: Enhance a prompt',
          placeHolder: 'Type or paste a prompt to enhance',
        });
        if (!typed?.trim()) return;
        await runEnhancement(typed.trim());
        return;
      }

      // Voice prompt exists → toggle logic
      if (enhanceButton.getState() === 'confirm') {
        // Second click → enhance immediately (dismiss notification by proceeding)
        await runEnhancement(lastVoice);
      } else {
        // First click → enter confirm state + show notification with "Type New"
        enhanceButton.setConfirm();
        const choice = await vscode.window.showInformationMessage(
          'Click Enhance again to enhance, or:',
          'Type New',
        );
        // If user clicked "Type New" (and didn't click Enhance second time)
        if (choice === 'Type New' && enhanceButton.getState() !== 'enhancing') {
          enhanceButton.setDone();
          const typed = await vscode.window.showInputBox({
            title: 'Prother: Enhance a prompt',
            placeHolder: 'Type or paste a prompt to enhance',
          });
          if (!typed?.trim()) return;
          await runEnhancement(typed.trim());
        }
      }
    }),
  );

  /** Run the actual enhancement + injection flow */
  async function runEnhancement(prompt: string): Promise<void> {
    // Check for Gemini key
    const hasKey = await keyManager.getKey('gemini');
    if (!hasKey) {
      enhanceButton.setNoKey();
      const success = await onboardingManager.runSetup();
      if (!success) return;
    }

    try {
      enhanceButton.setEnhancing();
      outputChannel.appendLine(`[INFO] Enhancing: "${prompt}"`);

      const enhanced = await enhanceModule.enhance(prompt);
      outputChannel.appendLine(`[INFO] Enhanced: "${enhanced}"`);

      await commandRouter.processAndInject(enhanced, true);

      enhanceButton.setDone();
      void usageTracker.recordPrompt(enhanced.split(/\s+/).length, true);
    } catch (err) {
      enhanceButton.setDone();
      const message = err instanceof Error ? err.message : String(err);
      outputChannel.appendLine(`[ERROR] Enhancement failed: ${message}`);

      const choice = await vscode.window.showErrorMessage(
        'Prother: Enhancement failed.',
        'Keep Raw',
        'Retry',
      );

      if (choice === 'Retry') {
        await runEnhancement(prompt);
      }
    }
  }

  context.subscriptions.push(
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('prother.setup', async () => {
      await onboardingManager.runSetup();
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('prother.settings', () => {
      vscode.window.showInformationMessage('Prother: Settings panel coming in Phase 3');
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('prother.recentPrompts', () => {
      vscode.window.showInformationMessage('Prother: Recent Prompts coming in Phase 2');
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('prother.reportIssue', () => {
      vscode.env.openExternal(vscode.Uri.parse(ISSUES_URL));
    }),
  );

  // Show onboarding for first-time users (non-blocking)
  void onboardingManager.checkAndStart();

  outputChannel.appendLine('[INFO] Prother activated successfully (Phase 2).');
}

export function deactivate(): void {
  // Cleanup handled by disposables in context.subscriptions
}
