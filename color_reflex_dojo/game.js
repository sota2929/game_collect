const duration = 45;
const storageKey = "colorReflexDojo.best.v1";
const colors = [
  { key: "red", label: "赤", value: "#ff5b6e" },
  { key: "blue", label: "青", value: "#5db7ff" },
  { key: "yellow", label: "黄", value: "#ffd166" },
  { key: "green", label: "緑", value: "#77e0a5" },
];
const rules = [
  { key: "ink", label: "文字色を押す" },
  { key: "word", label: "文字を読む" },
  { key: "bg", label: "背景色を押す" },
];

const scoreText = document.querySelector("#scoreText");
const timeText = document.querySelector("#timeText");
const comboText = document.querySelector("#comboText");
const lifeText = document.querySelector("#lifeText");
const ruleText = document.querySelector("#ruleText");
const targetCard = document.querySelector("#targetCard");
const targetWord = document.querySelector("#targetWord");
const timeBar = document.querySelector("#timeBar");
const message = document.querySelector("#message");
const choices = document.querySelector("#choices");
const startButton = document.querySelector("#startButton");
const retryButton = document.querySelector("#retryButton");
const soundToggle = document.querySelector("#soundToggle");
const modal = document.querySelector("#resultModal");
const resultTitle = document.querySelector("#resultTitle");
const resultScore = document.querySelector("#resultScore");
const resultCombo = document.querySelector("#resultCombo");

let score = 0;
let combo = 0;
let maxCombo = 0;
let life = 3;
let timeLeft = duration;
let running = false;
let timerId = 0;
let question = null;
let roundStarted = 0;
let roundLimit = 2600;
let soundOn = true;
let audio;
let bgmGain;
let bgmTimer = 0;
let bgmStep = 0;

function randItem(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function bestScore() {
  return Number(localStorage.getItem(storageKey) || "0");
}

function setBest(value) {
  if (value > bestScore()) localStorage.setItem(storageKey, String(value));
}

function setupAudio() {
  if (audio) return;
  audio = new (window.AudioContext || window.webkitAudioContext)();
  bgmGain = audio.createGain();
  bgmGain.gain.value = 0;
  bgmGain.connect(audio.destination);
}

function tone(freq, durationMs = 110, type = "sine", volume = 0.045) {
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
  gain.gain.exponentialRampToValueAtTime(0.018, start + 0.025);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.22);
  osc.connect(gain);
  gain.connect(bgmGain);
  osc.start(start);
  osc.stop(start + 0.26);
}

function startBgm() {
  if (!audio || !soundOn || bgmTimer) return;
  bgmGain.gain.setTargetAtTime(0.26, audio.currentTime, 0.32);
  const phrases = [
    [392, 493.88, 587.33, 493.88],
    [349.23, 440, 523.25, 440],
    [329.63, 392, 493.88, 587.33],
  ];
  const playPhrase = () => {
    phrases[bgmStep % phrases.length].forEach((freq, index) => playBgmNote(freq, index * 0.16));
    bgmStep += 1;
  };
  playPhrase();
  bgmTimer = window.setInterval(playPhrase, 1200);
}

function stopBgm() {
  if (bgmTimer) {
    window.clearInterval(bgmTimer);
    bgmTimer = 0;
  }
  if (bgmGain && audio) bgmGain.gain.setTargetAtTime(0.0001, audio.currentTime, 0.18);
}

function updateHud() {
  scoreText.textContent = score.toLocaleString();
  timeText.textContent = Math.max(0, Math.ceil(timeLeft));
  comboText.textContent = combo;
  lifeText.textContent = "●".repeat(life) || "0";
}

function answerKeyFor(current) {
  if (current.rule.key === "ink") return current.ink.key;
  if (current.rule.key === "word") return current.word.key;
  return current.bg.key;
}

function makeQuestion() {
  const rule = combo >= 12 ? randItem(rules) : randItem(rules.slice(0, 2));
  let word = randItem(colors);
  let ink = randItem(colors);
  let bg = randItem(colors);
  for (let guard = 0; guard < 10 && new Set([word.key, ink.key, bg.key]).size < 3; guard += 1) {
    word = randItem(colors);
    ink = randItem(colors);
    bg = randItem(colors);
  }
  return { rule, word, ink, bg };
}

function renderChoices() {
  choices.innerHTML = colors
    .map(
      (color) => `<button class="choice-button" type="button" data-color="${color.key}" style="background:${color.value}">${color.label}</button>`,
    )
    .join("");
  choices.querySelectorAll("[data-color]").forEach((button) => {
    button.addEventListener("click", () => submitAnswer(button.dataset.color));
  });
}

function nextQuestion() {
  question = makeQuestion();
  roundLimit = Math.max(1150, 2700 - combo * 45);
  roundStarted = performance.now();
  ruleText.textContent = question.rule.label;
  targetWord.textContent = question.word.label;
  targetWord.style.color = question.ink.value;
  targetCard.style.background = `linear-gradient(145deg, ${question.bg.value}, #171d2b 78%)`;
  targetCard.classList.remove("flash", "shake");
  void targetCard.offsetWidth;
  targetCard.classList.add("flash");
  timeBar.style.transform = "scaleX(1)";
  updateHud();
}

function submitAnswer(key) {
  if (!running) {
    startGame();
    return;
  }
  if (!question) return;
  const elapsed = performance.now() - roundStarted;
  const correct = key === answerKeyFor(question);
  if (correct) {
    combo += 1;
    maxCombo = Math.max(maxCombo, combo);
    const speedBonus = Math.max(0, Math.round((roundLimit - elapsed) / 22));
    score += 100 + combo * 12 + speedBonus;
    message.textContent = `正解。Combo ${combo}`;
    tone(520 + combo * 10, 90, "sine", 0.045);
    nextQuestion();
  } else {
    life -= 1;
    combo = 0;
    message.textContent = "見る場所を切り替えましょう。";
    targetCard.classList.remove("shake");
    void targetCard.offsetWidth;
    targetCard.classList.add("shake");
    tone(150, 100, "square", 0.026);
    if (life <= 0) {
      endGame("集中切れ");
    } else {
      nextQuestion();
    }
  }
  updateHud();
}

function tick() {
  if (!running) return;
  timeLeft -= 0.1;
  if (question) {
    const ratio = Math.max(0, 1 - (performance.now() - roundStarted) / roundLimit);
    timeBar.style.transform = `scaleX(${ratio})`;
    if (ratio <= 0) {
      life -= 1;
      combo = 0;
      message.textContent = "時間切れ。次のお題へ。";
      tone(180, 100, "sawtooth", 0.028);
      if (life <= 0) {
        endGame("時間切れ");
      } else {
        nextQuestion();
      }
    }
  }
  if (timeLeft <= 0) endGame("鍛錬終了");
  updateHud();
}

function startGame() {
  setupAudio();
  if (audio.state === "suspended") audio.resume();
  score = 0;
  combo = 0;
  maxCombo = 0;
  life = 3;
  timeLeft = duration;
  running = true;
  modal.hidden = true;
  startButton.textContent = "Restart";
  message.textContent = "お題を見て、指定された色を押しましょう。";
  clearInterval(timerId);
  timerId = window.setInterval(tick, 100);
  startBgm();
  nextQuestion();
  window.CollectUGC?.recordPlay?.("color-reflex-dojo");
}

function endGame(title) {
  if (!running) return;
  running = false;
  clearInterval(timerId);
  stopBgm();
  setBest(score);
  resultTitle.textContent = title;
  resultScore.textContent = score.toLocaleString();
  resultCombo.textContent = String(maxCombo);
  modal.hidden = false;
  startButton.textContent = "Start";
  message.textContent = `Best ${bestScore().toLocaleString()} 点。もう一度集中を研ぎ澄ませましょう。`;
  tone(260, 170, "triangle", 0.045);
  updateHud();
}

startButton.addEventListener("click", startGame);
retryButton.addEventListener("click", startGame);
targetCard.addEventListener("click", () => {
  if (!running) startGame();
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
  const index = ["1", "2", "3", "4"].indexOf(event.key);
  if (index >= 0) {
    submitAnswer(colors[index].key);
  }
  if (event.key === "Enter" && !running) startGame();
});

renderChoices();
question = makeQuestion();
ruleText.textContent = question.rule.label;
targetWord.textContent = question.word.label;
targetWord.style.color = question.ink.value;
targetCard.style.background = `linear-gradient(145deg, ${question.bg.value}, #171d2b 78%)`;
updateHud();

function handlePageAudioStop() {
  stopBgm();
}

document.addEventListener("visibilitychange", () => {
  if (document.hidden) handlePageAudioStop();
});
window.addEventListener("pagehide", handlePageAudioStop);
window.addEventListener("beforeunload", handlePageAudioStop);
