import { describe, it, expect } from 'vitest';
import { getSystemPromptForIntent, buildEnhancementMessage } from '../../enhance/prompt-templates';
import type { EditorContext, Intent } from '../../core/types';

function makeContext(overrides?: Partial<EditorContext>): EditorContext {
  return {
    activeFile: '/src/app.ts',
    selectedCode: null,
    language: 'typescript',
    workspaceLanguages: ['typescript', 'json'],
    diagnostics: [],
    cursorContext: null,
    gitSummary: null,
    projectHints: null,
    isDirty: false,
    ...overrides,
  };
}

describe('getSystemPromptForIntent', () => {
  const intents: Intent[] = ['debug', 'explore', 'refactor', 'generate', 'review', 'casual'];

  it('returns a different prompt for each intent', () => {
    const prompts = intents.map((i) => getSystemPromptForIntent(i));
    const unique = new Set(prompts);
    expect(unique.size).toBe(intents.length);
  });

  it.each(intents)('returns a non-empty string for %s', (intent) => {
    const prompt = getSystemPromptForIntent(intent);
    expect(prompt.length).toBeGreaterThan(20);
  });

  it('debug prompt mentions error/bug', () => {
    expect(getSystemPromptForIntent('debug').toLowerCase()).toMatch(/error|bug|fix/);
  });

  it('casual prompt says to fix grammar', () => {
    expect(getSystemPromptForIntent('casual').toLowerCase()).toMatch(/grammar/);
  });
});

describe('buildEnhancementMessage', () => {
  it('always includes the user prompt', () => {
    const msg = buildEnhancementMessage('fix this', makeContext(), 'debug');
    expect(msg).toContain('fix this');
  });

  // --- Debug intent ---
  it('debug includes file and language', () => {
    const msg = buildEnhancementMessage('fix the error', makeContext(), 'debug');
    expect(msg).toContain('app.ts');
    expect(msg).toContain('typescript');
  });

  it('debug includes diagnostics', () => {
    const ctx = makeContext({
      diagnostics: [{ severity: 'error', message: 'Type mismatch', line: 10, sourceLine: 'const x = "a"' }],
    });
    const msg = buildEnhancementMessage('fix this', ctx, 'debug');
    expect(msg).toContain('Type mismatch');
    expect(msg).toContain('line 10');
  });

  // --- Explore intent ---
  it('explore includes selected code', () => {
    const ctx = makeContext({ selectedCode: 'function hello() { return "world"; }' });
    const msg = buildEnhancementMessage('explain this', ctx, 'explore');
    expect(msg).toContain('function hello');
  });

  it('explore includes cursor context when no selection', () => {
    const ctx = makeContext({ cursorContext: '>>> 5: const x = 42;' });
    const msg = buildEnhancementMessage('what is this', ctx, 'explore');
    expect(msg).toContain('const x = 42');
  });

  // --- Generate intent ---
  it('generate includes project hints', () => {
    const ctx = makeContext({ projectHints: { framework: 'React', primaryLanguage: 'TypeScript' } });
    const msg = buildEnhancementMessage('add a button', ctx, 'generate');
    expect(msg).toContain('React');
    expect(msg).toContain('TypeScript');
  });

  it('generate includes workspace languages', () => {
    const msg = buildEnhancementMessage('add a feature', makeContext(), 'generate');
    expect(msg).toContain('typescript');
  });

  it('generate does NOT include diagnostics', () => {
    const ctx = makeContext({
      diagnostics: [{ severity: 'error', message: 'Error here', line: 1, sourceLine: 'x' }],
    });
    const msg = buildEnhancementMessage('add feature', ctx, 'generate');
    expect(msg).not.toContain('Error here');
  });

  // --- Review intent ---
  it('review includes git summary', () => {
    const ctx = makeContext({
      gitSummary: { branch: 'feat/auth', modifiedFiles: 3, diffSummary: 'auth.ts | 10 +++--' },
    });
    const msg = buildEnhancementMessage('review this', ctx, 'review');
    expect(msg).toContain('feat/auth');
    expect(msg).toContain('auth.ts');
  });

  // --- Casual intent ---
  it('casual includes NO context', () => {
    const ctx = makeContext({
      diagnostics: [{ severity: 'error', message: 'Error', line: 1, sourceLine: 'x' }],
      selectedCode: 'some code',
      gitSummary: { branch: 'main', modifiedFiles: 1, diffSummary: 'file.ts' },
    });
    const msg = buildEnhancementMessage('write an email', ctx, 'casual');
    expect(msg).not.toContain('Error');
    expect(msg).not.toContain('some code');
    expect(msg).not.toContain('file.ts');
  });

  // --- Truncation ---
  it('truncates selected code over 800 chars', () => {
    const longCode = 'x'.repeat(1000);
    const ctx = makeContext({ selectedCode: longCode });
    const msg = buildEnhancementMessage('explain', ctx, 'explore');
    expect(msg).toContain('(truncated)');
    expect(msg.length).toBeLessThan(1500);
  });

  // --- Null handling ---
  it('handles null gitSummary gracefully', () => {
    const msg = buildEnhancementMessage('review', makeContext({ gitSummary: null }), 'review');
    expect(msg).not.toContain('Branch:');
  });

  it('handles null projectHints gracefully', () => {
    const msg = buildEnhancementMessage('add feature', makeContext({ projectHints: null }), 'generate');
    expect(msg).toContain('add feature');
  });
});
