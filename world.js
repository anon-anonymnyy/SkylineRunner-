import * as THREE from 'three';
import { LANE_X, ROOF_W, CHUNK_LEN, GRAPPLE_HEIGHT, PALETTE } from './config.js';
import { roofTexture, facadeTexture, hazardTexture, metalTexture } from './textures.js';

export class World {
  constructor(scene) {
    this.scene = scene;
    this.track = new THREE.Group();
    scene.add(this.track);

    this.chunks = [];
    this.obstacles = [];
    this.coins = [];
    this.anchors = [];
    this.pools = { jumper: [], laser: [], blocker: [], coin: [], anchor: [] };

    this.nextSpawnZ = -60;

    this.roofMat = new THREE.MeshStandardMaterial({ color: 0xffffff, map: roofTexture(), roughness: 0.9 });
    this.edgeMat = new THREE.MeshStandardMaterial({ color: PALETTE.roofEdge, roughness: 0.5 });
    const facadeTex = facadeTexture();
    this.facadeMats = PALETTE.facades.map((c) => new THREE.MeshStandardMaterial({ color: c, map: facadeTex, roughness: 0.85 }));
    this.towerMat = new THREE.MeshStandardMaterial({ color: PALETTE.tower, map: metalTexture(), roughness: 0.7 });
    this.coinMat = new THREE.MeshStandardMaterial({ color: PALETTE.coin, emissive: 0x664400, emissiveIntensity: 0.35, metalness: 0.4, roughness: 0.3 });
    this.hazardMat = new THREE.MeshStandardMaterial({ color: 0xffffff, map: hazardTexture(), roughness: 0.6 });
    this.gateMat = new THREE.MeshStandardMaterial({ color: PALETTE.gate, map: metalTexture(), roughness: 0.5 });
    this.blockerMat = new THREE.MeshStandardMaterial({ color: PALETTE.blocker, map: metalTexture(), roughness: 0.6 });
    this.postMat = new THREE.MeshStandardMaterial({ color: 0x5b6470, map: metalTexture(), roughness: 0.6 });
    this.anchorMat = new THREE.MeshBasicMaterial({ color: 0x3aa0e0 });
    this.coreMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

    this.geo = {
      roof: new THREE.BoxGeometry(ROOF_W, 0.6, CHUNK_LEN),
      body: new THREE.BoxGeometry(ROOF_W + 1.2, 22, CHUNK_LEN - 0.4),
      edge: new THREE.BoxGeometry(0.14, 0.14, CHUNK_LEN),
      back: new THREE.BoxGeometry(ROOF_W, 0.14, 0.14),
      tower: new THREE.BoxGeometry(1, 1, 1),
      coin: new THREE.TorusGeometry(0.32, 0.1, 8, 16),
      jumper: new THREE.BoxGeometry(3.2, 1.5, 1.2),
      laserBeam: new THREE.BoxGeometry(3.4, 0.3, 0.3),
      post: new THREE.CylinderGeometry(0.12, 0.12, 1.55, 8),
      blocker: new THREE.BoxGeometry(3.2, 3.4, 1.4),
      bars: new THREE.BoxGeometry(2.9, 0.18, 1.48),
      anchorRing: new THREE.TorusGeometry(0.9, 0.1, 8, 24),
      anchorCore: new THREE.SphereGeometry(0.22, 10, 8),
    };

    this.buildLights();
    this.initChunks();
  }

  buildLights() {
    this.scene.add(new THREE.HemisphereLight(0xdff3ff, 0x8a7a6a, 1.5));

    const sun = new THREE.DirectionalLight(PALETTE.sun, 2.4);
    sun.position.set(-14, 26, 10);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.left = -30;
    sun.shadow.camera.right = 30;
    sun.shadow.camera.top = 40;
    sun.shadow.camera.bottom = -20;
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 90;
    this.scene.add(sun);
  }

  makeChunk(z) {
    const g = new THREE.Group();
    g.position.z = z;

    const roof = new THREE.Mesh(this.geo.roof, this.roofMat);
    roof.position.y = -0.3;
    roof.receiveShadow = true;
    g.add(roof);

    const body = new THREE.Mesh(this.geo.body, this.facadeMats[Math.floor(Math.random() * this.facadeMats.length)]);
    body.position.y = -22 / 2 - 0.6;
    body.castShadow = true;
    body.receiveShadow = true;
    g.add(body);

    for (const side of [-1, 1]) {
      const strip = new THREE.Mesh(this.geo.edge, this.edgeMat);
      strip.position.set(side * (ROOF_W / 2 - 0.1), 0.02, 0);
      g.add(strip);
    }
    const back = new THREE.Mesh(this.geo.back, this.edgeMat);
    back.position.set(0, 0.02, -CHUNK_LEN / 2 + 0.1);
    g.add(back);

    for (let i = 0; i < 4; i++) {
      const h = 20 + Math.random() * 40;
      const w = 5 + Math.random() * 5;
      const tower = new THREE.Mesh(this.geo.tower, this.towerMat);
      tower.scale.set(w, h, w);
      const side = i % 2 === 0 ? -1 : 1;
      tower.position.set(side * (16 + Math.random() * 14), -h / 2 + 1, (Math.random() - 0.5) * CHUNK_LEN);
      tower.castShadow = true;
      g.add(tower);
    }

    return g;
  }

  initChunks() {
    for (let i = 0; i < 6; i++) {
      const c = this.makeChunk(-i * CHUNK_LEN);
      this.track.add(c);
      this.chunks.push(c);
    }
  }

  getObstacle(type) {
    let o = this.pools[type].pop();
    if (!o) {
      o = this.createObstacle(type);
      this.scene.add(o.mesh);
    }
    o.mesh.visible = true;
    return o;
  }

  createObstacle(type) {
    const mesh = new THREE.Group();
    let w, h, d, y;

    if (type === 'jumper') {
      w = 3.2; h = 1.5; d = 1.2; y = 0.75;
      const box = new THREE.Mesh(this.geo.jumper, this.hazardMat);
      box.castShadow = true;
      mesh.add(box);
    } else if (type === 'laser') {
      w = 3.4; h = 0.3; d = 0.3; y = 1.55;
      const beam = new THREE.Mesh(this.geo.laserBeam, this.gateMat);
      beam.castShadow = true;
      mesh.add(beam);
      for (const s of [-1, 1]) {
        const post = new THREE.Mesh(this.geo.post, this.postMat);
        post.position.set(s * (w / 2 + 0.1), -0.78, 0);
        post.castShadow = true;
        mesh.add(post);
      }
    } else {
      w = 3.2; h = 3.4; d = 1.4; y = 1.7;
      const box = new THREE.Mesh(this.geo.blocker, this.blockerMat);
      box.castShadow = true;
      mesh.add(box);
      const bars = new THREE.Mesh(this.geo.bars, this.gateMat);
      bars.position.y = 0.6;
      mesh.add(bars);
    }

    return { type, mesh, w, h, d, y, active: false, lane: 0, z: 0 };
  }

  spawnObstacle(type, lane, z) {
    const o = this.getObstacle(type);
    o.lane = lane;
    o.z = z;
    o.active = true;
    o.mesh.position.set(LANE_X[lane], o.y, z);
    this.obstacles.push(o);
  }

  getCoin() {
    let c = this.pools.coin.pop();
    if (!c) {
      const mesh = new THREE.Mesh(this.geo.coin, this.coinMat);
      c = { mesh, active: false, lane: 0, z: 0, y: 0 };
      this.scene.add(mesh);
    }
    c.mesh.visible = true;
    return c;
  }

  spawnCoin(lane, z, y = 1.1) {
    const c = this.getCoin();
    c.lane = lane;
    c.z = z;
    c.y = y;
    c.active = true;
    c.mesh.position.set(LANE_X[lane], y, z);
    this.coins.push(c);
  }

  getAnchor() {
    let a = this.pools.anchor.pop();
    if (!a) {
      const g = new THREE.Group();
      const ring = new THREE.Mesh(this.geo.anchorRing, this.anchorMat);
      ring.rotation.y = Math.PI / 2;
      g.add(ring);
      g.add(new THREE.Mesh(this.geo.anchorCore, this.coreMat));
      a = { mesh: g, ring, active: false, lane: 0, z: 0 };
      this.scene.add(g);
    }
    a.mesh.visible = true;
    return a;
  }

  spawnAnchor(lane, z) {
    const a = this.getAnchor();
    a.lane = lane;
    a.z = z;
    a.active = true;
    a.mesh.position.set(LANE_X[lane], GRAPPLE_HEIGHT, z);
    this.anchors.push(a);
  }

  releaseObstacle(o) {
    o.active = false;
    o.mesh.visible = false;
    this.pools[o.type].push(o);
  }

  releaseCoin(c) {
    c.active = false;
    c.mesh.visible = false;
    this.pools.coin.push(c);
  }

  releaseAnchor(a) {
    a.active = false;
    a.mesh.visible = false;
    this.pools.anchor.push(a);
  }

  populate(difficulty) {
    while (this.nextSpawnZ > -180) {
      this.nextSpawnZ -= 14 + Math.random() * 10;
      const z = this.nextSpawnZ;
      const r = Math.random();

      if (r < 0.30 + difficulty * 0.1) {
        const lane = Math.floor(Math.random() * 3);
        const t = Math.random();
        const type = t < 0.55 ? 'jumper' : t < 0.82 ? 'laser' : 'blocker';
        this.spawnObstacle(type, lane, z);
        if (type === 'blocker' && Math.random() < 0.45) {
          this.spawnObstacle('jumper', (lane + 1) % 3, z);
        }
      } else if (r < 0.55) {
        const lane = Math.floor(Math.random() * 3);
        const n = 4 + Math.floor(Math.random() * 4);
        for (let i = 0; i < n; i++) {
          this.spawnCoin(lane, z - i * 2.6, 1.1);
        }
      } else if (r < 0.7) {
        const lane = Math.floor(Math.random() * 3);
        this.spawnObstacle('jumper', lane, z);
        for (let i = 0; i < 5; i++) {
          const a = (i / 4) * Math.PI;
          this.spawnCoin(lane, z + 4 - i * 2, 1.2 + Math.sin(a) * 2.2);
        }
      } else if (r < 0.82 && difficulty > 0.25) {
        const lane = Math.floor(Math.random() * 3);
        this.spawnAnchor(lane, z);
        this.spawnObstacle('blocker', lane, z);
        for (let i = 0; i < 8; i++) {
          this.spawnCoin(lane, z + 22 - i * 3, 6);
        }
      }
    }
  }

  update(dt, speed, difficulty) {
    const dz = speed * dt;

    for (const c of this.chunks) {
      c.position.z += dz;
      if (c.position.z > CHUNK_LEN * 1.5) {
        let minZ = Infinity;
        for (const cc of this.chunks) minZ = Math.min(minZ, cc.position.z);
        c.position.z = minZ - CHUNK_LEN;
      }
    }

    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const o = this.obstacles[i];
      o.z += dz;
      o.mesh.position.z = o.z;
      if (o.z > 14) {
        this.releaseObstacle(o);
        this.obstacles.splice(i, 1);
      }
    }

    for (let i = this.coins.length - 1; i >= 0; i--) {
      const c = this.coins[i];
      c.z += dz;
      c.mesh.position.z = c.z;
      c.mesh.rotation.y += dt * 4;
      if (c.z > 14) {
        this.releaseCoin(c);
        this.coins.splice(i, 1);
      }
    }

    for (let i = this.anchors.length - 1; i >= 0; i--) {
      const a = this.anchors[i];
      a.z += dz;
      a.mesh.position.z = a.z;
      a.mesh.rotation.y += dt * 2;
      a.ring.scale.setScalar(1 + Math.sin(performance.now() * 0.005) * 0.08);
      if (a.z > 14) {
        this.releaseAnchor(a);
        this.anchors.splice(i, 1);
      }
    }

    this.nextSpawnZ += dz;
    this.populate(difficulty);
  }

  reset() {
    for (const o of this.obstacles) this.releaseObstacle(o);
    for (const c of this.coins) this.releaseCoin(c);
    for (const a of this.anchors) this.releaseAnchor(a);
    this.obstacles.length = 0;
    this.coins.length = 0;
    this.anchors.length = 0;
    this.nextSpawnZ = -60;
    let z = 0;
    for (const c of this.chunks) {
      c.position.z = z;
      z -= CHUNK_LEN;
    }
  }
}
