const canvas = document.querySelector("#game");
const ctx = canvas.getContext("2d");
const W = canvas.width;
const H = canvas.height;
const CX = W / 2;
const CY = H / 2;
const R = 265;
const BEST_KEY = "tide-forge-best";

const ui = {
  score: document.querySelector("#score"),
  chain: document.querySelector("#chain"),
  best: document.querySelector("#best"),
  heatText: document.querySelector("#heatText"),
  heatBar: document.querySelector("#heatBar"),
  rank: document.querySelector("#rank"),
  blades: document.querySelector("#blades"),
  tempo: document.querySelector("#tempo"),
  state: document.querySelector("#state"),
  overlay: document.querySelector("#overlay"),
  overlayTitle: document.querySelector("#overlayTitle"),
  overlayText: document.querySelector("#overlayText"),
  start: document.querySelector("#start"),
  strike: document.querySelector("#strike"),
  pause: document.querySelector("#pause"),
  sound: document.querySelector("#sound"),
};

let state;
let best = Number(localStorage.getItem(BEST_KEY) || 0);
let last = performance.now();
let audio = null;

function reset() {
  state = {
    started: false,
    paused: false,
    over: false,
    score: 0,
    chain: 1,
    hits: 0,
    blades: 0,
    heat: 100,
    angle: -Math.PI / 2,
    velocity: 1.35,
    zone: randomZone(),
    zoneWidth: 0.62,
    flash: 0,
    message: "Ready",
    messageTime: 0,
    particles: [],
    waves: Array.from({ length: 28 }, (_, i) => ({ a: (Math.PI * 2 * i) / 28, r: 170 + Math.random() * 170 })),
  };
  sync();
}

function randomZone() {
  return Math.random() * Math.PI * 2;
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
  ui.overlayTitle.textContent = "Forge Cooled";
  ui.overlayText.textContent = `${state.score}点。完成した刃 ${state.blades}。最高記録は${best}点。`;
  ui.start.textContent = "Restart";
  ui.overlay.classList.remove("hidden");
  sync();
}

function update(dt) {
  if (!state.started || state.paused || state.over) return;
  state.angle = normalize(state.angle + state.velocity * dt);
  state.velocity = 1.35 + Math.min(2.4, state.hits / 18);
  state.heat -= dt * (1.4 + state.hits * 0.018);
  state.flash = Math.max(0, state.flash - dt * 3);
  state.messageTime = Math.max(0, state.messageTime - dt);
  for (const wave of state.waves) wave.a += dt * 0.24;
  for (const p of state.particles) {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.life -= dt;
  }
  state.particles = state.particles.filter((p) => p.life > 0);
  if (state.heat <= 0) endGame();
  sync();
}

function strike() {
  ensureAudio();
  if (!state.started || state.paused || state.over) return;
  const diff = Math.abs(shortestAngle(state.angle, state.zone));
  let rank;
  let gain;
  if (diff < state.zoneWidth * 0.16) {
    rank = "Perfect";
    gain = 120;
    state.heat = Math.min(100, state.heat + 8);
    state.chain += 1;
  } else if (diff < state.zoneWidth * 0.34) {
    rank = "Great";
    gain = 70;
    state.heat = Math.min(100, state.heat + 3);
    state.chain += 1;
  } else if (diff < state.zoneWidth * 0.5) {
    rank = "Good";
    gain = 35;
    state.chain = Math.max(1, state.chain);
  } else {
    rank = "Miss";
    gain = 0;
    state.heat -= 18;
    state.chain = 1;
  }
  if (gain) {
    state.score += gain * state.chain;
    state.hits += 1;
    if (state.hits % 8 === 0) {
      state.blades += 1;
      state.score += 450;
    }
  }
  state.message = rank;
  state.messageTime = 0.75;
  state.flash = 1;
  burst(rankColor(rank), rank === "Miss" ? 18 : 34);
  sfx(rank);
  state.zone = randomZone();
  state.zoneWidth = Math.max(0.28, 0.62 - state.hits * 0.01);
  if (state.heat <= 0) endGame();
  sync();
}

function draw() {
  ctx.clearRect(0, 0, W, H);
  const bg = ctx.createRadialGradient(CX, CY, 80, CX, CY, 520);
  bg.addColorStop(0, "#172827");
  bg.addColorStop(0.58, "#0c1413");
  bg.addColorStop(1, "#070908");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  drawWaves();
  drawForge();
  drawZone();
  drawNeedle();
  drawBlade();
  for (const p of state.particles) {
    ctx.globalAlpha = Math.max(0, p.life / p.max);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  if (state.messageTime > 0) drawMessage();
}

function drawWaves() {
  ctx.strokeStyle = "rgba(125,245,207,0.12)";
  ctx.lineWidth = 2;
  for (const wave of state.waves) {
    const x = CX + Math.cos(wave.a) * wave.r;
    const y = CY + Math.sin(wave.a) * wave.r;
    ctx.beginPath();
    ctx.arc(x, y, 24, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawForge() {
  ctx.save();
  ctx.translate(CX, CY);
  ctx.strokeStyle = "rgba(174,231,213,0.28)";
  ctx.lineWidth = 18;
  ctx.beginPath();
  ctx.arc(0, 0, R, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = "rgba(255,211,110,0.18)";
  ctx.lineWidth = 2;
  for (let i = 0; i < 48; i++) {
    const a = (Math.PI * 2 * i) / 48;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * (R - 16), Math.sin(a) * (R - 16));
    ctx.lineTo(Math.cos(a) * (R + 16), Math.sin(a) * (R + 16));
    ctx.stroke();
  }
  ctx.restore();
}

function drawZone() {
  ctx.save();
  ctx.translate(CX, CY);
  drawZoneBand(state.zoneWidth * 0.5, 34, "#7dd3fc", 12);
  drawZoneBand(state.zoneWidth * 0.34, 28, "#7df5cf", 18);
  drawZoneBand(state.zoneWidth * 0.16, 20, "#ffd36e", 26 + state.flash * 34);
  ctx.restore();
}

function drawZoneBand(width, lineWidth, color, blur) {
  ctx.strokeStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = blur;
  ctx.lineWidth = lineWidth;
  ctx.beginPath();
  ctx.arc(0, 0, R, state.zone - width, state.zone + width);
  ctx.stroke();
}

function drawNeedle() {
  ctx.save();
  ctx.translate(CX, CY);
  ctx.rotate(state.angle);
  ctx.strokeStyle = "#7df5cf";
  ctx.shadowColor = "#7df5cf";
  ctx.shadowBlur = 18;
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(R + 28, 0);
  ctx.stroke();
  ctx.fillStyle = "#f3fff9";
  ctx.beginPath();
  ctx.arc(R + 30, 0, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawBlade() {
  ctx.save();
  ctx.translate(CX, CY);
  const glow = ctx.createLinearGradient(-95, -120, 95, 120);
  glow.addColorStop(0, "#f3fff9");
  glow.addColorStop(0.5, "#9fb4c7");
  glow.addColorStop(1, "#7df5cf");
  ctx.shadowColor = state.flash ? "#ffd36e" : "#7df5cf";
  ctx.shadowBlur = 18 + state.flash * 32;
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.moveTo(0, -150);
  ctx.lineTo(34, 70);
  ctx.lineTo(0, 138);
  ctx.lineTo(-34, 70);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#172827";
  ctx.fillRect(-60, 86, 120, 18);
  ctx.restore();
}

function drawMessage() {
  ctx.save();
  ctx.globalAlpha = Math.min(1, state.messageTime * 2);
  ctx.fillStyle = rankColor(state.message);
  ctx.font = "900 54px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(state.message, CX, 120);
  ctx.restore();
}

function rankColor(rank) {
  if (rank === "Perfect") return "#ffd36e";
  if (rank === "Great") return "#7df5cf";
  if (rank === "Good") return "#7dd3fc";
  if (rank === "Miss") return "#ff7066";
  return "#9fb4c7";
}

function burst(color, count) {
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = 90 + Math.random() * 260;
    state.particles.push({
      x: CX + Math.cos(state.angle) * R,
      y: CY + Math.sin(state.angle) * R,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp,
      life: 0.35 + Math.random() * 0.45,
      max: 0.8,
      color,
      size: 2 + Math.random() * 4,
    });
  }
}

function createAudio() {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return null;
  const context = new AudioContext();
  const master = context.createGain();
  const music = context.createGain();
  const effects = context.createGain();
  master.gain.value = 0.5;
  music.gain.value = 0.2;
  effects.gain.value = 0.44;
  music.connect(master);
  effects.connect(master);
  master.connect(context.destination);
  return { context, master, music, effects, started: false, muted: false, next: 0, timer: null };
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

function tone(freq, start, dur, type, dest, vol) {
  if (!audio || audio.muted) return;
  const osc = audio.context.createOscillator();
  const gain = audio.context.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(vol, start + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  osc.connect(gain);
  gain.connect(dest);
  osc.start(start);
  osc.stop(start + dur + 0.03);
}

function scheduleMusic() {
  if (!audio || audio.muted) return;
  const notes = [146.83, 196, 246.94, 293.66, 261.63, 220, 196, 164.81];
  const now = audio.context.currentTime;
  while (audio.next < now + 0.8) {
    const index = Math.floor(audio.next * 2.5) % notes.length;
    tone(notes[index], audio.next, 0.34, "triangle", audio.music, 0.04);
    if (index % 2 === 0) tone(notes[index] / 2, audio.next, 0.58, "sine", audio.music, 0.035);
    audio.next += 0.42;
  }
}

function sfx(rank) {
  ensureAudio();
  if (!audio || audio.muted) return;
  const t = audio.context.currentTime;
  if (rank === "Perfect") {
    tone(660, t, 0.08, "triangle", audio.effects, 0.14);
    tone(990, t + 0.04, 0.12, "sine", audio.effects, 0.1);
    tone(1320, t + 0.09, 0.16, "triangle", audio.effects, 0.08);
  } else if (rank === "Great") {
    tone(520, t, 0.09, "triangle", audio.effects, 0.12);
    tone(780, t + 0.04, 0.12, "sine", audio.effects, 0.08);
  } else if (rank === "Good") {
    tone(360, t, 0.1, "sine", audio.effects, 0.1);
  } else {
    tone(110, t, 0.16, "sawtooth", audio.effects, 0.15);
    tone(74, t + 0.035, 0.22, "triangle", audio.effects, 0.1);
  }
}

function toggleSound() {
  ensureAudio();
  if (!audio) return;
  audio.muted = !audio.muted;
  const target = audio.muted ? 0.0001 : 0.5;
  audio.master.gain.cancelScheduledValues(audio.context.currentTime);
  audio.master.gain.setTargetAtTime(target, audio.context.currentTime, 0.035);
  ui.sound.textContent = audio.muted ? "Sound Off" : "Sound On";
}

function sync() {
  ui.score.textContent = state.score;
  ui.chain.textContent = `x${state.chain}`;
  ui.best.textContent = best;
  ui.heatText.textContent = `${Math.max(0, Math.ceil(state.heat))}%`;
  ui.heatBar.style.width = `${Math.max(0, state.heat)}%`;
  ui.rank.textContent = `Rank ${state.message}`;
  ui.blades.textContent = `Blades ${state.blades}`;
  ui.tempo.textContent = `Tempo ${state.velocity.toFixed(1)}`;
  ui.state.textContent = state.over ? "Ended" : state.paused ? "Paused" : state.started ? "Forging" : "Ready";
}

function normalize(angle) {
  let out = angle % (Math.PI * 2);
  if (out < 0) out += Math.PI * 2;
  return out;
}

function shortestAngle(a, b) {
  return Math.atan2(Math.sin(a - b), Math.cos(a - b));
}

window.addEventListener("keydown", (event) => {
  if (event.key === " " || event.key === "Enter") {
    event.preventDefault();
    if (!state.started || state.over) startGame();
    else strike();
  }
});

ui.start.addEventListener("click", startGame);
ui.strike.addEventListener("click", strike);
ui.sound.addEventListener("click", toggleSound);
canvas.addEventListener("pointerdown", strike);
ui.pause.addEventListener("click", () => {
  if (!state.started || state.over) return;
  state.paused = !state.paused;
  ui.pause.textContent = state.paused ? "Resume" : "Pause";
  sync();
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
