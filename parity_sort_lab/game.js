const numberRow = document.querySelector("#numberRow");
const answerRow = document.querySelector("#answerRow");
const stageText = document.querySelector("#stageText");
const timeText = document.querySelector("#timeText");
const comboText = document.querySelector("#comboText");
const bestText = document.querySelector("#bestText");
const ruleText = document.querySelector("#ruleText");
const nextText = document.querySelector("#nextText");
const missText = document.querySelector("#missText");
const messageEl = document.querySelector("#message");
const startButton = document.querySelector("#startButton");
const undoButton = document.querySelector("#undoButton");
const hintButton = document.querySelector("#hintButton");
const soundToggle = document.querySelector("#soundToggle");
const modal = document.querySelector("#resultModal");
const resultTitle = document.querySelector("#resultTitle");
const resultTime = document.querySelector("#resultTime");
const resultMiss = document.querySelector("#resultMiss");
const retryButton = document.querySelector("#retryButton");

const totalStages = 8;
const storageKey = "paritySortLab.best.v1";
const levelPlan = [5, 5, 6, 6, 7, 7, 8, 9];

let digits = [];
let target = [];
let chosen = [];
let stage = 1;
let combo = 0;
let misses = 0;
let startTime = 0;
let timer = null;
let playing = false;
let soundOn = true;
let audio = null;
let musicTimer = null;

function makeAudio() {
  if (!audio) audio = new AudioContext();
  return audio;
}

function tone(freq, length = 0.07, type = "sine", gain = 0.06) {
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
  const notes = [262, 330, 392, 523, 392, 330];
  let step = 0;
  musicTimer = setInterval(() => {
    if (!playing || !soundOn) return;
    tone(notes[step % notes.length], 0.055, "triangle", 0.018);
    step += 1;
  }, 480);
}

function stopMusic() {
  clearInterval(musicTimer);
  musicTimer = null;
}

function formatTime(ms) {
  return (ms / 1000).toFixed(2);
}

function randomDigit() {
  return Math.floor(Math.random() * 9) + 1;
}

function makeDigits(length) {
  const values = Array.from({ length }, () => randomDigit());
  const odds = values.filter((value) => value % 2 === 1);
  const evens = values.filter((value) => value % 2 === 0);
  if (odds.length === 0 || evens.length === 0) return values;
  if (odds.length === evens.length && length % 2 === 0) return values;
  return values;
}

function solve(values) {
  const odds = values.filter((value) => value % 2 === 1).sort((a, b) => a - b);
  const evens = values.filter((value) => value % 2 === 0).sort((a, b) => a - b);
  if (!odds.length) return [...evens].sort((a, b) => b - a);
  if (!evens.length) return odds;
  return odds.length <= evens.length ? [...odds, ...evens] : [...evens, ...odds];
}

function describeRule(values) {
  const oddCount = values.filter((value) => value % 2 === 1).length;
  const evenCount = values.length - oddCount;
  if (oddCount === values.length) return "全部奇数: 昇順";
  if (evenCount === values.length) return "全部偶数: 降順";
  if (oddCount === evenCount) return "同数: 奇数から昇順";
  return oddCount < evenCount ? "奇数が少ない: 奇数から昇順" : "偶数が少ない: 偶数から昇順";
}

function newStage() {
  const length = levelPlan[stage - 1] || 9;
  digits = makeDigits(length).map((value, index) => ({ value, id: `${Date.now()}-${index}-${Math.random()}`, used: false }));
  target = solve(digits.map((digit) => digit.value));
  chosen = [];
  ruleText.textContent = describeRule(digits.map((digit) => digit.value));
  message(stage === 1 ? "少ないグループから順番にクリック" : "次の仕分け実験です", "good");
  render();
}

function startGame() {
  stage = 1;
  combo = 0;
  misses = 0;
  startTime = performance.now();
  playing = true;
  modal.hidden = true;
  startButton.textContent = "Restart";
  clearInterval(timer);
  timer = setInterval(updateHud, 60);
  startMusic();
  newStage();
}

function endGame() {
  playing = false;
  clearInterval(timer);
  stopMusic();
  const elapsed = performance.now() - startTime;
  const penalty = misses * 1200;
  const finalTime = elapsed + penalty;
  const currentBest = Number(localStorage.getItem(storageKey)) || 0;
  const best = currentBest ? Math.min(currentBest, finalTime) : finalTime;
  localStorage.setItem(storageKey, String(best));
  resultTitle.textContent = finalTime === best ? "Best Clear" : "Clear";
  resultTime.textContent = `${formatTime(finalTime)}秒`;
  resultMiss.textContent = misses;
  modal.hidden = false;
  updateHud();
  tone(784, 0.16, "triangle", 0.07);
}

function updateHud() {
  const elapsed = playing ? performance.now() - startTime : 0;
  const best = Number(localStorage.getItem(storageKey)) || 0;
  stageText.textContent = `${stage} / ${totalStages}`;
  timeText.textContent = formatTime(elapsed);
  comboText.textContent = combo;
  missText.textContent = misses;
  bestText.textContent = best ? formatTime(best) : "--.--";
  nextText.textContent = chosen.length >= target.length ? "Clear" : `${chosen.length + 1} / ${target.length}`;
}

function message(text, kind = "") {
  messageEl.textContent = text;
  messageEl.className = `message ${kind}`.trim();
}

function render() {
  numberRow.replaceChildren();
  digits.forEach((digit) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `digit-card ${digit.value % 2 ? "odd" : "even"}`;
    button.textContent = digit.value;
    button.dataset.id = digit.id;
    button.setAttribute("aria-label", `${digit.value}の数字カード`);
    if (digit.used) button.classList.add("used");
    numberRow.append(button);
  });

  answerRow.replaceChildren();
  chosen.forEach((value) => {
    const chip = document.createElement("span");
    chip.className = "answer-chip";
    chip.textContent = value;
    answerRow.append(chip);
  });
  updateHud();
}

function chooseDigit(id) {
  if (!playing) startGame();
  const digit = digits.find((item) => item.id === id);
  if (!digit || digit.used) return;
  const expected = target[chosen.length];
  if (digit.value !== expected) {
    misses += 1;
    combo = 0;
    message(`次は ${expected} です`, "bad");
    tone(120, 0.09, "sawtooth", 0.05);
    document.querySelector(`[data-id="${digit.id}"]`)?.classList.add("wrong");
    updateHud();
    return;
  }

  digit.used = true;
  chosen.push(digit.value);
  combo += 1;
  tone(520 + combo * 24, 0.045, "sine", 0.04);
  if (chosen.length === target.length) {
    message(`Stage ${stage} Clear`, "good");
    tone(880, 0.08, "triangle", 0.06);
    if (stage >= totalStages) {
      setTimeout(endGame, 260);
    } else {
      stage += 1;
      setTimeout(newStage, 300);
    }
  } else {
    message(combo >= 5 ? "いいテンポです" : "その調子で次へ", "good");
  }
  render();
}

function undo() {
  if (!playing || !chosen.length) return;
  const last = chosen.pop();
  const used = [...digits].reverse().find((digit) => digit.used && digit.value === last);
  if (used) used.used = false;
  combo = Math.max(0, combo - 1);
  message("1つ戻しました");
  tone(260, 0.05, "triangle", 0.035);
  render();
}

function hint() {
  if (!playing) startGame();
  document.querySelectorAll(".digit-card").forEach((card) => card.classList.remove("hint"));
  const expected = target[chosen.length];
  const next = digits.find((digit) => !digit.used && digit.value === expected);
  if (next) {
    document.querySelector(`[data-id="${next.id}"]`)?.classList.add("hint");
    message(`次は ${expected} を選びます`, "good");
    tone(988, 0.08, "sine", 0.045);
  }
}

numberRow.addEventListener("click", (event) => {
  const card = event.target.closest(".digit-card");
  if (!card) return;
  chooseDigit(card.dataset.id);
});

startButton.addEventListener("click", startGame);
retryButton.addEventListener("click", startGame);
undoButton.addEventListener("click", undo);
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

newStage();
playing = false;
clearInterval(timer);
updateHud();
