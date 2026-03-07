import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock vscode
const mockGetExtension = vi.fn();
const mockTerminals: Array<{ name: string }> = [];

vi.mock('vscode', () => ({
  extensions: {
    getExtension: (...args: unknown[]) => mockGetExtension(...args),
  },
  window: {
    get terminals() {
      return mockTerminals;
    },
    get activeTerminal() {
      return mockTerminals[0] ?? null;
    },
  },
}));

import { ExtensionDetector } from '../../inject/extension-detector';

describe('ExtensionDetector', () => {
  let detector: ExtensionDetector;

  beforeEach(() => {
    detector = new ExtensionDetector();
    mockGetExtension.mockReset();
    mockTerminals.length = 0;
  });

  it('returns empty array when no AI extensions installed', () => {
    mockGetExtension.mockReturnValue(undefined);
    expect(detector.detectExtensions()).toEqual([]);
  });

  it('detects Copilot Chat when installed', () => {
    mockGetExtension.mockImplementation((id: string) => {
      if (id === 'github.copilot-chat') return { isActive: true };
      return undefined;
    });

    const results = detector.detectExtensions();
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe('github.copilot-chat');
    expect(results[0].displayName).toBe('GitHub Copilot Chat');
    expect(results[0].installed).toBe(true);
  });

  it('detects multiple extensions', () => {
    mockGetExtension.mockImplementation((id: string) => {
      if (id === 'github.copilot-chat') return { isActive: true };
      if (id === 'saoudrizwan.claude-dev') return { isActive: false };
      return undefined;
    });

    const results = detector.detectExtensions();
    expect(results).toHaveLength(2);
    expect(results.map((r) => r.id)).toContain('github.copilot-chat');
    expect(results.map((r) => r.id)).toContain('saoudrizwan.claude-dev');
  });

  it('detects Claude Code terminal by name', () => {
    mockGetExtension.mockReturnValue(undefined);
    mockTerminals.push({ name: 'Claude Code' });

    const results = detector.detectExtensions();
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe('claude-code-terminal');
    expect(results[0].type).toBe('terminal');
  });

  it('ignores non-matching terminals', () => {
    mockGetExtension.mockReturnValue(undefined);
    mockTerminals.push({ name: 'bash' });
    mockTerminals.push({ name: 'PowerShell' });

    expect(detector.detectExtensions()).toEqual([]);
  });
});
