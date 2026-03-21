import * as vscode from 'vscode';
import { BaseLLMProvider } from '../base-provider';
import { GEMINI_API_URL } from '../../core/constants';
import { NetworkError, RateLimitError, ApiKeyError } from '../../core/errors';
import type { LLMRequest, LLMResponse } from '../../core/types';

/**
 * Gemini 1.5 Flash provider.
 * Model name is read from settings — NEVER hardcoded.
 * Single API call: system instruction + user message combined.
 */
export class GeminiProvider extends BaseLLMProvider {
  readonly name = 'gemini';

  private getModelName(): string {
    return vscode.workspace
      .getConfiguration('prother')
      .get<string>('llm.geminiModel', 'gemini-2.5-flash');
  }

  async complete(request: LLMRequest, apiKey: string): Promise<LLMResponse> {
    const model = this.getModelName();
    const url = `${GEMINI_API_URL}/models/${model}:generateContent?key=${apiKey}`;

    const body = {
      systemInstruction: {
        parts: [{ text: request.systemPrompt }],
      },
      contents: [
        {
          role: 'user',
          parts: [{ text: request.userMessage }],
        },
      ],
      generationConfig: {
        maxOutputTokens: request.maxTokens ?? 1024,
        temperature: request.temperature ?? 0.7,
      },
    };

    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new NetworkError(`Gemini API request failed: ${msg}`);
    }

    if (response.status === 401 || response.status === 403) {
      throw new ApiKeyError(
        'Gemini API key rejected',
        'Invalid Gemini key. Run "Prother: Set Up API Key" to update it.',
      );
    }

    if (response.status === 404) {
      throw new NetworkError(
        `Gemini model "${model}" not found. Update prother.llm.geminiModel in settings.`,
      );
    }

    if (response.status === 429) {
      throw new RateLimitError('Gemini rate limit hit', 'gemini');
    }

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new NetworkError(`Gemini API returned ${response.status}: ${text}`);
    }

    const json = await response.json() as {
      candidates?: Array<{
        content?: { parts?: Array<{ text?: string }> };
      }>;
      usageMetadata?: { totalTokenCount?: number };
    };

    const text = json.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    const tokensUsed = json.usageMetadata?.totalTokenCount;

    return { text: text.trim(), tokensUsed, provider: 'gemini' };
  }
}
