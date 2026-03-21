import { MIN_REQUEST_GAP_MS } from '../core/constants';

/**
 * Client-side rate limiter for LLM API calls.
 * Enforces a minimum gap between requests to the same provider.
 */
export class RateLimiter {
  private lastRequestTime: Map<string, number> = new Map();

  /** Check if we can make a request to this provider right now */
  canMakeRequest(provider: string): boolean {
    const last = this.lastRequestTime.get(provider);
    if (!last) return true;
    return Date.now() - last >= MIN_REQUEST_GAP_MS;
  }

  /** Get milliseconds to wait before next request is allowed */
  getWaitTime(provider: string): number {
    const last = this.lastRequestTime.get(provider);
    if (!last) return 0;
    const elapsed = Date.now() - last;
    return Math.max(0, MIN_REQUEST_GAP_MS - elapsed);
  }

  /** Record that a request was made */
  recordRequest(provider: string): void {
    this.lastRequestTime.set(provider, Date.now());
  }

  /** Wait until we can make a request, then record it */
  async waitAndRecord(provider: string): Promise<void> {
    const wait = this.getWaitTime(provider);
    if (wait > 0) {
      await new Promise((resolve) => setTimeout(resolve, wait));
    }
    this.recordRequest(provider);
  }
}
