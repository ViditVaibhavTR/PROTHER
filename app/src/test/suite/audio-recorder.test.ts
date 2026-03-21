import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock vscode before importing AudioRecorder
vi.mock('vscode', () => ({
  env: { remoteName: undefined },
  EventEmitter: class {
    private listeners: Function[] = [];
    event = (listener: Function) => {
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
      get: (_key: string, defaultVal: unknown) => defaultVal,
    }),
  },
}));

// Mock audify — simulates native addon not available
let audifyAvailable = true;
vi.mock('audify', () => {
  return {
    get RtAudio() {
      if (!audifyAvailable) throw new Error('Native addon not found');
      return class MockRtAudio {
        getDefaultInputDevice() {
          return 0;
        }
        getDevices() {
          return [{ id: 0, name: 'Mock Mic', inputChannels: 1 }];
        }
        openStream() {
          return 160;
        }
        setInputCallback() {}
        start() {}
        stop() {}
        closeStream() {}
        isStreamOpen() {
          return false;
        }
        isStreamRunning() {
          return false;
        }
      };
    },
    RtAudioFormat: { RTAUDIO_SINT16: 2 },
    RtAudioStreamFlags: { RTAUDIO_MINIMIZE_LATENCY: 2 },
  };
});

import { AudioRecorder } from '../../speech/audio-recorder';

describe('AudioRecorder', () => {
  beforeEach(() => {
    audifyAvailable = true;
  });

  it('isAvailable returns true when audify loads', () => {
    const recorder = new AudioRecorder();
    expect(recorder.isAvailable()).toBe(true);
    recorder.dispose();
  });

  it('isAvailable returns false in remote environment', async () => {
    const vscode = await import('vscode');
    (vscode.env as { remoteName: string | undefined }).remoteName = 'ssh-remote';

    const recorder = new AudioRecorder();
    expect(recorder.isAvailable()).toBe(false);
    recorder.dispose();

    (vscode.env as { remoteName: string | undefined }).remoteName = undefined;
  });

  it('getUnavailableReason explains remote env', async () => {
    const vscode = await import('vscode');
    (vscode.env as { remoteName: string | undefined }).remoteName = 'ssh-remote';

    const recorder = new AudioRecorder();
    expect(recorder.getUnavailableReason()).toContain('remote');
    recorder.dispose();

    (vscode.env as { remoteName: string | undefined }).remoteName = undefined;
  });

  it('isRecording is false by default', () => {
    const recorder = new AudioRecorder();
    expect(recorder.isRecording()).toBe(false);
    recorder.dispose();
  });

  it('start sets recording to true', () => {
    const recorder = new AudioRecorder();
    recorder.start();
    expect(recorder.isRecording()).toBe(true);
    recorder.stop();
    recorder.dispose();
  });

  it('stop sets recording to false', () => {
    const recorder = new AudioRecorder();
    recorder.start();
    recorder.stop();
    expect(recorder.isRecording()).toBe(false);
    recorder.dispose();
  });

  it('stop fires onStopped event', () => {
    const recorder = new AudioRecorder();
    const handler = vi.fn();
    recorder.onStopped(handler);
    recorder.start();
    recorder.stop();
    expect(handler).toHaveBeenCalledOnce();
    recorder.dispose();
  });
});
