import { LLMRouter } from '../llm/llm-router';
import { collectEditorContext } from './context-collector';
import { classifyIntent } from './intent-classifier';
import { getSystemPromptForIntent, buildEnhancementMessage } from './prompt-templates';
import { EnhancementError } from '../core/errors';

/**
 * Orchestrates intent-aware prompt enhancement.
 * Pipeline: collect context → classify intent → pick template → single Gemini call.
 */
export class EnhanceModule {
  constructor(private readonly llmRouter: LLMRouter) {}

  async enhance(rawPrompt: string): Promise<string> {
    if (!rawPrompt.trim()) {
      throw new EnhancementError('Empty prompt', 'No prompt to enhance.');
    }

    const context = collectEditorContext();
    const intent = classifyIntent(rawPrompt, context);
    const systemPrompt = getSystemPromptForIntent(intent);
    const userMessage = buildEnhancementMessage(rawPrompt, context, intent);

    const response = await this.llmRouter.complete({
      systemPrompt,
      userMessage,
      maxTokens: 1024,
      temperature: intent === 'casual' ? 0.3 : 0.2,
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
