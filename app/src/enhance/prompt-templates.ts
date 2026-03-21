import type { EditorContext } from '../core/types';

/**
 * System prompt for the enhancement LLM call.
 */
export function getEnhancementSystemPrompt(): string {
  return `You are a coding prompt optimizer. Your job is to take a rough, spoken coding prompt and improve it into a clear, specific, actionable instruction for an AI coding assistant.

Rules:
- Keep the original intent — don't add features the user didn't ask for
- Add specificity: mention the language, framework, or file if relevant
- Structure the prompt clearly (what to do, where, any constraints)
- Be concise — don't pad with unnecessary context
- Output ONLY the enhanced prompt, nothing else (no explanations, no markdown)`;
}

/**
 * Build the user message that combines the raw prompt with editor context.
 * This is sent as a SINGLE message alongside the system prompt — never split.
 */
export function buildEnhancementMessage(rawPrompt: string, context: EditorContext): string {
  const parts: string[] = [];

  parts.push(`Raw spoken prompt: "${rawPrompt}"`);

  if (context.activeFile) {
    parts.push(`Active file: ${context.activeFile}`);
  }

  if (context.language && context.language !== 'plaintext') {
    parts.push(`Language: ${context.language}`);
  }

  if (context.selectedCode) {
    parts.push(`Selected code:\n\`\`\`\n${context.selectedCode}\n\`\`\``);
  }

  if (context.workspaceLanguages.length > 0) {
    parts.push(`Workspace languages: ${context.workspaceLanguages.join(', ')}`);
  }

  return parts.join('\n');
}
