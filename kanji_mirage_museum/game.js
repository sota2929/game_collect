const GAME_ID = "kanji-mirage-museum";
const GAME_DURATION = 60;
const BEST_KEY = "collect.kanjiMirageMuseum.best";

const GROUPS = [
  {
    theme: "横線の長さ",
    items: [
      { char: "未", clue: "上の横線が短い" },
      { char: "末", clue: "上の横線が長い" },
      { char: "朱", clue: "中央に赤い印のような払いがある" },
      { char: "本", clue: "木の下側に短い横線がある" },
      { char: "木", clue: "横線が一本だけある" },
    ],
  },
  {
    theme: "四角い字形",
    items: [
      { char: "日", clue: "縦長で中に横線が一本ある" },
      { char: "曰", clue: "横に広く、口の中に短い線がある" },
      { char: "目", clue: "中の横線が二本ある" },
      { char: "白", clue: "上に小さな払いがある" },
      { char: "旧", clue: "左側に縦の線が付く" },
      { char: "旦", clue: "下に長い一線がある" },
    ],
  },
  {
    theme: "上下の横線",
    items: [
      { char: "土", clue: "下の横線が長い" },
      { char: "士", clue: "上の横線が長い" },
      { char: "干", clue: "縦線が横線をまっすぐ貫く" },
      { char: "王", clue: "横線が三本ある" },
      { char: "工", clue: "上下の横線を縦線がつなぐ" },
    ],
  },
  {
    theme: "閉じ方",
    items: [
      { char: "己", clue: "最後が少し開いている" },
      { char: "已", clue: "途中まで閉じた形になっている" },
      { char: "巳", clue: "ほぼ閉じた形になっている" },
      { char: "巴", clue: "下側が大きく回り込む" },
      { char: "包", clue: "外側に包む形が付く" },
      { char: "色", clue: "上に小さなかぶせがある" },
    ],
  },
  {
    theme: "縦線の出方",
    items: [
      { char: "午", clue: "縦線が上に出ない" },
      { char: "牛", clue: "縦線が上に少し出る" },
      { char: "生", clue: "下に横線が一本増える" },
      { char: "年", clue: "上側に斜めの払いがある" },
      { char: "半", clue: "左右に点のような形がある" },
      { char: "千", clue: "上に短い払いがある" },
    ],
  },
  {
    theme: "点の有無",
    items: [
      { char: "鳥", clue: "中に点がある" },
      { char: "烏", clue: "中の点がない" },
      { char: "鳴", clue: "左に口が付く" },
      { char: "島", clue: "下に山が付く" },
      { char: "馬", clue: "下に四つの点が並ぶ" },
    ],
  },
  {
    theme: "左右の向き",
    items: [
      { char: "右", clue: "ナナメの下に口がある" },
      { char: "左", clue: "ナナメの下に工がある" },
      { char: "石", clue: "上の払いの下に口がある" },
      { char: "后", clue: "上から包むような形がある" },
      { char: "在", clue: "左の下に土がある" },
      { char: "佐", clue: "左に人偏が付く" },
    ],
  },
  {
    theme: "点の位置",
    items: [
      { char: "犬", clue: "右上に点がある" },
      { char: "太", clue: "点が下側にある" },
      { char: "大", clue: "点がない" },
      { char: "天", clue: "上に横線がある" },
      { char: "夫", clue: "上に突き出た線がある" },
      { char: "火", clue: "左右に点のような払いがある" },
    ],
  },
  {
    theme: "払いの方向",
    items: [
      { char: "人", clue: "左払いが長く、右払いが自然に伸びる" },
      { char: "入", clue: "右払いが長く見える" },
      { char: "八", clue: "左右の払いが離れている" },
      { char: "込", clue: "しんにょうが付く" },
      { char: "大", clue: "左右の払いが中央で交わる" },
    ],
  },
];

const ALL_ITEMS = GROUPS.flatMap((group) => group.items);

const $ = (selector) => document.querySelector(selector);
const els = {
  score: $("#scoreText"),
  time: $("#timeText"),
  combo: $("#comboText"),
  round: $("#roundText"),
  phase: $("#phaseText"),
  target: $("#targetText"),
  hint: $("#hintText"),
  grid: $("#cardGrid"),
  start: $("#startButton"),
  sound: $("#soundToggle"),
  modal: $("#resultModal"),
  retry: $("#retryButton"),
  resultScore: $("#resultScore"),
  resultText: $("#resultText"),
  heroKanji: $("#heroKanji"),
};

let state = {
  running: false,
  score: 0,
  time: GAME_DURATION,
  combo: 0,
  round: 1,
  answer: "",
  locked: false,
  timer: null,
  soundOn: true,
};

let audioCtx = null;
let bgmTimer = null;

function ensureAudio() {
  if (!state.soundOn) return null;
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === "suspended") audioCtx.resume();
  return audioCtx;
}

function tone(freq, duration = 0.12, type = "sine", volume = 0.06) {
  const ctx = ensureAudio();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.0001, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(volume, ctx.currentTime + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + duration + 0.03);
}

function startBgm() {
  stopBgm();
  if (!state.soundOn) return;
  const notes = [392, 523, 587, 494, 440, 523];
  let index = 0;
  bgmTimer = window.setInterval(() => {
    tone(notes[index % notes.length], 0.16, "triangle", 0.022);
    index += 1;
  }, 760);
}

function stopBgm() {
  if (bgmTimer) window.clearInterval(bgmTimer);
  bgmTimer = null;
}

function shuffle(items) {
  const array = [...items];
  for (let i = array.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function uniqueByChar(items) {
  const seen = new Set();
  return items.filter((item) => {
    if (seen.has(item.char)) return false;
    seen.add(item.char);
    return true;
  });
}

function sampleDifferent(items, answerChar, count) {
  return uniqueByChar(shuffle(items).filter((item) => item.char !== answerChar)).slice(0, count);
}

function startGame() {
  ensureAudio();
  state.running = true;
  state.score = 0;
  state.time = GAME_DURATION;
  state.combo = 0;
  state.round = 1;
  state.locked = false;
  els.modal.hidden = true;
  els.start.textContent = "Restart";
  window.clearInterval(state.timer);
  state.timer = window.setInterval(tick, 1000);
  startBgm();
  window.CollectUGC?.recordPlay?.(GAME_ID);
  nextRound();
  updateHud();
}

function tick() {
  state.time -= 1;
  updateHud();
  if (state.time <= 0) finishGame();
}

function finishGame() {
  state.running = false;
  window.clearInterval(state.timer);
  stopBgm();
  const best = Math.max(Number(localStorage.getItem(BEST_KEY) || 0), state.score);
  localStorage.setItem(BEST_KEY, String(best));
  els.resultScore.textContent = `${state.score}点`;
  els.resultText.textContent = `ベスト ${best}点 / ${Math.max(1, state.round - 1)}問鑑定`;
  els.modal.hidden = false;
  tone(196, 0.22, "triangle", 0.05);
}

function nextRound() {
  state.locked = false;
  const group = GROUPS[Math.floor(Math.random() * GROUPS.length)];
  const answer = group.items[Math.floor(Math.random() * group.items.length)];
  const size = Math.min(9 + Math.floor(state.round / 3) * 3, 18, ALL_ITEMS.length);
  const nearDecoys = sampleDifferent(group.items, answer.char, Math.min(group.items.length - 1, 5));
  const wideDecoys = sampleDifferent(ALL_ITEMS, answer.char, size - 1);
  const cards = shuffle(uniqueByChar([answer, ...nearDecoys, ...wideDecoys]).slice(0, size));
  state.answer = answer.char;
  els.target.textContent = answer.char;
  els.heroKanji.textContent = answer.char;
  els.hint.textContent = "同じように見える文字の中から、お題と完全に同じ漢字を選びます。";
  els.phase.textContent = "Appraise";
  els.grid.innerHTML = cards
    .map((item) => `<button class="kanji-card" type="button" data-char="${item.char}" aria-label="${item.char} の鑑定カード">${item.char}</button>`)
    .join("");
  els.grid.querySelectorAll(".kanji-card").forEach((button) => {
    button.addEventListener("click", () => judge(button));
  });
  updateHud();
}

function judge(button) {
  if (!state.running || state.locked) return;
  const char = button.dataset.char;
  if (char === state.answer) {
    state.locked = true;
    state.combo += 1;
    state.score += 100 + state.combo * 12 + Math.max(0, state.time);
    state.round += 1;
    button.classList.add("correct");
    els.phase.textContent = "Correct";
    tone(640 + Math.min(state.combo, 10) * 24, 0.12, "sine", 0.07);
    updateHud();
    window.setTimeout(() => {
      if (state.running) nextRound();
    }, 360);
    return;
  }
  state.combo = 0;
  state.time = Math.max(0, state.time - 2);
  button.classList.remove("wrong");
  void button.offsetWidth;
  button.classList.add("wrong");
  els.phase.textContent = "Miss";
  tone(180, 0.13, "sawtooth", 0.04);
  updateHud();
  if (state.time <= 0) finishGame();
}

function updateHud() {
  els.score.textContent = state.score;
  els.time.textContent = Math.max(0, state.time);
  els.combo.textContent = state.combo;
  els.round.textContent = state.round;
}

els.start.addEventListener("click", startGame);
els.retry.addEventListener("click", startGame);
els.sound.addEventListener("click", () => {
  state.soundOn = !state.soundOn;
  els.sound.textContent = state.soundOn ? "Sound On" : "Sound Off";
  els.sound.setAttribute("aria-pressed", String(state.soundOn));
  if (state.soundOn && state.running) {
    startBgm();
    tone(523, 0.1, "sine", 0.05);
  } else {
    stopBgm();
  }
});

window.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !state.running) startGame();
  if (event.key.toLowerCase() === "r") startGame();
});

nextRound();

function handlePageAudioStop() {
  stopBgm();
}

document.addEventListener("visibilitychange", () => {
  if (document.hidden) handlePageAudioStop();
});
window.addEventListener("pagehide", handlePageAudioStop);
window.addEventListener("beforeunload", handlePageAudioStop);
