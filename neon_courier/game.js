const canvas = document.querySelector("#game");
const ctx = canvas.getContext("2d");
const W = canvas.width;
const H = canvas.height;
const LANES = [120, 280, 440, 600];
const BEST_KEY = "neon-courier-best";

const ui = {
  score: document.querySelector("#score"),
  combo: document.querySelector("#combo"),
  best: document.querySelector("#best"),
  batteryText: document.querySelector("#batteryText"),
  batteryBar: document.querySelector("#batteryBar"),
  boostText: document.querySelector("#boostText"),
  boostBar: document.querySelector("#boostBar"),
  speed: document.querySelector("#speed"),
  packages: document.querySelector("#packages"),
  time: document.querySelector("#time"),
  state: document.querySelector("#state"),
  overlay: document.querySelector("#overlay"),
  overlayTitle: document.querySelector("#overlayTitle"),
  overlayText: document.querySelector("#overlayText"),
  start: document.querySelector("#start"),
  left: document.querySelector("#left"),
  right: document.querySelector("#right"),
  boost: document.querySelector("#boost"),
  pause: document.querySelector("#pause"),
  sound: document.querySelector("#sound"),
};

let state;
let best = Number(localStorage.getItem(BEST_KEY) || 0);
let last = performance.now();
let audio = null;
const keys = {};

function reset() {
  state = {
    started: false,
    paused: false,
    over: false,
    score: 0,
    combo: 1,
    streak: 0,
    battery: 100,
    packages: 0,
    elapsed: 0,
    speed: 1,
    spawnTimer: 0,
    pickupTimer: 0.35,
    boostCharge: 1,
    boostTime: 0,
    boostCooldown: 0,
    lane: 1,
    targetLane: 1,
    runner: { x: LANES[1], y: H - 135, lean: 0 },
    objects: [],
    particles: [],
    rain: Array.from({ length: 120 }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      len: 10 + Math.random() * 24,
      speed: 420 + Math.random() * 420,
    })),
  };
  sync();
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
  ui.overlayTitle.textContent = "Delivery Complete";
  ui.overlayText.textContent = `${state.score}点。配達数 ${state.packages}。最高記録は${best}点。`;
  ui.start.textContent = "Restart";
  ui.overlay.classList.remove("hidden");
  sync();
}

function moveLane(dir) {
  if (!state.started || state.paused || state.over) return;
  state.targetLane = Math.max(0, Math.min(LANES.length - 1, state.targetLane + dir));
  sfx("move");
}

function boost() {
  ensureAudio();
  if (!state.started || state.paused || state.over || state.boostCooldown > 0) return;
  state.boostTime = 0.8;
  state.boostCooldown = 2.6;
  boostBurst(state.runner.x, state.runner.y + 34);
  sfx("boost");
}

function update(dt) {
  if (!state.started || state.paused || state.over) return;
  state.elapsed += dt;
  state.speed = 1 + Math.min(2.5, state.elapsed / 42);
  state.spawnTimer -= dt;
  state.pickupTimer -= dt;
  state.boostTime = Math.max(0, state.boostTime - dt);
  state.boostCooldown = Math.max(0, state.boostCooldown - dt);
  state.boostCharge = state.boostCooldown <= 0 ? 1 : Math.max(0, 1 - state.boostCooldown / 2.6);

  if (state.spawnTimer <= 0) {
    spawnObstacle();
    state.spawnTimer = Math.max(0.28, 0.72 - state.elapsed * 0.006) / state.speed;
  }
  if (state.pickupTimer <= 0) {
    spawnPackage();
    state.pickupTimer = Math.max(0.42, 0.82 - state.elapsed * 0.004) / state.speed;
  }

  if (keys.ArrowLeft || keys.a) {
    keys.ArrowLeft = false;
    keys.a = false;
    moveLane(-1);
  }
  if (keys.ArrowRight || keys.d) {
    keys.ArrowRight = false;
    keys.d = false;
    moveLane(1);
  }

  const targetX = LANES[state.targetLane];
  state.runner.x += (targetX - state.runner.x) * Math.min(1, dt * 15);
  state.runner.lean += ((state.targetLane - state.lane) * 0.35 - state.runner.lean) * Math.min(1, dt * 8);
  if (Math.abs(targetX - state.runner.x) < 2) state.lane = state.targetLane;

  for (const drop of state.rain) {
    drop.y += drop.speed * dt * (state.boostTime > 0 ? 1.45 : 1);
    if (drop.y > H + 30) {
      drop.y = -30;
      drop.x = Math.random() * W;
    }
  }

  for (const object of state.objects) {
    object.y += object.vy * state.speed * (state.boostTime > 0 ? 1.25 : 1) * dt;
    object.pulse += dt * 5;
  }

  collide();
  state.objects = state.objects.filter((object) => object.y < H + 80);

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

function spawnObstacle() {
  const lane = Math.floor(Math.random() * LANES.length);
  state.objects.push({
    kind: Math.random() < 0.32 ? "drone" : "barrier",
    lane,
    x: LANES[lane],
    y: -60,
    r: 28,
    vy: 250 + Math.random() * 80 + state.elapsed * 5,
    pulse: Math.random() * Math.PI * 2,
  });
}

function spawnPackage() {
  const lane = Math.floor(Math.random() * LANES.length);
  if (state.objects.some((object) => object.lane === lane && object.y < 90)) return;
  state.objects.push({
    kind: "package",
    lane,
    x: LANES[lane],
    y: -42,
    r: 20,
    vy: 230 + Math.random() * 70 + state.elapsed * 4,
    pulse: Math.random() * Math.PI * 2,
  });
}

function collide() {
  const rx = state.runner.x;
  const ry = state.runner.y;
  for (let i = state.objects.length - 1; i >= 0; i--) {
    const object = state.objects[i];
    if (Math.abs(object.x - rx) > 54 || Math.abs(object.y - ry) > 62) continue;
    state.objects.splice(i, 1);
    if (object.kind === "package") {
      state.packages += 1;
      state.streak += 1;
      state.combo = Math.min(10, 1 + Math.floor(state.streak / 5));
      state.score += 12 * state.combo;
      pickupBurst(object.x, object.y);
      sfx("pickup");
    } else {
      const shielded = state.boostTime > 0;
      state.battery -= shielded ? 8 : 22;
      state.streak = 0;
      state.combo = 1;
      crashBurst(rx, ry, shielded);
      sfx(shielded ? "shield" : "crash");
      if (state.battery <= 0) endGame();
    }
  }
}

function draw() {
  ctx.clearRect(0, 0, W, H);
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, "#080b17");
  bg.addColorStop(0.6, "#111a2e");
  bg.addColorStop(1, "#08080f");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  drawCity();
  drawRoad();
  drawRain();
  for (const object of state.objects) drawObject(object);
  for (const p of state.particles) {
    ctx.globalAlpha = Math.max(0, p.life / p.max);
    drawParticle(p);
  }
  ctx.globalAlpha = 1;
  drawRunner();
}

function drawCity() {
  for (let i = 0; i < 9; i++) {
    const x = i * 86 - 20;
    const h = 170 + ((i * 61) % 130);
    ctx.fillStyle = i % 2 ? "#0b1020" : "#11182a";
    ctx.fillRect(x, H - h - 280, 62, h);
    ctx.fillStyle = i % 3 ? "rgba(102,230,255,0.3)" : "rgba(255,111,177,0.28)";
    for (let y = H - h - 250; y < H - 310; y += 28) ctx.fillRect(x + 12, y, 32, 5);
  }
}

function drawRoad() {
  const road = ctx.createLinearGradient(0, 170, 0, H);
  road.addColorStop(0, "#111524");
  road.addColorStop(1, "#05070c");
  ctx.fillStyle = road;
  ctx.beginPath();
  ctx.moveTo(130, 140);
  ctx.lineTo(590, 140);
  ctx.lineTo(690, H);
  ctx.lineTo(30, H);
  ctx.closePath();
  ctx.fill();

  for (const x of LANES) {
    ctx.strokeStyle = "rgba(102,230,255,0.18)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x, 140);
    ctx.lineTo(x, H);
    ctx.stroke();
  }

  for (let y = 160 + ((state.elapsed * 220 * state.speed) % 96); y < H; y += 96) {
    ctx.strokeStyle = "rgba(248,216,106,0.34)";
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(W / 2, y);
    ctx.lineTo(W / 2, y + 44);
    ctx.stroke();
  }
}

function drawRain() {
  ctx.strokeStyle = "rgba(145,220,255,0.26)";
  ctx.lineWidth = 2;
  for (const drop of state.rain) {
    ctx.beginPath();
    ctx.moveTo(drop.x, drop.y);
    ctx.lineTo(drop.x - 8, drop.y + drop.len);
    ctx.stroke();
  }
}

function drawObject(object) {
  ctx.save();
  ctx.translate(object.x, object.y);
  if (object.kind === "package") {
    ctx.shadowColor = "#f8d86a";
    ctx.shadowBlur = 20;
    ctx.fillStyle = "#f8d86a";
    ctx.rotate(Math.sin(object.pulse) * 0.2);
    ctx.fillRect(-17, -17, 34, 34);
    ctx.fillStyle = "#6b4a10";
    ctx.fillRect(-4, -17, 8, 34);
  } else if (object.kind === "drone") {
    ctx.shadowColor = "#ff6fb1";
    ctx.shadowBlur = 22;
    ctx.fillStyle = "#ff6fb1";
    ctx.beginPath();
    ctx.ellipse(0, 0, 34, 18, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#11182a";
    ctx.fillRect(-42, -5, 84, 10);
  } else {
    ctx.shadowColor = "#ff596e";
    ctx.shadowBlur = 20;
    ctx.fillStyle = "#ff596e";
    ctx.fillRect(-38, -16, 76, 32);
    ctx.fillStyle = "#f8d86a";
    ctx.fillRect(-30, -7, 60, 8);
  }
  ctx.restore();
}

function drawRunner() {
  const inv = state.boostTime > 0;
  ctx.save();
  ctx.translate(state.runner.x, state.runner.y);
  ctx.rotate(state.runner.lean);
  ctx.shadowColor = inv ? "#66e6ff" : "#ff6fb1";
  ctx.shadowBlur = inv ? 34 : 22;
  ctx.fillStyle = inv ? "#f1f8ff" : "#66e6ff";
  ctx.beginPath();
  ctx.roundRect(-22, -30, 44, 62, 12);
  ctx.fill();
  ctx.fillStyle = "#11182a";
  ctx.fillRect(-11, -20, 22, 20);
  ctx.fillStyle = inv ? "#66e6ff" : "#f8d86a";
  ctx.fillRect(-16, 24, 32, 10);
  ctx.restore();
}

function drawParticle(p) {
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(p.spin || 0);
  ctx.fillStyle = p.color;
  ctx.strokeStyle = p.color;
  if (p.shape === "square") {
    ctx.fillRect(-p.size, -p.size, p.size * 2, p.size * 2);
  } else if (p.shape === "slash") {
    ctx.lineWidth = Math.max(2, p.size);
    ctx.beginPath();
    ctx.moveTo(-p.size * 2, 0);
    ctx.lineTo(p.size * 2, 0);
    ctx.stroke();
  } else if (p.shape === "ring") {
    const growth = 1 + (1 - p.life / p.max) * 6;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, p.size * growth, 0, Math.PI * 2);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.arc(0, 0, p.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function pickupBurst(x, y) {
  burst(x, y, "#f8d86a", 14, "square", 120, 280);
  burst(x, y, "#fff4b0", 10, "spark", 70, 180);
}

function crashBurst(x, y, shielded) {
  burst(x, y, shielded ? "#66e6ff" : "#ff596e", shielded ? 18 : 24, "slash", 140, 360);
  burst(x, y, shielded ? "#f1f8ff" : "#ff9aa8", 2, "ring", 0, 0);
}

function boostBurst(x, y) {
  burst(x, y, "#66e6ff", 18, "slash", 160, 340);
  burst(x, y, "#ff6fb1", 8, "spark", 80, 220);
}

function burst(x, y, color, count, shape = "spark", minSpeed = 80, maxSpeed = 240) {
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = minSpeed + Math.random() * maxSpeed;
    state.particles.push({
      x,
      y,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp,
      life: 0.35 + Math.random() * 0.45,
      max: 0.8,
      color,
      size: 2 + Math.random() * 4,
      shape,
      spin: Math.random() * Math.PI,
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
  master.gain.value = 0.48;
  music.gain.value = 0.18;
  effects.gain.value = 0.42;
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
    audio.timer = window.setInterval(scheduleMusic, 140);
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
  gain.gain.exponentialRampToValueAtTime(vol, start + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  osc.connect(gain);
  gain.connect(dest);
  osc.start(start);
  osc.stop(start + dur + 0.03);
}

function scheduleMusic() {
  if (!audio || audio.muted) return;
  const notes = [196, 246.94, 293.66, 369.99, 329.63, 293.66, 246.94, 392];
  const now = audio.context.currentTime;
  while (audio.next < now + 0.7) {
    const index = Math.floor(audio.next * 4) % notes.length;
    tone(notes[index], audio.next, 0.12, "square", audio.music, 0.045);
    if (index % 4 === 0) tone(notes[index] / 2, audio.next, 0.28, "triangle", audio.music, 0.04);
    audio.next += 0.25;
  }
}

function sfx(kind) {
  ensureAudio();
  if (!audio || audio.muted) return;
  const t = audio.context.currentTime;
  if (kind === "pickup") {
    tone(880, t, 0.08, "sine", audio.effects, 0.14);
    tone(1320, t + 0.035, 0.09, "triangle", audio.effects, 0.08);
  } else if (kind === "crash") {
    tone(96, t, 0.18, "sawtooth", audio.effects, 0.16);
    tone(68, t + 0.03, 0.22, "triangle", audio.effects, 0.12);
  } else if (kind === "boost") {
    tone(240, t, 0.07, "sawtooth", audio.effects, 0.09);
    tone(960, t + 0.025, 0.16, "triangle", audio.effects, 0.12);
  } else if (kind === "shield") {
    tone(520, t, 0.14, "sine", audio.effects, 0.1);
  } else {
    tone(360, t, 0.045, "triangle", audio.effects, 0.05);
  }
}

function toggleSound() {
  ensureAudio();
  if (!audio) return;
  audio.muted = !audio.muted;
  const target = audio.muted ? 0.0001 : 0.48;
  audio.master.gain.cancelScheduledValues(audio.context.currentTime);
  audio.master.gain.setTargetAtTime(target, audio.context.currentTime, 0.035);
  ui.sound.textContent = audio.muted ? "Sound Off" : "Sound On";
}

function sync() {
  ui.score.textContent = state.score;
  ui.combo.textContent = `x${state.combo}`;
  ui.best.textContent = best;
  ui.batteryText.textContent = `${Math.max(0, Math.ceil(state.battery))}%`;
  ui.batteryBar.style.width = `${Math.max(0, state.battery)}%`;
  ui.boostText.textContent = state.boostCooldown <= 0 ? "Ready" : `${state.boostCooldown.toFixed(1)}s`;
  ui.boostBar.style.width = `${Math.round(state.boostCharge * 100)}%`;
  ui.speed.textContent = `Speed ${state.speed.toFixed(1)}`;
  ui.packages.textContent = `Packages ${state.packages}`;
  ui.time.textContent = formatTime(state.elapsed);
  ui.state.textContent = state.over ? "Ended" : state.paused ? "Paused" : state.started ? "Running" : "Ready";
  ui.boost.disabled = state.boostCooldown > 0 || !state.started || state.paused || state.over;
}

function formatTime(value) {
  const total = Math.floor(value);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

window.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();
  keys[event.key] = true;
  keys[key] = true;
  if (event.key === " " || event.key === "Shift") {
    event.preventDefault();
    boost();
  }
  if (event.key === "Enter" && (!state.started || state.over)) startGame();
});
window.addEventListener("keyup", (event) => {
  keys[event.key] = false;
  keys[event.key.toLowerCase()] = false;
});

ui.start.addEventListener("click", startGame);
ui.left.addEventListener("click", () => moveLane(-1));
ui.right.addEventListener("click", () => moveLane(1));
ui.boost.addEventListener("click", boost);
ui.sound.addEventListener("click", toggleSound);
ui.pause.addEventListener("click", () => {
  if (!state.started || state.over) return;
  state.paused = !state.paused;
  ui.pause.textContent = state.paused ? "Resume" : "Pause";
  sync();
});

canvas.addEventListener("pointerdown", (event) => {
  if (!state.started || state.paused || state.over) return;
  const rect = canvas.getBoundingClientRect();
  const x = ((event.clientX - rect.left) / rect.width) * W;
  const nearest = LANES.reduce((bestLane, laneX, index) => (Math.abs(laneX - x) < Math.abs(LANES[bestLane] - x) ? index : bestLane), state.targetLane);
  state.targetLane = nearest;
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
