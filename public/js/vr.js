// WebXR support (Meta Quest 3 browser and friends). Optional: the game runs
// exactly the same without it. Adds a VR button, maps the Quest controllers
// to the game's actions in both game modes, points-and-pops bubbles, and –
// since HTML is invisible inside the headset – mirrors the DOM as two floating
// panels on the camera rig: a banner for menus, countdown, tips and "WOW!",
// and a HUD strip below eye level with hearts, level, score, progress and
// the rainbow-laser meter. Both panels redraw only when their content changes.
//
// Controller mapping (either hand):
//   styrspak ◀ ▶   byt fil – i menyn: byt spelsätt
//   styrspak ▲ ▼   flyg upp / ner (flygläget), ▼ duckar i galoppläget
//   avtryckare     galopp: poppa bubblan man pekar på, annars hoppa
//                  flyg:   regnbågslaser · menyer: den gula knappen
//   A / X          hoppa (galopp) · håll inne = flyg upp (flyg)
//   B / Y, grepp   håll inne = ducka (galopp) / flyg ner (flyg) · menyer: "Till menyn"
//   styrspak-klick paus

import * as THREE from '../vendor/three.module.js';
import { TIPS } from './levels.js';

const VR_RIG_POSITION = new THREE.Vector3(0, 2.3, 9.8); // floor origin; eyes end up ~1.6 above
const STICK_THRESHOLD = 0.6;
const BANNER_POSITION = new THREE.Vector3(0, 1.5, -3.2);  // eye level, ~3 m ahead
const BANNER_SIZE = { w: 2.6, h: 1.625, px: 1024, py: 640 };
const HUD_POSITION = new THREE.Vector3(0, 0.62, -2.6);    // ~20° below the eyes, tilted up towards them
const HUD_TILT = 0.32;
const HUD_SIZE = { w: 2.1, h: 0.525, px: 1024, py: 256 };
const HUD_SCREENS = ['menu', 'pause', 'levelclear', 'retry', 'finished', 'highscores', 'goodbye'];
const BANNER_SCORE_ROWS = 5;
const READY_BLINK_HZ = 3;

const BUTTON = { trigger: 0, squeeze: 1, stick: 3, ax: 4, by: 5 };
const FONT = '"Comic Sans MS", "Segoe UI", sans-serif';
const COLOR = { pink: '#ff5d8f', plum: '#4a2a5a', lilac: '#9b7bff', sun: '#ffd23f', card: 'rgba(255, 250, 253, 0.92)' };

// The DOM tips name keyboard keys; in the headset the same advice is given
// for the controllers.
const VR_TIPS = {
  move: 'Byt fil med styrspaken ◀ ▶',
  fly: 'Flyg upp med A eller X och ner med B eller Y',
  laser: 'Mätaren är full – tryck på avtryckaren för regnbågslaser!',
  jump: 'Hoppa med avtryckaren eller A',
  duck: 'Ducka med greppknappen (håll inne)',
  bubble: 'Peka på bubblan och tryck på avtryckaren!',
};
const VR_LASER_READY = '✨ REDO! Tryck på avtryckaren';

export class VRSupport {
  constructor(game) {
    this.game = game;
    this.active = false;
    this.controllers = [];
    this.stickState = 0;
    this.pressed = new Map();
    this.held = { climb: false, duck: false };
    this.banner = null;
    this.hud = null;
    this.bannerSignature = '';
    this.hudSignature = '';
    this.tmpMatrix = new THREE.Matrix4();
    this.raycaster = new THREE.Raycaster();
  }

  async init() {
    this.showAddress();
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

  // On the PC the menu footer tells the grown-up where to point the headset;
  // the server only knows the address once the certificate exists.
  async showAddress() {
    const el = document.getElementById('vr-address');
    if (!el || location.protocol === 'https:') return;
    try {
      const health = await fetch('/api/health').then((r) => r.json());
      if (!health.https || !health.lan || !health.lan.length) return;
      el.textContent = '🥽 VR i Quest-webbläsaren: ' + health.lan.map((ip) => `https://${ip}:${health.httpsPort}`).join('  ·  ');
      el.classList.remove('hidden');
    } catch (err) {
      console.warn('could not read /api/health', err);
    }
  }

  async enter() {
    const { renderer } = this.game;
    try {
      const session = await navigator.xr.requestSession('immersive-vr', { optionalFeatures: ['local-floor', 'bounded-floor'] });
      session.addEventListener('end', () => this.exit());
      await renderer.xr.setSession(session);
      this.preferSmoothFrameRate(session);
      this.active = true;
      this.setupControllers();
      this.buildBanner();
      this.buildHud();
      this.bannerSignature = '';
      this.hudSignature = '';
      this.game.audio.unlock();
    } catch (err) {
      console.error('could not start VR session', err);
    }
  }

  // Quest 3 offers 72/90/120 Hz; 90 is the sweet spot for a scrolling world.
  preferSmoothFrameRate(session) {
    if (!session.supportedFrameRates || !session.updateTargetFrameRate) return;
    const rates = Array.from(session.supportedFrameRates).filter((r) => r <= 90);
    if (!rates.length) return;
    session.updateTargetFrameRate(Math.max(...rates)).catch((err) => console.warn('frame rate request failed', err));
  }

  exit() {
    this.active = false;
    if (this.banner) this.banner.visible = false;
    if (this.hud) this.hud.visible = false;
    this.held = { climb: false, duck: false };
    this.game.input.xr.climb = false;
    this.game.input.xr.duck = false;
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

  // Trigger: the "do it" button. Flying it fires the laser, galloping it pops
  // the bubble the controller points at (or jumps), on a screen it presses
  // the yellow button.
  onSelect(controller) {
    const g = this.game;
    g.audio.unlock();
    if (g.state === 'playing') {
      if (g.level && g.level.flying) g.fireLaser();
      else if (!this.popBubble(controller)) g.jump();
    } else if (g.state !== 'countdown') {
      g.audio.click();
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

  // Sideways stick: lanes while playing, game mode in the menu.
  onStick(dir) {
    const g = this.game;
    if (g.state === 'menu') {
      g.audio.click();
      g.setMode(dir < 0 ? 'run' : 'fly');
    } else {
      g.moveLane(dir);
    }
  }

  // B / Y: the second, white button on the pause and retry cards.
  onSecondary() {
    const g = this.game;
    if (g.state === 'paused' || g.state === 'retry') {
      g.audio.click();
      g.showMenu();
    }
  }

  onStickClick() {
    const g = this.game;
    if (g.state === 'playing' || g.state === 'paused') g.togglePause();
  }

  // Poll controllers and refresh the panels every frame.
  update() {
    if (!this.active) return;
    const session = this.game.renderer.xr.getSession();
    if (session) this.applyInputSources(session.inputSources);
    this.refreshBanner();
    this.refreshHud();
  }

  // Reads thumbsticks and buttons of every input source (called with the
  // session's list; tests feed fake sources). Held buttons become the game's
  // climb / duck flags, presses fire once on the rising edge.
  applyInputSources(sources) {
    const g = this.game;
    let stickX = 0, stickY = 0, climb = false, duck = false;
    for (const source of sources) {
      const pad = source.gamepad;
      if (!pad) continue;
      const axes = pad.axes || [];
      const x = axes.length >= 4 ? axes[2] : axes[0] || 0;
      const y = axes.length >= 4 ? axes[3] : axes[1] || 0;
      if (Math.abs(x) > Math.abs(stickX)) stickX = x;
      if (Math.abs(y) > Math.abs(stickY)) stickY = y;
      const press = (i) => Boolean(pad.buttons && pad.buttons[i] && pad.buttons[i].pressed);
      const hand = source.handedness || 'none';
      if (this.risingEdge(hand + ':ax', press(BUTTON.ax))) g.jump();
      if (this.risingEdge(hand + ':by', press(BUTTON.by))) this.onSecondary();
      if (this.risingEdge(hand + ':stick', press(BUTTON.stick))) this.onStickClick();
      if (press(BUTTON.ax)) climb = true;
      if (press(BUTTON.by) || press(BUTTON.squeeze)) duck = true;
    }
    const stick = stickX < -STICK_THRESHOLD ? -1 : stickX > STICK_THRESHOLD ? 1 : 0;
    if (stick !== 0 && this.stickState === 0) this.onStick(stick);
    this.stickState = stick;
    if (stickY < -STICK_THRESHOLD) climb = true;      // stick forward = up
    else if (stickY > STICK_THRESHOLD) duck = true;   // stick back = down / duck
    if (duck && !this.held.duck) g.slam();
    this.held = { climb, duck };
    g.input.xr.climb = climb;
    g.input.xr.duck = duck;
  }

  risingEdge(key, pressed) {
    const was = this.pressed.get(key) || false;
    this.pressed.set(key, pressed);
    return pressed && !was;
  }

  // ----- panels -----

  makePanel(size, position) {
    const canvas = document.createElement('canvas');
    canvas.width = size.px;
    canvas.height = size.py;
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const mat = new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthTest: false, fog: false });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(size.w, size.h), mat);
    mesh.position.copy(position);
    mesh.renderOrder = 999;
    mesh.visible = false;
    mesh.userData.canvas = canvas;
    mesh.userData.texture = texture;
    this.game.rig.add(mesh);
    return mesh;
  }

  buildBanner() {
    if (!this.banner) this.banner = this.makePanel(BANNER_SIZE, BANNER_POSITION);
  }

  buildHud() {
    if (!this.hud) {
      this.hud = this.makePanel(HUD_SIZE, HUD_POSITION);
      this.hud.rotation.x = HUD_TILT;
    }
  }

  // What the banner should say right now: the visible screen, otherwise the
  // transient HUD texts (countdown, WOW!, tip), otherwise nothing.
  bannerContent() {
    const $ = (id) => document.getElementById(id);
    const visible = (el) => Boolean(el) && !el.classList.contains('hidden');
    const screenId = HUD_SCREENS.find((id) => visible($(id)));
    if (screenId) return this.screenContent(screenId, $(screenId));
    const lines = [];
    if (visible($('countdown'))) lines.push({ text: $('countdown').textContent.trim(), size: 190, color: COLOR.pink });
    if (visible($('wow'))) lines.push({ text: $('wow').textContent.trim(), size: 150, color: COLOR.pink });
    if (visible($('tip'))) lines.push({ text: `${$('tip-icon').textContent} ${this.translateTip($('tip-text').textContent)}`, size: 48, color: COLOR.plum });
    return lines.length ? { lines, compact: true } : null;
  }

  translateTip(domText) {
    const key = Object.keys(TIPS).find((k) => TIPS[k].text === domText.trim());
    return (key && VR_TIPS[key]) || domText.trim();
  }

  screenContent(id, screen) {
    const q = (sel) => screen.querySelector(sel);
    const text = (el) => (el ? el.textContent.trim() : '');
    const title = text(q('h1, h2'));
    const lines = [{ text: title, size: 72, color: COLOR.pink }];
    const body = (t) => lines.push({ text: t, size: 44, color: COLOR.plum });
    const hint = (t) => lines.push({ text: t, size: 40, color: COLOR.lilac });
    if (id === 'menu') {
      const g = this.game;
      body(`👤 ${g.ui.playerName || 'Enhörningsvän'}`);
      body(`${g.mode === 'fly' ? '○' : '●'} 🌈 Galoppera    ${g.mode === 'fly' ? '●' : '○'} ☁️ Flyga`);
      const best = q('#menu-scores li');
      if (best) body(`🏆 ${text(best.querySelector('.name'))}  ${text(best.querySelector('.points'))}`);
      hint('Styrspak ◀ ▶: byt spelsätt');
    } else if (id === 'levelclear') {
      const on = screen.querySelectorAll('.rating .star.on').length;
      lines.push({ text: '⭐'.repeat(on) + '☆'.repeat(3 - on), size: 96, color: COLOR.sun });
      body(text(q('.big-text')));
    } else if (id === 'highscores') {
      const rows = Array.from(screen.querySelectorAll('li')).slice(0, BANNER_SCORE_ROWS);
      if (!rows.length) body(text(q('.empty')));
      for (const li of rows) {
        body(`${text(li.querySelector('.rank'))} ${text(li.querySelector('.name'))}  ${text(li.querySelector('.level'))}  ${text(li.querySelector('.points'))}`);
      }
    } else {
      const big = q('.big-text');
      if (big) body(text(big));
    }
    const primary = Array.from(screen.querySelectorAll('button.primary')).find((b) => !b.classList.contains('hidden'));
    if (primary) hint(`Avtryckare: ${text(primary)}`);
    if (id === 'pause' || id === 'retry') hint('B / Y: Till menyn');
    return { lines, compact: false };
  }

  refreshBanner() {
    if (!this.banner) return;
    const content = this.bannerContent();
    const signature = content ? JSON.stringify(content) : '';
    if (signature === this.bannerSignature) return;
    this.bannerSignature = signature;
    if (!content) { this.banner.visible = false; return; }
    this.drawBanner(content);
    this.banner.visible = true;
  }

  drawBanner({ lines, compact }) {
    const c = this.banner.userData.canvas, g = c.getContext('2d');
    g.clearRect(0, 0, c.width, c.height);
    const total = lines.reduce((sum, l) => sum + l.size * 1.3, 0);
    const pad = 40;
    const cardH = Math.min(c.height, total + pad * 2);
    const top = compact ? (c.height - cardH) / 2 : 0;
    g.fillStyle = COLOR.card;
    g.beginPath(); g.roundRect(8, top + 8, c.width - 16, cardH - 16, 60); g.fill();
    g.strokeStyle = COLOR.sun; g.lineWidth = 12; g.stroke();
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    let y = top + pad;
    for (const line of lines) {
      const h = line.size * 1.3;
      g.fillStyle = line.color;
      g.font = `${line.size >= 72 ? 'bold ' : ''}${line.size}px ${FONT}`;
      g.fillText(line.text, c.width / 2, y + h / 2, c.width - 80);
      y += h;
    }
    this.banner.userData.texture.needsUpdate = true;
  }

  // The HUD strip mirrors the DOM HUD (#hud) so both always agree.
  hudContent() {
    const $ = (id) => document.getElementById(id);
    if ($('hud').classList.contains('hidden')) return null;
    const hearts = Array.from($('hud-hearts').querySelectorAll('.heart')).map((h) => !h.classList.contains('lost'));
    const laserEl = $('hud-laser');
    const laser = laserEl.classList.contains('hidden') ? null : {
      fill: parseFloat($('hud-laser-fill').style.width) || 0,
      ready: laserEl.classList.contains('ready'),
    };
    const blink = laser && laser.ready ? Math.floor(this.game.t * READY_BLINK_HZ) % 2 : 0;
    return {
      hearts,
      level: $('hud-level').textContent,
      score: $('hud-score').textContent,
      progress: parseFloat($('hud-progress-fill').style.width) || 0,
      laser,
      blink,
    };
  }

  refreshHud() {
    if (!this.hud) return;
    const content = this.hudContent();
    const signature = content ? JSON.stringify(content) : '';
    if (signature === this.hudSignature) return;
    this.hudSignature = signature;
    if (!content) { this.hud.visible = false; return; }
    this.drawHud(content);
    this.hud.visible = true;
  }

  drawHud({ hearts, level, score, progress, laser, blink }) {
    const c = this.hud.userData.canvas, g = c.getContext('2d');
    g.clearRect(0, 0, c.width, c.height);
    g.fillStyle = COLOR.card;
    g.beginPath(); g.roundRect(6, 6, c.width - 12, c.height - 12, 48); g.fill();
    g.strokeStyle = laser && laser.ready && blink ? COLOR.sun : '#ffffff'; g.lineWidth = 10; g.stroke();
    g.textBaseline = 'middle';
    // top row: hearts · level · score
    g.font = `bold 44px ${FONT}`;
    g.textAlign = 'left';
    hearts.forEach((alive, i) => {
      g.globalAlpha = alive ? 1 : 0.3;
      g.fillText('💖', 40 + i * 52, 60);
    });
    g.globalAlpha = 1;
    g.textAlign = 'center';
    g.fillStyle = COLOR.plum;
    g.fillText(level, c.width / 2, 60, 440);
    g.textAlign = 'right';
    g.fillStyle = COLOR.pink;
    g.fillText(score, c.width - 40, 60);
    // progress bar with the unicorn on it
    const barX = 40, barW = c.width - 80, barY = 120, barH = 22;
    g.fillStyle = 'rgba(155, 123, 255, 0.25)';
    g.beginPath(); g.roundRect(barX, barY, barW, barH, 11); g.fill();
    g.fillStyle = COLOR.lilac;
    g.beginPath(); g.roundRect(barX, barY, Math.max(barH, barW * progress / 100), barH, 11); g.fill();
    g.font = `36px ${FONT}`;
    g.textAlign = 'center';
    g.fillText('🏁', barX + barW, barY + barH / 2 - 6);
    g.fillText('🦄', barX + barW * progress / 100, barY + barH / 2 - 6);
    this.hud.userData.texture.needsUpdate = true;
    if (!laser) return;
    // flight mode: rainbow laser meter
    const meterY = 190, meterH = 30, meterX = 400, meterW = c.width - 440;
    g.textAlign = 'left';
    g.font = `bold 34px ${FONT}`;
    g.fillStyle = laser.ready ? COLOR.pink : COLOR.lilac;
    g.fillText(laser.ready ? VR_LASER_READY : '🌈 Regnbågslaser laddar…', 40, meterY + meterH / 2, meterX - 60);
    g.fillStyle = 'rgba(155, 123, 255, 0.25)';
    g.beginPath(); g.roundRect(meterX, meterY, meterW, meterH, 15); g.fill();
    const grad = g.createLinearGradient(meterX, 0, meterX + meterW, 0);
    ['#ff5d8f', '#ff9f43', '#ffe066', '#7bed9f', '#70c1ff', '#9b7bff'].forEach((col, i, arr) => grad.addColorStop(i / (arr.length - 1), col));
    g.fillStyle = grad;
    g.beginPath(); g.roundRect(meterX, meterY, Math.max(meterH, meterW * Math.min(100, laser.fill) / 100), meterH, 15); g.fill();
    if (laser.ready && blink) { g.font = `34px ${FONT}`; g.fillText('✨', meterX + meterW + 4, meterY + meterH / 2); }
  }

  get rigTarget() {
    return VR_RIG_POSITION;
  }
}
