import type { EditorContext, Intent } from '../core/types';

const SPEECH_CORRECTION_PREAMBLE = `IMPORTANT: This prompt was captured via voice-to-text and may contain transcription errors. Infer the correct technical terms from context (e.g., "nap" → "nav", "funk shin" → "function", "div" might be "div" or "dev", "react" might be "React", "know JS" → "Node.js"). Fix these errors silently.`;

const SYSTEM_PROMPTS: Record<Intent, string> = {
  debug: `You are a prompt engineer for debugging. ${SPEECH_CORRECTION_PREAMBLE}

Your job:
1. Fix speech-to-text errors using technical context
2. Expand the rough debugging request into a clear, structured prompt
3. Include the specific error message and file location from the context below
4. Suggest what to check (variable state, types, edge cases) based on the error
5. Output ONLY the enhanced prompt — no explanations, no markdown formatting`,

  explore: `You are a prompt engineer for code understanding. ${SPEECH_CORRECTION_PREAMBLE}

Your job:
1. Fix speech-to-text errors using technical context
2. Expand the rough question into a structured, detailed prompt
3. Break down "explain this" into specific aspects: what it does, how it works, why it's designed this way
4. Reference the specific code/function from the context below
5. Output ONLY the enhanced prompt — no explanations, no markdown formatting`,

  refactor: `You are a prompt engineer for refactoring. ${SPEECH_CORRECTION_PREAMBLE}

Your job:
1. Fix speech-to-text errors using technical context
2. Expand the rough refactoring request into a structured prompt with clear goals
3. Specify what to refactor, why, and what the expected outcome looks like
4. Reference the specific file and code from the context below
5. Output ONLY the enhanced prompt — no explanations, no markdown formatting`,

  generate: `You are a prompt engineer for code generation. ${SPEECH_CORRECTION_PREAMBLE}

Your job:
1. Fix speech-to-text errors using technical context
2. Expand the rough idea into a detailed, structured prompt that gets excellent results from an AI coding assistant
3. Break down vague requests into specific, numbered requirements or questions
4. Add relevant technical considerations the user likely intended (architecture, components, sections, tech stack)
5. If the user mentions UI elements, list them out explicitly (navbar, hero section, footer, etc.)
6. Incorporate the project's tech stack from the context below if available
7. Output ONLY the enhanced prompt — no explanations, no markdown formatting`,

  review: `You are a prompt engineer for code review. ${SPEECH_CORRECTION_PREAMBLE}

Your job:
1. Fix speech-to-text errors using technical context
2. Expand the rough review request into a structured prompt
3. Specify what aspects to review: correctness, performance, security, readability, edge cases
4. Reference the git changes from the context below
5. Output ONLY the enhanced prompt — no explanations, no markdown formatting`,

  casual: `You are a prompt clarifier. The input was captured via voice-to-text and may have transcription errors. Fix grammar, remove filler words, and correct obvious speech-to-text mistakes. Keep the same tone and intent. Do NOT add technical structure or expand significantly. Output ONLY the cleaned text.`,
};

/** Get the system prompt for a specific intent */
export function getSystemPromptForIntent(intent: Intent): string {
  return SYSTEM_PROMPTS[intent];
}

/**
 * Build the user message with only the context relevant to the detected intent.
 * Keeps token usage low by excluding irrelevant fields.
 */
export function buildEnhancementMessage(rawPrompt: string, context: EditorContext, intent: Intent): string {
  const parts: string[] = [];
  parts.push(`User prompt: "${rawPrompt}"`);

  switch (intent) {
    case 'debug':
      appendFileContext(parts, context);
      appendSelectedOrCursor(parts, context);
      appendDiagnostics(parts, context);
      break;

    case 'explore':
      appendFileContext(parts, context);
      appendSelectedOrCursor(parts, context);
      break;

    case 'refactor':
      appendFileContext(parts, context);
      appendSelectedOrCursor(parts, context);
      break;

    case 'generate':
      appendProjectHints(parts, context);
      if (context.workspaceLanguages.length > 0) {
        parts.push(`Workspace languages: ${context.workspaceLanguages.join(', ')}`);
      }
      break;

    case 'review':
      appendGitSummary(parts, context);
      break;

    case 'casual':
      // No context for casual prompts
      break;
  }

  return parts.join('\n');
}

// --- Helper functions to append context sections ---

function appendFileContext(parts: string[], ctx: EditorContext): void {
  if (ctx.activeFile) {
    const fileName = ctx.activeFile.split(/[\\/]/).pop() ?? ctx.activeFile;
    parts.push(`File: ${fileName}`);
  }
  if (ctx.language && ctx.language !== 'plaintext') {
    parts.push(`Language: ${ctx.language}`);
  }
}

function appendSelectedOrCursor(parts: string[], ctx: EditorContext): void {
  if (ctx.selectedCode) {
    const code = ctx.selectedCode.length > 800
      ? ctx.selectedCode.substring(0, 800) + '\n... (truncated)'
      : ctx.selectedCode;
    parts.push(`Selected code:\n\`\`\`\n${code}\n\`\`\``);
  } else if (ctx.cursorContext) {
    parts.push(`Code around cursor:\n\`\`\`\n${ctx.cursorContext}\n\`\`\``);
  }
}

function appendDiagnostics(parts: string[], ctx: EditorContext): void {
  if (ctx.diagnostics.length === 0) return;

  const diagLines = ctx.diagnostics.map((d) => {
    const prefix = d.severity === 'error' ? 'ERROR' : 'WARN';
    return `${prefix} line ${d.line}: ${d.message}\n  → ${d.sourceLine}`;
  });
  parts.push(`Diagnostics:\n${diagLines.join('\n')}`);
}

function appendGitSummary(parts: string[], ctx: EditorContext): void {
  if (!ctx.gitSummary) return;

  parts.push(`Branch: ${ctx.gitSummary.branch}`);
  parts.push(`Changes (${ctx.gitSummary.modifiedFiles} files):\n${ctx.gitSummary.diffSummary}`);
}

function appendProjectHints(parts: string[], ctx: EditorContext): void {
  if (!ctx.projectHints) return;

  const hints: string[] = [];
  if (ctx.projectHints.framework) hints.push(`Framework: ${ctx.projectHints.framework}`);
  hints.push(`Language: ${ctx.projectHints.primaryLanguage}`);
  parts.push(hints.join(', '));
}
