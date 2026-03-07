import { AIExtensionDef } from './types';

/** Silence timeout before ending speech capture (ms) */
export const DEFAULT_SILENCE_TIMEOUT = 1500;

/** Minimum gap between LLM API requests to the same provider (ms) */
export const MIN_REQUEST_GAP_MS = 4000;

/** Max queued LLM requests before dropping oldest */
export const MAX_QUEUE_SIZE = 5;

/** VS Code Speech extension ID (soft dependency) */
export const SPEECH_EXTENSION_ID = 'ms-vscode.vscode-speech';

/** SecretStorage key prefix for API keys */
export const SECRET_KEY_PREFIX = 'prother.apikey.';

/** Error state display timeout (ms) */
export const ERROR_DISPLAY_TIMEOUT_MS = 3000;

/** LLM API base URLs */
export const API_URLS = {
  gemini: 'https://generativelanguage.googleapis.com/v1beta',
  anthropic: 'https://api.anthropic.com/v1',
  openai: 'https://api.openai.com/v1',
  groq: 'https://api.groq.com/openai/v1',
} as const;

/** Known AI extensions for injection targeting */
export const AI_EXTENSION_DEFS: AIExtensionDef[] = [
  {
    id: 'github.copilot-chat',
    displayName: 'GitHub Copilot Chat',
    type: 'webview',
    detectionMethod: 'extension-api',
  },
  {
    id: 'saoudrizwan.claude-dev',
    displayName: 'Cline',
    type: 'webview',
    detectionMethod: 'extension-api',
  },
  {
    id: 'continue.continue',
    displayName: 'Continue',
    type: 'webview',
    detectionMethod: 'extension-api',
  },
  {
    id: 'claude-code-terminal',
    displayName: 'Claude Code (Terminal)',
    type: 'terminal',
    detectionMethod: 'terminal-scan',
  },
];

/** Extension command for Copilot injection */
export const EXTENSION_COMMANDS: Record<string, { openCommand: string; useBuiltInChat: boolean }> = {
  'github.copilot-chat': {
    openCommand: 'workbench.action.chat.open',
    useBuiltInChat: true,
  },
  'saoudrizwan.claude-dev': {
    openCommand: 'cline.plusButtonClicked',
    useBuiltInChat: false,
  },
  'continue.continue': {
    openCommand: 'continue.focusContinueInput',
    useBuiltInChat: false,
  },
};

/** Terminal name patterns for CLI AI tools */
export const CLI_TERMINAL_PATTERNS: Record<string, RegExp> = {
  'claude-code-terminal': /claude/i,
  aider: /aider/i,
  'gpt-engineer': /gpt-engineer/i,
};

/** GitHub issues URL for Report Issue command */
export const ISSUES_URL = 'https://github.com/ViditVaibhavTR/PROTHER/issues/new';
