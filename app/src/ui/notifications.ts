import * as vscode from 'vscode';

export function showError(message: string, ...actions: string[]): Thenable<string | undefined> {
  return vscode.window.showErrorMessage(`Prother: ${message}`, ...actions);
}

export function showWarning(message: string, ...actions: string[]): Thenable<string | undefined> {
  return vscode.window.showWarningMessage(`Prother: ${message}`, ...actions);
}

export function showInfo(message: string, ...actions: string[]): Thenable<string | undefined> {
  return vscode.window.showInformationMessage(`Prother: ${message}`, ...actions);
}

export function showRemoteWarning(): void {
  vscode.window.showWarningMessage(
    'Prother: Audio features are not available in remote environments. Use VS Code Desktop locally.',
  );
}
