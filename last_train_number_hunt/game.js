const GAME_ID = "last-train-number-hunt";
const GAME_TITLE = "終電ナンバーサーチ";
const duration = 45;
const storageKey = "lastTrainNumberHunt.best.v1";
const tutorialKey = "lastTrainNumberHunt.tutorial.v2";
const challengePool = [
  "last-train-number-hunt",
  "galaxy-sushi-clicker",
  "kanji-mirage-museum",
  "color-reflex-dojo",
  "stardust-merge-cafe",
  "moonlit-curio-sorter",
  "futon-flight",
  "lost-call-switchboard",
];
const rankTitles = [
  "終電前の見習い",
  "改札口ウォッチャー",
  "ホーム端の探偵",
  "行先表示の読破者",
  "深夜線の見張り役",
  "発車標の追跡者",
  "乗換案内の助っ人",
  "終着ホームの記録係",
  "ラストダイヤの速読者",
  "駅灯の観測士",
  "時刻表の目利き",
  "ホームベルの案内人",
  "夜更けの発車監督",
  "最終列車の誘導員",
  "深夜改札の司令塔",
  "終電表示の修復士",
  "列番読解マスター",
  "深夜ホームの番人",
  "ラストダイヤの支配人",
  "深夜の発車標マスター",
];

const board = document.querySelector("#board");
const scoreText = document.querySelector("#scoreText");
const timeText = document.querySelector("#timeText");
const comboText = document.querySelector("#comboText");
const stageText = document.querySelector("#stageText");
const targetText = document.querySelector("#targetText");
const goalText = document.querySelector("#goalText");
const phaseText = document.querySelector("#phaseText");
const message = document.querySelector("#message");
const startButton = document.querySelector("#startButton");
const shuffleButton = document.querySelector("#shuffleButton");
const soundToggle = document.querySelector("#soundToggle");
const modal = document.querySelector("#resultModal");
const retryButton = document.querySelector("#retryButton");
const resultTitle = document.querySelector("#resultTitle");
const resultScore = document.querySelector("#resultScore");
const resultStage = document.querySelector("#resultStage");
const resultBest = document.querySelector("#resultBest");
const resultTime = document.querySelector("#resultTime");
const resultBadge = document.querySelector("#resultBadge");
const resultNote = document.querySelector("#resultNote");
const quickStart = document.querySelector("#quickStart");
const quickStartButton = document.querySelector("#quickStartButton");
const dismissGuideButton = document.querySelector("#dismissGuideButton");
const shareCardCanvas = document.querySelector("#shareCardCanvas");
const copyResultButton = document.querySelector("#copyResultButton");
const shareResultButton = document.querySelector("#shareResultButton");
const xShareButton = document.querySelector("#xShareButton");

let running = false;
let hasStarted = false;
let timerId = 0;
let timeLeft = duration;
let score = 0;
let combo = 0;
let stage = 1;
let nextNumber = 1;
let maxNumber = 12;
let cols = 4;
let tiles = [];
let audio;
let bgmGain;
let bgmTimer = 0;
let bgmStep = 0;
let soundOn = true;
let sharePayload = { text: "", url: "", title: "", imageUrl: "" };

function bestScore() {
  const storeBest = Number(window.CollectPlayer?.getGameRecord?.(GAME_ID)?.bestScore || "0");
  const legacyBest = Number(localStorage.getItem(storageKey) || "0");
  return Math.max(storeBest, legacyBest);
}

function setBest(value) {
  if (value > bestScore()) {
    localStorage.setItem(storageKey, String(value));
  }
}

function localDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function hashString(value) {
  return [...value].reduce((acc, char) => (acc * 33 + char.charCodeAt(0)) % 2147483647, 7);
}

function isTodayChallengeGame() {
  const todayGameId = challengePool[hashString(localDateKey()) % challengePool.length];
  return todayGameId === GAME_ID;
}

function setupAudio() {
  if (audio) return;
  audio = new (window.AudioContext || window.webkitAudioContext)();
  bgmGain = audio.createGain();
  bgmGain.gain.value = 0;
  bgmGain.connect(audio.destination);
}

function tone(freq, durationMs = 100, type = "sine", volume = 0.04) {
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
  osc.type = "sine";
  osc.frequency.setValueAtTime(freq, start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(0.012, start + 0.03);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.3);
  osc.connect(gain);
  gain.connect(bgmGain);
  osc.start(start);
  osc.stop(start + 0.34);
}

function startBgm() {
  if (!audio || !soundOn || bgmTimer) return;
  bgmGain.gain.setTargetAtTime(0.2, audio.currentTime, 0.25);
  const phrases = [
    [392, 493.88, 587.33],
    [329.63, 440, 554.37],
    [369.99, 466.16, 622.25],
  ];
  const playPhrase = () => {
    phrases[bgmStep % phrases.length].forEach((freq, index) => playBgmNote(freq, index * 0.18));
    bgmStep += 1;
  };
  playPhrase();
  bgmTimer = window.setInterval(playPhrase, 1400);
}

function stopBgm() {
  if (bgmTimer) {
    window.clearInterval(bgmTimer);
    bgmTimer = 0;
  }
  if (bgmGain && audio) bgmGain.gain.setTargetAtTime(0.0001, audio.currentTime, 0.2);
}

function shuffle(array) {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function stageConfig() {
  const count = Math.min(26, 10 + stage * 2);
  const columns = stage < 4 ? 4 : stage < 8 ? 5 : 6;
  return { count, columns };
}

function makeTiles() {
  const config = stageConfig();
  maxNumber = config.count;
  cols = config.columns;
  const targetValues = Array.from({ length: maxNumber }, (_, index) => index + 1);
  const spaces = cols * Math.ceil(maxNumber / cols);
  const decoys = Array.from({ length: Math.max(0, spaces - maxNumber) }, (_, index) => maxNumber + index + 7);
  tiles = shuffle([...targetValues, ...decoys]).map((value, index) => ({
    value,
    line: ["A", "B", "C", "D", "E", "F"][index % cols],
    cleared: value > maxNumber,
  }));
}

function rankForScore(value) {
  const index = Math.max(0, Math.min(rankTitles.length - 1, Math.floor(value / 900)));
  return rankTitles[index];
}

function tutorialSeen() {
  return localStorage.getItem(tutorialKey) === "1";
}

function setTutorialSeen() {
  localStorage.setItem(tutorialKey, "1");
  quickStart.hidden = true;
}

function updateHud() {
  scoreText.textContent = score.toLocaleString();
  timeText.textContent = Math.max(0, Math.ceil(timeLeft));
  comboText.textContent = combo;
  stageText.textContent = stage;
  targetText.textContent = nextNumber <= maxNumber ? nextNumber : "OK";
  goalText.textContent = `1 → ${maxNumber}`;
}

function render() {
  board.style.setProperty("--cols", cols);
  board.innerHTML = "";
  tiles.forEach((tile) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "number-tile";
    button.dataset.line = `Line ${tile.line}`;
    button.textContent = tile.value;
    if (tile.cleared) button.classList.add("cleared");
    if (tile.value === nextNumber && !tile.cleared) button.classList.add("next");
    button.addEventListener("click", () => chooseTile(tile, button));
    board.append(button);
  });
  updateHud();
}

function newStage() {
  nextNumber = 1;
  combo = 0;
  phaseText.textContent = `Stage ${stage}`;
  message.textContent = "次の数字を見つけて、止まらず押していきましょう。";
  makeTiles();
  render();
}

function chooseTile(tile, element) {
  if (!running) {
    beginRun({ sourceArea: "board_click" });
    return;
  }
  if (tile.cleared) {
    wrong(element, "その発車標はもう確認済みです。");
    return;
  }
  if (tile.value !== nextNumber) {
    wrong(element, `${nextNumber} を探しましょう。`);
    return;
  }
  tile.cleared = true;
  combo += 1;
  const quickBonus = Math.max(0, Math.ceil(timeLeft / 5));
  score += 25 + combo * 4 + stage * 3 + quickBonus;
  element.classList.add("correct");
  tone(520 + (combo % 6) * 44, 80, "triangle", 0.04);
  nextNumber += 1;
  if (nextNumber > maxNumber) {
    clearStage();
    return;
  }
  render();
}

function wrong(element, text) {
  combo = 0;
  timeLeft = Math.max(0, timeLeft - 2);
  message.textContent = text;
  element.classList.add("wrong");
  tone(150, 90, "square", 0.018);
  window.setTimeout(() => element.classList.remove("wrong"), 260);
  updateHud();
  if (timeLeft <= 0) endGame("終電に間に合わず");
}

function clearStage() {
  const bonus = Math.round(220 + timeLeft * 4 + stage * 28 + combo * 6);
  score += bonus;
  timeLeft = Math.min(duration, timeLeft + 4);
  message.textContent = `発車標を確認。+${bonus.toLocaleString()}点、次のホームへ。`;
  phaseText.textContent = "Departing";
  tone(740, 120, "sine", 0.05);
  tone(990, 170, "triangle", 0.04);
  stage += 1;
  render();
  window.setTimeout(() => {
    if (running) newStage();
  }, 760);
}

function beginRun({ restart = false, sourceArea = "game_screen" } = {}) {
  setupAudio();
  if (audio.state === "suspended") audio.resume();
  if (restart) {
    window.CollectPlayer?.recordRestart?.(GAME_ID, sourceArea);
  }
  running = true;
  hasStarted = true;
  timeLeft = duration;
  score = 0;
  combo = 0;
  stage = 1;
  modal.hidden = true;
  startButton.textContent = "Restart";
  window.clearInterval(timerId);
  timerId = window.setInterval(tick, 1000);
  startBgm();
  newStage();
  setTutorialSeen();
  if (isTodayChallengeGame()) {
    window.CollectPlayer?.markDailyChallengeStart?.(GAME_ID);
  }
  window.CollectAnalytics?.sendHumanInteraction?.("play_start");
  window.CollectPlayer?.recordPlay?.(GAME_ID, GAME_TITLE, "/last_train_number_hunt/");
}

function buildShareText(finalScore, badgeTitle) {
  return `${GAME_TITLE}で ${finalScore.toLocaleString()} 点！\n称号：${badgeTitle}\n\n無料ブラウザゲーム広場で遊びました。\nhttps://game-collect.online/last_train_number_hunt/\n#ブラウザゲーム #ミニゲーム`;
}

function buildShareCard(finalScore, badgeTitle) {
  const ctx = shareCardCanvas.getContext("2d");
  const gradient = ctx.createLinearGradient(0, 0, 1200, 630);
  gradient.addColorStop(0, "#071520");
  gradient.addColorStop(0.55, "#133b59");
  gradient.addColorStop(1, "#0b759e");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 1200, 630);

  ctx.fillStyle = "rgba(94, 231, 255, 0.14)";
  ctx.fillRect(70, 72, 1060, 486);
  ctx.strokeStyle = "rgba(182, 255, 108, 0.5)";
  ctx.lineWidth = 4;
  ctx.strokeRect(70, 72, 1060, 486);

  ctx.fillStyle = "#b6ff6c";
  ctx.font = "900 34px Inter, sans-serif";
  ctx.fillText("無料ブラウザゲーム広場", 110, 138);

  ctx.fillStyle = "#eefcff";
  ctx.font = "900 78px Inter, sans-serif";
  ctx.fillText(GAME_TITLE, 110, 238);

  ctx.fillStyle = "#a8bdc8";
  ctx.font = "700 32px Inter, sans-serif";
  ctx.fillText("Last Train Report", 110, 294);

  ctx.fillStyle = "#eefcff";
  ctx.font = "900 120px Inter, sans-serif";
  ctx.fillText(`${finalScore.toLocaleString()} pt`, 110, 430);

  ctx.fillStyle = "#5ee7ff";
  ctx.font = "800 42px Inter, sans-serif";
  ctx.fillText(`称号: ${badgeTitle}`, 110, 500);

  ctx.fillStyle = "rgba(238, 252, 255, 0.85)";
  ctx.font = "700 28px Inter, sans-serif";
  ctx.fillText("https://game-collect.online/last_train_number_hunt/", 110, 548);

  sharePayload = {
    title: `${GAME_TITLE}の結果`,
    text: buildShareText(finalScore, badgeTitle),
    url: "https://game-collect.online/last_train_number_hunt/",
    imageUrl: shareCardCanvas.toDataURL("image/png"),
  };
  xShareButton.href = `https://x.com/intent/tweet?text=${encodeURIComponent(sharePayload.text)}`;
}

async function copyResult() {
  if (!sharePayload.text) return;
  try {
    await navigator.clipboard.writeText(sharePayload.text);
    window.CollectPlayer?.noteShare?.(GAME_ID);
    resultNote.textContent = "結果をコピーしました。";
  } catch {
    resultNote.textContent = "コピーできなかったため、共有文を長押しでコピーしてください。";
  }
}

async function shareResult() {
  if (!sharePayload.text) return;
  if (navigator.share) {
    try {
      await navigator.share({
        title: sharePayload.title,
        text: sharePayload.text,
        url: sharePayload.url,
      });
      window.CollectPlayer?.noteShare?.(GAME_ID);
      resultNote.textContent = "共有メニューを開きました。";
      return;
    } catch {
      // ignore cancellation and fall through
    }
  }
  await copyResult();
}

function endGame(title) {
  if (!running) return;
  running = false;
  window.clearInterval(timerId);
  stopBgm();
  const previousBest = bestScore();
  const playTime = duration - timeLeft;
  const badgeTitle = rankForScore(score);
  const nextBest = Math.max(previousBest, score);
  setBest(score);
  const completionSummary = window.CollectPlayer?.recordCompletion?.(GAME_ID, {
    score,
    playTime,
    stage,
    sourceArea: "result_screen",
    dailyCompleted: isTodayChallengeGame(),
  }) || { bestUpdated: score > previousBest, bestScore: Math.max(previousBest, score) };

  resultTitle.textContent = title;
  resultScore.textContent = score.toLocaleString();
  resultStage.textContent = stage;
  resultBest.textContent = Number(completionSummary.bestScore || nextBest).toLocaleString();
  resultTime.textContent = `${playTime}秒`;
  resultBadge.textContent = badgeTitle;
  resultNote.textContent =
    completionSummary.bestUpdated
      ? "自己ベスト更新です。結果を共有して次も伸ばしましょう。"
      : "次は視線を先読みして、もっと奥のホームまで駆け抜けましょう。";
  modal.hidden = false;
  startButton.textContent = "Start";
  message.textContent = `Best ${nextBest.toLocaleString()} 点。次は終電までにもっと多く確認しましょう。`;
  buildShareCard(score, badgeTitle);
  updateHud();
}

function tick() {
  if (!running) return;
  timeLeft -= 1;
  if (timeLeft <= 0) {
    timeLeft = 0;
    updateHud();
    endGame("終電に間に合わず");
    return;
  }
  updateHud();
}

startButton.addEventListener("click", () => beginRun({ restart: hasStarted, sourceArea: "game_screen" }));
retryButton.addEventListener("click", () => beginRun({ restart: true, sourceArea: "result_screen" }));
quickStartButton.addEventListener("click", () => beginRun({ restart: false, sourceArea: "tutorial" }));
dismissGuideButton.addEventListener("click", setTutorialSeen);

shuffleButton.addEventListener("click", () => {
  if (!running) {
    beginRun({ sourceArea: "game_screen" });
    return;
  }
  score = Math.max(0, score - 80);
  message.textContent = "発車標の並びを入れ替えました。";
  tiles = shuffle(tiles);
  tone(360, 120, "triangle", 0.03);
  render();
});

copyResultButton.addEventListener("click", copyResult);
shareResultButton.addEventListener("click", shareResult);
xShareButton.addEventListener("click", () => {
  window.CollectPlayer?.noteShare?.(GAME_ID);
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
  if (event.key === "Enter") {
    beginRun({ restart: hasStarted && !running, sourceArea: "keyboard" });
  }
});

function handlePageAudioStop() {
  stopBgm();
}

if (tutorialSeen()) {
  quickStart.hidden = true;
}

makeTiles();
render();

document.addEventListener("visibilitychange", () => {
  if (document.hidden) handlePageAudioStop();
});
window.addEventListener("pagehide", handlePageAudioStop);
window.addEventListener("beforeunload", handlePageAudioStop);
