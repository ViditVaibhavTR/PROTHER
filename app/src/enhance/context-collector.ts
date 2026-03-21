import * as vscode from 'vscode';
import { execSync } from 'child_process';
import type { EditorContext, DiagnosticSummary, GitSummary, ProjectHints } from '../core/types';

/** Cache project hints per session (read package.json once) */
let cachedHints: ProjectHints | null | undefined;

/**
 * Collects rich editor context for intent-aware prompt enhancement.
 */
export function collectEditorContext(): EditorContext {
  const editor = vscode.window.activeTextEditor;

  const activeFile = editor?.document.fileName ?? '';
  const language = editor?.document.languageId ?? 'plaintext';
  const selectedCode = editor
    ? editor.document.getText(editor.selection).trim() || null
    : null;

  const workspaceLanguages = [
    ...new Set(
      vscode.workspace.textDocuments
        .filter((d) => !d.isUntitled && d.languageId !== 'log')
        .map((d) => d.languageId),
    ),
  ];

  return {
    activeFile,
    selectedCode,
    language,
    workspaceLanguages,
    diagnostics: collectDiagnostics(editor),
    cursorContext: selectedCode ? null : collectCursorContext(editor),
    gitSummary: collectGitSummary(),
    projectHints: collectProjectHints(),
    isDirty: editor?.document.isDirty ?? false,
  };
}

/** Get top 3 diagnostics (errors first) on the active file */
function collectDiagnostics(editor: vscode.TextEditor | undefined): DiagnosticSummary[] {
  if (!editor) return [];

  const allDiags = vscode.languages.getDiagnostics(editor.document.uri);
  if (allDiags.length === 0) return [];

  // Sort: errors first, then warnings, then by line number
  const sorted = [...allDiags]
    .filter((d) => d.severity <= vscode.DiagnosticSeverity.Warning)
    .sort((a, b) => a.severity - b.severity || a.range.start.line - b.range.start.line);

  return sorted.slice(0, 3).map((d) => {
    const line = d.range.start.line;
    let sourceLine = '';
    try {
      sourceLine = editor.document.lineAt(line).text.trim();
    } catch { /* line might be out of range */ }

    return {
      severity: d.severity === vscode.DiagnosticSeverity.Error ? 'error' : 'warning',
      message: d.message.length > 150 ? d.message.substring(0, 150) + '...' : d.message,
      line: line + 1, // 1-indexed for humans
      sourceLine: sourceLine.length > 120 ? sourceLine.substring(0, 120) + '...' : sourceLine,
    };
  });
}

/** Get ~5 lines around the cursor when no text is selected */
function collectCursorContext(editor: vscode.TextEditor | undefined): string | null {
  if (!editor) return null;

  const cursorLine = editor.selection.active.line;
  const doc = editor.document;
  const totalLines = doc.lineCount;

  const start = Math.max(0, cursorLine - 5);
  const end = Math.min(totalLines - 1, cursorLine + 5);

  const lines: string[] = [];
  for (let i = start; i <= end; i++) {
    const prefix = i === cursorLine ? '>>>' : '   ';
    const text = doc.lineAt(i).text;
    const truncated = text.length > 120 ? text.substring(0, 120) + '...' : text;
    lines.push(`${prefix} ${i + 1}: ${truncated}`);
  }

  return lines.join('\n');
}

/** Get git branch + diff summary (500ms timeout) */
function collectGitSummary(): GitSummary | null {
  const cwd = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  if (!cwd) return null;

  try {
    const branch = execSync('git branch --show-current', { cwd, timeout: 500, encoding: 'utf8' }).trim();
    const diffStat = execSync('git diff --stat', { cwd, timeout: 500, encoding: 'utf8' }).trim();

    if (!diffStat) return null;

    // Count modified files from diff stat output
    const lastLine = diffStat.split('\n').pop() ?? '';
    const filesMatch = lastLine.match(/(\d+) files? changed/);
    const modifiedFiles = filesMatch ? parseInt(filesMatch[1], 10) : 0;

    // Compact the diff stat (just file names + changes, limit to 10 files)
    const fileLines = diffStat.split('\n').slice(0, -1).slice(0, 10);
    const compact = fileLines.map((l) => l.trim()).join('\n');

    return {
      branch,
      modifiedFiles,
      diffSummary: compact.length > 500 ? compact.substring(0, 500) + '\n...' : compact,
    };
  } catch {
    return null; // git not available or not a repo
  }
}

/** Detect project framework from package.json (cached) */
function collectProjectHints(): ProjectHints | null {
  if (cachedHints !== undefined) return cachedHints;

  const cwd = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  if (!cwd) {
    cachedHints = null;
    return null;
  }

  try {
    const fs = require('fs') as typeof import('fs');
    const path = require('path') as typeof import('path');
    const pkgPath = path.join(cwd, 'package.json');

    if (!fs.existsSync(pkgPath)) {
      cachedHints = null;
      return null;
    }

    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8')) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };

    const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
    const depNames = Object.keys(allDeps);

    let framework: string | null = null;
    if (depNames.includes('next')) framework = 'Next.js';
    else if (depNames.includes('nuxt')) framework = 'Nuxt';
    else if (depNames.includes('react')) framework = 'React';
    else if (depNames.includes('vue')) framework = 'Vue';
    else if (depNames.includes('@angular/core')) framework = 'Angular';
    else if (depNames.includes('svelte')) framework = 'Svelte';
    else if (depNames.includes('express')) framework = 'Express';
    else if (depNames.includes('fastify')) framework = 'Fastify';

    const primaryLanguage = depNames.includes('typescript') ? 'TypeScript' : 'JavaScript';

    cachedHints = { framework, primaryLanguage };
    return cachedHints;
  } catch {
    cachedHints = null;
    return null;
  }
}
