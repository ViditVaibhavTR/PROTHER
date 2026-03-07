/**
 * Minimal vscode API mock for unit testing.
 * Only mocks what Phase 1 components actually use.
 */
import { vi } from 'vitest';

export function createMockOutputChannel() {
  return {
    appendLine: vi.fn(),
    dispose: vi.fn(),
  };
}

export function createMockStatusBarItem() {
  return {
    text: '',
    tooltip: '',
    command: '',
    show: vi.fn(),
    hide: vi.fn(),
    dispose: vi.fn(),
  };
}

export function createMockClipboard() {
  let content = '';
  return {
    readText: vi.fn(async () => content),
    writeText: vi.fn(async (text: string) => {
      content = text;
    }),
  };
}

export function createMockExtensions(installed: string[] = []) {
  return {
    getExtension: vi.fn((id: string) => {
      if (installed.includes(id)) {
        return { id, isActive: true };
      }
      return undefined;
    }),
  };
}

export function createMockTerminal(name: string) {
  return {
    name,
    sendText: vi.fn(),
    show: vi.fn(),
  };
}
