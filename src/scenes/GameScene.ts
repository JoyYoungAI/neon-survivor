import Phaser from 'phaser';
import { PlayerStats } from '../types/game';
import { SoundEffects } from '../utils/sound';
import { SnapshotService } from '../services/snapshotService';
import { Typography } from '../utils/typography';

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
  private starfield!: Phaser.GameObjects.Graphics;

  private hazardTimer?: Phaser.Time.TimerEvent;
  private gemTimer?: Phaser.Time.TimerEvent;

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

    const { width, height } = this.scale;

    // Background
    this.starfield = this.add.graphics();
    this.drawBackground(width, height);

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

    // Groups
    this.hazards = this.physics.add.group();
    this.gems = this.physics.add.group();

    // Touch / Pointer controls
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (this.isGameOver) return;
      if (pointer.isDown || !this.sys.game.device.os.desktop) {
        // Smooth lerp to pointer position
        this.physics.moveToObject(this.player, pointer, 450);
        const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, pointer.x, pointer.y);
        if (dist < 15) {
          (this.player.body as Phaser.Physics.Arcade.Body).reset(pointer.x, pointer.y);
        }
      }
    });

    this.input.on('pointerup', () => {
      if (!this.isGameOver && this.player.body) {
        this.player.setVelocity(0, 0);
      }
    });

    // Overlaps
    this.physics.add.overlap(this.player, this.hazards, this.handleHazardHit as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback, undefined, this);
    this.physics.add.overlap(this.player, this.gems, this.handleGemCollect as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback, undefined, this);

    // HUD
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
  }

  private createHUD(w: number, h: number) {
    const isLandscape = w > h;
    const paddingX = isLandscape ? 36 : 20;
    const paddingY = 24;

    this.scoreText = this.add.text(
      paddingX,
      paddingY,
      `SCORE: 0`,
      Typography.style(20, w, h, {
        fontFamily: Typography.SCORE_FONT,
        color: '#00f0ff',
      })
    );

    this.livesText = this.add.text(
      w / 2,
      paddingY,
      'SHIELDS: [ ■ ■ ■ ]',
      Typography.style(16, w, h, {
        fontFamily: Typography.DISPLAY_FONT,
        color: '#38bdf8',
      })
    ).setOrigin(0.5, 0);

    this.timeText = this.add.text(
      w - paddingX,
      paddingY,
      'TIME: 0s',
      Typography.style(16, w, h, {
        fontFamily: Typography.DISPLAY_FONT,
        color: '#94a3b8',
      })
    ).setOrigin(1, 0);
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

  update() {
    if (this.isGameOver) return;

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

  private handleResize(gameSize: { width: number; height: number }) {
    const { width, height } = gameSize;
    this.drawBackground(width, height);

    const isLandscape = width > height;
    const paddingX = isLandscape ? 36 : 20;

    this.scoreText.setFontSize(Typography.getPx(isLandscape ? 22 : 19, width, height));
    this.livesText.setFontSize(Typography.getPx(isLandscape ? 17 : 15, width, height));
    this.timeText.setFontSize(Typography.getPx(isLandscape ? 17 : 15, width, height));

    this.scoreText.setPosition(paddingX, 24);
    this.livesText.setPosition(width / 2, 24);
    this.timeText.setPosition(width - paddingX, 24);

    if (this.player) {
      this.player.setX(Math.min(this.player.x, width - 30));
      this.player.setY(Math.min(this.player.y, height - 30));
    }
  }
}
