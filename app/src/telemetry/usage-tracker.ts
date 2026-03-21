import * as vscode from 'vscode';

interface UsageStats {
  promptsSpoken: number;
  promptsEnhanced: number;
  wordsSpoken: number;
  lastUsed: string;
}

const STATS_KEY = 'prother.usage.stats';

/**
 * Tracks local usage stats in globalState.
 * Never sent anywhere — purely for the user's benefit.
 */
export class UsageTracker {
  constructor(private readonly globalState: vscode.Memento) {}

  async recordPrompt(wordCount: number, enhanced: boolean): Promise<void> {
    const stats = this.getStats();
    stats.promptsSpoken++;
    stats.wordsSpoken += wordCount;
    if (enhanced) stats.promptsEnhanced++;
    stats.lastUsed = new Date().toISOString();
    await this.globalState.update(STATS_KEY, stats);
  }

  getStats(): UsageStats {
    return this.globalState.get<UsageStats>(STATS_KEY, {
      promptsSpoken: 0,
      promptsEnhanced: 0,
      wordsSpoken: 0,
      lastUsed: '',
    });
  }
}
