// The mouse pointer: a golden, glittery rainbow-striped unicorn horn about
// three times the size of a normal arrow, drawn as an SVG data URI and set as
// the CSS cursor for the whole page. A cursor image cannot be animated, so a
// small trail of glitter sparks follows the pointer instead.

const CURSOR_SIZE = 96;        // px – three times a standard 32 px pointer (browsers cap cursors at 128)
const HOTSPOT = 5;             // the tip of the horn is the click point
const SPARK_INTERVAL_MS = 45;
const SPARK_LIFETIME_MS = 700;
const SPARK_COLORS = ['#ff5d8f', '#ff9f43', '#ffe066', '#7bed9f', '#70c1ff', '#9b7bff', '#ffffff'];

function hornSvg() {
  // Horn drawn pointing straight up in a local frame (tip at 0,0, base at y=76),
  // then rotated 45° clockwise so the tip sits at the top-left corner.
  const stripes = ['#ff5d8f', '#ff9f43', '#ffe066', '#7bed9f', '#70c1ff', '#9b7bff', '#ff8ad8'];
  const stripeEls = stripes.map((c, i) => {
    const y = 8 + i * 9.5;
    return `<path d="M-20 ${y + 6} Q0 ${y - 4} 20 ${y + 6} L20 ${y + 11} Q0 ${y + 1} -20 ${y + 11} Z" fill="${c}" opacity="0.85"/>`;
  }).join('');
  const sparks = [[62, 22, 7], [78, 48, 5], [30, 70, 6], [70, 74, 4], [22, 38, 4]].map(([x, y, r]) =>
    `<path d="M${x} ${y - r} Q${x} ${y} ${x + r} ${y} Q${x} ${y} ${x} ${y + r} Q${x} ${y} ${x - r} ${y} Q${x} ${y} ${x} ${y - r} Z" fill="#fff" stroke="#ffd23f" stroke-width="1"/>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${CURSOR_SIZE}" height="${CURSOR_SIZE}" viewBox="0 0 ${CURSOR_SIZE} ${CURSOR_SIZE}">
  <defs>
    <linearGradient id="gold" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#fff2a8"/><stop offset="0.45" stop-color="#ffd23f"/><stop offset="1" stop-color="#d99a12"/>
    </linearGradient>
    <linearGradient id="shine" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#fff" stop-opacity="0.9"/><stop offset="0.5" stop-color="#fff" stop-opacity="0"/>
    </linearGradient>
    <clipPath id="horn"><path d="M0 0 L14 76 Q0 84 -14 76 Z"/></clipPath>
  </defs>
  <g transform="translate(${HOTSPOT} ${HOTSPOT}) rotate(-45)">
    <path d="M0 0 L14 76 Q0 84 -14 76 Z" fill="url(#gold)" stroke="#a86f0a" stroke-width="2" stroke-linejoin="round"/>
    <g clip-path="url(#horn)">${stripeEls}<path d="M-14 76 L-6 0 L-1 0 L-9 78 Z" fill="url(#shine)"/></g>
    <path d="M0 0 L14 76 Q0 84 -14 76 Z" fill="none" stroke="#fff" stroke-width="1.2" stroke-opacity="0.8"/>
  </g>
  ${sparks}
</svg>`;
}

export function installCursor() {
  const uri = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(hornSvg());
  document.documentElement.style.setProperty('--cursor-horn', `url("${uri}") ${HOTSPOT} ${HOTSPOT}, auto`);
  installGlitterTrail();
  return uri;
}

function installGlitterTrail() {
  const layer = document.createElement('div');
  layer.id = 'cursor-sparks';
  document.body.appendChild(layer);
  let last = 0;
  window.addEventListener('pointermove', (e) => {
    const now = performance.now();
    if (now - last < SPARK_INTERVAL_MS) return;
    last = now;
    const spark = document.createElement('span');
    spark.className = 'spark';
    spark.textContent = Math.random() < 0.5 ? '✦' : '✧';
    spark.style.left = e.clientX + (Math.random() - 0.5) * 18 + 'px';
    spark.style.top = e.clientY + 6 + Math.random() * 14 + 'px';
    spark.style.color = SPARK_COLORS[Math.floor(Math.random() * SPARK_COLORS.length)];
    spark.style.fontSize = 10 + Math.random() * 12 + 'px';
    spark.style.setProperty('--dx', (Math.random() - 0.5) * 30 + 'px');
    spark.style.animationDuration = SPARK_LIFETIME_MS + 'ms';
    layer.appendChild(spark);
    setTimeout(() => spark.remove(), SPARK_LIFETIME_MS);
  }, { passive: true });
}
