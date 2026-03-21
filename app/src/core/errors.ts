/** Base error class for Prother — always has a user-facing message */
export class ProthError extends Error {
  constructor(
    message: string,
    public readonly userMessage: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = 'ProthError';
  }
}

export class SpeechError extends ProthError {
  constructor(message: string, userMessage?: string) {
    super(message, userMessage ?? 'Voice input failed. Try pressing Ctrl+Shift+V again.', 'SPEECH_ERROR');
    this.name = 'SpeechError';
  }
}

export class InjectionError extends ProthError {
  constructor(message: string, userMessage?: string) {
    super(
      message,
      userMessage ?? 'Could not inject prompt. Text copied to clipboard instead.',
      'INJECTION_ERROR',
    );
    this.name = 'InjectionError';
  }
}

export class EnhancementError extends ProthError {
  constructor(message: string, userMessage?: string) {
    super(
      message,
      userMessage ?? 'Prompt enhancement failed. Injecting raw prompt instead.',
      'ENHANCEMENT_ERROR',
    );
    this.name = 'EnhancementError';
  }
}

export class ApiKeyError extends ProthError {
  constructor(message: string, userMessage?: string) {
    super(message, userMessage ?? 'Invalid API key. Check your key in Prother settings.', 'API_KEY_ERROR');
    this.name = 'ApiKeyError';
  }
}

export class RateLimitError extends ProthError {
  constructor(message: string, provider: string) {
    super(message, `Rate limit reached for ${provider}. Try again in a moment.`, 'RATE_LIMIT_ERROR');
    this.name = 'RateLimitError';
  }
}

export class NetworkError extends ProthError {
  constructor(message: string) {
    super(
      message,
      'Network unavailable. You can still use voice-to-text without enhancement.',
      'NETWORK_ERROR',
    );
    this.name = 'NetworkError';
  }
}
