import * as THREE from 'three';
import { suitTexture } from './textures.js';
import {
  LANE_X, LANE_SWITCH_SPEED, GRAVITY, JUMP_V, DOUBLE_JUMP_V,
  PLAYER_H, PLAYER_H_SLIDE, SLIDE_TIME, GRAPPLE_HEIGHT,
} from './config.js';

export class Player {
  constructor(scene) {
    this.root = new THREE.Group();
    this.body = new THREE.Group();
    this.root.add(this.body);
    scene.add(this.root);

    this.lane = 1;
    this.x = 0;
    this.y = 0;
    this.vy = 0;
    this.grounded = true;
    this.jumps = 0;
    this.sliding = 0;
    this.grappling = false;
    this.grappleT = 0;
    this.lean = 0;
    this.dead = false;
    this.landed = false;
    this.height = PLAYER_H;

    const suitMap = suitTexture();
    this.matSuit = new THREE.MeshStandardMaterial({ color: 0x4fb8e0, map: suitMap, roughness: 0.7, metalness: 0.05 });
    this.matTrim = new THREE.MeshStandardMaterial({ color: 0xff8fb1, map: suitMap, roughness: 0.7, metalness: 0.05 });
    this.matDark = new THREE.MeshStandardMaterial({ color: 0x2f3a52, map: suitMap, roughness: 0.8, metalness: 0.05 });

    this.buildMesh();
    this.setGender('f');
  }

  buildMesh() {
    const b = this.body;

    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.42, 0.7, 6, 12), this.matSuit);
    torso.position.y = 1.35;
    torso.castShadow = true;
    b.add(torso);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.34, 20, 16), this.matSuit);
    head.position.y = 2.02;
    head.castShadow = true;
    b.add(head);

    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.16, 0.12), this.matTrim);
    visor.position.set(0, 2.04, 0.3);
    b.add(visor);

    this.legL = this.makeLimb(0.16, 0.72, this.matDark);
    this.legL.position.set(-0.19, 0.62, 0);
    this.legR = this.makeLimb(0.16, 0.72, this.matDark);
    this.legR.position.set(0.19, 0.62, 0);
    b.add(this.legL, this.legR);

    this.armL = this.makeLimb(0.13, 0.62, this.matSuit);
    this.armL.position.set(-0.5, 1.5, 0);
    this.armR = this.makeLimb(0.13, 0.62, this.matSuit);
    this.armR.position.set(0.5, 1.5, 0);
    b.add(this.armL, this.armR);

    const coat = new THREE.Mesh(new THREE.ConeGeometry(0.55, 1.0, 12, 1, true), this.matTrim);
    coat.position.set(0, 1.0, -0.05);
    coat.rotation.x = Math.PI;
    b.add(coat);

    this.shadowBlob = new THREE.Mesh(
      new THREE.CircleGeometry(0.6, 24),
      new THREE.MeshBasicMaterial({ color: 0x1d3557, transparent: true, opacity: 0.22, depthWrite: false })
    );
    this.shadowBlob.rotation.x = -Math.PI / 2;
    this.shadowBlob.position.y = 0.02;
    this.root.add(this.shadowBlob);

    this.hook = new THREE.Mesh(
      new THREE.SphereGeometry(0.16, 10, 8),
      new THREE.MeshBasicMaterial({ color: 0xffffff })
    );
    this.hook.visible = false;
    this.body.add(this.hook);

    this.ropeGeom = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(0, 1, 0)]);
    this.rope = new THREE.Line(this.ropeGeom, new THREE.LineBasicMaterial({ color: 0x3a3a4a }));
    this.rope.visible = false;
    this.body.add(this.rope);
  }

  makeLimb(r, h, mat) {
    const g = new THREE.Group();
    const m = new THREE.Mesh(new THREE.CapsuleGeometry(r, h, 4, 8), mat);
    m.position.y = -h / 2;
    m.castShadow = true;
    g.add(m);
    return g;
  }

  setGender(g) {
    const fem = g === 'f';
    this.legL.position.x = fem ? -0.18 : -0.21;
    this.legR.position.x = fem ? 0.18 : 0.21;
    this.body.scale.set(fem ? 0.96 : 1.04, fem ? 0.98 : 1.02, 1);
  }

  applySkin(skin) {
    this.matSuit.color.setHex(skin.suit);
    this.matTrim.color.setHex(skin.trim);
  }

  reset() {
    this.lane = 1;
    this.x = 0;
    this.y = 0;
    this.vy = 0;
    this.grounded = true;
    this.jumps = 0;
    this.sliding = 0;
    this.grappling = false;
    this.grappleT = 0;
    this.dead = false;
    this.landed = false;
    this.height = PLAYER_H;
    this.body.rotation.set(0, 0, 0);
    this.root.position.set(0, 0, 0);
    this.root.visible = true;
    this.hook.visible = false;
    this.rope.visible = false;
    this.shadowBlob.visible = true;
  }

  moveLane(dir) {
    if (this.dead) return false;
    const next = Math.max(0, Math.min(LANE_X.length - 1, this.lane + dir));
    if (next === this.lane) return false;
    this.lane = next;
    this.lean = -dir * 0.35;
    return true;
  }

  jump() {
    if (this.dead) return null;
    if (this.grappling) {
      this.releaseGrapple(true);
      return null;
    }
    if (this.sliding > 0) {
      this.sliding = 0;
      this.height = PLAYER_H;
    }
    if (this.jumps === 0) {
      this.vy = JUMP_V;
      this.jumps = 1;
      this.grounded = false;
      return 'jump';
    }
    if (this.jumps === 1) {
      this.vy = DOUBLE_JUMP_V;
      this.jumps = 2;
      this.grounded = false;
      return 'double';
    }
    return null;
  }

  slide() {
    if (this.dead) return false;
    if (this.grappling) {
      this.releaseGrapple(true);
      return false;
    }
    if (this.grounded) {
      this.sliding = SLIDE_TIME;
      this.height = PLAYER_H_SLIDE;
      return true;
    }
    this.vy = Math.min(this.vy, -18);
    return true;
  }

  startGrapple() {
    if (this.dead || this.grappling) return false;
    this.grappling = true;
    this.grappleT = 0;
    this.sliding = 0;
    this.height = PLAYER_H;
    this.hook.visible = true;
    this.rope.visible = true;
    return true;
  }

  releaseGrapple(withJump = false) {
    if (!this.grappling) return;
    this.grappling = false;
    this.hook.visible = false;
    this.rope.visible = false;
    this.vy = withJump ? JUMP_V * 0.85 : 2;
    this.jumps = 1;
    this.grounded = false;
  }

  update(dt, speed) {
    if (this.dead) return;

    const targetX = LANE_X[this.lane];
    this.x += (targetX - this.x) * Math.min(1, dt * LANE_SWITCH_SPEED);
    this.lean += (0 - this.lean) * Math.min(1, dt * 6);

    if (this.grappling) {
      this.grappleT += dt;
      const targetY = GRAPPLE_HEIGHT + Math.sin(this.grappleT * 3.2) * 0.35;
      this.y += (targetY - this.y) * Math.min(1, dt * 8);
      this.vy = 0;
      const hookPos = new THREE.Vector3(0, 3.2, -7);
      this.hook.position.copy(hookPos);
      this.ropeGeom.setFromPoints([new THREE.Vector3(0.45, 1.6, 0), hookPos.clone()]);
    } else {
      this.vy += GRAVITY * dt;
      this.y += this.vy * dt;
      if (this.y <= 0) {
        if (!this.grounded && this.vy < -4) this.landed = true;
        this.y = 0;
        this.vy = 0;
        this.grounded = true;
        this.jumps = 0;
      } else {
        this.grounded = false;
      }
    }

    if (this.sliding > 0) {
      this.sliding -= dt;
      if (this.sliding <= 0) {
        this.sliding = 0;
        this.height = PLAYER_H;
      }
    }

    this.root.position.set(this.x, this.y, 0);
    this.body.rotation.z = this.lean;
    const sliding = this.sliding > 0;
    this.body.scale.y += ((sliding ? 0.55 : 1) - this.body.scale.y) * Math.min(1, dt * 14);
    this.body.position.y = sliding ? -0.1 : 0;

    const t = performance.now() * 0.001 * (speed / 20);
    const swing = this.grounded ? Math.sin(t * 9) * 0.7 : 0.5;
    this.legL.rotation.x = swing;
    this.legR.rotation.x = -swing;
    this.armL.rotation.x = -swing * 0.8;
    this.armR.rotation.x = swing * 0.8;
    if (this.grappling) {
      this.armR.rotation.x = -2.2;
    }

    this.shadowBlob.position.y = 0.02 - this.y;
    this.shadowBlob.visible = this.y < 3;
  }

  consumeLanded() {
    if (this.landed) {
      this.landed = false;
      return true;
    }
    return false;
  }
}
