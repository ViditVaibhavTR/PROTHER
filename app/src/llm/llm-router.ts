import * as vscode from 'vscode';
import { BaseLLMProvider } from './base-provider';
import { GeminiProvider } from './providers/gemini';
import { OpenAIProvider } from './providers/openai';
import { AnthropicProvider } from './providers/anthropic';
import { GroqProvider } from './providers/groq';
import { RateLimiter } from './rate-limiter';
import { EnhancementError } from '../core/errors';
import type { KeyManager, LLMProvider } from '../keys/key-manager';
import type { LLMRequest, LLMResponse } from '../core/types';

const PROVIDER_LABELS: Record<string, string> = {
  gemini: 'Gemini',
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  groq: 'Groq',
};

/**
 * Routes LLM requests to the user's configured provider with rate limiting.
 * Supports: Gemini, OpenAI, Anthropic, Groq.
 */
export class LLMRouter {
  private readonly providers: Map<string, BaseLLMProvider> = new Map();
  private readonly rateLimiter = new RateLimiter();

  constructor(private readonly keyManager: KeyManager) {
    this.providers.set('gemini', new GeminiProvider());
    this.providers.set('openai', new OpenAIProvider());
    this.providers.set('anthropic', new AnthropicProvider());
    this.providers.set('groq', new GroqProvider());
  }

  /** Send a completion request to the configured provider */
  async complete(request: LLMRequest): Promise<LLMResponse> {
    const providerName = vscode.workspace
      .getConfiguration('prother')
      .get<string>('llm.defaultProvider', 'gemini');

    const provider = this.providers.get(providerName);
    if (!provider) {
      throw new EnhancementError(
        `Provider "${providerName}" not available`,
        `LLM provider "${providerName}" not found. Check prother.llm.defaultProvider in settings.`,
      );
    }

    const label = PROVIDER_LABELS[providerName] ?? providerName;
    const apiKey = await this.keyManager.getKey(providerName as LLMProvider);
    if (!apiKey) {
      throw new EnhancementError(
        'No API key for ' + providerName,
        `No ${label} API key set. Run "Prother: Set Up API Key" to add one.`,
      );
    }

    // Enforce rate limit (4s gap per provider)
    await this.rateLimiter.waitAndRecord(providerName);

    return provider.complete(request, apiKey);
  }
}
