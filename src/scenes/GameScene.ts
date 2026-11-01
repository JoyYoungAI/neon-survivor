import Phaser from 'phaser';
import { PlayerStats } from '../types/game';
import { SoundEffects } from '../utils/sound';
import { SnapshotService } from '../services/snapshotService';
import { Typography } from '../utils/typography';
import { ControlSettings, ControlMode } from '../utils/controls';

export class GameScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private hazards!: Phaser.Physics.Arcade.Group;
  private gems!: Phaser.Physics.Arcade.Group;
  private emitter!: Phaser.GameObjects.Particles.ParticleEmitter;

  private score = 0;
  private lives = 3;
  private combo = 1;
  private gemsCollected = 0;
  private startTime = 0;
  private isInvulnerable = false;
  private isGameOver = false;

  private scoreText!: Phaser.GameObjects.Text;
  private livesText!: Phaser.GameObjects.Text;
  private timeText!: Phaser.GameObjects.Text;
  private modeButton!: Phaser.GameObjects.Container;
  private modeLabel!: Phaser.GameObjects.Text;
  private starfield!: Phaser.GameObjects.Graphics;
  private hudBg!: Phaser.GameObjects.Graphics;
  private tetherGraphics!: Phaser.GameObjects.Graphics;

  private hazardTimer?: Phaser.Time.TimerEvent;
  private gemTimer?: Phaser.Time.TimerEvent;

  // Touch control state
  private isPointerDown = false;
  private lastPointerX = 0;
  private lastPointerY = 0;
  private currentPointerX = 0;
  private currentPointerY = 0;
  private targetX = 0;
  private targetY = 0;
  private removeControlListener?: () => void;
  private removeFontListener?: () => void;

  constructor() {
    super('GameScene');
  }

  create() {
    this.score = 0;
    this.lives = 3;
    this.combo = 1;
    this.gemsCollected = 0;
    this.startTime = Date.now();
    this.isInvulnerable = false;
    this.isGameOver = false;
    this.isPointerDown = false;

    const { width, height } = this.scale;

    // Background
    this.starfield = this.add.graphics();
    this.drawBackground(width, height);

    // Tether & touch reticle graphics layer (under player)
    this.tetherGraphics = this.add.graphics();

    // Particle Emitter for jet trail
    this.emitter = this.add.particles(0, 0, 'particle', {
      speed: { min: 20, max: 60 },
      scale: { start: 0.8, end: 0 },
      blendMode: 'ADD',
      lifespan: 300,
      frequency: 25,
    });

    // Player
    this.player = this.physics.add.sprite(width / 2, height * 0.8, 'player');
    this.player.setCollideWorldBounds(true);
    this.player.setCircle(20, 12, 12);
    this.emitter.startFollow(this.player, 0, 16);

    // Initial target matches player position
    this.targetX = this.player.x;
    this.targetY = this.player.y;
    this.lastPointerX = this.player.x;
    this.lastPointerY = this.player.y;

    // Groups
    this.hazards = this.physics.add.group();
    this.gems = this.physics.add.group();

    // Touch / Pointer controls
    this.setupInputHandlers();

    // Overlaps
    this.physics.add.overlap(this.player, this.hazards, this.handleHazardHit as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback, undefined, this);
    this.physics.add.overlap(this.player, this.gems, this.handleGemCollect as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback, undefined, this);

    // HUD (Layered with frosted glass cyber backdrop)
    this.createHUD(width, height);

    // Timers for spawning
    this.hazardTimer = this.time.addEvent({
      delay: 700,
      callback: this.spawnHazard,
      callbackScope: this,
      loop: true,
    });

    this.gemTimer = this.time.addEvent({
      delay: 1400,
      callback: this.spawnGem,
      callbackScope: this,
      loop: true,
    });

    // Periodic survival score
    this.time.addEvent({
      delay: 100,
      callback: () => {
        if (!this.isGameOver) {
          this.score += 5 * this.combo;
          this.scoreText.setText(`SCORE: ${this.score}`);
        }
      },
      loop: true,
    });

    // Orientation change listener
    this.scale.on('resize', this.handleResize, this);

    // Sync control mode changes
    this.removeControlListener = ControlSettings.addListener(() => {
      this.updateModeLabel();
    });

    // Sync typography scale changes
    this.removeFontListener = Typography.addListener(() => {
      this.updateHUDLayout(this.scale.width, this.scale.height);
    });
  }

  private setupInputHandlers() {
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.isGameOver) return;
      this.isPointerDown = true;
      this.lastPointerX = pointer.x;
      this.lastPointerY = pointer.y;
      this.currentPointerX = pointer.x;
      this.currentPointerY = pointer.y;

      const mode = ControlSettings.getMode();
      if (mode === 'RELATIVE') {
        // Zero occlusion mode: player stays where it is, finger can touch anywhere
        this.targetX = this.player.x;
        this.targetY = this.player.y;
      } else if (mode === 'OFFSET') {
        const isLandscape = this.scale.width > this.scale.height;
        const offset = isLandscape ? ControlSettings.LANDSCAPE_OFFSET_Y : ControlSettings.PORTRAIT_OFFSET_Y;
        this.targetX = pointer.x;
        this.targetY = pointer.y - offset;
      } else {
        // DIRECT
        this.targetX = pointer.x;
        this.targetY = pointer.y;
      }
      this.clampTarget();
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (this.isGameOver) return;
      this.currentPointerX = pointer.x;
      this.currentPointerY = pointer.y;

      const mode = ControlSettings.getMode();
      const isActive = pointer.isDown || this.isPointerDown || (this.sys.game.device.os.desktop && mode === 'DIRECT');
      if (!isActive) return;

      if (mode === 'RELATIVE') {
        const dx = pointer.x - this.lastPointerX;
        const dy = pointer.y - this.lastPointerY;
        this.targetX += dx;
        this.targetY += dy;
        this.lastPointerX = pointer.x;
        this.lastPointerY = pointer.y;
      } else if (mode === 'OFFSET') {
        const isLandscape = this.scale.width > this.scale.height;
        const offset = isLandscape ? ControlSettings.LANDSCAPE_OFFSET_Y : ControlSettings.PORTRAIT_OFFSET_Y;
        this.targetX = pointer.x;
        this.targetY = pointer.y - offset;
      } else {
        // DIRECT
        this.targetX = pointer.x;
        this.targetY = pointer.y;
      }
      this.clampTarget();
    });

    this.input.on('pointerup', () => {
      this.isPointerDown = false;
      this.tetherGraphics.clear();
      if (!this.isGameOver && this.player && this.player.body) {
        this.player.setVelocity(0, 0);
      }
    });
  }

  private clampTarget() {
    const { width, height } = this.scale;
    const isLandscape = width > height;
    const paddingX = 24;
    const topPadding = isLandscape ? 80 : 124; // Protect multi-tier HUD from player ship
    const bottomPadding = 24;

    this.targetX = Phaser.Math.Clamp(this.targetX, paddingX, width - paddingX);
    this.targetY = Phaser.Math.Clamp(this.targetY, topPadding, height - bottomPadding);
  }

  private createHUD(w: number, h: number) {
    // Semi-transparent frosted cyber backdrop (keeps texts crystal clear from falling hazards)
    this.hudBg = this.add.graphics().setDepth(90);

    this.scoreText = this.add.text(
      0,
      0,
      `SCORE: 0`,
      Typography.style(18, w, h, {
        fontFamily: Typography.SCORE_FONT,
        color: '#00f0ff',
      })
    ).setDepth(100);

    this.livesText = this.add.text(
      0,
      0,
      'SHIELDS: [ ■ ■ ■ ]',
      Typography.style(15, w, h, {
        fontFamily: Typography.DISPLAY_FONT,
        color: '#38bdf8',
      })
    ).setDepth(100);

    this.timeText = this.add.text(
      0,
      0,
      'TIME: 0s',
      Typography.style(15, w, h, {
        fontFamily: Typography.DISPLAY_FONT,
        color: '#94a3b8',
      })
    ).setDepth(100);

    // In-game mode quick switcher badge
    this.createModeButton(w, 88);

    // Initial responsive layout positioning
    this.updateHUDLayout(w, h);
  }

  private updateHUDLayout(w: number, h: number) {
    const isLandscape = w > h;

    this.scoreText.setFontSize(Typography.getPx(isLandscape ? 20 : 17, w, h));
    this.livesText.setFontSize(Typography.getPx(isLandscape ? 16 : 14, w, h));
    this.timeText.setFontSize(Typography.getPx(isLandscape ? 16 : 14, w, h));

    // Draw HUD frosted glass background bar
    this.hudBg.clear();
    const hudHeight = isLandscape ? 72 : 116;

    // Dark cyberpunk translucent bar
    this.hudBg.fillStyle(0x07070d, 0.85);
    this.hudBg.fillRect(0, 0, w, hudHeight);

    // Cyber neon hairline separator
    this.hudBg.lineStyle(1.5, 0x00f0ff, 0.35);
    this.hudBg.lineBetween(0, hudHeight, w, hudHeight);

    if (!isLandscape) {
      // PORTRAIT MODE: Clean 3-tier hierarchy, completely eliminates any horizontal text collision
      const paddingX = 18;
      const row1Y = 28; // SCORE on Left, TIME on Right
      const row2Y = 58; // SHIELDS in Center
      const row3Y = 90; // CONTROL MODE BADGE in Center

      this.scoreText.setOrigin(0, 0);
      this.scoreText.setPosition(paddingX, row1Y);

      this.timeText.setOrigin(1, 0);
      this.timeText.setPosition(w - paddingX, row1Y);

      this.livesText.setOrigin(0.5, 0);
      this.livesText.setPosition(w / 2, row2Y);

      if (this.modeButton) {
        this.modeButton.setPosition(w / 2, row3Y);
      }
    } else {
      // LANDSCAPE MODE: Wide single-line layout
      const paddingX = 32;
      const row1Y = 18;
      const row2Y = 48;

      this.scoreText.setOrigin(0, 0);
      this.scoreText.setPosition(paddingX, row1Y);

      this.livesText.setOrigin(0.5, 0);
      this.livesText.setPosition(w / 2, row1Y);

      this.timeText.setOrigin(1, 0);
      this.timeText.setPosition(w - paddingX, row1Y);

      if (this.modeButton) {
        this.modeButton.setPosition(w / 2, row2Y);
      }
    }
  }

  private createModeButton(w: number, y: number) {
    this.modeButton = this.add.container(w / 2, y).setDepth(100);

    const btnW = 160;
    const btnH = 24;
    const bg = this.add.graphics();
    bg.fillStyle(0x0e1022, 0.85);
    bg.fillRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 6);
    bg.lineStyle(1, 0x00f0ff, 0.45);
    bg.strokeRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 6);

    this.modeLabel = this.add.text(
      0,
      0,
      `${ControlSettings.getShortModeName()} ⇄`,
      Typography.style(11, w, this.scale.height, {
        fontFamily: Typography.CHINESE_FONT,
        color: '#38bdf8',
      })
    ).setOrigin(0.5);

    this.modeButton.add([bg, this.modeLabel]);
    this.modeButton.setSize(btnW, btnH);
    this.modeButton.setInteractive({ useHandCursor: true });

    this.modeButton.on('pointerdown', () => this.modeButton.setScale(0.95));
    this.modeButton.on('pointerup', () => {
      this.modeButton.setScale(1);
      ControlSettings.cycleMode();
      SoundEffects.playCollect();
      this.updateModeLabel();
    });
    this.modeButton.on('pointerout', () => this.modeButton.setScale(1));
  }

  private updateModeLabel() {
    if (this.modeLabel) {
      this.modeLabel.setText(`${ControlSettings.getShortModeName()} ⇄`);
    }
  }

  private drawBackground(w: number, h: number) {
    this.starfield.clear();
    this.starfield.fillStyle(0x07070d, 1);
    this.starfield.fillRect(0, 0, w, h);

    this.starfield.lineStyle(1, 0x141830, 0.5);
    const gridSize = 45;
    for (let x = 0; x < w; x += gridSize) {
      this.starfield.lineBetween(x, 0, x, h);
    }
    for (let y = 0; y < h; y += gridSize) {
      this.starfield.lineBetween(0, y, w, y);
    }
  }

  private spawnHazard() {
    if (this.isGameOver) return;
    const { width, height } = this.scale;
    const isLandscape = width > height;

    let x = 0;
    let y = 0;
    let vx = 0;
    let vy = 0;

    if (!isLandscape) {
      // Portrait: spawn from top, move downward
      x = Phaser.Math.Between(30, width - 30);
      y = -30;
      vx = Phaser.Math.Between(-40, 40);
      vy = Phaser.Math.Between(180, 320);
    } else {
      // Landscape: spawn from top or right
      const fromTop = Math.random() > 0.4;
      if (fromTop) {
        x = Phaser.Math.Between(40, width - 40);
        y = -30;
        vx = Phaser.Math.Between(-80, 80);
        vy = Phaser.Math.Between(160, 280);
      } else {
        x = width + 30;
        y = Phaser.Math.Between(40, height - 40);
        vx = Phaser.Math.Between(-280, -160);
        vy = Phaser.Math.Between(-40, 40);
      }
    }

    const hazard = this.hazards.create(x, y, 'hazard') as Phaser.Physics.Arcade.Sprite;
    hazard.setVelocity(vx, vy);
    hazard.setAngularVelocity(Phaser.Math.Between(100, 240));
    hazard.setCircle(18, 10, 10);
  }

  private spawnGem() {
    if (this.isGameOver) return;
    const { width, height } = this.scale;
    const x = Phaser.Math.Between(40, width - 40);
    const y = -30;
    const gem = this.gems.create(x, y, 'gem') as Phaser.Physics.Arcade.Sprite;
    gem.setVelocity(Phaser.Math.Between(-20, 20), Phaser.Math.Between(120, 200));
    gem.setAngularVelocity(120);
  }

  private handleHazardHit() {
    if (this.isInvulnerable || this.isGameOver) return;

    this.lives--;
    this.combo = 1;
    SoundEffects.playHit();

    // Mobile Haptic feedback
    if (navigator.vibrate) {
      try { navigator.vibrate([50, 40, 50]); } catch {}
    }

    // Explosion particles
    const burst = this.add.particles(this.player.x, this.player.y, 'particle', {
      speed: { min: 80, max: 200 },
      scale: { start: 1, end: 0 },
      blendMode: 'ADD',
      lifespan: 400,
      quantity: 15,
    });
    this.time.delayedCall(450, () => burst.destroy());

    if (this.lives <= 0) {
      this.triggerGameOver();
      return;
    }

    // Invulnerability blinking
    this.isInvulnerable = true;
    this.updateHUDLives();

    this.tweens.add({
      targets: this.player,
      alpha: 0.3,
      duration: 120,
      yoyo: true,
      repeat: 5,
      onComplete: () => {
        this.player.setAlpha(1);
        this.isInvulnerable = false;
      },
    });
  }

  private handleGemCollect(_player: unknown, gemObj: unknown) {
    if (this.isGameOver) return;
    const gem = gemObj as Phaser.Physics.Arcade.Sprite;
    gem.destroy();

    this.gemsCollected++;
    this.score += 250 * this.combo;
    if (this.gemsCollected % 4 === 0 && this.combo < 5) {
      this.combo++;
    }

    SoundEffects.playCollect();
    this.scoreText.setText(`SCORE: ${this.score}`);
  }

  private updateHUDLives() {
    let pips = '';
    for (let i = 0; i < 3; i++) {
      pips += i < this.lives ? ' ■' : ' □';
    }
    this.livesText.setText(`SHIELDS: [${pips} ]`);
  }

  private async triggerGameOver() {
    this.isGameOver = true;
    this.physics.pause();
    this.hazardTimer?.destroy();
    this.gemTimer?.destroy();
    this.emitter.stop();
    this.tetherGraphics.clear();

    const elapsedSeconds = Math.floor((Date.now() - this.startTime) / 1000);
    const stats: PlayerStats = {
      score: this.score,
      timeSurvived: elapsedSeconds,
      gemsCollected: this.gemsCollected,
      maxCombo: this.combo,
    };

    // Requirement 9: Automatic game highlight screenshot capture on game over
    let snapshotDataUrl = '';
    let snapshotBlob: Blob | null = null;
    try {
      const snap = await SnapshotService.createHighlightCard(this.game.canvas, stats, 'Player');
      snapshotDataUrl = snap.dataUrl;
      snapshotBlob = snap.blob;
    } catch (e) {
      console.warn('Failed to generate snapshot card', e);
    }

    this.time.delayedCall(600, () => {
      this.scene.start('GameOverScene', { stats, snapshotDataUrl, snapshotBlob });
    });
  }

  update(_time: number, delta: number) {
    if (this.isGameOver) return;

    // Smooth movement towards target
    const mode = ControlSettings.getMode();
    const isActive = this.isPointerDown || (this.sys.game.device.os.desktop && mode === 'DIRECT');

    if (isActive && this.player && this.player.body) {
      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.targetX, this.targetY);
      if (dist > 1) {
        const dt = Math.min(delta / 1000, 0.05);
        const lerpSpeed = mode === 'RELATIVE' ? 24 : 20;
        const factor = Math.min(1, dt * lerpSpeed);
        this.player.x = Phaser.Math.Linear(this.player.x, this.targetX, factor);
        this.player.y = Phaser.Math.Linear(this.player.y, this.targetY, factor);
      } else {
        this.player.x = this.targetX;
        this.player.y = this.targetY;
      }
      this.player.setVelocity(0, 0);
    }

    // Render Cyber Tether & Touch Reticle
    this.renderTether(mode);

    // Clean up out of bound objects
    const { height } = this.scale;
    this.hazards.getChildren().forEach((h) => {
      const sprite = h as Phaser.Physics.Arcade.Sprite;
      if (sprite.y > height + 50 || sprite.x < -50 || sprite.x > this.scale.width + 50) {
        sprite.destroy();
      }
    });

    this.gems.getChildren().forEach((g) => {
      const sprite = g as Phaser.Physics.Arcade.Sprite;
      if (sprite.y > height + 50) {
        sprite.destroy();
      }
    });

    // Update time
    const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
    this.timeText.setText(`TIME: ${elapsed}s`);
  }

  private renderTether(mode: ControlMode) {
    this.tetherGraphics.clear();
    if (this.isGameOver || !this.isPointerDown) return;

    const px = this.currentPointerX;
    const py = this.currentPointerY;

    if (mode === 'RELATIVE') {
      // 1. Touch point reticle ring
      this.tetherGraphics.lineStyle(1.5, 0x00f0ff, 0.45);
      this.tetherGraphics.strokeCircle(px, py, 20);

      this.tetherGraphics.fillStyle(0x00f0ff, 0.25);
      this.tetherGraphics.fillCircle(px, py, 5);

      // 2. Subtle sci-fi laser guide line from touch point to spaceship
      const dist = Phaser.Math.Distance.Between(px, py, this.player.x, this.player.y);
      if (dist > 35) {
        this.tetherGraphics.lineStyle(1, 0x00f0ff, 0.2);
        this.tetherGraphics.lineBetween(px, py, this.player.x, this.player.y + 12);

        // Subtle guide anchor dot behind ship
        this.tetherGraphics.fillStyle(0x38bdf8, 0.4);
        this.tetherGraphics.fillCircle(this.player.x, this.player.y + 16, 3);
      }
    } else if (mode === 'OFFSET') {
      // Offset handle reticle
      this.tetherGraphics.lineStyle(1.5, 0x38bdf8, 0.4);
      this.tetherGraphics.strokeCircle(px, py, 18);
      this.tetherGraphics.fillStyle(0x38bdf8, 0.2);
      this.tetherGraphics.fillCircle(px, py, 4);

      // Vertical guide beam connecting touch point to ship bottom
      this.tetherGraphics.lineStyle(1, 0x38bdf8, 0.25);
      this.tetherGraphics.lineBetween(px, py, this.player.x, this.player.y + 16);
    }
  }

  private handleResize(gameSize: { width: number; height: number }) {
    const { width, height } = gameSize;
    this.drawBackground(width, height);
    this.updateHUDLayout(width, height);

    if (this.player) {
      const isLandscape = width > height;
      const topPadding = isLandscape ? 80 : 124;
      this.player.setX(Math.min(Math.max(this.player.x, 30), width - 30));
      this.player.setY(Math.min(Math.max(this.player.y, topPadding), height - 30));
      this.targetX = this.player.x;
      this.targetY = this.player.y;
    }
  }

  destroy() {
    if (this.removeControlListener) {
      this.removeControlListener();
    }
    if (this.removeFontListener) {
      this.removeFontListener();
    }
  }
}
