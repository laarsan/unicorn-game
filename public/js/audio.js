// All sound is synthesised with the Web Audio API – no audio files.
// Sound effects are short envelope-shaped oscillators; music is a small
// step sequencer scheduled ahead of time (lookahead pattern).

const MELODY = [ // midi numbers, 8 bars × 8 eighth notes, C major
  72, 76, 79, 76, 81, 79, 76, 74,
  72, 76, 79, 81, 79, null, 76, null,
  74, 77, 81, 77, 79, 77, 76, 74,
  72, null, 76, null, 79, null, null, null,
  84, 83, 81, 79, 81, 79, 77, 76,
  77, 79, 81, 77, 79, null, 76, null,
  74, 76, 77, 79, 81, 79, 77, 74,
  72, null, 76, null, 72, null, null, null,
];
const BASS_ROOTS = [48, 48, 53, 48, 45, 53, 55, 48]; // one per bar
const STEPS_PER_BAR = 8;

const midiToHz = (m) => 440 * Math.pow(2, (m - 69) / 12);

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.musicGain = null;
    this.sfxGain = null;
    this.noiseBuffer = null;
    this.music = null;
    this.comboStep = 0;
    this.comboResetAt = 0;
    this.muted = false;
  }

  // Must be called from a user gesture (browser autoplay policy).
  unlock() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    this.ctx = new Ctx();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.6;
    this.master.connect(this.ctx.destination);
    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.value = 0.35;
    this.musicGain.connect(this.master);
    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.value = 0.9;
    this.sfxGain.connect(this.master);
    this.noiseBuffer = this.makeNoise(2);
  }

  setMuted(muted) {
    this.muted = muted;
    if (this.master) this.master.gain.setTargetAtTime(muted ? 0 : 0.6, this.ctx.currentTime, 0.05);
  }

  makeNoise(seconds) {
    const buffer = this.ctx.createBuffer(1, this.ctx.sampleRate * seconds, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    return buffer;
  }

  // ----- building blocks -----

  tone({ freq, type = 'sine', start = 0, duration = 0.2, gain = 0.3, attack = 0.005, release, slideTo, dest }) {
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime + start;
    const osc = this.ctx.createOscillator();
    const env = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + duration);
    env.gain.setValueAtTime(0.0001, t0);
    env.gain.exponentialRampToValueAtTime(gain, t0 + attack);
    env.gain.exponentialRampToValueAtTime(0.0001, t0 + duration + (release ?? 0));
    osc.connect(env);
    env.connect(dest || this.sfxGain);
    osc.start(t0);
    osc.stop(t0 + duration + (release ?? 0) + 0.05);
  }

  noise({ start = 0, duration = 0.1, gain = 0.2, filterFreq = 4000, filterType = 'bandpass', q = 1, dest }) {
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime + start;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    src.loop = true;
    const filter = this.ctx.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.value = filterFreq;
    filter.Q.value = q;
    const env = this.ctx.createGain();
    env.gain.setValueAtTime(gain, t0);
    env.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    src.connect(filter);
    filter.connect(env);
    env.connect(dest || this.sfxGain);
    src.start(t0);
    src.stop(t0 + duration + 0.02);
  }

  // ----- sound effects -----

  jump() {
    this.tone({ freq: 320, slideTo: 760, type: 'sine', duration: 0.18, gain: 0.25 });
    this.tone({ freq: 640, slideTo: 1500, type: 'triangle', duration: 0.12, gain: 0.08, start: 0.02 });
  }

  star() {
    // Each star collected within a second climbs the scale – a satisfying combo.
    const now = this.ctx ? this.ctx.currentTime : 0;
    if (now > this.comboResetAt) this.comboStep = 0;
    this.comboResetAt = now + 1.2;
    const base = 76 + Math.min(this.comboStep, 10);
    this.comboStep += 1;
    this.tone({ freq: midiToHz(base), type: 'triangle', duration: 0.12, gain: 0.25 });
    this.tone({ freq: midiToHz(base + 4), type: 'triangle', duration: 0.18, gain: 0.2, start: 0.06 });
  }

  bubble() {
    this.noise({ duration: 0.08, gain: 0.35, filterFreq: 2500, q: 2 });
    this.tone({ freq: 900, slideTo: 1400, type: 'sine', duration: 0.09, gain: 0.3 });
  }

  crystal() {
    const notes = [84, 88, 91, 96];
    notes.forEach((n, i) => this.tone({ freq: midiToHz(n), type: 'sine', duration: 0.5, gain: 0.2, start: i * 0.05, release: 0.3 }));
    this.noise({ duration: 0.3, gain: 0.05, filterFreq: 8000, q: 0.5 });
  }

  heart() {
    // warm rising chime – "you got a life back"
    [[72, 0], [76, 0.08], [79, 0.16], [84, 0.26]].forEach(([n, t]) =>
      this.tone({ freq: midiToHz(n), type: 'triangle', duration: 0.35, gain: 0.22, start: t, release: 0.25 }));
    this.tone({ freq: midiToHz(88), type: 'sine', duration: 0.6, gain: 0.12, start: 0.3, release: 0.4 });
  }

  firework() {
    // thump + crackle
    this.noise({ duration: 0.22, gain: 0.3, filterFreq: 700, filterType: 'lowpass', q: 0.8 });
    this.tone({ freq: 160, slideTo: 50, type: 'sine', duration: 0.25, gain: 0.25 });
    for (let i = 0; i < 6; i++) {
      this.noise({ start: 0.08 + Math.random() * 0.35, duration: 0.03, gain: 0.08, filterFreq: 3000 + Math.random() * 3000, q: 1.5 });
    }
  }

  hit() {
    this.tone({ freq: 300, slideTo: 120, type: 'sawtooth', duration: 0.3, gain: 0.18 });
    this.tone({ freq: midiToHz(64), type: 'triangle', duration: 0.15, gain: 0.15 });
    this.tone({ freq: midiToHz(61), type: 'triangle', duration: 0.3, gain: 0.15, start: 0.15 });
  }

  click() {
    this.tone({ freq: 1200, type: 'square', duration: 0.04, gain: 0.08 });
  }

  countdown(final) {
    this.tone({ freq: final ? 1046 : 784, type: 'square', duration: final ? 0.4 : 0.12, gain: 0.12 });
  }

  fanfare() {
    const seq = [[72, 0], [76, 0.13], [79, 0.26], [84, 0.39], [79, 0.7], [84, 0.85]];
    for (const [note, t] of seq) {
      this.tone({ freq: midiToHz(note), type: 'square', duration: t > 0.6 ? 0.5 : 0.14, gain: 0.14, start: t, release: 0.1 });
      this.tone({ freq: midiToHz(note - 12), type: 'triangle', duration: t > 0.6 ? 0.5 : 0.14, gain: 0.12, start: t });
    }
    [72, 76, 79].forEach((n) => this.tone({ freq: midiToHz(n), type: 'triangle', duration: 1.2, gain: 0.1, start: 0.85, release: 0.4 }));
    this.applause(1.1);
  }

  bigFanfare() {
    this.fanfare();
    const seq = [[84, 1.6], [88, 1.75], [91, 1.9], [96, 2.05]];
    for (const [note, t] of seq) {
      this.tone({ freq: midiToHz(note), type: 'square', duration: 0.3, gain: 0.14, start: t, release: 0.3 });
    }
    [72, 76, 79, 84].forEach((n, i) => this.tone({ freq: midiToHz(n), type: 'triangle', duration: 2, gain: 0.12, start: 2.2 + i * 0.03, release: 0.6 }));
    this.applause(2.4, 3.2);
  }

  applause(start = 0, duration = 2.2) {
    if (!this.ctx) return;
    for (let i = 0; i < 40; i++) {
      const t = start + Math.random() * duration;
      this.noise({ start: t, duration: 0.05 + Math.random() * 0.05, gain: 0.06 + Math.random() * 0.06, filterFreq: 1500 + Math.random() * 2500, q: 0.7 });
    }
  }

  retry() {
    [[67, 0], [64, 0.18], [60, 0.36], [64, 0.7], [67, 0.85]].forEach(([n, t]) =>
      this.tone({ freq: midiToHz(n), type: 'triangle', duration: 0.16, gain: 0.18, start: t }));
  }

  // ----- music sequencer -----

  startMusic({ tempo = 120, key = 0, wave = 'triangle' } = {}) {
    this.stopMusic();
    if (!this.ctx) return;
    const stepSeconds = 60 / tempo / 2; // eighth notes
    const state = { step: 0, nextTime: this.ctx.currentTime + 0.1, timer: null, tempo, key, wave, stepSeconds };
    const lookahead = 0.15;
    const schedule = () => {
      while (state.nextTime < this.ctx.currentTime + lookahead) {
        this.playStep(state.step, state.nextTime, state);
        state.nextTime += stepSeconds;
        state.step = (state.step + 1) % MELODY.length;
      }
    };
    schedule();
    state.timer = setInterval(schedule, 40);
    this.music = state;
  }

  playStep(step, time, state) {
    const t = time - this.ctx.currentTime; // seconds from now (>= 0)
    const note = MELODY[step];
    if (note !== null) {
      this.tone({ freq: midiToHz(note + state.key), type: state.wave, start: t, duration: state.stepSeconds * 0.85, gain: 0.16, dest: this.musicGain });
    }
    const bar = Math.floor(step / STEPS_PER_BAR);
    const inBar = step % STEPS_PER_BAR;
    if (inBar % 2 === 0) {
      const root = BASS_ROOTS[bar] + state.key;
      const bassNote = inBar % 4 === 0 ? root : root + 7;
      this.tone({ freq: midiToHz(bassNote), type: 'triangle', start: t, duration: state.stepSeconds * 1.4, gain: 0.2, dest: this.musicGain });
    }
    if (inBar % 4 === 0) {
      this.tone({ freq: 110, slideTo: 45, type: 'sine', start: t, duration: 0.12, gain: 0.35, dest: this.musicGain });
    }
    this.noise({ start: t, duration: 0.03, gain: inBar % 2 === 0 ? 0.05 : 0.09, filterFreq: 9000, filterType: 'highpass', dest: this.musicGain });
  }

  stopMusic() {
    if (this.music) {
      clearInterval(this.music.timer);
      this.music = null;
    }
  }

  duckMusic(level) { // lower music while a jingle plays
    if (this.musicGain) this.musicGain.gain.setTargetAtTime(level, this.ctx.currentTime, 0.1);
  }
}
