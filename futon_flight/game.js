const canvas = document.querySelector("#gameCanvas");
const ctx = canvas.getContext("2d");
const overlay = document.querySelector("#overlay");
const startButton = document.querySelector("#startButton");
const soundToggle = document.querySelector("#soundToggle");
const throwCountEl = document.querySelector("#throwCount");
const distanceEl = document.querySelector("#distance");
const totalEl = document.querySelector("#total");
const windEl = document.querySelector("#wind");
const powerValue = document.querySelector("#powerValue");
const powerFill = document.querySelector("#powerFill");
const stateLabel = document.querySelector("#stateLabel");
const flapCountEl = document.querySelector("#flapCount");
const message = document.querySelector("#message");

let width = 1100;
let height = 620;
let phase = "ready";
let last = 0;
let power = 0;
let powerDirection = 1;
let throwNo = 1;
let total = 0;
let best = Number(localStorage.getItem("futon-flight-best") || 0);
let wind = 0;
let flaps = 2;
let cameraX = 0;
let soundEnabled = true;
let audioCtx = null;
let musicTimer = null;
let clouds = [];
let buildings = [];
let particles = [];
let futon = {};
let pointerHeld = false;
let animationStarted = false;
let flapResult = "";
let flapResultTimer = 0;

function resize() {
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  width = Math.max(340, Math.floor(rect.width));
  height = Math.max(440, Math.floor(rect.height));
  canvas.width = Math.floor(width * dpr);
  canvas.height = Math.floor(height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  makeWorld();
}

function ensureAudio() {
  if (!soundEnabled) return null;
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === "suspended") audioCtx.resume();
  return audioCtx;
}

function tone(freq, duration = .09, type = "triangle", gain = .04) {
  const ac = ensureAudio();
  if (!ac) return;
  const osc = ac.createOscillator();
  const amp = ac.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  amp.gain.setValueAtTime(.0001, ac.currentTime);
  amp.gain.exponentialRampToValueAtTime(gain, ac.currentTime + .012);
  amp.gain.exponentialRampToValueAtTime(.0001, ac.currentTime + duration);
  osc.connect(amp).connect(ac.destination);
  osc.start();
  osc.stop(ac.currentTime + duration + .02);
}

function startMusic() {
  stopMusic();
  if (!soundEnabled) return;
  const melody = [392, 494, 587, 494, 440, 523, 659, 523];
  let step = 0;
  musicTimer = setInterval(() => {
    if (!soundEnabled || phase === "result") return;
    tone(melody[step % melody.length], .08, "triangle", .014);
    if (step % 4 === 0) tone(melody[step % melody.length] / 2, .12, "sine", .012);
    step += 1;
  }, 330);
}

function stopMusic() {
  if (musicTimer) clearInterval(musicTimer);
  musicTimer = null;
}

function makeWorld() {
  clouds = Array.from({ length: 12 }, (_, i) => ({
    x: i * 260 + Math.random() * 130,
    y: 55 + Math.random() * 160,
    s: .7 + Math.random() * .8
  }));
  buildings = [];
  let x = 0;
  while (x < 4200) {
    const w = 150 + Math.random() * 170;
    const h = 115 + Math.random() * 180;
    const landing = x > 420 && Math.random() < .34;
    buildings.push({ x, w, h, landing, hue: 185 + Math.random() * 55 });
    x += w + 35 + Math.random() * 70;
  }
  if (buildings.length) buildings[0] = { x: 0, w: 280, h: 210, landing: false, hue: 205 };
}

function resetThrow() {
  wind = (Math.random() * 7 - 2.2);
  power = 0;
  powerDirection = 1;
  flaps = 2;
  flapResult = "";
  flapResultTimer = 0;
  cameraX = 0;
  particles = [];
  phase = "ready";
  futon = { x: 190, y: height - 245, vx: 0, vy: 0, angle: -.08, spin: 0, landed: false };
  updateHud();
}

function startGame() {
  ensureAudio();
  throwNo = 1;
  total = 0;
  overlay.classList.add("hidden");
  makeWorld();
  resetThrow();
  startMusic();
  last = performance.now();
  if (!animationStarted) {
    animationStarted = true;
    requestAnimationFrame(loop);
  }
}

function beginCharge() {
  if (phase !== "ready") return;
  ensureAudio();
  phase = "charging";
  stateLabel.textContent = "CHARGING";
}

function releaseThrow() {
  if (phase !== "charging") return;
  const p = power / 100;
  const sweet = power >= 72 && power <= 86;
  futon.vx = 360 + p * 500 + (sweet ? 70 : 0);
  futon.vy = -(330 + p * 300 + (sweet ? 55 : 0));
  futon.spin = .4 + p * 1.3;
  phase = "flying";
  stateLabel.textContent = sweet ? "PERFECT LAUNCH" : "FLYING";
  tone(sweet ? 740 : 520, .12, "triangle", .055);
  burst(futon.x, futon.y, sweet ? "#ffc83d" : "#1784b8", 16);
}

function flap() {
  if (phase !== "flying" || flaps <= 0) return;
  flaps -= 1;
  const verticalSpeed = futon.vy;
  const nearApex = Math.abs(verticalSpeed) <= 78;
  const rising = verticalSpeed < -78;
  let lift;
  let boost;
  let color;
  let pitch;

  if (nearApex) {
    lift = 205;
    boost = 245;
    flapResult = "PERFECT FLAP";
    color = "#ffc83d";
    pitch = 1120;
  } else if (rising) {
    lift = 265;
    boost = 105;
    flapResult = "HIGH FLAP";
    color = "#62c4ea";
    pitch = 820;
  } else {
    lift = 335;
    boost = 155;
    flapResult = "RECOVERY FLAP";
    color = "#ee503c";
    pitch = 940;
  }

  futon.vy -= lift;
  futon.vx += boost;
  futon.spin *= -.45;
  flapResultTimer = .9;
  stateLabel.textContent = flapResult;
  tone(pitch, .1, "sine", .05);
  burst(futon.x, futon.y, color, nearApex ? 25 : 18);
  updateHud();
}

function actDown() {
  pointerHeld = true;
  if (phase === "ready") beginCharge();
  else if (phase === "flying") flap();
}

function actUp() {
  pointerHeld = false;
  if (phase === "charging") releaseThrow();
}

function burst(x, y, color, count) {
  for (let i = 0; i < count; i++) {
    particles.push({ x, y, vx: (Math.random() - .5) * 170, vy: (Math.random() - .5) * 150, life: .6, color });
  }
}

function updateHud() {
  throwCountEl.textContent = `${throwNo} / 5`;
  totalEl.textContent = `${total.toFixed(1)} m`;
  const distance = Math.max(0, (futon.x - 190) / 12);
  distanceEl.textContent = `${distance.toFixed(1)} m`;
  windEl.textContent = `${wind >= 0 ? "→" : "←"} ${Math.abs(wind).toFixed(1)}`;
  powerValue.textContent = `${Math.round(power)}%`;
  powerFill.style.width = `${power}%`;
  flapCountEl.textContent = `頂点タップ ×${flaps}`;
}

function update(dt) {
  if (phase === "charging") {
    power += powerDirection * dt * 90;
    if (power >= 100) { power = 100; powerDirection = -1; }
    if (power <= 0) { power = 0; powerDirection = 1; }
  }

  if (phase === "flying") {
    flapResultTimer = Math.max(0, flapResultTimer - dt);
    if (flapResultTimer === 0 && stateLabel.textContent.includes("FLAP")) {
      stateLabel.textContent = "FLYING";
    }
    futon.vx += wind * 7.8 * dt;
    futon.vy += 520 * dt;
    futon.vx *= Math.pow(.997, dt * 60);
    futon.x += futon.vx * dt;
    futon.y += futon.vy * dt;
    futon.angle += futon.spin * dt;
    cameraX = Math.max(0, futon.x - width * .42);
    const groundY = height - 76;
    if (futon.y >= groundY) land(false, groundY);
    for (const b of buildings) {
      const roofY = height - 76 - b.h;
      if (futon.vy > 0 && futon.x > b.x + 12 && futon.x < b.x + b.w - 12 && futon.y >= roofY - 10 && futon.y < roofY + 30) {
        land(b.landing, roofY);
        break;
      }
    }
  }

  particles = particles.filter(p => {
    p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 190 * dt; p.life -= dt;
    return p.life > 0;
  });
  updateHud();
}

function land(goodLanding, y) {
  if (phase !== "flying") return;
  phase = "landed";
  futon.y = y - 8;
  futon.vx = 0;
  futon.vy = 0;
  futon.angle = 0;
  const distance = Math.max(0, (futon.x - 190) / 12);
  const bonus = goodLanding ? 25 : 0;
  total += distance + bonus;
  if (total > best) {
    best = total;
    localStorage.setItem("futon-flight-best", String(best));
  }
  tone(goodLanding ? 920 : 280, .15, goodLanding ? "triangle" : "square", .05);
  showMessage(goodLanding ? `ベランダ着地 +25m！` : `${distance.toFixed(1)}m`);
  burst(futon.x, futon.y, goodLanding ? "#ffc83d" : "#ee503c", 22);
  setTimeout(nextThrow, 1300);
}

function nextThrow() {
  if (throwNo >= 5) {
    overlay.classList.remove("hidden");
    document.querySelector("#overlayTitle").textContent = `合計 ${total.toFixed(1)}m`;
    document.querySelector("#overlayText").textContent = `Best ${best.toFixed(1)}m。風と空中タップの使い方を変えて、さらに遠くのベランダを狙おう。`;
    startButton.textContent = "Retry";
    phase = "result";
    stateLabel.textContent = "RESULT";
    flapCountEl.textContent = `Best ${best.toFixed(1)}m`;
    stopMusic();
    return;
  }
  throwNo += 1;
  resetThrow();
}

function showMessage(text) {
  message.textContent = text;
  message.classList.add("show");
  setTimeout(() => message.classList.remove("show"), 1100);
}

function roundedRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}

function drawCloud(c) {
  ctx.save();
  ctx.translate(c.x - cameraX * .18, c.y);
  ctx.scale(c.s, c.s);
  ctx.fillStyle = "rgba(255,255,255,.82)";
  for (const [x, y, r] of [[0, 0, 30], [34, -12, 40], [78, 2, 31], [39, 12, 42]]) {
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

function drawBuilding(b, i) {
  const x = b.x - cameraX;
  const roofY = height - 76 - b.h;
  ctx.fillStyle = `hsl(${b.hue} 40% ${i % 2 ? 62 : 70}%)`;
  ctx.fillRect(x, roofY, b.w, b.h + 76);
  ctx.fillStyle = "#172a3a";
  ctx.fillRect(x, roofY, b.w, 7);
  ctx.fillStyle = "rgba(255,248,194,.78)";
  for (let yy = roofY + 30; yy < height - 92; yy += 54) {
    for (let xx = x + 22; xx < x + b.w - 22; xx += 48) ctx.fillRect(xx, yy, 20, 28);
  }
  if (b.landing) {
    ctx.strokeStyle = "#ee503c"; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(x + 24, roofY - 18); ctx.lineTo(x + b.w - 24, roofY - 18); ctx.stroke();
    ctx.fillStyle = "#fffdf5";
    for (let xx = x + 36; xx < x + b.w - 20; xx += 50) {
      roundedRect(xx, roofY - 36, 37, 20, 4); ctx.fill(); ctx.stroke();
    }
  }
}

function drawFuton() {
  const x = futon.x - cameraX;
  ctx.save();
  ctx.translate(x, futon.y);
  ctx.rotate(futon.angle);
  ctx.fillStyle = "rgba(23,42,58,.18)";
  ctx.beginPath(); ctx.ellipse(5, 19, 54, 12, 0, 0, Math.PI * 2); ctx.fill();
  const wave = phase === "flying" ? Math.sin(performance.now() * .012) * 7 : 0;
  ctx.fillStyle = "#fff8e7"; ctx.strokeStyle = "#172a3a"; ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(-54, -25); ctx.quadraticCurveTo(0, -36 + wave, 54, -20);
  ctx.lineTo(50, 24); ctx.quadraticCurveTo(0, 15 - wave, -50, 25); ctx.closePath();
  ctx.fill(); ctx.stroke();
  ctx.fillStyle = "#ee503c";
  ctx.beginPath(); ctx.moveTo(-39, -15); ctx.quadraticCurveTo(0, -23 + wave, 39, -12);
  ctx.lineTo(37, 13); ctx.quadraticCurveTo(0, 5 - wave, -37, 14); ctx.closePath(); ctx.fill();
  ctx.fillStyle = "#ffc83d"; roundedRect(-17, -11, 34, 23, 3); ctx.fill(); ctx.stroke();
  ctx.restore();
}

function drawApexGuide() {
  if (phase !== "flying" || flaps <= 0) return;
  const closeness = Math.max(0, 1 - Math.abs(futon.vy) / 190);
  if (closeness <= .08) return;
  const x = futon.x - cameraX;
  const y = futon.y - 74;
  ctx.save();
  ctx.globalAlpha = .2 + closeness * .8;
  ctx.strokeStyle = "#ffc83d";
  ctx.fillStyle = "#ffc83d";
  ctx.lineWidth = 4;
  ctx.beginPath(); ctx.arc(x, y, 14 + closeness * 7, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x - 6, y + 2); ctx.lineTo(x, y + 8); ctx.lineTo(x + 10, y - 7); ctx.stroke();
  ctx.restore();
}

function draw() {
  ctx.clearRect(0, 0, width, height);
  const sky = ctx.createLinearGradient(0, 0, 0, height);
  sky.addColorStop(0, "#62c4ea"); sky.addColorStop(.62, "#e8f7eb"); sky.addColorStop(1, "#ffe1a8");
  ctx.fillStyle = sky; ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = "#ffc83d"; ctx.beginPath(); ctx.arc(width - 92, 82, 47, 0, Math.PI * 2); ctx.fill();
  clouds.forEach(drawCloud);
  buildings.forEach(drawBuilding);
  ctx.fillStyle = "#8cc580"; ctx.fillRect(0, height - 76, width, 76);
  drawFuton();
  drawApexGuide();
  particles.forEach(p => {
    ctx.globalAlpha = Math.max(0, p.life); ctx.fillStyle = p.color; ctx.fillRect(p.x - cameraX - 3, p.y - 3, 7, 7);
  });
  ctx.globalAlpha = 1;
}

function loop(now) {
  const dt = Math.min(.033, (now - last) / 1000 || 0);
  last = now;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

startButton.addEventListener("click", startGame);
soundToggle.addEventListener("click", () => {
  soundEnabled = !soundEnabled;
  soundToggle.textContent = soundEnabled ? "Sound ON" : "Sound OFF";
  soundToggle.setAttribute("aria-pressed", String(soundEnabled));
  if (soundEnabled && phase !== "result") startMusic();
  if (!soundEnabled) stopMusic();
});
canvas.addEventListener("pointerdown", e => { e.preventDefault(); actDown(); });
window.addEventListener("pointerup", actUp);
window.addEventListener("keydown", e => {
  if ((e.key === " " || e.key === "Enter") && !e.repeat) {
    e.preventDefault();
    if (phase === "result" || overlay.classList.contains("hidden") === false) startGame();
    else actDown();
  }
});
window.addEventListener("keyup", e => { if (e.key === " " || e.key === "Enter") actUp(); });
window.addEventListener("resize", resize);
resize();
resetThrow();
draw();
