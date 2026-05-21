const gridSize = 6;
const duration = 60;
const maxFocus = 3;
const previewPenalty = 90;
const storageKey = "moonlitMemoryRoute.best.v1";

const board = document.querySelector("#board");
const scoreText = document.querySelector("#scoreText");
const timeText = document.querySelector("#timeText");
const stageText = document.querySelector("#stageText");
const lifeText = document.querySelector("#lifeText");
const phaseText = document.querySelector("#phaseText");
const pathText = document.querySelector("#pathText");
const message = document.querySelector("#message");
const startButton = document.querySelector("#startButton");
const previewButton = document.querySelector("#previewButton");
const newRouteButton = document.querySelector("#newRouteButton");
const soundToggle = document.querySelector("#soundToggle");
const modal = document.querySelector("#resultModal");
const retryButton = document.querySelector("#retryButton");
const resultTitle = document.querySelector("#resultTitle");
const resultScore = document.querySelector("#resultScore");
const resultStage = document.querySelector("#resultStage");

let cells = [];
let running = false;
let accepting = false;
let timerId = 0;
let timeLeft = duration;
let score = 0;
let stage = 1;
let focus = maxFocus;
let path = [];
let cursor = 0;
let previewUsed = false;
let previewTimer = 0;
let audio;
let bgmGain;
let bgmTimer = 0;
let bgmStep = 0;
let soundOn = true;
let tracing = false;
let lastTraceIndex = -1;

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
  osc.type = "sine";
  osc.frequency.setValueAtTime(freq, start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(0.012, start + 0.05);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.48);
  osc.connect(gain);
  gain.connect(bgmGain);
  osc.start(start);
  osc.stop(start + 0.55);
}

function startBgm() {
  if (!audio || !soundOn || bgmTimer) return;
  bgmGain.gain.setTargetAtTime(0.25, audio.currentTime, 0.32);
  const phrases = [
    [261.63, 329.63, 392, 493.88],
    [293.66, 369.99, 440, 523.25],
    [246.94, 329.63, 415.3, 493.88],
  ];
  const playPhrase = () => {
    phrases[bgmStep % phrases.length].forEach((freq, index) => playBgmNote(freq, index * 0.22));
    bgmStep += 1;
  };
  playPhrase();
  bgmTimer = window.setInterval(playPhrase, 1800);
}

function stopBgm() {
  if (bgmTimer) {
    window.clearInterval(bgmTimer);
    bgmTimer = 0;
  }
  if (bgmGain && audio) bgmGain.gain.setTargetAtTime(0.0001, audio.currentTime, 0.2);
}

function buildBoard() {
  board.innerHTML = "";
  cells = [];
  for (let y = 0; y < gridSize; y += 1) {
    for (let x = 0; x < gridSize; x += 1) {
      const button = document.createElement("button");
      button.className = "cell";
      button.type = "button";
      button.dataset.x = x;
      button.dataset.y = y;
      button.dataset.index = y * gridSize + x;
      button.setAttribute("aria-label", `${x + 1}列 ${y + 1}行`);
      board.append(button);
      cells.push(button);
    }
  }
}

function neighbors(index) {
  const x = index % gridSize;
  const y = Math.floor(index / gridSize);
  return [
    y > 0 ? index - gridSize : -1,
    x < gridSize - 1 ? index + 1 : -1,
    y < gridSize - 1 ? index + gridSize : -1,
    x > 0 ? index - 1 : -1,
  ].filter((value) => value >= 0);
}

function shuffle(list) {
  return [...list].sort(() => Math.random() - 0.5);
}

function makePath() {
  const targetLength = Math.min(16, 7 + Math.floor(stage * 1.05));
  for (let attempt = 0; attempt < 180; attempt += 1) {
    const start = Math.floor(Math.random() * gridSize) * gridSize + Math.floor(Math.random() * 2);
    const route = [start];
    const used = new Set(route);
    while (route.length < targetLength) {
      const nextOptions = shuffle(neighbors(route.at(-1))).filter((index) => !used.has(index));
      if (!nextOptions.length) break;
      const biased = nextOptions.sort((a, b) => (b % gridSize) - (a % gridSize));
      const next = Math.random() < 0.54 ? biased[0] : nextOptions[0];
      route.push(next);
      used.add(next);
    }
    if (route.length === targetLength && route.at(-1) % gridSize >= 3) return route;
  }
  return [0, 1, 2, 8, 14, 15];
}

function clearCellStates() {
  cells.forEach((cell) => {
    cell.classList.remove("preview", "path", "current", "miss", "start", "goal", "locked");
  });
}

function renderBoard(showPreview = false) {
  clearCellStates();
  path.forEach((index, order) => {
    if (showPreview) cells[index].classList.add("preview");
    if (order < cursor) cells[index].classList.add("path");
  });
  cells[path[0]]?.classList.add("start");
  if (showPreview || cursor >= path.length) cells[path.at(-1)]?.classList.add("goal");
  if (!accepting) cells.forEach((cell) => cell.classList.add("locked"));
}

function updateHud() {
  scoreText.textContent = score.toLocaleString();
  timeText.textContent = Math.max(0, Math.ceil(timeLeft));
  stageText.textContent = stage;
  lifeText.textContent = focus;
  pathText.textContent = `${path.length} steps`;
  previewButton.disabled = !running || previewUsed || !accepting;
}

function showRoute() {
  accepting = false;
  tracing = false;
  lastTraceIndex = -1;
  cursor = 0;
  phaseText.textContent = "Preview";
  message.textContent = "金色の道が光っています。順番を覚えましょう。";
  renderBoard(true);
  tone(540, 120, "triangle", 0.04);
  window.clearTimeout(previewTimer);
  const previewMs = Math.max(780, 1700 - stage * 90);
  previewTimer = window.setTimeout(() => {
    accepting = true;
    phaseText.textContent = "Trace";
    message.textContent = "青い光でなぞります。押したまま道順をたどってください。";
    renderBoard(false);
    updateHud();
  }, previewMs);
  updateHud();
}

function newStage() {
  path = makePath();
  previewUsed = false;
  cursor = 0;
  showRoute();
}

function chooseCell(index) {
  if (!running) {
    startGame();
    return;
  }
  if (!accepting) return;
  if (index === lastTraceIndex) return;
  lastTraceIndex = index;
  const expected = path[cursor];
  if (index === expected) {
    cursor += 1;
    score += 90 + stage * 18 + cursor * 8;
    tone(520 + cursor * 28, 90, "sine", 0.04);
    if (cursor >= path.length) {
      clearStage();
    } else {
      message.textContent = `OK。青い光で進行中。あと${path.length - cursor}マスです。`;
      renderBoard(false);
      updateHud();
    }
    return;
  }

  focus -= 1;
  score = Math.max(0, score - 70);
  cells[index].classList.add("miss");
  message.textContent = focus > 0 ? "道が違います。今の位置から続けましょう。" : "集中力が切れました。";
  tone(150, 120, "square", 0.025);
  updateHud();
  if (focus <= 0) endGame("集中力切れ");
}

function traceFromPoint(clientX, clientY) {
  const target = document.elementFromPoint(clientX, clientY);
  const cell = target?.closest?.(".cell");
  if (!cell || !board.contains(cell)) return;
  chooseCell(Number(cell.dataset.index));
}

function startTrace(event) {
  if (!running) {
    startGame();
    return;
  }
  if (!accepting) return;
  tracing = true;
  lastTraceIndex = -1;
  board.setPointerCapture?.(event.pointerId);
  traceFromPoint(event.clientX, event.clientY);
}

function moveTrace(event) {
  if (!tracing || !accepting) return;
  event.preventDefault();
  traceFromPoint(event.clientX, event.clientY);
}

function endTrace(event) {
  tracing = false;
  lastTraceIndex = -1;
  try {
    board.releasePointerCapture?.(event.pointerId);
  } catch {
    // Some browsers release capture automatically when the pointer ends.
  }
}

function clearStage() {
  accepting = false;
  tracing = false;
  score += 320 + Math.round(timeLeft * 4) + path.length * 35;
  phaseText.textContent = "Clear";
  message.textContent = "ルート完成。次の月明かりへ進みます。";
  tone(660, 130, "triangle", 0.05);
  tone(880, 170, "triangle", 0.04);
  renderBoard(false);
  stage += 1;
  updateHud();
  window.setTimeout(() => {
    if (running) newStage();
  }, 760);
}

function usePreview() {
  if (!running) {
    startGame();
    return;
  }
  if (!accepting || previewUsed) return;
  previewUsed = true;
  tracing = false;
  score = Math.max(0, score - previewPenalty);
  message.textContent = "Previewを使いました。もう一度だけ道が光ります。";
  showRoute();
}

function skipRoute() {
  if (!running) {
    startGame();
    return;
  }
  score = Math.max(0, score - 140);
  focus = Math.max(1, focus - 1);
  message.textContent = "新しいルートに切り替えました。";
  tone(210, 120, "sawtooth", 0.025);
  newStage();
  updateHud();
}

function startGame() {
  setupAudio();
  if (audio.state === "suspended") audio.resume();
  running = true;
  accepting = false;
  timeLeft = duration;
  score = 0;
  stage = 1;
  focus = maxFocus;
  modal.hidden = true;
  startButton.textContent = "Restart";
  window.clearInterval(timerId);
  timerId = window.setInterval(tick, 1000);
  startBgm();
  newStage();
  window.CollectUGC?.recordPlay?.("moonlit-memory-route");
}

function endGame(title) {
  if (!running) return;
  running = false;
  accepting = false;
  window.clearInterval(timerId);
  window.clearTimeout(previewTimer);
  stopBgm();
  setBest(score);
  resultTitle.textContent = title;
  resultScore.textContent = score.toLocaleString();
  resultStage.textContent = String(stage);
  modal.hidden = false;
  startButton.textContent = "Start";
  phaseText.textContent = "Result";
  message.textContent = `Best ${bestScore().toLocaleString()} 点。もう一度、月の道を覚えましょう。`;
  renderBoard(false);
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
previewButton.addEventListener("click", usePreview);
newRouteButton.addEventListener("click", skipRoute);
board.addEventListener("pointerdown", startTrace);
board.addEventListener("pointermove", moveTrace);
board.addEventListener("pointerup", endTrace);
board.addEventListener("pointercancel", endTrace);
board.addEventListener("pointerleave", endTrace);
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

window.addEventListener("keydown", (event) => {
  if (event.key === "Enter") startGame();
  if (event.key.toLowerCase() === "p") usePreview();
});

buildBoard();
path = makePath();
renderBoard(true);
updateHud();

window.__moonlitMemoryRoute = {
  getPath: () => [...path],
};
