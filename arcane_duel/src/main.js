const canvas = document.querySelector("#game");
const ctx = canvas.getContext("2d");
const preview = document.querySelector("#circlePreview");
const previewCtx = preview.getContext("2d");
const inspection = document.querySelector("#inspection");
const inspectionCircle = document.querySelector("#inspectionCircle");
const inspectionCtx = inspectionCircle.getContext("2d");

const bg = new Image();
bg.src = "./assets/battlefield.png";

const els = {
  lane: document.querySelector("#lane"),
  attribute: document.querySelector("#attribute"),
  attack: document.querySelector("#attack"),
  speed: document.querySelector("#speed"),
  special: document.querySelector("#special"),
  movePoint: document.querySelector("#movePoint"),
  moveDirection: document.querySelector("#moveDirection"),
  attackValue: document.querySelector("#attackValue"),
  speedValue: document.querySelector("#speedValue"),
  cast: document.querySelector("#cast"),
  reset: document.querySelector("#reset"),
  cost: document.querySelector("#cost"),
  log: document.querySelector("#log"),
  playerHp: document.querySelector("#playerHp"),
  playerMp: document.querySelector("#playerMp"),
  enemyHp: document.querySelector("#enemyHp"),
  enemyMp: document.querySelector("#enemyMp"),
  playerHpText: document.querySelector("#playerHpText"),
  playerMpText: document.querySelector("#playerMpText"),
  enemyHpText: document.querySelector("#enemyHpText"),
  enemyMpText: document.querySelector("#enemyMpText"),
  battleState: document.querySelector("#battleState"),
  closeInspection: document.querySelector("#closeInspection"),
  startScreen: document.querySelector("#startScreen"),
  startBattle: document.querySelector("#startBattle")
};

const attributeColors = {
  fire: "#ff665c",
  water: "#70d8ff",
  wood: "#84e69a",
  neutral: "#fff7de"
};

const attributeNames = {
  fire: "火",
  water: "水",
  wood: "木",
  neutral: "無"
};

const specialNames = {
  none: "なし",
  doubleAttack: "攻撃力倍化",
  lockedLane: "上下移動なし",
  invertedAffinity: "属性反転"
};

const moveNames = {
  none: "なし",
  up: "上",
  down: "下"
};

const SPELL_SPEED_SCALE = 0.08;

const state = {
  playerHp: 10,
  enemyHp: 10,
  playerMp: 100,
  enemyMp: 100,
  spells: [],
  bursts: [],
  log: ["決闘開始"],
  cpuTimer: 3.2,
  gameOver: false,
  started: false,
  lastTime: performance.now(),
  selectedSpellId: null
};

function readPlan() {
  return {
    lane: Number(els.lane.value),
    attack: Number(els.attack.value),
    speed: Number(els.speed.value),
    attribute: els.attribute.value,
    special: els.special.value,
    movePoint: Number(els.movePoint.value),
    moveDirection: els.moveDirection.value
  };
}

function mpCost(plan) {
  let cost = 12 + plan.attack * 8 + Math.floor(plan.speed * 1.35);
  if (plan.attribute === "neutral") cost += 10;
  if (plan.special !== "none") cost += 9;
  if (plan.moveDirection !== "none" && plan.movePoint > 0) cost += plan.movePoint * 4;
  return Math.min(78, Math.max(20, cost));
}

function effectiveAttack(plan) {
  return plan.special === "doubleAttack" ? plan.attack * 2 : plan.attack;
}

function pushLog(text) {
  state.log.unshift(text);
  state.log = state.log.slice(0, 6);
}

function cast(owner, plan) {
  const cost = mpCost(plan);
  if (owner === "player") {
    if (!state.started || state.playerMp < cost || state.gameOver) return;
    state.playerMp -= cost;
    pushLog(`第${plan.lane + 1}ルートへ詠唱`);
  } else {
    if (state.enemyMp < cost || state.gameOver) return;
    state.enemyMp -= cost;
  }

  const metrics = fieldMetrics();
  const startX = owner === "player" ? metrics.left : metrics.right;
  const startY = metrics.laneYs[plan.lane];
  state.bursts.push(makeBurst(startX, startY, owner === "player" ? "#f1d487" : "#b88cff", 0.28));

  state.spells.push({
    id: crypto.randomUUID(),
    owner,
    plan: { ...plan },
    lane: plan.lane,
    progress: owner === "player" ? 0.018 : 0.982,
    direction: owner === "player" ? 1 : -1,
    moved: false,
    age: 0
  });
}

function counterPlan(plan, lane) {
  const counter = { fire: "water", water: "wood", wood: "fire", neutral: "neutral" };
  return {
    attack: Math.max(1, plan.attack),
    speed: Math.min(10, Math.max(5, plan.speed + Math.floor(Math.random() * 3))),
    attribute: counter[plan.attribute],
    special: Math.random() > 0.82 ? "invertedAffinity" : "none",
    movePoint: 0,
    moveDirection: "none",
    lane
  };
}

function cpuCast() {
  const incoming = state.spells
    .filter(spell => spell.owner === "player")
    .sort((a, b) => b.progress - a.progress)[0];

  if (incoming && Math.random() > 0.18) {
    cast("computer", counterPlan(incoming.plan, incoming.lane));
    return;
  }

  const attrs = ["fire", "water", "wood", "neutral"];
  const specials = ["none", "none", "none", "doubleAttack", "lockedLane", "invertedAffinity"];
  const directions = ["none", "up", "down"];
  const movePoint = Math.floor(Math.random() * 4);
  cast("computer", {
    lane: Math.floor(Math.random() * 5),
    attack: 1 + Math.floor(Math.random() * 3),
    speed: 3 + Math.floor(Math.random() * 7),
    attribute: attrs[Math.floor(Math.random() * attrs.length)],
    special: specials[Math.floor(Math.random() * specials.length)],
    movePoint,
    moveDirection: movePoint === 0 ? "none" : directions[Math.floor(Math.random() * directions.length)]
  });
}

function beats(a, b) {
  return (a === "fire" && b === "wood")
    || (a === "water" && b === "fire")
    || (a === "wood" && b === "water");
}

function collisionWinner(playerPlan, enemyPlan) {
  if (playerPlan.attribute === "neutral" || enemyPlan.attribute === "neutral") {
    if (playerPlan.attribute === "neutral" && enemyPlan.attribute !== "neutral") return "player";
    if (enemyPlan.attribute === "neutral" && playerPlan.attribute !== "neutral") return "computer";
    if (playerPlan.attack === enemyPlan.attack) return "none";
    return playerPlan.attack > enemyPlan.attack ? "player" : "computer";
  }

  if (playerPlan.attribute === enemyPlan.attribute) return "none";
  const inverted = playerPlan.special === "invertedAffinity" || enemyPlan.special === "invertedAffinity";
  const playerWins = beats(playerPlan.attribute, enemyPlan.attribute);
  return (inverted ? !playerWins : playerWins) ? "player" : "computer";
}

function update(delta) {
  if (state.started && !state.gameOver) {
    state.playerMp = Math.min(100, state.playerMp + 0.56 * delta);
    state.enemyMp = Math.min(100, state.enemyMp + 0.49 * delta);
    state.cpuTimer -= delta;
    if (state.cpuTimer <= 0) {
      cpuCast();
      state.cpuTimer = 3.4 + Math.random() * 2.4;
    }

    for (const spell of state.spells) {
      const old = spell.progress;
      spell.age += delta;
      spell.progress += spell.direction * (0.055 + spell.plan.speed * 0.019) * SPELL_SPEED_SCALE * delta;
      applyMovement(spell, old);
    }

    resolveCollisions();
    resolveHits();
  }

  for (const burst of state.bursts) burst.life -= delta;
  state.bursts = state.bursts.filter(burst => burst.life > 0);
}

function applyMovement(spell, oldProgress) {
  if (spell.moved || spell.plan.special === "lockedLane") return;
  if (spell.plan.moveDirection === "none" || spell.plan.movePoint === 0) return;
  const point = movementProgressPoint(spell);
  const crossed = spell.direction > 0
    ? oldProgress < point && spell.progress >= point
    : oldProgress > point && spell.progress <= point;
  if (!crossed) return;
  spell.lane = Math.max(0, Math.min(4, spell.lane + (spell.plan.moveDirection === "up" ? -1 : 1)));
  spell.moved = true;

  const { left, right, laneYs } = fieldMetrics();
  state.bursts.push(makeBurst(left + (right - left) * spell.progress, laneYs[spell.lane], attributeColors[spell.plan.attribute], 0.22));
}

function movementProgressPoint(spell) {
  const playerSidePoints = [0.25, 0.5, 0.75];
  const computerSidePoints = [0.75, 0.5, 0.25];
  const points = spell.direction > 0 ? playerSidePoints : computerSidePoints;
  return points[spell.plan.movePoint - 1];
}

function resolveCollisions() {
  const removed = new Set();
  for (const player of state.spells.filter(spell => spell.owner === "player")) {
    for (const enemy of state.spells.filter(spell => spell.owner === "computer")) {
      if (removed.has(player.id) || removed.has(enemy.id)) continue;
      if (player.lane !== enemy.lane || Math.abs(player.progress - enemy.progress) > 0.024) continue;
      const winner = collisionWinner(player.plan, enemy.plan);
      const point = spellPosition(player);
      state.bursts.push(makeBurst(point.x, point.y, "#fff4bf", 0.42));
      if (winner === "player") {
        removed.add(enemy.id);
        pushLog("迎撃成功: 敵魔法を破壊");
      } else if (winner === "computer") {
        removed.add(player.id);
        pushLog("迎撃失敗: 敵魔法が突破");
      } else {
        removed.add(player.id);
        removed.add(enemy.id);
        pushLog("相殺: 魔法陣が崩壊");
      }
    }
  }
  state.spells = state.spells.filter(spell => !removed.has(spell.id));
}

function resolveHits() {
  const removed = new Set();
  for (const spell of state.spells) {
    if (spell.owner === "player" && spell.progress >= 1) {
      state.enemyHp = Math.max(0, state.enemyHp - effectiveAttack(spell.plan));
      removed.add(spell.id);
      state.bursts.push(makeBurst(fieldMetrics().right, fieldMetrics().laneYs[spell.lane], "#f1d487", 0.55));
      pushLog(`命中: 敵に${effectiveAttack(spell.plan)}ダメージ`);
    }
    if (spell.owner === "computer" && spell.progress <= 0) {
      state.playerHp = Math.max(0, state.playerHp - effectiveAttack(spell.plan));
      removed.add(spell.id);
      state.bursts.push(makeBurst(fieldMetrics().left, fieldMetrics().laneYs[spell.lane], "#b88cff", 0.55));
      pushLog(`被弾: ${effectiveAttack(spell.plan)}ダメージ`);
    }
  }
  state.spells = state.spells.filter(spell => !removed.has(spell.id));

  if (!state.gameOver && (state.playerHp <= 0 || state.enemyHp <= 0)) {
    state.gameOver = true;
    pushLog(state.playerHp <= 0 ? "敗北" : "勝利");
  }
}

function fieldMetrics() {
  return {
    left: canvas.width * 0.12,
    right: canvas.width * 0.88,
    laneYs: [0.43, 0.53, 0.63, 0.73, 0.83].map(v => canvas.height * v)
  };
}

function spellPosition(spell) {
  const { left, right, laneYs } = fieldMetrics();
  return {
    x: left + (right - left) * spell.progress,
    y: laneYs[spell.lane]
  };
}

function makeBurst(x, y, color, life) {
  return { x, y, color, life, maxLife: life, seed: Math.random() * 1000 };
}

function coverImage(targetCtx, image, width, height) {
  const scale = Math.max(width / image.width, height / image.height);
  const w = image.width * scale;
  const h = image.height * scale;
  targetCtx.drawImage(image, (width - w) / 2, (height - h) / 2, w, h);
}

function drawField() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (bg.complete && bg.naturalWidth) {
    coverImage(ctx, bg, canvas.width, canvas.height);
  } else {
    const grd = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    grd.addColorStop(0, "#101832");
    grd.addColorStop(1, "#251732");
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  ctx.fillStyle = "rgba(3, 6, 14, 0.34)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  drawRoutes();
  drawMages();
  for (const spell of state.spells) drawSpell(spell);
  for (const burst of state.bursts) drawBurst(burst);
}

function drawRoutes() {
  const { left, right, laneYs } = fieldMetrics();
  const selectedLane = Number(els.lane.value);
  ctx.save();
  ctx.lineCap = "round";

  const bandTop = laneYs[0] - canvas.height * 0.052;
  const bandHeight = laneYs[laneYs.length - 1] - laneYs[0] + canvas.height * 0.104;
  const band = ctx.createLinearGradient(0, bandTop, 0, bandTop + bandHeight);
  band.addColorStop(0, "rgba(4,9,20,0)");
  band.addColorStop(0.16, "rgba(4,9,20,0.54)");
  band.addColorStop(0.5, "rgba(4,9,20,0.66)");
  band.addColorStop(0.84, "rgba(4,9,20,0.54)");
  band.addColorStop(1, "rgba(4,9,20,0)");
  ctx.fillStyle = band;
  ctx.fillRect(left - 90, bandTop, right - left + 180, bandHeight);

  for (let lane = 0; lane < laneYs.length; lane += 1) {
    const y = laneYs[lane];
    const active = lane === selectedLane;

    ctx.shadowBlur = 0;
    ctx.strokeStyle = active ? "rgba(2,7,18,0.9)" : "rgba(2,7,18,0.78)";
    ctx.lineWidth = active ? 28 : 22;
    ctx.beginPath();
    ctx.moveTo(left, y);
    ctx.lineTo(right, y);
    ctx.stroke();

    const route = ctx.createLinearGradient(left, y, right, y);
    route.addColorStop(0, active ? "rgba(255,220,109,0.98)" : "rgba(115,235,255,0.84)");
    route.addColorStop(0.5, active ? "rgba(255,255,238,1)" : "rgba(225,252,255,0.98)");
    route.addColorStop(1, active ? "rgba(255,220,109,0.98)" : "rgba(115,235,255,0.84)");
    ctx.strokeStyle = route;
    ctx.lineWidth = active ? 10 : 7;
    ctx.shadowColor = active ? "#ffd85e" : "#53ecff";
    ctx.shadowBlur = active ? 28 : 20;
    ctx.beginPath();
    ctx.moveTo(left, y);
    ctx.lineTo(right, y);
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.strokeStyle = active ? "rgba(40,18,0,0.72)" : "rgba(2,20,28,0.68)";
    ctx.lineWidth = active ? 3 : 2.25;
    ctx.setLineDash([20, 16]);
    ctx.beginPath();
    ctx.moveTo(left + 22, y);
    ctx.lineTo(right - 22, y);
    ctx.stroke();
    ctx.setLineDash([]);

    drawLaneBadge(left - 54, y, lane + 1, active, "P");
    drawLaneBadge(right + 54, y, lane + 1, active, "C");

    for (const point of [0.25, 0.5, 0.75]) {
      const px = left + (right - left) * point;
      drawRoutePoint(px, y, active);
      drawRouteArrow(px + 42, y, active, 1);
      drawRouteArrow(px - 42, y, active, -1);
    }
  }
  ctx.restore();
}

function drawLaneBadge(x, y, lane, active, side) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = active ? "rgba(255,246,216,0.94)" : "rgba(7,18,34,0.86)";
  ctx.strokeStyle = active ? "#fff0a8" : "rgba(126,232,255,0.62)";
  ctx.lineWidth = 2;
  ctx.shadowColor = active ? "#fff0a8" : "#38eaff";
  ctx.shadowBlur = active ? 16 : 8;
  ctx.beginPath();
  ctx.roundRect(-16, -16, 32, 32, 8);
  ctx.fill();
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.fillStyle = active ? "#171006" : "rgba(226,252,255,0.92)";
  ctx.font = "900 15px Inter, system-ui";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(`${side}${lane}`, 0, 1);
  ctx.restore();
}

function drawRouteArrow(x, y, active, direction) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(direction, 1);
  ctx.fillStyle = active ? "rgba(255,246,216,0.98)" : "rgba(202,250,255,0.9)";
  ctx.strokeStyle = "rgba(6,13,24,0.74)";
  ctx.lineWidth = 1.5;
  ctx.shadowColor = active ? "#fff0a8" : "#38eaff";
  ctx.shadowBlur = active ? 16 : 8;
  ctx.beginPath();
  ctx.moveTo(12, 0);
  ctx.lineTo(-7, -9);
  ctx.lineTo(-2, 0);
  ctx.lineTo(-7, 9);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawRoutePoint(x, y, active) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(Math.PI / 4);
  ctx.fillStyle = active ? "rgba(255,246,216,0.98)" : "rgba(160,247,255,0.9)";
  ctx.strokeStyle = "rgba(8,18,32,0.9)";
  ctx.lineWidth = active ? 3 : 2;
  ctx.shadowColor = active ? "#fff0a8" : "#38eaff";
  ctx.shadowBlur = active ? 22 : 12;
  ctx.beginPath();
  ctx.moveTo(0, -13);
  ctx.lineTo(13, 0);
  ctx.lineTo(0, 13);
  ctx.lineTo(-13, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawMages() {
  const { left, right } = fieldMetrics();
  drawMage(left - 88, canvas.height * 0.25, "PLAYER", "#f1d487", "P");
  drawMage(right + 88, canvas.height * 0.25, "CPU", "#b88cff", "C");
}

function drawMage(x, y, label, color, initial) {
  ctx.save();
  ctx.translate(x, y);
  ctx.shadowColor = color;
  ctx.shadowBlur = 24;

  const halo = ctx.createRadialGradient(0, 0, 6, 0, 0, 46);
  halo.addColorStop(0, color);
  halo.addColorStop(0.48, "rgba(255,255,255,0.18)");
  halo.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(0, 0, 46, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "rgba(8,10,22,0.9)";
  ctx.strokeStyle = color;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(0, 0, 34, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.shadowBlur = 0;
  ctx.strokeStyle = "rgba(255,255,255,0.34)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(0, 0, 23, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = color;
  ctx.font = "900 28px Georgia, serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(initial, 0, 1);

  ctx.fillStyle = "rgba(255,255,255,0.88)";
  ctx.font = "900 13px Inter, system-ui";
  ctx.fillText(label, 0, 58);
  ctx.restore();
}

function drawSpell(spell) {
  const { x, y } = spellPosition(spell);
  const pulse = Math.sin(spell.age * 12) * 0.12 + 1;
  ctx.save();
  ctx.shadowColor = "rgba(255,255,255,0.95)";
  ctx.shadowBlur = 24;
  ctx.fillStyle = "rgba(255,255,255,0.96)";
  ctx.beginPath();
  ctx.arc(x, y, (12 + spell.plan.attack * 1.6) * pulse, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = "rgba(255,255,255,0.88)";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.globalAlpha = 0.28;
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.beginPath();
  ctx.arc(x - spell.direction * 18, y, 18, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawBurst(burst) {
  const t = burst.life / burst.maxLife;
  ctx.save();
  ctx.globalAlpha = Math.max(0, t);
  ctx.strokeStyle = burst.color;
  ctx.fillStyle = burst.color;
  ctx.shadowColor = burst.color;
  ctx.shadowBlur = 22;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(burst.x, burst.y, (1 - t) * 52 + 8, 0, Math.PI * 2);
  ctx.stroke();
  for (let i = 0; i < 9; i += 1) {
    const a = burst.seed + i * 0.7;
    const r = (1 - t) * 46;
    ctx.beginPath();
    ctx.arc(burst.x + Math.cos(a) * r, burst.y + Math.sin(a) * r, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawMagicCircle(targetCtx, plan, size) {
  targetCtx.clearRect(0, 0, size, size);
  targetCtx.save();
  targetCtx.translate(size / 2, size / 2);

  const glow = targetCtx.createRadialGradient(0, 0, 5, 0, 0, size * 0.47);
  glow.addColorStop(0, "rgba(255,255,255,0.18)");
  glow.addColorStop(0.58, "rgba(78,152,255,0.12)");
  glow.addColorStop(1, "rgba(241,212,135,0)");
  targetCtx.fillStyle = glow;
  targetCtx.beginPath();
  targetCtx.arc(0, 0, size * 0.48, 0, Math.PI * 2);
  targetCtx.fill();

  targetCtx.shadowColor = "#f1d487";
  targetCtx.shadowBlur = 10;
  targetCtx.strokeStyle = "rgba(255,248,216,0.96)";
  targetCtx.lineWidth = Math.max(2.5, size / 104);
  targetCtx.beginPath();
  targetCtx.arc(0, 0, size * 0.43, 0, Math.PI * 2);
  targetCtx.stroke();
  drawAttackFrame(targetCtx, plan.attack, size * 0.36);

  if (plan.special !== "none") {
    drawSpecialLines(targetCtx, plan.attack, size * 0.31);
  }

  const color = attributeColors[plan.attribute];
  targetCtx.shadowColor = "#ffffff";
  targetCtx.shadowBlur = 6;
  targetCtx.strokeStyle = "rgba(255,255,255,0.96)";
  targetCtx.lineWidth = Math.max(2.5, size / 120);
  targetCtx.beginPath();
  targetCtx.arc(0, 0, speedCircleRadius(plan.speed, size), 0, Math.PI * 2);
  targetCtx.stroke();

  drawAttributeMarks(targetCtx, plan, size * 0.42);
  drawMoveDots(targetCtx, plan, size);
  targetCtx.restore();
}

function drawAttackFrame(targetCtx, attack, radius) {
  if (attack === 1) {
    drawPolygon(targetCtx, 3, radius, -Math.PI / 2, "stroke");
    drawPolygon(targetCtx, 3, radius, Math.PI / 2, "stroke");
  } else if (attack === 2) {
    drawPolygon(targetCtx, 4, radius * 0.82, Math.PI / 4, "stroke");
    drawPolygon(targetCtx, 4, radius * 0.82, Math.PI / 2, "stroke");
  } else {
    drawPolygon(targetCtx, 5, radius * 0.96, -Math.PI / 2, "stroke");
    drawPolygon(targetCtx, 5, radius * 0.96, Math.PI / 2, "stroke");
  }
}

function speedCircleRadius(speed, size) {
  const outerRadius = size * 0.43;
  return outerRadius * (0.047 + 0.0436 * speed);
}

function drawPolygon(targetCtx, sides, radius, rotation, mode) {
  targetCtx.beginPath();
  for (let i = 0; i < sides; i += 1) {
    const angle = (i / sides) * Math.PI * 2 + rotation;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    if (i === 0) targetCtx.moveTo(x, y);
    else targetCtx.lineTo(x, y);
  }
  targetCtx.closePath();
  mode === "fill" ? targetCtx.fill() : targetCtx.stroke();
}

function drawSpecialLines(targetCtx, attack, radius) {
  const sides = attack === 1 ? 3 : attack === 2 ? 4 : 5;
  const shapeRadius = attack === 2 ? radius * 0.82 : attack === 3 ? radius * 0.96 : radius;
  const rotations = attack === 2 ? [Math.PI / 4, Math.PI / 2] : [-Math.PI / 2, Math.PI / 2];
  const points = rotations.flatMap(rotation => {
    const values = [];
    for (let i = 0; i < sides; i += 1) {
      const angle = (i / sides) * Math.PI * 2 + rotation;
      values.push([Math.cos(angle) * shapeRadius, Math.sin(angle) * shapeRadius]);
    }
    return values;
  });

  targetCtx.save();
  targetCtx.strokeStyle = "rgba(255,225,115,0.94)";
  targetCtx.lineWidth = 2.2;
  targetCtx.beginPath();
  for (let i = 0; i < points.length / 2; i += 1) {
    targetCtx.moveTo(points[i][0], points[i][1]);
    const next = points[i + points.length / 2];
    targetCtx.lineTo(next[0], next[1]);
  }
  for (let i = 0; i < points.length; i += 1) {
    targetCtx.moveTo(points[i][0], points[i][1]);
    const next = points[(i + 2) % points.length];
    targetCtx.lineTo(next[0], next[1]);
  }
  targetCtx.stroke();
  targetCtx.restore();
}

function drawAttributeMarks(targetCtx, plan, radius) {
  if (plan.attribute === "neutral") return;
  targetCtx.save();
  targetCtx.strokeStyle = "rgba(255,255,255,0.96)";
  targetCtx.fillStyle = "rgba(0,0,0,0.18)";
  targetCtx.shadowColor = "#ffffff";
  targetCtx.shadowBlur = 5;
  targetCtx.lineWidth = Math.max(2, radius / 78);
  for (let i = 0; i < 6; i += 1) {
    targetCtx.save();
    const angle = (i / 6) * Math.PI * 2 - Math.PI / 2;
    targetCtx.translate(Math.cos(angle) * radius, Math.sin(angle) * radius);
    targetCtx.rotate(angle + Math.PI / 2);
    if (plan.attribute === "fire") {
      targetCtx.beginPath();
      targetCtx.arc(0, 0, radius * 0.24, 0, Math.PI * 2);
      targetCtx.stroke();
    } else if (plan.attribute === "water") {
      drawPolygon(targetCtx, 3, radius * 0.27, -Math.PI / 2, "stroke");
    } else {
      const side = radius * 0.36;
      targetCtx.strokeRect(-side / 2, -side / 2, side, side);
    }
    targetCtx.restore();
  }
  targetCtx.restore();
}

function drawMoveDots(targetCtx, plan, size) {
  if (plan.moveDirection === "none" || plan.movePoint === 0) return;
  targetCtx.save();
  const y = plan.moveDirection === "up" ? -size * 0.405 : size * 0.405;
  targetCtx.shadowBlur = 0;
  for (let i = 0; i < plan.movePoint; i += 1) {
    const x = (i - (plan.movePoint - 1) / 2) * (size * 0.045);
    targetCtx.fillStyle = "#02030a";
    targetCtx.strokeStyle = "rgba(255,255,255,0.78)";
    targetCtx.lineWidth = 1.2;
    targetCtx.beginPath();
    targetCtx.arc(x, y, size * 0.017, 0, Math.PI * 2);
    targetCtx.fill();
    targetCtx.stroke();
  }
  targetCtx.restore();
}

function updateHud() {
  els.playerHp.style.width = `${state.playerHp * 10}%`;
  els.enemyHp.style.width = `${state.enemyHp * 10}%`;
  els.playerMp.style.width = `${state.playerMp}%`;
  els.enemyMp.style.width = `${state.enemyMp}%`;
  els.playerHpText.textContent = state.playerHp;
  els.enemyHpText.textContent = state.enemyHp;
  els.playerMpText.textContent = Math.floor(state.playerMp);
  els.enemyMpText.textContent = Math.floor(state.enemyMp);

  const plan = readPlan();
  els.attackValue.value = plan.attack;
  els.speedValue.value = plan.speed;
  els.cost.textContent = `MP ${mpCost(plan)}`;
  els.cast.disabled = state.playerMp < mpCost(plan) || state.gameOver;

  if (state.gameOver) {
    els.battleState.textContent = state.playerHp <= 0 ? "敗北: 魔法陣が破られた" : "勝利: 敵の詠唱を制圧";
  } else if (!state.started) {
    els.battleState.textContent = "開始ボタンを押すと戦闘が始まります";
  } else {
    els.battleState.textContent = `攻${plan.attack} / 速${plan.speed} / ${attributeNames[plan.attribute]} / ${plan.special === "none" ? "特殊なし" : "特殊線あり"}`;
  }

  els.log.innerHTML = state.log.map(item => `<li>${item}</li>`).join("");
}

function inspectSpell(spell) {
  state.selectedSpellId = spell.id;
  drawMagicCircle(inspectionCtx, spell.plan, inspectionCircle.width);
  inspection.showModal();
}

function reset() {
  state.playerHp = 10;
  state.enemyHp = 10;
  state.playerMp = 100;
  state.enemyMp = 100;
  state.spells = [];
  state.bursts = [];
  state.log = ["再戦開始"];
  state.cpuTimer = 3.2;
  state.gameOver = false;
  state.started = true;
}

function loop(now) {
  const delta = Math.min(0.05, (now - state.lastTime) / 1000);
  state.lastTime = now;
  update(delta);
  drawField();
  drawMagicCircle(previewCtx, readPlan(), preview.width);
  updateHud();
  requestAnimationFrame(loop);
}

canvas.addEventListener("click", event => {
  const rect = canvas.getBoundingClientRect();
  const x = (event.clientX - rect.left) * (canvas.width / rect.width);
  const y = (event.clientY - rect.top) * (canvas.height / rect.height);
  const hit = state.spells.find(spell => {
    const point = spellPosition(spell);
    return Math.hypot(x - point.x, y - point.y) < 30;
  });
  if (hit) inspectSpell(hit);
});

els.cast.addEventListener("click", () => cast("player", readPlan()));
els.reset.addEventListener("click", reset);
els.closeInspection.addEventListener("click", () => inspection.close());
els.startBattle.addEventListener("click", () => {
  reset();
  els.startScreen.classList.add("is-hidden");
});
document.querySelectorAll("select,input").forEach(input => {
  input.addEventListener("input", () => {
    drawMagicCircle(previewCtx, readPlan(), preview.width);
    updateHud();
  });
});

bg.addEventListener("load", drawField);
requestAnimationFrame(loop);
