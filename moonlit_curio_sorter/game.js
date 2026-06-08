const canvas = document.querySelector("#game");
const ctx = canvas.getContext("2d");

const ui = {
  score: document.querySelector("#score"),
  combo: document.querySelector("#combo"),
  best: document.querySelector("#best"),
  time: document.querySelector("#time"),
  timeFill: document.querySelector("#timeFill"),
  lives: document.querySelector("#lives"),
  livesFill: document.querySelector("#livesFill"),
  speed: document.querySelector("#speed"),
  sorted: document.querySelector("#sorted"),
  state: document.querySelector("#state"),
  overlay: document.querySelector("#overlay"),
  overlayTitle: document.querySelector("#overlayTitle"),
  overlayText: document.querySelector("#overlayText"),
  startButton: document.querySelector("#startButton"),
  pauseButton: document.querySelector("#pauseButton"),
  soundToggle: document.querySelector("#soundToggle"),
  queueList: document.querySelector("#queueList"),
  floatingNote: document.querySelector("#floatingNote"),
  drawerButtons: [...document.querySelectorAll(".drawer-button")],
};

const W = canvas.width;
const H = canvas.height;
const BEST_KEY = "moonlit-curio-sorter-best";
const SHIFT_TIME = 60;
const MAX_MISTAKES = 3;
const DROP_LINE_Y = 410;
const DRAWER_Y = 788;
const drawCalls = {
  star: drawStarIcon,
  key: drawKeyIcon,
  shell: drawShellIcon,
  bloom: drawBloomIcon,
};

const drawers = [
  { id: "star", name: "星章", color: "#c65b2f", accent: "#f4d37d", x: 132 },
  { id: "key", name: "鍵印", color: "#54725d", accent: "#dce6d8", x: 292 },
  { id: "shell", name: "貝飾", color: "#35607e", accent: "#d8edf3", x: 452 },
  { id: "bloom", name: "花札", color: "#7d4f63", accent: "#f0dae4", x: 612 },
];

let audio = null;
let musicTimer = 0;
let soundOn = true;
let best = Number(localStorage.getItem(BEST_KEY) || 0);
let last = performance.now();
let noteTimer = 0;
let state;

function reset() {
  state = {
    started: false,
    paused: false,
    over: false,
    score: 0,
    combo: 1,
    sorted: 0,
    mistakes: 0,
    timeLeft: SHIFT_TIME,
    selected: 0,
    queue: [],
    relic: null,
    spawnDelay: 0.15,
    particles: [],
    flashes: drawers.map(() => 0),
    elapsed: 0,
  };
  fillQueue();
  syncDrawerButtons();
  renderQueue();
  syncHud();
}

function fillQueue() {
  while (state.queue.length < 4) {
    const previous = state.queue[state.queue.length - 1];
    state.queue.push(makeRelic(previous));
  }
}

function makeRelic(previous) {
  let pool = drawers.map((drawer) => drawer.id);
  if (previous && previous.type === pool[pool.length - 1]) {
    pool = pool.filter((id) => id !== previous.type);
  }
  const type = pool[Math.floor(Math.random() * pool.length)];
  return {
    type,
    gilded: Math.random() < 0.16,
    express: Math.random() < 0.2,
    sway: (Math.random() - 0.5) * 44,
    seed: Math.random() * Math.PI * 2,
    y: -90,
    x: W / 2,
    state: "dropping",
    speed: 228 + state.sorted * 4 + Math.random() * 36,
    routeT: 0,
    lockedSelection: 0,
    correct: false,
  };
}

function spawnRelic() {
  state.relic = state.queue.shift();
  fillQueue();
  renderQueue();
}

function ensureAudio() {
  if (!soundOn) return null;
  if (!audio) audio = new (window.AudioContext || window.webkitAudioContext)();
  if (audio.state === "suspended") audio.resume();
  return audio;
}

function tone(freq, duration = 0.12, type = "triangle", gainAmount = 0.045, delay = 0) {
  const ac = ensureAudio();
  if (!ac) return;
  const startAt = ac.currentTime + delay;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.0001, startAt);
  gain.gain.exponentialRampToValueAtTime(gainAmount, startAt + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
  osc.connect(gain).connect(ac.destination);
  osc.start(startAt);
  osc.stop(startAt + duration + 0.03);
}

function startMusic() {
  stopMusic();
  if (!soundOn) return;
  const melody = [293.66, 329.63, 392, 440, 392, 329.63, 261.63, 329.63];
  let step = 0;
  musicTimer = window.setInterval(() => {
    if (!soundOn || !state.started || state.paused || state.over) return;
    tone(melody[step % melody.length], 0.11, "triangle", 0.016);
    if (step % 4 === 0) tone(melody[step % melody.length] / 2, 0.18, "sine", 0.012, 0.02);
    step += 1;
  }, 320);
}

function stopMusic() {
  if (musicTimer) window.clearInterval(musicTimer);
  musicTimer = 0;
}

function sfx(kind) {
  if (!soundOn) return;
  if (kind === "good") {
    tone(660, 0.08, "triangle", 0.08);
    tone(980, 0.12, "sine", 0.06, 0.03);
  } else if (kind === "gilded") {
    tone(520, 0.08, "triangle", 0.09);
    tone(780, 0.12, "sine", 0.06, 0.02);
    tone(1170, 0.16, "triangle", 0.05, 0.06);
  } else if (kind === "select") {
    tone(300, 0.05, "square", 0.03);
  } else if (kind === "bad") {
    tone(150, 0.18, "sawtooth", 0.08);
    tone(96, 0.2, "triangle", 0.06, 0.03);
  } else if (kind === "start") {
    tone(392, 0.1, "triangle", 0.05);
    tone(523, 0.12, "triangle", 0.05, 0.04);
  }
}

function startGame() {
  reset();
  state.started = true;
  state.over = false;
  ui.overlay.classList.add("hidden");
  ui.pauseButton.textContent = "Pause";
  ui.startButton.textContent = "Restart Shift";
  last = performance.now();
  noteTimer = 0;
  ensureAudio();
  startMusic();
  sfx("start");
}

function endGame(title, description) {
  state.over = true;
  state.started = false;
  stopMusic();
  best = Math.max(best, state.score);
  localStorage.setItem(BEST_KEY, String(best));
  ui.overlayTitle.textContent = title;
  ui.overlayText.textContent = `${description} 合計 ${state.score}点 / Best ${best}点。`;
  ui.overlay.classList.remove("hidden");
  syncHud();
}

function setSelected(index, dispatch = false) {
  if (index < 0 || index >= drawers.length) return;
  state.selected = index;
  syncDrawerButtons();
  if (state.started && !state.paused && !state.over) sfx("select");
  if (dispatch && state.started && !state.paused && !state.over && state.relic && state.relic.state === "dropping") {
    routeRelic();
  }
}

function syncDrawerButtons() {
  ui.drawerButtons.forEach((button, index) => {
    button.classList.toggle("active", index === state.selected);
  });
}

function syncHud() {
  ui.score.textContent = state.score.toLocaleString("ja-JP");
  ui.combo.textContent = `x${state.combo}`;
  ui.best.textContent = best.toLocaleString("ja-JP");
  ui.time.textContent = `${Math.max(0, state.timeLeft).toFixed(1)}s`;
  ui.timeFill.style.width = `${Math.max(0, (state.timeLeft / SHIFT_TIME) * 100)}%`;
  ui.lives.textContent = `${state.mistakes} / ${MAX_MISTAKES}`;
  ui.livesFill.style.width = `${Math.min(100, (state.mistakes / MAX_MISTAKES) * 100)}%`;
  ui.speed.textContent = `Flow ${(1 + state.sorted * 0.03).toFixed(1)}`;
  ui.sorted.textContent = `Sorted ${state.sorted}`;
  ui.state.textContent = state.over ? "Ended" : state.paused ? "Paused" : state.started ? "Sorting" : "Ready";
}

function renderQueue() {
  ui.queueList.innerHTML = state.queue.slice(0, 3).map((relic) => {
    const drawer = drawers.find((item) => item.id === relic.type);
    const badge = relic.gilded ? "封" : relic.express ? "急" : "次";
    const label = relic.gilded ? "高価査定" : relic.express ? "急送" : "通常品";
    return `
      <div class="queue-item">
        <div class="queue-badge" style="background:${drawer.color}">${badge}</div>
        <div>
          <strong>${drawer.name}</strong>
          <span>${label}</span>
        </div>
      </div>
    `;
  }).join("");
}

function flashNote(text) {
  ui.floatingNote.textContent = text;
  ui.floatingNote.classList.add("show");
  window.clearTimeout(noteTimer);
  noteTimer = window.setTimeout(() => ui.floatingNote.classList.remove("show"), 900);
}

function routeRelic() {
  const relic = state.relic;
  if (!relic || relic.state !== "dropping") return;
  relic.state = "routing";
  relic.routeT = 0;
  relic.startX = relic.x;
  relic.startY = DROP_LINE_Y;
  relic.lockedSelection = state.selected;
  relic.correct = drawers[state.selected].id === relic.type;
}

function resolveRelic() {
  const relic = state.relic;
  if (!relic) return;
  const drawerIndex = relic.lockedSelection;
  state.flashes[drawerIndex] = 1;
  if (relic.correct) {
    const points = 90 + state.combo * 18 + (relic.gilded ? 180 : 0) + (relic.express ? 50 : 0);
    state.score += points;
    state.combo += 1;
    state.sorted += 1;
    spawnBurst(drawers[drawerIndex].x, DRAWER_Y - 28, drawers[drawerIndex].accent, relic.gilded ? 22 : 14);
    flashNote(relic.gilded ? `査定成功 +${points}` : `仕分け成功 +${points}`);
    sfx(relic.gilded ? "gilded" : "good");
  } else {
    state.mistakes += 1;
    state.combo = 1;
    spawnBurst(drawers[drawerIndex].x, DRAWER_Y - 24, "#7a2f2f", 12);
    flashNote("仕分け違い");
    sfx("bad");
  }
  state.relic = null;
  state.spawnDelay = 0.14;
  if (state.mistakes >= MAX_MISTAKES) {
    endGame("Shift Failed", "引き出しが混線しました。");
  }
}

function spawnBurst(x, y, color, count) {
  for (let i = 0; i < count; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 60 + Math.random() * 180;
    state.particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0.4 + Math.random() * 0.35,
      color,
      size: 2 + Math.random() * 5,
    });
  }
}

function update(dt) {
  state.flashes = state.flashes.map((value) => Math.max(0, value - dt * 4.8));
  state.particles = state.particles.filter((particle) => {
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;
    particle.vy += 220 * dt;
    particle.life -= dt;
    return particle.life > 0;
  });

  if (!state.started || state.paused || state.over) {
    syncHud();
    return;
  }

  state.elapsed += dt;
  state.timeLeft -= dt;
  if (state.timeLeft <= 0) {
    state.timeLeft = 0;
    endGame("Shift Complete", "夜の仕分けはここで終了です。");
    return;
  }

  if (!state.relic) {
    state.spawnDelay -= dt;
    if (state.spawnDelay <= 0) spawnRelic();
  }

  if (state.relic) {
    const relic = state.relic;
    if (relic.state === "dropping") {
      relic.y += (relic.speed + state.sorted * 5) * (relic.express ? 1.3 : 1) * dt;
      relic.x = W / 2 + Math.sin(state.elapsed * 3 + relic.seed) * relic.sway;
      if (relic.y >= DROP_LINE_Y) {
        relic.y = DROP_LINE_Y;
        routeRelic();
      }
    } else {
      const drawer = drawers[relic.lockedSelection];
      relic.routeT = Math.min(1, relic.routeT + dt / 0.26);
      const eased = 1 - (1 - relic.routeT) * (1 - relic.routeT);
      relic.x = relic.startX + (drawer.x - relic.startX) * eased;
      relic.y = relic.startY + ((DRAWER_Y - 28) - relic.startY) * eased;
      if (relic.routeT >= 1) resolveRelic();
    }
  }

  syncHud();
}

function drawBackground() {
  const gradient = ctx.createLinearGradient(0, 0, 0, H);
  gradient.addColorStop(0, "#fbf1dc");
  gradient.addColorStop(1, "#efd7b0");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = "rgba(39, 27, 23, 0.05)";
  for (let x = 24; x < W; x += 36) {
    ctx.fillRect(x, 0, 1, H);
  }
  for (let y = 32; y < H; y += 36) {
    ctx.fillRect(0, y, W, 1);
  }

  ctx.fillStyle = "#d9bb87";
  roundRect(32, 28, W - 64, H - 56, 28);
  ctx.fill();
  ctx.fillStyle = "#fbf7ef";
  roundRect(56, 52, W - 112, H - 104, 24);
  ctx.fill();
}

function drawMachine() {
  ctx.save();
  ctx.fillStyle = "#28415a";
  roundRect(236, 92, 248, 396, 26);
  ctx.fill();

  ctx.fillStyle = "#f6eedc";
  roundRect(266, 124, 188, 298, 22);
  ctx.fill();

  ctx.strokeStyle = "#b88746";
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(W / 2, 120);
  ctx.lineTo(W / 2, 452);
  ctx.stroke();

  ctx.fillStyle = "#b88746";
  roundRect(240, DROP_LINE_Y - 18, 240, 42, 20);
  ctx.fill();

  ctx.fillStyle = "#28415a";
  roundRect(308, 168, 104, 68, 16);
  ctx.fill();
  ctx.fillStyle = "#f6eedc";
  ctx.font = '700 22px "Avenir Next", sans-serif';
  ctx.textAlign = "center";
  ctx.fillText("SORTER", W / 2, 210);
  ctx.restore();
}

function drawDrawers() {
  drawers.forEach((drawer, index) => {
    const flash = state.flashes[index];
    const drawerY = DRAWER_Y;
    ctx.save();
    ctx.translate(drawer.x, drawerY);
    if (flash > 0) {
      ctx.fillStyle = flash > 0.6 ? "rgba(255,255,255,0.9)" : `${drawer.color}55`;
      ctx.beginPath();
      ctx.arc(0, -22, 52 + flash * 10, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = drawer.color;
    roundRect(-62, -22, 124, 74, 18);
    ctx.fill();
    ctx.fillStyle = drawer.accent;
    roundRect(-50, -10, 100, 50, 14);
    ctx.fill();
    ctx.strokeStyle = "#271b17";
    ctx.lineWidth = 3;
    roundRect(-50, -10, 100, 50, 14);
    ctx.stroke();
    ctx.fillStyle = "#271b17";
    drawCalls[drawer.id](ctx, 0, 4, 16);
    ctx.font = '700 13px "Avenir Next", sans-serif';
    ctx.textAlign = "center";
    ctx.fillText(drawer.name, 0, 33);
    if (index === state.selected) {
      ctx.strokeStyle = "#b88746";
      ctx.lineWidth = 4;
      roundRect(-67, -27, 134, 84, 20);
      ctx.stroke();
    }
    ctx.restore();
  });
}

function drawQueueRail() {
  ctx.save();
  ctx.fillStyle = "#7b5e44";
  roundRect(82, 100, 116, 212, 20);
  ctx.fill();
  ctx.fillStyle = "#fbf7ef";
  roundRect(98, 116, 84, 180, 16);
  ctx.fill();
  ctx.fillStyle = "#271b17";
  ctx.font = '700 16px "Avenir Next", sans-serif';
  ctx.textAlign = "center";
  ctx.fillText("QUEUE", 140, 138);
  state.queue.slice(0, 3).forEach((relic, index) => {
    const drawer = drawers.find((item) => item.id === relic.type);
    const y = 180 + index * 44;
    ctx.fillStyle = drawer.color;
    roundRect(110, y, 60, 30, 12);
    ctx.fill();
    ctx.fillStyle = drawer.accent;
    drawCalls[drawer.id](ctx, 140, y + 15, 10);
    if (relic.gilded) {
      ctx.strokeStyle = "#b88746";
      ctx.lineWidth = 3;
      roundRect(110, y, 60, 30, 12);
      ctx.stroke();
    }
  });
  ctx.restore();
}

function drawRelic() {
  const relic = state.relic;
  if (!relic) return;
  const drawer = drawers.find((item) => item.id === relic.type);
  ctx.save();
  ctx.translate(relic.x, relic.y);
  ctx.rotate(Math.sin(state.elapsed * 2.8 + relic.seed) * 0.03);
  ctx.fillStyle = drawer.color;
  roundRect(-44, -54, 88, 108, 18);
  ctx.fill();
  ctx.fillStyle = "#fff8ea";
  roundRect(-34, -42, 68, 84, 15);
  ctx.fill();
  ctx.strokeStyle = "#271b17";
  ctx.lineWidth = 3;
  roundRect(-34, -42, 68, 84, 15);
  ctx.stroke();
  ctx.fillStyle = drawer.color;
  drawCalls[drawer.id](ctx, 0, -2, 18);
  ctx.fillStyle = "#271b17";
  ctx.font = '700 13px "Avenir Next", sans-serif';
  ctx.textAlign = "center";
  ctx.fillText(drawer.name, 0, 28);
  if (relic.gilded) {
    ctx.fillStyle = "#b88746";
    ctx.beginPath();
    ctx.arc(23, -28, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fff7de";
    ctx.font = '700 11px "Avenir Next", sans-serif';
    ctx.fillText("封", 23, -24);
  }
  if (relic.express) {
    ctx.fillStyle = "#271b17";
    ctx.font = '700 11px "Avenir Next", sans-serif';
    ctx.fillText("急", -22, -25);
  }
  ctx.restore();
}

function drawParticles() {
  state.particles.forEach((particle) => {
    ctx.save();
    ctx.globalAlpha = Math.max(0, particle.life * 1.6);
    ctx.fillStyle = particle.color;
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });
}

function drawLegend() {
  ctx.save();
  ctx.fillStyle = "#271b17";
  ctx.font = '700 14px "Avenir Next", sans-serif';
  ctx.textAlign = "left";
  ctx.fillText("SELECTED DRAWER", 72, 340);
  ctx.fillText("SPLITTER", W / 2 - 36, DROP_LINE_Y - 30);
  ctx.restore();
}

function draw() {
  drawBackground();
  drawMachine();
  drawQueueRail();
  drawDrawers();
  drawRelic();
  drawParticles();
  drawLegend();
}

function loop(now) {
  const dt = Math.min(0.033, (now - last) / 1000 || 0);
  last = now;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

function roundRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawStarIcon(target, x, y, size) {
  target.save();
  target.translate(x, y);
  target.beginPath();
  for (let i = 0; i < 5; i += 1) {
    const outer = ((Math.PI * 2) / 5) * i - Math.PI / 2;
    const inner = outer + Math.PI / 5;
    const ox = Math.cos(outer) * size;
    const oy = Math.sin(outer) * size;
    const ix = Math.cos(inner) * size * 0.45;
    const iy = Math.sin(inner) * size * 0.45;
    if (i === 0) target.moveTo(ox, oy);
    else target.lineTo(ox, oy);
    target.lineTo(ix, iy);
  }
  target.closePath();
  target.fill();
  target.restore();
}

function drawKeyIcon(target, x, y, size) {
  target.save();
  target.translate(x, y);
  target.beginPath();
  target.arc(-size * 0.18, -size * 0.1, size * 0.36, 0, Math.PI * 2);
  target.fill();
  target.fillRect(-size * 0.05, -size * 0.1, size * 0.82, size * 0.18);
  target.fillRect(size * 0.42, -size * 0.1, size * 0.12, size * 0.38);
  target.fillRect(size * 0.62, -size * 0.1, size * 0.12, size * 0.28);
  target.restore();
}

function drawShellIcon(target, x, y, size) {
  target.save();
  target.translate(x, y);
  target.beginPath();
  target.moveTo(-size, size * 0.35);
  target.quadraticCurveTo(-size * 0.8, -size * 0.95, 0, -size * 0.2);
  target.quadraticCurveTo(size * 0.8, -size * 0.95, size, size * 0.35);
  target.lineTo(-size, size * 0.35);
  target.fill();
  target.strokeStyle = "rgba(39,27,23,0.22)";
  target.lineWidth = 2;
  for (let i = -2; i <= 2; i += 1) {
    target.beginPath();
    target.moveTo(0, -size * 0.12);
    target.lineTo(i * size * 0.22, size * 0.34);
    target.stroke();
  }
  target.restore();
}

function drawBloomIcon(target, x, y, size) {
  target.save();
  target.translate(x, y);
  for (let i = 0; i < 6; i += 1) {
    const angle = (Math.PI * 2 * i) / 6;
    target.beginPath();
    target.ellipse(Math.cos(angle) * size * 0.46, Math.sin(angle) * size * 0.46, size * 0.34, size * 0.22, angle, 0, Math.PI * 2);
    target.fill();
  }
  target.beginPath();
  target.arc(0, 0, size * 0.24, 0, Math.PI * 2);
  target.fillStyle = "#fff4d6";
  target.fill();
  target.restore();
}

ui.startButton.addEventListener("click", startGame);
ui.pauseButton.addEventListener("click", () => {
  if (!state.started || state.over) return;
  state.paused = !state.paused;
  ui.pauseButton.textContent = state.paused ? "Resume" : "Pause";
  if (state.paused) stopMusic();
  else if (soundOn) startMusic();
  syncHud();
});
ui.soundToggle.addEventListener("click", () => {
  soundOn = !soundOn;
  ui.soundToggle.textContent = soundOn ? "Sound ON" : "Sound OFF";
  ui.soundToggle.setAttribute("aria-pressed", String(soundOn));
  if (soundOn && state.started && !state.paused && !state.over) startMusic();
  if (!soundOn) stopMusic();
});
ui.drawerButtons.forEach((button) => {
  button.addEventListener("click", () => setSelected(Number(button.dataset.index), true));
});

window.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();
  const mapping = { a: 0, s: 1, d: 2, f: 3, 1: 0, 2: 1, 3: 2, 4: 3 };
  if (mapping[key] !== undefined) {
    event.preventDefault();
    setSelected(mapping[key], true);
  }
  if (event.key === "Enter" && (!state.started || state.over)) {
    event.preventDefault();
    startGame();
  }
  if (key === "p" && state.started && !state.over) {
    event.preventDefault();
    ui.pauseButton.click();
  }
});

function handlePageAudioStop() {
  stopMusic();
}

document.addEventListener("visibilitychange", () => {
  if (document.hidden) handlePageAudioStop();
});
window.addEventListener("pagehide", handlePageAudioStop);
window.addEventListener("beforeunload", handlePageAudioStop);

reset();
draw();
requestAnimationFrame(loop);
