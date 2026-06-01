const GAME_ID = "lost-call-switchboard";
const GAME_DURATION = 70;
const BEST_KEY = "collect.lostCallSwitchboard.best";

const CALLS = [
  { id: "coffee", caller: "一番街の常連さん", clue: "豆を挽く音がする店へ", receiver: "喫茶 月波" },
  { id: "station", caller: "改札前の駅員", clue: "終電の忘れ物を預かる場所へ", receiver: "中央駅 忘れ物係" },
  { id: "library", caller: "静かな読書家", clue: "返却期限を聞ける場所へ", receiver: "灯台図書館" },
  { id: "flower", caller: "雨宿りの配達員", clue: "花束の宛先を知る店へ", receiver: "花屋 すみれ堂" },
  { id: "cinema", caller: "映写室の助手", clue: "今夜の上映時間を聞く場所へ", receiver: "銀幕座" },
  { id: "bakery", caller: "朝の料理番", clue: "焼きたての角食を頼む店へ", receiver: "パン工房 麦笛" },
  { id: "clinic", caller: "眠れない患者", clue: "夜間の診察を受け付ける場所へ", receiver: "星見診療所" },
  { id: "taxi", caller: "雨の停留所", clue: "黄色い車を呼べる交換先へ", receiver: "夕凪タクシー" },
  { id: "theater", caller: "幕間の役者", clue: "開演ベルの鳴る舞台へ", receiver: "白鳩劇場" },
  { id: "laundry", caller: "濡れたコートの持ち主", clue: "仕上がり札を確認する店へ", receiver: "洗濯室しらゆり" },
  { id: "clock", caller: "時報を待つ技師", clue: "止まった針を直す工房へ", receiver: "時計屋 ときわ" },
  { id: "post", caller: "赤いポストの係員", clue: "速達の集荷時刻を知る場所へ", receiver: "北町郵便局" },
  { id: "record", caller: "古い盤を抱えた客", clue: "針を落として曲を探す店へ", receiver: "レコード草原" },
  { id: "photo", caller: "証明写真の学生", clue: "現像液の匂いがする店へ", receiver: "写真館カガミ" },
  { id: "tailor", caller: "袖丈を測る紳士", clue: "採寸台のある店へ", receiver: "洋裁室つばめ" },
  { id: "book", caller: "しおりを落とした人", clue: "古書の値段を聞く店へ", receiver: "古本 木犀堂" },
  { id: "ramen", caller: "湯気の向こうの客", clue: "麺の硬さを伝える店へ", receiver: "中華そば三日月" },
  { id: "watch", caller: "腕時計をなくした人", clue: "ガラスケースの番号を聞く店へ", receiver: "質店ミドリ" },
];

const $ = (selector) => document.querySelector(selector);
const els = {
  score: $("#scoreText"),
  time: $("#timeText"),
  round: $("#roundText"),
  lines: $("#lineText"),
  phase: $("#phaseText"),
  hint: $("#hintText"),
  callers: $("#callerList"),
  receivers: $("#receiverList"),
  board: $("#switchboard"),
  cords: $("#cordLayer"),
  start: $("#startButton"),
  sound: $("#soundToggle"),
  modal: $("#resultModal"),
  retry: $("#retryButton"),
  resultScore: $("#resultScore"),
  resultText: $("#resultText"),
  heroStatus: $("#heroStatus"),
};

let state = {
  running: false,
  score: 0,
  time: GAME_DURATION,
  round: 1,
  selected: null,
  pairs: [],
  solved: [],
  timer: null,
  locked: false,
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

function tone(freq, duration = 0.12, type = "sine", volume = 0.05) {
  const ctx = ensureAudio();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.0001, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(volume, ctx.currentTime + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + duration + 0.03);
}

function startBgm() {
  stopBgm();
  if (!state.soundOn) return;
  const notes = [196, 247, 294, 220, 262, 330];
  let index = 0;
  bgmTimer = window.setInterval(() => {
    tone(notes[index % notes.length], 0.14, "sine", 0.018);
    index += 1;
  }, 820);
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

function startGame() {
  ensureAudio();
  state.running = true;
  state.score = 0;
  state.time = GAME_DURATION;
  state.round = 1;
  state.selected = null;
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

function nextRound() {
  const count = Math.min(3 + Math.floor((state.round - 1) / 2), 6);
  state.pairs = shuffle(CALLS).slice(0, count);
  state.solved = [];
  state.selected = null;
  state.locked = false;
  els.phase.textContent = "Connect";
  els.heroStatus.textContent = `${count}回線`;
  els.hint.textContent = "左の依頼を選び、対応する右の相手へコードをつないでください。";
  renderBoard();
  updateHud();
  window.requestAnimationFrame(drawCords);
}

function renderBoard() {
  const callers = shuffle(state.pairs);
  const receivers = shuffle(state.pairs);
  els.callers.innerHTML = callers.map((call) => buttonTemplate("caller", call.id, call.caller, call.clue)).join("");
  els.receivers.innerHTML = receivers.map((call) => buttonTemplate("receiver", call.id, call.receiver, "ここにつなぐ")).join("");
  els.board.querySelectorAll(".plug-card").forEach((button) => {
    button.addEventListener("click", () => handlePlug(button));
  });
  drawCords();
}

function buttonTemplate(type, id, title, sub) {
  return `<button class="plug-card" type="button" data-type="${type}" data-id="${id}" aria-label="${title} ${sub}"><strong>${title}</strong><span>${sub}</span></button>`;
}

function handlePlug(button) {
  if (!state.running || state.locked || button.classList.contains("done")) return;
  const type = button.dataset.type;
  const id = button.dataset.id;

  if (type === "caller") {
    state.selected = id;
    markSelection(id);
    const call = state.pairs.find((item) => item.id === id);
    els.hint.textContent = call ? call.clue : "つなぐ相手を選んでください。";
    tone(440, 0.08, "triangle", 0.045);
    return;
  }

  if (!state.selected) {
    button.classList.add("wrong");
    setTimeout(() => button.classList.remove("wrong"), 260);
    els.hint.textContent = "先に左の迷子電話を選んでください。";
    tone(140, 0.12, "sawtooth", 0.035);
    return;
  }

  if (state.selected === id) {
    connectLine(id);
    return;
  }

  wrongLine(button);
}

function markSelection(id) {
  els.board.querySelectorAll(".plug-card").forEach((button) => {
    button.classList.toggle("selected", button.dataset.type === "caller" && button.dataset.id === id);
  });
}

function connectLine(id) {
  const call = state.pairs.find((item) => item.id === id);
  state.solved.push(id);
  state.selected = null;
  state.score += 90 + state.round * 8 + Math.max(0, state.time);
  els.hint.textContent = call ? `${call.receiver}へつながりました。` : "回線がつながりました。";
  els.phase.textContent = "Connected";
  tone(620, 0.09, "sine", 0.06);
  tone(780, 0.12, "triangle", 0.04);
  els.board.querySelectorAll(`.plug-card[data-id="${id}"]`).forEach((button) => {
    button.classList.add("done");
    button.classList.remove("selected");
  });
  drawCords();
  updateHud();

  if (state.solved.length === state.pairs.length) {
    state.locked = true;
    state.round += 1;
    state.time = Math.min(90, state.time + 2);
    els.phase.textContent = "All Clear";
    els.heroStatus.textContent = "交換成功";
    setTimeout(() => {
      if (state.running) nextRound();
    }, 680);
  }
}

function wrongLine(button) {
  state.time = Math.max(0, state.time - 3);
  state.selected = null;
  els.board.querySelectorAll(".plug-card").forEach((item) => item.classList.remove("selected"));
  button.classList.add("wrong");
  setTimeout(() => button.classList.remove("wrong"), 260);
  els.hint.textContent = "回線が混線しました。ヒントを読み直しましょう。";
  els.phase.textContent = "Crossed";
  tone(120, 0.16, "sawtooth", 0.04);
  updateHud();
  if (state.time <= 0) finishGame();
}

function drawCords() {
  const boardRect = els.board.getBoundingClientRect();
  els.cords.setAttribute("viewBox", `0 0 ${boardRect.width} ${boardRect.height}`);
  els.cords.innerHTML = state.solved.map((id, index) => {
    const caller = els.board.querySelector(`.plug-card[data-type="caller"][data-id="${id}"]`);
    const receiver = els.board.querySelector(`.plug-card[data-type="receiver"][data-id="${id}"]`);
    if (!caller || !receiver) return "";
    const a = plugPoint(caller, boardRect, "right");
    const b = plugPoint(receiver, boardRect, "left");
    const sag = 28 + index * 6;
    const mid = (a.x + b.x) / 2;
    return `<path d="M ${a.x} ${a.y} C ${mid} ${a.y + sag}, ${mid} ${b.y + sag}, ${b.x} ${b.y}" />`;
  }).join("");
}

function plugPoint(el, boardRect, side) {
  const rect = el.getBoundingClientRect();
  return {
    x: side === "right" ? rect.right - boardRect.left - 8 : rect.left - boardRect.left + 8,
    y: rect.top - boardRect.top + rect.height / 2,
  };
}

function finishGame() {
  state.running = false;
  window.clearInterval(state.timer);
  stopBgm();
  const best = Math.max(Number(localStorage.getItem(BEST_KEY) || 0), state.score);
  localStorage.setItem(BEST_KEY, String(best));
  els.resultScore.textContent = `${state.score}点`;
  els.resultText.textContent = `ベスト ${best}点 / ${Math.max(1, state.round - 1)}台交換`;
  els.modal.hidden = false;
  els.heroStatus.textContent = "閉局";
  tone(180, 0.2, "triangle", 0.05);
}

function updateHud() {
  els.score.textContent = state.score;
  els.time.textContent = Math.max(0, state.time);
  els.round.textContent = state.round;
  els.lines.textContent = `${state.solved.length} / ${state.pairs.length || 0}`;
}

els.start.addEventListener("click", startGame);
els.retry.addEventListener("click", startGame);
els.sound.addEventListener("click", () => {
  state.soundOn = !state.soundOn;
  els.sound.textContent = state.soundOn ? "Sound On" : "Sound Off";
  els.sound.setAttribute("aria-pressed", String(state.soundOn));
  if (state.soundOn && state.running) {
    startBgm();
    tone(440, 0.08, "sine", 0.045);
  } else {
    stopBgm();
  }
});

window.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !state.running) startGame();
  if (event.key.toLowerCase() === "r") startGame();
});
window.addEventListener("resize", drawCords);

nextRound();
