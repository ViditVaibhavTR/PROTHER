import { BaseLLMProvider } from './base-provider';
import { GeminiProvider } from './providers/gemini';
import { RateLimiter } from './rate-limiter';
import { EnhancementError } from '../core/errors';
import type { KeyManager } from '../keys/key-manager';
import type { LLMRequest, LLMResponse } from '../core/types';

/**
 * Routes LLM requests to the configured provider with rate limiting.
 * Phase 2: Gemini only. Phase 3 will add Anthropic, OpenAI, Groq.
 */
export class LLMRouter {
  private readonly providers: Map<string, BaseLLMProvider> = new Map();
  private readonly rateLimiter = new RateLimiter();

  constructor(private readonly keyManager: KeyManager) {
    this.providers.set('gemini', new GeminiProvider());
  }

  /** Send a completion request to the configured provider */
  async complete(request: LLMRequest): Promise<LLMResponse> {
    const providerName = 'gemini'; // Phase 2: hardcoded. Phase 3: from settings.
    const provider = this.providers.get(providerName);

    if (!provider) {
      throw new EnhancementError(
        `Provider "${providerName}" not available`,
        'LLM provider not configured. Check Prother settings.',
      );
    }

    const apiKey = await this.keyManager.getKey(providerName);
    if (!apiKey) {
      throw new EnhancementError(
        'No API key for ' + providerName,
        'No Gemini API key set. Click "Prother: Set Up API Key" to add one.',
      );
    }

    // Enforce rate limit (4s gap)
    await this.rateLimiter.waitAndRecord(providerName);

    return provider.complete(request, apiKey);
  }
}
