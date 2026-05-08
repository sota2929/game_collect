const canvas = document.querySelector("#game");
const ctx = canvas.getContext("2d");

const W = canvas.width;
const H = canvas.height;
const FINAL_WAVE = 200;
const buildCells = [];
const grid = {
  cols: 10,
  rows: 14,
  size: 64,
  offsetX: 40,
  offsetY: 32,
  starts: [
    { c: 4, r: 0 },
    { c: 5, r: 0 },
  ],
};
const bg = new Image();
bg.src = "assets/board-background.png";

const ui = {
  wave: document.querySelector("#wave"),
  gold: document.querySelector("#gold"),
  core: document.querySelector("#core"),
  kills: document.querySelector("#kills"),
  towerList: document.querySelector("#towerList"),
  startWave: document.querySelector("#startWave"),
  pause: document.querySelector("#pause"),
  sound: document.querySelector("#sound"),
  speedButtons: document.querySelectorAll(".speed-button"),
  waveState: document.querySelector("#waveState"),
  selection: document.querySelector("#selection"),
  routeInfo: document.querySelector("#routeInfo"),
  speedInfo: document.querySelector("#speedInfo"),
  overlay: document.querySelector("#overlay"),
  overlayTitle: document.querySelector("#overlayTitle"),
  overlayText: document.querySelector("#overlayText"),
  restart: document.querySelector("#restart"),
};

const towerTypes = {
  aster: {
    name: "Aster",
    cost: 65,
    mergeCost: 1500,
    range: 132,
    damage: 18,
    fireRate: 0.48,
    color: "#62e7db",
    accent: "#dffcf7",
    text: "連射型 / 単体火力",
  },
  frost: {
    name: "Frost",
    cost: 95,
    mergeCost: 1700,
    range: 148,
    damage: 9,
    fireRate: 0.88,
    slow: 0.48,
    slowTime: 1.45,
    color: "#8ea7ff",
    accent: "#f5f7ff",
    text: "鈍足型 / 足止め",
  },
  ember: {
    name: "Ember",
    cost: 150,
    mergeCost: 2000,
    range: 116,
    damage: 34,
    fireRate: 1.32,
    splash: 62,
    color: "#f3c760",
    accent: "#fff3bc",
    text: "範囲型 / 群れ対策",
  },
};

let state;
let lastTime = performance.now();
let selectedTower = "aster";
let audio = null;

function createAudio() {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return null;
  const context = new AudioContext();
  const master = context.createGain();
  const bgm = context.createGain();
  const sfx = context.createGain();
  master.gain.value = 0.62;
  bgm.gain.value = 0.22;
  sfx.gain.value = 0.42;
  bgm.connect(master);
  sfx.connect(master);
  master.connect(context.destination);

  return {
    context,
    master,
    bgm,
    sfx,
    muted: false,
    started: false,
    nextBgmNote: 0,
    bgmTimer: null,
  };
}

function ensureAudio() {
  if (!audio) audio = createAudio();
  if (!audio) return;
  if (audio.context.state === "suspended") audio.context.resume();
  if (!audio.started) startBgm();
}

function startBgm() {
  if (!audio || audio.started) return;
  audio.started = true;
  audio.nextBgmNote = audio.context.currentTime + 0.05;
  audio.bgmTimer = window.setInterval(scheduleBgm, 160);
  scheduleBgm();
}

function scheduleBgm() {
  if (!audio || audio.muted) return;
  const now = audio.context.currentTime;
  const notes = [196, 246.94, 293.66, 369.99, 329.63, 246.94, 220, 293.66];
  while (audio.nextBgmNote < now + 0.75) {
    const index = Math.floor((audio.nextBgmNote * 2) % notes.length);
    playTone(notes[index], audio.nextBgmNote, 0.34, "sine", audio.bgm, 0.07, 0.01, 0.28);
    if (index % 4 === 0) {
      playTone(notes[index] / 2, audio.nextBgmNote, 0.72, "triangle", audio.bgm, 0.045, 0.03, 0.54);
    }
    audio.nextBgmNote += 0.48;
  }
}

function playTone(frequency, start, duration, type, destination, volume, attack = 0.008, release = 0.12) {
  if (!audio || audio.muted) return;
  const oscillator = audio.context.createOscillator();
  const gain = audio.context.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, start);
  gain.gain.setValueAtTime(0, start);
  gain.gain.linearRampToValueAtTime(volume, start + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration + release);
  oscillator.connect(gain);
  gain.connect(destination);
  oscillator.start(start);
  oscillator.stop(start + duration + release + 0.03);
}

function playNoise(start, duration, destination, volume, filterFrequency) {
  if (!audio || audio.muted) return;
  const sampleRate = audio.context.sampleRate;
  const buffer = audio.context.createBuffer(1, Math.max(1, sampleRate * duration), sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const source = audio.context.createBufferSource();
  const filter = audio.context.createBiquadFilter();
  const gain = audio.context.createGain();
  filter.type = "bandpass";
  filter.frequency.value = filterFrequency;
  filter.Q.value = 5;
  gain.gain.setValueAtTime(volume, start);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  source.buffer = buffer;
  source.connect(filter);
  filter.connect(gain);
  gain.connect(destination);
  source.start(start);
  source.stop(start + duration);
}

function playAttackSound(type) {
  ensureAudio();
  if (!audio || audio.muted) return;
  const t = audio.context.currentTime;
  if (type === "aster") {
    playTone(740, t, 0.055, "triangle", audio.sfx, 0.22, 0.004, 0.05);
    playTone(1110, t + 0.018, 0.05, "sine", audio.sfx, 0.16, 0.004, 0.05);
  } else if (type === "frost") {
    playTone(520, t, 0.12, "sine", audio.sfx, 0.18, 0.016, 0.18);
    playTone(780, t + 0.035, 0.16, "triangle", audio.sfx, 0.1, 0.02, 0.2);
    playNoise(t, 0.12, audio.sfx, 0.045, 2800);
  } else {
    playTone(160, t, 0.09, "sawtooth", audio.sfx, 0.16, 0.006, 0.1);
    playTone(92, t, 0.12, "triangle", audio.sfx, 0.2, 0.004, 0.12);
    playNoise(t, 0.16, audio.sfx, 0.12, 720);
  }
}

function toggleSound() {
  ensureAudio();
  if (!audio) return;
  audio.muted = !audio.muted;
  const target = audio.muted ? 0.0001 : 0.62;
  audio.master.gain.cancelScheduledValues(audio.context.currentTime);
  audio.master.gain.setTargetAtTime(target, audio.context.currentTime, 0.035);
  ui.sound.textContent = audio.muted ? "Sound Off" : "Sound On";
}

function createBuildCells() {
  buildCells.length = 0;
  for (let r = 1; r < grid.rows - 1; r++) {
    for (let c = 0; c < grid.cols; c++) {
      const point = cellToPoint(c, r);
      buildCells.push({ c, r, x: point.x, y: point.y, occupied: false });
    }
  }
}

function resetGame() {
  createBuildCells();
  state = {
    gold: 220,
    core: 10,
    kills: 0,
    wave: 1,
    waveActive: false,
    spawning: false,
    spawnTimer: 0,
    spawnIndex: 0,
    spawnQueue: [],
    enemies: [],
    towers: [],
    shots: [],
    particles: [],
    route: [],
    routeDistance: 0,
    speed: 1,
    dragging: null,
    suppressClick: false,
    paused: false,
    gameOver: false,
    won: false,
    messageTimer: 0,
  };
  recalcRoute();
  ui.overlay.classList.add("hidden");
  syncUi();
}

function cellToPoint(c, r) {
  return {
    x: grid.offsetX + c * grid.size + grid.size / 2,
    y: grid.offsetY + r * grid.size + grid.size / 2,
  };
}

function pointToCell(x, y) {
  const c = Math.floor((x - grid.offsetX) / grid.size);
  const r = Math.floor((y - grid.offsetY) / grid.size);
  if (c < 0 || c >= grid.cols || r < 0 || r >= grid.rows) return null;
  return { c, r };
}

function cellKey(c, r) {
  return `${c},${r}`;
}

function blockedSet(extra = null) {
  const blocked = new Set(state.towers.map((tower) => cellKey(tower.c, tower.r)));
  if (extra) blocked.add(cellKey(extra.c, extra.r));
  return blocked;
}

function findRoute(extraBlock = null) {
  const blocked = blockedSet(extraBlock);
  const starts = grid.starts.filter((start) => !blocked.has(cellKey(start.c, start.r)));
  const queue = starts.map((start) => ({ ...start }));
  const cameFrom = new Map();
  const seen = new Set(queue.map((start) => cellKey(start.c, start.r)));
  let goal = null;

  while (queue.length) {
    const current = queue.shift();
    if (current.r === grid.rows - 1) {
      goal = current;
      break;
    }
    [
      { c: current.c + 1, r: current.r },
      { c: current.c - 1, r: current.r },
      { c: current.c, r: current.r + 1 },
      { c: current.c, r: current.r - 1 },
    ].forEach((next) => {
      const key = cellKey(next.c, next.r);
      if (
        next.c < 0 ||
        next.c >= grid.cols ||
        next.r < 0 ||
        next.r >= grid.rows ||
        seen.has(key) ||
        blocked.has(key)
      ) {
        return;
      }
      seen.add(key);
      cameFrom.set(key, current);
      queue.push(next);
    });
  }

  if (!goal) return null;
  const cells = [];
  let current = goal;
  while (current) {
    cells.unshift(current);
    current = cameFrom.get(cellKey(current.c, current.r));
  }
  return cells.map((routeCell) => cellToPoint(routeCell.c, routeCell.r));
}

function routeDistance(route) {
  let distance = 0;
  for (let i = 1; i < route.length; i++) {
    distance += Math.hypot(route[i].x - route[i - 1].x, route[i].y - route[i - 1].y);
  }
  return distance;
}

function recalcRoute(extraBlock = null) {
  const route = findRoute(extraBlock);
  if (!route) return false;
  state.route = route;
  state.routeDistance = routeDistance(route);
  return true;
}

function rerouteEnemies() {
  state.enemies.forEach((enemy) => {
    if (enemy.flying) return;
    enemy.path = state.route;
    enemy.targetIndex = nextRouteIndex(enemy, enemy.y);
  });
}

function nextRouteIndex(enemy, minY) {
  let bestIndex = 1;
  let bestScore = Infinity;
  for (let i = 1; i < state.route.length; i++) {
    const point = state.route[i];
    const forwardPenalty = point.y < minY - 28 ? 900 : 0;
    const score = Math.hypot(point.x - enemy.x, point.y - enemy.y) + forwardPenalty;
    if (score < bestScore) {
      bestScore = score;
      bestIndex = i;
    }
  }
  return bestIndex;
}

function wavePlan(wave) {
  const queue = [];
  const common = Math.min(42, 10 + Math.floor(wave * 0.55));
  for (let i = 0; i < common; i++) queue.push("skitter");
  if (wave >= 2) for (let i = 0; i < Math.min(32, 3 + Math.floor(wave * 0.38)); i++) queue.push("guard");
  if (wave >= 4) for (let i = 0; i < Math.min(24, 2 + Math.floor(wave * 0.24)); i++) queue.push("runner");
  if (wave >= 6) for (let i = 0; i < Math.min(18, 1 + Math.floor(wave * 0.14)); i++) queue.push("bulwark");
  if (wave >= 8) for (let i = 0; i < Math.min(12, 1 + Math.floor(wave * 0.08)); i++) queue.push("breaker");
  if (wave >= 10) for (let i = 0; i < Math.min(14, 1 + Math.floor(wave * 0.09)); i++) queue.push("wraith");
  return queue.sort(() => Math.random() - 0.42);
}

function makeEnemy(kind, wave) {
  const start = state.route[0];
  const scale = 1.25 + (wave - 1) * 0.075 + Math.pow(Math.max(0, wave - 25), 1.18) * 0.012;
  const rewardScale = Math.max(0.32, 0.68 - wave * 0.0014);
  const types = {
    skitter: { hp: 78, speed: 47, reward: 9, radius: 15, color: "#ff7d73" },
    guard: { hp: 158, speed: 34, reward: 15, radius: 19, color: "#ffb35d" },
    runner: { hp: 104, speed: 68, reward: 13, radius: 14, color: "#f5649a" },
    bulwark: { hp: 330, speed: 27, reward: 29, radius: 23, color: "#c687ff" },
    breaker: {
      hp: 250,
      speed: 31,
      reward: 24,
      radius: 21,
      color: "#ff4f43",
      attackRange: 66,
      huntRange: 190,
    },
    wraith: { hp: 128, speed: 62, reward: 16, radius: 17, color: "#69f5ff", flying: true },
  };
  const base = types[kind];
  const reward = Math.max(3, Math.round(base.reward * rewardScale));
  const flyingX = W / 2 + Math.sin(wave * 1.7 + Math.random() * 2) * 42;
  return {
    ...base,
    kind,
    x: base.flying ? flyingX : start.x + (Math.random() - 0.5) * 18,
    y: -30 - Math.random() * 24,
    path: state.route,
    targetIndex: 0,
    maxHp: Math.round(base.hp * scale),
    hp: Math.round(base.hp * scale),
    reward,
    slow: 0,
    slowTimer: 0,
    attackTimer: 0,
    attackTarget: null,
    wobble: Math.random() * Math.PI * 2,
  };
}

function startWave() {
  if (state.gameOver || state.waveActive || state.spawning) return;
  ensureAudio();
  state.spawnQueue = wavePlan(state.wave);
  state.spawnIndex = 0;
  state.spawnTimer = 0.2;
  state.spawning = true;
  state.waveActive = true;
  ui.startWave.disabled = true;
  syncUi();
}

function syncUi() {
  ui.wave.textContent = state.wave;
  ui.gold.textContent = state.gold;
  ui.core.textContent = state.core;
  ui.kills.textContent = state.kills;
  ui.pause.textContent = state.paused ? "Resume" : "Pause";
  ui.startWave.disabled = state.waveActive || state.gameOver;
  ui.waveState.textContent = state.waveActive ? "Enemy descent" : "Ready";
  ui.selection.textContent = `${towerTypes[selectedTower].name} selected`;
  ui.routeInfo.textContent = `Route ${Math.round(state.routeDistance / grid.size)} tiles`;
  ui.speedInfo.textContent = `Speed ${state.speed}x`;
  ui.speedButtons.forEach((button) => {
    button.classList.toggle("selected", Number(button.dataset.speed) === state.speed);
  });
  renderTowerCards();
}

function renderTowerCards() {
  ui.towerList.innerHTML = "";
  Object.entries(towerTypes).forEach(([key, tower]) => {
    const card = document.createElement("button");
    card.className = `tower-card ${selectedTower === key ? "selected" : ""}`;
    card.type = "button";
    card.dataset.tower = key;
    card.innerHTML = `
      <span class="tower-icon" style="background: radial-gradient(circle at 36% 30%, ${tower.accent}, ${tower.color} 46%, #13231f 76%)"></span>
      <span><h3>${tower.name}</h3><p>${tower.text}<br>Range ${tower.range} / Dmg ${tower.damage} / Lvで2倍</p></span>
      <span class="cost">${tower.cost}</span>
    `;
    card.addEventListener("click", () => {
      selectedTower = key;
      syncUi();
    });
    ui.towerList.appendChild(card);
  });
}

function canvasPoint(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((event.clientX - rect.left) / rect.width) * W,
    y: ((event.clientY - rect.top) / rect.height) * H,
  };
}

function towerDamage(type, level) {
  return towerTypes[type].damage * 2 ** (level - 1);
}

function towerAtPoint(x, y, except = null) {
  return state.towers.find((tower) => tower !== except && Math.hypot(tower.x - x, tower.y - y) <= 30);
}

function spotForTower(tower) {
  return buildCells.find((spot) => spot.c === tower.c && spot.r === tower.r);
}

function placeTower(event) {
  if (state.gameOver) return;
  if (state.suppressClick) {
    state.suppressClick = false;
    return;
  }
  ensureAudio();
  const p = canvasPoint(event);
  const picked = pointToCell(p.x, p.y);
  const spot = picked
    ? buildCells.find((s) => s.c === picked.c && s.r === picked.r && !s.occupied)
    : null;
  const type = towerTypes[selectedTower];
  if (!spot || state.gold < type.cost) {
    pulseText(p.x, p.y, state.gold < type.cost ? "Need gold" : "Build zone");
    return;
  }
  if (state.enemies.some((enemy) => Math.hypot(enemy.x - spot.x, enemy.y - spot.y) < 40)) {
    pulseText(spot.x, spot.y, "Enemy here");
    return;
  }
  if (!recalcRoute(spot)) {
    pulseText(spot.x, spot.y, "Path blocked");
    return;
  }
  spot.occupied = true;
  state.gold -= type.cost;
  state.towers.push({
    type: selectedTower,
    c: spot.c,
    r: spot.r,
    x: spot.x,
    y: spot.y,
    hp: 120,
    maxHp: 120,
    cooldown: 0.2,
    level: 1,
  });
  recalcRoute();
  rerouteEnemies();
  burst(spot.x, spot.y, type.color, 16);
  syncUi();
}

function startTowerDrag(event) {
  if (state.gameOver) return;
  const p = canvasPoint(event);
  const tower = towerAtPoint(p.x, p.y);
  if (!tower) return;
  event.preventDefault();
  state.dragging = {
    tower,
    startX: p.x,
    startY: p.y,
    x: p.x,
    y: p.y,
    moved: false,
  };
}

function moveTowerDrag(event) {
  if (!state.dragging) return;
  const p = canvasPoint(event);
  state.dragging.x = p.x;
  state.dragging.y = p.y;
  if (Math.hypot(p.x - state.dragging.startX, p.y - state.dragging.startY) > 6) {
    state.dragging.moved = true;
  }
}

function endTowerDrag(event) {
  if (!state.dragging) return;
  const drag = state.dragging;
  const p = canvasPoint(event);
  const target = towerAtPoint(p.x, p.y, drag.tower);
  if (drag.moved && target) mergeTowers(drag.tower, target);
  state.suppressClick = true;
  state.dragging = null;
}

function mergeTowers(source, target) {
  const type = towerTypes[target.type];
  if (source.type !== target.type || source.level !== target.level) {
    pulseText(target.x, target.y - 26, "Same type/Lv");
    return false;
  }
  if (target.level >= 5) {
    pulseText(target.x, target.y - 26, "Max Lv");
    return false;
  }
  if (state.gold < type.mergeCost) {
    pulseText(target.x, target.y - 26, `Need ${type.mergeCost}G`);
    syncUi();
    return false;
  }

  const sourceIndex = state.towers.indexOf(source);
  if (sourceIndex === -1) return false;
  state.gold -= type.mergeCost;
  state.towers.splice(sourceIndex, 1);
  const sourceSpot = spotForTower(source);
  if (sourceSpot) sourceSpot.occupied = false;

  target.level += 1;
  target.hp = target.maxHp;
  target.cooldown = Math.min(target.cooldown, 0.12);
  burst(target.x, target.y, type.color, 34);
  burst(target.x, target.y, type.accent, 16);
  pulseText(target.x, target.y - 30, `${type.name}${target.level}`);
  recalcRoute();
  rerouteEnemies();
  syncUi();
  return true;
}

function update(dt) {
  if (state.paused || state.gameOver) return;

  if (state.spawning) {
    state.spawnTimer -= dt;
    if (state.spawnTimer <= 0 && state.spawnIndex < state.spawnQueue.length) {
      state.enemies.push(makeEnemy(state.spawnQueue[state.spawnIndex], state.wave));
      state.spawnIndex += 1;
      state.spawnTimer = Math.max(0.34, 0.92 - state.wave * 0.035);
    }
    if (state.spawnIndex >= state.spawnQueue.length) state.spawning = false;
  }

  state.enemies.forEach((enemy) => {
    if (enemy.slowTimer > 0) {
      enemy.slowTimer -= dt;
    } else {
      enemy.slow = 0;
    }
    if (enemy.kind === "breaker" && updateBreaker(enemy, dt)) return;
    moveEnemy(enemy, dt);
  });

  for (let i = state.enemies.length - 1; i >= 0; i--) {
    const enemy = state.enemies[i];
    if (enemy.y > H + 26) {
      state.enemies.splice(i, 1);
      state.core -= 1;
      burst(enemy.x, H - 22, "#ff6f69", 18);
      if (state.core <= 0) endGame(false);
    }
  }

  state.towers.forEach((tower) => {
    const type = towerTypes[tower.type];
    tower.cooldown -= dt;
    if (tower.cooldown > 0) return;
    const target = state.enemies
      .filter((enemy) => Math.hypot(enemy.x - tower.x, enemy.y - tower.y) <= type.range)
      .sort((a, b) => b.y - a.y)[0];
    if (!target) return;
    tower.cooldown = type.fireRate;
    state.shots.push({
      x: tower.x,
      y: tower.y,
      target,
      speed: tower.type === "ember" ? 440 : 560,
      type: tower.type,
      color: type.color,
      damage: towerDamage(tower.type, tower.level),
    });
    playAttackSound(tower.type);
  });

  for (let i = state.shots.length - 1; i >= 0; i--) {
    const shot = state.shots[i];
    if (!state.enemies.includes(shot.target)) {
      state.shots.splice(i, 1);
      continue;
    }
    const dx = shot.target.x - shot.x;
    const dy = shot.target.y - shot.y;
    const dist = Math.hypot(dx, dy);
    const step = shot.speed * dt;
    if (dist <= step) {
      hitEnemy(shot);
      state.shots.splice(i, 1);
    } else {
      shot.x += (dx / dist) * step;
      shot.y += (dy / dist) * step;
    }
  }

  for (let i = state.enemies.length - 1; i >= 0; i--) {
    const enemy = state.enemies[i];
    if (enemy.hp <= 0) {
      state.gold += enemy.reward;
      state.kills += 1;
      burst(enemy.x, enemy.y, enemy.color, 20);
      pulseText(enemy.x, enemy.y - 18, `+${enemy.reward}`);
      state.enemies.splice(i, 1);
      syncUi();
    }
  }

  state.particles.forEach((p) => {
    p.life -= dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += 32 * dt;
  });
  state.particles = state.particles.filter((p) => p.life > 0);

  if (state.waveActive && !state.spawning && state.enemies.length === 0) {
    state.waveActive = false;
    state.gold += Math.max(12, Math.round(24 + state.wave * 1.6));
    state.wave += 1;
    if (state.wave > FINAL_WAVE) endGame(true);
    syncUi();
  }
}

function moveEnemy(enemy, dt) {
  if (enemy.flying) {
    const speed = enemy.speed * (1 - enemy.slow * 0.45);
    const glide = Math.sin(performance.now() / 420 + enemy.wobble) * 36;
    enemy.x += (W / 2 + glide - enemy.x) * 0.035;
    enemy.y += speed * dt;
    return;
  }
  if (!enemy.path.length) return;
  if (enemy.targetIndex < 0) enemy.targetIndex = 0;
  const speed = enemy.speed * (1 - enemy.slow);
  let remaining = speed * dt;
  while (remaining > 0 && enemy.targetIndex < enemy.path.length) {
    const target = enemy.path[enemy.targetIndex];
    const dx = target.x - enemy.x;
    const dy = target.y - enemy.y;
    const dist = Math.hypot(dx, dy);
    if (dist <= remaining) {
      enemy.x = target.x;
      enemy.y = target.y;
      enemy.targetIndex += 1;
      remaining -= dist;
    } else {
      enemy.x += (dx / dist) * remaining;
      enemy.y += (dy / dist) * remaining;
      remaining = 0;
    }
  }
  if (enemy.targetIndex >= enemy.path.length) {
    enemy.y += speed * dt;
  }
}

function updateBreaker(enemy, dt) {
  const target = findBreakerTarget(enemy);

  if (!target) {
    enemy.attackTarget = null;
    return false;
  }

  enemy.attackTarget = target;
  const dx = target.x - enemy.x;
  const dy = target.y - enemy.y;
  const dist = Math.hypot(dx, dy);

  if (dist > enemy.attackRange) {
    const step = enemy.speed * 1.65 * (1 - enemy.slow * 0.45) * dt;
    enemy.x += (dx / dist) * Math.min(step, dist - enemy.attackRange + 4);
    enemy.y += (dy / dist) * Math.min(step, dist - enemy.attackRange + 4);
    return true;
  }

  enemy.x += dx * 0.18;
  enemy.y += dy * 0.18;
  explodeBreaker(enemy, target);
  return true;
}

function explodeBreaker(enemy, target) {
  const blastX = (enemy.x + target.x) / 2;
  const blastY = (enemy.y + target.y) / 2;
  burst(blastX, blastY, "#ff5b49", 58);
  burst(blastX, blastY, "#ffefba", 24);
  pulseText(blastX, blastY - 34, "BOOM");
  destroyTower(target);
  const enemyIndex = state.enemies.indexOf(enemy);
  if (enemyIndex !== -1) state.enemies.splice(enemyIndex, 1);
}

function findBreakerTarget(enemy) {
  return state.towers
    .filter((tower) => {
      const distance = Math.hypot(tower.x - enemy.x, tower.y - enemy.y);
      const ahead = tower.y > enemy.y - grid.size * 1.2;
      return ahead && distance <= enemy.huntRange;
    })
    .sort((a, b) => {
      const distanceA = Math.hypot(a.x - enemy.x, a.y - enemy.y);
      const distanceB = Math.hypot(b.x - enemy.x, b.y - enemy.y);
      const routeBiasA = Math.abs(a.y - enemy.y) * 0.35;
      const routeBiasB = Math.abs(b.y - enemy.y) * 0.35;
      return distanceA + routeBiasA - (distanceB + routeBiasB);
    })[0];
}

function destroyTower(tower) {
  const index = state.towers.indexOf(tower);
  if (index === -1) return;
  state.towers.splice(index, 1);
  const spot = buildCells.find((cell) => cell.c === tower.c && cell.r === tower.r);
  if (spot) spot.occupied = false;
  burst(tower.x, tower.y, "#ff5b49", 32);
  pulseText(tower.x, tower.y - 24, "Broken");
  recalcRoute();
  rerouteEnemies();
}

function hitEnemy(shot) {
  const type = towerTypes[shot.type];
  if (type.splash) {
    state.enemies.forEach((enemy) => {
      const dist = Math.hypot(enemy.x - shot.target.x, enemy.y - shot.target.y);
      if (dist <= type.splash) enemy.hp -= shot.damage * (1 - dist / (type.splash * 1.7));
    });
    burst(shot.target.x, shot.target.y, type.color, 12);
    return;
  }
  shot.target.hp -= shot.damage;
  if (type.slow) {
    shot.target.slow = Math.max(shot.target.slow, type.slow);
    shot.target.slowTimer = type.slowTime;
  }
  burst(shot.target.x, shot.target.y, type.color, 5);
}

function endGame(won) {
  state.gameOver = true;
  state.won = won;
  ui.overlayTitle.textContent = won ? "Victory" : "Game Over";
  ui.overlayText.textContent = won
    ? `All ${FINAL_WAVE} waves were repelled.`
    : "The crystal line was breached.";
  ui.overlay.classList.remove("hidden");
  syncUi();
}

function burst(x, y, color, count) {
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = 28 + Math.random() * 86;
    state.particles.push({
      x,
      y,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s,
      life: 0.32 + Math.random() * 0.32,
      max: 0.64,
      size: 2 + Math.random() * 4,
      color,
      text: null,
    });
  }
}

function pulseText(x, y, text) {
  state.particles.push({
    x,
    y,
    vx: 0,
    vy: -28,
    life: 0.85,
    max: 0.85,
    size: 15,
    color: "#f3c760",
    text,
  });
}

function draw() {
  ctx.clearRect(0, 0, W, H);
  if (bg.complete) ctx.drawImage(bg, 0, 0, W, H);
  else {
    ctx.fillStyle = "#0a1714";
    ctx.fillRect(0, 0, W, H);
  }

  drawPathGlow();
  drawRouteLine();
  drawBuildSpots();
  state.towers.forEach(drawTower);
  drawDraggingTower();
  state.enemies.forEach(drawEnemy);
  state.shots.forEach(drawShot);
  drawParticles();
  drawBottomLine();
}

function drawPathGlow() {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, "rgba(98, 231, 219, 0.16)");
  g.addColorStop(0.6, "rgba(243, 199, 96, 0.07)");
  g.addColorStop(1, "rgba(255, 111, 105, 0.17)");
  ctx.fillStyle = g;
  roundRect(250, 0, 220, H, 24);
  ctx.fill();
  ctx.strokeStyle = "rgba(135, 225, 194, 0.22)";
  ctx.lineWidth = 2;
  ctx.stroke();
}

function drawRouteLine() {
  if (state.route.length < 2) return;
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = "rgba(243, 199, 96, 0.22)";
  ctx.lineWidth = 36;
  ctx.beginPath();
  state.route.forEach((point, index) => {
    if (index === 0) ctx.moveTo(point.x, point.y);
    else ctx.lineTo(point.x, point.y);
  });
  ctx.stroke();
  ctx.strokeStyle = "rgba(98, 231, 219, 0.48)";
  ctx.lineWidth = 4;
  ctx.setLineDash([12, 14]);
  ctx.lineDashOffset = -performance.now() / 80;
  ctx.stroke();
  ctx.restore();
}

function drawBuildSpots() {
  buildCells.forEach((spot) => {
    if (spot.occupied) return;
    ctx.save();
    ctx.translate(spot.x, spot.y);
    const onRoute = state.route.some((point) => Math.hypot(point.x - spot.x, point.y - spot.y) < 4);
    ctx.strokeStyle = onRoute ? "rgba(243, 199, 96, 0.48)" : "rgba(135, 225, 194, 0.26)";
    ctx.fillStyle = onRoute ? "rgba(243, 199, 96, 0.12)" : "rgba(8, 18, 15, 0.2)";
    ctx.lineWidth = onRoute ? 2.5 : 1.5;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI / 3) * i + Math.PI / 6;
      const x = Math.cos(a) * 23;
      const y = Math.sin(a) * 23;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  });
}

function drawTower(tower) {
  const type = towerTypes[tower.type];
  const levelScale = 1 + (tower.level - 1) * 0.08;
  const pulse = 1 + Math.sin(performance.now() / 250 + tower.x) * 0.05;
  const spin = performance.now() / 950;
  ctx.save();
  ctx.translate(tower.x, tower.y);
  ctx.globalAlpha = 0.72;
  ctx.strokeStyle = `${type.color}44`;
  ctx.lineWidth = 1.5;
  ctx.setLineDash([8, 12]);
  ctx.beginPath();
  ctx.arc(0, 0, type.range, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.globalAlpha = state.dragging?.tower === tower ? 0.32 : 1;

  const base = ctx.createRadialGradient(-8, -10, 4, 0, 4, 34);
  base.addColorStop(0, "rgba(220, 255, 242, 0.26)");
  base.addColorStop(0.45, "rgba(15, 45, 39, 0.94)");
  base.addColorStop(1, "rgba(2, 9, 8, 0.96)");
  drawHex(0, 5, 29 * levelScale, base, "rgba(191, 226, 203, 0.56)", 2);
  drawHex(0, 5, 21 * levelScale, "rgba(6, 18, 16, 0.72)", `${type.color}88`, 1.5);

  if (tower.type === "aster") {
    ctx.save();
    ctx.rotate(-0.14);
    drawBarrel(-7, -8, 8, 30, type.color);
    drawBarrel(7, -8, 8, 30, type.color);
    ctx.restore();
    drawCrystal(0, -13, 12 * pulse * levelScale, 24 * pulse * levelScale, type.color, type.accent);
    ctx.strokeStyle = `${type.accent}88`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, -5, 17, -0.2, Math.PI + 0.2);
    ctx.stroke();
  } else if (tower.type === "frost") {
    ctx.save();
    ctx.rotate(spin);
    for (let i = 0; i < 6; i++) {
      ctx.rotate(Math.PI / 3);
      drawCrystal(0, -18, 5, 13, "#b9c8ff", type.accent);
    }
    ctx.restore();
    ctx.strokeStyle = "rgba(198, 214, 255, 0.82)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, -3, 16 * pulse, 0, Math.PI * 2);
    ctx.stroke();
    drawCrystal(0, -2, 10 * pulse * levelScale, 19 * pulse * levelScale, type.color, type.accent);
  } else {
    ctx.save();
    ctx.rotate(0.08);
    drawBarrel(0, -9, 15, 29, "#f2a64f");
    ctx.restore();
    ctx.fillStyle = "rgba(255, 132, 67, 0.22)";
    ctx.beginPath();
    ctx.arc(0, -14, 23 + Math.sin(spin * 2) * 2, 0, Math.PI * 2);
    ctx.fill();
    drawFlame(0, -16, 17 * pulse * levelScale, type.color, type.accent);
  }

  drawTowerLevelBadge(tower, type);

  ctx.fillStyle = type.accent;
  ctx.shadowBlur = 16;
  ctx.shadowColor = type.color;
  ctx.beginPath();
  ctx.arc(-5, -4, 3.4, 0, Math.PI * 2);
  ctx.arc(6, -1, 2.6, 0, Math.PI * 2);
  ctx.fill();

  if (tower.hp < tower.maxHp) {
    const hpRatio = Math.max(0, tower.hp / tower.maxHp);
    ctx.shadowBlur = 0;
    ctx.fillStyle = "rgba(3, 8, 7, 0.86)";
    roundRect(-22, 28, 44, 5, 3);
    ctx.fill();
    ctx.fillStyle = hpRatio < 0.35 ? "#ff6f69" : "#f3c760";
    roundRect(-22, 28, 44 * hpRatio, 5, 3);
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 111, 105, 0.72)";
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(-10, 13);
    ctx.lineTo(-2, 5);
    ctx.lineTo(5, 13);
    ctx.moveTo(8, 18);
    ctx.lineTo(14, 10);
    ctx.stroke();
  }
  ctx.restore();
}

function drawDraggingTower() {
  const drag = state.dragging;
  if (!drag?.moved) return;
  const tower = drag.tower;
  const target = towerAtPoint(drag.x, drag.y, tower);
  ctx.save();
  ctx.globalAlpha = 0.78;
  ctx.translate(drag.x, drag.y);
  const type = towerTypes[tower.type];
  drawHex(0, 4, 30, "rgba(6, 18, 16, 0.86)", `${type.color}cc`, 2.2);
  drawCrystal(0, -9, 13, 25, type.color, type.accent);
  ctx.fillStyle = type.accent;
  ctx.font = "900 14px Inter, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(`Lv${tower.level}`, 0, 30);
  ctx.restore();

  if (target) {
    const canMerge = target.type === tower.type && target.level === tower.level && target.level < 5;
    ctx.save();
    ctx.strokeStyle = canMerge ? "#f3c760" : "#ff6f69";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(target.x, target.y, 36, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

function drawTowerLevelBadge(tower, type) {
  ctx.save();
  ctx.shadowBlur = 0;
  ctx.fillStyle = "rgba(3, 8, 7, 0.82)";
  roundRect(11, -32, 28, 18, 7);
  ctx.fill();
  ctx.strokeStyle = tower.level >= 5 ? "#f3c760" : `${type.color}aa`;
  ctx.lineWidth = 1.4;
  ctx.stroke();
  ctx.fillStyle = tower.level >= 5 ? "#f3c760" : type.accent;
  ctx.font = "900 11px Inter, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(`Lv${tower.level}`, 25, -19);
  ctx.restore();
}

function drawEnemy(enemy) {
  const hpRatio = Math.max(0, enemy.hp / enemy.maxHp);
  const bob = Math.sin(performance.now() / 150 + enemy.wobble) * 1.4;
  const armor = enemy.slow > 0 ? "#dfe8ff" : "#2a1414";
  const eye = enemy.slow > 0 ? "#d9e4ff" : "#ffe9b6";
  ctx.save();
  ctx.translate(enemy.x, enemy.y + bob);
  ctx.fillStyle = "rgba(0, 0, 0, 0.28)";
  ctx.beginPath();
  ctx.ellipse(
    0,
    enemy.radius * (enemy.flying ? 1.35 : 0.9),
    enemy.radius * (enemy.flying ? 1.35 : 1.05),
    enemy.radius * 0.38,
    0,
    0,
    Math.PI * 2,
  );
  ctx.fill();

  const body = ctx.createRadialGradient(-6, -8, 2, 0, 0, enemy.radius * 1.45);
  body.addColorStop(0, "#ffd7b8");
  body.addColorStop(0.2, enemy.color);
  body.addColorStop(1, "#371417");
  ctx.fillStyle = body;
  ctx.strokeStyle = armor;
  ctx.lineWidth = 2.6;

  if (enemy.kind === "wraith") {
    drawEnemyWraith(enemy.radius, eye);
  } else if (enemy.kind === "breaker") {
    drawEnemyBreaker(enemy.radius, eye, enemy.attackTarget);
  } else if (enemy.kind === "runner") {
    drawEnemyRunner(enemy.radius, eye);
  } else if (enemy.kind === "guard") {
    drawEnemyGuard(enemy.radius, eye);
  } else if (enemy.kind === "bulwark") {
    drawEnemyBulwark(enemy.radius, eye);
  } else {
    drawEnemySkitter(enemy.radius, eye);
  }

  ctx.fillStyle = "rgba(8, 12, 10, 0.86)";
  roundRect(-23, -enemy.radius - 14, 46, 5, 3);
  ctx.fill();
  ctx.fillStyle = enemy.slow > 0 ? "#9fb3ff" : "#7df0bc";
  roundRect(-23, -enemy.radius - 14, 46 * hpRatio, 5, 3);
  ctx.fill();
  ctx.restore();
}

function drawHex(x, y, radius, fill, stroke, lineWidth) {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = Math.PI / 6 + (Math.PI / 3) * i;
    const px = x + Math.cos(a) * radius;
    const py = y + Math.sin(a) * radius;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = stroke;
  ctx.lineWidth = lineWidth;
  ctx.stroke();
}

function drawCrystal(x, y, width, height, color, accent) {
  const gem = ctx.createLinearGradient(x - width, y - height, x + width, y + height);
  gem.addColorStop(0, accent);
  gem.addColorStop(0.48, color);
  gem.addColorStop(1, "#16352e");
  ctx.fillStyle = gem;
  ctx.strokeStyle = "rgba(230, 255, 246, 0.72)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x, y - height / 2);
  ctx.lineTo(x + width / 2, y - height * 0.08);
  ctx.lineTo(x + width * 0.32, y + height / 2);
  ctx.lineTo(x - width * 0.32, y + height / 2);
  ctx.lineTo(x - width / 2, y - height * 0.08);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

function drawBarrel(x, y, width, height, color) {
  ctx.fillStyle = "rgba(5, 15, 13, 0.92)";
  roundRect(x - width / 2 - 3, y - 1, width + 6, height, 5);
  ctx.fill();
  const barrel = ctx.createLinearGradient(x - width / 2, y, x + width / 2, y + height);
  barrel.addColorStop(0, "#e7fff6");
  barrel.addColorStop(0.18, color);
  barrel.addColorStop(1, "#0e2722");
  ctx.fillStyle = barrel;
  roundRect(x - width / 2, y, width, height, 4);
  ctx.fill();
  ctx.strokeStyle = `${color}aa`;
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

function drawFlame(x, y, size, color, accent) {
  ctx.save();
  ctx.shadowBlur = 18;
  ctx.shadowColor = color;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, y - size);
  ctx.bezierCurveTo(x + size * 0.85, y - size * 0.18, x + size * 0.52, y + size * 0.78, x, y + size);
  ctx.bezierCurveTo(x - size * 0.76, y + size * 0.36, x - size * 0.62, y - size * 0.2, x, y - size);
  ctx.fill();
  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.moveTo(x, y - size * 0.48);
  ctx.bezierCurveTo(x + size * 0.34, y, x + size * 0.18, y + size * 0.48, x, y + size * 0.58);
  ctx.bezierCurveTo(x - size * 0.32, y + size * 0.22, x - size * 0.2, y - size * 0.12, x, y - size * 0.48);
  ctx.fill();
  ctx.restore();
}

function drawEnemySkitter(r, eye) {
  ctx.beginPath();
  ctx.moveTo(0, -r * 1.08);
  ctx.lineTo(r * 0.92, -r * 0.14);
  ctx.lineTo(r * 0.52, r * 0.9);
  ctx.lineTo(0, r * 1.12);
  ctx.lineTo(-r * 0.52, r * 0.9);
  ctx.lineTo(-r * 0.92, -r * 0.14);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  drawEnemyEyes(eye, r * 0.38, -r * 0.18, 3);
  drawClaws(r, 3);
}

function drawEnemyRunner(r, eye) {
  ctx.beginPath();
  ctx.moveTo(0, -r * 1.38);
  ctx.lineTo(r * 0.68, -r * 0.18);
  ctx.lineTo(r * 0.28, r * 1.16);
  ctx.lineTo(0, r * 0.78);
  ctx.lineTo(-r * 0.28, r * 1.16);
  ctx.lineTo(-r * 0.68, -r * 0.18);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = "rgba(255, 233, 182, 0.62)";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(-r * 0.65, r * 0.72);
  ctx.lineTo(-r * 1.02, r * 1.28);
  ctx.moveTo(r * 0.65, r * 0.72);
  ctx.lineTo(r * 1.02, r * 1.28);
  ctx.stroke();
  drawEnemyEyes(eye, r * 0.26, -r * 0.34, 2.7);
}

function drawEnemyGuard(r, eye) {
  drawHex(0, 0, r * 1.05, ctx.fillStyle, ctx.strokeStyle, 2.8);
  ctx.fillStyle = "rgba(255, 228, 177, 0.24)";
  ctx.beginPath();
  ctx.moveTo(0, -r * 0.9);
  ctx.lineTo(r * 0.58, -r * 0.1);
  ctx.lineTo(0, r * 0.58);
  ctx.lineTo(-r * 0.58, -r * 0.1);
  ctx.closePath();
  ctx.fill();
  drawEnemyEyes(eye, r * 0.36, -r * 0.06, 3.2);
}

function drawEnemyBulwark(r, eye) {
  drawHex(0, 0, r * 1.1, ctx.fillStyle, ctx.strokeStyle, 3.2);
  ctx.strokeStyle = "rgba(255, 233, 182, 0.42)";
  ctx.lineWidth = 2;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.arc(0, 0, r * (0.42 + i * 0.22), 0.25, Math.PI * 1.75);
    ctx.stroke();
  }
  drawHex(0, -r * 0.08, r * 0.46, "rgba(15, 13, 25, 0.72)", "rgba(255,255,255,0.35)", 1.4);
  drawEnemyEyes(eye, r * 0.28, -r * 0.08, 3.4);
}

function drawEnemyBreaker(r, eye, attacking) {
  drawHex(0, 0, r * 1.08, ctx.fillStyle, "#3d0d0b", 3.2);
  ctx.fillStyle = attacking ? "rgba(255, 120, 76, 0.36)" : "rgba(255, 215, 170, 0.2)";
  ctx.beginPath();
  ctx.moveTo(0, -r * 1.05);
  ctx.lineTo(r * 0.7, -r * 0.12);
  ctx.lineTo(r * 0.34, r * 0.74);
  ctx.lineTo(0, r * 0.42);
  ctx.lineTo(-r * 0.34, r * 0.74);
  ctx.lineTo(-r * 0.7, -r * 0.12);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = attacking ? "#ffefba" : "rgba(255, 232, 185, 0.68)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-r * 0.72, r * 0.04);
  ctx.lineTo(-r * 1.32, r * 0.42);
  ctx.lineTo(-r * 1.08, r * 0.74);
  ctx.moveTo(r * 0.72, r * 0.04);
  ctx.lineTo(r * 1.32, r * 0.42);
  ctx.lineTo(r * 1.08, r * 0.74);
  ctx.stroke();

  ctx.fillStyle = "#ff5b49";
  ctx.shadowBlur = 12;
  ctx.shadowColor = "#ff5b49";
  ctx.beginPath();
  ctx.arc(0, r * 0.04, r * 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  drawEnemyEyes(eye, r * 0.32, -r * 0.22, 3.2);
}

function drawEnemyWraith(r, eye) {
  ctx.save();
  ctx.globalAlpha = 0.9;
  ctx.fillStyle = "rgba(105, 245, 255, 0.2)";
  ctx.strokeStyle = "rgba(209, 255, 252, 0.72)";
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(-r * 0.3, -r * 0.16);
  ctx.bezierCurveTo(-r * 1.65, -r * 1.15, -r * 2.05, r * 0.05, -r * 0.58, r * 0.44);
  ctx.moveTo(r * 0.3, -r * 0.16);
  ctx.bezierCurveTo(r * 1.65, -r * 1.15, r * 2.05, r * 0.05, r * 0.58, r * 0.44);
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  const core = ctx.createRadialGradient(-4, -6, 2, 0, 0, r * 1.25);
  core.addColorStop(0, "#f2ffff");
  core.addColorStop(0.34, "#69f5ff");
  core.addColorStop(1, "rgba(22, 53, 66, 0.78)");
  drawCrystal(0, -r * 0.08, r * 0.92, r * 1.82, "#69f5ff", "#f2ffff");
  ctx.fillStyle = core;
  ctx.beginPath();
  ctx.arc(0, -r * 0.02, r * 0.54, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(242, 255, 255, 0.76)";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 1.15, r * 0.34, Math.sin(performance.now() / 400) * 0.5, 0, Math.PI * 2);
  ctx.stroke();
  drawEnemyEyes(eye, r * 0.22, -r * 0.12, 2.8);
}

function drawEnemyEyes(color, xOffset, y, size) {
  ctx.fillStyle = color;
  ctx.shadowBlur = 8;
  ctx.shadowColor = color;
  ctx.beginPath();
  ctx.arc(-xOffset, y, size, 0, Math.PI * 2);
  ctx.arc(xOffset, y, size, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
}

function drawClaws(r, count) {
  ctx.strokeStyle = "rgba(255, 232, 185, 0.55)";
  ctx.lineWidth = 1.5;
  for (let i = 0; i < count; i++) {
    const y = -r * 0.2 + i * r * 0.38;
    ctx.beginPath();
    ctx.moveTo(-r * 0.82, y);
    ctx.lineTo(-r * 1.18, y + r * 0.2);
    ctx.moveTo(r * 0.82, y);
    ctx.lineTo(r * 1.18, y + r * 0.2);
    ctx.stroke();
  }
}

function drawShot(shot) {
  ctx.save();
  ctx.fillStyle = shot.color;
  ctx.shadowBlur = 14;
  ctx.shadowColor = shot.color;
  ctx.beginPath();
  ctx.arc(shot.x, shot.y, shot.type === "ember" ? 7 : 4.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawParticles() {
  state.particles.forEach((p) => {
    const alpha = Math.max(0, p.life / p.max);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = p.color;
    if (p.text) {
      ctx.font = "800 15px Inter, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(p.text, p.x, p.y);
    } else {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  });
}

function drawBottomLine() {
  ctx.save();
  ctx.fillStyle = state.core <= 3 ? "rgba(255, 111, 105, 0.28)" : "rgba(243, 199, 96, 0.18)";
  ctx.fillRect(0, H - 22, W, 22);
  ctx.strokeStyle = state.core <= 3 ? "#ff6f69" : "#f3c760";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, H - 22);
  ctx.lineTo(W, H - 22);
  ctx.stroke();
  ctx.restore();
}

function roundRect(x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
}

function loop(now) {
  const dt = Math.min(0.033, (now - lastTime) / 1000);
  lastTime = now;
  let remaining = dt * state.speed;
  while (remaining > 0) {
    const step = Math.min(0.033, remaining);
    update(step);
    remaining -= step;
  }
  draw();
  requestAnimationFrame(loop);
}

ui.startWave.addEventListener("click", startWave);
ui.pause.addEventListener("click", () => {
  ensureAudio();
  state.paused = !state.paused;
  syncUi();
});
ui.sound.addEventListener("click", toggleSound);
ui.speedButtons.forEach((button) => {
  button.addEventListener("click", () => {
    state.speed = Number(button.dataset.speed);
    syncUi();
  });
});
ui.restart.addEventListener("click", resetGame);
canvas.addEventListener("pointerdown", startTowerDrag);
canvas.addEventListener("pointermove", moveTowerDrag);
canvas.addEventListener("pointerup", endTowerDrag);
canvas.addEventListener("pointercancel", () => {
  state.dragging = null;
});
canvas.addEventListener("click", placeTower);

resetGame();
requestAnimationFrame(loop);
