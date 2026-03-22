import type { Intent, EditorContext } from '../core/types';

// Keyword patterns per intent
const DEBUG_WORDS = /\b(fix|error|bug|crash|broken|wrong|failing|issue|exception|undefined is not|cannot read|stack trace|not working|doesnt work|doesn't work)\b/i;
const EXPLORE_WORDS = /\b(explain|what does|how does|why does|understand|walk.?through|show me|describe|tell me|what is|what are|how to)\b/i;
const REFACTOR_WORDS = /\b(refactor|rename|extract|clean.?up|improve|optimize|simplify|convert|change.?to|use.?instead|restructure|rewrite)\b/i;
const GENERATE_WORDS = /\b(add|create|new|build|implement|make|write|set.?up|scaffold|generate|design|initialize|website|webpage|page|section|layout|template|landing|app|feature|tool|extension|project|recommend)\b/i;
const REVIEW_WORDS = /\b(review|diff|changes|commit|PR|pull.?request|merge|what.?changed|look.?at.?the|check.?the)\b/i;
const CODE_WORDS = /\b(code|function|class|method|api|test|component|file|variable|database|endpoint|route|import|module|package|server|client|query|schema|hook|state|prop|async|await|return|const|let|var)\b/i;

/**
 * Classify the user's intent from their prompt + editor state.
 * Pure scoring heuristic — no LLM call. Runs in <1ms.
 */
export function classifyIntent(prompt: string, context: EditorContext): Intent {
  const scores: Record<Intent, number> = {
    debug: 0,
    explore: 0,
    refactor: 0,
    generate: 0,
    review: 0,
    casual: 0,
  };

  // --- Prompt keyword signals (strongest) ---
  if (DEBUG_WORDS.test(prompt)) scores.debug += 5;
  if (EXPLORE_WORDS.test(prompt)) scores.explore += 5;
  if (REFACTOR_WORDS.test(prompt)) scores.refactor += 5;
  if (GENERATE_WORDS.test(prompt)) scores.generate += 5;
  if (REVIEW_WORDS.test(prompt)) scores.review += 5;
  // Casual is the fallback — only gets points if NOTHING else matched
  if (!CODE_WORDS.test(prompt) && !DEBUG_WORDS.test(prompt) && !GENERATE_WORDS.test(prompt) && !EXPLORE_WORDS.test(prompt)) scores.casual += 3;

  // --- Editor state signals ---
  const hasErrors = context.diagnostics.some((d) => d.severity === 'error');
  const hasWarnings = context.diagnostics.length > 0;
  if (hasErrors) scores.debug += 3;
  else if (hasWarnings) scores.debug += 1;

  if (context.selectedCode) {
    scores.explore += 2;
    scores.refactor += 2;
  }

  if (context.gitSummary && context.gitSummary.modifiedFiles > 0) {
    scores.review += 3;
  }

  if (!context.activeFile) {
    scores.generate += 1;
    scores.casual += 2;
  }

  if (context.isDirty) {
    scores.debug += 1;
    scores.refactor += 1;
  }

  // --- Pick the highest scoring intent ---
  // Tiebreak priority: debug > explore > refactor > generate > review > casual
  const priority: Intent[] = ['debug', 'explore', 'refactor', 'generate', 'review', 'casual'];
  let best: Intent = 'casual';
  let bestScore = -1;

  for (const intent of priority) {
    if (scores[intent] > bestScore) {
      bestScore = scores[intent];
      best = intent;
    }
  }

  return best;
}
