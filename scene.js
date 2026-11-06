import { PALETTE } from './config.js';

function seeded(seed) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function buildLayer(count, seed, wMin, wMax, hMin, hMax, period) {
  const rnd = seeded(seed);
  const out = [];
  let x = 0;
  for (let i = 0; i < count; i++) {
    const w = wMin + rnd() * (wMax - wMin);
    const h = hMin + rnd() * (hMax - hMin);
    out.push({ x, w, h, seed: Math.floor(rnd() * 10000), roof: rnd() > 0.75 });
    x += w * (1.05 + rnd() * 0.5);
    if (x > period) break;
  }
  return out;
}

export class Scene {
  constructor() {
    this.t = 0;
    this.clouds = [];
    const r = seeded(4242);
    for (let i = 0; i < 7; i++) {
      this.clouds.push({
        x: r() * 2600,
        y: 60 + r() * 170,
        s: 0.6 + r() * 0.9,
        puffs: 3 + Math.floor(r() * 3),
        drift: 4 + r() * 8,
      });
    }
    this.farPeriod = 1400;
    this.midPeriod = 1500;
    this.far = buildLayer(26, 91, 60, 150, 120, 300, this.farPeriod);
    this.mid = buildLayer(22, 137, 80, 190, 160, 380, this.midPeriod);
    this.birds = [];
  }

  update(dt, speed) {
    this.t += dt;
    for (const c of this.clouds) {
      c.x -= (c.drift + speed * 0.012) * dt;
      if (c.x < -500) c.x += 3000;
    }
  }

  drawSky(ctx, vw, vh, camY) {
    const g = ctx.createLinearGradient(0, 0, 0, vh);
    g.addColorStop(0, PALETTE.skyTop);
    g.addColorStop(0.48, PALETTE.skyMid);
    g.addColorStop(0.82, PALETTE.skyLow);
    g.addColorStop(1, '#ffd9a6');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, vw, vh);

    const sx = vw * 0.76;
    const sy = vh * 0.2 - camY * 0.04;
    const halo = ctx.createRadialGradient(sx, sy, 10, sx, sy, 190);
    halo.addColorStop(0, 'rgba(255,246,216,0.95)');
    halo.addColorStop(0.45, 'rgba(255,240,200,0.35)');
    halo.addColorStop(1, 'rgba(255,240,200,0)');
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(sx, sy, 190, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = PALETTE.sun;
    ctx.beginPath();
    ctx.arc(sx, sy, 58, 0, Math.PI * 2);
    ctx.fill();
  }

  drawClouds(ctx, camX, camY, vw) {
    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,0.94)';
    for (const c of this.clouds) {
      const x = ((c.x - camX * 0.06) % 3000 + 3000) % 3000 - 300;
      if (x < -420 || x > vw + 420) continue;
      const y = c.y - camY * 0.05;
      ctx.beginPath();
      for (let i = 0; i < c.puffs; i++) {
        const px = x + i * 46 * c.s;
        const py = y + Math.sin(i * 1.7) * 8 * c.s;
        ctx.moveTo(px + 40 * c.s, py);
        ctx.arc(px, py, 40 * c.s, 0, Math.PI * 2);
      }
      ctx.fill();
    }
    ctx.restore();
  }

  drawCity(ctx, layer, period, camX, camY, vw, vh, color, parallax, alpha, offsetY) {
    const off = ((camX * parallax) % period + period) % period;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    for (let rep = -1; rep <= 2; rep++) {
      for (const b of layer) {
        const x = b.x - off + rep * period;
        if (x > vw + 60 || x + b.w < -60) continue;
        const top = vh - b.h - offsetY + camY * (0.06 * parallax);
        ctx.fillRect(x, top, b.w, b.h + 400);

        if (b.roof) {
          ctx.fillRect(x + b.w * 0.3, top - 26, 5, 26);
          ctx.fillRect(x + b.w * 0.65, top - 14, 4, 14);
        }
        if (parallax > 0.3) {
          ctx.save();
          ctx.fillStyle = 'rgba(255,255,255,0.22)';
          const rnd = seeded(b.seed + 7);
          const cols = Math.max(2, Math.floor(b.w / 34));
          const rows = Math.max(2, Math.floor(b.h / 40));
          for (let i = 0; i < cols; i++) {
            for (let j = 0; j < rows; j++) {
              if (rnd() > 0.62) continue;
              ctx.fillRect(x + 12 + i * 32, top + 16 + j * 38, 15, 20);
            }
          }
          ctx.restore();
        }
      }
    }
    ctx.restore();
  }

  draw(ctx, camX, camY, vw, vh, speed) {
    this.drawSky(ctx, vw, vh, camY);
    this.drawClouds(ctx, camX, camY, vw);
    this.drawCity(ctx, this.far, this.farPeriod, camX, camY, vw, vh, PALETTE.farCity, 0.16, 0.85, 60);
    this.drawCity(ctx, this.mid, this.midPeriod, camX, camY, vw, vh, PALETTE.midCity, 0.32, 0.95, 0);

    if (speed > 700) {
      ctx.save();
      ctx.strokeStyle = 'rgba(255,255,255,0.5)';
      ctx.lineWidth = 2;
      const r = seeded(Math.floor(this.t * 8));
      for (let i = 0; i < 7; i++) {
        const y = 60 + r() * (vh - 160);
        const x = r() * vw;
        const len = 60 + r() * 120;
        ctx.globalAlpha = 0.15 + (speed - 700) / 1600;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x - len, y);
        ctx.stroke();
      }
      ctx.restore();
    }
  }
}
