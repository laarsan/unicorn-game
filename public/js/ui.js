// DOM overlay: menus, HUD, tips, score popups. Pure presentation – the game
// calls these methods and subscribes to button clicks via `onButton`.

import { HEARTS_PER_LEVEL } from './config.js';

const $ = (id) => document.getElementById(id);

const SCREENS = ['menu', 'pause', 'levelclear', 'retry', 'finished', 'highscores', 'goodbye', 'loading'];

export class UI {
  constructor() {
    this.el = {};
    for (const id of [...SCREENS, 'hud', 'hud-hearts', 'hud-level', 'hud-score', 'hud-progress-fill', 'hud-progress-unicorn',
      'tip', 'tip-icon', 'tip-text', 'countdown', 'popups', 'name', 'finished-name', 'finished-score', 'menu-scores',
      'highscore-list', 'levelclear-title', 'levelclear-stars', 'levelclear-text', 'btn-continue', 'continue-level', 'btn-mute', 'btn-vr']) {
      this.el[id] = $(id);
    }
    this.tipTimer = null;
    this.lastHearts = -1;
    this.buttons = {};
  }

  onButton(id, fn) {
    const b = $(id);
    if (!b) throw new Error('missing button ' + id);
    b.addEventListener('click', (e) => { e.preventDefault(); fn(); });
  }

  showScreen(name) {
    for (const s of SCREENS) this.el[s].classList.toggle('hidden', s !== name);
    if (name === 'menu') setTimeout(() => this.el.name.focus(), 50);
    if (name === 'finished') setTimeout(() => { this.el['finished-name'].focus(); this.el['finished-name'].select(); }, 50);
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
      this.el['hud-hearts'].innerHTML = Array.from({ length: HEARTS_PER_LEVEL }, (_, i) =>
        `<span class="heart ${i < hearts ? '' : 'lost'} ${lost && i === hearts ? 'hit' : ''}">💖</span>`).join('');
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

  renderScores(target, scores, highlight) {
    const el = this.el[target];
    if (!scores.length) {
      el.innerHTML = '<h3>🏆 Topplistan</h3><p class="empty">Ingen har spelat än – bli först!</p>';
      return;
    }
    const rows = scores.map((s, i) => {
      const me = highlight && s.name === highlight.name && s.score === highlight.score && s.date === highlight.date;
      return `<li class="${me ? 'me' : ''}"><span class="rank">${i + 1}.</span><span class="name">${escapeHtml(s.name)}</span><span class="points">${s.score} ⭐</span></li>`;
    });
    el.innerHTML = `<h3>🏆 Topplistan</h3><ol>${rows.join('')}</ol>`;
  }

  showLevelClear({ level, stars, levelScore, totalScore, isLast }) {
    this.el['levelclear-title'].textContent = `Bana ${level.id} klarad! 🎉`;
    this.el['levelclear-stars'].innerHTML = [1, 2, 3].map((n) => `<span class="star ${n <= stars ? 'on' : ''}">⭐</span>`).join('');
    this.el['levelclear-text'].textContent = `Du fick ${levelScore} poäng på den här banan. Totalt: ${totalScore} ⭐`;
    $('btn-next').textContent = isLast ? '🏆 Se resultatet' : '➡ Nästa bana';
    this.showScreen('levelclear');
  }

  showFinished(totalScore, name) {
    this.el['finished-score'].textContent = `Du fick ${totalScore} poäng! 🦄🌈`;
    this.el['finished-name'].value = name;
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

  setMuted(muted) {
    this.el['btn-mute'].textContent = muted ? '🔇 Ljud av' : '🔊 Ljud på';
  }

  get playerName() {
    return this.el.name.value.trim();
  }

  set playerName(v) {
    this.el.name.value = v;
  }

  get finishedName() {
    return this.el['finished-name'].value.trim();
  }
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
