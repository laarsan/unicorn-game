// The player character: a chubby, big-eyed unicorn built from primitives,
// with a procedural gallop, jump, duck and hurt animation – and wings that
// unfold in flight mode.
// The unicorn faces -z (the world scrolls toward +z).

import * as THREE from '../vendor/three.module.js';
import { PALETTE, UNICORN_DUCK_HEIGHT, UNICORN_HEIGHT } from './config.js';

const bodyMat = new THREE.MeshStandardMaterial({ color: PALETTE.unicornBody, roughness: 0.6, metalness: 0, emissive: 0xffe4f0, emissiveIntensity: 0.22 });
const hoofMat = new THREE.MeshStandardMaterial({ color: PALETTE.unicornHoof, roughness: 0.5 });
const hornMat = new THREE.MeshStandardMaterial({ color: PALETTE.horn, emissive: 0xffb300, emissiveIntensity: 0.35, roughness: 0.3, metalness: 0.4 });
const eyeWhiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2 });
const pupilMat = new THREE.MeshStandardMaterial({ color: 0x2b2340, roughness: 0.3 });
const shineMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
const cheekMat = new THREE.MeshStandardMaterial({ color: PALETTE.cheek, roughness: 0.8 });
const innerEarMat = new THREE.MeshStandardMaterial({ color: 0xffc9dc, roughness: 0.8 });
const rainbowMats = PALETTE.rainbow.map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.55, emissive: c, emissiveIntensity: 0.12 }));
const wingMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.7, emissive: 0xfff3fa, emissiveIntensity: 0.35 });
const WING_FLAP_HZ = 2.4;

const sphereGeo = new THREE.SphereGeometry(1, 20, 16);
const legGeo = new THREE.CylinderGeometry(0.13, 0.12, 0.62, 12);
const hoofGeo = new THREE.CylinderGeometry(0.15, 0.15, 0.14, 12);

function sphere(material, radius, x, y, z, sx = 1, sy = 1, sz = 1) {
  const m = new THREE.Mesh(sphereGeo, material);
  m.position.set(x, y, z);
  m.scale.set(radius * sx, radius * sy, radius * sz);
  return m;
}

export class Unicorn {
  constructor() {
    this.group = new THREE.Group();          // world position (x lane, y jump)
    this.body = new THREE.Group();           // animated bob / pitch
    this.group.add(this.body);
    this.legs = [];
    this.mane = [];
    this.tail = [];
    this.height = UNICORN_HEIGHT;
    this.materials = [bodyMat, hoofMat, eyeWhiteMat, cheekMat, innerEarMat, ...rainbowMats];
    this.hurtFlash = 0;
    this.ducking = false;
    this.duckAmount = 0;
    // The gallop phase is accumulated per frame (not t × frequency): with a
    // changing speed the product would jump and make the legs flicker.
    this.gallopPhase = 0;
    this.flapPhase = 0;
    this.danceTime = 0;
    this.wings = [];
    this.build();
  }

  build() {
    const b = this.body;
    // torso
    b.add(sphere(bodyMat, 0.62, 0, 1.05, 0.05, 1, 0.85, 1.35));
    // chest/neck
    const neck = sphere(bodyMat, 0.36, 0, 1.45, -0.55, 1, 1.25, 1);
    neck.rotation.x = 0.5;
    b.add(neck);
    // head
    this.head = new THREE.Group();
    this.head.position.set(0, 1.85, -0.8);
    b.add(this.head);
    this.head.add(sphere(bodyMat, 0.42, 0, 0, 0, 1, 0.95, 1));
    this.head.add(sphere(bodyMat, 0.3, 0, -0.12, -0.32, 1, 0.8, 1)); // snout
    this.head.add(sphere(cheekMat, 0.09, -0.3, -0.12, -0.28, 1, 0.7, 0.4));
    this.head.add(sphere(cheekMat, 0.09, 0.3, -0.12, -0.28, 1, 0.7, 0.4));
    // nostrils
    this.head.add(sphere(pupilMat, 0.03, -0.09, -0.2, -0.61));
    this.head.add(sphere(pupilMat, 0.03, 0.09, -0.2, -0.61));
    // eyes (big kawaii eyes with two highlights)
    for (const side of [-1, 1]) {
      const eye = sphere(eyeWhiteMat, 0.14, side * 0.23, 0.08, -0.3, 1, 1.25, 0.7);
      this.head.add(eye);
      this.head.add(sphere(pupilMat, 0.085, side * 0.24, 0.07, -0.4, 1, 1.25, 0.6));
      this.head.add(sphere(shineMat, 0.035, side * 0.27, 0.13, -0.45));
      this.head.add(sphere(shineMat, 0.018, side * 0.21, 0.02, -0.45));
      // eyelashes: three tiny dark slivers above each eye
      for (let i = 0; i < 3; i++) {
        const lash = sphere(pupilMat, 0.02, side * (0.2 + i * 0.05), 0.24 + i * 0.01, -0.36, 1, 2.2, 0.5);
        lash.rotation.z = side * (-0.5 + i * 0.4);
        this.head.add(lash);
      }
    }
    // ears
    for (const side of [-1, 1]) {
      const ear = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.32, 10), bodyMat);
      ear.position.set(side * 0.25, 0.42, 0.05);
      ear.rotation.z = side * -0.35;
      this.head.add(ear);
      const inner = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.2, 8), innerEarMat);
      inner.position.set(side * 0.25, 0.4, 0.0);
      inner.rotation.z = side * -0.35;
      this.head.add(inner);
    }
    // horn (spiralled by stacking cones)
    this.horn = new THREE.Group();
    this.horn.position.set(0, 0.42, -0.12);
    this.horn.rotation.x = -0.35;
    const horn = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.55, 12), hornMat);
    horn.position.y = 0.27;
    this.horn.add(horn);
    for (let i = 0; i < 3; i++) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.075 - i * 0.02, 0.015, 6, 14), hornMat);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 0.12 + i * 0.13;
      this.horn.add(ring);
    }
    this.head.add(this.horn);
    // mane: rainbow spheres running from forehead down the neck
    for (let i = 0; i < 8; i++) {
      const t = i / 7;
      const s = sphere(rainbowMats[i % rainbowMats.length], 0.21 - t * 0.05, 0, 0, 0);
      s.userData.base = new THREE.Vector3(0.14 - t * 0.05, 2.42 - t * 0.95, -0.78 + t * 0.8);
      s.position.copy(s.userData.base);
      this.mane.push(s);
      b.add(s);
    }
    // forelock over the eyes
    const forelock = sphere(rainbowMats[0], 0.14, -0.12, 0.36, -0.28);
    this.head.add(forelock);
    this.head.add(sphere(rainbowMats[3], 0.11, 0.05, 0.4, -0.3));
    // tail: rainbow spheres trailing backwards
    for (let i = 0; i < 7; i++) {
      const t = i / 6;
      const s = sphere(rainbowMats[i % rainbowMats.length], 0.16 - t * 0.06, 0, 0, 0);
      s.userData.base = new THREE.Vector3(0, 1.35 + Math.sin(t * 2.4) * 0.45, 0.8 + t * 0.95);
      s.position.copy(s.userData.base);
      this.tail.push(s);
      b.add(s);
    }
    // legs
    const legPositions = [[-0.3, -0.5], [0.3, -0.5], [-0.3, 0.55], [0.3, 0.55]];
    legPositions.forEach(([x, z], i) => {
      const leg = new THREE.Group();
      leg.position.set(x, 0.75, z);
      const shaft = new THREE.Mesh(legGeo, bodyMat);
      shaft.position.y = -0.3;
      leg.add(shaft);
      const hoof = new THREE.Mesh(hoofGeo, hoofMat);
      hoof.position.y = -0.62;
      leg.add(hoof);
      leg.userData.front = i < 2;
      leg.userData.side = x < 0 ? 0 : 1;
      this.legs.push(leg);
      b.add(leg);
    });
    // wings (flight mode only): three overlapping feathers per side, hinged at
    // the shoulder – the same shape as the unicorns crossing the sky
    for (const side of [-1, 1]) {
      const pivot = new THREE.Group();
      pivot.position.set(side * 0.42, 1.4, -0.05);
      for (let i = 0; i < 3; i++) {
        const feather = sphere(wingMat, 1, side * (0.62 + i * 0.6), i * 0.1, 0.05 + i * 0.12, 0.78, 0.12, 0.46 - i * 0.06);
        feather.rotation.y = side * i * 0.22;
        pivot.add(feather);
      }
      // a rainbow tip on the outermost feather
      pivot.add(sphere(rainbowMats[side < 0 ? 4 : 5], 0.13, side * 2.05, 0.2, 0.3));
      pivot.userData.side = side;
      pivot.visible = false;
      this.wings.push(pivot);
      b.add(pivot);
    }
    // soft blob shadow so jumps read clearly
    const shadowGeo = new THREE.CircleGeometry(0.75, 24);
    const shadowMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.18, depthWrite: false });
    this.shadow = new THREE.Mesh(shadowGeo, shadowMat);
    this.shadow.rotation.x = -Math.PI / 2;
    this.shadow.position.y = 0.02;
    this.group.add(this.shadow);
  }

  // t = seconds, speed = world speed, airborne = jumping, y = jump height,
  // flying = flight mode (wings out, legs tucked), vy = vertical speed
  // wings = show the wings even when not flying (landing, victory dance)
  animate(t, dt, { speed, airborne, y, ducking, hurt, celebrating, flying = false, wings = false, vy = 0 }) {
    const gallopHz = Math.max(0.6, speed / 5.5);
    this.gallopPhase = (this.gallopPhase + gallopHz * Math.PI * 2 * dt) % (Math.PI * 2);
    const phase = this.gallopPhase;
    this.danceTime = celebrating ? this.danceTime + dt : 0;
    const dance = this.danceTime;
    // wings: flap faster while climbing, glide-slow while sinking
    const flapHz = WING_FLAP_HZ + Math.max(0, vy) * 0.25 - Math.max(0, -vy) * 0.12;
    this.flapPhase = (this.flapPhase + flapHz * Math.PI * 2 * dt) % (Math.PI * 2);
    const lift = 0.1 + Math.sin(this.flapPhase) * 0.65;
    for (const w of this.wings) {
      w.visible = flying || wings;
      w.rotation.z = w.userData.side * lift;
    }
    // legs
    for (const leg of this.legs) {
      const offset = leg.userData.front ? 0 : Math.PI;
      const side = leg.userData.side === 0 ? 0.15 : -0.15;
      if (airborne || flying) {
        leg.rotation.x = THREE.MathUtils.lerp(leg.rotation.x, leg.userData.front ? -0.9 : 0.8, dt * 10);
      } else if (celebrating) {
        // happy prancing: front legs kick high, back legs skip
        leg.rotation.x = Math.sin(dance * 14 + offset + side) * (leg.userData.front ? 0.9 : 0.5);
      } else {
        leg.rotation.x = Math.sin(phase + offset + side) * 0.5;
      }
    }
    // body bob + pitch (in flight: hover with the wing beats, nose up when climbing)
    let bob = airborne ? 0 : Math.abs(Math.sin(phase)) * 0.12;
    let pitch = airborne ? THREE.MathUtils.clamp(-0.35 + y * 0.12, -0.35, 0.25) : Math.sin(phase) * 0.06;
    if (flying) {
      bob = Math.sin(this.flapPhase) * 0.06;
      pitch = THREE.MathUtils.clamp(-vy * 0.05, -0.35, 0.3) + Math.sin(this.flapPhase) * 0.03;
    }
    if (celebrating) {
      // Victory dance on the spot: hops, a pirouette and a happy wiggle.
      this.body.position.y = Math.abs(Math.sin(dance * 7)) * 0.55;
      this.body.rotation.x = -0.15 + Math.sin(dance * 7) * 0.1;
      this.body.rotation.y = dance * 2.4;
      this.body.rotation.z = Math.sin(dance * 3.5) * 0.12;
      this.head.rotation.z = Math.sin(dance * 7) * 0.28;
    } else {
      this.body.position.y = bob;
      this.body.rotation.x = pitch;
      // shortest way back to facing forward after a pirouette
      const yaw = THREE.MathUtils.euclideanModulo(this.body.rotation.y + Math.PI, Math.PI * 2) - Math.PI;
      this.body.rotation.y = THREE.MathUtils.damp(yaw, 0, 10, dt);
      this.body.rotation.z = THREE.MathUtils.damp(this.body.rotation.z, 0, 10, dt);
      this.head.rotation.z = THREE.MathUtils.damp(this.head.rotation.z, 0, 10, dt);
    }
    // ducking squash
    this.duckAmount = THREE.MathUtils.damp(this.duckAmount, ducking ? 1 : 0, 14, dt);
    this.body.scale.y = 1 - this.duckAmount * 0.42;
    this.body.scale.z = 1 + this.duckAmount * 0.15;
    this.head.position.y = 1.85 - this.duckAmount * 0.35;
    this.head.rotation.x = -this.duckAmount * 0.5;
    this.height = THREE.MathUtils.lerp(UNICORN_HEIGHT, UNICORN_DUCK_HEIGHT, this.duckAmount);
    // mane & tail wave
    this.mane.forEach((s, i) => {
      const b = s.userData.base;
      s.position.set(b.x + Math.sin(t * 6 + i * 0.6) * 0.06 * (i / 8 + 0.3), b.y + Math.sin(t * 7 + i * 0.5) * 0.04, b.z);
    });
    this.tail.forEach((s, i) => {
      const b = s.userData.base;
      const k = i / 6;
      const wag = celebrating ? Math.sin(dance * 9 + k * 2) * 0.5 * k : Math.sin(t * 5 + k * 2.5) * 0.35 * k;
      s.position.set(b.x + wag, b.y + Math.sin(t * 6.5 + k * 3) * 0.12 * k + (airborne || flying ? k * 0.4 : 0) + (celebrating ? k * 0.3 : 0), b.z);
    });
    // horn shimmer
    hornMat.emissiveIntensity = 0.3 + Math.sin(t * 5) * 0.15;
    // hurt blink
    if (hurt) {
      const visible = Math.floor(t * 14) % 2 === 0;
      this.body.visible = visible;
    } else {
      this.body.visible = true;
    }
    // shadow shrinks when high up
    const shadowScale = Math.max(0.35, 1 - y * 0.25);
    this.shadow.scale.set(shadowScale, shadowScale, 1);
    this.shadow.position.y = 0.02 - y; // stays on the ground while group rises
  }
}
