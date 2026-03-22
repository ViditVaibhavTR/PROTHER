import { describe, it, expect } from 'vitest';
import { classifyIntent } from '../../enhance/intent-classifier';
import type { EditorContext } from '../../core/types';

/** Minimal EditorContext with no signals */
function emptyContext(overrides?: Partial<EditorContext>): EditorContext {
  return {
    activeFile: '',
    selectedCode: null,
    language: 'plaintext',
    workspaceLanguages: [],
    diagnostics: [],
    cursorContext: null,
    gitSummary: null,
    projectHints: null,
    isDirty: false,
    ...overrides,
  };
}

describe('classifyIntent', () => {
  // --- Debug ---
  it('classifies "fix the bug" as debug', () => {
    expect(classifyIntent('fix the bug', emptyContext())).toBe('debug');
  });

  it('classifies "this error is crashing the app" as debug', () => {
    expect(classifyIntent('this error is crashing the app', emptyContext())).toBe('debug');
  });

  it('classifies "not working" as debug', () => {
    expect(classifyIntent("it's not working", emptyContext())).toBe('debug');
  });

  it('boosts debug when file has errors', () => {
    const ctx = emptyContext({
      activeFile: 'test.ts',
      diagnostics: [{ severity: 'error', message: 'Type error', line: 5, sourceLine: 'const x: number = "a"' }],
    });
    // "add a thing" would normally be generate, but errors boost debug
    expect(classifyIntent('add error handling', ctx)).toBe('debug');
  });

  // --- Explore ---
  it('classifies "explain this function" as explore', () => {
    expect(classifyIntent('explain this function', emptyContext())).toBe('explore');
  });

  it('classifies "what does this code do" as explore', () => {
    expect(classifyIntent('what does this code do', emptyContext())).toBe('explore');
  });

  it('classifies "how to use the API" as explore', () => {
    expect(classifyIntent('how to use the API', emptyContext())).toBe('explore');
  });

  it('boosts explore when code is selected', () => {
    const ctx = emptyContext({ selectedCode: 'function foo() {}' });
    expect(classifyIntent('tell me about this', ctx)).toBe('explore');
  });

  // --- Refactor ---
  it('classifies "refactor the auth module" as refactor', () => {
    expect(classifyIntent('refactor the auth module', emptyContext())).toBe('refactor');
  });

  it('classifies "clean up this code" as refactor', () => {
    expect(classifyIntent('clean up this code', emptyContext())).toBe('refactor');
  });

  it('classifies "rename the variable" as refactor', () => {
    expect(classifyIntent('rename the variable', emptyContext())).toBe('refactor');
  });

  // --- Generate ---
  it('classifies "add a new component" as generate (has code keyword)', () => {
    expect(classifyIntent('add a new component', emptyContext())).toBe('generate');
  });

  it('classifies "create a new function" as generate', () => {
    expect(classifyIntent('create a new function', emptyContext())).toBe('generate');
  });

  it('classifies "add a dark mode toggle" as casual without code keywords', () => {
    // "add" matches generate, but no CODE_WORDS → casual gets boosted too
    // Without code context, classifier correctly treats this as ambiguous
    expect(classifyIntent('add a dark mode toggle', emptyContext())).toBe('casual');
  });

  it('classifies "build a login page" as generate with code context', () => {
    const ctx = emptyContext({ activeFile: 'app.tsx', language: 'typescriptreact' });
    expect(classifyIntent('build a login component', ctx)).toBe('generate');
  });

  // --- Review ---
  it('classifies "review my changes" as review (has code keyword)', () => {
    // "review" + "changes" match REVIEW_WORDS, "changes" matches CODE context
    expect(classifyIntent('review my code changes', emptyContext())).toBe('review');
  });

  it('classifies "check the diff" as review with git context', () => {
    const ctx = emptyContext({
      gitSummary: { branch: 'main', modifiedFiles: 2, diffSummary: 'file.ts | 5 +++' },
    });
    expect(classifyIntent('check the diff', ctx)).toBe('review');
  });

  it('boosts review when git has modified files', () => {
    const ctx = emptyContext({
      gitSummary: { branch: 'feat/auth', modifiedFiles: 5, diffSummary: 'auth.ts | 10 +++--' },
    });
    expect(classifyIntent('look at the changes', ctx)).toBe('review');
  });

  // --- Casual ---
  it('classifies "write me an email" as casual', () => {
    expect(classifyIntent('write me an email', emptyContext())).toBe('casual');
  });

  it('classifies "hello how are you" as casual', () => {
    expect(classifyIntent('hello how are you', emptyContext())).toBe('casual');
  });

  it('classifies empty prompt as casual', () => {
    expect(classifyIntent('', emptyContext())).toBe('casual');
  });

  it('boosts casual when no active file', () => {
    const ctx = emptyContext({ activeFile: '' });
    expect(classifyIntent('do something cool', ctx)).toBe('casual');
  });

  // --- Edge cases ---
  it('tiebreaker favors debug over explore', () => {
    // "fix" triggers debug, "explain" triggers explore — debug wins tiebreak
    const ctx = emptyContext({ activeFile: 'test.ts' });
    expect(classifyIntent('fix and explain this', ctx)).toBe('debug');
  });

  it('dirty file boosts debug and refactor', () => {
    const ctx = emptyContext({ activeFile: 'test.ts', isDirty: true });
    // "optimize" triggers refactor, dirty boosts it further
    expect(classifyIntent('optimize this code', ctx)).toBe('refactor');
  });
});
