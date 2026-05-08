const canvas = document.querySelector("#game");
const ctx = canvas.getContext("2d");
const W = canvas.width;
const H = canvas.height;

const ui = {
  score: document.querySelector("#score"),
  combo: document.querySelector("#combo"),
  best: document.querySelector("#best"),
  hullText: document.querySelector("#hullText"),
  hullBar: document.querySelector("#hullBar"),
  dashText: document.querySelector("#dashText"),
  dashBar: document.querySelector("#dashBar"),
  dashButton: document.querySelector("#dashButton"),
  pause: document.querySelector("#pause"),
  sound: document.querySelector("#sound"),
  speed: document.querySelector("#speed"),
  chain: document.querySelector("#chain"),
  time: document.querySelector("#time"),
  state: document.querySelector("#state"),
  overlay: document.querySelector("#overlay"),
  overlayTitle: document.querySelector("#overlayTitle"),
  overlayText: document.querySelector("#overlayText"),
  start: document.querySelector("#start"),
};

const BEST_KEY = "aurora-drift-best";
let best = Number(localStorage.getItem(BEST_KEY) || 0);
let state;
let last = performance.now();
let pointer = null;
let audio = null;

function reset() {
  state = {
    started: false,
    paused: false,
    over: false,
    score: 0,
    combo: 1,
    chain: 0,
    hull: 100,
    elapsed: 0,
    speed: 1,
    spawnTimer: 0,
    moteTimer: 0,
    shake: 0,
    dash: 1,
    dashTime: 0,
    dashCooldown: 0,
    dashDir: 1,
    player: { x: W / 2, y: H - 150, vx: 0, radius: 24 },
    hazards: [],
    motes: [],
    particles: [],
    stars: Array.from({ length: 96 }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      s: 0.5 + Math.random() * 1.8,
      a: 0.2 + Math.random() * 0.72,
    })),
  };
  sync();
}

function createAudio() {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return null;
  const context = new AudioContext();
  const master = context.createGain();
  master.gain.value = 0.55;
  master.connect(context.destination);
  return { context, master, muted: false, started: false, timer: null, next: 0 };
}

function ensureAudio() {
  if (!audio) audio = createAudio();
  if (!audio) return;
  if (audio.context.state === "suspended") audio.context.resume();
  if (!audio.started) {
    audio.started = true;
    audio.next = audio.context.currentTime + 0.05;
    audio.timer = window.setInterval(scheduleMusic, 180);
    scheduleMusic();
  }
}

function tone(freq, start, dur, type = "sine", vol = 0.08) {
  if (!audio || audio.muted) return;
  const osc = audio.context.createOscillator();
  const gain = audio.context.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(vol, start + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  osc.connect(gain);
  gain.connect(audio.master);
  osc.start(start);
  osc.stop(start + dur + 0.03);
}

function scheduleMusic() {
  if (!audio || audio.muted) return;
  const notes = [293.66, 369.99, 440, 554.37, 493.88, 392, 329.63, 440];
  const now = audio.context.currentTime;
  while (audio.next < now + 0.75) {
    const i = Math.floor(audio.next * 2.4) % notes.length;
    tone(notes[i], audio.next, 0.28, "triangle", 0.045);
    if (i % 4 === 0) tone(notes[i] / 2, audio.next, 0.64, "sine", 0.035);
    audio.next += 0.42;
  }
}

function sfx(kind) {
  ensureAudio();
  if (!audio || audio.muted) return;
  const t = audio.context.currentTime;
  if (kind === "mote") {
    tone(760, t, 0.08, "sine", 0.12);
    tone(1140, t + 0.035, 0.1, "triangle", 0.06);
  } else if (kind === "dash") {
    tone(220, t, 0.08, "sawtooth", 0.08);
    tone(880, t + 0.02, 0.16, "triangle", 0.1);
  } else {
    tone(120, t, 0.16, "sawtooth", 0.16);
    tone(80, t + 0.02, 0.22, "triangle", 0.12);
  }
}

function startGame() {
  ensureAudio();
  reset();
  state.started = true;
  ui.overlay.classList.add("hidden");
  ui.pause.textContent = "Pause";
}

function endGame() {
  state.over = true;
  best = Math.max(best, state.score);
  localStorage.setItem(BEST_KEY, String(best));
  ui.overlayTitle.textContent = "Drift Complete";
  ui.overlayText.textContent = `${state.score}点。最高記録は${best}点。もう一度、光の流れを読もう。`;
  ui.start.textContent = "Restart";
  ui.overlay.classList.remove("hidden");
  sync();
}

function spawnHazard() {
  const wide = Math.random() < 0.18 + Math.min(0.2, state.elapsed / 120);
  state.hazards.push({
    x: 60 + Math.random() * (W - 120),
    y: -60,
    r: wide ? 28 : 18 + Math.random() * 12,
    vy: 230 + state.elapsed * 5 + Math.random() * 90,
    vx: (Math.random() - 0.5) * (wide ? 80 : 140),
    spin: Math.random() * Math.PI,
    wide,
  });
}

function spawnMote() {
  state.motes.push({
    x: 52 + Math.random() * (W - 104),
    y: -30,
    r: 11 + Math.random() * 6,
    vy: 180 + state.elapsed * 3.2 + Math.random() * 60,
    pulse: Math.random() * Math.PI * 2,
  });
}

function burst(x, y, color, count) {
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = 60 + Math.random() * 240;
    state.particles.push({
      x,
      y,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp,
      life: 0.35 + Math.random() * 0.4,
      max: 0.75,
      color,
      size: 2 + Math.random() * 4,
    });
  }
}

function update(dt) {
  if (!state.started || state.paused || state.over) return;
  state.elapsed += dt;
  state.speed = 1 + Math.min(2.2, state.elapsed / 48);
  state.spawnTimer -= dt;
  state.moteTimer -= dt;
  state.shake = Math.max(0, state.shake - dt * 24);
  state.dashCooldown = Math.max(0, state.dashCooldown - dt);
  state.dash = state.dashCooldown <= 0 ? 1 : Math.max(0, 1 - state.dashCooldown / 2.6);
  state.dashTime = Math.max(0, state.dashTime - dt);

  if (state.spawnTimer <= 0) {
    spawnHazard();
    state.spawnTimer = Math.max(0.18, 0.64 - state.elapsed * 0.006) / state.speed;
  }
  if (state.moteTimer <= 0) {
    spawnMote();
    state.moteTimer = Math.max(0.28, 0.76 - state.elapsed * 0.004) / state.speed;
  }

  const target = pointer == null ? state.player.x : pointer;
  const dx = target - state.player.x;
  state.player.vx += dx * 18 * dt;
  if (keys.ArrowLeft || keys.a) state.player.vx -= 900 * dt;
  if (keys.ArrowRight || keys.d) state.player.vx += 900 * dt;
  if (state.dashTime > 0) state.player.vx += state.dashDir * 2300 * dt;
  state.player.vx *= Math.pow(0.0018, dt);
  state.player.x += state.player.vx * dt;
  state.player.x = Math.max(35, Math.min(W - 35, state.player.x));

  for (const star of state.stars) {
    star.y += (42 + star.s * 44) * state.speed * dt;
    if (star.y > H + 5) {
      star.y = -5;
      star.x = Math.random() * W;
    }
  }

  for (const h of state.hazards) {
    h.x += h.vx * dt;
    h.y += h.vy * state.speed * dt;
    h.spin += dt * 5;
    if (h.x < h.r || h.x > W - h.r) h.vx *= -1;
  }

  for (const m of state.motes) {
    m.y += m.vy * state.speed * dt;
    m.pulse += dt * 5;
  }

  const px = state.player.x;
  const py = state.player.y;
  for (let i = state.motes.length - 1; i >= 0; i--) {
    const m = state.motes[i];
    if (dist(px, py, m.x, m.y) < state.player.radius + m.r) {
      state.motes.splice(i, 1);
      state.chain += 1;
      state.combo = Math.min(12, 1 + Math.floor(state.chain / 6));
      state.score += 10 * state.combo;
      burst(m.x, m.y, "#f6d36b", 14);
      sfx("mote");
    }
  }

  if (state.dashTime <= 0) {
    for (let i = state.hazards.length - 1; i >= 0; i--) {
      const h = state.hazards[i];
      if (dist(px, py, h.x, h.y) < state.player.radius + h.r * 0.82) {
        state.hazards.splice(i, 1);
        state.hull -= h.wide ? 28 : 18;
        state.chain = 0;
        state.combo = 1;
        state.shake = 12;
        burst(px, py, "#ff5a6a", 28);
        sfx("hit");
        if (state.hull <= 0) endGame();
        break;
      }
    }
  }

  state.hazards = state.hazards.filter((h) => h.y < H + 90);
  state.motes = state.motes.filter((m) => m.y < H + 50);
  for (const p of state.particles) {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= Math.pow(0.06, dt);
    p.vy *= Math.pow(0.06, dt);
    p.life -= dt;
  }
  state.particles = state.particles.filter((p) => p.life > 0);
  sync();
}

function draw() {
  ctx.save();
  ctx.clearRect(0, 0, W, H);
  if (state.shake) ctx.translate((Math.random() - 0.5) * state.shake, (Math.random() - 0.5) * state.shake);
  const grd = ctx.createLinearGradient(0, 0, 0, H);
  grd.addColorStop(0, "#071120");
  grd.addColorStop(0.55, "#10172d");
  grd.addColorStop(1, "#190d21");
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, W, H);

  for (const star of state.stars) {
    ctx.globalAlpha = star.a;
    ctx.fillStyle = "#d9f7ff";
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.s, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  for (let i = 0; i < 5; i++) {
    const x = 80 + i * 140 + Math.sin(state.elapsed * 0.7 + i) * 24;
    const beam = ctx.createLinearGradient(x - 80, 0, x + 80, H);
    beam.addColorStop(0, "rgba(104,240,255,0)");
    beam.addColorStop(0.5, i % 2 ? "rgba(255,122,187,0.12)" : "rgba(104,240,255,0.12)");
    beam.addColorStop(1, "rgba(246,211,107,0)");
    ctx.fillStyle = beam;
    ctx.beginPath();
    ctx.moveTo(x - 28, 0);
    ctx.lineTo(x + 82, H);
    ctx.lineTo(x + 18, H);
    ctx.lineTo(x - 84, 0);
    ctx.closePath();
    ctx.fill();
  }

  for (const m of state.motes) drawMote(m);
  for (const h of state.hazards) drawHazard(h);
  for (const p of state.particles) {
    ctx.globalAlpha = Math.max(0, p.life / p.max);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  drawPlayer();
  ctx.restore();
}

function drawMote(m) {
  const glow = ctx.createRadialGradient(m.x, m.y, 2, m.x, m.y, m.r * 3);
  glow.addColorStop(0, "rgba(246,211,107,0.85)");
  glow.addColorStop(1, "rgba(246,211,107,0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(m.x, m.y, m.r * 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.save();
  ctx.translate(m.x, m.y);
  ctx.rotate(m.pulse);
  ctx.fillStyle = "#fff0a8";
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const r = i % 2 ? m.r * 0.45 : m.r;
    const a = (Math.PI * 2 * i) / 8;
    ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawHazard(h) {
  ctx.save();
  ctx.translate(h.x, h.y);
  ctx.rotate(h.spin);
  const glow = ctx.createRadialGradient(0, 0, h.r * 0.2, 0, 0, h.r * 2.4);
  glow.addColorStop(0, "rgba(255,90,106,0.72)");
  glow.addColorStop(1, "rgba(255,90,106,0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, 0, h.r * 2.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = h.wide ? "#ff7abb" : "#ff5a6a";
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? h.r * 0.55 : h.r;
    const a = (Math.PI * 2 * i) / 10;
    ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.45)";
  ctx.stroke();
  ctx.restore();
}

function drawPlayer() {
  const p = state.player;
  const inv = state.dashTime > 0;
  const tilt = Math.max(-0.42, Math.min(0.42, p.vx / 720));
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(tilt);

  const aura = ctx.createRadialGradient(0, 0, 8, 0, 0, inv ? 78 : 58);
  aura.addColorStop(0, inv ? "rgba(255,255,255,0.55)" : "rgba(104,240,255,0.44)");
  aura.addColorStop(0.46, "rgba(255,122,187,0.16)");
  aura.addColorStop(1, "rgba(104,240,255,0)");
  ctx.fillStyle = aura;
  ctx.beginPath();
  ctx.arc(0, 0, inv ? 78 : 58, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  ctx.globalAlpha = inv ? 0.9 : 0.62;
  ctx.fillStyle = inv ? "rgba(255,255,255,0.88)" : "rgba(104,240,255,0.74)";
  ctx.beginPath();
  ctx.moveTo(0, 20);
  ctx.lineTo(12, 52);
  ctx.lineTo(0, 86);
  ctx.lineTo(-12, 52);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  ctx.shadowColor = inv ? "#ffffff" : "#68f0ff";
  ctx.shadowBlur = inv ? 34 : 24;
  const hull = ctx.createLinearGradient(-26, -32, 26, 26);
  hull.addColorStop(0, inv ? "#ffffff" : "#e9fbff");
  hull.addColorStop(0.38, "#68f0ff");
  hull.addColorStop(0.72, "#746dff");
  hull.addColorStop(1, "#ff7abb");
  ctx.fillStyle = hull;
  ctx.beginPath();
  ctx.moveTo(0, -36);
  ctx.bezierCurveTo(18, -20, 28, -2, 24, 24);
  ctx.lineTo(7, 13);
  ctx.lineTo(0, 31);
  ctx.lineTo(-7, 13);
  ctx.lineTo(-24, 24);
  ctx.bezierCurveTo(-28, -2, -18, -20, 0, -36);
  ctx.closePath();
  ctx.fill();

  ctx.shadowBlur = 0;
  ctx.strokeStyle = "rgba(255,255,255,0.72)";
  ctx.lineWidth = 2.4;
  ctx.stroke();
  ctx.fillStyle = "#091527";
  ctx.beginPath();
  ctx.ellipse(0, -10, 7, 12, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(104,240,255,0.76)";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.fillStyle = inv ? "#ffffff" : "#f6d36b";
  ctx.beginPath();
  ctx.arc(-12, 13, 3.5, 0, Math.PI * 2);
  ctx.arc(12, 13, 3.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function dash() {
  if (!state.started || state.paused || state.over || state.dashCooldown > 0) return;
  state.dashCooldown = 2.6;
  state.dashTime = 0.92;
  state.dashDir = dashDirection();
  state.player.vx = state.dashDir * Math.max(760, Math.abs(state.player.vx) * 2.25);
  burst(state.player.x, state.player.y, "#68f0ff", 24);
  sfx("dash");
}

function dashDirection() {
  if (keys.ArrowLeft || keys.a) return -1;
  if (keys.ArrowRight || keys.d) return 1;
  if (pointer != null && Math.abs(pointer - state.player.x) > 18) return Math.sign(pointer - state.player.x);
  if (Math.abs(state.player.vx) > 30) return Math.sign(state.player.vx);
  return state.player.x < W / 2 ? 1 : -1;
}

function sync() {
  ui.score.textContent = state.score;
  ui.combo.textContent = `x${state.combo}`;
  ui.best.textContent = best;
  ui.hullText.textContent = `${Math.max(0, Math.ceil(state.hull))}%`;
  ui.hullBar.style.width = `${Math.max(0, state.hull)}%`;
  ui.dashText.textContent = state.dashCooldown <= 0 ? "Ready" : `${state.dashCooldown.toFixed(1)}s`;
  ui.dashBar.style.width = `${Math.round(state.dash * 100)}%`;
  ui.dashButton.disabled = state.dashCooldown > 0 || !state.started || state.paused || state.over;
  ui.speed.textContent = `Drift ${state.speed.toFixed(1)}`;
  ui.chain.textContent = `Chain ${state.chain}`;
  ui.time.textContent = formatTime(state.elapsed);
  ui.state.textContent = state.over ? "Ended" : state.paused ? "Paused" : state.started ? "Flying" : "Ready";
}

function formatTime(value) {
  const total = Math.floor(value);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

function dist(ax, ay, bx, by) {
  return Math.hypot(ax - bx, ay - by);
}

const keys = {};
window.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();
  keys[event.key] = true;
  keys[key] = true;
  if (event.key === " " || event.key === "Shift" || key === "x" || key === "j" || key === "k") {
    event.preventDefault();
    dash();
  }
  if (event.key === "Enter" && (!state.started || state.over)) startGame();
});
window.addEventListener("keyup", (event) => {
  keys[event.key] = false;
  keys[event.key.toLowerCase()] = false;
});

canvas.addEventListener("pointerdown", (event) => {
  ensureAudio();
  const rect = canvas.getBoundingClientRect();
  pointer = ((event.clientX - rect.left) / rect.width) * W;
  canvas.setPointerCapture(event.pointerId);
});
canvas.addEventListener("pointermove", (event) => {
  if (pointer == null) return;
  const rect = canvas.getBoundingClientRect();
  pointer = ((event.clientX - rect.left) / rect.width) * W;
});
canvas.addEventListener("pointerup", () => {
  pointer = null;
});

ui.start.addEventListener("click", startGame);
ui.dashButton.addEventListener("click", dash);
ui.pause.addEventListener("click", () => {
  if (!state.started || state.over) return;
  state.paused = !state.paused;
  ui.pause.textContent = state.paused ? "Resume" : "Pause";
  sync();
});
ui.sound.addEventListener("click", () => {
  ensureAudio();
  if (!audio) return;
  audio.muted = !audio.muted;
  ui.sound.textContent = audio.muted ? "Sound Off" : "Sound On";
});

function loop(now) {
  const dt = Math.min(0.033, (now - last) / 1000);
  last = now;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

reset();
requestAnimationFrame(loop);
