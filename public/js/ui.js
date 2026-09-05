// DOM overlay: menus, HUD, tips, score popups. Pure presentation – the game
// calls these methods and subscribes to button clicks via `onButton`.

import { HEARTS_PER_LEVEL } from './config.js';
import { LEVEL_COUNT } from './levels.js';
import { normaliseName } from './scoreboard.js';

const $ = (id) => document.getElementById(id);

const SCREENS = ['menu', 'pause', 'levelclear', 'retry', 'finished', 'highscores', 'goodbye', 'loading'];

export class UI {
  constructor() {
    this.el = {};
    for (const id of [...SCREENS, 'hud', 'hud-hearts', 'hud-level', 'hud-score', 'hud-progress-fill', 'hud-progress-unicorn',
      'tip', 'tip-icon', 'tip-text', 'countdown', 'wow', 'popups', 'name', 'finished-score', 'menu-scores',
      'highscore-list', 'levelclear-title', 'levelclear-stars', 'levelclear-text', 'btn-continue', 'continue-level', 'btn-mute', 'btn-vr',
      'players', 'btn-new-player', 'hud-laser', 'hud-laser-fill', 'hud-laser-label', 'btn-mode-run', 'btn-mode-fly']) {
      this.el[id] = $(id);
    }
    this.tipTimer = null;
    this.lastHearts = -1;
    this.lastLaserReady = null;
    this.buttons = {};
  }

  // Menu: highlight the chosen game mode ('run' or 'fly').
  setMode(mode) {
    this.el['btn-mode-run'].classList.toggle('selected', mode !== 'fly');
    this.el['btn-mode-fly'].classList.toggle('selected', mode === 'fly');
  }

  // Flight mode only: the rainbow laser meter lives in the HUD's bottom-left corner.
  showLaser(visible) {
    this.el['hud-laser'].classList.toggle('hidden', !visible);
    this.lastLaserReady = null;
  }

  // charge 0..1; at 1 the meter glows and tells the child which key to press
  setLaser(charge) {
    const ready = charge >= 1;
    this.el['hud-laser-fill'].style.width = Math.round(Math.max(0, Math.min(1, charge)) * 100) + '%';
    if (ready !== this.lastLaserReady) {
      this.lastLaserReady = ready;
      this.el['hud-laser'].classList.toggle('ready', ready);
      this.el['hud-laser-label'].textContent = ready ? '✨ REDO! Tryck E' : '🌈 Regnbågslaser laddar…';
    }
  }

  // Fire pressed too early: wiggle the meter so the child sees it is still charging.
  laserDenied() {
    const el = this.el['hud-laser'];
    el.classList.remove('denied');
    void el.offsetWidth;
    el.classList.add('denied');
  }

  onButton(id, fn) {
    const b = $(id);
    if (!b) throw new Error('missing button ' + id);
    b.addEventListener('click', (e) => { e.preventDefault(); fn(); });
  }

  showScreen(name) {
    for (const s of SCREENS) this.el[s].classList.toggle('hidden', s !== name);
    if (name === 'menu') setTimeout(() => this.el.name.focus(), 50);
    // Leaving a screen with a text box: give the keys back to the game.
    else if (document.activeElement && document.activeElement.tagName === 'INPUT') document.activeElement.blur();
  }

  showHud(visible) {
    this.el.hud.classList.toggle('hidden', !visible);
  }

  setLevel(level) {
    this.el['hud-level'].textContent = `Bana ${level.id} · ${level.name}`;
    this.lastHearts = -1;
  }

  setHud({ hearts, score, progress }) {
    if (hearts !== this.lastHearts) {
      const lost = this.lastHearts > hearts && this.lastHearts !== -1;
      const gained = this.lastHearts !== -1 && hearts > this.lastHearts;
      // Extra lives caught on the course add slots beyond the usual five.
      const slots = Math.max(HEARTS_PER_LEVEL, hearts);
      this.el['hud-hearts'].innerHTML = Array.from({ length: slots }, (_, i) =>
        `<span class="heart ${i < hearts ? '' : 'lost'} ${lost && i === hearts ? 'hit' : ''} ${gained && i === hearts - 1 ? 'gained' : ''}">💖</span>`).join('');
      this.lastHearts = hearts;
    }
    const scoreEl = this.el['hud-score'];
    const text = `⭐ ${score}`;
    if (scoreEl.textContent !== text) {
      scoreEl.textContent = text;
      scoreEl.classList.remove('bump');
      void scoreEl.offsetWidth; // restart animation
      scoreEl.classList.add('bump');
    }
    const pct = Math.max(0, Math.min(100, progress * 100));
    this.el['hud-progress-fill'].style.width = pct + '%';
    this.el['hud-progress-unicorn'].style.left = pct + '%';
  }

  showTip(tip, seconds = 4) {
    this.el['tip-icon'].textContent = tip.icon;
    this.el['tip-text'].textContent = tip.text;
    this.el.tip.classList.remove('hidden');
    clearTimeout(this.tipTimer);
    this.tipTimer = setTimeout(() => this.el.tip.classList.add('hidden'), seconds * 1000);
  }

  hideTip() {
    clearTimeout(this.tipTimer);
    this.el.tip.classList.add('hidden');
  }

  showCountdown(text) {
    const c = this.el.countdown;
    c.textContent = text;
    c.classList.remove('hidden');
    c.style.animation = 'none';
    void c.offsetWidth;
    c.style.animation = '';
  }

  hideCountdown() {
    this.el.countdown.classList.add('hidden');
  }

  // Big "WOW!" splash when the finish line is crossed.
  showWow(text) {
    const w = this.el.wow;
    w.innerHTML = `<span class="rainbow-text">${escapeHtml(text)}</span>`;
    w.classList.remove('hidden');
    w.style.animation = 'none';
    void w.offsetWidth;
    w.style.animation = '';
  }

  hideWow() {
    this.el.wow.classList.add('hidden');
  }

  // Floating "+10" at a screen position (normalised device coords → px).
  popup(text, ndcX, ndcY) {
    const p = document.createElement('div');
    p.className = 'popup';
    p.textContent = text;
    p.style.left = ((ndcX + 1) / 2) * 100 + '%';
    p.style.top = ((1 - ndcY) / 2) * 100 + '%';
    this.el.popups.appendChild(p);
    setTimeout(() => p.remove(), 900);
  }

  flash() {
    const hud = this.el.hud;
    hud.classList.remove('flash');
    void hud.offsetWidth;
    hud.classList.add('flash');
  }

  // Every player who has cleared a level is on the list: name, how far the
  // best run got, points. `highlightName` marks the child who just played.
  renderScores(target, scores, highlightName) {
    const el = this.el[target];
    const heading = target === 'menu-scores' ? '<h3>🏆 Topplistan</h3>' : '';
    if (!scores.length) {
      el.innerHTML = `${heading}<p class="empty">Ingen har spelat än – bli först!</p>`;
      return;
    }
    const key = normaliseName(highlightName);
    const rows = scores.map((s, i) => {
      const me = key && normaliseName(s.name) === key;
      const flew = s.mode === 'fly' ? '☁️ ' : '';
      return `<li class="${me ? 'me' : ''}"><span class="rank">${i + 1}.</span><span class="name">${escapeHtml(s.name)}</span>` +
        `<span class="level">${flew}${describeLevels(s.levels)}</span><span class="points">${s.score} ⭐</span></li>`;
    });
    el.innerHTML = `${heading}<ol>${rows.join('')}</ol>`;
  }

  showLevelClear({ level, stars, levelScore, totalScore, isLast }) {
    this.el['levelclear-title'].textContent = `Bana ${level.id} klarad! 🎉`;
    this.el['levelclear-stars'].innerHTML = [1, 2, 3].map((n) => `<span class="star ${n <= stars ? 'on' : ''}">⭐</span>`).join('');
    this.el['levelclear-text'].textContent = `Du fick ${levelScore} poäng på den här banan. Totalt: ${totalScore} ⭐`;
    $('btn-next').textContent = isLast ? '🏆 Se resultatet' : '➡ Nästa bana';
    this.showScreen('levelclear');
  }

  showFinished(totalScore, name) {
    this.el['finished-score'].textContent = `${name} fick ${totalScore} poäng! 🦄🌈`;
    this.showScreen('finished');
  }

  setContinue(level) {
    const btn = this.el['btn-continue'];
    if (level > 1) {
      this.el['continue-level'].textContent = String(level);
      btn.classList.remove('hidden');
    } else {
      btn.classList.add('hidden');
    }
  }

  onNameInput(fn) {
    this.el.name.addEventListener('input', () => fn(this.playerName));
  }

  // Chips for every name that has played on this computer; clicking one
  // fills the name box. `onPick(name)` is called with the chosen name.
  renderPlayers(players, onPick) {
    const el = this.el.players;
    el.classList.toggle('hidden', players.length === 0);
    el.innerHTML = players.map((p) =>
      `<button type="button" class="chip ${p.current ? 'current' : ''}" data-name="${escapeHtml(p.name)}">👤 ${escapeHtml(p.name)}${p.level > 1 ? ` · bana ${p.level}` : ''}</button>`).join('');
    for (const chip of el.querySelectorAll('.chip')) {
      chip.addEventListener('click', (e) => { e.preventDefault(); onPick(chip.dataset.name); });
    }
  }

  markCurrentPlayer(name) {
    const key = name.trim().toLocaleLowerCase('sv');
    for (const chip of this.el.players.querySelectorAll('.chip')) {
      chip.classList.toggle('current', chip.dataset.name.toLocaleLowerCase('sv') === key);
    }
  }

  // Clear the name box for the next child and put the caret in it.
  newPlayer() {
    this.el.name.value = '';
    this.setContinue(1);
    this.markCurrentPlayer('');
    this.el.name.focus();
  }

  setMuted(muted) {
    this.el['btn-mute'].textContent = muted ? '🔇 Ljud av' : '🔊 Ljud på';
  }

  get playerName() {
    return this.el.name.value.trim();
  }

  set playerName(v) {
    this.el.name.value = v;
  }
}

// "bana 7" for a run that cleared seven levels, a trophy once all are done.
// (A run flown in flight mode gets a cloud in front – see renderScores.)
function describeLevels(levels) {
  const n = Number(levels) || 0;
  if (n >= LEVEL_COUNT) return `🏆 alla ${LEVEL_COUNT}`;
  return n > 0 ? `bana ${n}` : '';
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
