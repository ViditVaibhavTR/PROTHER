import { LLMRouter } from '../llm/llm-router';
import { collectEditorContext } from './context-collector';
import { getEnhancementSystemPrompt, buildEnhancementMessage } from './prompt-templates';
import { EnhancementError } from '../core/errors';

/**
 * Orchestrates prompt enhancement: collects context, calls LLM, returns improved text.
 * Single API call per enhancement — system + context + prompt combined.
 */
export class EnhanceModule {
  constructor(private readonly llmRouter: LLMRouter) {}

  /**
   * Enhance a raw spoken prompt using the configured LLM.
   * Returns the enhanced text, or throws EnhancementError on failure.
   */
  async enhance(rawPrompt: string): Promise<string> {
    if (!rawPrompt.trim()) {
      throw new EnhancementError('Empty prompt', 'No prompt to enhance.');
    }

    const context = collectEditorContext();
    const systemPrompt = getEnhancementSystemPrompt();
    const userMessage = buildEnhancementMessage(rawPrompt, context);

    const response = await this.llmRouter.complete({
      systemPrompt,
      userMessage,
      maxTokens: 1024,
      temperature: 0.7,
    });

    const enhanced = response.text.trim();
    if (!enhanced) {
      throw new EnhancementError(
        'LLM returned empty response',
        'Enhancement returned empty. Try again.',
      );
    }

    return enhanced;
  }
}
