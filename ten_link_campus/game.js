const boardEl = document.querySelector("#board");
const scoreEl = document.querySelector("#score");
const comboEl = document.querySelector("#combo");
const timeEl = document.querySelector("#time");
const bestEl = document.querySelector("#best");
const sumEl = document.querySelector("#sum");
const chainTextEl = document.querySelector("#chainText");
const messageEl = document.querySelector("#message");
const startButton = document.querySelector("#startButton");
const shuffleButton = document.querySelector("#shuffleButton");
const hintButton = document.querySelector("#hintButton");
const soundToggle = document.querySelector("#soundToggle");
const modal = document.querySelector("#resultModal");
const resultScore = document.querySelector("#resultScore");
const resultBest = document.querySelector("#resultBest");
const retryButton = document.querySelector("#retryButton");

const size = 6;
const duration = 60;
const storageKey = "tenLinkCampus.best.v1";
const dirs = [
  [-1, -1], [-1, 0], [-1, 1],
  [0, -1],           [0, 1],
  [1, -1],  [1, 0],  [1, 1],
];

let grid = [];
let selected = [];
let score = 0;
let combo = 0;
let time = duration;
let timer = null;
let playing = false;
let resolving = false;
let soundOn = true;
let audio = null;
let musicTimer = null;

function makeAudio() {
  if (!audio) audio = new AudioContext();
  return audio;
}

function tone(freq, length = 0.08, type = "sine", gain = 0.08) {
  if (!soundOn) return;
  const ctx = makeAudio();
  const osc = ctx.createOscillator();
  const vol = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  vol.gain.setValueAtTime(gain, ctx.currentTime);
  vol.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + length);
  osc.connect(vol).connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + length);
}

function startMusic() {
  if (!soundOn || musicTimer) return;
  const notes = [392, 494, 587, 659, 587, 494];
  let step = 0;
  musicTimer = setInterval(() => {
    if (!playing || !soundOn) return;
    tone(notes[step % notes.length], 0.06, "triangle", 0.022);
    step += 1;
  }, 520);
}

function stopMusic() {
  clearInterval(musicTimer);
  musicTimer = null;
}

function randomDigit() {
  const bag = [1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 7, 8, 9];
  return bag[Math.floor(Math.random() * bag.length)];
}

function newGrid() {
  grid = Array.from({ length: size }, (_, row) =>
    Array.from({ length: size }, (_, col) => ({ row, col, value: randomDigit(), id: crypto.randomUUID() })),
  );
  ensureMove();
}

function ensureMove() {
  if (findPath()) return;
  grid[0][0].value = 4;
  grid[0][1].value = 6;
}

function render() {
  boardEl.replaceChildren();
  grid.flat().forEach((cell) => {
    const tile = document.createElement("button");
    tile.type = "button";
    tile.className = "tile";
    tile.textContent = cell.value;
    tile.dataset.row = cell.row;
    tile.dataset.col = cell.col;
    tile.setAttribute("aria-label", `${cell.value} のタイル`);
    if (selected.some((item) => item.row === cell.row && item.col === cell.col)) tile.classList.add("selected");
    boardEl.append(tile);
  });
  updateHud();
}

function updateHud() {
  const sum = selected.reduce((total, cell) => total + cell.value, 0);
  scoreEl.textContent = score;
  comboEl.textContent = combo;
  timeEl.textContent = time;
  bestEl.textContent = localStorage.getItem(storageKey) || "0";
  sumEl.textContent = sum;
  chainTextEl.textContent = selected.length ? `${selected.length}枚` : "-";
}

function startGame() {
  score = 0;
  combo = 0;
  time = duration;
  selected = [];
  playing = true;
  resolving = false;
  modal.hidden = true;
  startButton.textContent = "Restart";
  message("隣り合う数字をクリックして、合計10を作ろう");
  newGrid();
  render();
  clearInterval(timer);
  timer = setInterval(() => {
    time -= 1;
    updateHud();
    if (time <= 10 && time > 0) tone(220 + time * 12, 0.035, "square", 0.025);
    if (time <= 0) endGame();
  }, 1000);
  startMusic();
}

function endGame() {
  playing = false;
  clearInterval(timer);
  stopMusic();
  const best = Math.max(Number(localStorage.getItem(storageKey)) || 0, score);
  localStorage.setItem(storageKey, String(best));
  resultScore.textContent = score;
  resultBest.textContent = best;
  modal.hidden = false;
  tone(196, 0.16, "sawtooth", 0.05);
}

function message(text, kind = "") {
  messageEl.textContent = text;
  messageEl.className = `message ${kind}`.trim();
}

function isAdjacent(a, b) {
  return Math.abs(a.row - b.row) <= 1 && Math.abs(a.col - b.col) <= 1 && !(a.row === b.row && a.col === b.col);
}

function addCell(cell) {
  if (!playing || resolving || !cell) return;
  const existingIndex = selected.findIndex((item) => item.row === cell.row && item.col === cell.col);
  if (existingIndex >= 0 && existingIndex === selected.length - 2) {
    selected.pop();
    message("1つ戻しました");
  } else if (existingIndex >= 0) {
    if (existingIndex === selected.length - 1) {
      selected.pop();
      message("選択を外しました");
    }
    return;
  } else if (!selected.length || isAdjacent(selected[selected.length - 1], cell)) {
    selected.push(cell);
    tone(520 + cell.value * 22, 0.035, "sine", 0.035);
  } else {
    selected = [cell];
    message("離れたカードなので、ここから選び直します");
    tone(360, 0.035, "sine", 0.03);
  }

  const sum = selected.reduce((total, item) => total + item.value, 0);
  renderSelection();
  if (sum === 10 && selected.length >= 2) {
    message("リンク成立!", "good");
    resolving = true;
    setTimeout(scoreLink, 120);
  } else if (sum > 10) {
    combo = 0;
    message("10を超えました。次のカードから選び直し", "bad");
    tone(120, 0.08, "sawtooth", 0.05);
    selected = [];
    setTimeout(renderSelection, 160);
  } else if (selected.length) {
    message("合計10までクリックでつなげよう");
  } else {
    message("隣り合う数字をクリックして、合計10を作ろう");
  }
}

function renderSelection() {
  document.querySelectorAll(".tile").forEach((tile) => {
    const row = Number(tile.dataset.row);
    const col = Number(tile.dataset.col);
    tile.classList.toggle("selected", selected.some((cell) => cell.row === row && cell.col === col));
  });
  updateHud();
}

function finishSelection() {
  if (!playing || !selected.length) return;
  const sum = selected.reduce((total, cell) => total + cell.value, 0);
  if (sum === 10 && selected.length >= 2) {
    scoreLink();
  } else {
    combo = 0;
    selected = [];
    message(sum > 10 ? "惜しい、10を超えました" : "2枚以上で合計10を作ろう", "bad");
    tone(120, 0.08, "sawtooth", 0.05);
    render();
  }
}

function scoreLink() {
  const linkLength = selected.length;
  const longBonus = selected.length >= 4 ? 160 : 0;
  const points = selected.length * 90 + Math.max(0, selected.length - 2) * 70 + combo * 35 + longBonus;
  score += points;
  combo += 1;
  time = Math.min(duration, time + (selected.length >= 4 ? 2 : 1));
  selected.forEach((cell) => {
    const tile = document.querySelector(`[data-row="${cell.row}"][data-col="${cell.col}"]`);
    tile?.classList.add("pop");
  });
  tone(760 + selected.length * 40, 0.08, "triangle", 0.08);
  setTimeout(() => {
    selected.forEach((cell) => {
      grid[cell.row][cell.col].value = randomDigit();
      grid[cell.row][cell.col].id = crypto.randomUUID();
    });
    selected = [];
    resolving = false;
    ensureMove();
    message(`${linkLength >= 4 ? "Long Link!" : "Link!"} +${points} / Combo ${combo}`, "good");
    render();
  }, 180);
}

function shuffle() {
  if (!playing) startGame();
  grid.flat().forEach((cell) => {
    cell.value = randomDigit();
    cell.id = crypto.randomUUID();
  });
  selected = [];
  resolving = false;
  combo = 0;
  ensureMove();
  message("盤面をシャッフルしました");
  tone(330, 0.08, "triangle", 0.05);
  render();
}

function findPath() {
  const cells = grid.flat();
  for (const start of cells) {
    const result = dfs([start], start.value);
    if (result) return result;
  }
  return null;
}

function dfs(path, sum) {
  if (sum === 10 && path.length >= 2) return path;
  if (sum >= 10 || path.length >= 5) return null;
  const last = path[path.length - 1];
  for (const [dr, dc] of dirs) {
    const next = grid[last.row + dr]?.[last.col + dc];
    if (!next || path.includes(next)) continue;
    const found = dfs([...path, next], sum + next.value);
    if (found) return found;
  }
  return null;
}

function hint() {
  if (!playing) startGame();
  document.querySelectorAll(".tile").forEach((tile) => tile.classList.remove("hint"));
  const path = findPath();
  if (!path) {
    message("見つからないのでShuffleしよう", "bad");
    return;
  }
  path.forEach((cell) => {
    document.querySelector(`[data-row="${cell.row}"][data-col="${cell.col}"]`)?.classList.add("hint");
  });
  message("光ったタイルを順につなぐと10になります", "good");
  tone(880, 0.08, "sine", 0.045);
}

boardEl.addEventListener("click", (event) => {
  const tile = event.target.closest(".tile");
  if (!tile) return;
  if (!playing) startGame();
  event.preventDefault();
  addCell(grid[Number(tile.dataset.row)]?.[Number(tile.dataset.col)]);
});

startButton.addEventListener("click", startGame);
retryButton.addEventListener("click", startGame);
shuffleButton.addEventListener("click", shuffle);
hintButton.addEventListener("click", hint);
soundToggle.addEventListener("click", async () => {
  soundOn = !soundOn;
  soundToggle.textContent = soundOn ? "Sound On" : "Sound Off";
  soundToggle.setAttribute("aria-pressed", String(soundOn));
  if (soundOn) {
    await makeAudio().resume();
    startMusic();
    tone(660, 0.08, "sine", 0.05);
  } else {
    stopMusic();
  }
});

newGrid();
render();
