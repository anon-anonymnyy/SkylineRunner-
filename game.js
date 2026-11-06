import * as THREE from 'three';
import { World } from './world.js';
import { Player } from './player.js';
import { START_SPEED, MAX_SPEED, SPEED_GROWTH, COIN_VALUE, PALETTE } from './config.js';
import { sfx } from './audio.js';

export class Game {
  constructor(canvas, opts = {}) {
    this.opts = opts;

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    this.renderer.setSize(window.innerWidth, window.innerHeight, false);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(PALETTE.fog, 80, 260);

    this.camera = new THREE.PerspectiveCamera(64, window.innerWidth / window.innerHeight, 0.1, 400);
    this.camera.position.set(0, 5.4, 9.5);
    this.camera.lookAt(0, 2.2, -6);

    this.buildSky();

    this.world = new World(this.scene);
    this.player = new Player(this.scene);

    this.state = 'menu';
    this.speed = START_SPEED;
    this.distance = 0;
    this.coinsRun = 0;
    this.invuln = 0;
    this.shake = 0;
    this.deathId = 0;
    this.ringPool = [];
    this.activeRings = [];

    this.clock = new THREE.Clock();
    this.onFrame = this.onFrame.bind(this);

    window.addEventListener('resize', () => this.resize());
  }

  buildSky() {
    const mat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      uniforms: {
        top: { value: new THREE.Color(PALETTE.skyTop) },
        mid: { value: new THREE.Color(PALETTE.skyMid) },
        bottom: { value: new THREE.Color(PALETTE.skyHorizon) },
      },
      vertexShader: `
        varying vec3 vPos;
        void main() {
          vPos = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 top; uniform vec3 mid; uniform vec3 bottom;
        varying vec3 vPos;
        void main() {
          float h = normalize(vPos).y;
          vec3 col = mix(bottom, mid, smoothstep(-0.05, 0.22, h));
          col = mix(col, top, smoothstep(0.2, 0.8, h));
          gl_FragColor = vec4(col, 1.0);
        }
      `,
    });
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(300, 32, 16), mat);
    this.scene.add(this.sky);

    this.sun = new THREE.Mesh(
      new THREE.CircleGeometry(20, 48),
      new THREE.MeshBasicMaterial({ color: 0xfff6d8, fog: false })
    );
    this.sun.position.set(-70, 60, -230);
    this.scene.add(this.sun);

    const cloudMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, flatShading: false });
    for (let i = 0; i < 9; i++) {
      const cloud = new THREE.Group();
      for (let k = 0; k < 4; k++) {
        const puff = new THREE.Mesh(new THREE.SphereGeometry(4 + Math.random() * 3, 12, 10), cloudMat);
        puff.position.set(k * 5 - 7, Math.random() * 2, Math.random() * 3);
        cloud.add(puff);
      }
      cloud.position.set((Math.random() - 0.5) * 220, 34 + Math.random() * 16, -90 - Math.random() * 140);
      this.scene.add(cloud);
    }
  }

  resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    this.renderer.setSize(w, h, false);
  }

  applySkin(skin) {
    this.player.applySkin(skin);
  }

  start() {
    this.world.reset();
    this.player.reset();
    this.speed = START_SPEED;
    this.distance = 0;
    this.coinsRun = 0;
    this.invuln = 0.6;
    this.shake = 0;
    this.state = 'running';
    this.clock.getDelta();
    this.world.populate(0);
  }

  revive() {
    this.player.reset();
    this.invuln = 2.2;
    this.state = 'running';
    for (const o of this.world.obstacles) {
      if (o.z > -26) {
        o.z -= 40;
        o.mesh.position.z = o.z;
      }
    }
  }

  pause() {
    if (this.state === 'running') this.state = 'paused';
  }

  resume() {
    if (this.state === 'paused') {
      this.state = 'running';
      this.clock.getDelta();
    }
  }

  onFrame() {
    requestAnimationFrame(this.onFrame);
    if (this.state === 'paused') {
      this.render();
      return;
    }

    const dt = Math.min(this.clock.getDelta(), 0.05);

    if (this.state === 'running') {
      const difficulty = Math.min(1, this.distance / 1600);
      this.speed = Math.min(MAX_SPEED, START_SPEED + this.distance * SPEED_GROWTH);
      this.distance += this.speed * dt;
      this.world.update(dt, this.speed, difficulty);
      this.player.update(dt, this.speed);

      if (this.invuln > 0) this.invuln -= dt;
      if (this.player.consumeLanded()) sfx.land();

      this.checkCoins();
      if (this.invuln <= 0) this.checkCollision();
      this.animateSky();
    } else if (this.state === 'dead') {
      this.player.update(dt, 0);
    } else {
      this.speed = 16;
      this.world.update(dt, this.speed, 0);
      this.player.update(dt, this.speed);
      this.animateSky();
    }

    this.updateCamera(dt);
    this.render();
  }

  animateSky() {
    this.sky.position.copy(this.camera.position);
    this.sun.lookAt(this.camera.position);
  }

  updateCamera(dt) {
    this.camera.position.x += (this.player.x * 0.55 - this.camera.position.x) * Math.min(1, dt * 5);
    this.camera.position.y += (5.4 + this.player.y * 0.42 - this.camera.position.y) * Math.min(1, dt * 5);
    this.camera.position.z = 9.5;

    if (this.shake > 0) {
      this.shake -= dt * 2.2;
      const s = Math.max(0, this.shake) * 0.6;
      this.camera.position.x += (Math.random() - 0.5) * s;
      this.camera.position.y += (Math.random() - 0.5) * s;
    }

    this.camera.lookAt(this.player.x * 0.45, 2.4 + this.player.y * 0.35, -8);
    this.camera.fov = 64 + Math.min(12, (this.speed - START_SPEED) * 0.9);
    this.camera.updateProjectionMatrix();
  }

  checkCoins() {
    const p = this.player;
    const pyTop = p.y + p.height;

    for (let i = this.world.coins.length - 1; i >= 0; i--) {
      const c = this.world.coins[i];
      if (!c.active) continue;
      if (Math.abs(c.z) > 1.5) continue;
      if (Math.abs(c.mesh.position.x - p.x) > 1.9) continue;
      if (c.y < p.y - 0.9 || c.y > pyTop + 0.9) continue;
      const pos = c.mesh.position.clone();
      this.world.releaseCoin(c);
      this.world.coins.splice(i, 1);
      this.coinsRun += COIN_VALUE;
      sfx.coin();
      this.popCoin(pos);
      if (this.opts.onCoin) this.opts.onCoin(this.coinsRun);
    }
  }

  popCoin(pos) {
    let r = this.ringPool.pop();
    if (!r) {
      r = new THREE.Mesh(
        new THREE.RingGeometry(0.25, 0.4, 16),
        new THREE.MeshBasicMaterial({ color: 0xffd45a, transparent: true, side: THREE.DoubleSide, depthWrite: false })
      );
      this.scene.add(r);
    }
    r.position.copy(pos);
    r.visible = true;
    r.userData.life = 0.35;
    r.userData.max = 0.35;
    this.activeRings.push(r);
  }

  updateRings(dt) {
    for (let i = this.activeRings.length - 1; i >= 0; i--) {
      const r = this.activeRings[i];
      r.userData.life -= dt;
      const k = 1 - r.userData.life / r.userData.max;
      r.scale.setScalar(1 + k * 3);
      r.material.opacity = Math.max(0, 1 - k);
      r.lookAt(this.camera.position);
      if (r.userData.life <= 0) {
        r.visible = false;
        this.ringPool.push(r);
        this.activeRings.splice(i, 1);
      }
    }
  }

  checkCollision() {
    const p = this.player;
    const halfW = 0.52;
    const pyBase = p.y + 0.06;
    const pyTop = p.y + p.height;

    for (const o of this.world.obstacles) {
      if (!o.active) continue;
      if (Math.abs(o.z) > o.d / 2 + 0.55) continue;
      if (Math.abs(o.mesh.position.x - p.x) > o.w / 2 + halfW) continue;

      const oBot = o.y - o.h / 2;
      const oTop = o.y + o.h / 2;
      if (pyTop < oBot || pyBase > oTop) continue;

      this.die();
      return;
    }
  }

  die() {
    if (this.state !== 'running') return;
    this.state = 'dead';
    this.deathId += 1;
    this.player.dead = true;
    this.shake = 1.2;
    sfx.hit();
    if (this.opts.onDeath) {
      this.opts.onDeath({
        distance: Math.floor(this.distance),
        coins: this.coinsRun,
        deathId: this.deathId,
      });
    }
  }

  render() {
    this.updateRings(1 / 60);
    this.renderer.render(this.scene, this.camera);
  }

  moveLane(dir) {
    if (this.state !== 'running') return;
    if (this.player.moveLane(dir)) sfx.ui();
  }

  jump() {
    if (this.state !== 'running') return;
    if (this.player.jump()) sfx.jump();
  }

  slide() {
    if (this.state !== 'running') return;
    if (this.player.slide()) sfx.slide();
  }

  grappleStart() {
    if (this.state !== 'running') return;
    if (this.player.startGrapple()) sfx.grapple();
  }

  grappleEnd() {
    if (this.state !== 'running') return;
    this.player.releaseGrapple(true);
  }
}
