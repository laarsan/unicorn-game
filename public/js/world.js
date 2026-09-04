// Environment: sky dome, sun/moon, clouds, background rainbow, the rainbow
// road and themed roadside decorations. Everything scrolls toward +z.

import * as THREE from '../vendor/three.module.js';
import { PALETTE, ROAD_LENGTH, ROAD_WIDTH, LANE_WIDTH } from './config.js';
import { makeRng } from './levels.js';

const DECOR_COUNT = 34;
const CLOUD_COUNT = 14;
const RECYCLE_Z = 30;

function makeRoadTexture() {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 256;
  const g = c.getContext('2d');
  const stripes = PALETTE.rainbow.map((n) => '#' + n.toString(16).padStart(6, '0'));
  const w = c.width / stripes.length;
  stripes.forEach((col, i) => {
    g.fillStyle = col;
    g.fillRect(i * w, 0, w + 1, c.height);
  });
  // lighter sheen down the middle + sparkles so the scrolling is visible
  const sheen = g.createLinearGradient(0, 0, c.width, 0);
  sheen.addColorStop(0, 'rgba(255,255,255,0.05)');
  sheen.addColorStop(0.5, 'rgba(255,255,255,0.28)');
  sheen.addColorStop(1, 'rgba(255,255,255,0.05)');
  g.fillStyle = sheen;
  g.fillRect(0, 0, c.width, c.height);
  g.fillStyle = 'rgba(255,255,255,0.75)';
  const rng = makeRng(7);
  for (let i = 0; i < 40; i++) {
    const x = rng() * c.width, y = rng() * c.height, r = 1 + rng() * 2;
    g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
  }
  // lane separators (dotted)
  g.fillStyle = 'rgba(255,255,255,0.85)';
  for (const lx of [c.width / 3, (2 * c.width) / 3]) {
    for (let y = 8; y < c.height; y += 32) g.fillRect(lx - 2, y, 4, 14);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1, ROAD_LENGTH / 12);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function makeGlowSprite(color) {
  const c = document.createElement('canvas');
  c.width = 128; c.height = 128;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, 'rgba(255,255,255,0.9)');
  grad.addColorStop(0.3, 'rgba(255,255,255,0.35)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c);
  const mat = new THREE.SpriteMaterial({ map: tex, color, transparent: true, depthWrite: false });
  return new THREE.Sprite(mat);
}

const skyVertex = `
  varying float vY;
  void main() {
    vY = normalize(position).y;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }`;
const skyFragment = `
  uniform vec3 top; uniform vec3 bottom; varying float vY;
  void main() {
    float t = smoothstep(-0.05, 0.6, vY);
    gl_FragColor = vec4(mix(bottom, top, t), 1.0);
  }`;

const whiteMat = new THREE.MeshLambertMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.35 });
const cloudGeo = new THREE.SphereGeometry(1, 12, 10);

function makeCloud(rng, scale = 1) {
  const g = new THREE.Group();
  const n = 3 + Math.floor(rng() * 3);
  for (let i = 0; i < n; i++) {
    const m = new THREE.Mesh(cloudGeo, whiteMat);
    const r = (0.8 + rng() * 0.9) * scale;
    m.position.set((i - n / 2) * 1.1 * scale, (rng() - 0.5) * 0.5 * scale, (rng() - 0.5) * 0.8 * scale);
    m.scale.setScalar(r);
    g.add(m);
  }
  return g;
}

// ----- roadside decoration factories, one per theme -----
const trunkMat = new THREE.MeshLambertMaterial({ color: 0xa4703f });
const leafMats = [0x6fd36f, 0x4fc46b, 0x8ce07a].map((c) => new THREE.MeshLambertMaterial({ color: c }));
const flowerMats = PALETTE.rainbow.map((c) => new THREE.MeshLambertMaterial({ color: c }));
const candyMats = [0xff6fa8, 0x8ad6ff, 0xfff27a, 0xc48bff, 0x8dffb0].map((c) => new THREE.MeshLambertMaterial({ color: c }));
const stickMat = new THREE.MeshLambertMaterial({ color: 0xfff6ec });
const starMat = new THREE.MeshBasicMaterial({ color: 0xfff3a6 });
const buildingMats = [0xffb5c9, 0xb8d8ff, 0xfff0a8, 0xc9b6ff, 0xb5f2d9].map((c) => new THREE.MeshLambertMaterial({ color: c }));
const windowMat = new THREE.MeshBasicMaterial({ color: 0xfff7c2 });
const webMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6 });

const DECOR = {
  meadow(rng) {
    const g = new THREE.Group();
    if (rng() < 0.6) {
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.28, 1.6, 8), trunkMat);
      trunk.position.y = 0.8;
      g.add(trunk);
      const crown = new THREE.Mesh(cloudGeo, leafMats[Math.floor(rng() * 3)]);
      crown.position.y = 2.3;
      crown.scale.set(1.4, 1.2, 1.4);
      g.add(crown);
      const s = 0.8 + rng() * 0.8;
      g.scale.setScalar(s);
    } else {
      // flower cluster
      for (let i = 0; i < 4; i++) {
        const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.6, 5), leafMats[1]);
        stem.position.set((rng() - 0.5) * 1.5, 0.3, (rng() - 0.5) * 1.5);
        g.add(stem);
        const head = new THREE.Mesh(cloudGeo, flowerMats[Math.floor(rng() * flowerMats.length)]);
        head.position.set(stem.position.x, 0.65, stem.position.z);
        head.scale.setScalar(0.18);
        g.add(head);
      }
    }
    return g;
  },
  clouds(rng) {
    const g = makeCloud(rng, 1.6 + rng());
    g.position.y = 0.4 + rng() * 2.5;
    return g;
  },
  candy(rng) {
    const g = new THREE.Group();
    const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.2, 6), stickMat);
    stick.position.y = 1.1;
    g.add(stick);
    if (rng() < 0.5) {
      const swirl = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.22, 10, 20), candyMats[Math.floor(rng() * candyMats.length)]);
      swirl.position.y = 2.4;
      g.add(swirl);
      const core = new THREE.Mesh(cloudGeo, candyMats[Math.floor(rng() * candyMats.length)]);
      core.position.y = 2.4; core.scale.setScalar(0.35);
      g.add(core);
    } else {
      const ball = new THREE.Mesh(cloudGeo, candyMats[Math.floor(rng() * candyMats.length)]);
      ball.position.y = 2.5; ball.scale.setScalar(0.7);
      g.add(ball);
    }
    g.scale.setScalar(0.8 + rng() * 0.7);
    return g;
  },
  night(rng) {
    const g = new THREE.Group();
    const s = new THREE.Mesh(new THREE.OctahedronGeometry(0.4, 0), starMat);
    s.position.y = 1 + rng() * 5;
    s.scale.set(1, 1.6, 0.4);
    g.add(s);
    g.userData.spin = 0.5 + rng();
    const glow = makeGlowSprite(0xfff3a6);
    glow.scale.setScalar(2.5);
    glow.position.copy(s.position);
    g.add(glow);
    return g;
  },
  city(rng) {
    const g = new THREE.Group();
    const h = 3 + rng() * 6;
    const w = 1.8 + rng() * 1.5;
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, w), buildingMats[Math.floor(rng() * buildingMats.length)]);
    b.position.y = h / 2;
    g.add(b);
    for (let y = 1; y < h - 0.5; y += 1.2) {
      for (let x = -w / 2 + 0.5; x < w / 2 - 0.3; x += 0.8) {
        if (rng() < 0.7) {
          const win = new THREE.Mesh(new THREE.PlaneGeometry(0.35, 0.5), windowMat);
          win.position.set(x, y, w / 2 + 0.01);
          g.add(win);
          const win2 = win.clone();
          win2.position.set(x, y, -w / 2 - 0.01);
          win2.rotation.y = Math.PI;
          g.add(win2);
        }
      }
    }
    if (rng() < 0.4) {
      // a strand of web between rooftops
      const pts = [new THREE.Vector3(-w, h + 0.5, 0), new THREE.Vector3(0, h - 0.6, 0), new THREE.Vector3(w, h + 0.5, 0)];
      const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), webMat);
      g.add(line);
    }
    return g;
  },
};

export class World {
  constructor(scene) {
    this.scene = scene;
    this.rng = makeRng(99);
    this.root = new THREE.Group();
    scene.add(this.root);
    this.decor = [];
    this.clouds = [];
    this.buildStatic();
  }

  buildStatic() {
    // sky dome
    this.skyMat = new THREE.ShaderMaterial({
      uniforms: { top: { value: new THREE.Color(0x7fc8ff) }, bottom: { value: new THREE.Color(0xfff1f7) } },
      vertexShader: skyVertex, fragmentShader: skyFragment, side: THREE.BackSide, depthWrite: false, fog: false,
    });
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(400, 32, 16), this.skyMat);
    this.root.add(this.sky);

    // sun / moon
    this.sun = new THREE.Group();
    const sunBody = new THREE.Mesh(new THREE.SphereGeometry(7, 24, 16), new THREE.MeshBasicMaterial({ color: 0xfff2a8, fog: false }));
    this.sunGlow = makeGlowSprite(0xfff2a8);
    this.sunGlow.material.fog = false;
    this.sunGlow.scale.setScalar(40);
    this.sun.add(sunBody, this.sunGlow);
    this.sunBody = sunBody;
    this.sun.position.set(-60, 40, -260);
    this.root.add(this.sun);

    // background rainbow (far away, static)
    this.rainbow = new THREE.Group();
    PALETTE.rainbow.forEach((color, i) => {
      const arc = new THREE.Mesh(
        new THREE.TorusGeometry(70 + i * 3.2, 1.6, 8, 60, Math.PI),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85, fog: false }),
      );
      this.rainbow.add(arc);
    });
    this.rainbow.position.set(0, -6, -330);
    this.root.add(this.rainbow);

    // distant stars for night (hidden unless theme.moon)
    const starGeo = new THREE.BufferGeometry();
    const pts = [];
    for (let i = 0; i < 400; i++) {
      const a = this.rng() * Math.PI * 2, e = this.rng() * 0.9 + 0.05, r = 380;
      pts.push(Math.cos(a) * Math.cos(e) * r, Math.sin(e) * r, Math.sin(a) * Math.cos(e) * r);
    }
    starGeo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    this.stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 2.2, sizeAttenuation: true, fog: false }));
    this.stars.visible = false;
    this.root.add(this.stars);

    // ground
    this.groundMat = new THREE.MeshLambertMaterial({ color: 0x9be27a });
    this.ground = new THREE.Mesh(new THREE.PlaneGeometry(600, 700), this.groundMat);
    this.ground.rotation.x = -Math.PI / 2;
    this.ground.position.set(0, -0.05, -150);
    this.root.add(this.ground);

    // road
    this.roadTex = makeRoadTexture();
    const roadMat = new THREE.MeshLambertMaterial({ map: this.roadTex });
    this.road = new THREE.Mesh(new THREE.PlaneGeometry(ROAD_WIDTH, ROAD_LENGTH), roadMat);
    this.road.rotation.x = -Math.PI / 2;
    this.road.position.set(0, 0, -ROAD_LENGTH / 2 + 20);
    this.root.add(this.road);
    // road edges (soft white curbs)
    for (const side of [-1, 1]) {
      const curb = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.25, ROAD_LENGTH), whiteMat);
      curb.position.set(side * (ROAD_WIDTH / 2 + 0.1), 0.1, -ROAD_LENGTH / 2 + 20);
      this.root.add(curb);
    }

    // clouds
    for (let i = 0; i < CLOUD_COUNT; i++) {
      const c = makeCloud(this.rng, 1.5 + this.rng() * 2);
      c.position.set((this.rng() - 0.5) * 120, 8 + this.rng() * 16, -this.rng() * 250);
      c.userData.drift = 0.15 + this.rng() * 0.2;
      this.clouds.push(c);
      this.root.add(c);
    }

    // lights
    this.hemi = new THREE.HemisphereLight(0xffffff, 0xb8e0a0, 1.1);
    this.dir = new THREE.DirectionalLight(0xffffff, 1.4);
    this.dir.position.set(-20, 40, 10);
    this.root.add(this.hemi, this.dir);
    this.scene.fog = new THREE.Fog(0xffe6f2, 70, 230);
  }

  setTheme(theme) {
    this.theme = theme;
    this.skyMat.uniforms.top.value.set(theme.skyTop);
    this.skyMat.uniforms.bottom.value.set(theme.skyBottom);
    this.scene.fog.color.set(theme.fog);
    this.groundMat.color.set(theme.ground);
    this.sunBody.material.color.set(theme.sun);
    this.sunGlow.material.color.set(theme.sun);
    this.sun.position.y = theme.sunY;
    this.stars.visible = Boolean(theme.moon);
    this.rainbow.visible = !theme.moon;
    this.hemi.intensity = theme.moon ? 0.7 : 1.1;
    this.dir.intensity = theme.moon ? 0.9 : 1.4;
    this.hemi.groundColor.set(theme.ground).lerp(new THREE.Color(0xffffff), 0.6);
    for (const c of this.clouds) c.visible = theme.decor !== 'night';
    // rebuild decorations
    for (const d of this.decor) this.root.remove(d);
    this.decor = [];
    const factory = DECOR[theme.decor] || DECOR.meadow;
    const rng = makeRng(theme.skyTop);
    for (let i = 0; i < DECOR_COUNT; i++) {
      const d = factory(rng);
      this.placeDecor(d, rng, -rng() * 300 + 20);
      this.decor.push(d);
      this.root.add(d);
    }
  }

  placeDecor(d, rng, z) {
    const side = rng() < 0.5 ? -1 : 1;
    const spread = this.theme.decor === 'city' ? 8 : 14;
    d.position.x = side * (ROAD_WIDTH / 2 + 2.5 + rng() * spread);
    d.position.z = z;
    d.rotation.y = rng() * Math.PI * 2;
  }

  update(dt, speed, t) {
    this.roadTex.offset.y -= (speed * dt) / 12;
    for (const d of this.decor) {
      d.position.z += speed * dt;
      if (d.userData.spin) d.rotation.y += dt * d.userData.spin;
      if (d.position.z > RECYCLE_Z) this.placeDecor(d, this.rng, d.position.z - 320);
    }
    for (const c of this.clouds) {
      c.position.z += speed * dt * c.userData.drift;
      c.position.x += Math.sin(t * 0.2 + c.position.y) * dt * 0.3;
      if (c.position.z > RECYCLE_Z) c.position.z -= 280;
    }
  }
}

export { LANE_WIDTH };
