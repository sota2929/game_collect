const duration = 45;
const storageKey = "lastTrainNumberHunt.best.v1";

const board = document.querySelector("#board");
const scoreText = document.querySelector("#scoreText");
const timeText = document.querySelector("#timeText");
const comboText = document.querySelector("#comboText");
const stageText = document.querySelector("#stageText");
const targetText = document.querySelector("#targetText");
const goalText = document.querySelector("#goalText");
const phaseText = document.querySelector("#phaseText");
const message = document.querySelector("#message");
const startButton = document.querySelector("#startButton");
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
let combo = 0;
let stage = 1;
let nextNumber = 1;
let maxNumber = 12;
let cols = 4;
let tiles = [];
let audio;
let bgmGain;
let bgmTimer = 0;
let bgmStep = 0;
let soundOn = true;

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

function tone(freq, durationMs = 100, type = "sine", volume = 0.04) {
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
  gain.gain.exponentialRampToValueAtTime(0.012, start + 0.03);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.3);
  osc.connect(gain);
  gain.connect(bgmGain);
  osc.start(start);
  osc.stop(start + 0.34);
}

function startBgm() {
  if (!audio || !soundOn || bgmTimer) return;
  bgmGain.gain.setTargetAtTime(0.2, audio.currentTime, 0.25);
  const phrases = [
    [392, 493.88, 587.33],
    [329.63, 440, 554.37],
    [369.99, 466.16, 622.25],
  ];
  const playPhrase = () => {
    phrases[bgmStep % phrases.length].forEach((freq, index) => playBgmNote(freq, index * 0.18));
    bgmStep += 1;
  };
  playPhrase();
  bgmTimer = window.setInterval(playPhrase, 1400);
}

function stopBgm() {
  if (bgmTimer) {
    window.clearInterval(bgmTimer);
    bgmTimer = 0;
  }
  if (bgmGain && audio) bgmGain.gain.setTargetAtTime(0.0001, audio.currentTime, 0.2);
}

function shuffle(array) {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function stageConfig() {
  const count = Math.min(26, 10 + stage * 2);
  const columns = stage < 4 ? 4 : stage < 8 ? 5 : 6;
  return { count, columns };
}

function makeTiles() {
  const config = stageConfig();
  maxNumber = config.count;
  cols = config.columns;
  const targetValues = Array.from({ length: maxNumber }, (_, index) => index + 1);
  const spaces = cols * Math.ceil(maxNumber / cols);
  const decoys = Array.from({ length: Math.max(0, spaces - maxNumber) }, (_, index) => maxNumber + index + 7);
  tiles = shuffle([...targetValues, ...decoys]).map((value, index) => ({
    value,
    line: ["A", "B", "C", "D", "E", "F"][index % cols],
    cleared: value > maxNumber,
  }));
}

function updateHud() {
  scoreText.textContent = score.toLocaleString();
  timeText.textContent = Math.max(0, Math.ceil(timeLeft));
  comboText.textContent = combo;
  stageText.textContent = stage;
  targetText.textContent = nextNumber <= maxNumber ? nextNumber : "OK";
  goalText.textContent = `1 → ${maxNumber}`;
}

function render() {
  board.style.setProperty("--cols", cols);
  board.innerHTML = "";
  tiles.forEach((tile) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "number-tile";
    button.dataset.line = `Line ${tile.line}`;
    button.textContent = tile.value;
    if (tile.cleared) button.classList.add("cleared");
    button.addEventListener("click", () => chooseTile(tile, button));
    board.append(button);
  });
  updateHud();
}

function newStage() {
  nextNumber = 1;
  combo = 0;
  phaseText.textContent = `Stage ${stage}`;
  message.textContent = "次の数字を見つけて、止まらず押していきましょう。";
  makeTiles();
  render();
}

function chooseTile(tile, element) {
  if (!running) {
    startGame();
    return;
  }
  if (tile.cleared) {
    wrong(element, "その発車標はもう確認済みです。");
    return;
  }
  if (tile.value !== nextNumber) {
    wrong(element, `${nextNumber} を探しましょう。`);
    return;
  }
  tile.cleared = true;
  combo += 1;
  const quickBonus = Math.max(0, Math.ceil(timeLeft / 5));
  score += 25 + combo * 4 + stage * 3 + quickBonus;
  element.classList.add("correct");
  tone(520 + (combo % 6) * 44, 80, "triangle", 0.04);
  nextNumber += 1;
  if (nextNumber > maxNumber) {
    clearStage();
    return;
  }
  render();
}

function wrong(element, text) {
  combo = 0;
  timeLeft = Math.max(0, timeLeft - 2);
  message.textContent = text;
  element.classList.add("wrong");
  tone(150, 90, "square", 0.018);
  window.setTimeout(() => element.classList.remove("wrong"), 260);
  updateHud();
  if (timeLeft <= 0) endGame("終電に間に合わず");
}

function clearStage() {
  const bonus = Math.round(220 + timeLeft * 4 + stage * 28 + combo * 6);
  score += bonus;
  timeLeft = Math.min(duration, timeLeft + 4);
  message.textContent = `発車標を確認。+${bonus.toLocaleString()}点、次のホームへ。`;
  phaseText.textContent = "Departing";
  tone(740, 120, "sine", 0.05);
  tone(990, 170, "triangle", 0.04);
  stage += 1;
  render();
  window.setTimeout(() => {
    if (running) newStage();
  }, 760);
}

function startGame() {
  setupAudio();
  if (audio.state === "suspended") audio.resume();
  running = true;
  timeLeft = duration;
  score = 0;
  combo = 0;
  stage = 1;
  modal.hidden = true;
  startButton.textContent = "Restart";
  window.clearInterval(timerId);
  timerId = window.setInterval(tick, 1000);
  startBgm();
  newStage();
  window.CollectUGC?.recordPlay?.("last-train-number-hunt");
}

function endGame(title) {
  if (!running) return;
  running = false;
  window.clearInterval(timerId);
  stopBgm();
  setBest(score);
  resultTitle.textContent = title;
  resultScore.textContent = score.toLocaleString();
  resultStage.textContent = stage;
  modal.hidden = false;
  startButton.textContent = "Start";
  message.textContent = `Best ${bestScore().toLocaleString()} 点。次は終電までにもっと多く確認しましょう。`;
  updateHud();
}

function tick() {
  if (!running) return;
  timeLeft -= 1;
  if (timeLeft <= 0) {
    timeLeft = 0;
    updateHud();
    endGame("終電に間に合わず");
    return;
  }
  updateHud();
}

startButton.addEventListener("click", startGame);
retryButton.addEventListener("click", startGame);
shuffleButton.addEventListener("click", () => {
  if (!running) {
    startGame();
    return;
  }
  score = Math.max(0, score - 80);
  message.textContent = "発車標の並びを入れ替えました。";
  tiles = shuffle(tiles);
  tone(360, 120, "triangle", 0.03);
  render();
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

window.addEventListener("keydown", (event) => {
  if (event.key === "Enter") startGame();
});

makeTiles();
render();
