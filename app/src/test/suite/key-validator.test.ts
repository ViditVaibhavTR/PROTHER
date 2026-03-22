import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { validateGeminiKey } from '../../keys/key-validator';

describe('validateGeminiKey', () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns valid for 200 OK', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, status: 200 });
    const result = await validateGeminiKey('test-key-123');
    expect(result.valid).toBe(true);
  });

  it('returns invalid for 400', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 400 });
    const result = await validateGeminiKey('bad-key');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Invalid');
  });

  it('returns invalid for 403', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 403 });
    const result = await validateGeminiKey('forbidden-key');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Invalid');
  });

  it('returns valid for 429 (rate limited but key is good)', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 429 });
    const result = await validateGeminiKey('rate-limited-key');
    expect(result.valid).toBe(true);
  });

  it('returns invalid for unexpected status', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });
    const result = await validateGeminiKey('some-key');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('500');
  });

  it('returns invalid on network error', async () => {
    mockFetch.mockRejectedValueOnce(new Error('DNS resolution failed'));
    const result = await validateGeminiKey('some-key');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Network error');
  });

  it('sends key as query parameter', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, status: 200 });
    await validateGeminiKey('my-api-key-123');
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('key=my-api-key-123'),
      expect.anything(),
    );
  });
});
