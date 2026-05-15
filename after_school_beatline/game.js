const lanesEl = document.querySelector("#lanes");
const laneEls = [...document.querySelectorAll(".lane")];
const padButtons = [...document.querySelectorAll("[data-pad]")];
const levelButtons = [...document.querySelectorAll("[data-level]")];
const scoreText = document.querySelector("#scoreText");
const comboText = document.querySelector("#comboText");
const timeText = document.querySelector("#timeText");
const bestText = document.querySelector("#bestText");
const judgeText = document.querySelector("#judgeText");
const levelText = document.querySelector("#levelText");
const lifeText = document.querySelector("#lifeText");
const messageEl = document.querySelector("#message");
const startButton = document.querySelector("#startButton");
const practiceButton = document.querySelector("#practiceButton");
const soundToggle = document.querySelector("#soundToggle");
const modal = document.querySelector("#resultModal");
const resultTitle = document.querySelector("#resultTitle");
const resultScore = document.querySelector("#resultScore");
const resultLevel = document.querySelector("#resultAccuracy");
const retryButton = document.querySelector("#retryButton");

const duration = 45;
const maxLife = 3;
const storageKey = "afterSchoolBeatline.best.v2";
const laneKeys = ["a", "s", "d", "f", "j", "k", "l", ";"];
const keys = Object.fromEntries(laneKeys.map((key, index) => [key, index]));
const levels = {
  1: { travel: 1780, interval: 620, label: "Lv.1" },
  2: { travel: 1540, interval: 550, label: "Lv.2" },
  3: { travel: 1320, interval: 490, label: "Lv.3" },
  4: { travel: 1120, interval: 430, label: "Lv.4" },
  5: { travel: 940, interval: 380, label: "Lv.5" },
};

let notes = [];
let startAt = 0;
let score = 0;
let combo = 0;
let hitCount = 0;
let missCount = 0;
let totalJudge = 0;
let accuracyPoints = 0;
let life = maxLife;
let running = false;
let raf = 0;
let soundOn = true;
let audio = null;
let beatTimer = null;
let practiceMode = false;
let currentLevel = 1;

function makeAudio() {
  if (!audio) audio = new AudioContext();
  return audio;
}

function tone(freq, length = 0.06, type = "sine", gain = 0.055) {
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

function startBeat() {
  if (!soundOn || beatTimer) return;
  const bass = [196, 196, 247, 220, 196, 262, 247, 220];
  let step = 0;
  beatTimer = setInterval(() => {
    if (!running || !soundOn) return;
    tone(bass[step % bass.length], 0.055, "square", 0.02);
    if (step % 4 === 0) tone(392, 0.035, "triangle", 0.014);
    step += 1;
  }, 260);
}

function stopBeat() {
  clearInterval(beatTimer);
  beatTimer = null;
}

function randomInt(max) {
  return Math.floor(Math.random() * max);
}

function pickLane(previous, recent) {
  const candidates = Array.from({ length: 8 }, (_, lane) => lane)
    .filter((lane) => lane !== previous)
    .sort((a, b) => {
      const aPenalty = recent.filter((lane) => lane === a).length;
      const bPenalty = recent.filter((lane) => lane === b).length;
      return aPenalty - bPenalty || Math.random() - 0.5;
    });
  return candidates[0] ?? randomInt(8);
}

function pickChord(firstLane, level, recent) {
  const minDistance = level >= 4 ? 1 : 2;
  const candidates = Array.from({ length: 8 }, (_, lane) => lane)
    .filter((lane) => lane !== firstLane && Math.abs(lane - firstLane) >= minDistance)
    .sort((a, b) => {
      const aPenalty = recent.filter((lane) => lane === a).length;
      const bPenalty = recent.filter((lane) => lane === b).length;
      return aPenalty - bPenalty || Math.random() - 0.5;
    });
  return candidates[0] ?? (firstLane + 4) % 8;
}

function buildChart(level, isPractice) {
  const config = levels[level];
  const maxSteps = isPractice ? 28 : Math.floor((duration * 1000 - 1200) / config.interval);
  const chordChance = Math.min(0.18 + level * 0.09, 0.58);
  const chart = [];
  const recent = [];
  let previous = -1;

  for (let index = 0; index < maxSteps; index += 1) {
    const lane = pickLane(previous, recent);
    const lanes = [lane];
    const canChord = index > 3 && index % 2 === 0;
    if (canChord && Math.random() < chordChance) {
      lanes.push(pickChord(lane, level, recent));
    }
    lanes.forEach((value) => {
      chart.push([index * config.interval, value]);
      recent.push(value);
      if (recent.length > 8) recent.shift();
    });
    previous = lane;
  }

  return chart;
}

function makeNote(lane, hitTime) {
  const el = document.createElement("div");
  el.className = "note";
  el.dataset.lane = lane;
  lanesEl.append(el);
  return { lane, hitTime, el, judged: false };
}

function resetGame(isPractice = false) {
  notes.forEach((note) => note.el.remove());
  notes = [];
  practiceMode = isPractice;
  score = 0;
  combo = 0;
  hitCount = 0;
  missCount = 0;
  totalJudge = 0;
  accuracyPoints = 0;
  life = maxLife;
  running = true;
  modal.hidden = true;
  startAt = performance.now() + 900;
  startButton.textContent = "Restart";
  judgeText.textContent = isPractice ? "Practice" : "Ready";
  message(isPractice ? "Practiceは短めの譜面です" : `${levels[currentLevel].label} 開始。Life 3で完走しよう`, "good");
  notes = buildChart(currentLevel, isPractice).map(([time, lane]) => makeNote(lane, time));
  cancelAnimationFrame(raf);
  raf = requestAnimationFrame(tick);
  startBeat();
  updateHud();
}

function endGame(cleared = true) {
  running = false;
  cancelAnimationFrame(raf);
  stopBeat();
  notes.forEach((note) => {
    if (!note.judged) note.el.remove();
    note.judged = true;
  });
  if (cleared) {
    const best = Math.max(Number(localStorage.getItem(storageKey)) || 0, score);
    localStorage.setItem(storageKey, String(best));
  }
  resultTitle.textContent = cleared ? (score >= Number(localStorage.getItem(storageKey)) ? "Best Live" : "Live Clear") : "Live Failed";
  resultScore.textContent = score;
  resultLevel.textContent = levels[currentLevel].label;
  modal.hidden = false;
  tone(cleared ? 523 : 150, 0.12, cleared ? "triangle" : "sawtooth", 0.06);
  if (cleared) tone(784, 0.16, "triangle", 0.045);
}

function tick(now) {
  const elapsed = now - startAt;
  const laneHeight = lanesEl.getBoundingClientRect().height;
  const targetY = laneHeight - 88;
  const travel = levels[currentLevel].travel;
  notes.forEach((note) => {
    if (note.judged) return;
    const progress = (elapsed - note.hitTime + travel) / travel;
    const y = -42 + progress * (targetY + 42);
    const lane = laneEls[note.lane];
    const x = lane.offsetLeft + lane.clientWidth / 2 - note.el.offsetWidth / 2;
    note.el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    if (elapsed - note.hitTime > 250) miss(note);
  });
  updateHud();
  const endTime = practiceMode ? buildChart(currentLevel, true).at(-1)?.[0] || 15000 : duration * 1000;
  if (running && elapsed > endTime + 1200) {
    endGame(true);
    return;
  }
  if (running) raf = requestAnimationFrame(tick);
}

function hitLane(lane) {
  if (!running) {
    message("EnterまたはStartで開始できます", "bad");
    return;
  }
  flashLane(lane);
  const elapsed = performance.now() - startAt;
  const candidates = notes
    .filter((note) => !note.judged && note.lane === lane)
    .map((note) => ({ note, delta: Math.abs(elapsed - note.hitTime), raw: elapsed - note.hitTime }))
    .sort((a, b) => a.delta - b.delta);
  const target = candidates[0];
  if (!target || target.delta > 230) {
    combo = 0;
    judgeText.textContent = target?.raw < -230 ? "Early" : "Miss";
    message("タイミングをラインに合わせよう", "bad");
    tone(130, 0.05, "sawtooth", 0.04);
    updateHud();
    return;
  }
  judge(target.note, target.delta);
}

function judge(note, delta) {
  note.judged = true;
  note.el.classList.add("hit");
  setTimeout(() => note.el.remove(), 160);
  let label = "Good";
  let add = 120;
  let acc = 72;
  if (delta <= 75) {
    label = "Perfect";
    add = 320;
    acc = 100;
  } else if (delta <= 135) {
    label = "Great";
    add = 220;
    acc = 88;
  }
  combo += 1;
  hitCount += 1;
  totalJudge += 1;
  accuracyPoints += acc;
  score += Math.round((add + combo * 8) * (1 + currentLevel * 0.08));
  judgeText.textContent = label;
  message(`${label} +${add}`, "good");
  tone(520 + note.lane * 36 + combo * 2, 0.045, "sine", 0.045);
  updateHud();
}

function miss(note) {
  if (note.judged || !running) return;
  note.judged = true;
  note.el.remove();
  combo = 0;
  missCount += 1;
  totalJudge += 1;
  life = Math.max(0, life - 1);
  judgeText.textContent = "Miss";
  message(life ? `Miss / Life ${life}` : "Life 0", "bad");
  tone(110, 0.055, "sawtooth", 0.035);
  updateHud();
  if (life <= 0) endGame(false);
}

function flashLane(lane) {
  laneEls[lane]?.classList.add("active");
  padButtons[lane]?.classList.add("active");
  setTimeout(() => {
    laneEls[lane]?.classList.remove("active");
    padButtons[lane]?.classList.remove("active");
  }, 100);
}

function setLevel(level) {
  currentLevel = Math.max(1, Math.min(5, level));
  levelButtons.forEach((button) => button.classList.toggle("selected", Number(button.dataset.level) === currentLevel));
  message(`${levels[currentLevel].label} を選択しました`);
  updateHud();
}

function updateHud() {
  const remain = running ? Math.max(0, Math.ceil(duration - (performance.now() - startAt) / 1000)) : duration;
  const accuracy = totalJudge ? Math.round(accuracyPoints / totalJudge) : 100;
  scoreText.textContent = score;
  comboText.textContent = combo;
  timeText.textContent = practiceMode ? "PR" : remain;
  bestText.textContent = localStorage.getItem(storageKey) || "0";
  levelText.textContent = levels[currentLevel].label;
  lifeText.textContent = life;
  lifeText.classList.toggle("danger", life <= 1);
  judgeText.title = `Accuracy ${accuracy}%`;
}

function message(text, kind = "") {
  messageEl.textContent = text;
  messageEl.className = `message ${kind}`.trim();
}

startButton.addEventListener("click", () => resetGame(false));
practiceButton.addEventListener("click", () => resetGame(true));
retryButton.addEventListener("click", () => resetGame(false));
padButtons.forEach((button) => button.addEventListener("pointerdown", () => hitLane(Number(button.dataset.pad))));
levelButtons.forEach((button) => button.addEventListener("click", () => setLevel(Number(button.dataset.level))));
window.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    resetGame(false);
    return;
  }
  const lane = keys[event.key.toLowerCase()];
  if (lane === undefined || event.repeat) return;
  event.preventDefault();
  hitLane(lane);
});
soundToggle.addEventListener("click", async () => {
  soundOn = !soundOn;
  soundToggle.textContent = soundOn ? "Sound On" : "Sound Off";
  soundToggle.setAttribute("aria-pressed", String(soundOn));
  if (soundOn) {
    await makeAudio().resume();
    startBeat();
    tone(660, 0.08, "sine", 0.05);
  } else {
    stopBeat();
  }
});

setLevel(1);
updateHud();
