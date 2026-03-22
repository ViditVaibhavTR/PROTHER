import { BaseLLMProvider } from '../base-provider';
import { NetworkError, RateLimitError, ApiKeyError } from '../../core/errors';
import type { LLMRequest, LLMResponse } from '../../core/types';

/**
 * Groq Llama 3.1 provider (OpenAI-compatible API).
 */
export class GroqProvider extends BaseLLMProvider {
  readonly name = 'groq';

  async complete(request: LLMRequest, apiKey: string): Promise<LLMResponse> {
    const url = 'https://api.groq.com/openai/v1/chat/completions';

    const body = {
      model: 'llama-3.1-70b-versatile',
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
      throw new NetworkError(`Groq API request failed: ${msg}`);
    }

    if (response.status === 401) {
      throw new ApiKeyError('Groq API key rejected', 'Invalid Groq key. Run "Prother: Set Up API Key" to update it.');
    }
    if (response.status === 429) {
      throw new RateLimitError('Groq rate limit hit', 'groq');
    }
    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new NetworkError(`Groq API returned ${response.status}: ${text}`);
    }

    const json = await response.json() as {
      choices?: Array<{ message?: { content?: string } }>;
      usage?: { total_tokens?: number };
    };

    const text = json.choices?.[0]?.message?.content ?? '';
    const tokensUsed = json.usage?.total_tokens;

    return { text: text.trim(), tokensUsed, provider: 'groq' };
  }
}
