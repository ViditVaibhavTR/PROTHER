import { describe, it, expect } from 'vitest';
import { encodeWav } from '../../speech/wav-encoder';

describe('WAV encoder', () => {
  it('produces valid RIFF/WAVE header', () => {
    const pcm = Buffer.alloc(100);
    const wav = encodeWav(pcm, 16000, 1, 16);

    expect(wav.toString('ascii', 0, 4)).toBe('RIFF');
    expect(wav.toString('ascii', 8, 12)).toBe('WAVE');
    expect(wav.toString('ascii', 12, 16)).toBe('fmt ');
    expect(wav.toString('ascii', 36, 40)).toBe('data');
  });

  it('encodes correct file size in header', () => {
    const pcm = Buffer.alloc(200);
    const wav = encodeWav(pcm, 16000, 1, 16);

    // RIFF chunk size = file size - 8
    const riffSize = wav.readUInt32LE(4);
    expect(riffSize).toBe(wav.length - 8);

    // data chunk size = PCM data length
    const dataSize = wav.readUInt32LE(40);
    expect(dataSize).toBe(200);
  });

  it('encodes correct audio format fields', () => {
    const pcm = Buffer.alloc(32);
    const wav = encodeWav(pcm, 16000, 1, 16);

    expect(wav.readUInt16LE(20)).toBe(1); // PCM format
    expect(wav.readUInt16LE(22)).toBe(1); // 1 channel
    expect(wav.readUInt32LE(24)).toBe(16000); // sample rate
    expect(wav.readUInt32LE(28)).toBe(32000); // byte rate (16000 * 1 * 2)
    expect(wav.readUInt16LE(32)).toBe(2); // block align (1 * 16/8)
    expect(wav.readUInt16LE(34)).toBe(16); // bits per sample
  });

  it('includes PCM data after header', () => {
    const pcm = Buffer.from([0x01, 0x02, 0x03, 0x04]);
    const wav = encodeWav(pcm, 16000, 1, 16);

    expect(wav.length).toBe(44 + 4); // header + data
    expect(wav[44]).toBe(0x01);
    expect(wav[45]).toBe(0x02);
    expect(wav[46]).toBe(0x03);
    expect(wav[47]).toBe(0x04);
  });

  it('handles stereo 24-bit configuration', () => {
    const pcm = Buffer.alloc(48);
    const wav = encodeWav(pcm, 44100, 2, 24);

    expect(wav.readUInt16LE(22)).toBe(2); // 2 channels
    expect(wav.readUInt32LE(24)).toBe(44100); // sample rate
    expect(wav.readUInt32LE(28)).toBe(44100 * 2 * 3); // byte rate
    expect(wav.readUInt16LE(32)).toBe(6); // block align (2 * 24/8)
    expect(wav.readUInt16LE(34)).toBe(24); // bits per sample
  });
});
