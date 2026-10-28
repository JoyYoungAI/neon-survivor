import Phaser from 'phaser';

export class Typography {
  // Comprehensive CJK font stack: Noto Sans TC + Outfit + system fallbacks
  public static readonly CHINESE_FONT = '"Noto Sans TC", "PingFang TC", "Microsoft JhengHei", "Heiti TC", "Outfit", sans-serif';
  public static readonly DISPLAY_FONT = '"Orbitron", "Noto Sans TC", "PingFang TC", sans-serif';
  public static readonly SCORE_FONT = '"Russo One", "Noto Sans TC", sans-serif';

  /**
   * Device Pixel Ratio capped at 3 for optimal sharpness and memory
   */
  public static getDPR(): number {
    return Math.min(window.devicePixelRatio || 1, 3);
  }

  /**
   * Viewport scale factor normalized against standard 390px mobile viewport
   */
  public static getScaleFactor(width: number, height: number): number {
    const isLandscape = width > height;
    // In landscape, height is the constraining dimension for mobile UI; in portrait, width is.
    const base = isLandscape ? Math.min(height, 500) : Math.min(width, 480);
    return Math.max(0.85, Math.min(1.35, base / 380));
  }

  /**
   * Returns responsive font size string in px
   */
  public static getPx(basePx: number, width: number, height: number): string {
    const scale = this.getScaleFactor(width, height);
    return `${Math.round(basePx * scale)}px`;
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
