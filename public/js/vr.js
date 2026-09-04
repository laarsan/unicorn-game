// WebXR support (Meta Quest browser and friends). Optional: the game runs
// exactly the same without it. Adds a VR button, maps Quest controllers to
// the game's actions, points-and-pops bubbles, and mirrors the DOM screens as
// a floating banner in front of the player since HTML isn't visible in VR.

import * as THREE from '../vendor/three.module.js';

const VR_RIG_POSITION = new THREE.Vector3(0, 2.3, 9.8); // floor origin; eyes end up ~1.6 above
const STICK_THRESHOLD = 0.6;
const BANNER_POSITION = new THREE.Vector3(0, 1.5, -3.2);

const BUTTON = { trigger: 0, squeeze: 1, stick: 3, ax: 4, by: 5 };

export class VRSupport {
  constructor(game) {
    this.game = game;
    this.active = false;
    this.controllers = [];
    this.stickState = 0;
    this.pressed = new Map();
    this.banner = null;
    this.bannerCanvas = null;
    this.bannerTexture = null;
    this.tmpMatrix = new THREE.Matrix4();
    this.raycaster = new THREE.Raycaster();
    this.mirrorScreens();
  }

  async init() {
    if (!navigator.xr || !navigator.xr.isSessionSupported) return;
    let supported = false;
    try {
      supported = await navigator.xr.isSessionSupported('immersive-vr');
    } catch (err) {
      console.warn('WebXR check failed', err);
    }
    if (!supported) return;
    const btn = document.getElementById('btn-vr');
    btn.classList.remove('hidden');
    btn.addEventListener('click', () => this.enter());
    this.game.renderer.xr.setReferenceSpaceType('local-floor');
  }

  async enter() {
    const { renderer } = this.game;
    try {
      const session = await navigator.xr.requestSession('immersive-vr', { optionalFeatures: ['local-floor', 'bounded-floor'] });
      session.addEventListener('end', () => this.exit());
      await renderer.xr.setSession(session);
      this.active = true;
      this.setupControllers();
      this.buildBanner();
      this.game.audio.unlock();
      this.updateBannerFromDom();
    } catch (err) {
      console.error('could not start VR session', err);
    }
  }

  exit() {
    this.active = false;
    if (this.banner) this.banner.visible = false;
    this.game.rig.position.copy(this.game.desktopCameraTarget());
    this.game.lastTime = 0;
  }

  setupControllers() {
    if (this.controllers.length) return;
    const { renderer, rig } = this.game;
    for (let i = 0; i < 2; i++) {
      const controller = renderer.xr.getController(i);
      controller.userData.index = i;
      controller.addEventListener('selectstart', () => this.onSelect(controller));
      controller.addEventListener('squeezestart', () => { this.game.input.duckHeld = true; });
      controller.addEventListener('squeezeend', () => { this.game.input.duckHeld = false; });
      // pointer ray for aiming at bubbles
      const geo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -6)]);
      const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 }));
      controller.add(line);
      const tip = new THREE.Mesh(new THREE.SphereGeometry(0.04, 10, 8), new THREE.MeshBasicMaterial({ color: 0xff5d8f }));
      controller.add(tip);
      rig.add(controller);
      this.controllers.push(controller);
    }
  }

  onSelect(controller) {
    const g = this.game;
    g.audio.unlock();
    if (g.state === 'playing') {
      if (!this.popBubble(controller)) g.jump();
    } else if (g.state === 'finished') {
      g.submitScore();
    } else {
      g.confirm();
    }
  }

  popBubble(controller) {
    const g = this.game;
    this.tmpMatrix.identity().extractRotation(controller.matrixWorld);
    this.raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
    this.raycaster.ray.direction.set(0, 0, -1).applyMatrix4(this.tmpMatrix);
    const bubbles = g.level.entities.filter((e) => e.isBubble && e.active);
    const hits = this.raycaster.intersectObjects(bubbles.map((b) => b.mesh), true);
    if (!hits.length) return false;
    const mesh = hits[0].object;
    const entity = bubbles.find((b) => b.mesh === mesh || b.mesh.children.includes(mesh));
    if (entity) g.collect(entity);
    return Boolean(entity);
  }

  // Poll thumbsticks and face buttons every frame.
  update() {
    if (!this.active) return;
    const session = this.game.renderer.xr.getSession();
    if (!session) return;
    let stick = 0;
    let duck = false;
    for (const source of session.inputSources) {
      const pad = source.gamepad;
      if (!pad) continue;
      const x = pad.axes.length >= 4 ? pad.axes[2] : pad.axes[0] || 0;
      if (x < -STICK_THRESHOLD) stick = -1; else if (x > STICK_THRESHOLD) stick = 1;
      const press = (i) => Boolean(pad.buttons[i] && pad.buttons[i].pressed);
      const key = source.handedness + ':ax';
      if (press(BUTTON.ax) && !this.pressed.get(key)) this.game.jump();
      this.pressed.set(key, press(BUTTON.ax));
      if (press(BUTTON.by) || press(BUTTON.squeeze)) duck = true;
    }
    if (stick !== 0 && this.stickState === 0) this.game.moveLane(stick);
    this.stickState = stick;
    this.game.input.duckHeld = duck || this.game.input.duckHeld;
  }

  // ----- banner mirroring the HTML screens -----

  mirrorScreens() {
    const ui = this.game.ui;
    const original = ui.showScreen.bind(ui);
    ui.showScreen = (name) => {
      original(name);
      if (this.active) this.updateBannerFromDom();
    };
  }

  buildBanner() {
    if (this.banner) { this.banner.visible = true; return; }
    this.bannerCanvas = document.createElement('canvas');
    this.bannerCanvas.width = 1024;
    this.bannerCanvas.height = 512;
    this.bannerTexture = new THREE.CanvasTexture(this.bannerCanvas);
    this.bannerTexture.colorSpace = THREE.SRGBColorSpace;
    const mat = new THREE.MeshBasicMaterial({ map: this.bannerTexture, transparent: true, depthTest: false });
    this.banner = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1.3), mat);
    this.banner.position.copy(BANNER_POSITION);
    this.banner.renderOrder = 999;
    this.game.rig.add(this.banner);
  }

  updateBannerFromDom() {
    if (!this.banner) return;
    const screen = ['menu', 'pause', 'levelclear', 'retry', 'finished', 'highscores', 'goodbye']
      .map((id) => document.getElementById(id))
      .find((el) => el && !el.classList.contains('hidden'));
    if (!screen) { this.banner.visible = false; return; }
    const title = (screen.querySelector('h1, h2') || {}).textContent || '';
    const body = Array.from(screen.querySelectorAll('.big-text, .rating')).map((e) => e.textContent.trim()).filter(Boolean);
    const button = screen.querySelector('button.primary');
    const hint = button ? `Avtryckare: ${button.textContent.trim()}` : '';
    const lines = [title.trim(), ...body, hint].filter(Boolean);
    const c = this.bannerCanvas, g = c.getContext('2d');
    g.clearRect(0, 0, c.width, c.height);
    g.fillStyle = 'rgba(255, 250, 253, 0.92)';
    g.beginPath(); g.roundRect(8, 8, c.width - 16, c.height - 16, 60); g.fill();
    g.strokeStyle = '#ffd23f'; g.lineWidth = 12; g.stroke();
    g.textAlign = 'center';
    g.fillStyle = '#ff5d8f';
    g.font = 'bold 72px "Comic Sans MS", "Segoe UI", sans-serif';
    g.fillText(lines[0] || '', c.width / 2, 120, c.width - 80);
    g.fillStyle = '#4a2a5a';
    g.font = '44px "Comic Sans MS", "Segoe UI", sans-serif';
    lines.slice(1).forEach((line, i) => g.fillText(line, c.width / 2, 220 + i * 70, c.width - 80));
    this.bannerTexture.needsUpdate = true;
    this.banner.visible = true;
  }

  get rigTarget() {
    return VR_RIG_POSITION;
  }
}
