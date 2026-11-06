import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

import { World } from './world.js';
import { Player } from './player.js';
import { START_SPEED, MAX_SPEED, SPEED_GROWTH, COIN_VALUE } from './config.js';
import { sfx } from './audio.js';

export class Game {
  constructor(canvas, opts = {}) {
    this.canvas = canvas;
    this.opts = opts;

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      powerPreference: 'high-performance',
      stencil: false,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    this.renderer.setSize(window.innerWidth, window.innerHeight, false);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(0x1a0f33, 75, 230);

    this.camera = new THREE.PerspectiveCamera(64, window.innerWidth / window.innerHeight, 0.1, 400);
    this.camera.position.set(0, 5.4, 9.5);
    this.camera.lookAt(0, 2.2, -6);

    this.buildSky();

    this.world = new World(this.scene);
    this.player = new Player(this.scene);

    this.setupPost();

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
      uniforms: {
        top: { value: new THREE.Color(0x1b0b3a) },
        mid: { value: new THREE.Color(0x5b1e7a) },
        bottom: { value: new THREE.Color(0xff6a3d) },
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
          vec3 col = mix(bottom, mid, smoothstep(-0.15, 0.28, h));
          col = mix(col, top, smoothstep(0.22, 0.85, h));
          gl_FragColor = vec4(col, 1.0);
        }
      `,
    });
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(300, 32, 16), mat);
    this.scene.add(this.sky);

    this.sun = new THREE.Mesh(
      new THREE.CircleGeometry(26, 48),
      new THREE.MeshBasicMaterial({ color: 0xffd166, transparent: true, opacity: 0.85 })
    );
    this.sun.position.set(-70, 24, -210);
    this.scene.add(this.sun);

    for (let i = 0; i < 3; i++) {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(20 + i * 9, 0.35, 6, 64),
        new THREE.MeshBasicMaterial({ color: i % 2 ? 0x22e6ff : 0xff2fb4, transparent: true, opacity: 0.35 })
      );
      ring.position.set(60 + i * 10, 40 + i * 8, -230 - i * 20);
      ring.rotation.z = 0.4;
      this.scene.add(ring);
    }
  }

  setupPost() {
    this.composer = null;
    if (this.opts.bloom === false) return;
    try {
      this.composer = new EffectComposer(this.renderer);
      this.composer.setSize(window.innerWidth, window.innerHeight);
      this.composer.addPass(new RenderPass(this.scene, this.camera));
      this.composer.addPass(new UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight),
        0.72,
        0.85,
        0.62
      ));
      this.composer.addPass(new OutputPass());
    } catch (e) {
      this.composer = null;
    }
  }

  resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    this.renderer.setSize(w, h, false);
    if (this.composer) this.composer.setSize(w, h);
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
    const t = performance.now() * 0.001;
    this.sun.position.y = 24 + Math.sin(t * 0.3) * 1.5;
    this.sky.position.copy(this.camera.position);
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
        new THREE.MeshBasicMaterial({ color: 0xffd400, transparent: true, side: THREE.DoubleSide })
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
    if (this.composer) {
      this.composer.render();
    } else {
      this.renderer.render(this.scene, this.camera);
    }
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
