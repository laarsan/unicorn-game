// All sound is synthesised with the Web Audio API – no audio files.
// Sound effects are short envelope-shaped oscillators; music is a small
// step sequencer scheduled ahead of time (lookahead pattern).

// Three songs, all in C major (transposed per theme by `key`). Each is a grid
// of eighth notes: `melody` (midi or null = rest), one bass root per bar,
// `bassPattern` ('r' root, '5' fifth) and drum patterns per step in a bar.
// Levels rotate through the songs – see levels.js `musicSong`.
export const SONGS = [
  { // a skipping tune in 4/4 – the original theme
    name: 'Regnbågsgaloppen',
    stepsPerBar: 8,
    melody: [
      72, 76, 79, 76, 81, 79, 76, 74,
      72, 76, 79, 81, 79, null, 76, null,
      74, 77, 81, 77, 79, 77, 76, 74,
      72, null, 76, null, 79, null, null, null,
      84, 83, 81, 79, 81, 79, 77, 76,
      77, 79, 81, 77, 79, null, 76, null,
      74, 76, 77, 79, 81, 79, 77, 74,
      72, null, 76, null, 72, null, null, null,
    ],
    bass: [48, 48, 53, 48, 45, 53, 55, 48],
    bassPattern: ['r', null, '5', null, 'r', null, '5', null],
    kick: [1, 0, 0, 0, 1, 0, 0, 0],
    hat: [0.05, 0.09, 0.05, 0.09, 0.05, 0.09, 0.05, 0.09],
  },
  { // a galloping tune – long-short-short hooves, 4/4
    name: 'Hovarnas dans',
    stepsPerBar: 8,
    melody: [
      72, null, 72, 74, 76, null, 76, 77,
      79, null, 79, 77, 76, null, 74, null,
      72, null, 72, 74, 76, null, 76, 77,
      79, null, 81, 79, 76, null, null, null,
      81, null, 81, 79, 77, null, 77, 76,
      74, null, 74, 76, 77, null, 79, null,
      76, null, 76, 77, 79, null, 81, 83,
      84, null, 79, null, 72, null, null, null,
    ],
    bass: [48, 55, 48, 48, 53, 55, 48, 48],
    bassPattern: ['r', null, null, '5', 'r', null, null, '5'],
    kick: [1, 0, 0, 0, 1, 0, 0, 0],
    hat: [0, 0, 0.08, 0.06, 0, 0, 0.08, 0.06],
  },
  { // a waltz in 3/4 – oom-pah-pah under a swaying melody
    name: 'Regnbågsvalsen',
    stepsPerBar: 6,
    melody: [
      76, null, 79, null, 84, null,
      83, null, 81, null, 79, null,
      77, null, 81, null, 79, 77,
      76, null, null, null, 72, 74,
      76, null, 79, null, 84, null,
      86, null, 84, null, 83, 81,
      79, 81, 83, null, 81, 79,
      84, null, null, null, null, null,
    ],
    bass: [48, 55, 53, 48, 48, 55, 55, 48],
    bassPattern: ['r', null, '5', null, '5', null],
    kick: [1, 0, 0, 0, 0, 0],
    hat: [0, 0, 0.08, 0, 0.08, 0],
  },
];
export const SONG_COUNT = SONGS.length;

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
    this.attach(new Ctx());
  }

  // Wire the graph onto a context (an OfflineAudioContext in tests).
  attach(ctx) {
    this.ctx = ctx;
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
    this.wobbleBuffer = this.makeWobble(2);
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

  // Slow random drift (≈ 3–15 Hz content, peak 1) – modulates a voice's pitch
  // so it never sits perfectly still, which is what made it sound synthetic.
  makeWobble(seconds) {
    const sr = this.ctx.sampleRate;
    const buffer = this.ctx.createBuffer(1, sr * seconds, sr);
    const data = buffer.getChannelData(0);
    const smoothing = Math.exp(-2 * Math.PI * 12 / sr); // one-pole low-pass at 12 Hz
    let v = 0, peak = 0;
    for (let i = 0; i < data.length; i++) {
      v = smoothing * v + (1 - smoothing) * (Math.random() * 2 - 1);
      data[i] = v;
      if (Math.abs(v) > peak) peak = Math.abs(v);
    }
    for (let i = 0; i < data.length; i++) data[i] /= peak || 1;
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

  // A stereo panner feeding the sfx bus, for sounds that come from somewhere.
  panner(pan) {
    if (!this.ctx || !this.ctx.createStereoPanner || !pan) return this.sfxGain;
    const node = this.ctx.createStereoPanner();
    node.pan.value = Math.max(-1, Math.min(1, pan));
    node.connect(this.sfxGain);
    return node;
  }

  // A child shouting "hej!" (Swedish /hɛj/): a breathy H, an open E vowel
  // gliding into the J. Built like a parallel formant synthesiser – a sawtooth
  // "glottal" source with a low-pass tilt feeds three band-pass formants, and
  // aspiration noise goes through the same formants so the H is a whispered
  // vowel rather than a hiss. What keeps it from sounding like a robot: every
  // pitch and formant change is a ramp (no steps), the pitch drifts a little
  // at random (jitter) and a slow vibrato fades in on the vowel. `pitch` is the
  // fundamental (children ≈ 250–400 Hz), `formant` scales the vocal tract
  // (children ≈ 1.2–1.35 of a man's), `contour` is [[fraction, ratio]] pitch
  // points – a rising contour sounds happy, a falling one tired.
  voice({ pitch = 300, formant = 1.25, start = 0, duration = 0.34, gain = 0.3, pan = 0, vibrato = 6,
          contour = [[0, 0.9], [0.18, 1], [0.7, 1.3], [1, 1.22]] }) {
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime + start;
    const tEnd = t0 + duration;
    const glideAt = t0 + duration * 0.55;       // E → J
    const dest = this.panner(pan);
    // vowel formants (adult male values × `formant`): E open, then J ≈ I
    const FORMANTS = [
      { e: 580, j: 300, q: 7, level: 1.0 },
      { e: 1850, j: 2350, q: 9, level: 0.9 },
      { e: 2550, j: 3000, q: 8, level: 0.5 },
    ];
    // the band-pass formants pass only a sliver of the source, so the output
    // needs a fixed make-up gain to land at the level of the other effects
    const FORMANT_MAKEUP = 4;
    const env = this.ctx.createGain();
    env.gain.setValueAtTime(0.0001, t0);          // (a GainNode defaults to 1 – without this the first 40 ms click)
    env.gain.linearRampToValueAtTime(gain * 0.5, t0 + 0.03);   // opens quickly so the H puff is heard
    env.gain.exponentialRampToValueAtTime(gain, t0 + 0.09);
    env.gain.linearRampToValueAtTime(gain * 0.85, glideAt);
    env.gain.linearRampToValueAtTime(gain * 0.55, tEnd - 0.03);
    env.gain.exponentialRampToValueAtTime(0.0001, tEnd + 0.05);
    env.connect(dest);
    const formantNodes = FORMANTS.map(({ e, j, q, level }) => {
      const bp = this.ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.Q.value = q;
      bp.frequency.setValueAtTime(e * formant, t0);
      bp.frequency.setValueAtTime(e * formant, glideAt - 0.04);
      bp.frequency.linearRampToValueAtTime(j * formant, tEnd);
      const lvl = this.ctx.createGain();
      lvl.gain.value = level * FORMANT_MAKEUP;
      bp.connect(lvl);
      lvl.connect(env);
      return bp;
    });
    // glottal source: sawtooth, tilted by a gentle low-pass
    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(pitch * contour[0][1], t0);
    for (const [frac, ratio] of contour.slice(1)) osc.frequency.exponentialRampToValueAtTime(pitch * ratio, t0 + duration * frac);
    const glottal = this.ctx.createBiquadFilter();
    glottal.type = 'lowpass';
    glottal.frequency.value = 1500 * formant;
    glottal.Q.value = 0.5;
    osc.connect(glottal);
    for (const bp of formantNodes) glottal.connect(bp);
    // jitter – random pitch drift, ±1.5 %
    const wobble = this.ctx.createBufferSource();
    wobble.buffer = this.wobbleBuffer;
    wobble.loop = true;
    const wobbleGain = this.ctx.createGain();
    wobbleGain.gain.value = pitch * 0.015;
    wobble.connect(wobbleGain);
    wobbleGain.connect(osc.frequency);
    // vibrato fading in on the vowel
    const lfo = this.ctx.createOscillator();
    lfo.frequency.value = vibrato;
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.setValueAtTime(0, t0);
    lfoGain.gain.setValueAtTime(0, t0 + duration * 0.3);
    lfoGain.gain.linearRampToValueAtTime(pitch * 0.02, t0 + duration * 0.7);
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);
    // aspiration: a puff for the H, then a whisper of breath under the vowel
    const breath = this.ctx.createBufferSource();
    breath.buffer = this.noiseBuffer;
    breath.loop = true;
    const breathEnv = this.ctx.createGain();
    breathEnv.gain.setValueAtTime(0.0001, t0);
    breathEnv.gain.exponentialRampToValueAtTime(gain * 0.6, t0 + 0.02);
    breathEnv.gain.setValueAtTime(gain * 0.6, t0 + 0.05);
    breathEnv.gain.exponentialRampToValueAtTime(gain * 0.05, t0 + 0.11);
    breathEnv.gain.setValueAtTime(gain * 0.05, tEnd - 0.05);
    breathEnv.gain.exponentialRampToValueAtTime(0.0001, tEnd);
    breath.connect(breathEnv);
    for (const bp of formantNodes) breathEnv.connect(bp);
    const stopAt = tEnd + 0.15;
    osc.start(t0 + 0.03);                          // the voice comes in after the H puff
    lfo.start(t0); breath.start(t0);
    wobble.start(t0, Math.random() * 1.5);         // a different drift every call
    osc.stop(stopAt); lfo.stop(stopAt); breath.stop(stopAt); wobble.stop(stopAt);
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
    // A juicy pop, a wobbly "boing", a harp run climbing a pentatonic scale
    // and a shimmer of glitter – each bubble in a row starts a step higher.
    const now = this.ctx ? this.ctx.currentTime : 0;
    if (now > this.comboResetAt) this.comboStep = 0;
    this.comboResetAt = now + 1.2;
    const base = 84 + Math.min(this.comboStep, 6) * 2;
    this.comboStep += 1;
    this.noise({ duration: 0.06, gain: 0.5, filterFreq: 3200, q: 1.5 });
    this.tone({ freq: 700, slideTo: 1900, type: 'sine', duration: 0.08, gain: 0.35 });
    this.tone({ freq: 240, slideTo: 420, type: 'triangle', duration: 0.22, gain: 0.22, start: 0.02, release: 0.1 });
    [0, 2, 4, 7, 9, 12].forEach((step, i) =>
      this.tone({ freq: midiToHz(base + step), type: 'triangle', duration: 0.16, gain: 0.16, start: 0.04 + i * 0.045, release: 0.25 }));
    this.tone({ freq: midiToHz(base + 16), type: 'sine', duration: 0.5, gain: 0.1, start: 0.3, release: 0.4 });
    for (let i = 0; i < 5; i++) {
      this.noise({ start: 0.1 + i * 0.07, duration: 0.03, gain: 0.06, filterFreq: 6000 + i * 900, q: 3 });
    }
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

  // The spider friends calling "hej!" from their webs. Index 1 (the white
  // suit) is a girl; 0 and 2 are two boys – all three are children, so the
  // boys sit well above a grown man's voice. Every call is a little different
  // (pitch, length, sometimes a quick "hej hej!") so it never sounds canned.
  // `variant` pins the randomness for tests: { detune, stretch, double }.
  hey(index, pan = 0, variant = null) {
    // gain differs per voice because the formant filters pass less of a high
    // or very low fundamental – these land all three at roughly the same level
    const presets = [
      { pitch: 270, formant: 1.25, duration: 0.34, vibrato: 6, gain: 0.32 },
      { pitch: 360, formant: 1.35, duration: 0.32, vibrato: 6.5, gain: 0.36 },
      { pitch: 230, formant: 1.18, duration: 0.38, vibrato: 5.5, gain: 0.32 },
    ];
    const v = variant || {
      detune: 0.95 + Math.random() * 0.1,
      stretch: 0.9 + Math.random() * 0.2,
      double: Math.random() < 0.3,
    };
    const p = presets[index % presets.length];
    const first = { ...p, pitch: p.pitch * v.detune, duration: p.duration * v.stretch, pan };
    if (!v.double) {
      this.voice(first);
      return;
    }
    // "hej hej!" – two short ones, the second a little higher
    const short = first.duration * 0.75;
    this.voice({ ...first, duration: short, contour: [[0, 0.92], [0.2, 1], [1, 1.12]] });
    this.voice({ ...first, start: short + 0.06, duration: short * 1.1, pitch: first.pitch * 1.1 });
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

  startMusic({ tempo = 120, key = 0, wave = 'triangle', song = 0 } = {}) {
    this.stopMusic();
    if (!this.ctx) return;
    const state = this.musicState({ tempo, key, wave, song });
    state.nextTime = this.ctx.currentTime + 0.1;
    const lookahead = 0.15;
    const schedule = () => {
      while (state.nextTime < this.ctx.currentTime + lookahead) {
        this.playStep(state.step, state.nextTime, state);
        state.nextTime += state.stepSeconds;
        state.step = (state.step + 1) % state.song.melody.length;
      }
    };
    schedule();
    state.timer = setInterval(schedule, 40);
    this.music = state;
  }

  // Sequencer state for a song – separate so tests can step through a song
  // offline without the real-time scheduler.
  musicState({ tempo = 120, key = 0, wave = 'triangle', song = 0 } = {}) {
    return { step: 0, nextTime: 0, timer: null, tempo, key, wave, song: SONGS[song % SONG_COUNT], stepSeconds: 60 / tempo / 2 };
  }

  playStep(step, time, state) {
    const t = time - this.ctx.currentTime; // seconds from now (>= 0)
    const song = state.song;
    const note = song.melody[step];
    if (note !== null) {
      this.tone({ freq: midiToHz(note + state.key), type: state.wave, start: t, duration: state.stepSeconds * 0.85, gain: 0.16, dest: this.musicGain });
    }
    const bar = Math.floor(step / song.stepsPerBar);
    const inBar = step % song.stepsPerBar;
    const bassKind = song.bassPattern[inBar];
    if (bassKind) {
      const root = song.bass[bar] + state.key;
      this.tone({ freq: midiToHz(bassKind === '5' ? root + 7 : root), type: 'triangle', start: t, duration: state.stepSeconds * 1.4, gain: 0.2, dest: this.musicGain });
    }
    if (song.kick[inBar]) {
      this.tone({ freq: 110, slideTo: 45, type: 'sine', start: t, duration: 0.12, gain: 0.35, dest: this.musicGain });
    }
    if (song.hat[inBar]) {
      this.noise({ start: t, duration: 0.03, gain: song.hat[inBar], filterFreq: 9000, filterType: 'highpass', dest: this.musicGain });
    }
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
