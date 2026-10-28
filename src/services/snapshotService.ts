import { PlayerStats } from '../types/game';

export class SnapshotService {
  private static lastSnapshotUrl: string | null = null;
  private static lastSnapshotBlob: Blob | null = null;

  /**
   * Generates a composite highlight card using offscreen canvas
   */
  public static async createHighlightCard(
    gameCanvas: HTMLCanvasElement,
    stats: PlayerStats,
    playerName: string
  ): Promise<{ dataUrl: string; blob: Blob }> {
    const width = 1080;
    const height = 1920; // 9:16 mobile standard story aspect ratio

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get 2d context for snapshot');

    // 1. Dark Cyber Gradient Background
    const bgGradient = ctx.createLinearGradient(0, 0, width, height);
    bgGradient.addColorStop(0, '#0a0a1a');
    bgGradient.addColorStop(0.5, '#050510');
    bgGradient.addColorStop(1, '#0e0b24');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, width, height);

    // 2. Draw scaled game canvas snapshot in center with border
    const previewWidth = 920;
    const previewHeight = Math.round((previewWidth / gameCanvas.width) * gameCanvas.height);
    const clampedPreviewHeight = Math.min(previewHeight, 1000);
    const previewX = (width - previewWidth) / 2;
    const previewY = 320;

    // Glowing frame
    ctx.save();
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 25;
    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 4;
    ctx.strokeRect(previewX, previewY, previewWidth, clampedPreviewHeight);

    // Clip & draw game canvas
    ctx.beginPath();
    ctx.rect(previewX, previewY, previewWidth, clampedPreviewHeight);
    ctx.clip();
    ctx.drawImage(gameCanvas, previewX, previewY, previewWidth, clampedPreviewHeight);
    ctx.restore();

    // 3. Top Cyberpunk Banner
    ctx.save();
    ctx.textAlign = 'center';

    // Game Title
    ctx.font = '900 64px "Orbitron", sans-serif';
    ctx.fillStyle = '#00f0ff';
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 30;
    ctx.fillText('NEON SURVIVOR', width / 2, 140);

    ctx.font = '700 32px "Noto Sans TC", "Outfit", sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.shadowBlur = 0;
    ctx.fillText('— 遊戲高光精彩戰報 —', width / 2, 210);
    ctx.restore();

    // 4. Score & Stats Panel
    const statsY = previewY + clampedPreviewHeight + 60;

    ctx.save();
    ctx.textAlign = 'center';

    // Score
    ctx.font = '900 120px "Russo One", sans-serif';
    ctx.fillStyle = '#ff007f';
    ctx.shadowColor = '#ff007f';
    ctx.shadowBlur = 35;
    ctx.fillText(stats.score.toLocaleString(), width / 2, statsY + 80);

    ctx.font = '600 32px "Orbitron", sans-serif';
    ctx.fillStyle = '#e2e8f0';
    ctx.shadowBlur = 0;
    ctx.fillText('FINAL SCORE', width / 2, statsY + 130);

    // Sub-stats (Time, Gems, Player)
    ctx.font = '500 34px "Noto Sans TC", "Outfit", sans-serif';
    ctx.fillStyle = '#38bdf8';
    const min = Math.floor(stats.timeSurvived / 60);
    const sec = stats.timeSurvived % 60;
    const timeStr = `${min}m ${sec < 10 ? '0' : ''}${sec}s`;
    ctx.fillText(`戰機駕駛: ${playerName}   |   存活: ${timeStr}   |   能量球: ${stats.gemsCollected}`, width / 2, statsY + 200);

    // Footer Watermark
    ctx.font = '400 24px "Orbitron", sans-serif';
    ctx.fillStyle = '#475569';
    const dateStr = new Date().toLocaleDateString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit' });
    ctx.fillText(`VERIFIED RUN • ${dateStr} • CLOUDFLARE PAGES & PSTACK`, width / 2, height - 60);
    ctx.restore();

    // 5. Convert to Blob & DataURL
    const dataUrl = canvas.toDataURL('image/png');
    const blob = await new Promise<Blob>((resolve) => {
      canvas.toBlob((b) => resolve(b || new Blob()), 'image/png');
    });

    this.lastSnapshotUrl = dataUrl;
    this.lastSnapshotBlob = blob;

    return { dataUrl, blob };
  }

  /**
   * Triggers native Web Share API (iOS/Android) or falls back to direct download
   */
  public static async shareOrDownload(blob: Blob, filename = 'neon-survivor-highlight.png'): Promise<boolean> {
    const file = new File([blob], filename, { type: 'image/png' });

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          title: 'Neon Survivor 精彩戰報',
          text: '我在《Neon Survivor 霓虹生存者》創下了高分！',
          files: [file],
        });
        return true;
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          console.warn('Native share failed, falling back to download', err);
        }
      }
    }

    // Direct download fallback
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
    return true;
  }

  public static showSnapshotModal(dataUrl: string, blob: Blob): void {
    const modal = document.getElementById('snapshot-modal');
    const img = document.getElementById('snapshot-img') as HTMLImageElement;
    const btnShare = document.getElementById('btn-share-snapshot');
    const btnClose = document.getElementById('btn-close-snapshot');

    if (!modal || !img || !btnShare || !btnClose) return;

    img.src = dataUrl;
    modal.style.display = 'flex';

    btnShare.onclick = () => {
      this.shareOrDownload(blob);
    };

    btnClose.onclick = () => {
      modal.style.display = 'none';
    };
  }
}
