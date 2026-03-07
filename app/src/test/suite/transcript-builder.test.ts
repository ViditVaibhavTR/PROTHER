import { describe, it, expect, beforeEach } from 'vitest';
import { TranscriptBuilder } from '../../speech/transcript-builder';

describe('TranscriptBuilder', () => {
  let builder: TranscriptBuilder;

  beforeEach(() => {
    builder = new TranscriptBuilder();
  });

  it('starts empty', () => {
    expect(builder.isEmpty()).toBe(true);
    expect(builder.getFullTranscript()).toBe('');
  });

  it('accumulates a single partial', () => {
    builder.addPartial('hello world');
    expect(builder.getFullTranscript()).toBe('hello world');
    expect(builder.isEmpty()).toBe(false);
  });

  it('replaces partial before finalize', () => {
    builder.addPartial('hel');
    builder.addPartial('hello');
    builder.addPartial('hello world');
    expect(builder.getFullTranscript()).toBe('hello world');
  });

  it('finalize moves partial to phrases', () => {
    builder.addPartial('hello world');
    builder.finalize();
    expect(builder.getFinalizedText()).toBe('hello world');
  });

  it('accumulates multiple finalized phrases', () => {
    builder.addPartial('first phrase');
    builder.finalize();
    builder.addPartial('second phrase');
    builder.finalize();
    expect(builder.getFullTranscript()).toBe('first phrase second phrase');
  });

  it('includes current partial in full transcript', () => {
    builder.addPartial('finalized');
    builder.finalize();
    builder.addPartial('still typing');
    expect(builder.getFullTranscript()).toBe('finalized still typing');
    expect(builder.getFinalizedText()).toBe('finalized');
  });

  it('ignores empty/whitespace partials on finalize', () => {
    builder.addPartial('   ');
    builder.finalize();
    expect(builder.getFullTranscript()).toBe('');
    expect(builder.isEmpty()).toBe(true);
  });

  it('resets cleanly', () => {
    builder.addPartial('some text');
    builder.finalize();
    builder.reset();
    expect(builder.isEmpty()).toBe(true);
    expect(builder.getFullTranscript()).toBe('');
  });
});
