import Phaser from 'phaser';
import { SoundEffects } from '../utils/sound';
import { Typography } from '../utils/typography';

export class BriefingScene extends Phaser.Scene {
  private starfield!: Phaser.GameObjects.Graphics;
  private container!: Phaser.GameObjects.Container;
  private progressBar!: Phaser.GameObjects.Graphics;
  private launchBtn!: Phaser.GameObjects.Container;
  private scanline!: Phaser.GameObjects.Graphics;

  constructor() {
    super('BriefingScene');
  }

  create() {
    const { width, height } = this.scale;

    this.starfield = this.add.graphics();
    this.drawBackground(width, height);

    this.container = this.add.container(0, 0);

    // Scanline effect
    this.scanline = this.add.graphics();
    this.scanline.fillStyle(0x00f0ff, 0.08);
    this.scanline.fillRect(0, 0, width, 8);
    this.tweens.add({
      targets: this.scanline,
      y: height,
      duration: 1800,
      repeat: -1,
      ease: 'Linear',
    });

    this.renderBriefing(width, height);

    SoundEffects.playStart();
    this.scale.on('resize', this.handleResize, this);
  }

  private drawBackground(w: number, h: number) {
    this.starfield.clear();
    this.starfield.fillStyle(0x07070d, 1);
    this.starfield.fillRect(0, 0, w, h);

    this.starfield.lineStyle(1, 0x11162d, 0.6);
    const step = 40;
    for (let x = 0; x < w; x += step) this.starfield.lineBetween(x, 0, x, h);
    for (let y = 0; y < h; y += step) this.starfield.lineBetween(0, y, w, y);
  }

  private renderBriefing(w: number, h: number) {
    this.container.removeAll(true);
    const isLandscape = w > h;

    // Header Title
    const title = this.add.text(
      w / 2,
      isLandscape ? 36 : 56,
      'MISSION BRIEFING // 任務簡報',
      Typography.style(21, w, h, {
        fontFamily: Typography.DISPLAY_FONT,
        color: '#00f0ff',
        fontStyle: 'bold',
      })
    ).setOrigin(0.5);
    this.container.add(title);

    // Cyber system log lines
    const logText = this.add.text(
      w / 2,
      isLandscape ? 68 : 94,
      '> NEURAL INTERFACE ONLINE • SYSTEM READY',
      Typography.style(12, w, h, {
        color: '#64748b',
      })
    ).setOrigin(0.5);
    this.container.add(logText);

    // Instruction Cards (3 visual tips)
    const cards = [
      {
        icon: 'player',
        tag: '🚀 操控戰機',
        desc: '手指在螢幕任意處滑動\n戰機即時跟隨指尖微操',
        color: '#00f0ff',
      },
      {
        icon: 'hazard',
        tag: '⚠️ 閃避紅光',
        desc: '避開紅色旋轉脈衝刺球\n撞擊扣除 1 格護盾 (共3格)',
        color: '#ff0055',
      },
      {
        icon: 'gem',
        tag: '💎 能量水晶',
        desc: '收集能量球啟動 Combo\n最高可疊加 5 倍分數加成！',
        color: '#ffd700',
      },
    ];

    const cardW = isLandscape ? Math.min(w * 0.28, 230) : Math.min(w * 0.88, 350);
    const cardH = isLandscape ? Math.min(h * 0.45, 170) : Math.min(h * 0.12, 80);

    cards.forEach((card, i) => {
      let cx = w / 2;
      let cy = 0;

      if (isLandscape) {
        cx = w / 2 + (i - 1) * (cardW + 18);
        cy = h * 0.44;
      } else {
        cy = 150 + i * (cardH + 14);
      }

      const cardBox = this.createCard(cx, cy, cardW, cardH, card, isLandscape, w, h);
      this.container.add(cardBox);
    });

    // Loading Bar
    const barW = Math.min(w * 0.82, 340);
    const barH = 10;
    const barY = isLandscape ? h * 0.73 : h * 0.70;

    const barBg = this.add.graphics();
    barBg.fillStyle(0x1a1b35, 1);
    barBg.fillRoundedRect(w / 2 - barW / 2, barY, barW, barH, 5);
    barBg.lineStyle(1, 0x00f0ff, 0.4);
    barBg.strokeRoundedRect(w / 2 - barW / 2, barY, barW, barH, 5);
    this.container.add(barBg);

    this.progressBar = this.add.graphics();
    this.container.add(this.progressBar);

    const loadingLabel = this.add.text(
      w / 2,
      barY - 18,
      'SYSTEM CALIBRATION // 戰機校準中...',
      Typography.style(12, w, h, {
        fontFamily: Typography.DISPLAY_FONT,
        color: '#38bdf8',
      })
    ).setOrigin(0.5);
    this.container.add(loadingLabel);

    // Animate progress bar (fills in 3.2s)
    let progress = 0;
    const progressTween = this.tweens.addCounter({
      from: 0,
      to: 1,
      duration: 3200,
      onUpdate: (tween) => {
        progress = tween.getValue() ?? 0;
        this.progressBar.clear();
        this.progressBar.fillStyle(0x00f0ff, 1);
        this.progressBar.fillRoundedRect(w / 2 - barW / 2 + 1, barY + 1, (barW - 2) * progress, barH - 2, 4);
      },
      onComplete: () => {
        this.launchGame();
      },
    });

    // Immediate Launch Button
    const btnY = isLandscape ? h * 0.86 : h * 0.83;
    this.launchBtn = this.createLaunchButton(w / 2, btnY, '⚡ 立即出擊 (ENGAGE)', w, h, () => {
      progressTween.stop();
      this.launchGame();
    });
    this.container.add(this.launchBtn);
  }

  private createCard(
    x: number,
    y: number,
    w: number,
    h: number,
    data: { icon: string; tag: string; desc: string; color: string },
    isLandscape: boolean,
    vw: number,
    vh: number
  ): Phaser.GameObjects.Container {
    const card = this.add.container(x, y);

    const bg = this.add.graphics();
    bg.fillStyle(0x101226, 0.9);
    bg.fillRoundedRect(-w / 2, -h / 2, w, h, 12);
    bg.lineStyle(1.5, Phaser.Display.Color.HexStringToColor(data.color).color, 0.7);
    bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 12);

    const iconSprite = this.add.sprite(isLandscape ? 0 : -w / 2 + 36, isLandscape ? -h / 2 + 38 : 0, data.icon);
    iconSprite.setScale(isLandscape ? 0.9 : 0.8);

    const tag = this.add.text(
      isLandscape ? 0 : -w / 2 + 74,
      isLandscape ? -8 : -14,
      data.tag,
      Typography.style(15, vw, vh, {
        fontFamily: Typography.CHINESE_FONT,
        color: data.color,
        fontStyle: 'bold',
      })
    ).setOrigin(isLandscape ? 0.5 : 0, 0.5);

    const desc = this.add.text(
      isLandscape ? 0 : -w / 2 + 74,
      isLandscape ? 40 : 13,
      data.desc,
      Typography.style(13, vw, vh, {
        fontFamily: Typography.CHINESE_FONT,
        color: '#e2e8f0',
        lineSpacing: 4,
        align: isLandscape ? 'center' : 'left',
      })
    ).setOrigin(isLandscape ? 0.5 : 0, 0.5);

    card.add([bg, iconSprite, tag, desc]);
    return card;
  }

  private createLaunchButton(x: number, y: number, text: string, vw: number, vh: number, onClick: () => void): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);

    const bg = this.add.graphics();
    const btnW = Math.min(vw * 0.72, 250);
    const btnH = 50;
    bg.fillStyle(0x00f0ff, 0.15);
    bg.fillRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 12);
    bg.lineStyle(2, 0x00f0ff, 0.9);
    bg.strokeRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 12);

    const label = this.add.text(
      0,
      0,
      text,
      Typography.style(16, vw, vh, {
        fontFamily: Typography.DISPLAY_FONT,
        color: '#00f0ff',
        fontStyle: 'bold',
      })
    ).setOrigin(0.5);

    container.add([bg, label]);
    container.setSize(btnW, btnH);
    container.setInteractive({ useHandCursor: true });

    this.tweens.add({
      targets: container,
      scaleX: 1.04,
      scaleY: 1.04,
      duration: 650,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    container.on('pointerdown', () => onClick());
    return container;
  }

  private launchGame() {
    SoundEffects.playStart();
    this.scene.start('GameScene');
  }

  private handleResize(gameSize: { width: number; height: number }) {
    const { width, height } = gameSize;
    this.drawBackground(width, height);
    this.renderBriefing(width, height);
  }
}
