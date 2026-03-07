import * as vscode from 'vscode';
import { SPEECH_EXTENSION_ID } from '../core/constants';

export function showError(message: string, ...actions: string[]): Thenable<string | undefined> {
  return vscode.window.showErrorMessage(`Prother: ${message}`, ...actions);
}

export function showWarning(message: string, ...actions: string[]): Thenable<string | undefined> {
  return vscode.window.showWarningMessage(`Prother: ${message}`, ...actions);
}

export function showInfo(message: string, ...actions: string[]): Thenable<string | undefined> {
  return vscode.window.showInformationMessage(`Prother: ${message}`, ...actions);
}

export async function showSpeechExtensionMissing(): Promise<void> {
  const choice = await vscode.window.showInformationMessage(
    'Prother requires the VS Code Speech extension for voice input.',
    'Install Now',
  );
  if (choice === 'Install Now') {
    await vscode.commands.executeCommand(
      'workbench.extensions.installExtension',
      SPEECH_EXTENSION_ID,
    );
  }
}

export function showRemoteWarning(): void {
  vscode.window.showWarningMessage(
    'Prother: Audio features are not available in remote environments. Use VS Code Desktop locally.',
  );
}

export function showWebWarning(): void {
  vscode.window.showWarningMessage(
    'Prother requires VS Code Desktop. It does not work in VS Code for Web (vscode.dev) or GitHub Codespaces.',
  );
}
