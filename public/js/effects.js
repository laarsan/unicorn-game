// Particle effects: sparkle trail behind the unicorn, bursts on pickups,
// confetti at the finish. Cheap CPU-updated buffers – a few hundred particles.

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
      const fade = this.life[i] / this.maxLife[i];
      this.colors[i * 3] *= 0.995; this.colors[i * 3 + 1] *= 0.995; this.colors[i * 3 + 2] *= 0.995;
      if (fade < 0.3) { // dim out the last 30 %
        this.colors[i * 3] *= 0.9; this.colors[i * 3 + 1] *= 0.9; this.colors[i * 3 + 2] *= 0.9;
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
    this.trailAccumulator = 0;
    this.confettiTimer = 0;
    this.confettiOrigin = new THREE.Vector3();
    this.tmp = new THREE.Vector3();
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

  update(dt, scrollSpeed) {
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
  }
}
