const size = 6;
const duration = 75;
const storageKey = "stardustMergeCafe.best.v3";
const pieces = [
  { name: "Moon Milk", icon: "☾", label: "月乳", score: 12 },
  { name: "Comet Cookie", icon: "✧", label: "彗星", score: 34 },
  { name: "Nova Tart", icon: "✦", label: "星雲", score: 95 },
  { name: "Aurora Parfait", icon: "❖", label: "極光", score: 260 },
  { name: "Galaxy Float", icon: "✺", label: "銀河", score: 720 },
  { name: "Zenith Cake", icon: "✹", label: "天頂", score: 1800 },
  { name: "Stellar Crown", icon: "✷", label: "王冠", score: 4200 },
];

const boardEl = document.querySelector("#board");
const scoreText = document.querySelector("#scoreText");
const timeText = document.querySelector("#timeText");
const chainText = document.querySelector("#chainText");
const bestText = document.querySelector("#bestText");
const orderText = document.querySelector("#orderText");
const orderBonus = document.querySelector("#orderBonus");
const recipeText = document.querySelector("#recipeText");
const message = document.querySelector("#message");
const startButton = document.querySelector("#startButton");
const shuffleButton = document.querySelector("#shuffleButton");
const retryButton = document.querySelector("#retryButton");
const soundToggle = document.querySelector("#soundToggle");
const modal = document.querySelector("#resultModal");
const resultTitle = document.querySelector("#resultTitle");
const resultScore = document.querySelector("#resultScore");
const resultChain = document.querySelector("#resultChain");

let board = [];
let marked = [];
let score = 0;
let combo = 0;
let bestCombo = 0;
let timeLeft = duration;
let running = false;
let timerId = 0;
let orderLevel = 3;
let orderCount = 0;
let shuffles = 3;
let soundOn = true;
let animating = false;
let audio;
let bgmGain;
let bgmFilter;
let bgmTimer = 0;
let bgmStep = 0;

const motion = {
  merged: -1,
  removed: [],
  dropped: [],
  refilled: [],
};

function indexOf(x, y) {
  return y * size + x;
}

function coords(index) {
  return { x: index % size, y: Math.floor(index / size) };
}

function best() {
  return Number(localStorage.getItem(storageKey) || "0");
}

function setBest(value) {
  if (value > best()) localStorage.setItem(storageKey, String(value));
}

function setupAudio() {
  if (audio) return;
  audio = new (window.AudioContext || window.webkitAudioContext)();
  bgmGain = audio.createGain();
  bgmFilter = audio.createBiquadFilter();
  bgmFilter.type = "lowpass";
  bgmFilter.frequency.value = 1150;
  bgmGain.gain.value = 0;
  bgmGain.connect(bgmFilter);
  bgmFilter.connect(audio.destination);
}

function playBgmNote(freq, delay = 0) {
  if (!audio || !soundOn || !running) return;
  const start = audio.currentTime + delay;
  const osc = audio.createOscillator();
  const gain = audio.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(freq, start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(0.026, start + 0.035);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.42);
  osc.connect(gain);
  gain.connect(bgmGain);
  osc.start(start);
  osc.stop(start + 0.46);
}

function startBgm() {
  if (!audio || !soundOn || bgmTimer) return;
  bgmGain.gain.cancelScheduledValues(audio.currentTime);
  bgmGain.gain.setTargetAtTime(0.24, audio.currentTime, 0.35);
  const phrases = [
    [329.63, 392.0, 493.88, 392.0],
    [293.66, 369.99, 440.0, 369.99],
    [261.63, 329.63, 392.0, 493.88],
    [329.63, 392.0, 440.0, 523.25],
  ];
  const playPhrase = () => {
    const phrase = phrases[bgmStep % phrases.length];
    phrase.forEach((freq, index) => playBgmNote(freq, index * 0.22));
    bgmStep += 1;
  };
  playPhrase();
  bgmTimer = window.setInterval(playPhrase, 1600);
}

function stopBgm() {
  if (bgmTimer) {
    window.clearInterval(bgmTimer);
    bgmTimer = 0;
  }
  if (bgmGain && audio) {
    bgmGain.gain.cancelScheduledValues(audio.currentTime);
    bgmGain.gain.setTargetAtTime(0.0001, audio.currentTime, 0.18);
  }
}

function tone(freq, durationMs = 120, type = "sine", volume = 0.05) {
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

function randomLevel() {
  const max = Math.max(...board, 2);
  const roll = Math.random();
  if (max >= 5 && roll < 0.04) return 4;
  if (roll < 0.18) return 3;
  if (roll < 0.58) return 2;
  return 1;
}

function fillBoard() {
  board = Array.from({ length: size * size }, () => randomLevel());
  softenLargeGroups(8);
  ensurePlayable();
}

function neighbors(index) {
  const { x, y } = coords(index);
  const list = [];
  if (x > 0) list.push(index - 1);
  if (x < size - 1) list.push(index + 1);
  if (y > 0) list.push(index - size);
  if (y < size - 1) list.push(index + size);
  return list;
}

function groupFrom(start) {
  const level = board[start];
  const seen = new Set([start]);
  const stack = [start];
  while (stack.length) {
    const current = stack.pop();
    neighbors(current).forEach((next) => {
      if (!seen.has(next) && board[next] === level) {
        seen.add(next);
        stack.push(next);
      }
    });
  }
  return [...seen];
}

function hasPlayableGroup() {
  return board.some((_, index) => groupFrom(index).length >= 3);
}

function softenLargeGroups(limit) {
  for (let pass = 0; pass < 24; pass += 1) {
    const seen = new Set();
    let changed = false;
    for (let index = 0; index < board.length; index += 1) {
      if (seen.has(index)) continue;
      const group = groupFrom(index);
      group.forEach((cell) => seen.add(cell));
      if (group.length <= limit) continue;
      group.slice(limit).forEach((cell) => {
        const current = board[cell];
        let next = randomLevel();
        while (next === current) next = randomLevel();
        board[cell] = next;
      });
      changed = true;
    }
    if (!changed) return;
  }
}

function ensurePlayable() {
  if (hasPlayableGroup()) return [];
  const row = Math.floor(Math.random() * size);
  const start = Math.floor(Math.random() * (size - 2));
  const level = 1 + Math.floor(Math.random() * 2);
  const changed = [indexOf(start, row), indexOf(start + 1, row), indexOf(start + 2, row)];
  changed.forEach((index) => {
    board[index] = level;
  });
  return changed;
}

function chooseOrder() {
  const top = Math.max(...board, 2);
  orderLevel = Math.max(3, Math.min(top + 1, 6));
  orderCount = 0;
}

function setMessage(text) {
  message.textContent = text;
}

function sleep(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function updateHud() {
  scoreText.textContent = score.toLocaleString();
  timeText.textContent = Math.max(0, Math.ceil(timeLeft));
  chainText.textContent = combo;
  bestText.textContent = best().toLocaleString();
  const order = pieces[orderLevel - 1];
  orderText.textContent = `${order.name}を提供`;
  orderBonus.textContent = `達成で +${(order.score + orderCount * 220).toLocaleString()} / +5秒`;
  recipeText.innerHTML = `${pieces[orderLevel - 2].icon} のかたまりを合成して <strong>${order.icon}</strong>`;
  shuffleButton.textContent = `Shuffle ${shuffles}`;
}

function render() {
  boardEl.innerHTML = "";
  board.forEach((level, index) => {
    const cell = document.createElement("button");
    cell.className = "cell";
    cell.type = "button";
    cell.dataset.index = String(index);
    cell.setAttribute("role", "gridcell");
    cell.setAttribute("aria-label", pieces[level - 1].name);
    if (motion.removed.includes(index)) cell.classList.add("removing");
    if (motion.merged === index) cell.classList.add("merged");
    if (motion.dropped.includes(index)) cell.classList.add("dropped");
    if (motion.refilled.includes(index)) cell.classList.add("refilled");
    const tile = document.createElement("span");
    tile.className = `tile tile-lv${level}`;
    tile.innerHTML = `${pieces[level - 1].icon}<small>${pieces[level - 1].label}</small>`;
    cell.append(tile);
    cell.addEventListener("mouseenter", () => preview(index));
    cell.addEventListener("focus", () => preview(index));
    cell.addEventListener("mouseleave", () => {
      marked = [];
      applyMarked();
    });
    cell.addEventListener("click", () => selectGroup(index));
    boardEl.append(cell);
  });
  applyMarked();
  updateHud();
}

function applyMarked() {
  [...boardEl.children].forEach((cell, index) => {
    cell.classList.toggle("selected", marked.includes(index));
  });
}

function preview(index) {
  if (!running) return;
  const group = groupFrom(index);
  marked = group.length >= 3 ? group : [];
  applyMarked();
}

function selectGroup(index) {
  if (animating) return;
  if (!running) {
    startGame();
    return;
  }
  const group = groupFrom(index);
  if (group.length < 3) {
    combo = 0;
    marked = group;
    setMessage("3つ以上つながった同じスイーツを選びましょう。");
    tone(150, 80, "square", 0.025);
    applyMarked();
    updateHud();
    return;
  }
  mergeGroup(group, index);
}

async function mergeGroup(group, origin) {
  animating = true;
  const level = board[origin];
  const newLevel = Math.min(level + 1, pieces.length);
  const originColumn = coords(origin).x;
  motion.removed = [...group];
  motion.merged = -1;
  motion.dropped = [];
  motion.refilled = [];
  applyMotion();
  await sleep(150);

  group.forEach((index) => {
    board[index] = 0;
  });

  combo += 1;
  bestCombo = Math.max(bestCombo, combo);
  const groupBonus = group.length * group.length * pieces[level - 1].score;
  score += groupBonus * combo + pieces[newLevel - 1].score;

  if (newLevel === orderLevel) {
    const bonus = pieces[orderLevel - 1].score + orderCount * 220;
    score += bonus;
    timeLeft = Math.min(duration, timeLeft + 5);
    orderCount += 1;
    chooseOrder();
    setMessage(`注文達成。+${bonus.toLocaleString()}、時間+5秒。`);
    tone(880, 160, "triangle", 0.07);
  } else {
    setMessage(`${group.length}個を合成して${pieces[newLevel - 1].name}へ。Combo ${combo}`);
    tone(420 + newLevel * 82, 120, "sine", 0.05);
  }

  const dropped = collapse();
  const { refilled, upgradedIndex } = refill(newLevel, originColumn);
  const forced = ensurePlayable();
  marked = [];
  motion.removed = [];
  motion.merged = upgradedIndex;
  motion.dropped = dropped;
  motion.refilled = [...new Set([...refilled, ...forced])];
  render();
  window.setTimeout(clearMotion, 360);
  animating = false;
}

function collapse() {
  const dropped = [];
  for (let x = 0; x < size; x += 1) {
    const stack = [];
    for (let y = size - 1; y >= 0; y -= 1) {
      const source = indexOf(x, y);
      const value = board[source];
      if (value) stack.push({ value, source });
    }
    for (let y = size - 1; y >= 0; y -= 1) {
      const item = stack[size - 1 - y];
      const target = indexOf(x, y);
      board[target] = item?.value || 0;
      if (item && item.source !== target) dropped.push(target);
    }
  }
  return dropped;
}

function refill(upgradedLevel, upgradedColumn) {
  const refilled = [];
  let upgradedIndex = -1;
  for (let x = 0; x < size; x += 1) {
    for (let y = 0; y < size; y += 1) {
      const index = indexOf(x, y);
      if (board[index]) continue;
      if (x === upgradedColumn && upgradedIndex === -1) {
        board[index] = upgradedLevel;
        upgradedIndex = index;
      } else {
        board[index] = randomLevel();
      }
      refilled.push(index);
    }
  }
  return { refilled, upgradedIndex };
}

function applyMotion() {
  [...boardEl.children].forEach((cell, index) => {
    cell.classList.toggle("removing", motion.removed.includes(index));
    cell.classList.toggle("merged", motion.merged === index);
    cell.classList.toggle("dropped", motion.dropped.includes(index));
    cell.classList.toggle("refilled", motion.refilled.includes(index));
  });
}

function clearMotion() {
  motion.merged = -1;
  motion.removed = [];
  motion.dropped = [];
  motion.refilled = [];
  applyMotion();
}

function shuffleBoard() {
  if (animating) return;
  if (!running) {
    startGame();
    return;
  }
  if (shuffles <= 0) {
    setMessage("Shuffleは使い切りました。");
    tone(150, 90, "square", 0.025);
    return;
  }
  shuffles -= 1;
  for (let i = board.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [board[i], board[j]] = [board[j], board[i]];
  }
  ensurePlayable();
  combo = 0;
  marked = [];
  setMessage("盤面を入れ替えました。次の注文を狙いましょう。");
  tone(520, 110, "triangle", 0.035);
  render();
}

function startGame() {
  setupAudio();
  if (audio.state === "suspended") audio.resume();
  score = 0;
  combo = 0;
  bestCombo = 0;
  timeLeft = duration;
  shuffles = 3;
  running = true;
  marked = [];
  fillBoard();
  chooseOrder();
  modal.hidden = true;
  startButton.textContent = "Restart";
  clearMotion();
  setMessage("開店。3つ以上つながった同じスイーツを選んで注文を完成させましょう。");
  clearInterval(timerId);
  startBgm();
  timerId = setInterval(() => {
    timeLeft -= 0.25;
    if (timeLeft <= 0) endGame("閉店時間です");
    updateHud();
  }, 250);
  render();
  window.CollectUGC?.recordPlay?.("stardust-merge-cafe");
}

function endGame(reason) {
  if (!running) return;
  running = false;
  clearInterval(timerId);
  stopBgm();
  setBest(score);
  resultTitle.textContent = reason;
  resultScore.textContent = score.toLocaleString();
  resultChain.textContent = String(bestCombo);
  modal.hidden = false;
  startButton.textContent = "Start";
  tone(220, 180, "sawtooth", 0.035);
  updateHud();
}

startButton.addEventListener("click", startGame);
shuffleButton.addEventListener("click", shuffleBoard);
retryButton.addEventListener("click", startGame);
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
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    if (!running) startGame();
  }
  if (event.key.toLowerCase() === "r") shuffleBoard();
});

fillBoard();
chooseOrder();
bestText.textContent = best().toLocaleString();
render();
