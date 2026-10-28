import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  async create() {
    // 1. Ensure custom Google Fonts are fully ready before any Canvas text is measured
    if (document.fonts) {
      try {
        await document.fonts.ready;
      } catch (e) {
        console.warn('Font loading check timed out or failed, falling back to system fonts', e);
      }
    }

    // 2. Generate crisp procedural textures with glow
    this.createProceduralTextures();

    // 3. Move to Menu
    this.scene.start('MenuScene');
  }

  private createProceduralTextures() {
    // Player Ship (Cyan Neon Jet)
    const pCanvas = document.createElement('canvas');
    pCanvas.width = 64;
    pCanvas.height = 64;
    const pCtx = pCanvas.getContext('2d')!;
    pCtx.shadowColor = '#00f0ff';
    pCtx.shadowBlur = 15;
    pCtx.fillStyle = '#00f0ff';
    pCtx.beginPath();
    pCtx.moveTo(32, 4);
    pCtx.lineTo(58, 56);
    pCtx.lineTo(32, 44);
    pCtx.lineTo(6, 56);
    pCtx.closePath();
    pCtx.fill();
    // Inner core
    pCtx.fillStyle = '#ffffff';
    pCtx.beginPath();
    pCtx.moveTo(32, 14);
    pCtx.lineTo(46, 48);
    pCtx.lineTo(32, 40);
    pCtx.lineTo(18, 48);
    pCtx.closePath();
    pCtx.fill();
    this.textures.addCanvas('player', pCanvas);

    // Hazard (Red Pulse Spike Mine)
    const hCanvas = document.createElement('canvas');
    hCanvas.width = 56;
    hCanvas.height = 56;
    const hCtx = hCanvas.getContext('2d')!;
    hCtx.shadowColor = '#ff0055';
    hCtx.shadowBlur = 18;
    hCtx.fillStyle = '#ff0055';
    hCtx.beginPath();
    const spikes = 8;
    for (let i = 0; i < spikes * 2; i++) {
      const radius = i % 2 === 0 ? 24 : 12;
      const angle = (i * Math.PI) / spikes;
      const x = 28 + Math.cos(angle) * radius;
      const y = 28 + Math.sin(angle) * radius;
      if (i === 0) hCtx.moveTo(x, y);
      else hCtx.lineTo(x, y);
    }
    hCtx.closePath();
    hCtx.fill();
    // Hazard Core
    hCtx.fillStyle = '#ffffff';
    hCtx.beginPath();
    hCtx.arc(28, 28, 6, 0, Math.PI * 2);
    hCtx.fill();
    this.textures.addCanvas('hazard', hCanvas);

    // Gem (Gold/Cyan Energy Diamond)
    const gCanvas = document.createElement('canvas');
    gCanvas.width = 44;
    gCanvas.height = 44;
    const gCtx = gCanvas.getContext('2d')!;
    gCtx.shadowColor = '#ffd700';
    gCtx.shadowBlur = 15;
    gCtx.fillStyle = '#ffd700';
    gCtx.beginPath();
    gCtx.moveTo(22, 2);
    gCtx.lineTo(42, 22);
    gCtx.lineTo(22, 42);
    gCtx.lineTo(2, 22);
    gCtx.closePath();
    gCtx.fill();
    gCtx.fillStyle = '#ffffff';
    gCtx.beginPath();
    gCtx.arc(22, 22, 5, 0, Math.PI * 2);
    gCtx.fill();
    this.textures.addCanvas('gem', gCanvas);

    // Glow Particle (Soft radial particle)
    const ptCanvas = document.createElement('canvas');
    ptCanvas.width = 24;
    ptCanvas.height = 24;
    const ptCtx = ptCanvas.getContext('2d')!;
    const radGrd = ptCtx.createRadialGradient(12, 12, 0, 12, 12, 12);
    radGrd.addColorStop(0, 'rgba(255, 255, 255, 1)');
    radGrd.addColorStop(0.4, 'rgba(0, 240, 255, 0.8)');
    radGrd.addColorStop(1, 'rgba(0, 240, 255, 0)');
    ptCtx.fillStyle = radGrd;
    ptCtx.fillRect(0, 0, 24, 24);
    this.textures.addCanvas('particle', ptCanvas);
  }
}
