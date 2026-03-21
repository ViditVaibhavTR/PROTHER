/**
 * Encode raw PCM audio data into a WAV file buffer.
 * Whisper API accepts WAV format for transcription.
 */
export function encodeWav(
  pcmData: Buffer,
  sampleRate: number,
  channels: number,
  bitDepth: number,
): Buffer {
  const byteRate = (sampleRate * channels * bitDepth) / 8;
  const blockAlign = (channels * bitDepth) / 8;
  const dataSize = pcmData.byteLength;
  const headerSize = 44;

  const buffer = Buffer.alloc(headerSize + dataSize);
  let offset = 0;

  // RIFF header
  buffer.write('RIFF', offset);
  offset += 4;
  buffer.writeUInt32LE(36 + dataSize, offset); // file size - 8
  offset += 4;
  buffer.write('WAVE', offset);
  offset += 4;

  // fmt sub-chunk
  buffer.write('fmt ', offset);
  offset += 4;
  buffer.writeUInt32LE(16, offset); // sub-chunk size (PCM = 16)
  offset += 4;
  buffer.writeUInt16LE(1, offset); // audio format (1 = PCM)
  offset += 2;
  buffer.writeUInt16LE(channels, offset);
  offset += 2;
  buffer.writeUInt32LE(sampleRate, offset);
  offset += 4;
  buffer.writeUInt32LE(byteRate, offset);
  offset += 4;
  buffer.writeUInt16LE(blockAlign, offset);
  offset += 2;
  buffer.writeUInt16LE(bitDepth, offset);
  offset += 2;

  // data sub-chunk
  buffer.write('data', offset);
  offset += 4;
  buffer.writeUInt32LE(dataSize, offset);
  offset += 4;

  // PCM data
  pcmData.copy(buffer, offset);

  return buffer;
}
