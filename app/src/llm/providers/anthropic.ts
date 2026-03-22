import { BaseLLMProvider } from '../base-provider';
import { NetworkError, RateLimitError, ApiKeyError } from '../../core/errors';
import type { LLMRequest, LLMResponse } from '../../core/types';

/**
 * Anthropic Claude Haiku provider.
 */
export class AnthropicProvider extends BaseLLMProvider {
  readonly name = 'anthropic';

  async complete(request: LLMRequest, apiKey: string): Promise<LLMResponse> {
    const url = 'https://api.anthropic.com/v1/messages';

    const body = {
      model: 'claude-haiku-4-5-20251001',
      max_tokens: request.maxTokens ?? 1024,
      system: request.systemPrompt,
      messages: [
        { role: 'user', content: request.userMessage },
      ],
    };

    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify(body),
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new NetworkError(`Anthropic API request failed: ${msg}`);
    }

    if (response.status === 401) {
      throw new ApiKeyError('Anthropic API key rejected', 'Invalid Anthropic key. Run "Prother: Set Up API Key" to update it.');
    }
    if (response.status === 429) {
      throw new RateLimitError('Anthropic rate limit hit', 'anthropic');
    }
    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new NetworkError(`Anthropic API returned ${response.status}: ${text}`);
    }

    const json = await response.json() as {
      content?: Array<{ text?: string }>;
      usage?: { input_tokens?: number; output_tokens?: number };
    };

    const text = json.content?.[0]?.text ?? '';
    const tokensUsed = json.usage
      ? (json.usage.input_tokens ?? 0) + (json.usage.output_tokens ?? 0)
      : undefined;

    return { text: text.trim(), tokensUsed, provider: 'anthropic' };
  }
}
