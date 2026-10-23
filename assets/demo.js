/* Chromatic Drift – the playable demo on the home page.
   A small copy of the game's own rules (Chroma/Core/Simulation.swift): every ball grows, charges up and
   reaches into a random neighbouring cell. An empty cell gets a new ball of its colour; when two colours
   meet, the rule for that pair decides. The visitor only changes the rules.
   Plain JavaScript, no libraries. Nothing is saved or sent anywhere. */
(() => {
  'use strict';

  // ---- Words shown by the demo (EDIT here) ----
  const WORDS = {
    names: ['', 'Red', 'Green', 'Blue'],
    solvedTitle: 'Solved',
    solvedBest: (color, n) => `The field is all ${color}, with ${n} change. That's the fewest possible.`,
    solvedMore: (color, n) => `The field is all ${color}, with ${n} changes. It can be done with one.`,
    luckyTitle: 'Lucky field',
    lucky: (color) => `${color} took the field before you changed a thing. Play again and break the loop yourself.`,
    goneTitle: 'All gone',
    gone: 'Every ball popped. Play again and try other rules.',
    changes: (n) => `${n} change${n === 1 ? '' : 's'}`,
    ruleSet: (a, b, label) => `${a} + ${b}: ${label}.`,
    play: 'Play',
    pause: 'Pause',
  };

  const root = document.getElementById('demo');
  if (!root) return;
  const board = root.querySelector('.board');
  const canvas = board.querySelector('canvas');
  const ctx = canvas.getContext('2d');
  const msg = board.querySelector('.board-msg');
  const statusEl = root.querySelector('.demo-status');
  const liveEl = root.querySelector('.demo-live');
  const shareBars = [...root.querySelectorAll('.share i')];
  const pauseBtn = root.querySelector('[data-act="pause"]');
  const speedBtns = [...root.querySelectorAll('.speed button')];

  // ---- Simulation constants (same scale as the game) ----
  const N = 28;                 // the field is N × N cells (smaller fields let the loop collapse on its own too soon)
  const FULL = 1000;            // growth at which a ball is fully grown
  const SPREAD = 2000;          // growth at which it reaches into a neighbour
  const FLASH = 5;              // ticks a changed cell glows
  const BASE_RATE = 150;        // growth per tick, ±25% per cell (the game varies it per cell too)
  const TICKS_PER_SECOND = 10;  // at 1×
  const COLORS = ['', '#FF4D5E', '#3DDC84', '#3D8BFF'];   // the app's Red, Green, Blue
  const LOOP = { '1-2': 'w1', '2-3': 'w2', '1-3': 'w3' }; // Red > Green > Blue > Red

  const cells = N * N;
  const color = new Uint8Array(cells);
  const growth = new Uint16Array(cells);
  const rate = new Uint16Array(cells);
  const flash = new Uint8Array(cells);
  const from = new Uint8Array(cells);     // colour before the last change, for the fade
  const counts = [0, 0, 0, 0];
  let rules = {};
  let changes = 0;
  let forward = true;
  let finished = false;
  let running = false;
  let speed = 1;

  const rand = (n) => Math.floor(Math.random() * n);
  const key = (a, b) => (a < b ? `${a}-${b}` : `${b}-${a}`);

  function place(j, c) { color[j] = c; growth[j] = 0; from[j] = 0; flash[j] = 0; }
  function recolor(j, c) { from[j] = color[j]; color[j] = c; flash[j] = FLASH; if (growth[j] > FULL) growth[j] = FULL; }
  function clear(j) { from[j] = color[j]; color[j] = 0; growth[j] = 0; flash[j] = FLASH; }

  function spread(i, c) {
    let x = i % N, y = (i / N) | 0;
    switch (rand(4)) { case 0: x++; break; case 1: y++; break; case 2: x--; break; default: y--; }
    if (x < 0 || y < 0 || x >= N || y >= N) return;   // edge: keep the charge, try again next tick
    const j = y * N + x;
    growth[i] = FULL;
    const d = color[j];
    if (!d) { place(j, c); return; }
    if (d === c) return;                               // same colour: nothing happens
    const rule = rules[key(c, d)];
    if (rule === 'stop') return;
    if (rule === 'pop') { clear(i); clear(j); return; }
    const attackerWins = rule === 'chance' ? rand(2) === 0 : rule === 'w' + c;
    if (attackerWins) recolor(j, c); else recolor(i, d);
  }

  function step() {
    for (let row = 0; row < N; row++) {
      for (let col = 0; col < N; col++) {
        const i = row * N + (forward ? col : N - 1 - col);
        if (flash[i]) flash[i]--;
        const c = color[i];
        if (!c) continue;
        const g = growth[i] + rate[i];
        if (g < SPREAD) { growth[i] = g; continue; }
        growth[i] = SPREAD;
        spread(i, c);
      }
    }
    forward = !forward;
    count();
  }

  function count() {
    counts.fill(0);
    for (let i = 0; i < cells; i++) counts[color[i]]++;
  }

  // ---- Setting up a field ----
  function newField() {
    for (let attempt = 0; attempt < 20; attempt++) {
      color.fill(0); growth.fill(0); flash.fill(0); from.fill(0);
      for (let i = 0; i < cells; i++) rate[i] = Math.round(BASE_RATE * (75 + rand(51)) / 100);
      for (let c = 1; c <= 3; c++) {
        for (let k = 0; k < 4; k++) {
          let i; do { i = rand(cells); } while (color[i]);
          place(i, c); growth[i] = FULL;
        }
      }
      rules = { ...LOOP };
      count();
      // Run ahead until the field is mostly full, so the loop is already swirling.
      for (let t = 0; t < 400 && counts[0] > cells * 0.04; t++) step();
      flash.fill(0);
      // Keep only balanced starts: a colour that starts small can die out before the visitor does anything.
      const balls = counts[1] + counts[2] + counts[3];
      if (Math.min(counts[1], counts[2], counts[3]) >= balls * 0.22) return;
    }
  }

  function restart() {
    newField();
    changes = 0;
    finished = false;
    msg.hidden = true;
    root.querySelectorAll('.rule').forEach((set) => {
      const value = LOOP[set.dataset.pair];
      set.querySelectorAll('input').forEach((input) => { input.checked = input.value === value; });
    });
    updateStatus();
    draw(0);
  }

  // ---- Win and loss ----
  function checkEnd() {
    const alive = [1, 2, 3].filter((c) => counts[c] > 0);
    if (alive.length > 1) return;
    finished = true;
    let title, text;
    if (alive.length === 0) {
      title = WORDS.goneTitle; text = WORDS.gone;
    } else {
      const name = WORDS.names[alive[0]];
      if (changes === 0) { title = WORDS.luckyTitle; text = WORDS.lucky(name); }
      else { title = WORDS.solvedTitle; text = changes === 1 ? WORDS.solvedBest(name, 1) : WORDS.solvedMore(name, changes); }
    }
    msg.querySelector('strong').textContent = title;
    msg.querySelector('p').textContent = text;
    msg.hidden = false;
    announce(`${title}. ${text}`);
  }

  function updateStatus() {
    statusEl.textContent = WORDS.changes(changes);
    const total = counts[1] + counts[2] + counts[3] || 1;
    shareBars.forEach((bar, k) => { bar.style.flexGrow = String(counts[k + 1] / total); });
  }

  function announce(text) {
    liveEl.textContent = '';
    requestAnimationFrame(() => { liveEl.textContent = text; });
  }

  // ---- Drawing ----
  // Each colour gets two small pre-drawn pictures: the ball (with a soft highlight) and its glow.
  const SPRITE = 64;
  const sprites = COLORS.map((hex) => {
    if (!hex) return null;
    const ball = document.createElement('canvas');
    ball.width = ball.height = SPRITE;
    let g = ball.getContext('2d');
    const r = SPRITE / 2;
    const body = g.createRadialGradient(r * 0.7, r * 0.6, r * 0.05, r, r, r);
    body.addColorStop(0, mixWhite(hex, 0.55));
    body.addColorStop(0.45, hex);
    body.addColorStop(1, shade(hex, 0.72));
    g.fillStyle = body;
    g.beginPath(); g.arc(r, r, r - 1, 0, Math.PI * 2); g.fill();

    const glow = document.createElement('canvas');
    glow.width = glow.height = SPRITE;
    g = glow.getContext('2d');
    const halo = g.createRadialGradient(r, r, 0, r, r, r);
    halo.addColorStop(0, hexA(hex, 0.6));
    halo.addColorStop(0.5, hexA(hex, 0.22));
    halo.addColorStop(1, hexA(hex, 0));
    g.fillStyle = halo;
    g.fillRect(0, 0, SPRITE, SPRITE);
    return { ball, glow };
  });

  function rgb(hex) { const n = parseInt(hex.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; }
  function hexA(hex, a) { const [r, g, b] = rgb(hex); return `rgba(${r},${g},${b},${a})`; }
  function mixWhite(hex, t) { const [r, g, b] = rgb(hex); return `rgb(${r + (255 - r) * t | 0},${g + (255 - g) * t | 0},${b + (255 - b) * t | 0})`; }
  function shade(hex, t) { const [r, g, b] = rgb(hex); return `rgb(${r * t | 0},${g * t | 0},${b * t | 0})`; }

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const size = Math.round(board.clientWidth * dpr);
    if (size && canvas.width !== size) { canvas.width = canvas.height = size; draw(0); }
  }

  // alpha: how far we are between two ticks (0…1), so growth looks smooth between steps.
  function draw(alpha) {
    const W = canvas.width;
    const cs = W / N;
    ctx.fillStyle = '#120810';
    ctx.fillRect(0, 0, W, W);
    ctx.fillStyle = 'rgba(251,238,228,0.05)';
    for (let i = 0; i < cells; i++) {
      const x = (i % N + 0.5) * cs, y = ((i / N | 0) + 0.5) * cs;
      ctx.fillRect(x - 1, y - 1, 2, 2);
    }
    // glows first, then balls on top
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < cells; i++) {
      const c = color[i];
      if (!c) continue;
      const g = growth[i];
      const charge = g > FULL ? (g - FULL) / FULL : 0;
      const a = 0.35 + 0.45 * charge + (flash[i] ? 0.5 * flash[i] / FLASH : 0);
      if (g < FULL * 0.5) continue;
      const s = cs * 2.1;
      ctx.globalAlpha = Math.min(1, a);
      ctx.drawImage(sprites[c].glow, (i % N + 0.5) * cs - s / 2, ((i / N | 0) + 0.5) * cs - s / 2, s, s);
    }
    ctx.globalCompositeOperation = 'source-over';
    for (let i = 0; i < cells; i++) {
      const cx = (i % N + 0.5) * cs, cy = ((i / N | 0) + 0.5) * cs;
      const c = color[i];
      if (!c) {
        if (flash[i] && from[i]) {      // popped: the old ball fades and shrinks
          const t = flash[i] / FLASH;
          const s = cs * 0.9 * t;
          ctx.globalAlpha = t;
          ctx.drawImage(sprites[from[i]].ball, cx - s / 2, cy - s / 2, s, s);
        }
        continue;
      }
      const g = Math.min(FULL, growth[i] + (growth[i] < FULL ? rate[i] * alpha : 0));
      const s = cs * 0.9 * (0.18 + 0.82 * g / FULL);
      ctx.globalAlpha = 1;
      ctx.drawImage(sprites[c].ball, cx - s / 2, cy - s / 2, s, s);
      if (flash[i] && from[i]) {        // recoloured: the old colour fades out on top
        ctx.globalAlpha = flash[i] / FLASH * 0.8;
        ctx.drawImage(sprites[from[i]].ball, cx - s / 2, cy - s / 2, s, s);
      }
    }
    ctx.globalAlpha = 1;
  }

  // ---- Main loop: fixed ticks, smooth frames ----
  let last = 0, acc = 0, frame = 0, visible = true, onScreen = true;
  function loop(now) {
    frame = 0;
    if (!running || !visible || !onScreen) return;
    const dt = Math.min(250, now - (last || now));
    last = now;
    if (!finished) {
      acc += dt * TICKS_PER_SECOND * speed / 1000;
      let stepped = false;
      while (acc >= 1) { step(); acc -= 1; stepped = true; }
      if (stepped) { updateStatus(); checkEnd(); }
    }
    draw(finished ? 0 : acc);
    frame = requestAnimationFrame(loop);
  }
  function kick() {
    if (!frame && running && visible && onScreen) { last = 0; frame = requestAnimationFrame(loop); }
  }
  function setRunning(on) {
    running = on;
    pauseBtn.querySelector('span').textContent = on ? WORDS.pause : WORDS.play;
    pauseBtn.setAttribute('aria-pressed', on ? 'false' : 'true');
    pauseBtn.querySelector('.i-pause').style.display = on ? '' : 'none';
    pauseBtn.querySelector('.i-play').style.display = on ? 'none' : '';
    kick();
  }

  // ---- Controls ----
  root.querySelectorAll('.rule').forEach((set) => {
    const [a, b] = set.dataset.pair.split('-').map(Number);
    set.addEventListener('change', (e) => {
      const input = e.target;
      rules[set.dataset.pair] = input.value;
      changes++;
      updateStatus();
      const label = input.closest('label').textContent.trim().replace(/\s+/g, ' ');
      announce(WORDS.ruleSet(WORDS.names[a], WORDS.names[b], label) + ' ' + WORDS.changes(changes) + '.');
      if (finished) return;
      if (!running) setRunning(true);
    });
  });
  root.querySelectorAll('[data-act="restart"]').forEach((btn) => btn.addEventListener('click', () => {
    restart();
    setRunning(true);
  }));
  pauseBtn.addEventListener('click', () => setRunning(!running));
  speedBtns.forEach((btn) => btn.addEventListener('click', () => {
    speed = Number(btn.dataset.speed);
    speedBtns.forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
  }));

  document.addEventListener('visibilitychange', () => { visible = !document.hidden; kick(); });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver((entries) => { onScreen = entries[0].isIntersecting; kick(); }).observe(board);
  }
  if ('ResizeObserver' in window) new ResizeObserver(resize).observe(board);
  else window.addEventListener('resize', resize);

  restart();
  resize();
  // People who ask for less motion get a still field; Play starts it.
  const still = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  setRunning(!still);
})();
