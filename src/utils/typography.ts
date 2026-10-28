import Phaser from 'phaser';

export type FontScaleLevel = 0 | 1 | 2; // 0: 標準 (1.0x), 1: 放大 (1.2x), 2: 特大 (1.4x)

export class Typography {
  // Comprehensive CJK font stack: Noto Sans TC + Outfit + system fallbacks
  public static readonly CHINESE_FONT = '"Noto Sans TC", "PingFang TC", "Microsoft JhengHei", "Heiti TC", "Outfit", sans-serif';
  public static readonly DISPLAY_FONT = '"Orbitron", "Noto Sans TC", "PingFang TC", sans-serif';
  public static readonly SCORE_FONT = '"Russo One", "Noto Sans TC", sans-serif';

  private static readonly STORAGE_KEY = 'neon_user_font_level';
  public static readonly LEVEL_NAMES: Record<FontScaleLevel, string> = {
    0: '🔤 字體: 標準',
    1: '🔤 字體: 放大 (+20%)',
    2: '🔤 字體: 特大 (+40%)',
  };
  public static readonly LEVEL_MULTIPLIERS: Record<FontScaleLevel, number> = {
    0: 1.0,
    1: 1.2,
    2: 1.4,
  };

  private static currentLevel: FontScaleLevel = Typography.loadSavedLevel();
  private static listeners: Array<(level: FontScaleLevel) => void> = [];

  private static loadSavedLevel(): FontScaleLevel {
    try {
      const val = localStorage.getItem(Typography.STORAGE_KEY);
      if (val === '0' || val === '1' || val === '2') {
        return parseInt(val, 10) as FontScaleLevel;
      }
    } catch {
      // Ignored
    }
    return 0; // Default: Standard
  }

  public static getLevel(): FontScaleLevel {
    return this.currentLevel;
  }

  public static getLevelName(): string {
    return this.LEVEL_NAMES[this.currentLevel];
  }

  public static getLevelMultiplier(): number {
    return this.LEVEL_MULTIPLIERS[this.currentLevel];
  }

  /**
   * Cycles font level: 0 -> 1 -> 2 -> 0 and notifies listeners
   */
  public static cycleLevel(): FontScaleLevel {
    this.currentLevel = ((this.currentLevel + 1) % 3) as FontScaleLevel;
    try {
      localStorage.setItem(this.STORAGE_KEY, this.currentLevel.toString());
    } catch {
      // Ignored
    }
    this.listeners.forEach((cb) => {
      try { cb(this.currentLevel); } catch (e) { console.error(e); }
    });
    return this.currentLevel;
  }

  public static addListener(callback: (level: FontScaleLevel) => void): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter((cb) => cb !== callback);
    };
  }

  /**
   * Device Pixel Ratio capped at 3 for optimal sharpness
   */
  public static getDPR(): number {
    return Math.min(window.devicePixelRatio || 1, 3);
  }

  /**
   * Viewport scale factor normalized against standard 380px mobile viewport
   */
  public static getScaleFactor(width: number, height: number): number {
    const isLandscape = width > height;
    const base = isLandscape ? Math.min(height, 500) : Math.min(width, 480);
    return Math.max(0.85, Math.min(1.35, base / 380));
  }

  /**
   * Returns responsive font size string in px, multiplied by the player's 3-level preference
   */
  public static getPx(basePx: number, width: number, height: number): string {
    const viewportScale = this.getScaleFactor(width, height);
    const userScale = this.getLevelMultiplier();
    return `${Math.round(basePx * viewportScale * userScale)}px`;
  }

  /**
   * Helper to build crisp Phaser Text style with native Retina resolution
   */
  public static style(
    basePx: number,
    width: number,
    height: number,
    custom: Phaser.Types.GameObjects.Text.TextStyle = {}
  ): Phaser.Types.GameObjects.Text.TextStyle {
    return {
      fontFamily: this.CHINESE_FONT,
      fontSize: this.getPx(basePx, width, height),
      resolution: this.getDPR(),
      ...custom,
    };
  }
}
