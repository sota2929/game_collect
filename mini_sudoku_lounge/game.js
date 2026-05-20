const size = 4;
const box = 2;
const storageKey = "miniSudokuLounge.best.v1";

const boardEl = document.querySelector("#board");
const timeText = document.querySelector("#timeText");
const filledText = document.querySelector("#filledText");
const hintText = document.querySelector("#hintText");
const bestText = document.querySelector("#bestText");
const message = document.querySelector("#message");
const startButton = document.querySelector("#startButton");
const hintButton = document.querySelector("#hintButton");
const clearButton = document.querySelector("#clearButton");
const nextButton = document.querySelector("#nextButton");
const retryButton = document.querySelector("#retryButton");
const soundToggle = document.querySelector("#soundToggle");
const modal = document.querySelector("#resultModal");
const resultTitle = document.querySelector("#resultTitle");
const resultTime = document.querySelector("#resultTime");
const resultScore = document.querySelector("#resultScore");
const numberButtons = [...document.querySelectorAll("[data-number]")];

let solution = [];
let puzzle = [];
let values = [];
let selected = -1;
let hints = 3;
let seconds = 0;
let timerId = 0;
let running = false;
let soundOn = true;
let audio;
let bgmGain;
let bgmTimer = 0;
let bgmStep = 0;

function indexOf(row, col) {
  return row * size + col;
}

function rowOf(index) {
  return Math.floor(index / size);
}

function colOf(index) {
  return index % size;
}

function shuffle(list) {
  const next = [...list];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

function makeSolution() {
  const digits = shuffle([1, 2, 3, 4]);
  const rowBands = shuffle([0, 1]);
  const colBands = shuffle([0, 1]);
  const rows = rowBands.flatMap((band) => shuffle([band * 2, band * 2 + 1]));
  const cols = colBands.flatMap((band) => shuffle([band * 2, band * 2 + 1]));
  return rows.flatMap((row) =>
    cols.map((col) => {
      const pattern = (row * box + Math.floor(row / box) + col) % size;
      return digits[pattern];
    }),
  );
}

function makePuzzle() {
  solution = makeSolution();
  puzzle = [...solution];
  const holes = 7 + Math.floor(Math.random() * 3);
  shuffle([...Array(size * size).keys()]).slice(0, holes).forEach((index) => {
    puzzle[index] = 0;
  });
  values = [...puzzle];
}

function bestSeconds() {
  return Number(localStorage.getItem(storageKey) || "0");
}

function setBest(value) {
  const current = bestSeconds();
  if (!current || value < current) localStorage.setItem(storageKey, String(value));
}

function formatTime(value) {
  const min = Math.floor(value / 60).toString().padStart(2, "0");
  const sec = Math.floor(value % 60).toString().padStart(2, "0");
  return `${min}:${sec}`;
}

function setupAudio() {
  if (audio) return;
  audio = new (window.AudioContext || window.webkitAudioContext)();
  bgmGain = audio.createGain();
  bgmGain.gain.value = 0;
  bgmGain.connect(audio.destination);
}

function tone(freq, durationMs = 120, type = "sine", volume = 0.045) {
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
  gain.gain.exponentialRampToValueAtTime(0.018, start + 0.035);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.36);
  osc.connect(gain);
  gain.connect(bgmGain);
  osc.start(start);
  osc.stop(start + 0.4);
}

function startBgm() {
  if (!audio || !soundOn || bgmTimer) return;
  bgmGain.gain.setTargetAtTime(0.34, audio.currentTime, 0.35);
  const phrases = [
    [261.63, 329.63, 392.0],
    [293.66, 349.23, 440.0],
    [329.63, 392.0, 493.88],
    [293.66, 369.99, 440.0],
  ];
  const playPhrase = () => {
    phrases[bgmStep % phrases.length].forEach((freq, index) => playBgmNote(freq, index * 0.24));
    bgmStep += 1;
  };
  playPhrase();
  bgmTimer = window.setInterval(playPhrase, 1900);
}

function stopBgm() {
  if (bgmTimer) {
    window.clearInterval(bgmTimer);
    bgmTimer = 0;
  }
  if (bgmGain && audio) bgmGain.gain.setTargetAtTime(0.0001, audio.currentTime, 0.18);
}

function sameUnit(a, b) {
  const ar = rowOf(a);
  const ac = colOf(a);
  const br = rowOf(b);
  const bc = colOf(b);
  return ar === br || ac === bc || (Math.floor(ar / box) === Math.floor(br / box) && Math.floor(ac / box) === Math.floor(bc / box));
}

function render() {
  boardEl.innerHTML = "";
  values.forEach((value, index) => {
    const cell = document.createElement("button");
    cell.className = "cell";
    cell.type = "button";
    cell.dataset.index = String(index);
    cell.setAttribute("role", "gridcell");
    cell.setAttribute("aria-label", `${rowOf(index) + 1}行${colOf(index) + 1}列`);
    if (puzzle[index]) cell.classList.add("given");
    if (selected === index) cell.classList.add("selected");
    if (selected >= 0 && selected !== index && sameUnit(selected, index)) cell.classList.add("peer");
    if (value && !puzzle[index]) cell.classList.add("filled");
    cell.textContent = value || "";
    cell.addEventListener("click", () => selectCell(index));
    boardEl.append(cell);
  });
  timeText.textContent = formatTime(seconds);
  filledText.textContent = `${values.filter(Boolean).length}/16`;
  hintText.textContent = String(hints);
  bestText.textContent = bestSeconds() ? formatTime(bestSeconds()) : "--:--";
}

function setMessage(text) {
  message.textContent = text;
}

function beginGame({ resetPuzzle = false } = {}) {
  setupAudio();
  if (audio.state === "suspended") audio.resume();
  if (resetPuzzle) {
    makePuzzle();
    selected = values.findIndex((value) => !value);
  }
  hints = 3;
  seconds = 0;
  running = true;
  modal.hidden = true;
  startButton.textContent = "New";
  clearInterval(timerId);
  timerId = window.setInterval(() => {
    seconds += 1;
    timeText.textContent = formatTime(seconds);
  }, 1000);
  startBgm();
  setMessage("開店。4x4のミニ数独を完成させましょう。");
  render();
  window.CollectUGC?.recordPlay?.("mini-sudoku-lounge");
}

function selectCell(index) {
  if (!running) beginGame();
  selected = index;
  render();
  if (puzzle[index]) setMessage("最初から入っている数字は変更できません。空きマスを選びましょう。");
}

function placeNumber(number) {
  if (!running) beginGame();
  if (selected < 0) {
    setMessage("先に空きマスを選んでください。");
    tone(160, 80, "square", 0.025);
    return;
  }
  if (puzzle[selected]) {
    setMessage("そのマスは固定です。空いているマスを選びましょう。");
    tone(160, 80, "square", 0.025);
    return;
  }
  values[selected] = number;
  setMessage(`${number} を置きました。行・列・2x2ブロックを見比べながら進めましょう。`);
  tone(440 + number * 40, 90, "sine", 0.035);
  render();
  if (values.every((value, index) => value === solution[index])) finishGame();
}

function clearCell() {
  if (selected < 0 || puzzle[selected]) return;
  values[selected] = 0;
  setMessage("選択中のマスを空にしました。");
  render();
}

function useHint() {
  if (!running) beginGame();
  if (hints <= 0) {
    setMessage("Hintは使い切りました。");
    tone(160, 80, "square", 0.025);
    return;
  }
  const target = selected >= 0 && !puzzle[selected] && values[selected] !== solution[selected]
    ? selected
    : values.findIndex((value, index) => !puzzle[index] && value !== solution[index]);
  if (target < 0) return;
  selected = target;
  values[target] = solution[target];
  hints -= 1;
  setMessage("Hintで1マス埋めました。残りの行・列を見比べましょう。");
  tone(760, 150, "triangle", 0.05);
  render();
  if (values.every((value, index) => value === solution[index])) finishGame();
}

function focusNextEmpty() {
  if (!running) beginGame();
  const start = selected < 0 ? 0 : selected + 1;
  const order = [...Array(size * size).keys()].map((_, offset) => (start + offset) % (size * size));
  const target = order.find((index) => !puzzle[index] && !values[index]);
  if (target >= 0) {
    selected = target;
    setMessage("次の空きマスを選びました。");
    tone(520, 80, "sine", 0.03);
  } else {
    setMessage("空きマスはありません。盤面全体を見直して完成を狙いましょう。");
    tone(360, 90, "triangle", 0.03);
  }
  render();
}

function startGame() {
  beginGame({ resetPuzzle: true });
}

function finishGame() {
  if (!running) return;
  running = false;
  clearInterval(timerId);
  stopBgm();
  setBest(seconds);
  const score = Math.max(100, 2400 - seconds * 18 - (3 - hints) * 80);
  resultTitle.textContent = "Perfect Solve";
  resultTime.textContent = formatTime(seconds);
  resultScore.textContent = score.toLocaleString();
  modal.hidden = false;
  startButton.textContent = "Start";
  tone(880, 170, "triangle", 0.06);
  render();
}

startButton.addEventListener("click", startGame);
retryButton.addEventListener("click", startGame);
hintButton.addEventListener("click", useHint);
clearButton.addEventListener("click", clearCell);
nextButton.addEventListener("click", focusNextEmpty);
numberButtons.forEach((button) => {
  button.addEventListener("click", () => placeNumber(Number(button.dataset.number)));
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
  if (event.key === "Enter") {
    event.preventDefault();
    if (!running) startGame();
  }
  if (/^[1-4]$/.test(event.key)) placeNumber(Number(event.key));
  if (event.key === "Backspace" || event.key === "Delete") clearCell();
  const move = { ArrowUp: -size, ArrowDown: size, ArrowLeft: -1, ArrowRight: 1 }[event.key];
  if (move && selected >= 0) {
    event.preventDefault();
    const next = Math.max(0, Math.min(size * size - 1, selected + move));
    selected = next;
    render();
  }
});

makePuzzle();
selected = values.findIndex((value) => !value);
render();
