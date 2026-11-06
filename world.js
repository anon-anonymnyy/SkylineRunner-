import { PALETTE, BASE_Y, VIRTUAL_H } from './config.js';

function rand(a, b) {
  return a + Math.random() * (b - a);
}
function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export class World {
  constructor() {
    this.reset();
  }

  reset() {
    this.platforms = [];
    this.obstacles = [];
    this.coins = [];
    this.decor = [];
    this.startX = -900;

    this.platforms.push({ x0: this.startX, x1: this.startX + 2100, y: BASE_Y, seed: 11 });
    this.buildDecor(this.platforms[0]);
  }

  groundAt(x, prevY, y, vy) {
    let best = null;
    for (const p of this.platforms) {
      if (x < p.x0 || x > p.x1) continue;
      if (vy < 0) continue;
      if (y >= p.y - 1 && prevY <= p.y + 22) {
        if (best === null || p.y < best) best = p.y;
      }
    }
    return best;
  }

  platformAt(x) {
    for (const p of this.platforms) {
      if (x >= p.x0 && x <= p.x1) return p;
    }
    return null;
  }

  generate(camX, vw, difficulty) {
    const limit = camX + vw + 1400;
    let last = this.platforms[this.platforms.length - 1];

    while (last.x1 < limit) {
      const gap = rand(105, 185 + difficulty * 120);
      const w = rand(620, 1200);
      let y = last.y + pick([-58, 0, 0, 0, 58]);
      y = Math.max(BASE_Y - 150, Math.min(BASE_Y + 70, y));

      const p = {
        x0: last.x1 + gap,
        x1: last.x1 + gap + w,
        y,
        seed: Math.floor(Math.random() * 99999),
      };
      this.platforms.push(p);
      this.buildObstacles(p, difficulty);
      this.buildCoins(p, last, difficulty);
      this.buildDecor(p);
      last = p;
    }

    const cut = camX - 900;
    this.platforms = this.platforms.filter((p) => p.x1 > cut);
    this.obstacles = this.obstacles.filter((o) => o.x + o.w > cut);
    this.coins = this.coins.filter((c) => c.x > cut && !c.got);
    this.decor = this.decor.filter((d) => d.x + d.w > cut);
  }

  buildObstacles(p, difficulty) {
    const spanMin = p.x0 + 240;
    const spanMax = p.x1 - 200;
    if (spanMax - spanMin < 320) return;

    let x = spanMin + rand(0, 120);
    const spacing = 560 - difficulty * 140;
    let lastEnd = -9999;

    while (x < spanMax) {
      // два препятствия ближе, чем позволяет прыжок, — непроходимо
      if (x - lastEnd < 300) { x += 300 - (x - lastEnd); continue; }

      const r = Math.random();
      let o;
      if (r < 0.34) {
        const h = rand(44, 58);
        o = { type: 'hurdle', x, y: p.y - h, w: rand(42, 58), h };
      } else if (r < 0.62) {
        o = { type: 'pipe', x, y: p.y - 96, w: rand(78, 130), h: 32 };
      } else if (r < 0.86) {
        const h = rand(68, 92);
        o = { type: 'barrier', x, y: p.y - h, w: rand(58, 86), h };
      } else {
        const h = rand(92, 112);
        o = { type: 'stack', x, y: p.y - h, w: rand(64, 92), h };
      }
      this.obstacles.push(o);
      lastEnd = o.x + o.w;
      x = lastEnd + spacing + rand(60, 200);
    }
  }

  buildCoins(p, prev, difficulty) {
    if (Math.random() < 0.45) {
      const gapMid = (prev.x1 + p.x0) / 2;
      const n = 5;
      for (let i = 0; i < n; i++) {
        const t = i / (n - 1);
        const cx = gapMid + (t - 0.5) * (p.x0 - prev.x1 + 120);
        const cy = p.y - 110 - Math.sin(t * Math.PI) * 78;
        this.coins.push({ x: cx, y: cy, got: false, phase: Math.random() * 6 });
      }
    }

    const count = Math.floor(rand(2, 5));
    for (let i = 0; i < count; i++) {
      const cx = rand(p.x0 + 200, p.x1 - 120);
      const cy = p.y - rand(50, 150);
      this.coins.push({ x: cx, y: cy, got: false, phase: Math.random() * 6 });
    }
  }

  buildDecor(p) {
    const n = Math.floor(rand(1, 3));
    for (let i = 0; i < n; i++) {
      const kind = pick(['ac', 'vent', 'tank', 'antenna']);
      const w = kind === 'tank' ? 74 : kind === 'antenna' ? 10 : 54;
      const h = kind === 'tank' ? 84 : kind === 'antenna' ? 92 : 42;
      this.decor.push({
        kind,
        x: rand(p.x0 + 120, p.x1 - 140),
        y: p.y - h,
        w,
        h,
      });
    }
  }

  drawPlatforms(ctx, camX, camY, vw, vh) {
    for (const p of this.platforms) {
      const sx = p.x0 - camX;
      const ex = p.x1 - camX;
      if (ex < -40 || sx > vw + 40) continue;
      const sy = p.y - camY;
      const w = ex - sx;

      const bodyH = vh + 300 - sy;
      const g = ctx.createLinearGradient(0, sy, 0, sy + bodyH);
      g.addColorStop(0, PALETTE.concrete);
      g.addColorStop(0.7, PALETTE.concreteDark);
      g.addColorStop(1, '#bfb7a4');
      ctx.fillStyle = g;
      ctx.fillRect(sx, sy, w, bodyH);

      ctx.fillStyle = PALETTE.roofBand;
      ctx.fillRect(sx, sy, w, 12);

      ctx.strokeStyle = PALETTE.roofEdge;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(sx, sy + 2);
      ctx.lineTo(ex, sy + 2);
      ctx.stroke();

      ctx.fillStyle = 'rgba(32,48,74,0.08)';
      ctx.fillRect(sx, sy + 12, w, 6);

      const rnd = (() => {
        let s = p.seed;
        return () => {
          s = (s * 16807) % 2147483647;
          return (s - 1) / 2147483646;
        };
      })();

      const cols = Math.floor(w / 62);
      const rows = Math.floor(bodyH / 78);
      for (let i = 0; i < cols; i++) {
        for (let j = 1; j < rows; j++) {
          if (rnd() > 0.55) continue;
          const wx = sx + 22 + i * 62;
          const wy = sy + 40 + j * 78;
          ctx.fillStyle = PALETTE.windowFrame;
          ctx.fillRect(wx - 3, wy - 3, 40, 48);
          ctx.fillStyle = rnd() > 0.75 ? '#8fb8d4' : PALETTE.window;
          ctx.fillRect(wx, wy, 34, 42);
          ctx.fillStyle = 'rgba(255,255,255,0.5)';
          ctx.fillRect(wx + 4, wy + 4, 10, 8);
        }
      }

      ctx.fillStyle = 'rgba(32,48,74,0.10)';
      ctx.fillRect(sx, sy + bodyH - 90, w, 90);
    }
  }

  drawDecor(ctx, camX, camY) {
    for (const d of this.decor) {
      const x = d.x - camX;
      const y = d.y - camY;
      ctx.save();
      ctx.strokeStyle = PALETTE.ink;
      ctx.lineWidth = 2.5;
      ctx.lineJoin = 'round';

      if (d.kind === 'ac') {
        ctx.fillStyle = '#cfd8dd';
        ctx.beginPath();
        ctx.roundRect(x, y, d.w, d.h, 5);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = 'rgba(32,48,74,0.25)';
        ctx.beginPath();
        ctx.arc(x + d.w * 0.5, y + d.h * 0.5, d.h * 0.3, 0, Math.PI * 2);
        ctx.fill();
      } else if (d.kind === 'vent') {
        ctx.fillStyle = '#dbe1e4';
        ctx.beginPath();
        ctx.roundRect(x, y, d.w, d.h, 4);
        ctx.fill();
        ctx.stroke();
        ctx.strokeStyle = 'rgba(32,48,74,0.3)';
        for (let i = 1; i < 4; i++) {
          ctx.beginPath();
          ctx.moveTo(x + 6, y + i * 10);
          ctx.lineTo(x + d.w - 6, y + i * 10);
          ctx.stroke();
        }
      } else if (d.kind === 'tank') {
        ctx.strokeStyle = '#6b5a45';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(x + 8, y + d.h);
        ctx.lineTo(x + 8, y + 30);
        ctx.moveTo(x + d.w - 8, y + d.h);
        ctx.lineTo(x + d.w - 8, y + 30);
        ctx.stroke();
        ctx.fillStyle = '#b98d5f';
        ctx.strokeStyle = PALETTE.ink;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.roundRect(x, y, d.w, 42, 8);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#8d6743';
        ctx.beginPath();
        ctx.moveTo(x - 4, y);
        ctx.lineTo(x + d.w / 2, y - 16);
        ctx.lineTo(x + d.w + 4, y);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else {
        ctx.strokeStyle = '#7b8794';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(x, y + d.h);
        ctx.lineTo(x, y + 10);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x - 12, y + 22);
        ctx.lineTo(x + 12, y + 22);
        ctx.moveTo(x - 8, y + 12);
        ctx.lineTo(x + 8, y + 12);
        ctx.stroke();
        ctx.fillStyle = '#e05a44';
        ctx.beginPath();
        ctx.arc(x, y + 6, 4, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  drawCoins(ctx, camX, camY, time) {
    for (const c of this.coins) {
      if (c.got) continue;
      const x = c.x - camX;
      const y = c.y - camY;
      const spin = Math.abs(Math.cos(time * 3 + c.phase));
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(0.35 + spin * 0.65, 1);
      ctx.strokeStyle = PALETTE.coinDark;
      ctx.fillStyle = PALETTE.coin;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.beginPath();
      ctx.ellipse(-4, -4, 4, 6, -0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  drawObstacles(ctx, camX, camY) {
    for (const o of this.obstacles) {
      const x = o.x - camX;
      const y = o.y - camY;
      ctx.save();
      ctx.lineJoin = 'round';

      if (o.type === 'pipe') {
        ctx.fillStyle = '#9aa7b2';
        ctx.strokeStyle = PALETTE.ink;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.roundRect(x, y, o.w, o.h, o.h / 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,0.45)';
        ctx.fillRect(x + 10, y + 6, o.w - 20, 6);
        ctx.fillStyle = '#7c8894';
        ctx.fillRect(x - 2, y - 6, 12, o.h + 12);
        ctx.fillRect(x + o.w - 10, y - 6, 12, o.h + 12);
      } else if (o.type === 'barrier' || o.type === 'hurdle') {
        ctx.fillStyle = PALETTE.hazardLight;
        ctx.strokeStyle = PALETTE.ink;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.roundRect(x, y, o.w, o.h, 4);
        ctx.fill();
        ctx.stroke();
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(x, y, o.w, o.h, 4);
        ctx.clip();
        ctx.strokeStyle = PALETTE.hazard;
        ctx.lineWidth = 10;
        for (let i = -o.h; i < o.w + o.h; i += 22) {
          ctx.beginPath();
          ctx.moveTo(x + i, y + o.h);
          ctx.lineTo(x + i + o.h, y);
          ctx.stroke();
        }
        ctx.restore();
        ctx.strokeStyle = PALETTE.ink;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.roundRect(x, y, o.w, o.h, 4);
        ctx.stroke();
      } else {
        ctx.fillStyle = '#c3ccd4';
        ctx.strokeStyle = PALETTE.ink;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.roundRect(x, y, o.w, o.h, 4);
        ctx.fill();
        ctx.stroke();
        ctx.strokeStyle = 'rgba(32,48,74,0.35)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x + 6, y + o.h - 12);
        ctx.lineTo(x + o.w - 6, y + o.h - 12);
        ctx.stroke();
      }
      ctx.restore();
    }
  }
}
