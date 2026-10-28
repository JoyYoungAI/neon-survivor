export type GameState = 'BOOT' | 'MENU' | 'PLAYING' | 'PAUSED' | 'GAMEOVER';

export type ScreenOrientation = 'PORTRAIT' | 'LANDSCAPE';

export interface LeaderboardEntry {
  id: string;
  name: string;
  score: number;
  date: string;
  rank?: number;
}

export interface PlayerStats {
  score: number;
  timeSurvived: number; // in seconds
  gemsCollected: number;
  maxCombo: number;
}
