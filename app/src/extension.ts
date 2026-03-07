import * as vscode from 'vscode';
import { ProthState } from './core/types';
import { StatusBar } from './ui/status-bar';
import { SpeechModule } from './speech/speech-module';
import { InjectModule } from './inject/inject-module';
import { CommandRouter } from './core/command-router';
import { showSpeechExtensionMissing, showRemoteWarning, showWebWarning } from './ui/notifications';
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
  const hasSpeechApi = typeof (vscode as Record<string, unknown>).speech !== 'undefined';

  if (isRemote) {
    showRemoteWarning();
    outputChannel.appendLine(`[WARN] Remote environment detected: ${vscode.env.remoteName}`);
  }

  if (!hasSpeechApi) {
    showWebWarning();
    outputChannel.appendLine('[WARN] vscode.speech API not available');
  }

  if (!vscode.extensions.getExtension('ms-vscode.vscode-speech')) {
    showSpeechExtensionMissing();
  }

  // --- Core components ---

  const statusBar = new StatusBar();
  context.subscriptions.push(statusBar);

  const speechModule = new SpeechModule();
  context.subscriptions.push(speechModule);

  const injectModule = new InjectModule();
  context.subscriptions.push(injectModule);

  const commandRouter = new CommandRouter(speechModule, injectModule, statusBar, outputChannel);
  context.subscriptions.push(commandRouter);

  // Set initial state based on environment
  if (isRemote) {
    statusBar.setState(ProthState.REMOTE);
  } else if (!hasSpeechApi) {
    statusBar.setState(ProthState.DISABLED);
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
    vscode.commands.registerCommand('prother.setup', () => {
      vscode.window.showInformationMessage('Prother: API Key setup coming in Phase 2');
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
