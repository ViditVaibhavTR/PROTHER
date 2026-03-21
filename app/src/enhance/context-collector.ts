import * as vscode from 'vscode';
import type { EditorContext } from '../core/types';

/**
 * Collects code context from the active editor for prompt enhancement.
 */
export function collectEditorContext(): EditorContext {
  const editor = vscode.window.activeTextEditor;

  const activeFile = editor?.document.fileName ?? '';
  const language = editor?.document.languageId ?? 'plaintext';
  const selectedCode = editor
    ? editor.document.getText(editor.selection).trim() || null
    : null;

  // Collect unique languages across open documents
  const workspaceLanguages = [
    ...new Set(
      vscode.workspace.textDocuments
        .filter((d) => !d.isUntitled && d.languageId !== 'log')
        .map((d) => d.languageId),
    ),
  ];

  return { activeFile, selectedCode, language, workspaceLanguages };
}
