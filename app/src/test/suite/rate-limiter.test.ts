import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RateLimiter } from '../../llm/rate-limiter';

describe('RateLimiter', () => {
  let limiter: RateLimiter;

  beforeEach(() => {
    vi.useFakeTimers();
    limiter = new RateLimiter();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('allows first request immediately', () => {
    expect(limiter.canMakeRequest('gemini')).toBe(true);
  });

  it('blocks second request within 4s', () => {
    limiter.recordRequest('gemini');
    expect(limiter.canMakeRequest('gemini')).toBe(false);
  });

  it('allows second request after 4s', () => {
    limiter.recordRequest('gemini');
    vi.advanceTimersByTime(4000);
    expect(limiter.canMakeRequest('gemini')).toBe(true);
  });

  it('returns correct wait time', () => {
    limiter.recordRequest('gemini');
    vi.advanceTimersByTime(1000);
    expect(limiter.getWaitTime('gemini')).toBe(3000);
  });

  it('returns 0 wait time when no prior request', () => {
    expect(limiter.getWaitTime('gemini')).toBe(0);
  });

  it('returns 0 wait time after cooldown', () => {
    limiter.recordRequest('gemini');
    vi.advanceTimersByTime(5000);
    expect(limiter.getWaitTime('gemini')).toBe(0);
  });

  it('tracks providers independently', () => {
    limiter.recordRequest('gemini');
    expect(limiter.canMakeRequest('gemini')).toBe(false);
    expect(limiter.canMakeRequest('openai')).toBe(true);
  });

  it('waitAndRecord delays correctly', async () => {
    limiter.recordRequest('gemini');
    vi.advanceTimersByTime(1000); // 1s elapsed, 3s remaining

    const promise = limiter.waitAndRecord('gemini');
    vi.advanceTimersByTime(3000);
    await promise;

    // After waiting, another request should be blocked again
    expect(limiter.canMakeRequest('gemini')).toBe(false);
  });

  it('waitAndRecord resolves immediately for new provider', async () => {
    const promise = limiter.waitAndRecord('gemini');
    await promise;
    expect(limiter.canMakeRequest('gemini')).toBe(false);
  });
});
