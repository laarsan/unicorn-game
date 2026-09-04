// Keyboard + mouse input, normalised into game actions. Gamepads (and later
// VR controllers) feed the same action names so the game never sees devices.

export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.listeners = new Map();
    this.down = new Set();
    this.duckHeld = false;
    this.pointer = { x: 0, y: 0, clicked: false };
    this.enabled = true;
    this.gamepadState = { axisX: 0, jump: false, duck: false };
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
      const action = keyToAction(e.code);
      if (['left', 'right', 'jump', 'duck'].includes(action)) e.preventDefault();
      if (action === 'confirm' && e.target && e.target.tagName === 'INPUT') return; // let the name field handle Enter
      this.emit('any');
      if (action === 'duck') this.duckHeld = true;
      if (action) this.emit(action);
      if (e.code === 'KeyM') this.emit('mute');
    });
    window.addEventListener('keyup', (e) => {
      if (keyToAction(e.code) === 'duck') this.duckHeld = false;
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
    window.addEventListener('blur', () => { this.duckHeld = false; this.emit('blur'); });
  }

  // Poll standard gamepads: left stick / d-pad for lanes, A = jump, B = duck.
  pollGamepad() {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    const pad = pads && Array.from(pads).find((p) => p && p.connected);
    if (!pad) return;
    const axisX = pad.axes[0] || 0;
    const left = axisX < -0.5 || (pad.buttons[14] && pad.buttons[14].pressed);
    const right = axisX > 0.5 || (pad.buttons[15] && pad.buttons[15].pressed);
    const jump = (pad.buttons[0] && pad.buttons[0].pressed) || (pad.buttons[12] && pad.buttons[12].pressed);
    const duck = (pad.buttons[1] && pad.buttons[1].pressed) || (pad.buttons[13] && pad.buttons[13].pressed);
    const s = this.gamepadState;
    if (left && s.axisX >= 0) this.emit('left');
    if (right && s.axisX <= 0) this.emit('right');
    if (jump && !s.jump) { this.emit('any'); this.emit('jump'); }
    if (pad.buttons[9] && pad.buttons[9].pressed && !s.start) this.emit('confirm');
    s.axisX = left ? -1 : right ? 1 : 0;
    s.jump = jump;
    s.duck = duck;
    s.start = pad.buttons[9] && pad.buttons[9].pressed;
  }

  get ducking() {
    return this.duckHeld || this.gamepadState.duck;
  }
}

function keyToAction(code) {
  switch (code) {
    case 'ArrowLeft': case 'KeyA': return 'left';
    case 'ArrowRight': case 'KeyD': return 'right';
    case 'ArrowUp': case 'KeyW': case 'Space': return 'jump';
    case 'ArrowDown': case 'KeyS': return 'duck';
    case 'Enter': case 'NumpadEnter': return 'confirm';
    case 'Escape': return 'pause';
    default: return null;
  }
}
