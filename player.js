import { GRAVITY, JUMP_V, PW, PH, PH_SLIDE, SLIDE_TIME } from './config.js';

const SKIN_DEFAULT = { suit: '#3fb3d8', trim: '#f0785f', legs: '#20304a' };

function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.max(0, Math.min(255, ((n >> 16) & 255) + amt));
  const g = Math.max(0, Math.min(255, ((n >> 8) & 255) + amt));
  const b = Math.max(0, Math.min(255, (n & 255) + amt));
  return `rgb(${r},${g},${b})`;
}

export class Player {
  constructor() {
    this.skin = SKIN_DEFAULT;
    this.reset(0, 0);
  }

  reset(x, y) {
    this.x = x;
    this.y = y;
    this.vy = 0;
    this.w = PW;
    this.h = PH;
    this.onGround = true;
    this.lastGround = y;
    this.jumps = 0;
    this.sliding = 0;
    this.runPhase = 0;
    this.rot = 0;
    this.dead = false;
    this.stumble = 0;
    this.airborne = 0;
    this.prevY = y;
    this.fellOff = false;
    this.landed = false;
    this.squash = 0;
  }

  setSkin(skin) {
    this.skin = skin || SKIN_DEFAULT;
  }

  get curH() {
    return this.sliding > 0 ? PH_SLIDE : PH;
  }

  jump() {
    if (this.dead) return null;
    if (this.sliding > 0) this.sliding = 0;
    if (this.onGround) {
      this.vy = JUMP_V;
      this.onGround = false;
      this.jumps = 1;
      this.squash = 0.35;
      return 'jump';
    }
    if (this.jumps < 2) {
      this.vy = JUMP_V * 0.85;
      this.jumps = 2;
      this.squash = 0.3;
      return 'double';
    }
    return null;
  }

  slide() {
    if (this.dead) return false;
    this.sliding = SLIDE_TIME;
    this.squash = 0.4;
    if (!this.onGround) this.vy = Math.max(this.vy, 700);
    return true;
  }

  update(dt, world, speed) {
    if (this.dead) {
      this.vy += GRAVITY * dt;
      this.y += this.vy * dt;
      this.rot += dt * 7;
      return;
    }

    this.prevY = this.y;

    if (this.sliding > 0) {
      this.sliding -= dt;
      if (this.sliding < 0) this.sliding = 0;
    }

    this.vy += GRAVITY * dt;
    this.y += this.vy * dt;

    let ground = world.groundAt(this.x, this.prevY, this.y, this.vy);

    if (ground === null && this.vy >= 0) {
      const pl = world.platformAt(this.x);
      if (pl) {
        const step = this.prevY - pl.y;
        if (step > 0 && step <= 70) ground = pl.y;
      }
    }

    if (ground !== null) {
      if (!this.onGround && this.vy > 300) this.landed = true;
      this.y = ground;
      this.vy = 0;
      this.onGround = true;
      this.jumps = 0;
      this.airborne = 0;
      this.lastGround = ground;
    } else {
      this.onGround = false;
      this.airborne += dt;
      if (this.y > this.lastGround + 620 || this.y > 2600) this.fellOff = true;
    }

    if (this.onGround) this.runPhase += dt * (speed / 200) * 6;
    if (this.squash > 0) this.squash = Math.max(0, this.squash - dt * 3);
    if (this.stumble > 0) this.stumble -= dt;
  }

  aabb() {
    return {
      x: this.x - this.w / 2 + 5,
      y: this.y - this.curH,
      w: this.w - 10,
      h: this.curH,
    };
  }

  draw(ctx, camX, camY, time) {
    const s = this.skin;
    ctx.save();
    ctx.translate(this.x - camX, this.y - camY);

    if (this.dead) ctx.rotate(this.rot);

    const sliding = this.sliding > 0;
    const swing = Math.sin(this.runPhase);
    const bob = this.onGround ? Math.abs(Math.sin(this.runPhase)) * 2 : 0;
    const sq = this.squash;

    ctx.fillStyle = 'rgba(40,60,90,0.16)';
    ctx.beginPath();
    ctx.ellipse(2, 2, 24 - sq * 6, 6.5, 0, 0, Math.PI * 2);
    ctx.fill();

    if (sliding) {
      this.drawSliding(ctx, s, sq);
      ctx.restore();
      return;
    }

    ctx.translate(0, -bob);

    const legs = s.legs;
    ctx.fillStyle = legs;
    ctx.strokeStyle = shade(legs, -25);
    ctx.lineWidth = 2;

    if (this.onGround) {
      const l1 = swing * 13;
      const l2 = -swing * 13;
      this.roundRect(ctx, -14 + l1 * 0.5, -26, 13, 27, 6);
      this.roundRect(ctx, 1 + l2 * 0.5, -26, 13, 27, 6);
    } else {
      this.roundRect(ctx, -15, -28, 13, 25, 6);
      this.roundRect(ctx, 3, -24, 13, 21, 6);
    }

    const bodyX = -17;
    const bodyY = -78 - sq * 3;
    const bodyW = 34;
    const bodyH = 56 * (1 - sq * 0.12);

    const grad = ctx.createLinearGradient(bodyX, bodyY, bodyX + bodyW, bodyY + bodyH);
    grad.addColorStop(0, shade(s.suit, 22));
    grad.addColorStop(0.55, s.suit);
    grad.addColorStop(1, shade(s.suit, -28));
    ctx.fillStyle = grad;
    ctx.strokeStyle = shade(s.suit, -55);
    ctx.lineWidth = 2.5;
    this.roundRect(ctx, bodyX, bodyY, bodyW, bodyH, 15);

    const stripe = ctx.createLinearGradient(bodyX, 0, bodyX + bodyW, 0);
    stripe.addColorStop(0, shade(s.trim, -12));
    stripe.addColorStop(0.5, s.trim);
    stripe.addColorStop(1, shade(s.trim, -20));
    ctx.fillStyle = stripe;
    ctx.beginPath();
    ctx.roundRect(bodyX - 1, bodyY + bodyH * 0.52, bodyW + 2, 8, 3);
    ctx.fill();

    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    ctx.beginPath();
    ctx.ellipse(bodyX + 9, bodyY + 16, 5, 11, -0.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = shade(s.suit, -45);
    ctx.strokeStyle = shade(s.suit, -55);
    ctx.lineWidth = 2.5;
    if (this.onGround) {
      this.roundRect(ctx, bodyX - 8, bodyY + 14 + swing * 7, 9, 26, 5);
      this.roundRect(ctx, bodyX + bodyW - 1, bodyY + 14 - swing * 7, 9, 26, 5);
    } else {
      this.roundRect(ctx, bodyX - 9, bodyY + 6, 9, 24, 5);
      this.roundRect(ctx, bodyX + bodyW, bodyY + 6, 9, 24, 5);
    }

    const headY = bodyY - 15;
    const headGrad = ctx.createRadialGradient(-3, headY - 5, 2, 0, headY, 20);
    headGrad.addColorStop(0, shade(s.suit, 30));
    headGrad.addColorStop(1, shade(s.suit, -18));
    ctx.fillStyle = headGrad;
    ctx.strokeStyle = shade(s.suit, -55);
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, headY, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    const visorGrad = ctx.createLinearGradient(-11, headY - 6, 11, headY + 6);
    visorGrad.addColorStop(0, shade(s.trim, 15));
    visorGrad.addColorStop(1, shade(s.trim, -25));
    ctx.fillStyle = visorGrad;
    ctx.beginPath();
    ctx.roundRect(-11, headY - 6, 22, 10, 4);
    ctx.fill();

    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.beginPath();
    ctx.roundRect(-8, headY - 5, 7, 3, 1.5);
    ctx.fill();

    if (this.stumble > 0) {
      ctx.fillStyle = 'rgba(255,80,60,0.35)';
      ctx.beginPath();
      ctx.arc(0, bodyY + 20, 30, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  drawSliding(ctx, s, sq) {
    ctx.save();
    ctx.translate(0, -6);
    ctx.rotate(-0.12);

    ctx.fillStyle = s.legs;
    ctx.strokeStyle = shade(s.legs, -25);
    ctx.lineWidth = 2;
    this.roundRect(ctx, 4, -18, 26, 13, 6);

    const bodyX = -20;
    const bodyY = -46;
    const grad = ctx.createLinearGradient(bodyX, bodyY, bodyX + 40, bodyY + 30);
    grad.addColorStop(0, shade(s.suit, 22));
    grad.addColorStop(0.55, s.suit);
    grad.addColorStop(1, shade(s.suit, -28));
    ctx.fillStyle = grad;
    ctx.strokeStyle = shade(s.suit, -55);
    ctx.lineWidth = 2.5;
    this.roundRect(ctx, bodyX, bodyY, 40, 30, 12);

    const stripe = ctx.createLinearGradient(0, bodyY, 0, bodyY + 30);
    stripe.addColorStop(0, shade(s.trim, 10));
    stripe.addColorStop(1, shade(s.trim, -20));
    ctx.fillStyle = stripe;
    ctx.beginPath();
    ctx.roundRect(bodyX + 4, bodyY + 18, 32, 7, 3);
    ctx.fill();

    ctx.fillStyle = shade(s.suit, -20);
    ctx.strokeStyle = shade(s.suit, -55);
    ctx.lineWidth = 2.5;
    this.roundRect(ctx, bodyX - 9, bodyY + 4, 9, 20, 4);

    const headY = bodyY - 10;
    const headGrad = ctx.createRadialGradient(-16, headY - 4, 2, -13, headY, 17);
    headGrad.addColorStop(0, shade(s.suit, 30));
    headGrad.addColorStop(1, shade(s.suit, -18));
    ctx.fillStyle = headGrad;
    ctx.strokeStyle = shade(s.suit, -55);
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(-13, headY, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = s.trim;
    ctx.beginPath();
    ctx.roundRect(-22, headY - 5, 19, 9, 4);
    ctx.fill();

    ctx.restore();
  }

  roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
    ctx.fill();
    if (ctx.strokeStyle) ctx.stroke();
  }
}
