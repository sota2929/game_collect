const GAME_ID = "midnight-typing-proof";
const GAME_DURATION = 60;
const BEST_KEY = "collect.midnightTypingProof.best";

const WORDS = [
  { word: "kousei", kana: "校正" },
  { word: "genkou", kana: "原稿" },
  { word: "akapen", kana: "赤ペン" },
  { word: "shimekiri", kana: "締切" },
  { word: "goji", kana: "誤字" },
  { word: "henshu", kana: "編集" },
  { word: "kouetsu", kana: "校閲" },
  { word: "insatsu", kana: "印刷" },
  { word: "mihon", kana: "見本" },
  { word: "fusen", kana: "付箋" },
  { word: "midashi", kana: "見出し" },
  { word: "kaitei", kana: "改訂" },
  { word: "rubii", kana: "ルビ" },
  { word: "note", kana: "ノート" },
  { word: "yakan", kana: "夜間" },
  { word: "check", kana: "チェック" },
  { word: "draft", kana: "下書き" },
  { word: "koumoku", kana: "項目" },
  { word: "shuppan", kana: "出版" },
  { word: "tegaki", kana: "手書き" },
  { word: "sashikae", kana: "差替" },
  { word: "yomikomi", kana: "読み込み" },
  { word: "tachiawase", kana: "突き合わせ" },
  { word: "nihongo", kana: "日本語" }
];

const $ = (selector) => document.querySelector(selector);

const els = {
  startButton: $("#startButton"),
  retryButton: $("#retryButton"),
  soundToggle: $("#soundToggle"),
  score: $("#score"),
  time: $("#time"),
  combo: $("#combo"),
  best: $("#best"),
  targetLayer: $("#targetLayer"),
  activeWord: $("#activeWord"),
  activeKana: $("#activeKana"),
  dangerLabel: $("#dangerLabel"),
  typingInput: $("#typingInput"),
  resultModal: $("#resultModal"),
  resultScore: $("#resultScore"),
  resultText: $("#resultText"),
  paperStage: $(".paper-stage")
};

let state = createState();
let audioCtx = null;
let soundEnabled = true;
let bgmTimer = 0;
let frameId = 0;
let spawnTimer = 0;
let secondTimer = 0;

function createState() {
  return {
    running: false,
    score: 0,
    time: GAME_DURATION,
    combo: 0,
    best: Number(localStorage.getItem(BEST_KEY) || 0),
    targets: [],
    activeId: null,
    nextId: 1,
    lastSpawn: 0,
    startedAt: 0
  };
}

function rand(min, max) {
  return Math.random() * (max - min) + min;
}

function pickWord() {
  const elapsed = GAME_DURATION - state.time;
  const pool = elapsed < 18
    ? WORDS.filter((item) => item.word.length <= 6)
    : elapsed < 40
      ? WORDS.filter((item) => item.word.length <= 8)
      : WORDS;
  return pool[Math.floor(Math.random() * pool.length)];
}

function lanePositions() {
  const width = els.targetLayer.clientWidth || 900;
  if (width < 520) return [3, 60];
  if (width < 760) return [5, 35, 65];
  return [3, 28, 53, 76];
}

function chooseLane() {
  const now = performance.now();
  const lanes = lanePositions();
  const crowded = new Set(
    state.targets
      .filter((target) => (now - target.bornAt) / target.life < 0.34)
      .map((target) => target.lane)
  );
  const open = lanes.map((_, lane) => lane).filter((lane) => !crowded.has(lane));
  if (open.length) return open[Math.floor(Math.random() * open.length)];

  return lanes
    .map((_, lane) => ({
      lane,
      count: state.targets.filter((target) => target.lane === lane).length,
      newest: Math.max(0, ...state.targets.filter((target) => target.lane === lane).map((target) => target.bornAt))
    }))
    .sort((a, b) => a.count - b.count || a.newest - b.newest)[0].lane;
}

function ensureAudio() {
  if (!soundEnabled) return null;
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }
  return audioCtx;
}

function tone(freq, duration = 0.08, type = "sine", volume = 0.06) {
  const ctx = ensureAudio();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, ctx.currentTime);
  gain.gain.setValueAtTime(0.0001, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(volume, ctx.currentTime + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + duration + 0.02);
}

function startBgm() {
  stopBgm();
  if (!soundEnabled) return;
  let step = 0;
  bgmTimer = window.setInterval(() => {
    const notes = [196, 247, 220, 294, 247, 196, 174, 220];
    tone(notes[step % notes.length], 0.11, step % 4 === 0 ? "triangle" : "sine", 0.022);
    if (step % 2 === 0) tone(98, 0.05, "square", 0.012);
    step += 1;
  }, 420);
}

function stopBgm() {
  if (bgmTimer) {
    clearInterval(bgmTimer);
    bgmTimer = 0;
  }
}

function spawnTarget() {
  const item = pickWord();
  const elapsed = GAME_DURATION - state.time;
  const life = Math.max(7200, rand(12800, 15400) - elapsed * 70);
  const lanes = lanePositions();
  const lane = chooseLane();
  const target = {
    id: state.nextId++,
    word: item.word,
    kana: item.kana,
    progress: 0,
    lane,
    x: lanes[lane] + rand(-1.2, 1.2),
    bornAt: performance.now(),
    life,
    tilt: rand(-2.4, 2.4),
    danger: false
  };
  state.targets.push(target);
  if (!state.activeId) state.activeId = target.id;
}

function setActive(id) {
  if (!state.running) return;
  state.activeId = id;
  render();
}

function getActiveTarget() {
  let active = state.targets.find((target) => target.id === state.activeId);
  if (!active && state.targets.length) {
    active = [...state.targets].sort((a, b) => urgency(b) - urgency(a))[0];
    state.activeId = active.id;
  }
  return active;
}

function urgency(target) {
  return (performance.now() - target.bornAt) / target.life;
}

function startGame() {
  clearTimers();
  state = createState();
  state.running = true;
  state.startedAt = performance.now();
  els.resultModal.hidden = true;
  els.typingInput.value = "";
  els.typingInput.focus({ preventScroll: true });
  window.CollectUGC?.recordPlay?.(GAME_ID);
  spawnTarget();
  updateHud();
  render();
  startBgm();
  spawnTimer = window.setInterval(() => {
    if (!state.running) return;
    const maxTargets = lanePositions().length <= 2 ? 2 : state.time > 30 ? 4 : 6;
    if (state.targets.length < maxTargets) spawnTarget();
  }, 1340);
  secondTimer = window.setInterval(() => {
    if (!state.running) return;
    state.time -= 1;
    if (state.time <= 0) endGame();
    updateHud();
  }, 1000);
  loop();
}

function endGame() {
  state.running = false;
  clearTimers();
  stopBgm();
  state.time = Math.max(0, state.time);
  if (state.score > state.best) {
    state.best = state.score;
    localStorage.setItem(BEST_KEY, String(state.best));
  }
  updateHud();
  els.resultScore.textContent = `${state.score}点`;
  els.resultText.textContent = state.score >= 1800
    ? "校了です。深夜の原稿はきれいに眠りました。"
    : state.score >= 950
      ? "かなり整いました。あと少しで赤字の幽霊を封じ込められそうです。"
      : "まだ誤字がざわついています。次は近い札から処理してみましょう。";
  els.resultModal.hidden = false;
}

function clearTimers() {
  clearInterval(spawnTimer);
  clearInterval(secondTimer);
  cancelAnimationFrame(frameId);
  spawnTimer = 0;
  secondTimer = 0;
  frameId = 0;
}

function loop() {
  if (!state.running) return;
  const now = performance.now();
  const expired = [];
  for (const target of state.targets) {
    const ratio = (now - target.bornAt) / target.life;
    target.danger = ratio > 0.78;
    if (ratio >= 1) expired.push(target.id);
  }
  if (expired.length) {
    state.targets = state.targets.filter((target) => !expired.includes(target.id));
    state.combo = 0;
    state.time = Math.max(0, state.time - expired.length * 2);
    state.activeId = null;
    tone(120, 0.14, "sawtooth", 0.06);
    if (state.time <= 0) {
      endGame();
      return;
    }
  }
  render();
  updateHud();
  frameId = requestAnimationFrame(loop);
}

function processChar(char) {
  if (!state.running) return;
  const key = char.toLowerCase();
  if (!/^[a-z]$/.test(key)) return;
  const active = getActiveTarget();
  if (!active) return;
  const expected = active.word[active.progress];
  if (key === expected) {
    active.progress += 1;
    state.score += 4 + Math.min(state.combo, 18);
    tone(520 + active.progress * 28, 0.045, "triangle", 0.035);
    if (active.progress >= active.word.length) {
      completeTarget(active);
    }
  } else {
    state.combo = 0;
    state.time = Math.max(0, state.time - 1);
    tone(150, 0.11, "square", 0.045);
    if (state.time <= 0) endGame();
  }
  updateHud();
  render();
}

function completeTarget(target) {
  const rect = els.paperStage.getBoundingClientRect();
  const bonus = target.word.length * 14 + state.combo * 5;
  state.score += bonus;
  state.combo += 1;
  state.targets = state.targets.filter((item) => item.id !== target.id);
  state.activeId = null;
  popText(rect.left + rect.width * (target.x / 100 + 0.12), rect.top + rect.height * 0.45, `校了 +${bonus}`);
  tone(740, 0.07, "triangle", 0.05);
  setTimeout(() => tone(960, 0.08, "triangle", 0.04), 65);
  if (state.targets.length < 2) spawnTarget();
}

function popText(x, y, text) {
  const pop = document.createElement("div");
  pop.className = "ink-pop";
  pop.textContent = text;
  pop.style.left = `${x}px`;
  pop.style.top = `${y}px`;
  document.body.append(pop);
  setTimeout(() => pop.remove(), 850);
}

function updateHud() {
  els.score.textContent = state.score;
  els.time.textContent = state.time;
  els.combo.textContent = state.combo;
  els.best.textContent = Math.max(state.best, state.score);
  const dangerCount = state.targets.filter((target) => target.danger).length;
  els.dangerLabel.textContent = dangerCount ? `締切間近 ${dangerCount}件` : state.running ? "誤字検出中" : "静かな原稿";
}

function render() {
  const now = performance.now();
  const active = getActiveTarget();
  els.targetLayer.innerHTML = "";
  for (const target of state.targets) {
    const ratio = Math.min(1, (now - target.bornAt) / target.life);
    const y = 8 + ratio * 78;
    const button = document.createElement("button");
    button.type = "button";
    button.className = `typo-card${target.id === state.activeId ? " active" : ""}${target.danger ? " danger" : ""}`;
    button.style.setProperty("--x", `${target.x}%`);
    button.style.setProperty("--y", `${y}%`);
    button.style.setProperty("--tilt", `${target.tilt}deg`);
    button.setAttribute("aria-label", `${target.kana} ${target.word}`);
    const typed = target.word.slice(0, target.progress);
    const rest = target.word.slice(target.progress);
    button.innerHTML = `<span class="typo-kana">${target.kana}</span><span class="typo-word"><span class="typed">${typed}</span>${rest}</span>`;
    button.addEventListener("click", () => setActive(target.id));
    els.targetLayer.append(button);
  }
  if (active) {
    els.activeWord.innerHTML = `<span class="typed">${active.word.slice(0, active.progress)}</span>${active.word.slice(active.progress)}`;
    els.activeKana.textContent = `${active.kana} を入力中`;
  } else {
    els.activeWord.textContent = "---";
    els.activeKana.textContent = state.running ? "次の誤字を待っています。" : "Enterまたは校正開始でスタートします。";
  }
}

function handleKeyboard(event) {
  if (event.key === "Enter" && !state.running) {
    event.preventDefault();
    startGame();
    return;
  }
  if (!state.running) return;
  if (event.target === els.typingInput) return;
  if (event.key.length === 1) {
    processChar(event.key);
  }
}

function handleMobileInput(event) {
  const value = event.target.value;
  for (const char of value) {
    processChar(char);
  }
  event.target.value = "";
}

els.startButton.addEventListener("click", startGame);
els.retryButton.addEventListener("click", startGame);
els.soundToggle.addEventListener("click", () => {
  soundEnabled = !soundEnabled;
  els.soundToggle.textContent = soundEnabled ? "Sound ON" : "Sound OFF";
  els.soundToggle.setAttribute("aria-pressed", String(soundEnabled));
  if (soundEnabled && state.running) startBgm();
  if (!soundEnabled) stopBgm();
});
document.addEventListener("keydown", handleKeyboard);
els.typingInput.addEventListener("input", handleMobileInput);

updateHud();
render();

function handlePageAudioStop() {
  stopBgm();
}

document.addEventListener("visibilitychange", () => {
  if (document.hidden) handlePageAudioStop();
});
window.addEventListener("pagehide", handlePageAudioStop);
window.addEventListener("beforeunload", handlePageAudioStop);
