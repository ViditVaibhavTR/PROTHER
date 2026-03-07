import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock vscode before importing SilenceDetector
vi.mock('vscode', () => ({
  EventEmitter: class {
    private listeners: Array<(e: unknown) => void> = [];
    event = (listener: (e: unknown) => void) => {
      this.listeners.push(listener);
      return { dispose: () => {} };
    };
    fire(data: unknown) {
      this.listeners.forEach((l) => l(data));
    }
    dispose() {
      this.listeners = [];
    }
  },
  workspace: {
    getConfiguration: () => ({
      get: (_key: string, defaultValue: number) => defaultValue,
    }),
  },
}));

import { SilenceDetector } from '../../speech/silence-detector';

describe('SilenceDetector', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('fires silence event after timeout with no activity', () => {
    const detector = new SilenceDetector(500);
    const callback = vi.fn();
    detector.onSilenceDetected(callback);

    detector.start();
    vi.advanceTimersByTime(500);

    expect(callback).toHaveBeenCalledTimes(1);
    detector.dispose();
  });

  it('resets timer on speech activity', () => {
    const detector = new SilenceDetector(500);
    const callback = vi.fn();
    detector.onSilenceDetected(callback);

    detector.start();
    vi.advanceTimersByTime(300);
    detector.onSpeechActivity(); // reset
    vi.advanceTimersByTime(300);

    expect(callback).not.toHaveBeenCalled();

    vi.advanceTimersByTime(200); // 500ms total since last activity
    expect(callback).toHaveBeenCalledTimes(1);
    detector.dispose();
  });

  it('does not fire after stop', () => {
    const detector = new SilenceDetector(500);
    const callback = vi.fn();
    detector.onSilenceDetected(callback);

    detector.start();
    detector.stop();
    vi.advanceTimersByTime(1000);

    expect(callback).not.toHaveBeenCalled();
    detector.dispose();
  });

  it('uses default timeout from constants', () => {
    const detector = new SilenceDetector(); // should use 1500 from mock config
    const callback = vi.fn();
    detector.onSilenceDetected(callback);

    detector.start();
    vi.advanceTimersByTime(1499);
    expect(callback).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(callback).toHaveBeenCalledTimes(1);
    detector.dispose();
  });
});
