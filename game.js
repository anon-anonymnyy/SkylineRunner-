import { Scene } from './scene.js';
import { World } from './world.js';
import { Player } from './player.js';
import {
  VIRTUAL_H, BASE_Y, BASE_SPEED, MAX_SPEED, SPEED_PER_M, PX_PER_M, PALETTE,
} from './config.js';
import { sfx } from './audio.js';

export class Game {
  constructor(canvas, opts = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.opts = opts;

    this.scene = new Scene();
    this.world = new World();
    this.player = new Player();

    this.state = 'menu';
    this.camX = 0;
    this.camY = 0;
    this.speed = BASE_SPEED;
    this.distance = 0;
    this.coinsRun = 0;
    this.time = 0;
    this.particles = [];
    this.floats = [];
    this.shake = 0;
    this.deathId = 0;
    this.last = 0;
    this.acc = 0;
    this.combo = 0;
    this.comboTimer = 0;
    this.nearMiss = 0;

    this.resize();
    window.addEventListener('resize', () => this.resize());

    this.loop = this.loop.bind(this);
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.canvas.width = Math.floor(w * dpr);
    this.canvas.height = Math.floor(h * dpr);
    this.canvas.style.width = w + 'px';
    this.canvas.style.height = h + 'px';
    this.dpr = dpr;
    this.scale = h / VIRTUAL_H;
    this.vw = w / this.scale;
    this.vh = VIRTUAL_H;
    if (this.vw < 340) this.scale = w / 340, this.vw = 340, this.vh = h / this.scale;
    this.groundScreenY = this.vh * 0.68;
  }

  setSkin(skin) {
    this.player.setSkin(skin);
  }

  start() {
    this.world.reset();
    this.player.reset(120, BASE_Y);
    this.state = 'running';
    this.camX = 0;
    this.camY = BASE_Y - this.groundScreenY;
    this.lastGroundY = BASE_Y;
    this.speed = BASE_SPEED;
    this.distance = 0;
    this.coinsRun = 0;
    this.time = 0;
    this.particles.length = 0;
    this.floats.length = 0;
    this.shake = 0;
    this.combo = 0;
    this.comboTimer = 0;
    this.player.dead = false;
    this.world.generate(0, this.vw, 0);
    this.last = performance.now();
    this.player.fellOff = false;
  }

  pause() {
    if (this.state === 'running') this.state = 'paused';
  }

  resume() {
    if (this.state === 'paused') {
      this.state = 'running';
      this.last = performance.now();
    }
  }

  die() {
    if (this.state !== 'running') return;
    this.state = 'dead';
    this.deathId += 1;
    this.player.dead = true;
    this.player.vy = -520;
    this.shake = 12;
    sfx.hit();
    this.burst(this.player.x, this.player.y - 40, 18, '#f0785f');
    if (this.opts.onDeath) {
      this.opts.onDeath({
        distance: Math.floor(this.distance),
        coins: this.coinsRun,
        deathId: this.deathId,
      });
    }
  }

  jump() {
    if (this.state !== 'running') return;
    const r = this.player.jump();
    if (r === 'jump') {
      sfx.jump();
      this.burst(this.player.x, this.player.y, 6, '#ffffff');
    }
    if (r === 'double') {
      sfx.double();
      this.burst(this.player.x, this.player.y - 20, 10, '#ffffff');
    }
  }

  slide() {
    if (this.state !== 'running') return;
    if (this.player.slide()) {
      sfx.slide();
      this.burst(this.player.x - 10, this.player.y - 8, 7, '#ffffff');
    }
  }

  burst(x, y, n, color) {
    for (let i = 0; i < n; i++) {
      this.particles.push({
        x, y,
        vx: (Math.random() - 0.5) * 220,
        vy: -Math.random() * 200 - 20,
        life: 0.4 + Math.random() * 0.35,
        max: 0.75,
        r: 2 + Math.random() * 4,
        color,
      });
    }
  }

  float(x, y, text, color) {
    this.floats.push({ x, y, text, color, life: 0.9, max: 0.9 });
  }

  loop(now) {
    requestAnimationFrame(this.loop);
    const dt = Math.min((now - this.last) / 1000, 0.05);
    this.last = now;

    if (this.state === 'paused') {
      this.render();
      return;
    }

    this.time += dt;

    if (this.state === 'running') {
      this.speed = Math.min(MAX_SPEED, BASE_SPEED + this.distance * SPEED_PER_M);
      const dx = this.speed * dt;
      this.player.x += dx;
      this.distance += dx / PX_PER_M;

      const difficulty = Math.min(1, this.distance / 1800);
      this.world.generate(this.camX, this.vw, difficulty);
      this.player.update(dt, this.world, this.speed);

      if (this.player.fellOff) {
        this.player.fellOff = false;
        this.die();
      }

      this.checkCoins();
      this.checkObstacles();
      this.updateCombo(dt);
      this.scene.update(dt, this.speed);
      this.emitDust(dt);
    } else if (this.state === 'dead') {
      this.player.update(dt, this.world, 0);
      this.scene.update(dt, 0);
    } else {
      this.player.runPhase += dt * 6;
      this.scene.update(dt, 140);
    }

    this.updateParticles(dt);
    this.updateCamera(dt);
    this.render();
  }

  emitDust(dt) {
    if (!this.player.onGround) return;
    if (Math.random() > dt * 26) return;
    this.particles.push({
      x: this.player.x - 12,
      y: this.player.y - 2,
      vx: -60 - Math.random() * 80,
      vy: -Math.random() * 60,
      life: 0.3,
      max: 0.3,
      r: 2 + Math.random() * 3,
      color: 'rgba(255,255,255,0.75)',
    });
  }

  updateCombo(dt) {
    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) this.combo = 0;
    }
  }

  checkCoins() {
    const b = this.player.aabb();
    for (const c of this.world.coins) {
      if (c.got) continue;
      if (Math.abs(c.x - this.player.x) > 34) continue;
      if (c.y < b.y - 14 || c.y > b.y + b.h + 14) continue;
      c.got = true;
      this.coinsRun += 1;
      this.combo += 1;
      this.comboTimer = 1.6;
      sfx.coin(this.combo);
      this.float(c.x, c.y - 14, '+1', '#f7c948');
      this.burst(c.x, c.y, 5, '#f7c948');
      if (this.opts.onCoin) this.opts.onCoin(this.coinsRun);
    }
  }

  checkObstacles() {
    const b = this.player.aabb();
    for (const o of this.world.obstacles) {
      if (o.x + o.w < b.x - 40) continue;
      if (o.x > b.x + b.w + 40) break;

      const hitX = b.x < o.x + o.w && b.x + b.w > o.x;
      const hitY = b.y < o.y + o.h && b.y + b.h > o.y;
      if (hitX && hitY) {
        this.die();
        return;
      }
      const closeX = b.x < o.x + o.w + 16 && b.x + b.w > o.x - 16;
      if (closeX && !o.counted) {
        o.counted = true;
        this.nearMiss += 1;
        this.float(o.x + o.w / 2, o.y - 20, 'мимо!', '#5fbf9a');
      }
    }
  }

  updateParticles(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 700 * dt;
      if (p.life <= 0) this.particles.splice(i, 1);
    }
    for (let i = this.floats.length - 1; i >= 0; i--) {
      const f = this.floats[i];
      f.life -= dt;
      f.y -= 46 * dt;
      if (f.life <= 0) this.floats.splice(i, 1);
    }
    if (this.shake > 0) this.shake -= dt * 26;
  }

  updateCamera(dt) {
    const targetX = this.player.x - this.vw * 0.24;
    this.camX += (targetX - this.camX) * Math.min(1, dt * 12);

    if (this.player.onGround) this.lastGroundY = this.player.y;

    const desired = this.lastGroundY - this.groundScreenY;
    this.camY += (desired - this.camY) * Math.min(1, dt * 4.5);
  }

  render() {
    const ctx = this.ctx;
    const { scale, dpr } = this;

    ctx.setTransform(dpr * scale, 0, 0, dpr * scale, 0, 0);

    let sx = 0;
    let sy = 0;
    if (this.shake > 0) {
      sx = (Math.random() - 0.5) * this.shake;
      sy = (Math.random() - 0.5) * this.shake;
    }
    ctx.translate(sx, sy);

    this.scene.draw(ctx, this.camX, this.camY, this.vw, this.vh, this.speed);

    this.world.drawPlatforms(ctx, this.camX, this.camY, this.vw, this.vh);
    this.world.drawDecor(ctx, this.camX, this.camY);
    this.world.drawObstacles(ctx, this.camX, this.camY);
    this.world.drawCoins(ctx, this.camX, this.camY, this.time);

    this.drawParticles(ctx);
    this.player.draw(ctx, this.camX, this.camY, this.time);
    this.drawFloats(ctx);

    if (this.combo > 1) this.drawCombo(ctx);
  }

  drawParticles(ctx) {
    for (const p of this.particles) {
      const a = Math.max(0, p.life / p.max);
      ctx.globalAlpha = a;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x - this.camX, p.y - this.camY, p.r * a + 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  drawFloats(ctx) {
    ctx.textAlign = 'center';
    for (const f of this.floats) {
      const a = Math.max(0, f.life / f.max);
      ctx.globalAlpha = a;
      ctx.fillStyle = f.color;
      ctx.font = '700 22px -apple-system, system-ui, sans-serif';
      ctx.fillText(f.text, f.x - this.camX, f.y - this.camY);
    }
    ctx.globalAlpha = 1;
  }

  drawCombo(ctx) {
    const a = Math.min(1, this.comboTimer * 2);
    ctx.save();
    ctx.globalAlpha = a;
    ctx.textAlign = 'center';
    ctx.fillStyle = PALETTE.coin;
    ctx.font = '900 34px -apple-system, system-ui, sans-serif';
    ctx.fillText(`×${this.combo}`, this.vw * 0.5, 120);
    ctx.font = '700 13px -apple-system, system-ui, sans-serif';
    ctx.fillStyle = '#20304a';
    ctx.fillText('СЕРИЯ', this.vw * 0.5, 140);
    ctx.restore();
  }
}
