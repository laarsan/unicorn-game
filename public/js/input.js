// Keyboard + mouse input, normalised into game actions. Gamepads and the VR
// controllers (vr.js) feed the same action names and held-state flags so the
// game never sees devices.

export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.listeners = new Map();
    this.down = new Set();
    this.duckHeld = false;
    this.upHeld = false;        // jump key held – flight mode climbs while it is down
    this.pointer = { x: 0, y: 0, clicked: false };
    this.enabled = true;
    this.gamepadState = { axisX: 0, jump: false, duck: false };
    this.xr = { climb: false, duck: false };   // held VR buttons, written by VRSupport every frame
    this.bind();
  }

  on(action, fn) {
    if (!this.listeners.has(action)) this.listeners.set(action, []);
    this.listeners.get(action).push(fn);
  }

  emit(action, payload) {
    for (const fn of this.listeners.get(action) || []) fn(payload);
  }

  bind() {
    window.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      // While a text field (the name box) has focus the keys are letters, not
      // controls: a child must be able to type "Wilma" or "Sasa" in her name.
      if (isTyping(e.target) && e.code !== 'Escape') return;
      const action = keyToAction(e.code);
      if (['left', 'right', 'jump', 'duck'].includes(action)) e.preventDefault();
      this.emit('any');
      if (action === 'duck') this.duckHeld = true;
      if (action === 'jump') this.upHeld = true;
      if (action) this.emit(action);
      if (e.code === 'KeyM') this.emit('mute');
    });
    window.addEventListener('keyup', (e) => {
      const action = keyToAction(e.code);
      if (action === 'duck') this.duckHeld = false;
      if (action === 'jump') this.upHeld = false;
    });
    this.canvas.addEventListener('pointerdown', (e) => {
      this.emit('any');
      this.pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
      this.pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;
      this.emit('click', { x: this.pointer.x, y: this.pointer.y });
    });
    this.canvas.addEventListener('pointermove', (e) => {
      this.pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
      this.pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;
    });
    window.addEventListener('blur', () => { this.duckHeld = false; this.upHeld = false; this.emit('blur'); });
  }

  // Poll standard gamepads: left stick / d-pad for lanes, A = jump, B = duck, X = fire.
  pollGamepad() {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    const pad = pads && Array.from(pads).find((p) => p && p.connected);
    if (!pad) return;
    const axisX = pad.axes[0] || 0;
    const left = axisX < -0.5 || (pad.buttons[14] && pad.buttons[14].pressed);
    const right = axisX > 0.5 || (pad.buttons[15] && pad.buttons[15].pressed);
    const jump = (pad.buttons[0] && pad.buttons[0].pressed) || (pad.buttons[12] && pad.buttons[12].pressed);
    const duck = (pad.buttons[1] && pad.buttons[1].pressed) || (pad.buttons[13] && pad.buttons[13].pressed);
    const fire = Boolean(pad.buttons[2] && pad.buttons[2].pressed);
    const s = this.gamepadState;
    if (left && s.axisX >= 0) this.emit('left');
    if (right && s.axisX <= 0) this.emit('right');
    if (jump && !s.jump) { this.emit('any'); this.emit('jump'); }
    if (fire && !s.fire) { this.emit('any'); this.emit('fire'); }
    if (pad.buttons[9] && pad.buttons[9].pressed && !s.start) this.emit('confirm');
    s.axisX = left ? -1 : right ? 1 : 0;
    s.jump = jump;
    s.duck = duck;
    s.fire = fire;
    s.start = pad.buttons[9] && pad.buttons[9].pressed;
  }

  get ducking() {
    return this.duckHeld || this.gamepadState.duck || this.xr.duck;
  }

  // Flight mode: the jump keys climb for as long as they are held.
  get climbing() {
    return this.upHeld || this.gamepadState.jump || this.xr.climb;
  }
}

function isTyping(target) {
  return Boolean(target) && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA');
}

function keyToAction(code) {
  switch (code) {
    case 'ArrowLeft': case 'KeyA': return 'left';
    case 'ArrowRight': case 'KeyD': return 'right';
    case 'ArrowUp': case 'KeyW': case 'Space': return 'jump';
    case 'ArrowDown': case 'KeyS': return 'duck';
    case 'KeyE': return 'fire';          // rainbow laser (flight mode); ignored while typing a name, like every key
    case 'Enter': case 'NumpadEnter': return 'confirm';
    case 'Escape': return 'pause';
    default: return null;
  }
}
