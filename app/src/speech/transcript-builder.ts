/**
 * Accumulates partial speech recognition results into a final transcript.
 * VS Code Speech API fires partial results that replace previous partials
 * within a phrase; only finalized phrases accumulate.
 */
export class TranscriptBuilder {
  private phrases: string[] = [];
  private currentPartial = '';

  /** Called with each partial recognition result */
  addPartial(text: string): void {
    this.currentPartial = text;
  }

  /** Called when a phrase is finalized (end of utterance segment) */
  finalize(): void {
    if (this.currentPartial.trim()) {
      this.phrases.push(this.currentPartial.trim());
      this.currentPartial = '';
    }
  }

  /** Get the full assembled transcript including current partial */
  getFullTranscript(): string {
    const parts = [...this.phrases];
    if (this.currentPartial.trim()) {
      parts.push(this.currentPartial.trim());
    }
    return parts.join(' ');
  }

  /** Get only finalized text (no current partial) */
  getFinalizedText(): string {
    return this.phrases.join(' ');
  }

  /** Reset for next session */
  reset(): void {
    this.phrases = [];
    this.currentPartial = '';
  }

  /** Whether any text has been captured */
  isEmpty(): boolean {
    return this.phrases.length === 0 && this.currentPartial.trim() === '';
  }
}
