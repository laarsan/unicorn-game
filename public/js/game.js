// Core game: state machine, level runtime, collisions, camera and render loop.
// Positions along the course are derived from the travelled distance each
// frame (z = -(item.d - distance)) so the layout is exact and deterministic.
// Two game modes share everything: 'run' (gallop on the rainbow, jump and
// duck past obstacles) and 'fly' (the unicorn flies, W/S climb and sink, every
// collectible is pulled in from a distance and a rainbow laser from the horn
// clears the whole sky ahead once the meter has charged).

import * as THREE from '../vendor/three.module.js';
import {
  LANE_WIDTH, SPAWN_Z, DESPAWN_Z, GRAVITY, JUMP_VELOCITY, LANE_CHANGE_SPEED, UNICORN_HALF_DEPTH,
  INVULNERABLE_SECONDS, HEARTS_PER_LEVEL, MAX_HEARTS, SPEED_RAMP_SECONDS, POINTS, OBJECT, PALETTE, FLIGHT,
} from './config.js';
import { LEVELS, generateCourse, generateFlightCourse, TIPS } from './levels.js';
import { World } from './world.js';
import { Unicorn } from './unicorn.js';
import { createEntity, animateEntity } from './entities.js';
import { Effects } from './effects.js';
import { FinishGate, WebSwingers } from './friends.js';
import {
  loadScores, saveScore, loadPlayers, savePlayers, getPlayer, setPlayer, listPlayers, DEFAULT_PLAYER_NAME,
  loadSettings, saveSettings, requestQuit, forgetLegacyStorage,
} from './scores.js';
import { VRSupport } from './vr.js';
import { starRating } from './scoreboard.js';

const CAMERA_POS = new THREE.Vector3(0, 4.3, 8.6);
const CAMERA_LOOK = new THREE.Vector3(0, 1.6, -7);
const COUNTDOWN_STEPS = ['3', '2', '1', 'Kör! 🦄'];
const COUNTDOWN_STEP_SECONDS = 0.75;
const FINISH_STOP_BEFORE_GATE = 3.2;  // the unicorn halts this far in front of the gate so friends + banner stay in view
const LEVEL_CLEAR_OVERLAY_DELAY = 3.4;  // dance + fireworks play before the result card slides in
const FIREWORKS_SECONDS = 7;
const WOW_TEXTS = ['WOW!', 'WOW!', 'SUPER!', 'HURRA!', 'FANTASTISKT!'];
const TIP_LOOKAHEAD = 55;            // units ahead at which a tip for an object type appears
const PICKUP_DZ = 1.3;
const PICKUP_DX = 1.4;
const PICKUP_DY = 1.35;
const HIT_DX = 1.3;
const SLAM_VELOCITY = -22;           // pressing duck in the air drops the unicorn fast
const ARCH_TAIL_TOLERANCE = 0.25;    // arch z beyond which standing up again is safe
const JUMP_CLEAR_TOLERANCE = 0.35;   // feet may be this far below an obstacle's top and still clear it
const HEY_COOLDOWN_SECONDS = 1.2;   // the swinging friends never shout over each other
const TIP_FOR_TYPE = { rock: 'jump', fence: 'jump', arch: 'duck', bubble: 'bubble', heart: 'heart', cloud: 'cloud' };
const HORN_TIP = new THREE.Vector3(0, 0.55, 0);   // in the horn group's space
const LASER_SHAKE = 0.5;

export class Game {
  constructor({ canvas, ui, audio, input }) {
    this.canvas = canvas;
    this.ui = ui;
    this.audio = audio;
    this.input = input;
    this.state = 'loading';
    this.t = 0;
    this.lastTime = 0;
    this.debug = { autoplay: false, timeScale: 1, hits: [], heys: 0, pulls: 0, lasers: 0, zaps: 0, noLaser: false };
    this.settings = loadSettings();
    this.mode = this.settings.mode === 'fly' ? 'fly' : 'run';
    this.scores = [];
    this.setupThree();
    this.world = new World(this.scene);
    this.unicorn = new Unicorn();
    this.scene.add(this.unicorn.group);
    this.effects = new Effects(this.scene);
    this.gate = new FinishGate(this.scene);
    this.swingers = new WebSwingers(this.scene);
    this.swingers.onCall = (i, pan) => this.friendCalls(i, pan);
    this.lastHeyAt = -Infinity;
    this.raycaster = new THREE.Raycaster();
    this.beamOrigin = new THREE.Vector3();
    this.pullTarget = new THREE.Vector3();
    this.shake = 0;
    this.player = { lane: 0, x: 0, y: 0, vy: 0, airborne: false, ducking: false };
    this.run = { levelIndex: 0, totalScore: 0, name: '' };
    this.level = null;
    this.bindInput();
    this.bindButtons();
    this.vr = new VRSupport(this);
    window.addEventListener('resize', () => this.resize());
    this.audio.setMuted(this.settings.muted);
    this.ui.setMuted(this.settings.muted);
    this.ui.setMode(this.mode);
  }

  setupThree() {
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.xr.enabled = true;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(55, 1, 0.1, 600);
    // The rig is what moves; in VR the headset drives the camera inside it.
    this.rig = new THREE.Group();
    this.rig.position.copy(CAMERA_POS);
    this.rig.add(this.camera);
    this.scene.add(this.rig);
    this.camera.lookAt(CAMERA_LOOK.clone().sub(CAMERA_POS));
    this.resize();
  }

  resize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.fov = w < h ? 70 : 55;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
  }

  // ---------- lifecycle ----------

  async boot() {
    forgetLegacyStorage();
    this.scores = await loadScores();
    this.players = loadPlayers();
    // `current` is the normalised key; show the spelling the child actually typed.
    const last = this.players.players[this.players.current];
    this.progress = last ? { ...last } : getPlayer(this.players, '');
    this.ui.playerName = last ? last.name : '';
    this.world.setTheme(LEVELS[0].theme);
    this.showMenu();
    this.vr.init();
    this.renderer.setAnimationLoop((time) => this.frame(time));
  }

  showMenu() {
    this.state = 'menu';
    this.audio.stopMusic();
    this.clearLevel();
    this.world.setTheme(LEVELS[0].theme);
    this.speed = 0;
    this.ui.renderScores('menu-scores', this.scores.slice(0, 5));
    this.ui.renderPlayers(listPlayers(this.players), (name) => { this.ui.playerName = name; this.nameTyped(name); });
    this.nameTyped(this.ui.playerName);
    this.ui.showHud(false);
    this.ui.showScreen('menu');
  }

  // The "continue" button follows whatever name is in the box: typing "Zelda"
  // again brings back Zelda's level, even after Lars has played in between.
  nameTyped(name) {
    const p = getPlayer(this.players, name);
    this.ui.setContinue(p.level > 1 && p.level <= LEVELS.length ? p.level : 1);
    this.ui.markCurrentPlayer(name);
  }

  saveProgress() {
    setPlayer(this.players, this.progress);
    savePlayers(this.players);
  }

  // 'run' or 'fly' – chosen in the menu, remembered between sessions.
  setMode(mode) {
    this.mode = mode === 'fly' ? 'fly' : 'run';
    this.settings.mode = this.mode;
    saveSettings(this.settings);
    this.ui.setMode(this.mode);
  }

  startRun(levelIndex, totalScore) {
    const name = this.ui.playerName || DEFAULT_PLAYER_NAME;
    this.progress = getPlayer(this.players, name);
    this.run = { levelIndex, totalScore, name: this.progress.name };
    this.saveProgress();
    this.startLevel(levelIndex);
  }

  continueRun() {
    const p = getPlayer(this.players, this.ui.playerName || DEFAULT_PLAYER_NAME);
    if (p.level > 1 && p.level <= LEVELS.length) this.startRun(p.level - 1, p.score || 0);
    else this.startRun(0, 0);
  }

  startLevel(index) {
    const level = LEVELS[index];
    const flying = this.mode === 'fly';
    this.clearLevel();
    this.level = {
      def: level,
      flying,
      course: flying ? generateFlightCourse(level) : generateCourse(level),
      nextItem: 0,
      entities: [],
      distance: 0,
      hearts: HEARTS_PER_LEVEL,
      score: 0,
      starsTotal: 0,
      starsGot: 0,
      invulnUntil: 0,
      tipsShown: new Set(),
      finishing: 0,
      countdownIndex: -1,
      countdownTimer: 0,
      rampTimer: 0,
      // flight mode: the laser recharges with distance travelled
      laserFiredAt: 0,
      laserCharge: 0,
      laserReadyPlayed: false,
      laserQueue: [],
    };
    this.level.starsTotal = this.level.course.filter((i) => i.type === 'star' || i.type === 'airStar').length;
    this.world.setTheme(level.theme);
    this.swingers.setVisible(Boolean(level.theme.spiders));
    this.gate.place(-level.length);
    Object.assign(this.player, { lane: 0, x: 0, y: flying ? FLIGHT.startY : 0, vy: 0, airborne: flying, ducking: false });
    this.unicorn.group.position.set(0, this.player.y, 0);
    this.speed = 0;
    this.ui.setLevel(level);
    this.ui.setHud({ hearts: this.level.hearts, score: this.run.totalScore, progress: 0 });
    this.ui.showLaser(flying);
    if (flying) this.ui.setLaser(0);
    this.ui.showHud(true);
    this.ui.showScreen(null);
    this.ui.hideTip();
    this.state = 'countdown';
    this.audio.stopMusic();
    this.advanceCountdown();
  }

  advanceCountdown() {
    const L = this.level;
    L.countdownIndex += 1;
    L.countdownTimer = COUNTDOWN_STEP_SECONDS;
    if (L.countdownIndex >= COUNTDOWN_STEPS.length) {
      this.ui.hideCountdown();
      this.state = 'playing';
      this.audio.startMusic({ tempo: L.def.theme.musicTempo, key: L.def.theme.musicKey, wave: L.def.theme.musicWave, song: L.def.theme.musicSong });
      this.audio.duckMusic(0.35);
      if (L.flying && !this.run.flyTipShown) { this.run.flyTipShown = true; this.showTipOnce('fly'); }
      else if (L.def.tips.includes('move')) this.showTipOnce('move');
      return;
    }
    const last = L.countdownIndex === COUNTDOWN_STEPS.length - 1;
    this.ui.showCountdown(COUNTDOWN_STEPS[L.countdownIndex]);
    this.audio.countdown(last);
  }

  clearLevel() {
    if (this.level) {
      for (const e of this.level.entities) this.scene.remove(e.mesh);
    }
    this.level = null;
    this.gate.hide();
    this.swingers.setVisible(false);
    this.effects.stopFireworks();
    this.ui.hideCountdown();
    this.ui.hideWow();
    this.ui.hideTip();
  }

  // ---------- input ----------

  bindInput() {
    const I = this.input;
    I.on('any', () => this.audio.unlock());
    I.on('left', () => this.moveLane(-1));
    I.on('right', () => this.moveLane(1));
    I.on('jump', () => this.jump());
    I.on('duck', () => this.slam());
    I.on('fire', () => this.fireLaser());
    I.on('confirm', () => this.confirm());
    I.on('pause', () => this.togglePause());
    I.on('click', (p) => this.click(p));
    I.on('mute', () => this.toggleMute());
    I.on('blur', () => { if (this.state === 'playing') this.togglePause(); });
  }

  bindButtons() {
    const ui = this.ui;
    const click = (fn) => () => { this.audio.unlock(); this.audio.click(); fn(); };
    ui.onButton('btn-start', click(() => this.startRun(0, 0)));
    ui.onButton('btn-continue', click(() => this.continueRun()));
    ui.onButton('btn-new-player', click(() => this.ui.newPlayer()));
    ui.onButton('btn-mode-run', click(() => this.setMode('run')));
    ui.onButton('btn-mode-fly', click(() => this.setMode('fly')));
    ui.onNameInput((name) => this.nameTyped(name));
    ui.onButton('btn-quit', click(() => this.quit()));
    ui.onButton('btn-quit2', click(() => this.quit()));
    ui.onButton('btn-mute', click(() => this.toggleMute()));
    ui.onButton('btn-pause', click(() => this.togglePause()));
    ui.onButton('btn-resume', click(() => this.togglePause()));
    ui.onButton('btn-pause-menu', click(() => this.showMenu()));
    ui.onButton('btn-next', click(() => this.nextLevel()));
    ui.onButton('btn-retry', click(() => this.startLevel(this.run.levelIndex)));
    ui.onButton('btn-retry-menu', click(() => this.showMenu()));
    ui.onButton('btn-show-scores', click(() => this.showHighscores()));
    ui.onButton('btn-again', click(() => this.startRun(0, 0)));
    // Enter in the name box continues a saved adventure if there is one, otherwise starts from level 1.
    ui.el.name.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); this.audio.unlock(); this.continueRun(); } });
  }

  confirm() {
    switch (this.state) {
      case 'menu': this.continueRun(); break;
      case 'levelclear': this.nextLevel(); break;
      case 'retry': this.startLevel(this.run.levelIndex); break;
      case 'finished': this.showHighscores(); break;
      case 'highscores': this.startRun(0, 0); break;
      case 'paused': this.togglePause(); break;
      default: break;
    }
  }

  moveLane(dir) {
    if (this.state !== 'playing' && this.state !== 'countdown') return;
    const next = THREE.MathUtils.clamp(this.player.lane + dir, -1, 1);
    if (next !== this.player.lane) this.player.lane = next;
  }

  jump() {
    if (this.state !== 'playing' && this.state !== 'countdown') return;
    if (this.level && this.level.flying) return;   // held keys climb instead – see updatePlayerMotion
    if (this.player.airborne) return;
    this.player.airborne = true;
    this.player.vy = JUMP_VELOCITY;
    this.audio.jump();
  }

  slam() {
    if (this.state !== 'playing') return;
    if (this.level && this.level.flying) return;
    if (this.player.airborne && this.player.vy > SLAM_VELOCITY) this.player.vy = SLAM_VELOCITY;
  }

  // ---------- flight mode: rainbow laser ----------

  hornPosition() {
    this.beamOrigin.copy(HORN_TIP);
    return this.unicorn.horn.localToWorld(this.beamOrigin);
  }

  // Every collectible ahead of the horn is struck, nearest first, a few
  // hundredths apart so the sky empties in a ripple and every pickup still
  // gets its own sound, glitter and points – exactly as if it had been caught.
  fireLaser() {
    if (this.state !== 'playing' || !this.level || !this.level.flying) return;
    const L = this.level;
    if (L.laserCharge < 1) {
      this.audio.laserEmpty();
      this.ui.laserDenied();
      return;
    }
    L.laserFiredAt = L.distance;
    L.laserCharge = 0;
    L.laserReadyPlayed = false;
    this.debug.lasers += 1;
    this.audio.laser();
    this.effects.fireBeam(this.hornPosition(), FLIGHT.laserBeamSeconds);
    this.shake = LASER_SHAKE;
    const targets = L.entities
      .filter((e) => e.active && !e.isObstacle && !e.zapped && e.mesh.position.z < FLIGHT.laserReach)
      .sort((a, b) => b.mesh.position.z - a.mesh.position.z);
    targets.forEach((e, i) => {
      e.zapped = true;
      L.laserQueue.push({ e, at: this.t + i * FLIGHT.laserRippleSeconds });
    });
  }

  processLaserQueue() {
    const L = this.level;
    while (L.laserQueue.length && L.laserQueue[0].at <= this.t) {
      const { e } = L.laserQueue.shift();
      if (!e.active || !L.entities.includes(e)) continue;   // scrolled out behind the camera meanwhile
      this.effects.zapBurst(e.mesh.position.clone());
      this.collect(e);
      this.debug.zaps += 1;
    }
  }

  // Flight mode: a collectible within reach drifts to the unicorn on its own.
  pullEntity(e, dt) {
    const L = this.level, P = this.player;
    const m = e.mesh.position;
    const target = this.pullTarget.set(P.x, P.y + 1.0, 0);
    const dist = target.distanceTo(m);
    if (dist < FLIGHT.catchDistance) { this.collect(e); return; }
    const step = Math.min(dist, (FLIGHT.pullSpeed + this.speed) * dt);
    m.lerp(target, step / dist);
    e.d = L.distance - m.z;      // keep the course position in step with the moved mesh
    e.x = m.x;
    e.y = m.y;
  }

  click(p) {
    if (this.state !== 'playing') return;
    this.raycaster.setFromCamera(new THREE.Vector2(p.x, p.y), this.camera);
    const bubbles = this.level.entities.filter((e) => e.isBubble && e.active);
    const hits = this.raycaster.intersectObjects(bubbles.map((b) => b.mesh), true);
    if (!hits.length) return;
    const mesh = hits[0].object;
    const entity = bubbles.find((b) => b.mesh === mesh || b.mesh.children.includes(mesh));
    if (entity) this.collect(entity);
  }

  togglePause() {
    if (this.state === 'playing') {
      this.state = 'paused';
      if (this.audio.ctx) this.audio.ctx.suspend();
      this.ui.showScreen('pause');
    } else if (this.state === 'paused') {
      this.state = 'playing';
      if (this.audio.ctx) this.audio.ctx.resume();
      this.ui.showScreen(null);
      this.lastTime = 0;
    }
  }

  toggleMute() {
    this.settings.muted = !this.settings.muted;
    saveSettings(this.settings);
    this.audio.setMuted(this.settings.muted);
    this.ui.setMuted(this.settings.muted);
  }

  async quit() {
    this.state = 'goodbye';
    this.audio.stopMusic();
    this.ui.showHud(false);
    this.ui.showScreen('goodbye');
    await requestQuit();
    setTimeout(() => window.close(), 300);
  }

  // ---------- frame ----------

  frame(time) {
    if (!this.lastTime) this.lastTime = time;
    let dt = Math.min(0.05, (time - this.lastTime) / 1000);
    this.lastTime = time;
    dt *= this.debug.timeScale;
    this.input.pollGamepad();
    this.vr.update();
    if (this.state === 'paused') { this.render(); return; }
    this.t += dt;

    if (this.state === 'countdown') this.updateCountdown(dt);
    else if (this.state === 'playing') this.updatePlaying(dt);
    else if (this.state === 'levelclear-anim') this.updateLevelClearAnim(dt);
    else if (this.state === 'menu') this.updateMenu(dt);

    const P = this.player;
    const hurt = this.level ? this.t < this.level.invulnUntil : false;
    const flying = Boolean(this.level && this.level.flying);
    this.unicorn.group.position.set(P.x, P.y, 0);
    this.unicorn.animate(this.t, dt, {
      speed: this.state === 'countdown' ? 4 : this.speed,
      airborne: P.airborne, y: P.y, ducking: P.ducking, hurt,
      celebrating: this.state === 'levelclear-anim' || this.state === 'levelclear',
      flying: flying && P.airborne, wings: flying, vy: P.vy,
    });
    this.world.update(dt, this.speed, this.t);
    this.gate.update(dt, 0, this.t);
    this.swingers.update(dt, this.speed, this.t);
    if (this.speed > 1) this.effects.updateTrail(dt, this.unicorn.group.position, this.speed);
    this.effects.update(dt, this.speed, this.effects.beam.active ? this.hornPosition() : null);
    this.updateCamera(dt);
    this.render();
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }

  desktopCameraTarget() {
    return CAMERA_POS.clone();
  }

  updateCamera(dt) {
    const P = this.player;
    const target = this.vr.active ? this.vr.rigTarget.clone() : CAMERA_POS.clone();
    target.x += P.x * 0.35;
    if (!this.vr.active) target.y += P.y * 0.25;
    if (this.shake > 0) {
      this.shake = Math.max(0, this.shake - dt * 3);
      target.x += (Math.random() - 0.5) * this.shake * 0.6;
      target.y += (Math.random() - 0.5) * this.shake * 0.4;
    }
    this.rig.position.lerp(target, 1 - Math.exp(-dt * 8));
  }

  updateMenu(dt) {
    // The unicorn trots gently in place behind the menu.
    this.speed = THREE.MathUtils.damp(this.speed, 5, 2, dt);
    this.player.x = THREE.MathUtils.damp(this.player.x, 0, 5, dt);
  }

  updateCountdown(dt) {
    const L = this.level;
    L.countdownTimer -= dt;
    this.updatePlayerMotion(dt);
    if (L.countdownTimer <= 0) this.advanceCountdown();
  }

  updatePlayerMotion(dt) {
    const P = this.player;
    const targetX = P.lane * LANE_WIDTH;
    const dx = targetX - P.x;
    const step = LANE_CHANGE_SPEED * dt;
    P.x = Math.abs(dx) <= step ? targetX : P.x + Math.sign(dx) * step;
    if (this.level && this.level.flying) {
      this.updateFlight(dt);
      return;
    }
    if (P.airborne) {
      P.vy -= GRAVITY * dt;
      P.y += P.vy * dt;
      if (P.y <= 0) { P.y = 0; P.vy = 0; P.airborne = false; }
    }
    P.ducking = !P.airborne && this.input.ducking && this.state === 'playing';
  }

  // Flight mode: climb while a jump key is held, sink while duck is held,
  // hover otherwise. After the finish line the unicorn glides down to land.
  updateFlight(dt) {
    const P = this.player;
    const inFlight = this.state === 'playing' || this.state === 'countdown';
    if (!inFlight) {
      P.vy = THREE.MathUtils.damp(P.vy, -2, 4, dt);
      P.y = Math.max(0, P.y + P.vy * dt);
      if (P.y <= 0) { P.y = 0; P.vy = 0; P.airborne = false; }
      P.ducking = false;
      return;
    }
    const up = this.input.climbing, down = this.input.ducking;
    const targetVy = up && !down ? FLIGHT.climbSpeed : down && !up ? -FLIGHT.climbSpeed : 0;
    P.vy = THREE.MathUtils.damp(P.vy, targetVy, 9, dt);
    P.y = THREE.MathUtils.clamp(P.y + P.vy * dt, FLIGHT.minY, FLIGHT.maxY);
    if (P.y === FLIGHT.minY || P.y === FLIGHT.maxY) P.vy = 0;
    P.airborne = true;
    P.ducking = false;
  }

  updateLaserCharge() {
    const L = this.level;
    L.laserCharge = Math.min(1, (L.distance - L.laserFiredAt) / (L.def.length * FLIGHT.laserEvery));
    if (L.laserCharge >= 1 && !L.laserReadyPlayed) {
      L.laserReadyPlayed = true;
      this.audio.laserReady();
      if (!this.run.laserTipShown) { this.run.laserTipShown = true; this.showTipOnce('laser'); }
    }
    this.ui.setLaser(L.laserCharge);
    this.processLaserQueue();
  }

  updatePlaying(dt) {
    const L = this.level;
    if (this.debug.autoplay) this.autoplay();
    // speed ramp
    L.rampTimer = Math.min(SPEED_RAMP_SECONDS, L.rampTimer + dt);
    const ramp = L.rampTimer / SPEED_RAMP_SECONDS;
    this.speed = L.def.speed * (1 - Math.pow(1 - ramp, 2));
    L.distance += this.speed * dt;

    this.updatePlayerMotion(dt);
    this.spawnAhead();
    this.updateEntities(dt);
    if (L.flying) this.updateLaserCharge();
    this.gate.group.position.z = -(L.def.length - L.distance);
    this.checkTips();

    const progress = Math.min(1, L.distance / L.def.length);
    this.ui.setHud({ hearts: L.hearts, score: this.run.totalScore + L.score, progress });

    if (L.distance >= L.def.length - FINISH_STOP_BEFORE_GATE) this.beginLevelClear();
  }

  spawnAhead() {
    const L = this.level;
    while (L.nextItem < L.course.length && L.course[L.nextItem].d - L.distance < -SPAWN_Z) {
      const entity = createEntity(L.course[L.nextItem], L.def.bubbleScale);
      L.entities.push(entity);
      this.scene.add(entity.mesh);
      L.nextItem += 1;
    }
  }

  updateEntities(dt) {
    const L = this.level, P = this.player;
    const hurt = this.t < L.invulnUntil;
    const bodyY = P.y + 1.0;
    for (let i = L.entities.length - 1; i >= 0; i--) {
      const e = L.entities[i];
      const z = -(e.d - L.distance);
      e.mesh.position.z = z;
      if (z > DESPAWN_Z) {
        this.scene.remove(e.mesh);
        L.entities.splice(i, 1);
        continue;
      }
      animateEntity(e, this.t, dt);
      if (!e.active) continue;
      const dx = Math.abs(e.mesh.position.x - P.x);
      if (L.flying) {
        // No need to touch anything: whatever comes within reach is drawn in.
        // A laser target stays put until the ripple reaches it.
        if (e.zapped) continue;
        if (e.pulled) { this.pullEntity(e, dt); continue; }
        const reachY = FLIGHT.attract.dy + (e.isBubble ? e.radius * 0.5 : 0);
        if (z < FLIGHT.laserReach && z > -FLIGHT.attract.ahead && dx < FLIGHT.attract.dx && Math.abs(e.y - bodyY) < reachY) {
          e.pulled = true;
          this.debug.pulls += 1;
        }
        continue;
      }
      if (e.isObstacle) {
        const spec = OBJECT[e.type];
        // Arches only matter while they are over the unicorn's head/neck (front
        // half): releasing the duck key once the arch is behind the ears is fine.
        // Hit windows are generous towards the player: an obstacle only counts
        // while it is in front of / under the unicorn's chest, never once it has
        // passed behind the shoulders (so landing just behind a rock is safe).
        const front = -(spec.halfDepth + UNICORN_HALF_DEPTH * 0.7);
        const back = e.type === 'arch' ? ARCH_TAIL_TOLERANCE : spec.halfDepth * 0.5;
        if (z > front && z < back && dx < HIT_DX) {
          let hit;
          if (e.type === 'arch') hit = P.y + this.unicorn.height > spec.clearance;
          else hit = P.y < spec.height - JUMP_CLEAR_TOLERANCE;
          if (hit && !hurt) this.hurt(e);
        }
      } else {
        // Bubbles are also popped by running through them; their hit box grows with their size.
        const extra = e.isBubble ? Math.max(0, e.radius - OBJECT.bubble.radius * 0.6) : 0;
        if (Math.abs(z) < PICKUP_DZ + extra && dx < PICKUP_DX + extra && Math.abs(e.y - bodyY) < PICKUP_DY + extra) this.collect(e);
      }
    }
  }

  collect(e) {
    const L = this.level;
    e.active = false;
    const pos = e.mesh.position.clone();
    let points = POINTS.star, color = 0xffe14a, label = null;
    if (e.type === 'bubble') { points = POINTS.bubble; color = 0x9fdcff; this.audio.bubble(); }
    else if (e.type === 'candy') { points = POINTS.candy; color = 0xff8ad8; this.audio.candy(); }
    else if (e.type === 'crystal') { points = POINTS.crystal; color = 0x7fd8ff; this.audio.crystal(); }
    else if (e.type === 'heart') {
      points = POINTS.heart; color = 0xff5d8f; this.audio.heart();
      if (L.hearts < MAX_HEARTS) { L.hearts += 1; label = '💖 +1 liv'; }
    }
    else { this.audio.star(); L.starsGot += 1; }
    L.score += points;
    this.effects.pickupBurst(pos, color, e.type === 'star' || e.type === 'airStar' ? 14 : 24);
    const ndc = pos.project(this.camera);
    this.ui.popup(label || `+${points}`, ndc.x, ndc.y);
    this.scene.remove(e.mesh);
    const idx = L.entities.indexOf(e);
    if (idx >= 0) L.entities.splice(idx, 1);
  }

  hurt(obstacle) {
    const L = this.level;
    this.debug.hits.push({ type: obstacle.type, d: Math.round(L.distance), z: +obstacle.mesh.position.z.toFixed(2), x: +this.player.x.toFixed(2), ox: obstacle.mesh.position.x, y: +this.player.y.toFixed(2), h: +this.unicorn.height.toFixed(2), duck: this.player.ducking, air: this.player.airborne });
    L.hearts -= 1;
    L.invulnUntil = this.t + INVULNERABLE_SECONDS;
    this.shake = 1;
    this.audio.hit();
    this.ui.flash();
    this.effects.pickupBurst(obstacle.mesh.position.clone().setY(1.2), 0xffffff, 10);
    if (L.hearts <= 0) this.beginRetry();
  }

  // A spider friend swinging past in the background shouts "heey!".
  friendCalls(index, pan) {
    if (this.state !== 'playing') return;
    if (this.t - this.lastHeyAt < HEY_COOLDOWN_SECONDS) return;
    this.lastHeyAt = this.t;
    this.debug.heys += 1;
    this.audio.hey(index, pan);
  }

  checkTips() {
    const L = this.level;
    const ahead = L.distance + TIP_LOOKAHEAD;
    for (let i = L.nextItem - 1; i >= 0; i--) {
      const it = L.course[i];
      if (it.d < L.distance) break;
      if (it.d > ahead) continue;
      const tip = TIP_FOR_TYPE[it.type] || null;
      if (tip && L.def.tips.includes(tip)) this.showTipOnce(tip);
    }
  }

  showTipOnce(name) {
    const L = this.level;
    if (L.tipsShown.has(name)) return;
    L.tipsShown.add(name);
    this.ui.showTip(TIPS[name], 4.5);
  }

  // ---------- level end ----------

  beginLevelClear() {
    const L = this.level;
    this.state = 'levelclear-anim';
    L.finishing = 0;
    L.score += POINTS.levelClear + L.hearts * POINTS.perHeart;
    this.gate.celebrating = true;
    this.audio.stopMusic();
    this.audio.fanfare();
    this.effects.startConfetti(new THREE.Vector3(0, 2, -2), 3.5);
    this.effects.startFireworks(FIREWORKS_SECONDS, () => this.audio.firework());
    this.ui.hideTip();
    this.ui.showWow(WOW_TEXTS[Math.floor(Math.random() * WOW_TEXTS.length)]);
    this.ui.setHud({ hearts: L.hearts, score: this.run.totalScore + L.score, progress: 1 });
  }

  updateLevelClearAnim(dt) {
    const L = this.level;
    L.finishing += dt;
    this.speed = THREE.MathUtils.damp(this.speed, 0, 5, dt);
    L.distance = Math.min(L.def.length - 1.5, L.distance + this.speed * dt);
    this.player.lane = 0;
    this.updatePlayerMotion(dt);
    this.updateEntities(dt);
    this.gate.group.position.z = -(L.def.length - L.distance);
    if (L.finishing >= LEVEL_CLEAR_OVERLAY_DELAY && this.state === 'levelclear-anim') {
      this.state = 'levelclear';
      this.ui.hideWow();
      const stars = starRating(L.starsGot, L.starsTotal);
      this.run.totalScore += L.score;
      const isLast = this.run.levelIndex === LEVELS.length - 1;
      this.progress.level = isLast ? 1 : this.run.levelIndex + 2;
      this.progress.score = isLast ? 0 : this.run.totalScore;
      this.progress.bestLevel = Math.max(this.progress.bestLevel || 0, this.run.levelIndex + 1);
      this.saveProgress();
      this.recordScore();
      this.ui.showLevelClear({ level: L.def, stars, levelScore: L.score, totalScore: this.run.totalScore, isLast });
    }
  }

  nextLevel() {
    if (this.state !== 'levelclear') return;
    if (this.run.levelIndex >= LEVELS.length - 1) {
      this.finishAdventure();
      return;
    }
    this.run.levelIndex += 1;
    this.startLevel(this.run.levelIndex);
  }

  beginRetry() {
    this.state = 'retry';
    this.audio.stopMusic();
    this.audio.retry();
    this.ui.hideTip();
    this.ui.showScreen('retry');
  }

  finishAdventure() {
    this.state = 'finished';
    this.clearLevel();
    this.ui.showHud(false);
    this.audio.bigFanfare();
    this.effects.startConfetti(new THREE.Vector3(0, 2, 0), 6);
    this.effects.startFireworks(FIREWORKS_SECONDS * 2, () => this.audio.firework());
    this.ui.showFinished(this.run.totalScore, this.run.name);
  }

  // The top list is updated after every cleared level, so a child who stops
  // after level 3 is on it too. `recording` lets the finish screen wait for
  // the last save before showing the list.
  recordScore() {
    const entry = { name: this.run.name || DEFAULT_PLAYER_NAME, score: this.run.totalScore, levels: this.run.levelIndex + 1, mode: this.mode };
    this.recording = saveScore(entry).then((scores) => { this.scores = scores; }).catch((err) => console.warn('score not saved', err));
    return this.recording;
  }

  async showHighscores() {
    if (this.state !== 'finished') return;
    this.state = 'saving';
    await this.recording;
    this.ui.renderScores('highscore-list', this.scores, this.run.name);
    this.state = 'highscores';
    this.ui.showScreen('highscores');
  }

  // ---------- test helper: a simple bot that plays the level ----------

  autoplay() {
    const L = this.level, P = this.player;
    const laneOf = (e) => Math.round(e.mesh.position.x / LANE_WIDTH);
    if (L.flying) {
      // steer towards the nearest collectible ahead and fire whenever the laser is charged
      const target = L.entities
        .filter((e) => e.active && !e.zapped && !e.pulled && e.mesh.position.z < 0 && e.mesh.position.z > -40)
        .sort((a, b) => b.mesh.position.z - a.mesh.position.z)[0];
      if (target) {
        P.lane = THREE.MathUtils.clamp(laneOf(target), -1, 1);
        const wantY = target.mesh.position.y - 1.0;
        this.input.upHeld = wantY > P.y + 0.3;
        this.input.duckHeld = wantY < P.y - 0.3;
      } else {
        this.input.upHeld = false;
        this.input.duckHeld = false;
      }
      if (L.laserCharge >= 1 && !this.debug.noLaser) this.fireLaser();
      return;
    }
    const ahead = L.entities.filter((e) => e.active && e.mesh.position.z < 1.2 && e.mesh.position.z > -14);
    const inLane = (lane) => ahead.filter((e) => laneOf(e) === lane);
    const blocking = (lane) => inLane(lane).some((e) => e.type === 'cloud');
    // change lane away from clouds
    if (blocking(P.lane)) {
      const free = [-1, 0, 1].find((l) => !blocking(l) && Math.abs(l - P.lane) === 1) ?? [-1, 0, 1].find((l) => !blocking(l));
      if (free !== undefined) P.lane = free;
    }
    const near = inLane(P.lane);
    if (near.some((e) => (e.type === 'rock' || e.type === 'fence') && e.mesh.position.z > -5.5)) this.jump();
    else if (near.some((e) => (e.type === 'crystal' || e.type === 'airStar') && e.mesh.position.z > -4)) this.jump();
    const arch = inLane(P.lane).find((e) => e.type === 'arch' && e.mesh.position.z > -4);
    this.input.duckHeld = Boolean(arch);
    // pop the first bubble in view
    const bubble = ahead.find((e) => e.isBubble && e.mesh.position.z > -10);
    if (bubble) this.collect(bubble);
    // steer towards a heart when the lane is otherwise safe
    const heart = ahead.find((e) => e.type === 'heart' && e.mesh.position.z > -12);
    if (heart && !blocking(laneOf(heart)) && !inLane(laneOf(heart)).some((e) => e.isObstacle)) P.lane = laneOf(heart);
  }
}

export { LEVELS, PALETTE };
