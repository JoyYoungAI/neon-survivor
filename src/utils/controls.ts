export type ControlMode = 'RELATIVE' | 'OFFSET' | 'DIRECT';

export class ControlSettings {
  private static readonly STORAGE_KEY = 'neon_user_control_mode';

  public static readonly MODE_NAMES: Record<ControlMode, string> = {
    RELATIVE: '🕹️ 操控: 相對滑動 (無遮擋)',
    OFFSET: '👆 操控: 上方偏置 (+70px)',
    DIRECT: '🎯 操控: 直接跟隨 (原版)',
  };

  public static readonly MODE_SHORT_NAMES: Record<ControlMode, string> = {
    RELATIVE: '🕹️ 相對滑動',
    OFFSET: '👆 上方偏置',
    DIRECT: '🎯 直接跟隨',
  };

  public static readonly MODE_DESCRIPTIONS: Record<ControlMode, string> = {
    RELATIVE: '手指在螢幕底端任意滑動，戰機於上方同步移動，視野 100% 零手指遮擋！',
    OFFSET: '手指跟隨操控，戰機自動浮在手指上方 70px，視野開闊不擋機身。',
    DIRECT: '經典直推操控，戰機精確緊隨手指中心點。',
  };

  public static readonly PORTRAIT_OFFSET_Y = 70;
  public static readonly LANDSCAPE_OFFSET_Y = 45;

  private static currentMode: ControlMode = ControlSettings.loadSavedMode();
  private static listeners: Array<(mode: ControlMode) => void> = [];

  private static loadSavedMode(): ControlMode {
    try {
      const saved = localStorage.getItem(ControlSettings.STORAGE_KEY);
      if (saved === 'RELATIVE' || saved === 'OFFSET' || saved === 'DIRECT') {
        return saved;
      }
    } catch {
      // Ignored
    }
    // Default to RELATIVE for best mobile anti-occlusion experience
    return 'RELATIVE';
  }

  public static getMode(): ControlMode {
    return this.currentMode;
  }

  public static getModeName(): string {
    return this.MODE_NAMES[this.currentMode];
  }

  public static getShortModeName(): string {
    return this.MODE_SHORT_NAMES[this.currentMode];
  }

  public static getModeDescription(): string {
    return this.MODE_DESCRIPTIONS[this.currentMode];
  }

  public static cycleMode(): ControlMode {
    switch (this.currentMode) {
      case 'RELATIVE':
        this.currentMode = 'OFFSET';
        break;
      case 'OFFSET':
        this.currentMode = 'DIRECT';
        break;
      case 'DIRECT':
        this.currentMode = 'RELATIVE';
        break;
      default:
        this.currentMode = 'RELATIVE';
    }

    try {
      localStorage.setItem(this.STORAGE_KEY, this.currentMode);
    } catch {
      // Ignored
    }

    this.listeners.forEach((cb) => {
      try {
        cb(this.currentMode);
      } catch (e) {
        console.error(e);
      }
    });

    return this.currentMode;
  }

  public static setMode(mode: ControlMode): void {
    if (this.currentMode === mode) return;
    this.currentMode = mode;
    try {
      localStorage.setItem(this.STORAGE_KEY, this.currentMode);
    } catch {
      // Ignored
    }
    this.listeners.forEach((cb) => {
      try {
        cb(this.currentMode);
      } catch (e) {
        console.error(e);
      }
    });
  }

  public static addListener(callback: (mode: ControlMode) => void): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter((cb) => cb !== callback);
    };
  }
}
