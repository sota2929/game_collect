const GAME_ID = "sky-post-one-stroke";
const GAME_DURATION = 40;
const BEST_KEY = "collect.skyPostOneStroke.best";
const GRID_SIZE = 6;

const $ = (selector) => document.querySelector(selector);

const els = {
  score: $("#scoreText"),
  time: $("#timeText"),
  route: $("#routeText"),
  round: $("#roundText"),
  phase: $("#phaseText"),
  target: $("#targetText"),
  board: $("#board"),
  svg: $("#routeSvg"),
  layer: $("#nodeLayer"),
  start: $("#startButton"),
  undo: $("#undoButton"),
  reset: $("#resetButton"),
  sound: $("#soundToggle"),
  modal: $("#resultModal"),
  retry: $("#retryButton"),
  resultScore: $("#resultScore"),
  resultText: $("#resultText"),
};

let state = {
  running: false,
  score: 0,
  time: GAME_DURATION,
  round: 1,
  nodes: [],
  edges: new Map(),
  visited: [],
  current: null,
  timer: null,
  dragging: false,
  soundOn: true,
};

let audioCtx = null;
let bgmTimer = null;

function ensureAudio() {
  if (!state.soundOn) return null;
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === "suspended") audioCtx.resume();
  return audioCtx;
}

function tone(freq, duration = 0.12, type = "sine", gainValue = 0.08) {
  const ctx = ensureAudio();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.0001, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(gainValue, ctx.currentTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + duration + 0.03);
}

function startBgm() {
  stopBgm();
  if (!state.soundOn) return;
  const notes = [523, 659, 784, 698, 587, 740, 880, 784];
  let index = 0;
  bgmTimer = window.setInterval(() => {
    tone(notes[index % notes.length], 0.18, "triangle", 0.025);
    index += 1;
  }, 720);
}

function stopBgm() {
  if (bgmTimer) window.clearInterval(bgmTimer);
  bgmTimer = null;
}

function randomInt(max) {
  return Math.floor(Math.random() * max);
}

function cellKey(cell) {
  return `${cell.r}-${cell.c}`;
}

function neighbors(cell) {
  return [
    { r: cell.r - 1, c: cell.c },
    { r: cell.r + 1, c: cell.c },
    { r: cell.r, c: cell.c - 1 },
    { r: cell.r, c: cell.c + 1 },
  ].filter((next) => next.r >= 0 && next.r < GRID_SIZE && next.c >= 0 && next.c < GRID_SIZE);
}

function makeLevel(round) {
  const length = Math.min(9 + round, 18);
  for (let attempt = 0; attempt < 520; attempt += 1) {
    const start = { r: randomInt(GRID_SIZE), c: randomInt(GRID_SIZE) };
    const path = [start];
    const used = new Set([cellKey(start)]);
    while (path.length < length) {
      const current = path[path.length - 1];
      const options = neighbors(current).filter((next) => !used.has(cellKey(next)));
      if (!options.length) break;
      const next = options[randomInt(options.length)];
      path.push(next);
      used.add(cellKey(next));
    }
    if (path.length === length) {
      return positionCells(path);
    }
  }

  return positionCells([
    { r: 0, c: 0 },
    { r: 0, c: 1 },
    { r: 1, c: 1 },
    { r: 2, c: 1 },
    { r: 2, c: 2 },
    { r: 3, c: 2 },
    { r: 4, c: 2 },
    { r: 4, c: 3 },
    { r: 5, c: 3 },
    { r: 5, c: 4 },
  ]);
}

function positionCells(cells) {
  const minR = Math.min(...cells.map((cell) => cell.r));
  const maxR = Math.max(...cells.map((cell) => cell.r));
  const minC = Math.min(...cells.map((cell) => cell.c));
  const maxC = Math.max(...cells.map((cell) => cell.c));
  const centerR = (minR + maxR) / 2;
  const centerC = (minC + maxC) / 2;
  return cells.map((cell, index) => ({
    id: index,
    r: cell.r,
    c: cell.c,
    x: 50 + (cell.c - centerC) * 15.5,
    y: 50 + (cell.r - centerR) * 15.5,
  }));
}

function buildEdges(nodes) {
  const edges = new Map(nodes.map((node) => [node.id, []]));
  nodes.forEach((a) => {
    nodes.forEach((b) => {
      if (a.id === b.id) return;
      if (Math.abs(a.r - b.r) + Math.abs(a.c - b.c) === 1) {
        edges.get(a.id).push(b.id);
      }
    });
  });
  return edges;
}

function loadRound(selectStart = false) {
  state.nodes = makeLevel(state.round);
  state.edges = buildEdges(state.nodes);
  state.visited = selectStart ? [0] : [];
  state.current = selectStart ? 0 : null;
  els.phase.textContent = state.running ? "Delivering" : "Ready";
  els.target.textContent = selectStart ? "スタート済み。矢印キーでも配達できます" : "赤いポストから出発し、金のゴールへ最後に到着";
  render();
}

function isVisited(id) {
  return state.visited.includes(id);
}

function canVisit(id) {
  if (!state.visited.length) return id === 0;
  if (isVisited(id)) return false;
  if (!state.edges.get(state.current)?.includes(id)) return false;
  if (isGoalId(id) && state.visited.length !== state.nodes.length - 1) return false;
  return true;
}

function availableIds() {
  if (!state.visited.length) return [0];
  return state.edges.get(state.current)?.filter((id) => canVisit(id)) || [];
}

function isGoalId(id) {
  return id === state.nodes.length - 1;
}

function startGame() {
  ensureAudio();
  state.running = true;
  state.score = 0;
  state.time = GAME_DURATION;
  state.round = 1;
  els.modal.hidden = true;
  window.clearInterval(state.timer);
  state.timer = window.setInterval(tick, 1000);
  startBgm();
  window.CollectUGC?.recordPlay?.(GAME_ID);
  els.start.textContent = "Restart";
  loadRound(true);
  updateHud();
}

function tick() {
  state.time -= 1;
  updateHud();
  if (state.time <= 0) {
    finishGame();
  }
}

function finishGame() {
  state.running = false;
  window.clearInterval(state.timer);
  stopBgm();
  const best = Math.max(Number(localStorage.getItem(BEST_KEY) || 0), state.score);
  localStorage.setItem(BEST_KEY, String(best));
  els.resultScore.textContent = `${state.score}通`;
  els.resultText.textContent = `ベスト ${best}通 / Round ${state.round}`;
  els.modal.hidden = false;
  tone(392, 0.22, "triangle", 0.05);
}

function selectNode(id, sourceElement) {
  if (!state.running) return;
  if (!canVisit(id)) {
    markInvalid(sourceElement);
    state.time = Math.max(0, state.time - 1);
    els.phase.textContent = "Route miss";
    els.target.textContent = isGoalId(id) ? "金のゴールは最後に通りましょう" : "隣り合う未配達の雲局だけを選べます";
    tone(196, 0.12, "sawtooth", 0.045);
    updateHud();
    if (state.time <= 0) finishGame();
    return;
  }

  state.visited.push(id);
  state.current = id;
  state.score += 10 + state.round;
  sparkleAt(sourceElement);
  tone(560 + state.visited.length * 32, 0.11, "sine", 0.06);
  els.phase.textContent = "Delivering";
  els.target.textContent = "番号はありません。空路の形を読んでつなげよう";

  if (state.visited.length === state.nodes.length) {
    completeRound();
    return;
  }

  if (!availableIds().length) {
    els.phase.textContent = "Dead end";
    els.target.textContent = "行き止まりです。Undoで少し戻れます";
  }
  render();
  updateHud();
}

function completeRound() {
  state.score += 100 + state.round * 25 + Math.max(0, state.time) * 2;
  state.time += 2;
  els.phase.textContent = "Complete";
  els.target.textContent = "配達完了。次の空路を準備中";
  tone(880, 0.16, "triangle", 0.07);
  tone(1175, 0.2, "triangle", 0.055);
  render();
  updateHud();
  state.round += 1;
  window.setTimeout(() => {
    if (!state.running) return;
    loadRound(true);
    updateHud();
  }, 620);
}

function undo() {
  if (!state.running || state.visited.length <= 1) return;
  state.visited.pop();
  state.current = state.visited[state.visited.length - 1] ?? null;
  els.phase.textContent = "Undo";
  els.target.textContent = state.visited.length ? "別の空路を試せます" : "赤いポストから再出発";
  tone(420, 0.08, "sine", 0.04);
  render();
  updateHud();
}

function resetRoute() {
  if (!state.running) return;
  state.visited = [0];
  state.current = 0;
  els.phase.textContent = "Reset";
  els.target.textContent = "スタート地点からもう一度";
  render();
  updateHud();
}

function updateHud() {
  els.score.textContent = state.score;
  els.time.textContent = Math.max(0, state.time);
  els.route.textContent = `${state.visited.length}/${state.nodes.length}`;
  els.round.textContent = state.round;
}

function render() {
  renderLines();
  renderNodes();
  updateHud();
}

function renderLines() {
  const visitedPairs = new Set();
  for (let i = 1; i < state.visited.length; i += 1) {
    const a = state.visited[i - 1];
    const b = state.visited[i];
    visitedPairs.add([a, b].sort((x, y) => x - y).join("-"));
  }

  const allLines = [];
  const drawn = new Set();
  state.nodes.forEach((node) => {
    state.edges.get(node.id).forEach((toId) => {
      const key = [node.id, toId].sort((a, b) => a - b).join("-");
      if (drawn.has(key)) return;
      drawn.add(key);
      const to = state.nodes.find((item) => item.id === toId);
      const active = visitedPairs.has(key);
      allLines.push(`<line x1="${node.x}%" y1="${node.y}%" x2="${to.x}%" y2="${to.y}%" stroke="${active ? "#249ddb" : "rgba(72, 119, 170, 0.24)"}" stroke-width="${active ? 8 : 4}" />`);
    });
  });
  els.svg.innerHTML = allLines.join("");
}

function renderNodes() {
  const available = new Set(availableIds());
  els.layer.innerHTML = state.nodes
    .map((node) => {
      const classes = ["cloud-node"];
      if (node.id === 0) classes.push("start");
      if (isGoalId(node.id)) classes.push("goal");
      if (isVisited(node.id)) classes.push("visited");
      if (state.current === node.id) classes.push("current");
      if (available.has(node.id)) classes.push("available");
      const label = node.id === 0 ? "〒" : isGoalId(node.id) ? "GOAL" : "";
      return `<button class="${classes.join(" ")}" type="button" data-id="${node.id}" style="left:${node.x}%;top:${node.y}%;" aria-label="${node.id === 0 ? "スタート" : isGoalId(node.id) ? "ゴール" : "雲局"}">${label}</button>`;
    })
    .join("");

  els.layer.querySelectorAll(".cloud-node").forEach((button) => {
    const id = Number(button.dataset.id);
    button.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      state.dragging = true;
      button.setPointerCapture?.(event.pointerId);
      selectNode(id, button);
    });
    button.addEventListener("pointerenter", () => {
      if (state.dragging) selectNode(id, button);
    });
  });
}

function nodeElementById(id) {
  return els.layer.querySelector(`.cloud-node[data-id="${id}"]`);
}

function moveByArrow(key) {
  if (!state.running || state.current === null) return;
  const current = state.nodes.find((node) => node.id === state.current);
  if (!current) return;
  const deltas = {
    ArrowUp: { r: -1, c: 0 },
    ArrowDown: { r: 1, c: 0 },
    ArrowLeft: { r: 0, c: -1 },
    ArrowRight: { r: 0, c: 1 },
  };
  const delta = deltas[key];
  if (!delta) return;
  const next = state.nodes.find((node) => node.r === current.r + delta.r && node.c === current.c + delta.c);
  if (!next) {
    markInvalid(nodeElementById(state.current));
    els.phase.textContent = "No route";
    els.target.textContent = "その方向には雲局がありません";
    tone(220, 0.1, "sawtooth", 0.035);
    return;
  }
  selectNode(next.id, nodeElementById(next.id));
}

function markInvalid(element) {
  if (!element) return;
  element.classList.remove("invalid");
  void element.offsetWidth;
  element.classList.add("invalid");
}

function sparkleAt(element) {
  if (!element) return;
  const spark = document.createElement("span");
  spark.className = "spark";
  spark.style.left = `${element.offsetLeft}px`;
  spark.style.top = `${element.offsetTop}px`;
  els.board.appendChild(spark);
  window.setTimeout(() => spark.remove(), 560);
}

els.start.addEventListener("click", startGame);
els.retry.addEventListener("click", startGame);
els.undo.addEventListener("click", undo);
els.reset.addEventListener("click", resetRoute);
els.board.addEventListener("pointerup", () => {
  state.dragging = false;
});
els.board.addEventListener("pointerleave", () => {
  state.dragging = false;
});
els.sound.addEventListener("click", () => {
  state.soundOn = !state.soundOn;
  els.sound.textContent = state.soundOn ? "Sound On" : "Sound Off";
  els.sound.setAttribute("aria-pressed", String(state.soundOn));
  if (state.soundOn && state.running) {
    startBgm();
    tone(660, 0.12, "sine", 0.05);
  } else {
    stopBgm();
  }
});

window.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !state.running) startGame();
  if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)) {
    event.preventDefault();
    moveByArrow(event.key);
  }
  if (event.key === "Backspace") {
    event.preventDefault();
    undo();
  }
  if (event.key.toLowerCase() === "r") resetRoute();
});

startGame();

function handlePageAudioStop() {
  stopBgm();
}

document.addEventListener("visibilitychange", () => {
  if (document.hidden) handlePageAudioStop();
});
window.addEventListener("pagehide", handlePageAudioStop);
window.addEventListener("beforeunload", handlePageAudioStop);
