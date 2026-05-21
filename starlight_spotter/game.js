const duration = 30;
const differenceCount = 5;
const clearTimeBonus = 5;
const storageKey = "starlightSpotter.best.v1";

const leftCanvas = document.querySelector("#leftCanvas");
const rightCanvas = document.querySelector("#rightCanvas");
const leftCtx = leftCanvas.getContext("2d");
const rightCtx = rightCanvas.getContext("2d");
const scoreText = document.querySelector("#scoreText");
const timeText = document.querySelector("#timeText");
const foundText = document.querySelector("#foundText");
const stageText = document.querySelector("#stageText");
const message = document.querySelector("#message");
const startButton = document.querySelector("#startButton");
const hintButton = document.querySelector("#hintButton");
const shuffleButton = document.querySelector("#shuffleButton");
const soundToggle = document.querySelector("#soundToggle");
const modal = document.querySelector("#resultModal");
const retryButton = document.querySelector("#retryButton");
const resultTitle = document.querySelector("#resultTitle");
const resultScore = document.querySelector("#resultScore");
const resultStage = document.querySelector("#resultStage");

let running = false;
let timerId = 0;
let timeLeft = duration;
let score = 0;
let stage = 1;
let hints = 3;
let found = [];
let scene = null;
let soundOn = true;
let audio;
let bgmGain;
let bgmTimer = 0;
let bgmStep = 0;

function bestScore() {
  return Number(localStorage.getItem(storageKey) || "0");
}

function setBest(value) {
  if (value > bestScore()) localStorage.setItem(storageKey, String(value));
}

function setupAudio() {
  if (audio) return;
  audio = new (window.AudioContext || window.webkitAudioContext)();
  bgmGain = audio.createGain();
  bgmGain.gain.value = 0;
  bgmGain.connect(audio.destination);
}

function tone(freq, durationMs = 120, type = "sine", volume = 0.04) {
  if (!soundOn) return;
  setupAudio();
  const osc = audio.createOscillator();
  const gain = audio.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(volume, audio.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + durationMs / 1000);
  osc.connect(gain);
  gain.connect(audio.destination);
  osc.start();
  osc.stop(audio.currentTime + durationMs / 1000);
}

function playBgmNote(freq, delay = 0) {
  if (!audio || !soundOn || !running) return;
  const start = audio.currentTime + delay;
  const osc = audio.createOscillator();
  const gain = audio.createGain();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(freq, start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(0.012, start + 0.04);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.34);
  osc.connect(gain);
  gain.connect(bgmGain);
  osc.start(start);
  osc.stop(start + 0.38);
}

function startBgm() {
  if (!audio || !soundOn || bgmTimer) return;
  bgmGain.gain.setTargetAtTime(0.28, audio.currentTime, 0.34);
  const phrases = [
    [329.63, 392, 493.88, 587.33],
    [293.66, 369.99, 440, 523.25],
    [349.23, 440, 554.37, 659.25],
  ];
  const playPhrase = () => {
    phrases[bgmStep % phrases.length].forEach((freq, index) => playBgmNote(freq, index * 0.18));
    bgmStep += 1;
  };
  playPhrase();
  bgmTimer = window.setInterval(playPhrase, 1500);
}

function stopBgm() {
  if (bgmTimer) {
    window.clearInterval(bgmTimer);
    bgmTimer = 0;
  }
  if (bgmGain && audio) bgmGain.gain.setTargetAtTime(0.0001, audio.currentTime, 0.2);
}

function rand(seed) {
  let value = seed % 2147483647;
  return () => {
    value = (value * 16807) % 2147483647;
    return (value - 1) / 2147483646;
  };
}

function pick(list, random) {
  return list[Math.floor(random() * list.length)];
}

function makeScene(level = 1) {
  const random = rand(Date.now() + level * 9973);
  const palette = ["#ffd36e", "#82f0c1", "#7bc7ff", "#ff8ab6", "#c6a5ff", "#f5f7ff"];
  const objects = [
    { id: "moon", type: "moon", x: 78, y: 70, size: 34, color: "#f5f7ff" },
    { id: "starA", type: "star", x: 168, y: 62, size: 18, color: "#ffd36e" },
    { id: "starB", type: "star", x: 422, y: 68, size: 14, color: "#82f0c1" },
    { id: "cloudA", type: "cloud", x: 300, y: 92, size: 54, color: "#6d7da4" },
    { id: "windowA", type: "window", x: 102, y: 170, size: 44, color: "#ffd36e" },
    { id: "windowB", type: "window", x: 182, y: 182, size: 38, color: "#7bc7ff" },
    { id: "lanternA", type: "lantern", x: 354, y: 196, size: 42, color: "#ff8ab6" },
    { id: "lanternB", type: "lantern", x: 462, y: 190, size: 38, color: "#ffd36e" },
    { id: "plantA", type: "plant", x: 86, y: 292, size: 44, color: "#82f0c1" },
    { id: "plantB", type: "plant", x: 512, y: 286, size: 38, color: "#82f0c1" },
    { id: "cup", type: "cup", x: 282, y: 286, size: 36, color: "#f5f7ff" },
    { id: "comet", type: "comet", x: 452, y: 116, size: 30, color: "#ffd36e" },
  ];

  const selected = [...objects].sort(() => random() - 0.5).slice(0, differenceCount);
  const rightObjects = objects.map((item) => ({ ...item }));
  const diffs = selected.map((base, index) => {
    const target = rightObjects.find((item) => item.id === base.id);
    const mode = pick(["color", "size", "move", "missing"], random);
    if (mode === "color") target.color = pick(palette.filter((color) => color !== target.color), random);
    if (mode === "size") target.size = Math.max(12, target.size + pick([-12, -9, 10, 13], random));
    if (mode === "move") {
      target.x = Math.min(520, Math.max(42, target.x + pick([-24, -18, 20, 26], random)));
      target.y = Math.min(318, Math.max(44, target.y + pick([-20, -14, 16, 22], random)));
    }
    if (mode === "missing") target.hidden = true;
    return {
      id: base.id,
      x: base.x,
      y: base.y,
      radius: Math.max(28, base.size * 0.78),
      mode,
      found: false,
      hint: false,
      order: index,
    };
  });

  return { leftObjects: objects, rightObjects, diffs };
}

function drawStar(ctx, x, y, r, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.beginPath();
  for (let i = 0; i < 10; i += 1) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const radius = i % 2 === 0 ? r : r * 0.42;
    ctx.lineTo(Math.cos(a) * radius, Math.sin(a) * radius);
  }
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 12;
  ctx.fill();
  ctx.restore();
}

function drawObject(ctx, item) {
  if (item.hidden) return;
  ctx.save();
  ctx.lineWidth = 4;
  ctx.strokeStyle = "rgba(255,255,255,0.2)";
  ctx.fillStyle = item.color;
  ctx.shadowColor = item.color;
  ctx.shadowBlur = 10;

  if (item.type === "moon") {
    ctx.beginPath();
    ctx.arc(item.x, item.y, item.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath();
    ctx.arc(item.x + item.size * 0.38, item.y - item.size * 0.18, item.size * 0.9, 0, Math.PI * 2);
    ctx.fill();
  }

  if (item.type === "star") drawStar(ctx, item.x, item.y, item.size, item.color);

  if (item.type === "cloud") {
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 0.72;
    ctx.beginPath();
    ctx.arc(item.x - item.size * 0.34, item.y + 6, item.size * 0.32, 0, Math.PI * 2);
    ctx.arc(item.x, item.y, item.size * 0.42, 0, Math.PI * 2);
    ctx.arc(item.x + item.size * 0.36, item.y + 8, item.size * 0.3, 0, Math.PI * 2);
    ctx.fill();
  }

  if (item.type === "window") {
    const s = item.size;
    ctx.shadowBlur = 16;
    ctx.fillRect(item.x - s / 2, item.y - s / 2, s, s);
    ctx.strokeRect(item.x - s / 2, item.y - s / 2, s, s);
    ctx.beginPath();
    ctx.moveTo(item.x, item.y - s / 2);
    ctx.lineTo(item.x, item.y + s / 2);
    ctx.moveTo(item.x - s / 2, item.y);
    ctx.lineTo(item.x + s / 2, item.y);
    ctx.stroke();
  }

  if (item.type === "lantern") {
    const s = item.size;
    ctx.beginPath();
    ctx.roundRect(item.x - s * 0.38, item.y - s * 0.48, s * 0.76, s * 0.95, 12);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(item.x, item.y - s * 0.7);
    ctx.lineTo(item.x, item.y - s * 0.48);
    ctx.stroke();
  }

  if (item.type === "plant") {
    const s = item.size;
    ctx.shadowBlur = 8;
    ctx.strokeStyle = item.color;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(item.x, item.y + s * 0.45);
    ctx.lineTo(item.x, item.y - s * 0.25);
    ctx.moveTo(item.x, item.y);
    ctx.quadraticCurveTo(item.x - s * 0.5, item.y - s * 0.22, item.x - s * 0.24, item.y - s * 0.48);
    ctx.moveTo(item.x, item.y + s * 0.06);
    ctx.quadraticCurveTo(item.x + s * 0.5, item.y - s * 0.22, item.x + s * 0.26, item.y - s * 0.48);
    ctx.stroke();
    ctx.fillStyle = "#2a2232";
    ctx.fillRect(item.x - s * 0.36, item.y + s * 0.35, s * 0.72, s * 0.32);
  }

  if (item.type === "cup") {
    const s = item.size;
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.roundRect(item.x - s * 0.5, item.y - s * 0.25, s, s * 0.55, 10);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(item.x + s * 0.54, item.y, s * 0.2, -Math.PI / 2, Math.PI / 2);
    ctx.stroke();
  }

  if (item.type === "comet") {
    ctx.strokeStyle = item.color;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(item.x - item.size * 1.2, item.y - item.size * 0.5);
    ctx.lineTo(item.x, item.y);
    ctx.stroke();
    drawStar(ctx, item.x + 4, item.y + 2, item.size * 0.45, item.color);
  }

  ctx.restore();
}

function drawScene(ctx, objects, side) {
  const w = ctx.canvas.width;
  const h = ctx.canvas.height;
  const gradient = ctx.createLinearGradient(0, 0, w, h);
  gradient.addColorStop(0, "#111b35");
  gradient.addColorStop(0.56, "#1b2440");
  gradient.addColorStop(1, "#2c1a34");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, w, h);

  ctx.save();
  ctx.globalAlpha = 0.42;
  for (let i = 0; i < 28; i += 1) {
    const x = (i * 97 + stage * 41 + (side === "right" ? 17 : 0)) % w;
    const y = (i * 53 + stage * 29) % 145;
    ctx.fillStyle = i % 3 === 0 ? "#ffd36e" : "#ffffff";
    ctx.beginPath();
    ctx.arc(x, y + 12, i % 4 === 0 ? 2.1 : 1.2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  ctx.fillStyle = "rgba(9, 12, 24, 0.82)";
  ctx.beginPath();
  ctx.roundRect(32, 138, 496, 196, 24);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.12)";
  ctx.stroke();

  objects.forEach((item) => drawObject(ctx, item));

  scene.diffs.forEach((diff) => {
    if (!diff.found && !diff.hint) return;
    ctx.save();
    ctx.lineWidth = diff.found ? 5 : 4;
    ctx.setLineDash(diff.found ? [] : [8, 8]);
    ctx.strokeStyle = diff.found ? "#82f0c1" : "#ffd36e";
    ctx.shadowColor = ctx.strokeStyle;
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(diff.x, diff.y, diff.radius + 7, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  });
}

function render() {
  drawScene(leftCtx, scene.leftObjects, "left");
  drawScene(rightCtx, scene.rightObjects, "right");
}

function updateHud() {
  scoreText.textContent = score.toLocaleString();
  timeText.textContent = Math.max(0, Math.ceil(timeLeft));
  foundText.textContent = `${found.length} / ${differenceCount}`;
  stageText.textContent = stage;
  hintButton.textContent = `Hint ${hints}`;
}

function newStage(keepTime = true) {
  scene = makeScene(stage);
  found = [];
  if (!keepTime) timeLeft = duration;
  message.textContent = "違うところを5つ探しましょう。";
  render();
  updateHud();
}

function canvasPoint(event, canvas) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((event.clientX - rect.left) / rect.width) * canvas.width,
    y: ((event.clientY - rect.top) / rect.height) * canvas.height,
  };
}

function handleGuess(event) {
  if (!running) {
    startGame();
    return;
  }
  const canvas = event.currentTarget;
  const point = canvasPoint(event, canvas);
  const hit = scene.diffs.find((diff) => {
    if (diff.found) return false;
    const dx = point.x - diff.x;
    const dy = point.y - diff.y;
    return Math.hypot(dx, dy) <= diff.radius + 10;
  });

  if (hit) {
    hit.found = true;
    found.push(hit.id);
    const timeBonus = Math.max(0, Math.round(timeLeft));
    score += 250 + stage * 40 + found.length * 35 + timeBonus;
    message.textContent = `発見。あと${differenceCount - found.length}つです。`;
    tone(560 + found.length * 45, 110, "sine", 0.045);
    render();
    updateHud();
    if (found.length >= differenceCount) clearStage();
  } else {
    score = Math.max(0, score - 25);
    message.textContent = "そこは同じようです。端から順番に見比べましょう。";
    tone(180, 100, "square", 0.02);
    updateHud();
  }
}

function clearStage() {
  score += 500 + Math.round(timeLeft * 8);
  message.textContent = `ステージクリア。残り時間 +${clearTimeBonus} 秒で次の星空へ進みます。`;
  tone(660, 120, "triangle", 0.05);
  tone(880, 170, "triangle", 0.04);
  stage += 1;
  timeLeft = Math.min(duration, timeLeft + clearTimeBonus);
  window.setTimeout(() => {
    if (running) newStage(true);
  }, 800);
}

function useHint() {
  if (!running) {
    startGame();
    return;
  }
  if (hints <= 0) {
    message.textContent = "Hintは使い切りました。";
    tone(160, 100, "square", 0.02);
    return;
  }
  const target = scene.diffs.find((diff) => !diff.found && !diff.hint);
  if (!target) return;
  target.hint = true;
  hints -= 1;
  score = Math.max(0, score - 80);
  message.textContent = "丸の近くに違いがあります。";
  tone(420, 130, "sine", 0.035);
  render();
  updateHud();
}

function startGame() {
  setupAudio();
  if (audio.state === "suspended") audio.resume();
  running = true;
  score = 0;
  stage = 1;
  hints = 3;
  timeLeft = duration;
  modal.hidden = true;
  startButton.textContent = "Restart";
  clearInterval(timerId);
  timerId = window.setInterval(tick, 1000);
  startBgm();
  newStage(false);
  window.CollectUGC?.recordPlay?.("starlight-spotter");
}

function endGame(title) {
  if (!running) return;
  running = false;
  clearInterval(timerId);
  stopBgm();
  setBest(score);
  resultTitle.textContent = title;
  resultScore.textContent = score.toLocaleString();
  resultStage.textContent = String(stage);
  modal.hidden = false;
  startButton.textContent = "Start";
  message.textContent = `Best ${bestScore().toLocaleString()} 点。星空をもう一度見比べましょう。`;
  updateHud();
}

function tick() {
  if (!running) return;
  timeLeft -= 1;
  if (timeLeft <= 0) {
    timeLeft = 0;
    updateHud();
    endGame("時間切れ");
    return;
  }
  updateHud();
}

startButton.addEventListener("click", startGame);
retryButton.addEventListener("click", startGame);
hintButton.addEventListener("click", useHint);
shuffleButton.addEventListener("click", () => {
  if (!running) {
    startGame();
    return;
  }
  score = Math.max(0, score - 120);
  message.textContent = "新しい星空に切り替えました。";
  newStage(true);
});
soundToggle.addEventListener("click", () => {
  soundOn = !soundOn;
  soundToggle.textContent = soundOn ? "Sound On" : "Sound Off";
  soundToggle.setAttribute("aria-pressed", String(soundOn));
  if (soundOn) {
    setupAudio();
    if (audio.state === "suspended") audio.resume();
    startBgm();
  } else {
    stopBgm();
  }
});

[leftCanvas, rightCanvas].forEach((canvas) => {
  canvas.addEventListener("click", handleGuess);
});

window.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !running) startGame();
  if (event.key.toLowerCase() === "h") useHint();
});

scene = makeScene(stage);
render();
updateHud();
