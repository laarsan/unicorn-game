// Course objects: collectibles (star, airStar, crystal, bubble, heart, candy) and
// obstacles (rock, fence, arch, cloud). Shared geometry/materials, one mesh group per
// live entity. Collision maths lives in game.js; this file only builds and
// animates the meshes.

import * as THREE from '../vendor/three.module.js';
import { LANE_WIDTH, OBJECT, PALETTE } from './config.js';

const starShape = (() => {
  const shape = new THREE.Shape();
  const outer = 0.55, inner = 0.24;
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
    const x = Math.cos(a) * r, y = Math.sin(a) * r;
    if (i === 0) shape.moveTo(x, y); else shape.lineTo(x, y);
  }
  shape.closePath();
  return shape;
})();
const starGeo = new THREE.ExtrudeGeometry(starShape, { depth: 0.18, bevelEnabled: true, bevelSize: 0.05, bevelThickness: 0.05, bevelSegments: 2 });
starGeo.center();
const starMat = new THREE.MeshStandardMaterial({ color: 0xffe14a, emissive: 0xffb300, emissiveIntensity: 0.45, roughness: 0.35, metalness: 0.2 });

const crystalGeo = new THREE.OctahedronGeometry(0.6, 0);
const crystalMat = new THREE.MeshStandardMaterial({ color: 0xb9f2ff, emissive: 0x7fd8ff, emissiveIntensity: 0.6, roughness: 0.1, metalness: 0.3, transparent: true, opacity: 0.9 });

const bubbleGeo = new THREE.SphereGeometry(OBJECT.bubble.radius, 20, 16);
const bubbleMat = new THREE.MeshPhysicalMaterial({ color: 0xbfe6ff, emissive: 0x7fc8ff, emissiveIntensity: 0.35, transparent: true, opacity: 0.6, roughness: 0.05, metalness: 0, clearcoat: 1, iridescence: 1, iridescenceIOR: 1.6, side: THREE.DoubleSide });
const bubbleRimMat = new THREE.MeshBasicMaterial({ color: 0xff9fe0, transparent: true, opacity: 0.9 });
const bubbleShineMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8 });

// Heart (extra life): the classic two-lobe outline, extruded like the star.
const heartShape = (() => {
  const s = new THREE.Shape();
  const k = 0.055; // scale of the classic 16×19 heart outline
  s.moveTo(5 * k, 5 * k);
  s.bezierCurveTo(5 * k, 5 * k, 4 * k, 0, 0, 0);
  s.bezierCurveTo(-6 * k, 0, -6 * k, 7 * k, -6 * k, 7 * k);
  s.bezierCurveTo(-6 * k, 11 * k, -3 * k, 15.4 * k, 5 * k, 19 * k);
  s.bezierCurveTo(12 * k, 15.4 * k, 16 * k, 11 * k, 16 * k, 7 * k);
  s.bezierCurveTo(16 * k, 7 * k, 16 * k, 0, 10 * k, 0);
  s.bezierCurveTo(7 * k, 0, 5 * k, 5 * k, 5 * k, 5 * k);
  return s;
})();
const heartGeo = new THREE.ExtrudeGeometry(heartShape, { depth: 0.22, bevelEnabled: true, bevelSize: 0.06, bevelThickness: 0.06, bevelSegments: 3 });
heartGeo.center();
const heartMat = new THREE.MeshStandardMaterial({ color: 0xff4f8b, emissive: 0xff2d6f, emissiveIntensity: 0.5, roughness: 0.3, metalness: 0.1 });
const heartGlowMat = new THREE.MeshBasicMaterial({ color: 0xffb3d1, transparent: true, opacity: 0.25, depthWrite: false });

// Candy (flight mode): a wrapped sweet – a striped ball with two twisted wrapper ends.
const candyGeo = new THREE.SphereGeometry(0.36, 16, 12);
const candyEndGeo = new THREE.ConeGeometry(0.16, 0.3, 8);
const candyColors = [0xff5d8f, 0xff9f43, 0x7bed9f, 0x70c1ff, 0x9b7bff];
const candyMats = candyColors.map((c) => new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.35, roughness: 0.3, metalness: 0.1 }));
const candyStripeMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.3, roughness: 0.4 });
const candyStripeGeo = new THREE.TorusGeometry(0.36, 0.05, 6, 24);

const rockGeo = new THREE.DodecahedronGeometry(0.75, 0);
const rockMat = new THREE.MeshStandardMaterial({ color: 0xb59cd9, roughness: 0.9, flatShading: true });
const rockMossMat = new THREE.MeshStandardMaterial({ color: 0x8fe38f, roughness: 0.9 });

const fenceMat = new THREE.MeshLambertMaterial({ color: 0xfff0f6 });
const fencePostGeo = new THREE.BoxGeometry(0.18, 1.35, 0.18);
const fenceRailGeo = new THREE.BoxGeometry(LANE_WIDTH - 0.5, 0.16, 0.12);

const archMats = PALETTE.rainbow.map((c) => new THREE.MeshLambertMaterial({ color: c }));
const archGeo = new THREE.TorusGeometry(1.15, 0.13, 8, 24, Math.PI);

const cloudMat = new THREE.MeshLambertMaterial({ color: 0x9aa3c2 });
const cloudFaceMat = new THREE.MeshBasicMaterial({ color: 0x2b2340 });
const boltMat = new THREE.MeshBasicMaterial({ color: 0xfff275 });
const puffGeo = new THREE.SphereGeometry(1, 12, 10);
const sphereGeo = new THREE.SphereGeometry(1, 10, 8);

export const laneX = (lane) => lane * LANE_WIDTH;

const builders = {
  star() {
    const m = new THREE.Mesh(starGeo, starMat);
    m.position.y = OBJECT.star.y;
    m.userData.spin = true;
    return m;
  },
  airStar() {
    const m = new THREE.Mesh(starGeo, starMat);
    m.position.y = OBJECT.airStar.y;
    m.userData.spin = true;
    return m;
  },
  crystal() {
    const g = new THREE.Group();
    const m = new THREE.Mesh(crystalGeo, crystalMat);
    m.scale.set(0.8, 1.3, 0.8);
    g.add(m);
    g.position.y = OBJECT.crystal.y;
    g.userData.spin = true;
    g.userData.float = true;
    return g;
  },
  heart() {
    const g = new THREE.Group();
    const m = new THREE.Mesh(heartGeo, heartMat);
    m.rotation.z = Math.PI; // the outline is drawn point-up; flip it
    g.add(m);
    const glow = new THREE.Mesh(sphereGeo, heartGlowMat);
    glow.scale.setScalar(0.85);
    g.add(glow);
    g.position.y = OBJECT.heart.y;
    g.userData.spin = true;
    g.userData.float = true;
    g.userData.pulse = true;
    return g;
  },
  candy() {
    const g = new THREE.Group();
    const mat = candyMats[Math.floor(Math.random() * candyMats.length)];
    g.add(new THREE.Mesh(candyGeo, mat));
    for (const a of [-0.9, 0, 0.9]) {                 // white stripes around the ball
      const stripe = new THREE.Mesh(candyStripeGeo, candyStripeMat);
      stripe.rotation.y = Math.PI / 2;
      stripe.rotation.x = a;
      g.add(stripe);
    }
    for (const side of [-1, 1]) {                     // twisted wrapper ends
      const end = new THREE.Mesh(candyEndGeo, mat);
      end.position.x = side * 0.5;
      end.rotation.z = side * -Math.PI / 2;
      g.add(end);
      const tip = new THREE.Mesh(sphereGeo, candyStripeMat);
      tip.scale.setScalar(0.08);
      tip.position.x = side * 0.66;
      g.add(tip);
    }
    g.position.y = OBJECT.candy.y;
    g.scale.setScalar(1.3);                           // a sweet should be as easy to spot as a star
    g.userData.spin = true;
    g.userData.float = true;
    return g;
  },
  bubble() {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(bubbleGeo, bubbleMat));
    // pink rim ring facing the camera makes the bubble pop out against the sky
    const rim = new THREE.Mesh(new THREE.TorusGeometry(OBJECT.bubble.radius, 0.05, 8, 40), bubbleRimMat);
    g.add(rim);
    const shine = new THREE.Mesh(sphereGeo, bubbleShineMat);
    shine.scale.set(0.22, 0.13, 0.1);
    shine.position.set(-0.35, 0.45, OBJECT.bubble.radius * 0.6);
    g.add(shine);
    g.userData.float = true;
    return g;
  },
  rock() {
    const g = new THREE.Group();
    const m = new THREE.Mesh(rockGeo, rockMat);
    m.position.y = 0.55;
    m.rotation.set(0.3, 0.6, 0.1);
    g.add(m);
    const moss = new THREE.Mesh(sphereGeo, rockMossMat);
    moss.scale.set(0.5, 0.25, 0.5);
    moss.position.set(0.15, 1.05, 0);
    g.add(moss);
    return g;
  },
  fence() {
    const g = new THREE.Group();
    for (const x of [-LANE_WIDTH / 2 + 0.3, LANE_WIDTH / 2 - 0.3]) {
      const post = new THREE.Mesh(fencePostGeo, fenceMat);
      post.position.set(x, OBJECT.fence.height / 2, 0);
      g.add(post);
    }
    for (const y of [0.55, 1.15]) {
      const rail = new THREE.Mesh(fenceRailGeo, fenceMat);
      rail.position.set(0, y, 0);
      g.add(rail);
    }
    // little heart on the top rail
    const heart = new THREE.Mesh(sphereGeo, new THREE.MeshLambertMaterial({ color: 0xff6b9d }));
    heart.scale.set(0.16, 0.16, 0.1);
    heart.position.set(0, 1.28, 0.05);
    g.add(heart);
    return g;
  },
  arch() {
    // Low rainbow arch: the inside clearance is OBJECT.arch.clearance, the
    // unicorn must duck under it.
    const g = new THREE.Group();
    archMats.forEach((mat, i) => {
      const t = new THREE.Mesh(archGeo, mat);
      t.scale.setScalar(1 + i * 0.11);
      g.add(t);
    });
    g.position.y = 0.35;
    // legs so the arch stands on the road
    for (const side of [-1, 1]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.4, 0.3), archMats[3]);
      leg.position.set(side * 1.5, -0.15, 0);
      g.add(leg);
    }
    return g;
  },
  cloud() {
    // Grumpy storm cloud: too tall to jump – change lane instead.
    const g = new THREE.Group();
    const puffs = [[0, 1.9, 0, 1.1], [-0.8, 1.6, 0.1, 0.8], [0.8, 1.6, -0.1, 0.8], [0, 1.3, 0.2, 0.9], [-0.5, 2.4, 0, 0.6], [0.5, 2.4, 0, 0.6]];
    for (const [x, y, z, s] of puffs) {
      const p = new THREE.Mesh(puffGeo, cloudMat);
      p.position.set(x, y, z);
      p.scale.setScalar(s);
      g.add(p);
    }
    // angry eyes + eyebrows
    for (const side of [-1, 1]) {
      const eye = new THREE.Mesh(sphereGeo, cloudFaceMat);
      eye.scale.setScalar(0.12);
      eye.position.set(side * 0.35, 1.95, 1.05);
      g.add(eye);
      const brow = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.08, 0.05), cloudFaceMat);
      brow.position.set(side * 0.38, 2.2, 1.08);
      brow.rotation.z = side * 0.5;
      g.add(brow);
    }
    const mouth = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.05, 6, 12, Math.PI), cloudFaceMat);
    mouth.position.set(0, 1.5, 1.08);
    g.add(mouth);
    // lightning bolt underneath
    const bolt = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.7, 4), boltMat);
    bolt.position.set(0.2, 0.65, 0.3);
    bolt.rotation.z = Math.PI;
    g.add(bolt);
    g.userData.wobble = true;
    return g;
  },
};

// `bubbleScale` multiplies the bubble size (the calm levels use big bubbles).
// An item with its own `y` (bubbles, everything on a flight course) hangs at
// that height instead of the type's default.
export function createEntity(item, bubbleScale = 1) {
  const mesh = builders[item.type]();
  const x = item.type === 'bubble' ? item.x : laneX(item.lane);
  mesh.position.x = x;
  if (item.y !== undefined) mesh.position.y = item.y;
  if (item.type === 'bubble') mesh.scale.setScalar(bubbleScale);
  mesh.userData.baseY = mesh.position.y;
  mesh.userData.phase = Math.random() * Math.PI * 2;
  return {
    type: item.type,
    lane: item.lane,
    x,
    y: mesh.position.y,
    radius: item.type === 'bubble' ? OBJECT.bubble.radius * bubbleScale : (OBJECT[item.type].radius || 0),
    mesh,
    d: item.d,
    active: true,
    pulled: false,          // flight mode: being drawn towards the unicorn
    isBubble: item.type === 'bubble',
    isObstacle: item.type === 'rock' || item.type === 'fence' || item.type === 'arch' || item.type === 'cloud',
  };
}

export function animateEntity(entity, t, dt) {
  const m = entity.mesh;
  if (entity.pulled) { if (m.userData.spin) m.rotation.y += dt * 6; return; }  // position is driven by the pull
  if (m.userData.spin) m.rotation.y += dt * 2.2;
  if (m.userData.float) {
    m.position.y = m.userData.baseY + Math.sin(t * 2.5 + m.userData.phase) * 0.18;
    entity.y = m.position.y;
  }
  if (m.userData.pulse) {
    const s = 1 + Math.sin(t * 5 + m.userData.phase) * 0.1;
    m.scale.set(s, s, s);
  }
  if (m.userData.wobble) {
    m.rotation.z = Math.sin(t * 3 + m.userData.phase) * 0.08;
    m.position.y = Math.sin(t * 2 + m.userData.phase) * 0.1;
  }
  if (entity.isBubble) {
    m.position.x = entity.x + Math.sin(t * 1.3 + m.userData.phase) * 0.35;
  }
}

export function disposeMaterialsOnce() {
  // Shared materials live for the whole session; nothing to dispose per level.
}
