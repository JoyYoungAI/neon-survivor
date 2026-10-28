import { LeaderboardEntry } from '../types/game';

export class LeaderboardService {
  private static readonly STORAGE_KEY = 'neon_survivor_local_leaderboard';
  private static readonly DEFAULT_LEADERBOARD: LeaderboardEntry[] = [
    { id: '1', name: 'CyberViper', score: 28500, date: '2026-10-28', rank: 1 },
    { id: '2', name: 'NovaPilot', score: 21400, date: '2026-10-28', rank: 2 },
    { id: '3', name: 'EchoRunner', score: 18200, date: '2026-10-27', rank: 3 },
    { id: '4', name: 'GlitchMaster', score: 14500, date: '2026-10-27', rank: 4 },
    { id: '5', name: 'GhostRider', score: 11000, date: '2026-10-26', rank: 5 },
  ];

  public static async getLeaderboard(): Promise<LeaderboardEntry[]> {
    try {
      const res = await fetch('/api/leaderboard', { method: 'GET' });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          return data;
        }
      }
    } catch {
      // Offline or local dev fallback
    }

    return this.getLocalLeaderboard();
  }

  public static async submitScore(name: string, score: number): Promise<LeaderboardEntry[]> {
    const cleanName = (name.trim() || 'Anonymous').slice(0, 16);
    const payload = { name: cleanName, score: Math.max(0, Math.floor(score)) };

    try {
      const res = await fetch('/api/leaderboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const updated = await res.json();
        if (Array.isArray(updated)) return updated;
      }
    } catch {
      // Fallback
    }

    return this.saveToLocal(cleanName, score);
  }

  private static getLocalLeaderboard(): LeaderboardEntry[] {
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      // Ignored
    }
    return this.DEFAULT_LEADERBOARD;
  }

  private static saveToLocal(name: string, score: number): LeaderboardEntry[] {
    const list = this.getLocalLeaderboard();
    const newEntry: LeaderboardEntry = {
      id: Math.random().toString(36).substring(2, 9),
      name,
      score,
      date: new Date().toISOString().split('T')[0],
    };

    list.push(newEntry);
    list.sort((a, b) => b.score - a.score);
    const top10 = list.slice(0, 10).map((item, index) => ({ ...item, rank: index + 1 }));

    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(top10));
    } catch {
      // Ignored
    }
    return top10;
  }
}
