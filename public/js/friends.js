// The finish gate and the three spider friends who cheer at it – small
// stylised hero figures (red/blue, white/pink, black/red) that hop and wave.

import * as THREE from '../vendor/three.module.js';
import { PALETTE, ROAD_WIDTH } from './config.js';

const sphereGeo = new THREE.SphereGeometry(1, 14, 12);
const limbGeo = new THREE.CapsuleGeometry(0.09, 0.4, 4, 8);
const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
const webLineMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8 });

const FRIENDS = [
  { suit: 0xe8302a, accent: 0x2c4fd6, eye: 0xffffff },   // red + blue
  { suit: 0xf7f7fb, accent: 0xff5fb0, eye: 0xf7f7fb },   // white + pink
  { suit: 0x1f1f2b, accent: 0xe8302a, eye: 0xffffff },   // black + red
];

export function makeFriend(spec) {
  const g = new THREE.Group();
  const suit = new THREE.MeshStandardMaterial({ color: spec.suit, roughness: 0.6 });
  const accent = new THREE.MeshStandardMaterial({ color: spec.accent, roughness: 0.6 });
  // body
  const body = new THREE.Mesh(sphereGeo, suit);
  body.scale.set(0.32, 0.4, 0.28);
  body.position.y = 0.75;
  g.add(body);
  const belly = new THREE.Mesh(sphereGeo, accent);
  belly.scale.set(0.22, 0.26, 0.16);
  belly.position.set(0, 0.72, 0.16);
  g.add(belly);
  // head (big, kawaii proportions)
  const head = new THREE.Mesh(sphereGeo, suit);
  head.scale.setScalar(0.42);
  head.position.y = 1.45;
  g.add(head);
  // big lens eyes
  for (const side of [-1, 1]) {
    const eye = new THREE.Mesh(sphereGeo, eyeMat);
    eye.material = new THREE.MeshBasicMaterial({ color: spec.eye });
    eye.scale.set(0.16, 0.2, 0.08);
    eye.position.set(side * 0.16, 1.5, 0.36);
    eye.rotation.z = side * -0.4;
    g.add(eye);
    const pupil = new THREE.Mesh(sphereGeo, new THREE.MeshBasicMaterial({ color: 0x1b1b2b }));
    pupil.scale.set(0.07, 0.1, 0.04);
    pupil.position.set(side * 0.15, 1.48, 0.43);
    g.add(pupil);
  }
  // web pattern: a few thin rings over the head
  for (let i = 0; i < 3; i++) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.42 - i * 0.02, 0.008, 4, 24), accent);
    ring.rotation.x = Math.PI / 2 + (i - 1) * 0.45;
    ring.position.y = 1.45;
    g.add(ring);
  }
  // arms + legs
  const limbs = {};
  for (const side of [-1, 1]) {
    const arm = new THREE.Mesh(limbGeo, suit);
    arm.position.set(side * 0.38, 0.95, 0);
    arm.rotation.z = side * 0.6;
    g.add(arm);
    limbs['arm' + side] = arm;
    const leg = new THREE.Mesh(limbGeo, suit);
    leg.position.set(side * 0.14, 0.28, 0);
    g.add(leg);
  }
  g.userData.limbs = limbs;
  g.userData.phase = Math.random() * 6;
  return g;
}

export class FinishGate {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.visible = false;
    scene.add(this.group);
    this.friends = [];
    this.build();
  }

  build() {
    // big rainbow arch spanning the road
    PALETTE.rainbow.forEach((color, i) => {
      const arc = new THREE.Mesh(new THREE.TorusGeometry(ROAD_WIDTH / 2 + 0.6 + i * 0.32, 0.18, 8, 40, Math.PI), new THREE.MeshLambertMaterial({ color }));
      arc.position.y = 0.2;
      this.group.add(arc);
    });
    // MÅL banner
    const c = document.createElement('canvas');
    c.width = 512; c.height = 128;
    const g = c.getContext('2d');
    g.fillStyle = '#fff7fb';
    g.beginPath(); g.roundRect(0, 0, 512, 128, 40); g.fill();
    g.fillStyle = '#ff5d8f';
    g.font = 'bold 84px "Comic Sans MS", "Segoe UI", sans-serif';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('MÅL!', 256, 70);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    const banner = new THREE.Mesh(new THREE.PlaneGeometry(6, 1.5), new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide }));
    banner.position.set(0, 4.2, 0.4);
    this.group.add(banner);
    this.banner = banner;
    // friends on both sides
    FRIENDS.forEach((spec, i) => {
      const f = makeFriend(spec);
      const side = i === 1 ? 1 : -1;
      f.position.set(side * (ROAD_WIDTH / 2 + 1.4 + (i === 2 ? 1.3 : 0)), 0, 1 + i * 0.6);
      f.rotation.y = side > 0 ? -0.8 : 0.8;
      this.friends.push(f);
      this.group.add(f);
    });
    // flags on strings
    for (let i = 0; i < 14; i++) {
      const flag = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.5, 3), new THREE.MeshLambertMaterial({ color: PALETTE.rainbow[i % 7] }));
      flag.rotation.z = Math.PI;
      flag.position.set(-ROAD_WIDTH / 2 + (i / 13) * ROAD_WIDTH, 5.4 - Math.sin((i / 13) * Math.PI) * 0.6, -0.5);
      this.group.add(flag);
    }
  }

  place(z) {
    this.group.position.z = z;
    this.group.visible = true;
    this.celebrating = false;
  }

  hide() {
    this.group.visible = false;
  }

  update(dt, speed, t) {
    if (!this.group.visible) return;
    this.group.position.z += speed * dt;
    this.friends.forEach((f, i) => {
      const p = f.userData.phase + t * (this.celebrating ? 9 : 4);
      f.position.y = this.celebrating ? Math.abs(Math.sin(p)) * 0.6 : Math.abs(Math.sin(p)) * 0.12;
      const wave = Math.sin(p * 1.5) * 0.7;
      f.userData.limbs['arm1'].rotation.z = -2.4 + wave;
      f.userData.limbs['arm-1'].rotation.z = this.celebrating ? 2.4 - wave : 0.6;
      f.rotation.y += Math.sin(t * 3 + i) * dt * 0.3;
    });
    this.banner.rotation.z = Math.sin(t * 2) * 0.05;
  }
}

// Level 5 background: friends swinging on webs between the buildings.
export class WebSwingers {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.visible = false;
    scene.add(this.group);
    this.swingers = [];
    FRIENDS.forEach((spec, i) => {
      const pivot = new THREE.Group();
      const f = makeFriend(spec);
      f.position.y = -9;
      f.scale.setScalar(1.4);
      pivot.add(f);
      const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, -9, 0)]), webLineMat);
      pivot.add(line);
      pivot.position.set((i - 1) * 16, 18, -60 - i * 45);
      pivot.userData.phase = i * 1.3;
      this.group.add(pivot);
      this.swingers.push(pivot);
    });
  }

  setVisible(v) { this.group.visible = v; }

  update(dt, speed, t) {
    if (!this.group.visible) return;
    for (const p of this.swingers) {
      p.rotation.z = Math.sin(t * 1.4 + p.userData.phase) * 0.7;
      p.position.z += speed * dt * 0.5;
      if (p.position.z > 30) p.position.z -= 160;
    }
  }
}
