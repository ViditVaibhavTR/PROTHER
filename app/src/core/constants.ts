import { AIExtensionDef } from './types';

/** SecretStorage key prefix for API keys */
export const SECRET_KEY_PREFIX = 'prother.apikey.';

/** Error state display timeout (ms) */
export const ERROR_DISPLAY_TIMEOUT_MS = 3000;

/** Minimum gap between LLM API requests to the same provider (ms) */
export const MIN_REQUEST_GAP_MS = 4000;

/** Gemini API base URL */
export const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta';

/** Known AI extensions for injection targeting */
export const AI_EXTENSION_DEFS: AIExtensionDef[] = [
  {
    id: 'github.copilot-chat',
    displayName: 'GitHub Copilot Chat',
    type: 'webview',
    detectionMethod: 'extension-api',
  },
  {
    id: 'anthropic.claude-code',
    displayName: 'Claude Code',
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

/** Extension commands for injection into AI assistants */
export const EXTENSION_COMMANDS: Record<string, { openCommand: string; useBuiltInChat: boolean }> = {
  'github.copilot-chat': {
    openCommand: 'workbench.action.chat.open',
    useBuiltInChat: true,
  },
  'anthropic.claude-code': {
    openCommand: 'claude-vscode.focus',
    useBuiltInChat: false,
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
  'claude-code-terminal': /claude|anthropic/i,
  aider: /aider/i,
  'gpt-engineer': /gpt-engineer/i,
};

/** GitHub issues URL for Report Issue command */
export const ISSUES_URL = 'https://github.com/ViditVaibhavTR/PROTHER/issues/new';
