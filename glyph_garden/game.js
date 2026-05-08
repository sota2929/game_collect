const boardEl = document.querySelector("#board");
const wrapEl = document.querySelector(".board-wrap");

const ui = {
  score: document.querySelector("#score"),
  goal: document.querySelector("#goal"),
  moves: document.querySelector("#moves"),
  seasonName: document.querySelector("#seasonName"),
  seasonBar: document.querySelector("#seasonBar"),
  shuffle: document.querySelector("#shuffle"),
  hint: document.querySelector("#hint"),
  sound: document.querySelector("#sound"),
  combo: document.querySelector("#combo"),
  largest: document.querySelector("#largest"),
  best: document.querySelector("#best"),
  state: document.querySelector("#state"),
  overlay: document.querySelector("#overlay"),
  overlayTitle: document.querySelector("#overlayTitle"),
  overlayText: document.querySelector("#overlayText"),
  start: document.querySelector("#start"),
};

const SIZE = 7;
const MIN_GROUP = 3;
const GLYPHS = [
  { mark: "✦", color: "#76e39a", dark: "#163626" },
  { mark: "◆", color: "#9e92ff", dark: "#26234c" },
  { mark: "✹", color: "#ffd16b", dark: "#453318" },
  { mark: "●", color: "#ff7f9f", dark: "#472232" },
  { mark: "✧", color: "#6fdcff", dark: "#183b46" },
];
const SEASONS = ["Moon Iris", "Glass Fern", "Dawn Peony", "Star Moss", "Silver Wisteria"];
const BEST_KEY = "glyph-garden-best";

let state;
let audio = null;
let best = Number(localStorage.getItem(BEST_KEY) || 0);
let nextId = 1;

function reset() {
  state = {
    started: false,
    busy: false,
    score: 0,
    goal: 1200,
    moves: 24,
    combo: 1,
    largest: 0,
    season: 0,
    board: [],
    selected: [],
  };
  fillFreshBoard();
  render();
  sync();
}

function fillFreshBoard() {
  do {
    state.board = Array.from({ length: SIZE }, () => Array.from({ length: SIZE }, () => makeGlyph()));
  } while (!findAnyGroup());
}

function makeGlyph() {
  return {
    id: nextId++,
    type: Math.floor(Math.random() * GLYPHS.length),
  };
}

function createAudio() {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return null;
  const context = new AudioContext();
  const master = context.createGain();
  master.gain.value = 0.52;
  master.connect(context.destination);
  return { context, master, muted: false };
}

function ensureAudio() {
  if (!audio) audio = createAudio();
  if (audio && audio.context.state === "suspended") audio.context.resume();
}

function tone(freq, delay, dur, type = "sine", vol = 0.08) {
  if (!audio || audio.muted) return;
  const t = audio.context.currentTime + delay;
  const osc = audio.context.createOscillator();
  const gain = audio.context.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(vol, t + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(gain);
  gain.connect(audio.master);
  osc.start(t);
  osc.stop(t + dur + 0.03);
}

function sfx(kind, count = 2) {
  ensureAudio();
  if (!audio || audio.muted) return;
  if (kind === "clear") {
    for (let i = 0; i < Math.min(7, count); i++) tone(420 + i * 90, i * 0.026, 0.12, "triangle", 0.08);
  } else if (kind === "bloom") {
    tone(260, 0, 0.18, "sine", 0.1);
    tone(520, 0.04, 0.22, "triangle", 0.09);
    tone(780, 0.09, 0.24, "sine", 0.08);
  } else {
    tone(160, 0, 0.12, "sawtooth", 0.08);
  }
}

function startGame() {
  ensureAudio();
  reset();
  state.started = true;
  ui.overlay.classList.add("hidden");
  sync();
}

function render() {
  boardEl.innerHTML = "";
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const cell = state.board[r][c];
      const data = GLYPHS[cell.type];
      const tile = document.createElement("button");
      tile.className = "tile";
      tile.type = "button";
      tile.dataset.r = r;
      tile.dataset.c = c;
      tile.dataset.id = cell.id;
      tile.style.setProperty("--tile-bg", `linear-gradient(145deg, ${data.color}, ${data.dark})`);
      tile.innerHTML = `<span class="glyph">${data.mark}</span>`;
      tile.addEventListener("click", () => choose(r, c));
      boardEl.append(tile);
    }
  }
}

async function choose(r, c) {
  if (!state.started || state.busy || state.moves <= 0) return;
  ensureAudio();
  clearHints();
  const group = flood(r, c);
  if (group.length < MIN_GROUP) {
    state.combo = 1;
    sfx("dud");
    sync();
    return;
  }
  state.busy = true;
  state.moves -= 1;
  state.largest = Math.max(state.largest, group.length);
  const gained = scoreFor(group.length);
  state.score += gained;
  state.season = Math.min(100, state.season + group.length * 2.5 + state.combo * 3);
  markClearing(group);
  showPop(group, `+${gained}`);
  sfx("clear", group.length);
  await wait(170);
  for (const cell of group) state.board[cell.r][cell.c] = null;
  const falls = collapse();
  render();
  animateFalls(falls);
  await wait(440);
  state.combo += 1;
  if (state.season >= 100) bloom();
  if (state.moves > 0 && !findAnyGroup()) {
    state.busy = false;
    endGame("stuck");
    sync();
    return;
  }
  state.busy = false;
  checkEnd();
  sync();
}

function scoreFor(count) {
  return Math.round((count * count * 9 + count * 4) * state.combo);
}

function flood(sr, sc) {
  const start = state.board[sr]?.[sc];
  if (!start) return [];
  const type = start.type;
  const seen = new Set();
  const stack = [{ r: sr, c: sc }];
  const out = [];
  while (stack.length) {
    const cell = stack.pop();
    const key = `${cell.r},${cell.c}`;
    if (seen.has(key)) continue;
    seen.add(key);
    if (cell.r < 0 || cell.r >= SIZE || cell.c < 0 || cell.c >= SIZE) continue;
    if (!state.board[cell.r][cell.c] || state.board[cell.r][cell.c].type !== type) continue;
    out.push(cell);
    stack.push({ r: cell.r + 1, c: cell.c });
    stack.push({ r: cell.r - 1, c: cell.c });
    stack.push({ r: cell.r, c: cell.c + 1 });
    stack.push({ r: cell.r, c: cell.c - 1 });
  }
  return out;
}

function markClearing(group) {
  for (const cell of group) {
    const tile = tileAt(cell.r, cell.c);
    if (tile) tile.classList.add("clearing");
  }
}

function showPop(group, text) {
  const avg = group.reduce((acc, cell) => ({ r: acc.r + cell.r / group.length, c: acc.c + cell.c / group.length }), { r: 0, c: 0 });
  const pop = document.createElement("div");
  pop.className = "pop";
  pop.textContent = text;
  pop.style.left = `${((avg.c + 0.5) / SIZE) * 100}%`;
  pop.style.top = `${((avg.r + 0.5) / SIZE) * 100}%`;
  boardEl.append(pop);
  window.setTimeout(() => pop.remove(), 760);
}

function collapse() {
  const falls = [];
  for (let c = 0; c < SIZE; c++) {
    const survivors = [];
    for (let r = SIZE - 1; r >= 0; r--) {
      if (state.board[r][c] !== null) survivors.push({ glyph: state.board[r][c], fromR: r });
    }
    const missing = SIZE - survivors.length;
    const spawns = Array.from({ length: missing }, (_, index) => ({
      glyph: makeGlyph(),
      fromR: -missing + index,
    }));
    for (let r = SIZE - 1; r >= 0; r--) {
      const item = survivors.shift() || spawns.pop();
      state.board[r][c] = item.glyph;
      falls.push({ id: item.glyph.id, fromR: item.fromR, toR: r });
    }
  }
  return falls;
}

function animateFalls(falls) {
  const step = rowStep();
  for (const fall of falls) {
    const tile = boardEl.querySelector(`[data-id="${fall.id}"]`);
    if (!tile) continue;
    const distance = (fall.fromR - fall.toR) * step;
    if (Math.abs(distance) < 1) continue;
    tile.classList.add("falling");
    tile.style.setProperty("--fall-y", `${distance}px`);
  }
  boardEl.getBoundingClientRect();
  requestAnimationFrame(() => {
    for (const tile of boardEl.querySelectorAll(".falling")) tile.style.setProperty("--fall-y", "0px");
  });
  window.setTimeout(() => {
    for (const tile of boardEl.querySelectorAll(".falling")) tile.classList.remove("falling");
  }, 470);
}

function rowStep() {
  const styles = getComputedStyle(boardEl);
  const gap = parseFloat(styles.rowGap || styles.gap || "0") || 0;
  const rect = boardEl.getBoundingClientRect();
  return (rect.height - gap * (SIZE - 1)) / SIZE + gap;
}

function bloom() {
  state.season = 0;
  state.seasonIndex = ((state.seasonIndex || 0) + 1) % SEASONS.length;
  state.score += 250;
  state.moves += 3;
  state.combo += 2;
  sfx("bloom");
}

function findAnyGroup() {
  let bestGroup = [];
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const group = flood(r, c);
      if (group.length > bestGroup.length) bestGroup = group;
      if (group.length >= MIN_GROUP) return group;
    }
  }
  return bestGroup.length >= MIN_GROUP ? bestGroup : null;
}

function hint() {
  if (!state.started || state.busy) return;
  clearHints();
  const groups = [];
  const seen = new Set();
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const key = `${r},${c}`;
      if (seen.has(key)) continue;
      const group = flood(r, c);
      for (const cell of group) seen.add(`${cell.r},${cell.c}`);
      if (group.length >= MIN_GROUP) groups.push(group);
    }
  }
  groups.sort((a, b) => b.length - a.length);
  const group = groups[0];
  if (!group) return;
  for (const cell of group) tileAt(cell.r, cell.c)?.classList.add("hint");
  window.setTimeout(clearHints, 1700);
}

function clearHints() {
  boardEl.querySelectorAll(".hint").forEach((tile) => tile.classList.remove("hint"));
}

function reshuffle(cost = true) {
  if (!state.started || state.busy) return;
  if (cost && state.moves <= 1) return;
  if (cost) state.moves -= 1;
  const values = state.board.flat();
  for (let i = values.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [values[i], values[j]] = [values[j], values[i]];
  }
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) state.board[r][c] = values[r * SIZE + c];
  }
  state.combo = 1;
  render();
  if (!findAnyGroup()) {
    endGame("stuck");
    sync();
    return;
  }
  checkEnd();
  sync();
}

function checkEnd() {
  if (state.score >= state.goal) {
    state.goal += 900 + Math.floor(state.goal * 0.28);
    state.moves += 7;
  }
  if (state.moves <= 0) {
    endGame("moves");
  }
}

function endGame(reason) {
  state.started = false;
  state.busy = false;
  best = Math.max(best, state.score);
  localStorage.setItem(BEST_KEY, String(best));
  ui.overlayTitle.textContent = reason === "stuck" ? "Game Over" : state.score >= 1200 ? "Garden Bloomed" : "Night Settled";
  ui.overlayText.textContent =
    reason === "stuck"
      ? `${state.score}点。3個以上つながった紋章がなくなりました。最高記録は${best}点。`
      : `${state.score}点。最高記録は${best}点。大きな群れを残して連鎖すると一気に伸びます。`;
  ui.start.textContent = "Restart";
  ui.overlay.classList.remove("hidden");
}

function tileAt(r, c) {
  return boardEl.querySelector(`[data-r="${r}"][data-c="${c}"]`);
}

function sync() {
  ui.score.textContent = state.score;
  ui.goal.textContent = state.goal;
  ui.moves.textContent = state.moves;
  ui.combo.textContent = `Combo x${state.combo}`;
  ui.largest.textContent = `Largest ${state.largest}`;
  ui.best.textContent = `Best ${best}`;
  ui.state.textContent = state.busy ? "Blooming" : state.started ? "Playing" : "Ready";
  ui.seasonName.textContent = SEASONS[state.seasonIndex || 0];
  ui.seasonBar.style.width = `${state.season}%`;
  ui.shuffle.disabled = !state.started || state.busy || state.moves <= 1;
  ui.hint.disabled = !state.started || state.busy;
}

function wait(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

ui.start.addEventListener("click", startGame);
ui.shuffle.addEventListener("click", () => reshuffle(true));
ui.hint.addEventListener("click", hint);
ui.sound.addEventListener("click", () => {
  ensureAudio();
  if (!audio) return;
  audio.muted = !audio.muted;
  ui.sound.textContent = audio.muted ? "Sound Off" : "Sound On";
});

reset();
