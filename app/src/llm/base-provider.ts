import type { LLMRequest, LLMResponse } from '../core/types';

/**
 * Abstract base for LLM providers.
 * Each provider implements complete() for its specific API.
 */
export abstract class BaseLLMProvider {
  abstract readonly name: string;

  /** Send a completion request and return the response text */
  abstract complete(request: LLMRequest, apiKey: string): Promise<LLMResponse>;
}
