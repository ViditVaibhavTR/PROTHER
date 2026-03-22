import { GEMINI_API_URL } from '../core/constants';
import type { LLMProvider } from './key-manager';

interface ValidationResult {
  valid: boolean;
  error?: string;
}

/** Validate any provider's API key */
export async function validateKey(provider: LLMProvider, key: string): Promise<ValidationResult> {
  switch (provider) {
    case 'gemini': return validateGeminiKey(key);
    case 'openai': return validateOpenAIKey(key);
    case 'anthropic': return validateAnthropicKey(key);
    case 'groq': return validateGroqKey(key);
  }
}

/** Validate Gemini key via models.list endpoint */
export async function validateGeminiKey(key: string): Promise<ValidationResult> {
  return callAndCheck(`${GEMINI_API_URL}/models?key=${key}`, 'GET');
}

/** Validate OpenAI key via models.list endpoint */
async function validateOpenAIKey(key: string): Promise<ValidationResult> {
  return callAndCheck('https://api.openai.com/v1/models', 'GET', {
    Authorization: `Bearer ${key}`,
  });
}

/** Validate Anthropic key via a minimal messages call */
async function validateAnthropicKey(key: string): Promise<ValidationResult> {
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1,
        messages: [{ role: 'user', content: 'hi' }],
      }),
    });

    if (response.ok || response.status === 200) return { valid: true };
    if (response.status === 401) return { valid: false, error: 'Invalid API key.' };
    if (response.status === 429) return { valid: true }; // rate limited but key works
    return { valid: false, error: `Unexpected response: ${response.status}` };
  } catch (err) {
    return { valid: false, error: `Network error: ${err instanceof Error ? err.message : String(err)}` };
  }
}

/** Validate Groq key via models.list endpoint (OpenAI-compatible) */
async function validateGroqKey(key: string): Promise<ValidationResult> {
  return callAndCheck('https://api.groq.com/openai/v1/models', 'GET', {
    Authorization: `Bearer ${key}`,
  });
}

/** Shared fetch-and-check helper */
async function callAndCheck(
  url: string,
  method: string,
  headers?: Record<string, string>,
): Promise<ValidationResult> {
  try {
    const response = await fetch(url, { method, headers });

    if (response.ok) return { valid: true };
    if (response.status === 400 || response.status === 401 || response.status === 403) {
      return { valid: false, error: 'Invalid API key.' };
    }
    if (response.status === 429) return { valid: true }; // rate limited but key works
    return { valid: false, error: `Unexpected response: ${response.status}` };
  } catch (err) {
    return { valid: false, error: `Network error: ${err instanceof Error ? err.message : String(err)}` };
  }
}
