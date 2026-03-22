import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock vscode before importing the provider
vi.mock('vscode', () => ({
  workspace: {
    getConfiguration: () => ({
      get: (_key: string, defaultVal: string) => defaultVal,
    }),
  },
}));

import { GeminiProvider } from '../../llm/providers/gemini';

describe('GeminiProvider', () => {
  const provider = new GeminiProvider();
  const mockFetch = vi.fn();
  const testKey = 'test-api-key';
  const request = { systemPrompt: 'You are helpful', userMessage: 'Hello' };

  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function mockResponse(status: number, body: unknown) {
    return {
      ok: status >= 200 && status < 300,
      status,
      json: () => Promise.resolve(body),
      text: () => Promise.resolve(JSON.stringify(body)),
    };
  }

  it('extracts text from successful response', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse(200, {
      candidates: [{ content: { parts: [{ text: 'Enhanced prompt here' }] } }],
      usageMetadata: { totalTokenCount: 42 },
    }));

    const result = await provider.complete(request, testKey);
    expect(result.text).toBe('Enhanced prompt here');
    expect(result.tokensUsed).toBe(42);
    expect(result.provider).toBe('gemini');
  });

  it('returns empty string for empty candidates', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse(200, { candidates: [] }));
    const result = await provider.complete(request, testKey);
    expect(result.text).toBe('');
  });

  it('throws ApiKeyError on 401', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse(401, {}));
    await expect(provider.complete(request, testKey)).rejects.toThrow('API key rejected');
  });

  it('throws ApiKeyError on 403', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse(403, {}));
    await expect(provider.complete(request, testKey)).rejects.toThrow('API key rejected');
  });

  it('throws NetworkError on 404 with model name', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse(404, {}));
    await expect(provider.complete(request, testKey)).rejects.toThrow('not found');
  });

  it('throws RateLimitError on 429', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse(429, {}));
    await expect(provider.complete(request, testKey)).rejects.toThrow('rate limit');
  });

  it('throws NetworkError on 500', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse(500, { error: 'server error' }));
    await expect(provider.complete(request, testKey)).rejects.toThrow('500');
  });

  it('throws NetworkError on fetch failure', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Connection refused'));
    await expect(provider.complete(request, testKey)).rejects.toThrow('Connection refused');
  });

  it('sends correct request body structure', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse(200, {
      candidates: [{ content: { parts: [{ text: 'ok' }] } }],
    }));

    await provider.complete(request, testKey);

    const [url, options] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('generateContent');
    expect(url).toContain('key=test-api-key');

    const body = JSON.parse(options.body as string);
    expect(body.systemInstruction.parts[0].text).toBe('You are helpful');
    expect(body.contents[0].parts[0].text).toBe('Hello');
  });

  it('uses default model name gemini-2.5-flash', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse(200, {
      candidates: [{ content: { parts: [{ text: 'ok' }] } }],
    }));

    await provider.complete(request, testKey);
    const [url] = mockFetch.mock.calls[0] as [string];
    expect(url).toContain('gemini-2.5-flash');
  });
});
