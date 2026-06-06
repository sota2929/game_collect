const duration = 90;
const storageKey = "lanternSlidePuzzle.best.v1";

const board = document.querySelector("#board");
const previewCanvas = document.querySelector("#previewCanvas");
const previewCtx = previewCanvas.getContext("2d");
const scoreText = document.querySelector("#scoreText");
const timeText = document.querySelector("#timeText");
const moveText = document.querySelector("#moveText");
const sizeText = document.querySelector("#sizeText");
const phaseText = document.querySelector("#phaseText");
const goalText = document.querySelector("#goalText");
const message = document.querySelector("#message");
const startButton = document.querySelector("#startButton");
const peekButton = document.querySelector("#peekButton");
const shuffleButton = document.querySelector("#shuffleButton");
const soundToggle = document.querySelector("#soundToggle");
const modal = document.querySelector("#resultModal");
const retryButton = document.querySelector("#retryButton");
const resultTitle = document.querySelector("#resultTitle");
const resultScore = document.querySelector("#resultScore");
const resultMoves = document.querySelector("#resultMoves");

let running = false;
let timerId = 0;
let timeLeft = duration;
let score = 0;
let moves = 0;
let stage = 1;
let size = 3;
let tiles = [];
let emptyIndex = 0;
let peekUsed = false;
let imageUrl = "";
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
  gain.gain.exponentialRampToValueAtTime(0.011, start + 0.04);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.42);
  osc.connect(gain);
  gain.connect(bgmGain);
  osc.start(start);
  osc.stop(start + 0.46);
}

function startBgm() {
  if (!audio || !soundOn || bgmTimer) return;
  bgmGain.gain.setTargetAtTime(0.24, audio.currentTime, 0.3);
  const phrases = [
    [329.63, 392, 493.88, 659.25],
    [293.66, 369.99, 440, 587.33],
    [349.23, 440, 523.25, 698.46],
  ];
  const playPhrase = () => {
    phrases[bgmStep % phrases.length].forEach((freq, index) => playBgmNote(freq, index * 0.2));
    bgmStep += 1;
  };
  playPhrase();
  bgmTimer = window.setInterval(playPhrase, 1650);
}

function stopBgm() {
  if (bgmTimer) {
    window.clearInterval(bgmTimer);
    bgmTimer = 0;
  }
  if (bgmGain && audio) bgmGain.gain.setTargetAtTime(0.0001, audio.currentTime, 0.2);
}

function drawFestivalImage() {
  const w = previewCanvas.width;
  const h = previewCanvas.height;
  const g = previewCtx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, "#23182e");
  g.addColorStop(0.48, "#2c1a2e");
  g.addColorStop(1, "#111827");
  previewCtx.fillStyle = g;
  previewCtx.fillRect(0, 0, w, h);

  previewCtx.save();
  previewCtx.globalAlpha = 0.38;
  for (let i = 0; i < 34; i += 1) {
    previewCtx.fillStyle = i % 3 === 0 ? "#ffd77c" : "#fff9ef";
    previewCtx.beginPath();
    previewCtx.arc((i * 83 + stage * 17) % w, (i * 47 + 20) % 150, i % 4 === 0 ? 2 : 1.1, 0, Math.PI * 2);
    previewCtx.fill();
  }
  previewCtx.restore();

  previewCtx.fillStyle = "rgba(13, 13, 22, 0.78)";
  previewCtx.beginPath();
  previewCtx.roundRect(34, 128, 292, 178, 24);
  previewCtx.fill();

  const lanterns = [
    [82, 94, "#ffd77c", 38],
    [170, 78, "#ff8b7b", 34],
    [272, 98, "#9df1d0", 36],
    [112, 218, "#9bb0ff", 42],
    [242, 224, "#ffd77c", 46],
  ];
  lanterns.forEach(([x, y, color, s], index) => {
    previewCtx.strokeStyle = "rgba(255,255,255,0.28)";
    previewCtx.lineWidth = 3;
    previewCtx.beginPath();
    previewCtx.moveTo(x, y - s * 0.86);
    previewCtx.lineTo(x, y - s * 0.52);
    previewCtx.stroke();
    const glow = previewCtx.createRadialGradient(x, y, 4, x, y, s * 1.1);
    glow.addColorStop(0, color);
    glow.addColorStop(1, "rgba(255,255,255,0)");
    previewCtx.fillStyle = glow;
    previewCtx.fillRect(x - s * 1.4, y - s * 1.3, s * 2.8, s * 2.8);
    previewCtx.fillStyle = color;
    previewCtx.beginPath();
    previewCtx.roundRect(x - s * 0.42, y - s * 0.5, s * 0.84, s, 12);
    previewCtx.fill();
    previewCtx.fillStyle = "rgba(14, 12, 20, 0.76)";
    previewCtx.font = `${Math.max(15, s * 0.42)}px sans-serif`;
    previewCtx.textAlign = "center";
    previewCtx.textBaseline = "middle";
    previewCtx.fillText(index % 2 ? "祭" : "灯", x, y);
  });

  previewCtx.fillStyle = "#15131c";
  previewCtx.beginPath();
  previewCtx.roundRect(54, 290, 252, 34, 14);
  previewCtx.fill();
  previewCtx.fillStyle = "#ffd77c";
  previewCtx.font = "700 18px sans-serif";
  previewCtx.textAlign = "center";
  previewCtx.fillText("Lantern Slide", 180, 312);

  imageUrl = previewCanvas.toDataURL("image/png");
  document.documentElement.style.setProperty("--tile-image", `url("${imageUrl}")`);
}

function positionFor(index) {
  return { x: index % size, y: Math.floor(index / size) };
}

function isAdjacent(a, b) {
  const pa = positionFor(a);
  const pb = positionFor(b);
  return Math.abs(pa.x - pb.x) + Math.abs(pa.y - pb.y) === 1;
}

function solvedTiles() {
  return [...Array(size * size - 1).keys(), -1];
}

function shuffleByMoves() {
  tiles = solvedTiles();
  emptyIndex = tiles.length - 1;
  const count = 42 + stage * 12;
  let previous = -1;
  for (let i = 0; i < count; i += 1) {
    const options = tiles
      .map((tile, index) => index)
      .filter((index) => index !== previous && isAdjacent(index, emptyIndex));
    const pick = options[Math.floor(Math.random() * options.length)];
    [tiles[pick], tiles[emptyIndex]] = [tiles[emptyIndex], tiles[pick]];
    previous = emptyIndex;
    emptyIndex = pick;
  }
}

function updateHud() {
  scoreText.textContent = score.toLocaleString();
  timeText.textContent = Math.max(0, Math.ceil(timeLeft));
  moveText.textContent = moves;
  sizeText.textContent = `${size}x${size}`;
  goalText.textContent = `${size * size - 1}枚を並べる`;
}

function render() {
  board.className = `board board-${size}`;
  board.style.setProperty("--size", size);
  board.innerHTML = "";
  tiles.forEach((tile, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = tile < 0 ? "tile empty" : "tile";
    button.dataset.index = index;
    if (tile >= 0) {
      const original = positionFor(tile);
      button.dataset.label = String(tile + 1);
      button.style.setProperty("--tile-x", `${(original.x / (size - 1)) * 100}%`);
      button.style.setProperty("--tile-y", `${(original.y / (size - 1)) * 100}%`);
      if (isAdjacent(index, emptyIndex)) button.classList.add("moveable");
      button.addEventListener("click", () => moveTile(index));
    }
    board.append(button);
  });
  updateHud();
}

function isSolved() {
  return tiles.every((tile, index) => tile === solvedTiles()[index]);
}

function nextSize() {
  if (stage <= 2) return 3;
  if (stage <= 5) return 4;
  return 5;
}

function newStage() {
  size = nextSize();
  moves = 0;
  peekUsed = false;
  phaseText.textContent = `Stage ${stage}`;
  message.textContent = "空きマスの隣を動かして、灯籠絵を完成させましょう。";
  drawFestivalImage();
  shuffleByMoves();
  render();
}

function moveTile(index) {
  if (!running) {
    startGame();
    return;
  }
  if (!isAdjacent(index, emptyIndex)) {
    tone(160, 80, "square", 0.018);
    return;
  }
  [tiles[index], tiles[emptyIndex]] = [tiles[emptyIndex], tiles[index]];
  emptyIndex = index;
  moves += 1;
  score = Math.max(0, score + 14 + stage * 3 - Math.floor(moves / 8));
  tone(420 + (moves % 5) * 34, 80, "sine", 0.035);
  render();
  if (isSolved()) clearStage();
}

function clearStage() {
  const stageBonus = Math.max(120, 600 + timeLeft * 5 + size * 80 - moves * 9);
  score += Math.round(stageBonus);
  phaseText.textContent = "Clear";
  message.textContent = "完成。次の灯籠絵へ進みます。";
  tone(680, 120, "triangle", 0.05);
  tone(920, 170, "triangle", 0.04);
  stage += 1;
  timeLeft = Math.min(duration, timeLeft + 6);
  render();
  window.setTimeout(() => {
    if (running) newStage();
  }, 820);
}

function usePeek() {
  if (!running) {
    startGame();
    return;
  }
  if (peekUsed) {
    message.textContent = "Peekはこのステージでは使い切りました。";
    return;
  }
  peekUsed = true;
  score = Math.max(0, score - 80);
  previewCanvas.classList.add("peek");
  message.textContent = "完成図を確認しました。上の段からそろえましょう。";
  tone(520, 120, "triangle", 0.035);
  window.setTimeout(() => previewCanvas.classList.remove("peek"), 700);
  updateHud();
}

function startGame() {
  setupAudio();
  if (audio.state === "suspended") audio.resume();
  running = true;
  timeLeft = duration;
  score = 0;
  stage = 1;
  modal.hidden = true;
  startButton.textContent = "Restart";
  window.clearInterval(timerId);
  timerId = window.setInterval(tick, 1000);
  startBgm();
  newStage();
  window.CollectUGC?.recordPlay?.("lantern-slide-puzzle");
}

function endGame(title) {
  if (!running) return;
  running = false;
  window.clearInterval(timerId);
  stopBgm();
  setBest(score);
  resultTitle.textContent = title;
  resultScore.textContent = score.toLocaleString();
  resultMoves.textContent = String(moves);
  modal.hidden = false;
  startButton.textContent = "Start";
  message.textContent = `Best ${bestScore().toLocaleString()} 点。もう一度、灯籠絵を完成させましょう。`;
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
peekButton.addEventListener("click", usePeek);
shuffleButton.addEventListener("click", () => {
  if (!running) {
    startGame();
    return;
  }
  score = Math.max(0, score - 120);
  message.textContent = "盤面を組み直しました。";
  shuffleByMoves();
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
  if (!running) return;
  const offsets = { ArrowUp: size, ArrowDown: -size, ArrowLeft: 1, ArrowRight: -1 };
  if (!(event.key in offsets)) return;
  event.preventDefault();
  const target = emptyIndex + offsets[event.key];
  if (target >= 0 && target < tiles.length && isAdjacent(target, emptyIndex)) moveTile(target);
});

drawFestivalImage();
size = 3;
tiles = solvedTiles();
emptyIndex = tiles.length - 1;
render();

function handlePageAudioStop() {
  stopBgm();
}

document.addEventListener("visibilitychange", () => {
  if (document.hidden) handlePageAudioStop();
});
window.addEventListener("pagehide", handlePageAudioStop);
window.addEventListener("beforeunload", handlePageAudioStop);
