import * as vscode from 'vscode';

/** Extension state machine states */
export enum ProthState {
  SETUP = 'setup',
  IDLE = 'idle',
  LISTENING = 'listening',
  PROCESSING = 'processing',
  ENHANCING = 'enhancing',
  PREVIEW = 'preview',
  INJECTING = 'injecting',
  CANCELLED = 'cancelled',
  ERROR = 'error',
  DISABLED = 'disabled',
  REMOTE = 'remote',
}

/** How the activation was triggered */
export type Trigger = 'hotkey' | 'wakeword' | 'command';

/** Detected AI extension info */
export interface AIExtension {
  id: string;
  displayName: string;
  type: 'webview' | 'terminal';
  detectionMethod: 'extension-api' | 'terminal-scan';
  installed: boolean;
  active: boolean;
  isVisible: boolean;
}

/** Definition for AI extension detection (static config) */
export interface AIExtensionDef {
  id: string;
  displayName: string;
  type: 'webview' | 'terminal';
  detectionMethod: 'extension-api' | 'terminal-scan';
}

/** Result of an injection attempt */
export interface InjectResult {
  success: boolean;
  method?: 'command' | 'clipboard' | 'terminal' | 'clipboard-manual';
  target?: string;
  fallbackUsed?: boolean;
  error?: string;
}

/** Strategy interface for injection methods */
export interface InjectionStrategy {
  readonly name: string;
  canHandle(target: string): Promise<boolean>;
  inject(text: string, target: string): Promise<boolean>;
}

/** Command config for extension-specific injection */
export interface CommandConfig {
  openCommand: string;
  useBuiltInChat: boolean;
}

/** Speech module status */
export type SpeechStatus = 'idle' | 'listening' | 'processing' | 'error' | 'unavailable';

/** Speech transcript event payload */
export interface TranscriptEvent {
  text: string;
  isFinal: boolean;
}

/** Disposable interface for cleanup */
export interface Disposable {
  dispose(): void;
}

/** Editor context for prompt enhancement (Phase 2) */
export interface EditorContext {
  activeFile: string;
  selectedCode: string | null;
  language: string;
  cursorPosition: vscode.Position;
  workspaceLanguages: string[];
  recentFiles: string[];
}

/** LLM request format (Phase 2) */
export interface LLMRequest {
  systemPrompt: string;
  userMessage: string;
  maxTokens?: number;
  temperature?: number;
  provider?: string;
}

/** LLM response format (Phase 2) */
export interface LLMResponse {
  text: string;
  tokensUsed?: number;
  provider: string;
}

/** API key test result */
export interface TestResult {
  valid: boolean;
  error?: 'invalid_key' | 'rate_limited' | 'network_error';
  provider: string;
}

