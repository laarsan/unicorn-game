// Particle effects: sparkle trail behind the unicorn, bursts on pickups,
// confetti and fireworks at the finish, and the rainbow laser beam of flight
// mode. Cheap CPU-updated buffers – a couple of thousand particles at most.

import * as THREE from '../vendor/three.module.js';
import { PALETTE } from './config.js';

function makeSparkleTexture() {
  const c = document.createElement('canvas');
  c.width = 64; c.height = 64;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.4, 'rgba(255,255,255,0.6)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  // four-point star overlay
  g.strokeStyle = 'rgba(255,255,255,0.9)';
  g.lineWidth = 3;
  g.beginPath(); g.moveTo(32, 4); g.lineTo(32, 60); g.moveTo(4, 32); g.lineTo(60, 32); g.stroke();
  return new THREE.CanvasTexture(c);
}

const sparkleTex = makeSparkleTexture();

// Rainbow stripes running along the beam (u wraps around the tube).
function makeRainbowTexture() {
  const c = document.createElement('canvas');
  c.width = 128; c.height = 4;
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 128, 0);
  const colors = ['#ff5d8f', '#ff9f43', '#ffe066', '#7bed9f', '#70c1ff', '#9b7bff', '#ff8ad8', '#ff5d8f'];
  colors.forEach((col, i) => grad.addColorStop(i / (colors.length - 1), col));
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 4);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  return tex;
}

const BEAM_LENGTH = 150;
const BEAM_FAR_RADIUS = 45;        // seen from behind, a narrower cone shrinks to a thin ring on screen
const BEAM_NEAR_RADIUS = 1.2;
const RING_SPEED = 230;            // units / s the rainbow hoops race away from the horn
const RING_GAP = 14;

// The rainbow laser: a wide rainbow-striped tunnel from the horn straight
// ahead, with seven rainbow hoops racing down it and a bright flash at the
// horn tip. Everything uses normal blending – additive colour vanishes against
// the pastel sky, as the fireworks taught us. The tunnel snaps out to full
// length in a tenth of a second and fades over `seconds`.
class RainbowBeam {
  constructor(scene) {
    this.group = new THREE.Group();
    this.group.visible = false;
    scene.add(this.group);
    const tex = makeRainbowTexture();
    tex.repeat.set(3, 1);
    // the cylinder's axis is y; rotate so it points along -z from the origin
    const tunnelGeo = new THREE.CylinderGeometry(BEAM_FAR_RADIUS, BEAM_NEAR_RADIUS, BEAM_LENGTH, 32, 1, true);
    tunnelGeo.translate(0, BEAM_LENGTH / 2, 0);
    tunnelGeo.rotateX(-Math.PI / 2);
    this.tunnelMat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.45, side: THREE.DoubleSide, depthWrite: false, fog: false });
    this.group.add(new THREE.Mesh(tunnelGeo, this.tunnelMat));
    this.rings = PALETTE.rainbow.map((color) => {
      const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, depthWrite: false, fog: false });
      const ring = new THREE.Mesh(new THREE.TorusGeometry(1, 0.14, 8, 48), mat);
      ring.visible = false;
      this.group.add(ring);
      return ring;
    });
    // a glowing ball at the horn tip
    this.flashMat = new THREE.MeshBasicMaterial({ color: 0xfff6c0, transparent: true, opacity: 0.95, depthWrite: false, fog: false });
    this.flash = new THREE.Mesh(new THREE.SphereGeometry(0.7, 12, 10), this.flashMat);
    this.group.add(this.flash);
    this.tex = tex;
    this.timer = 0;
    this.seconds = 0.7;
  }

  fire(origin, seconds) {
    this.group.position.copy(origin);
    this.seconds = seconds;
    this.timer = seconds;
    this.group.visible = true;
    this.group.scale.set(0.1, 0.1, 0.05);
  }

  get active() {
    return this.timer > 0;
  }

  update(dt, origin) {
    if (this.timer <= 0) { this.group.visible = false; return; }
    this.timer -= dt;
    if (origin) this.group.position.copy(origin);
    const age = this.seconds - this.timer;
    const grow = Math.min(1, age / 0.1);
    const fade = Math.min(1, this.timer / (this.seconds * 0.6));
    this.group.scale.set(0.3 + grow * 0.7, 0.3 + grow * 0.7, grow);
    this.tunnelMat.opacity = 0.45 * fade;
    this.flashMat.opacity = 0.95 * fade;
    this.flash.scale.setScalar(1 + Math.sin(age * 30) * 0.3);
    this.tex.offset.x -= dt * 2.5;          // stripes race down the tunnel
    this.rings.forEach((ring, i) => {
      const along = age * RING_SPEED - i * RING_GAP;
      ring.visible = along > 0 && along < BEAM_LENGTH;
      if (!ring.visible) return;
      // hoops sit inside the tunnel walls, growing with them
      const r = (BEAM_NEAR_RADIUS + (BEAM_FAR_RADIUS - BEAM_NEAR_RADIUS) * (along / BEAM_LENGTH)) * 0.55;
      ring.position.z = -along / Math.max(grow, 0.05);   // counter the group's z scale so hoops keep their spacing
      ring.scale.set(r, r, 1);
      ring.material.opacity = 0.9 * fade;
    });
    if (this.timer <= 0) this.group.visible = false;
  }
}

class ParticleSystem {
  constructor(scene, count, { size, additive = true }) {
    this.count = count;
    this.positions = new Float32Array(count * 3);
    this.colors = new Float32Array(count * 3);
    this.velocities = new Float32Array(count * 3);
    this.life = new Float32Array(count);      // remaining seconds
    this.maxLife = new Float32Array(count);
    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
    this.material = new THREE.PointsMaterial({
      size, map: sparkleTex, vertexColors: true, transparent: true, depthWrite: false,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending, sizeAttenuation: true,
    });
    this.points = new THREE.Points(this.geometry, this.material);
    this.points.frustumCulled = false;
    scene.add(this.points);
    this.cursor = 0;
    this.gravity = 0;
    this.drag = 1;
    this.scroll = 0;
    // Additive particles fade out by dimming; normal-blended ones would turn
    // into black specks against the sky, so they keep their colour and simply vanish.
    this.dims = additive;
    for (let i = 0; i < count; i++) this.positions[i * 3 + 1] = -100; // hide
  }

  emit(pos, vel, color, life) {
    const i = this.cursor;
    this.cursor = (this.cursor + 1) % this.count;
    this.positions.set([pos.x, pos.y, pos.z], i * 3);
    this.velocities.set([vel.x, vel.y, vel.z], i * 3);
    const c = new THREE.Color(color);
    this.colors.set([c.r, c.g, c.b], i * 3);
    this.life[i] = life;
    this.maxLife[i] = life;
  }

  update(dt, scrollSpeed = 0) {
    const p = this.positions, v = this.velocities;
    for (let i = 0; i < this.count; i++) {
      if (this.life[i] <= 0) continue;
      this.life[i] -= dt;
      if (this.life[i] <= 0) { p[i * 3 + 1] = -100; continue; }
      v[i * 3 + 1] -= this.gravity * dt;
      v[i * 3] *= this.drag; v[i * 3 + 1] *= this.drag; v[i * 3 + 2] *= this.drag;
      p[i * 3] += v[i * 3] * dt;
      p[i * 3 + 1] += v[i * 3 + 1] * dt;
      p[i * 3 + 2] += (v[i * 3 + 2] + scrollSpeed) * dt;
      if (this.dims) {
        const fade = this.life[i] / this.maxLife[i];
        this.colors[i * 3] *= 0.995; this.colors[i * 3 + 1] *= 0.995; this.colors[i * 3 + 2] *= 0.995;
        if (fade < 0.3) { // dim out the last 30 %
          this.colors[i * 3] *= 0.9; this.colors[i * 3 + 1] *= 0.9; this.colors[i * 3 + 2] *= 0.9;
        }
      }
    }
    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.color.needsUpdate = true;
  }
}

export class Effects {
  constructor(scene) {
    this.scene = scene;
    this.trail = new ParticleSystem(scene, 220, { size: 0.32 });
    this.trail.drag = 0.98;
    this.burst = new ParticleSystem(scene, 300, { size: 0.55 });
    this.burst.gravity = 6;
    this.burst.drag = 0.97;
    this.confetti = new ParticleSystem(scene, 500, { size: 0.5, additive: false });
    this.confetti.gravity = 4;
    this.confetti.drag = 0.99;
    // Normal blending: additive sparks disappear against a bright pastel sky.
    this.fireworks = new ParticleSystem(scene, 2000, { size: 0.9, additive: false });
    this.fireworks.gravity = 2.5;
    this.fireworks.drag = 0.985;
    this.trailAccumulator = 0;
    this.confettiTimer = 0;
    this.confettiOrigin = new THREE.Vector3();
    this.fireworkTimer = 0;
    this.nextRocketIn = 0;
    this.rockets = [];          // rising rockets waiting to burst
    this.onFireworkBurst = null;
    this.beam = new RainbowBeam(scene);
    this.tmp = new THREE.Vector3();
  }

  // Flight mode: the rainbow laser leaves the horn at `origin` (world space).
  fireBeam(origin, seconds) {
    this.beam.fire(origin, seconds);
    for (let i = 0; i < 40; i++) {
      const a = Math.random() * Math.PI * 2, s = 3 + Math.random() * 5;
      const color = PALETTE.rainbow[Math.floor(Math.random() * PALETTE.rainbow.length)];
      this.burst.emit(origin, { x: Math.cos(a) * s, y: Math.sin(a) * s, z: -6 - Math.random() * 10 }, color, 0.5 + Math.random() * 0.4);
    }
  }

  // Glitter where the beam struck a collectible (called per target, rippling outwards).
  zapBurst(pos) {
    for (let i = 0; i < 8; i++) {
      const color = PALETTE.rainbow[Math.floor(Math.random() * PALETTE.rainbow.length)];
      this.burst.emit(pos, { x: (Math.random() - 0.5) * 6, y: 1 + Math.random() * 5, z: (Math.random() - 0.5) * 6 }, color, 0.5 + Math.random() * 0.4);
    }
  }

  // Rainbow glitter streaming from the unicorn's tail.
  updateTrail(dt, origin, speed) {
    this.trailAccumulator += dt * Math.max(20, speed * 3);
    while (this.trailAccumulator > 1) {
      this.trailAccumulator -= 1;
      const color = PALETTE.rainbow[Math.floor(Math.random() * PALETTE.rainbow.length)];
      this.tmp.set(origin.x + (Math.random() - 0.5) * 0.6, origin.y + 1.1 + (Math.random() - 0.2) * 0.8, origin.z + 1.2 + Math.random() * 0.5);
      this.trail.emit(this.tmp, { x: (Math.random() - 0.5) * 1.5, y: 1 + Math.random() * 1.5, z: 1 + Math.random() * 2 }, color, 0.6 + Math.random() * 0.5);
    }
  }

  pickupBurst(pos, color, count = 16) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2, s = 2 + Math.random() * 4;
      this.burst.emit(pos, { x: Math.cos(a) * s, y: 2 + Math.random() * 4, z: Math.sin(a) * s }, color, 0.5 + Math.random() * 0.4);
    }
  }

  startConfetti(origin, seconds = 3.5) {
    this.confettiTimer = seconds;
    this.confettiOrigin.copy(origin);
  }

  // Rockets keep launching for `seconds`; `onBurst(position)` fires per explosion
  // so the game can play a bang.
  startFireworks(seconds = 6, onBurst = null) {
    this.fireworkTimer = seconds;
    this.nextRocketIn = 0.2;
    this.onFireworkBurst = onBurst;
  }

  stopFireworks() {
    this.fireworkTimer = 0;
    this.rockets.length = 0;
  }

  launchRocket() {
    // Bursts sit above and around the finish gate, inside the camera's view.
    const x = (Math.random() - 0.5) * 28;
    const targetY = 6 + Math.random() * 6;
    const z = -6 - Math.random() * 14;
    const color = PALETTE.rainbow[Math.floor(Math.random() * PALETTE.rainbow.length)];
    this.rockets.push({ x, y: 0.5, z, targetY, color, speed: 14 + Math.random() * 6 });
  }

  burstFirework(r) {
    const center = this.tmp.set(r.x, r.y, r.z);
    const second = PALETTE.rainbow[Math.floor(Math.random() * PALETTE.rainbow.length)];
    for (let i = 0; i < 110; i++) {
      // uniform directions on a sphere → a round bloom
      const u = Math.random() * 2 - 1, a = Math.random() * Math.PI * 2;
      const rxy = Math.sqrt(1 - u * u);
      const s = 5 + Math.random() * 4;
      this.fireworks.emit(center, { x: Math.cos(a) * rxy * s, y: u * s, z: Math.sin(a) * rxy * s }, i % 3 === 0 ? second : r.color, 1.4 + Math.random() * 0.8);
    }
    for (let i = 0; i < 20; i++) {
      const a = Math.random() * Math.PI * 2, s = 1 + Math.random() * 2;
      this.fireworks.emit(center, { x: Math.cos(a) * s, y: Math.random() * 2, z: Math.sin(a) * s }, 0xfff6a0, 0.8 + Math.random() * 0.6);
    }
    if (this.onFireworkBurst) this.onFireworkBurst(center);
  }

  updateFireworks(dt) {
    if (this.fireworkTimer > 0) {
      this.fireworkTimer -= dt;
      this.nextRocketIn -= dt;
      if (this.nextRocketIn <= 0) {
        this.nextRocketIn = 0.3 + Math.random() * 0.4;
        this.launchRocket();
        if (Math.random() < 0.35) this.launchRocket(); // sometimes two at once
      }
    }
    for (let i = this.rockets.length - 1; i >= 0; i--) {
      const r = this.rockets[i];
      r.y += r.speed * dt;
      // glowing tail while rising
      this.tmp.set(r.x + (Math.random() - 0.5) * 0.2, r.y, r.z);
      this.fireworks.emit(this.tmp, { x: 0, y: -1, z: 0 }, 0xfff1b0, 0.35);
      if (r.y >= r.targetY) {
        this.burstFirework(r);
        this.rockets.splice(i, 1);
      }
    }
  }

  update(dt, scrollSpeed, beamOrigin = null) {
    this.updateFireworks(dt);
    this.beam.update(dt, beamOrigin);
    if (this.confettiTimer > 0) {
      this.confettiTimer -= dt;
      for (let i = 0; i < 6; i++) {
        const color = PALETTE.rainbow[Math.floor(Math.random() * PALETTE.rainbow.length)];
        this.tmp.set(this.confettiOrigin.x + (Math.random() - 0.5) * 12, this.confettiOrigin.y + 6 + Math.random() * 4, this.confettiOrigin.z + (Math.random() - 0.5) * 6);
        this.confetti.emit(this.tmp, { x: (Math.random() - 0.5) * 3, y: -1 - Math.random() * 2, z: (Math.random() - 0.5) * 3 }, color, 2.5 + Math.random());
      }
    }
    this.trail.update(dt, scrollSpeed);
    this.burst.update(dt, scrollSpeed);
    this.confetti.update(dt, 0);
    this.fireworks.update(dt, 0);
  }
}
