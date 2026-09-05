// Entry point: wires up UI, audio, input and the game, then boots.

import { Game } from './game.js';
import { UI } from './ui.js';
import { AudioEngine } from './audio.js';
import { Input } from './input.js';
import { installCursor } from './cursor.js';

const canvas = document.getElementById('game');
const ui = new UI();
const audio = new AudioEngine();
const input = new Input(canvas);
installCursor();

let game;
try {
  game = new Game({ canvas, ui, audio, input });
  window.__game = game; // test hook (Playwright drives the game through this)
  game.boot().catch(showError);
} catch (err) {
  showError(err);
}

function showError(err) {
  console.error(err);
  const loading = document.getElementById('loading');
  loading.classList.remove('hidden');
  loading.querySelector('.card').innerHTML = `<h2>Oj, något gick fel 😢</h2><p class="big-text">${String(err && err.message || err)}</p><p>Prova att starta om spelet.</p>`;
}
