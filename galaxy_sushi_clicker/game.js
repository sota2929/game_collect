const GAME_ID = "galaxy-sushi-clicker";
const DURATION = 60;
const AUTO_INTERVAL = 3000;

const state = {
  running: false,
  plates: 0,
  total: 0,
  time: DURATION,
  tapPower: 1,
  goldRate: 1,
  autoLevel: 0,
  sound: true,
  upgrades: {
    tap: { level: 0, base: 25, scale: 1.62 },
    time: { level: 0, base: 70, scale: 1.9 },
    gold: { level: 0, base: 90, scale: 1.85 },
    auto: { level: 0, base: 120, scale: 2.05 }
  },
  timerId: null,
  autoId: null,
  bonusId: null,
  audio: null
};

const els = {
  body: document.body,
  start: document.getElementById("startButton"),
  retry: document.getElementById("retryButton"),
  sushi: document.getElementById("sushiButton"),
  plates: document.getElementById("plates"),
  time: document.getElementById("time"),
  best: document.getElementById("best"),
  tapPower: document.getElementById("tapPowerLabel"),
  goldRate: document.getElementById("goldRateLabel"),
  bonus: document.getElementById("bonusTarget"),
  modal: document.getElementById("resultModal"),
  resultScore: document.getElementById("resultScore"),
  resultText: document.getElementById("resultText"),
  sound: document.getElementById("soundToggle"),
  costs: {
    tap: document.getElementById("tapCost"),
    time: document.getElementById("timeCost"),
    gold: document.getElementById("goldCost"),
    auto: document.getElementById("autoCost")
  }
};

const bestKey = "collect.galaxySushiClicker.best";
els.best.textContent = Number(localStorage.getItem(bestKey) || 0).toLocaleString("ja-JP");
updateUi();

function cost(type) {
  const up = state.upgrades[type];
  return Math.floor(up.base * up.scale ** up.level);
}

function startGame() {
  if (state.running) return;
  clearIntervals();
  state.running = true;
  state.plates = 0;
  state.total = 0;
  state.time = DURATION;
  state.tapPower = 1;
  state.goldRate = 1;
  state.autoLevel = 0;
  Object.values(state.upgrades).forEach((up) => {
    up.level = 0;
  });
  els.body.classList.add("running");
  els.modal.hidden = true;
  updateUi();
  initAudio();
  playTone("start");
  startMusic();
  window.CollectUGC?.recordPlay?.(GAME_ID);
  state.timerId = window.setInterval(tick, 1000);
  state.autoId = window.setInterval(autoTap, AUTO_INTERVAL);
  scheduleBonus();
}

function tick() {
  if (!state.running) return;
  state.time -= 1;
  if (state.time <= 0) {
    endGame();
  }
  updateUi();
}

function tapSushi(event, isAuto = false) {
  if (!state.running) {
    startGame();
    return;
  }
  const gain = state.tapPower;
  addPlates(gain);
  if (isAuto) {
    burstAt(window.innerWidth / 2, window.innerHeight / 2, `AUTO +${gain}`);
  } else {
    playTone("tap");
    burstAt(event.clientX || window.innerWidth / 2, event.clientY || window.innerHeight / 2, `+${gain}`);
  }
}

function autoTap() {
  if (!state.running || state.autoLevel <= 0) return;
  for (let i = 0; i < state.autoLevel; i += 1) {
    tapSushi({ clientX: window.innerWidth / 2, clientY: window.innerHeight / 2 }, true);
  }
  playTone("auto");
}

function addPlates(amount) {
  const gain = Math.max(1, Math.floor(amount));
  state.plates += gain;
  state.total += gain;
  updateUi();
}

function buyUpgrade(type) {
  if (!state.running) return;
  const price = cost(type);
  if (state.plates < price) {
    playTone("deny");
    return;
  }
  state.plates -= price;
  const up = state.upgrades[type];
  up.level += 1;

  if (type === "tap") {
    state.tapPower += 1;
    burstCenter("TAP +1");
  }
  if (type === "time") {
    state.time += 5;
    burstCenter("+5秒");
  }
  if (type === "gold") {
    state.goldRate += 1;
    burstCenter("金皿UP");
    scheduleBonus();
  }
  if (type === "auto") {
    state.autoLevel += 1;
    burstCenter("AUTO ON");
  }

  playTone("buy");
  updateUi();
}

function scheduleBonus() {
  window.clearTimeout(state.bonusId);
  if (!state.running) return;
  const delay = Math.max(1700, 6200 - state.goldRate * 800 + Math.random() * 2400);
  state.bonusId = window.setTimeout(() => {
    showBonus();
    scheduleBonus();
  }, delay);
}

function showBonus() {
  const rect = document.querySelector(".belt-wrap").getBoundingClientRect();
  const x = 10 + Math.random() * 72;
  const y = 16 + Math.random() * 52;
  els.bonus.style.left = `${x}%`;
  els.bonus.style.top = `${y}%`;
  els.bonus.classList.add("show");
  window.setTimeout(() => els.bonus.classList.remove("show"), 2300 + state.goldRate * 180);
  els.bonus.dataset.value = String(Math.floor(28 + state.total * 0.045 + state.tapPower * 9 + state.goldRate * 12));
  els.bonus.dataset.cx = String(rect.left + (x / 100) * rect.width);
  els.bonus.dataset.cy = String(rect.top + (y / 100) * rect.height);
}

function collectBonus() {
  if (!state.running || !els.bonus.classList.contains("show")) return;
  const value = Number(els.bonus.dataset.value || 30);
  addPlates(value);
  els.bonus.classList.remove("show");
  playTone("bonus");
  burstAt(Number(els.bonus.dataset.cx), Number(els.bonus.dataset.cy), `+${value} 金皿`);
}

function endGame() {
  state.running = false;
  clearIntervals();
  stopMusic();
  els.body.classList.remove("running");
  els.bonus.classList.remove("show");
  const score = Math.floor(state.total);
  const best = Math.max(score, Number(localStorage.getItem(bestKey) || 0));
  localStorage.setItem(bestKey, String(best));
  els.best.textContent = best.toLocaleString("ja-JP");
  els.resultScore.textContent = `${score.toLocaleString("ja-JP")}皿`;
  els.resultText.textContent = score >= 1000
    ? "宇宙港の腹ペコ客を一気にさばきました。かなり良い営業です。"
    : score >= 520
      ? "レーンは回っています。次は1キーの強化を早めに買うと伸びます。"
      : "まだ席に余白があります。序盤のタップ単価アップを急ぎましょう。";
  els.modal.hidden = false;
  playTone("end");
  updateUi();
}

function clearIntervals() {
  window.clearInterval(state.timerId);
  window.clearInterval(state.autoId);
  window.clearTimeout(state.bonusId);
}

function updateUi() {
  els.plates.textContent = Math.floor(state.plates).toLocaleString("ja-JP");
  els.time.textContent = Math.max(0, state.time);
  els.tapPower.textContent = `${state.tapPower}皿`;
  els.goldRate.textContent = state.goldRate === 1 ? "通常" : `Lv.${state.goldRate}`;

  Object.keys(els.costs).forEach((type) => {
    const price = cost(type);
    els.costs[type].textContent = `${price.toLocaleString("ja-JP")}皿`;
    const button = document.querySelector(`[data-upgrade="${type}"]`);
    button.disabled = state.running && state.plates < price;
  });
}

function burstCenter(text) {
  burstAt(window.innerWidth / 2, window.innerHeight / 2, text);
}

function burstAt(x, y, text) {
  const node = document.createElement("span");
  node.className = "float-score";
  node.textContent = text;
  node.style.left = `${x}px`;
  node.style.top = `${y}px`;
  document.body.appendChild(node);
  node.addEventListener("animationend", () => node.remove(), { once: true });
}

function initAudio() {
  if (state.audio) return;
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return;
  const ctx = new AudioContext();
  const master = ctx.createGain();
  master.gain.value = 0.14;
  master.connect(ctx.destination);
  state.audio = { ctx, master, loop: null };
}

function playTone(type) {
  if (!state.sound || !state.audio) return;
  const { ctx, master } = state.audio;
  if (ctx.state === "suspended") ctx.resume();
  const now = ctx.currentTime;
  const notes = {
    tap: [660, 0.045, "square"],
    auto: [520, 0.08, "triangle"],
    buy: [880, 0.12, "triangle"],
    deny: [180, 0.08, "sawtooth"],
    bonus: [1046, 0.16, "sine"],
    start: [523, 0.18, "sine"],
    end: [330, 0.36, "triangle"]
  }[type];
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = notes[2];
  osc.frequency.setValueAtTime(notes[0], now);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.18, now + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + notes[1]);
  osc.connect(gain).connect(master);
  osc.start(now);
  osc.stop(now + notes[1] + 0.02);
}

function startMusic() {
  if (!state.sound || !state.audio || state.audio.loop) return;
  const { ctx, master } = state.audio;
  if (ctx.state === "suspended") ctx.resume();
  const seq = [261, 392, 329, 440, 392, 523, 440, 329];
  let step = 0;
  state.audio.loop = window.setInterval(() => {
    if (!state.running || !state.sound) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(seq[step % seq.length], now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.055, now + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.32);
    osc.connect(gain).connect(master);
    osc.start(now);
    osc.stop(now + 0.34);
    step += 1;
  }, 360);
}

function stopMusic() {
  if (state.audio?.loop) {
    window.clearInterval(state.audio.loop);
    state.audio.loop = null;
  }
}

function toggleSound() {
  state.sound = !state.sound;
  els.sound.textContent = state.sound ? "Sound ON" : "Sound OFF";
  els.sound.setAttribute("aria-pressed", String(state.sound));
  if (state.sound) {
    initAudio();
    startMusic();
    playTone("start");
  } else {
    stopMusic();
  }
}

els.start.addEventListener("click", startGame);
els.retry.addEventListener("click", startGame);
els.sushi.addEventListener("click", tapSushi);
els.bonus.addEventListener("click", collectBonus);
els.bonus.addEventListener("keydown", (event) => {
  if (event.key === "Enter" || event.key === " ") collectBonus();
});
els.sound.addEventListener("click", toggleSound);
document.querySelectorAll("[data-upgrade]").forEach((button) => {
  button.addEventListener("click", () => buyUpgrade(button.dataset.upgrade));
});

const keyUpgrades = {
  "1": "tap",
  "2": "time",
  "3": "gold",
  "4": "auto"
};

window.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    startGame();
  }
  if (event.key === " " && state.running) {
    event.preventDefault();
    tapSushi({ clientX: window.innerWidth / 2, clientY: window.innerHeight / 2 });
  }
  if (keyUpgrades[event.key]) {
    event.preventDefault();
    buyUpgrade(keyUpgrades[event.key]);
  }
});
