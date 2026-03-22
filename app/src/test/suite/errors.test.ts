import { describe, it, expect } from 'vitest';
import {
  ProthError,
  SpeechError,
  InjectionError,
  EnhancementError,
  ApiKeyError,
  RateLimitError,
  NetworkError,
} from '../../core/errors';

describe('Error classes', () => {
  it('ProthError has message, userMessage, and code', () => {
    const err = new ProthError('internal detail', 'user-facing text', 'TEST_CODE');
    expect(err.message).toBe('internal detail');
    expect(err.userMessage).toBe('user-facing text');
    expect(err.code).toBe('TEST_CODE');
    expect(err.name).toBe('ProthError');
    expect(err).toBeInstanceOf(Error);
  });

  it('SpeechError has default user message', () => {
    const err = new SpeechError('mic failed');
    expect(err.userMessage).toBe('Voice input failed. Try pressing Ctrl+Shift+V again.');
    expect(err.code).toBe('SPEECH_ERROR');
  });

  it('SpeechError accepts custom user message', () => {
    const err = new SpeechError('mic failed', 'Custom message');
    expect(err.userMessage).toBe('Custom message');
  });

  it('InjectionError has default user message', () => {
    const err = new InjectionError('paste failed');
    expect(err.userMessage).toContain('clipboard');
  });

  it('EnhancementError has default user message', () => {
    const err = new EnhancementError('api error');
    expect(err.userMessage).toContain('raw prompt');
  });

  it('ApiKeyError has default user message', () => {
    const err = new ApiKeyError('401');
    expect(err.userMessage).toContain('API key');
  });

  it('RateLimitError includes provider name', () => {
    const err = new RateLimitError('429', 'gemini');
    expect(err.userMessage).toContain('gemini');
  });

  it('NetworkError has default user message', () => {
    const err = new NetworkError('ECONNREFUSED');
    expect(err.userMessage).toContain('Network unavailable');
  });

  it('no error exposes stack traces in userMessage', () => {
    const errors = [
      new SpeechError('internal'),
      new InjectionError('internal'),
      new EnhancementError('internal'),
      new ApiKeyError('internal'),
      new RateLimitError('internal', 'test'),
      new NetworkError('internal'),
    ];
    for (const err of errors) {
      expect(err.userMessage).not.toContain('at ');
      expect(err.userMessage).not.toContain('Error:');
    }
  });
});
