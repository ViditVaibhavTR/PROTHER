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
import { UsageTracker } from './telemetry/usage-tracker';
import { showRemoteWarning, showError } from './ui/notifications';
import { ISSUES_URL } from './core/constants';

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

  context.subscriptions.push(statusBar, targetSelector, enhanceButton, keyManager, speechModule, injectModule);

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
    vscode.commands.registerCommand('prother.cycleTarget', () => {
      targetSelector.cycle();
      outputChannel.appendLine(`[INFO] Target: ${targetSelector.getSelectedTarget()}`);
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('prother.enhance', async () => {
      const lastPrompt = commandRouter.lastPrompt;

      if (!lastPrompt) {
        showError('Speak a prompt first (Ctrl+Shift+V), then click Enhance.');
        return;
      }

      // Check for Gemini key
      const hasKey = await keyManager.getKey('gemini');
      if (!hasKey) {
        enhanceButton.setNoKey();
        const success = await onboardingManager.runSetup();
        if (!success) return;
        enhanceButton.setPromptAvailable(lastPrompt);
      }

      try {
        enhanceButton.setEnhancing();
        outputChannel.appendLine(`[INFO] Enhancing: "${lastPrompt}"`);

        const enhanced = await enhanceModule.enhance(lastPrompt);
        outputChannel.appendLine(`[INFO] Enhanced: "${enhanced}"`);

        // Inject enhanced prompt into the target
        await commandRouter.processAndInject(enhanced);

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
          await vscode.commands.executeCommand('prother.enhance');
        }
      }
    }),
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
