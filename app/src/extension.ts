import * as vscode from 'vscode';
import { ProthState } from './core/types';
import { StatusBar } from './ui/status-bar';
import { SpeechModule } from './speech/speech-module';
import { InjectModule } from './inject/inject-module';
import { CommandRouter } from './core/command-router';
import { KeyManager } from './keys/key-manager';
import { showRemoteWarning } from './ui/notifications';
import { ISSUES_URL } from './core/constants';

let rejectionHandlerRegistered = false;

export function activate(context: vscode.ExtensionContext): void {
  const outputChannel = vscode.window.createOutputChannel('Prother');
  context.subscriptions.push(outputChannel);
  outputChannel.appendLine('[INFO] Prother activating...');

  // Global unhandled rejection handler — registered once, never stacks
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
  context.subscriptions.push(statusBar);

  const keyManager = new KeyManager(context.secrets);
  context.subscriptions.push(keyManager);

  const speechModule = new SpeechModule();
  context.subscriptions.push(speechModule);

  if (!speechModule.isAvailable()) {
    outputChannel.appendLine('[WARN] Voice input not available in this environment');
  } else {
    // Pre-warm PowerShell in background (compiles C# interop ~2-3s)
    // After this, Ctrl+Shift+V starts recording instantly
    void speechModule.warmUp().then(() => {
      outputChannel.appendLine('[INFO] Audio recorder warmed up and ready');
    });
  }

  const injectModule = new InjectModule();
  context.subscriptions.push(injectModule);

  const commandRouter = new CommandRouter(speechModule, injectModule, statusBar, outputChannel);
  context.subscriptions.push(commandRouter);

  // Set initial state
  if (isRemote) {
    statusBar.setState(ProthState.REMOTE);
  } else {
    statusBar.setState(ProthState.IDLE);
  }

  // --- Register commands ---

  context.subscriptions.push(
    vscode.commands.registerCommand('prother.activate', async () => {
      await commandRouter.activate('hotkey');
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('prother.enhance', () => {
      vscode.window.showInformationMessage('Prother: Enhancement coming in Phase 2');
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('prother.setup', async () => {
      await keyManager.getOrPrompt('openai', 'OpenAI');
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

  outputChannel.appendLine('[INFO] Prother activated successfully.');
}

export function deactivate(): void {
  // Cleanup handled by disposables in context.subscriptions
}
