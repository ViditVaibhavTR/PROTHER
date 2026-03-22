import { BaseLLMProvider } from '../base-provider';
import { NetworkError, RateLimitError, ApiKeyError } from '../../core/errors';
import type { LLMRequest, LLMResponse } from '../../core/types';

/**
 * OpenAI GPT-4o Mini provider.
 */
export class OpenAIProvider extends BaseLLMProvider {
  readonly name = 'openai';

  async complete(request: LLMRequest, apiKey: string): Promise<LLMResponse> {
    const url = 'https://api.openai.com/v1/chat/completions';

    const body = {
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: request.systemPrompt },
        { role: 'user', content: request.userMessage },
      ],
      max_tokens: request.maxTokens ?? 1024,
      temperature: request.temperature ?? 0.3,
    };

    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new NetworkError(`OpenAI API request failed: ${msg}`);
    }

    if (response.status === 401) {
      throw new ApiKeyError('OpenAI API key rejected', 'Invalid OpenAI key. Run "Prother: Set Up API Key" to update it.');
    }
    if (response.status === 429) {
      throw new RateLimitError('OpenAI rate limit hit', 'openai');
    }
    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new NetworkError(`OpenAI API returned ${response.status}: ${text}`);
    }

    const json = await response.json() as {
      choices?: Array<{ message?: { content?: string } }>;
      usage?: { total_tokens?: number };
    };

    const text = json.choices?.[0]?.message?.content ?? '';
    const tokensUsed = json.usage?.total_tokens;

    return { text: text.trim(), tokensUsed, provider: 'openai' };
  }
}
