import Phaser from 'phaser';
import { PlayerStats, LeaderboardEntry } from '../types/game';
import { LeaderboardService } from '../services/leaderboardService';
import { SnapshotService } from '../services/snapshotService';
import { SoundEffects } from '../utils/sound';
import { Typography } from '../utils/typography';

interface GameOverData {
  stats?: PlayerStats;
  snapshotDataUrl?: string;
  snapshotBlob?: Blob;
  previewOnly?: boolean;
}

export class GameOverScene extends Phaser.Scene {
  private dataPayload!: GameOverData;
  private container!: Phaser.GameObjects.Container;
  private leaderboardRows: Phaser.GameObjects.Text[] = [];
  private starfield!: Phaser.GameObjects.Graphics;

  constructor() {
    super('GameOverScene');
  }

  init(data: GameOverData) {
    this.dataPayload = data;
  }

  create() {
    const { width, height } = this.scale;
    const isPreview = !!this.dataPayload.previewOnly;
    const stats = this.dataPayload.stats || { score: 0, timeSurvived: 0, gemsCollected: 0, maxCombo: 1 };

    this.starfield = this.add.graphics();
    this.drawBackground(width, height);

    this.container = this.add.container(0, 0);

    // Title
    const title = this.add.text(
      width / 2,
      height * 0.09,
      isPreview ? '全球排行榜' : 'MISSION FAILED',
      Typography.style(28, width, height, {
        fontFamily: Typography.DISPLAY_FONT,
        color: isPreview ? '#ffd700' : '#ff0055',
        fontStyle: 'bold',
      })
    ).setOrigin(0.5);

    // Score display (if game just ended)
    let offsetY = height * 0.17;
    if (!isPreview) {
      const scoreLabel = this.add.text(
        width / 2,
        offsetY,
        `${stats.score.toLocaleString()}`,
        Typography.style(42, width, height, {
          fontFamily: Typography.SCORE_FONT,
          color: '#00f0ff',
        })
      ).setOrigin(0.5);

      const subStats = this.add.text(
        width / 2,
        offsetY + 40,
        `存活時間: ${stats.timeSurvived}秒   |   能量晶石: ${stats.gemsCollected}`,
        Typography.style(14, width, height, {
          color: '#94a3b8',
        })
      ).setOrigin(0.5);

      this.container.add([scoreLabel, subStats]);
      offsetY += 76;
    }

    // Action Buttons Row
    const isLandscape = width > height;
    const btnW = isLandscape ? 170 : Math.min(width * 0.42, 160);
    const btnH = 46;

    if (!isPreview && this.dataPayload.snapshotDataUrl && this.dataPayload.snapshotBlob) {
      // Button: Share/Download Highlight Snapshot
      const snapBtn = this.createButton(
        width / 2 - (btnW / 2 + 8),
        offsetY + 10,
        btnW,
        btnH,
        '戰報截圖 📸',
        '#00f0ff',
        () => {
          SnapshotService.showSnapshotModal(
            this.dataPayload.snapshotDataUrl!,
            this.dataPayload.snapshotBlob!
          );
        }
      );
      this.container.add(snapBtn);

      // Button: Restart Game
      const restartBtn = this.createButton(
        width / 2 + (btnW / 2 + 8),
        offsetY + 10,
        btnW,
        btnH,
        '再次出擊 🚀',
        '#7000ff',
        () => {
          SoundEffects.playStart();
          this.scene.start('GameScene');
        }
      );
      this.container.add(restartBtn);
      offsetY += 62;
    } else {
      const backBtn = this.createButton(
        width / 2,
        offsetY + 10,
        Math.min(width * 0.75, 230),
        btnH,
        '返回主選單 (MENU)',
        '#00f0ff',
        () => {
          this.scene.start('MenuScene');
        }
      );
      this.container.add(backBtn);
      offsetY += 62;
    }

    // Leaderboard Section Header
    const lbHeader = this.add.text(
      width / 2,
      offsetY + 14,
      '🏆 TOP 5 匿名全球排行榜',
      Typography.style(16, width, height, {
        fontFamily: Typography.DISPLAY_FONT,
        color: '#ffd700',
        fontStyle: 'bold',
      })
    ).setOrigin(0.5);
    this.container.add([title, lbHeader]);

    // Load & display Leaderboard
    this.loadLeaderboard(width, height, offsetY + 42);

    if (!isPreview && stats.score > 0) {
      const guestName = 'Pilot-' + Math.floor(100 + Math.random() * 900);
      LeaderboardService.submitScore(guestName, stats.score).then((updatedList) => {
        this.renderLeaderboardRows(width, height, offsetY + 42, updatedList);
      });
    }

    this.scale.on('resize', this.handleResize, this);
  }

  private drawBackground(w: number, h: number) {
    this.starfield.clear();
    this.starfield.fillStyle(0x07070d, 1);
    this.starfield.fillRect(0, 0, w, h);

    this.starfield.lineStyle(1, 0x141830, 0.4);
    const gridSize = 40;
    for (let x = 0; x < w; x += gridSize) this.starfield.lineBetween(x, 0, x, h);
    for (let y = 0; y < h; y += gridSize) this.starfield.lineBetween(0, y, w, y);
  }

  private async loadLeaderboard(width: number, height: number, startY: number) {
    const list = await LeaderboardService.getLeaderboard();
    this.renderLeaderboardRows(width, height, startY, list);
  }

  private renderLeaderboardRows(width: number, height: number, startY: number, list: LeaderboardEntry[]) {
    this.leaderboardRows.forEach((r) => r.destroy());
    this.leaderboardRows = [];

    const top5 = list.slice(0, 5);
    top5.forEach((item, idx) => {
      const y = startY + idx * 28;
      const rankColor = idx === 0 ? '#ffd700' : idx === 1 ? '#c0c0c0' : idx === 2 ? '#cd7f32' : '#94a3b8';
      const text = this.add.text(
        width / 2,
        y,
        `#${idx + 1}  ${item.name.padEnd(12, ' ')} ${item.score.toLocaleString()} pts`,
        Typography.style(15, width, height, {
          color: rankColor,
        })
      ).setOrigin(0.5);

      this.leaderboardRows.push(text);
      this.container.add(text);
    });
  }

  private createButton(x: number, y: number, w: number, h: number, text: string, color: string, onClick: () => void): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);
    const { width, height } = this.scale;

    const bg = this.add.graphics();
    bg.fillStyle(0x131428, 0.95);
    bg.fillRoundedRect(-w / 2, -h / 2, w, h, 10);
    bg.lineStyle(2, Phaser.Display.Color.HexStringToColor(color).color, 0.85);
    bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 10);

    const label = this.add.text(
      0,
      0,
      text,
      Typography.style(14, width, height, {
        color: '#ffffff',
        fontStyle: 'bold',
      })
    ).setOrigin(0.5);

    container.add([bg, label]);
    container.setSize(w, h);
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
    this.drawBackground(gameSize.width, gameSize.height);
  }
}
