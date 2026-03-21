import * as vscode from 'vscode';

/** Patterns that look like API keys — redact from logs */
const KEY_PATTERNS = [
  /AIza[A-Za-z0-9_-]{30,}/g, // Gemini
  /sk-[A-Za-z0-9]{20,}/g,    // OpenAI
  /key-[A-Za-z0-9]{20,}/g,   // Generic
];

/**
 * Structured logger that redacts API keys from output.
 */
export class Logger implements vscode.Disposable {
  constructor(private readonly channel: vscode.OutputChannel) {}

  info(msg: string): void {
    this.channel.appendLine(`[INFO] ${this.redact(msg)}`);
  }

  warn(msg: string): void {
    this.channel.appendLine(`[WARN] ${this.redact(msg)}`);
  }

  error(msg: string): void {
    this.channel.appendLine(`[ERROR] ${this.redact(msg)}`);
  }

  private redact(msg: string): string {
    let result = msg;
    for (const pattern of KEY_PATTERNS) {
      result = result.replace(pattern, '[REDACTED]');
    }
    return result;
  }

  dispose(): void {
    // OutputChannel lifecycle managed by caller
  }
}
