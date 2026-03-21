import { GEMINI_API_URL } from '../core/constants';

interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validate a Gemini API key by making a minimal API call.
 * Uses the models.list endpoint — cheapest possible check.
 */
export async function validateGeminiKey(key: string): Promise<ValidationResult> {
  try {
    const response = await fetch(
      `${GEMINI_API_URL}/models?key=${key}`,
      { method: 'GET' },
    );

    if (response.ok) {
      return { valid: true };
    }

    if (response.status === 400 || response.status === 403) {
      return { valid: false, error: 'Invalid API key.' };
    }

    if (response.status === 429) {
      // Rate limited but key is valid
      return { valid: true };
    }

    return { valid: false, error: `Unexpected response: ${response.status}` };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { valid: false, error: `Network error: ${msg}` };
  }
}
