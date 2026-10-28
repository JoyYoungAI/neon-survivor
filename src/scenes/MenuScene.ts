import Phaser from 'phaser';
import { SoundEffects } from '../utils/sound';
import { Typography } from '../utils/typography';

export class MenuScene extends Phaser.Scene {
  private titleText!: Phaser.GameObjects.Text;
  private subtitleText!: Phaser.GameObjects.Text;
  private startBtn!: Phaser.GameObjects.Container;
  private lbBtn!: Phaser.GameObjects.Container;
  private starfield!: Phaser.GameObjects.Graphics;

  constructor() {
    super('MenuScene');
  }

  create() {
    const { width, height } = this.scale;

    // Background Cyber Grid
    this.starfield = this.add.graphics();
    this.drawBackground(width, height);

    // Title
    this.titleText = this.add.text(
      width / 2,
      height * 0.3,
      'NEON SURVIVOR',
      Typography.style(42, width, height, {
        fontFamily: Typography.DISPLAY_FONT,
        color: '#00f0ff',
        stroke: '#7000ff',
        strokeThickness: 4,
        align: 'center',
      })
    ).setOrigin(0.5);

    // Subtitle
    this.subtitleText = this.add.text(
      width / 2,
      height * 0.4,
      '直橫向自適應 • 觸控極限生存',
      Typography.style(18, width, height, {
        color: '#94a3b8',
        align: 'center',
      })
    ).setOrigin(0.5);

    // Buttons
    this.startBtn = this.createButton(width / 2, height * 0.58, '開始遊戲 (START)', '#00f0ff', () => {
      SoundEffects.playStart();
      this.scene.start('BriefingScene');
    });

    this.lbBtn = this.createButton(width / 2, height * 0.7, '全球排行榜 (RANK)', '#ffd700', () => {
      SoundEffects.playCollect();
      this.scene.start('GameOverScene', { previewOnly: true });
    });

    this.scale.on('resize', this.handleResize, this);
    this.handleResize({ width, height });
  }

  private drawBackground(w: number, h: number) {
    this.starfield.clear();
    this.starfield.fillStyle(0x07070d, 1);
    this.starfield.fillRect(0, 0, w, h);

    this.starfield.lineStyle(1, 0x1a1b3a, 0.4);
    const gridSize = 40;
    for (let x = 0; x < w; x += gridSize) this.starfield.lineBetween(x, 0, x, h);
    for (let y = 0; y < h; y += gridSize) this.starfield.lineBetween(0, y, w, y);
  }

  private createButton(x: number, y: number, text: string, color: string, onClick: () => void): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);
    const { width, height } = this.scale;

    const btnW = Math.min(width * 0.75, 270);
    const btnH = 54;

    const bg = this.add.graphics();
    bg.fillStyle(0x131428, 0.9);
    bg.fillRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 12);
    bg.lineStyle(2, Phaser.Display.Color.HexStringToColor(color).color, 0.85);
    bg.strokeRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 12);

    const label = this.add.text(
      0,
      0,
      text,
      Typography.style(17, width, height, {
        fontFamily: Typography.DISPLAY_FONT,
        color: '#ffffff',
        fontStyle: 'bold',
      })
    ).setOrigin(0.5);

    container.add([bg, label]);
    container.setSize(btnW, btnH);
    container.setInteractive({ useHandCursor: true });

    container.on('pointerdown', () => container.setScale(0.96));
    container.on('pointerup', () => {
      container.setScale(1);
      onClick();
    });
    container.on('pointerout', () => container.setScale(1));

    return container;
  }

  private handleResize(gameSize: { width: number; height: number }) {
    const { width, height } = gameSize;
    this.drawBackground(width, height);

    const isLandscape = width > height;

    this.titleText.setFontSize(Typography.getPx(isLandscape ? 40 : 36, width, height));
    this.subtitleText.setFontSize(Typography.getPx(isLandscape ? 17 : 16, width, height));

    if (isLandscape) {
      this.titleText.setPosition(width / 2, height * 0.22);
      this.subtitleText.setPosition(width / 2, height * 0.36);
      this.startBtn.setPosition(width / 2, height * 0.55);
      this.lbBtn.setPosition(width / 2, height * 0.72);
    } else {
      this.titleText.setPosition(width / 2, height * 0.28);
      this.subtitleText.setPosition(width / 2, height * 0.38);
      this.startBtn.setPosition(width / 2, height * 0.58);
      this.lbBtn.setPosition(width / 2, height * 0.70);
    }
  }
}
