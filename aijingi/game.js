const BOARD_SIZE = 20;
const MAX_ACTIONS = 5;
const STARTING_RESERVE = 30;
const AI_DELAY = 320;

const dirs = {
  up: { dr: -1, dc: 0, label: "↑" },
  right: { dr: 0, dc: 1, label: "→" },
  down: { dr: 1, dc: 0, label: "↓" },
  left: { dr: 0, dc: -1, label: "←" },
};

const formationAiWeights = {
  deployment: 4,
  combatWin: 3,
  combatLoss: 4,
  enemyDistance: 2,
  center: 1.5,
  formation: 9,
  overstack: 10,
  isolation: 8,
  boardAdvantage: 6,
};

const state = {
  board: createEmptyBoard(),
  currentPlayer: "red",
  reserves: { red: STARTING_RESERVE, blue: STARTING_RESERVE },
  actionsLeft: MAX_ACTIONS,
  mode: "place",
  selected: null,
  turnsCompleted: { red: 0, blue: 0 },
  formations: [],
  stats: new Map(),
  winner: null,
  log: [],
  aiThinking: false,
  lastBattle: "Battle -",
  movedFormationsThisTurn: { red: new Set(), blue: new Set() },
  soundOn: true,
  audio: null,
};

const boardEl = document.querySelector("#board");
const turnTextEl = document.querySelector("#turnText");
const actionsLeftEl = document.querySelector("#actionsLeft");
const resultTextEl = document.querySelector("#resultText");
const redReserveEl = document.querySelector("#redReserve");
const blueReserveEl = document.querySelector("#blueReserve");
const redBoardCountEl = document.querySelector("#redBoardCount");
const blueBoardCountEl = document.querySelector("#blueBoardCount");
const selectionInfoEl = document.querySelector("#selectionInfo");
const logListEl = document.querySelector("#logList");
const aiStateEl = document.querySelector("#aiState");
const phaseTextEl = document.querySelector("#phaseText");
const lastBattleEl = document.querySelector("#lastBattle");
const soundButtonEl = document.querySelector("#sound");
const topCoordinatesEl = document.querySelector("#topCoordinates");
const rightCoordinatesEl = document.querySelector("#rightCoordinates");

function createEmptyBoard() {
  return Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(null));
}

function opponent(player) {
  return player === "red" ? "blue" : "red";
}

function inBounds(row, col) {
  return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE;
}

function key(row, col) {
  return `${row},${col}`;
}

function parseKey(value) {
  const [row, col] = value.split(",").map(Number);
  return { row, col };
}

function isRedZone(row, col) {
  return col >= BOARD_SIZE - 3 || row >= BOARD_SIZE - 3;
}

function isBlueZone(row, col) {
  return row < 3 || col < 3;
}

function canPlace(player, row, col) {
  if (!inBounds(row, col) || state.board[row][col] || state.reserves[player] <= 0) return false;
  return player === "red" ? isRedZone(row, col) : isBlueZone(row, col);
}

function displayCoord(row, col) {
  return [row + 1, BOARD_SIZE - col];
}

function playerName(player) {
  return player === "red" ? "Red" : "Blue";
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function ensureAudio() {
  if (state.audio) return state.audio;
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return null;
  state.audio = new Ctx();
  return state.audio;
}

function tone(freq, duration = 0.08, type = "sine", gain = 0.05) {
  if (!state.soundOn) return;
  const ctx = ensureAudio();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const amp = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  amp.gain.setValueAtTime(0.0001, ctx.currentTime);
  amp.gain.exponentialRampToValueAtTime(gain, ctx.currentTime + 0.01);
  amp.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
  osc.connect(amp).connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + duration + 0.02);
}

function renderCoordinates() {
  topCoordinatesEl.replaceChildren();
  rightCoordinatesEl.replaceChildren();
  for (let index = 1; index <= BOARD_SIZE; index += 1) {
    const top = document.createElement("span");
    top.textContent = BOARD_SIZE - index + 1;
    topCoordinatesEl.append(top);
    const right = document.createElement("span");
    right.textContent = index;
    rightCoordinatesEl.append(right);
  }
}

function renderBoard() {
  boardEl.replaceChildren();
  for (let row = 0; row < BOARD_SIZE; row += 1) {
    for (let col = 0; col < BOARD_SIZE; col += 1) {
      const cell = document.createElement("button");
      cell.type = "button";
      cell.className = "cell";
      cell.dataset.row = row;
      cell.dataset.col = col;
      const [displayRow, displayCol] = displayCoord(row, col);
      cell.setAttribute("aria-label", `row ${displayRow}, column ${displayCol}`);
      if (isRedZone(row, col)) cell.classList.add("red-zone");
      if (isBlueZone(row, col)) cell.classList.add("blue-zone");
      if (!state.aiThinking && !state.winner && state.currentPlayer === "red") cell.classList.add("selectable");
      if (state.aiThinking && state.currentPlayer === "blue") cell.classList.add("ai-thinking");

      const piece = state.board[row][col];
      if (piece) {
        const pieceEl = document.createElement("div");
        const stats = state.stats.get(key(row, col));
        pieceEl.className = `piece ${piece}`;
        if (stats?.penalized) pieceEl.classList.add("penalized");
        pieceEl.textContent = stats?.health ?? 0;
        cell.append(pieceEl);
      }

      if (state.selected?.row === row && state.selected?.col === col) cell.classList.add("selected");
      if (state.selected?.formationKeys?.has(key(row, col))) cell.classList.add("formation-selected");
      boardEl.append(cell);
    }
  }
  boardEl.append(createConnectionLayer());
}

function createConnectionLayer() {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.classList.add("connection-layer");
  svg.setAttribute("viewBox", "0 0 20 20");
  const links = [[0, 1], [1, 0], [1, 1], [1, -1]];
  for (let row = 0; row < BOARD_SIZE; row += 1) {
    for (let col = 0; col < BOARD_SIZE; col += 1) {
      const player = state.board[row][col];
      if (!player) continue;
      for (const [dr, dc] of links) {
        const nr = row + dr;
        const nc = col + dc;
        if (!inBounds(nr, nc) || state.board[nr][nc] !== player) continue;
        const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
        line.setAttribute("x1", String(col + 0.5));
        line.setAttribute("y1", String(row + 0.5));
        line.setAttribute("x2", String(nc + 0.5));
        line.setAttribute("y2", String(nr + 0.5));
        svg.append(line);
      }
    }
  }
  return svg;
}

function updateDerivedState() {
  state.formations = collectFormations(state.board);
  state.stats = calculateStats(state.board, state.formations);
}

function collectFormations(board) {
  const visited = new Set();
  const formations = [];
  const neighbors = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
  for (let row = 0; row < BOARD_SIZE; row += 1) {
    for (let col = 0; col < BOARD_SIZE; col += 1) {
      const player = board[row][col];
      const start = key(row, col);
      if (!player || visited.has(start)) continue;
      const queue = [{ row, col }];
      const cells = [];
      visited.add(start);
      while (queue.length) {
        const current = queue.shift();
        cells.push(current);
        for (const [dr, dc] of neighbors) {
          const nr = current.row + dr;
          const nc = current.col + dc;
          const nextKey = key(nr, nc);
          if (!inBounds(nr, nc) || visited.has(nextKey) || board[nr][nc] !== player) continue;
          visited.add(nextKey);
          queue.push({ row: nr, col: nc });
        }
      }
      formations.push({
        id: formations.length,
        player,
        cells,
        keys: new Set(cells.map((cell) => key(cell.row, cell.col))),
      });
    }
  }
  return formations;
}

function calculateStats(board, formations) {
  const result = new Map();
  const adjacent = [[-1, 0, 2], [0, 1, 2], [1, 0, 2], [0, -1, 2], [-1, -1, 1], [-1, 1, 1], [1, 1, 1], [1, -1, 1]];
  for (const formation of formations) {
    const penalized = formation.cells.length >= 5;
    for (const cell of formation.cells) {
      let health = 0;
      for (const [dr, dc, value] of adjacent) {
        const nr = cell.row + dr;
        const nc = cell.col + dc;
        if (inBounds(nr, nc) && board[nr][nc] === formation.player) health += value;
      }
      if (penalized) health = Math.floor(health / 2);
      result.set(key(cell.row, cell.col), {
        health,
        formationId: formation.id,
        formationSize: formation.cells.length,
        penalized,
      });
    }
  }
  return result;
}

function handleCellClick(row, col) {
  if (state.winner || state.aiThinking || state.currentPlayer !== "red" || state.actionsLeft <= 0) return;
  if (state.mode === "place") {
    placePiece(row, col);
    return;
  }

  const piece = state.board[row][col];
  if (piece !== "red") {
    addLog("Redのコマを選択してください");
    refresh();
    return;
  }

  const stats = state.stats.get(key(row, col));
  const formation = state.formations[stats.formationId];
  if (state.mode === "formation") {
    if (formation.cells.length < 2 || formation.cells.length >= 5) {
      addLog("陣移動できるのは2〜4個の陣です");
      refresh();
      return;
    }
    state.selected = { row, col, formationId: stats.formationId, formationKeys: formation.keys };
  } else {
    state.selected = { row, col };
  }
  tone(620, 0.05, "triangle", 0.035);
  refresh();
}

function handleBoardActivation(event) {
  const cell = event.target.closest?.(".cell");
  if (cell) {
    handleCellClick(Number(cell.dataset.row), Number(cell.dataset.col));
    return;
  }

  const rect = boardEl.getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  const col = Math.floor(((event.clientX - rect.left) / rect.width) * BOARD_SIZE);
  const row = Math.floor(((event.clientY - rect.top) / rect.height) * BOARD_SIZE);
  if (inBounds(row, col)) handleCellClick(row, col);
}

function handleBoardPointer(event) {
  if (event.button && event.button !== 0) return;
  event.preventDefault();
  handleBoardActivation(event);
}

function handleBoardKeydown(event) {
  if (event.key !== "Enter" && event.key !== " ") return;
  const cell = event.target.closest?.(".cell");
  if (!cell) return;
  event.preventDefault();
  handleCellClick(Number(cell.dataset.row), Number(cell.dataset.col));
}

function placePiece(row, col, logPrefix = "") {
  const player = state.currentPlayer;
  if (!canPlace(player, row, col)) {
    addLog(`${playerName(player)}はそこに配置できません`);
    refresh();
    return false;
  }
  state.board[row][col] = player;
  state.reserves[player] -= 1;
  const [displayRow, displayCol] = displayCoord(row, col);
  consumeAction(`${logPrefix}${playerName(player)} 配置 (${displayRow}, ${displayCol})`);
  tone(player === "red" ? 420 : 320, 0.08, "triangle", 0.04);
  return true;
}

function moveSelected(dirName) {
  if (state.winner || state.aiThinking || state.currentPlayer !== "red") return;
  if (!state.selected || state.actionsLeft <= 0) return;
  if (state.mode === "piece") {
    movePiece(state.selected.row, state.selected.col, dirName);
  } else if (state.mode === "formation") {
    moveFormation(state.selected.formationId, dirName);
  }
}

function movePiece(row, col, dirName, logPrefix = "") {
  const dir = dirs[dirName];
  const player = state.board[row][col];
  const nr = row + dir.dr;
  const nc = col + dir.dc;
  if (player !== state.currentPlayer || !inBounds(nr, nc) || state.board[nr][nc]) {
    addLog("コマ移動できません");
    refresh();
    return false;
  }
  state.board[nr][nc] = player;
  state.board[row][col] = null;
  resolveCombat([{ row: nr, col: nc }], dirName);
  state.selected = state.board[nr][nc] === player ? { row: nr, col: nc } : null;
  consumeAction(`${logPrefix}${playerName(player)} コマ移動 ${dirs[dirName].label}`);
  tone(520, 0.06, "square", 0.025);
  return true;
}

function moveFormation(formationId, dirName, logPrefix = "") {
  updateDerivedState();
  const formation = state.formations[formationId];
  const dir = dirs[dirName];
  if (!formation || formation.player !== state.currentPlayer) return false;
  if (formation.cells.length < 2 || formation.cells.length >= 5) {
    addLog("陣移動できるのは2〜4個の陣です");
    refresh();
    return false;
  }

  const targets = formation.cells.map((cell) => ({ row: cell.row + dir.dr, col: cell.col + dir.dc }));
  for (const target of targets) {
    if (!inBounds(target.row, target.col)) {
      addLog("盤外には移動できません");
      refresh();
      return false;
    }
    const occupant = state.board[target.row][target.col];
    const targetKey = key(target.row, target.col);
    if (occupant && !formation.keys.has(targetKey)) {
      addLog("移動先にコマがあります");
      refresh();
      return false;
    }
  }

  const formationKey = getFormationKey(formation);
  for (const cell of formation.cells) state.board[cell.row][cell.col] = null;
  for (const target of targets) state.board[target.row][target.col] = formation.player;
  state.movedFormationsThisTurn[formation.player].add(formationKey);
  resolveCombat(targets, dirName);
  state.selected = null;
  consumeAction(`${logPrefix}${playerName(formation.player)} 陣移動 ${dirs[dirName].label}`);
  tone(680, 0.08, "sawtooth", 0.028);
  return true;
}

function resolveCombat(movedCells, dirName) {
  updateDerivedState();
  const dir = dirs[dirName];
  const battles = [];
  for (const moved of movedCells) {
    const attacker = state.board[moved.row][moved.col];
    if (!attacker) continue;
    const defenderRow = moved.row + dir.dr;
    const defenderCol = moved.col + dir.dc;
    if (!inBounds(defenderRow, defenderCol)) continue;
    const defender = state.board[defenderRow][defenderCol];
    if (!defender || defender === attacker) continue;
    battles.push({
      attacker: { row: moved.row, col: moved.col, player: attacker },
      defender: { row: defenderRow, col: defenderCol, player: defender },
    });
  }
  if (!battles.length) return;

  const destroyed = new Set();
  for (const battle of battles) {
    const attackPower = calculateAttackPower(state.board, battle.attacker.row, battle.attacker.col, dirName);
    const defensePower = calculateAttackPower(state.board, battle.defender.row, battle.defender.col, oppositeDir(dirName));
    const attackerHealth = state.stats.get(key(battle.attacker.row, battle.attacker.col))?.health ?? 0;
    const defenderHealth = state.stats.get(key(battle.defender.row, battle.defender.col))?.health ?? 0;
    if (defensePower > attackerHealth) destroyed.add(key(battle.attacker.row, battle.attacker.col));
    if (attackPower > defenderHealth) destroyed.add(key(battle.defender.row, battle.defender.col));
    state.lastBattle = `A${attackPower}/H${attackerHealth} vs A${defensePower}/H${defenderHealth}`;
    addLog(`戦闘 ${state.lastBattle}`);
  }

  for (const value of destroyed) {
    const { row, col } = parseKey(value);
    state.board[row][col] = null;
  }
  if (destroyed.size) {
    addLog(`${destroyed.size}個のコマが破壊されました`);
    tone(160, 0.14, "square", 0.05);
  }
}

function calculateAttackPower(board, row, col, dirName) {
  const player = board[row][col];
  if (!player) return 0;
  const dir = dirs[oppositeDir(dirName)];
  let count = 1;
  let nr = row + dir.dr;
  let nc = col + dir.dc;
  while (inBounds(nr, nc) && board[nr][nc] === player) {
    count += 1;
    nr += dir.dr;
    nc += dir.dc;
  }
  return count * 2;
}

function oppositeDir(dirName) {
  return { up: "down", down: "up", left: "right", right: "left" }[dirName];
}

function consumeAction(message) {
  state.actionsLeft -= 1;
  addLog(message);
  updateDerivedState();
  checkVictory();
  if (state.actionsLeft <= 0 && !state.winner && state.currentPlayer === "red") {
    addLog("行動を使い切りました。ターン終了してください");
  }
  refresh();
}

function endTurn() {
  if (state.winner || state.aiThinking) return;
  state.turnsCompleted[state.currentPlayer] += 1;
  checkVictory();
  if (state.winner) {
    refresh();
    return;
  }
  state.currentPlayer = opponent(state.currentPlayer);
  state.actionsLeft = MAX_ACTIONS;
  state.selected = null;
  state.movedFormationsThisTurn[state.currentPlayer] = new Set();
  addLog(`${playerName(state.currentPlayer)}のターン`);
  refresh();
  if (state.currentPlayer === "blue") runAiTurn();
}

async function runAiTurn() {
  if (state.winner) return;
  state.aiThinking = true;
  aiStateEl.textContent = "Blue AI: 思考中";
  refresh();
  await sleep(AI_DELAY);

  while (!state.winner && state.currentPlayer === "blue" && state.actionsLeft > 0) {
    const actions = getLegalActions("blue");
    if (!actions.length) break;
    const action = chooseAiAction(actions);
    applyAiAction(action);
    await sleep(AI_DELAY);
  }

  state.aiThinking = false;
  if (!state.winner && state.currentPlayer === "blue") {
    state.turnsCompleted.blue += 1;
    checkVictory();
    if (!state.winner) {
      state.currentPlayer = "red";
      state.actionsLeft = MAX_ACTIONS;
      state.selected = null;
      state.movedFormationsThisTurn.red = new Set();
      addLog("Redのターン");
    }
  }
  aiStateEl.textContent = "Blue AI: 陣形AI";
  refresh();
}

function applyAiAction(action) {
  if (action.type === "place") {
    placePiece(action.row, action.col, "AI ");
    return;
  }
  if (action.type === "piece") {
    movePiece(action.row, action.col, action.dirName, "AI ");
    return;
  }
  moveFormation(action.formationId, action.dirName, "AI ");
}

function getLegalActions(player) {
  updateDerivedState();
  const actions = [];
  if (state.reserves[player] > 0) {
    for (let row = 0; row < BOARD_SIZE; row += 1) {
      for (let col = 0; col < BOARD_SIZE; col += 1) {
        if (canPlace(player, row, col)) actions.push({ type: "place", row, col });
      }
    }
  }

  for (let row = 0; row < BOARD_SIZE; row += 1) {
    for (let col = 0; col < BOARD_SIZE; col += 1) {
      if (state.board[row][col] !== player) continue;
      for (const dirName of Object.keys(dirs)) {
        const dir = dirs[dirName];
        const nr = row + dir.dr;
        const nc = col + dir.dc;
        if (inBounds(nr, nc) && !state.board[nr][nc]) actions.push({ type: "piece", row, col, dirName });
      }
    }
  }

  for (const formation of state.formations) {
    if (formation.player !== player || formation.cells.length < 2 || formation.cells.length >= 5) continue;
    for (const dirName of Object.keys(dirs)) {
      if (canMoveFormation(formation, dirName)) {
        actions.push({ type: "formation", formationId: formation.id, formationKey: getFormationKey(formation), dirName });
      }
    }
  }
  return actions;
}

function canMoveFormation(formation, dirName) {
  const dir = dirs[dirName];
  for (const cell of formation.cells) {
    const row = cell.row + dir.dr;
    const col = cell.col + dir.dc;
    if (!inBounds(row, col)) return false;
    const occupant = state.board[row][col];
    if (occupant && !formation.keys.has(key(row, col))) return false;
  }
  return true;
}

function chooseAiAction(actions) {
  const refined = refineAiActions(actions);
  let best = null;
  for (const action of refined) {
    const features = evaluateActionFeatures(action, "blue");
    const score = Object.entries(features).reduce((sum, [feature, value]) => {
      return sum + value * (formationAiWeights[feature] ?? 0);
    }, 0) + Math.random() * 0.12;
    if (!best || score > best.score) best = { action, score };
  }
  return best.action;
}

function refineAiActions(actions) {
  const combats = actions.filter((action) => getCombatTargetsAfterAction(action, "red").length);
  if (combats.length) return avoidBadFormationMoves(combats);
  const placements = actions.filter((action) => action.type === "place");
  if (state.reserves.blue > 0 && placements.length) return avoidBadFormationMoves(placements);
  return avoidBadFormationMoves(actions);
}

function avoidBadFormationMoves(actions) {
  const safe = actions.filter((action) => overstackRisk(action, "blue") === 0);
  const pool = safe.length ? safe : actions;
  const fresh = pool.filter((action) => action.type !== "formation" || !state.movedFormationsThisTurn.blue.has(action.formationKey));
  return fresh.length ? fresh : pool;
}

function evaluateActionFeatures(action, player) {
  const enemy = opponent(player);
  const beforeCells = getActionOriginCells(action);
  const afterCells = getActionTargetCells(action);
  const combatTargets = getCombatTargetsAfterAction(action, enemy);
  const beforeDistance = minDistanceToPlayer(beforeCells, enemy);
  const afterDistance = minDistanceToPlayer(afterCells, enemy);

  return {
    deployment: action.type === "place" ? 10 : 0,
    combatWin: estimateCombatWin(action, player, combatTargets),
    combatLoss: -estimateCombatLoss(action, player, combatTargets),
    enemyDistance: Number.isFinite(beforeDistance) && Number.isFinite(afterDistance) ? beforeDistance - afterDistance : 0,
    center: centralScore(afterCells) - centralScore(beforeCells),
    formation: formationHealthBonus(action, player)
      + attackLineBonus(action, player, enemy)
      + formationAdvanceBonus(action, player)
      - squareFormationPenalty(action, player),
    overstack: -overstackRisk(action, player),
    isolation: -isolationRisk(action, player),
    boardAdvantage: estimateBoardAdvantageDelta(action, player),
  };
}

function getActionOriginCells(action) {
  if (action.type === "place") return [];
  if (action.type === "piece") return [{ row: action.row, col: action.col }];
  const formation = state.formations[action.formationId];
  return formation ? formation.cells : [];
}

function getActionTargetCells(action) {
  if (action.type === "place") return [{ row: action.row, col: action.col }];
  const dir = dirs[action.dirName];
  if (action.type === "piece") return [{ row: action.row + dir.dr, col: action.col + dir.dc }];
  const formation = state.formations[action.formationId];
  return formation ? formation.cells.map((cell) => ({ row: cell.row + dir.dr, col: cell.col + dir.dc })) : [];
}

function getCombatTargetsAfterAction(action, enemy) {
  if (!action.dirName) return [];
  const dir = dirs[action.dirName];
  const targets = [];
  for (const cell of getActionTargetCells(action)) {
    const row = cell.row + dir.dr;
    const col = cell.col + dir.dc;
    if (inBounds(row, col) && state.board[row][col] === enemy) targets.push({ row, col });
  }
  return targets;
}

function getAttackerForTarget(action, target) {
  const dir = dirs[oppositeDir(action.dirName)];
  return { row: target.row + dir.dr, col: target.col + dir.dc };
}

function estimateCombatWin(action, player, combatTargets) {
  let score = 0;
  for (const target of combatTargets) {
    const attacker = getAttackerForTarget(action, target);
    const attackPower = calculateAttackPowerAfterAction(attacker.row, attacker.col, action.dirName, player, action);
    const defenderHealth = state.stats.get(key(target.row, target.col))?.health ?? 0;
    score += attackPower > defenderHealth ? 12 : 3;
  }
  return score;
}

function estimateCombatLoss(action, player, combatTargets) {
  let risk = 0;
  for (const target of combatTargets) {
    const attacker = getAttackerForTarget(action, target);
    const defenderPower = calculateAttackPower(state.board, target.row, target.col, oppositeDir(action.dirName));
    const attackerHealth = estimateHealthAt(attacker.row, attacker.col, player, action);
    if (defenderPower > attackerHealth) risk += 10;
  }
  return risk;
}

function calculateAttackPowerAfterAction(row, col, dirName, player, action) {
  const dir = dirs[oppositeDir(dirName)];
  let count = 1;
  let nr = row + dir.dr;
  let nc = col + dir.dc;
  while (inBounds(nr, nc) && hasFriendlyAfterAction(nr, nc, player, action)) {
    count += 1;
    nr += dir.dr;
    nc += dir.dc;
  }
  return count * 2;
}

function hasFriendlyAfterAction(row, col, player, action) {
  if (!inBounds(row, col)) return false;
  const targets = getActionTargetCells(action);
  const origins = getActionOriginCells(action);
  if (targets.some((cell) => cell.row === row && cell.col === col)) return true;
  if (origins.some((cell) => cell.row === row && cell.col === col)) return false;
  return state.board[row][col] === player;
}

function estimateHealthAt(row, col, player, action) {
  const adjacent = [[-1, 0, 2], [0, 1, 2], [1, 0, 2], [0, -1, 2], [-1, -1, 1], [-1, 1, 1], [1, 1, 1], [1, -1, 1]];
  let health = 0;
  for (const [dr, dc, value] of adjacent) {
    if (hasFriendlyAfterAction(row + dr, col + dc, player, action)) health += value;
  }
  const connectedSize = estimateConnectedSizeAfterAction(row, col, player, action);
  return connectedSize >= 5 ? Math.floor(health / 2) : health;
}

function formationHealthBonus(action, player) {
  let bonus = 0;
  const adjacent = [[-1, 0, 2], [0, 1, 2], [1, 0, 2], [0, -1, 2], [-1, -1, 1], [-1, 1, 1], [1, 1, 1], [1, -1, 1]];
  for (const target of getActionTargetCells(action)) {
    for (const [dr, dc, value] of adjacent) {
      if (hasFriendlyAfterAction(target.row + dr, target.col + dc, player, action)) bonus += value;
    }
  }
  return bonus;
}

function attackLineBonus(action, player, enemy) {
  let bonus = 0;
  for (const enemyPiece of findNearbyEnemies(getActionTargetCells(action), enemy, 6)) {
    const enemyHealth = state.stats.get(key(enemyPiece.row, enemyPiece.col))?.health ?? 0;
    const neededLength = Math.min(4, Math.max(2, Math.floor(enemyHealth / 2) + 1));
    for (const target of getActionTargetCells(action)) {
      const best = Math.max(
        countLineThrough(target.row, target.col, "horizontal", player, action),
        countLineThrough(target.row, target.col, "vertical", player, action),
      );
      if (best >= 5) bonus -= 20;
      else if (best >= neededLength) bonus += 18 + neededLength * 5;
    }
  }
  return bonus;
}

function formationAdvanceBonus(action, player) {
  if (action.type !== "formation") return 0;
  const before = minDistanceToPlayer(getActionOriginCells(action), opponent(player));
  const after = minDistanceToPlayer(getActionTargetCells(action), opponent(player));
  if (!Number.isFinite(before) || !Number.isFinite(after)) return 0;
  return (before - after) * 8;
}

function squareFormationPenalty(action, player) {
  const targets = getActionTargetCells(action);
  let penalty = 0;
  const checked = new Set();
  for (const target of targets) {
    for (const [rowOffset, colOffset] of [[0, 0], [-1, 0], [0, -1], [-1, -1]]) {
      const top = target.row + rowOffset;
      const left = target.col + colOffset;
      const id = key(top, left);
      if (checked.has(id)) continue;
      checked.add(id);
      const cells = [
        { row: top, col: left },
        { row: top + 1, col: left },
        { row: top, col: left + 1 },
        { row: top + 1, col: left + 1 },
      ];
      if (cells.every((cell) => hasFriendlyAfterAction(cell.row, cell.col, player, action))) penalty += 8;
    }
  }
  return penalty;
}

function overstackRisk(action, player) {
  let worst = 0;
  for (const target of getActionTargetCells(action)) {
    worst = Math.max(worst, estimateConnectedSizeAfterAction(target.row, target.col, player, action));
  }
  return worst >= 5 ? (worst - 4) * 12 : 0;
}

function isolationRisk(action, player) {
  let risk = 0;
  const adjacent = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
  for (const target of getActionTargetCells(action)) {
    const neighbors = adjacent.filter(([dr, dc]) => hasFriendlyAfterAction(target.row + dr, target.col + dc, player, action));
    if (!neighbors.length) risk += 5;
  }
  return risk;
}

function estimateConnectedSizeAfterAction(row, col, player, action) {
  if (!hasFriendlyAfterAction(row, col, player, action)) return 0;
  const queue = [{ row, col }];
  const visited = new Set([key(row, col)]);
  const neighbors = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
  while (queue.length) {
    const current = queue.shift();
    for (const [dr, dc] of neighbors) {
      const nr = current.row + dr;
      const nc = current.col + dc;
      const id = key(nr, nc);
      if (!inBounds(nr, nc) || visited.has(id) || !hasFriendlyAfterAction(nr, nc, player, action)) continue;
      visited.add(id);
      queue.push({ row: nr, col: nc });
    }
  }
  return visited.size;
}

function estimateBoardAdvantageDelta(action, player) {
  const before = evaluateBoardAdvantage(state.board, state.reserves, player);
  const simulated = simulateAction(action, player);
  const after = evaluateBoardAdvantage(simulated.board, simulated.reserves, player);
  return (after - before) / 10;
}

function simulateAction(action, player) {
  const board = state.board.map((row) => [...row]);
  const reserves = { ...state.reserves };
  if (action.type === "place") {
    board[action.row][action.col] = player;
    reserves[player] = Math.max(0, reserves[player] - 1);
    return { board, reserves };
  }
  const targets = getActionTargetCells(action);
  const origins = getActionOriginCells(action);
  for (const origin of origins) board[origin.row][origin.col] = null;
  for (const target of targets) board[target.row][target.col] = player;
  if (action.dirName) resolveCombatOnBoard(board, targets, action.dirName);
  return { board, reserves };
}

function resolveCombatOnBoard(board, movedCells, dirName) {
  const stats = calculateStats(board, collectFormations(board));
  const dir = dirs[dirName];
  const destroyed = new Set();
  for (const moved of movedCells) {
    const attacker = board[moved.row][moved.col];
    if (!attacker) continue;
    const defenderRow = moved.row + dir.dr;
    const defenderCol = moved.col + dir.dc;
    if (!inBounds(defenderRow, defenderCol)) continue;
    const defender = board[defenderRow][defenderCol];
    if (!defender || defender === attacker) continue;
    const attackPower = calculateAttackPower(board, moved.row, moved.col, dirName);
    const defensePower = calculateAttackPower(board, defenderRow, defenderCol, oppositeDir(dirName));
    const attackerHealth = stats.get(key(moved.row, moved.col))?.health ?? 0;
    const defenderHealth = stats.get(key(defenderRow, defenderCol))?.health ?? 0;
    if (defensePower > attackerHealth) destroyed.add(key(moved.row, moved.col));
    if (attackPower > defenderHealth) destroyed.add(key(defenderRow, defenderCol));
  }
  for (const value of destroyed) {
    const { row, col } = parseKey(value);
    board[row][col] = null;
  }
}

function evaluateBoardAdvantage(board, reserves, player) {
  return evaluateBoardForPlayer(board, reserves, player) - evaluateBoardForPlayer(board, reserves, opponent(player));
}

function evaluateBoardForPlayer(board, reserves, player) {
  const formations = collectFormations(board);
  const stats = calculateStats(board, formations);
  const pieces = getBoardPieces(board, player);
  let health = 0;
  let attack = 0;
  let isolated = 0;
  let overstack = 0;
  let activeFormations = 0;
  for (const piece of pieces) {
    const pieceStats = stats.get(key(piece.row, piece.col));
    health += pieceStats?.health ?? 0;
    attack += Math.max(...Object.keys(dirs).map((dirName) => calculateAttackPower(board, piece.row, piece.col, dirName)));
    if ((pieceStats?.formationSize ?? 1) <= 1) isolated += 1;
  }
  for (const formation of formations) {
    if (formation.player !== player) continue;
    if (formation.cells.length >= 2 && formation.cells.length <= 4) activeFormations += 1;
    if (formation.cells.length >= 5) overstack += formation.cells.length;
  }
  return pieces.length * 4 + reserves[player] * 0.4 + health * 1.1 + attack * 0.45 + activeFormations * 7 - isolated * 4 - overstack * 6;
}

function getBoardPieces(board, player) {
  const pieces = [];
  for (let row = 0; row < BOARD_SIZE; row += 1) {
    for (let col = 0; col < BOARD_SIZE; col += 1) {
      if (board[row][col] === player) pieces.push({ row, col });
    }
  }
  return pieces;
}

function findNearbyEnemies(cells, enemy, radius) {
  const enemies = getBoardPieces(state.board, enemy);
  return enemies.filter((enemyPiece) => cells.some((cell) => Math.abs(cell.row - enemyPiece.row) + Math.abs(cell.col - enemyPiece.col) <= radius));
}

function minDistanceToPlayer(cells, player) {
  if (!cells.length) return Infinity;
  const enemies = getBoardPieces(state.board, player);
  if (!enemies.length) return Infinity;
  let best = Infinity;
  for (const cell of cells) {
    for (const enemy of enemies) {
      best = Math.min(best, Math.abs(cell.row - enemy.row) + Math.abs(cell.col - enemy.col));
    }
  }
  return best;
}

function centralScore(cells) {
  return cells.reduce((sum, cell) => {
    const rowDistance = Math.abs(cell.row - (BOARD_SIZE - 1) / 2);
    const colDistance = Math.abs(cell.col - (BOARD_SIZE - 1) / 2);
    return sum + (BOARD_SIZE - rowDistance - colDistance) / BOARD_SIZE;
  }, 0);
}

function countLineThrough(row, col, axis, player, action) {
  const vectors = axis === "horizontal" ? [[0, -1], [0, 1]] : [[-1, 0], [1, 0]];
  let count = 1;
  for (const [dr, dc] of vectors) {
    let nr = row + dr;
    let nc = col + dc;
    while (inBounds(nr, nc) && hasFriendlyAfterAction(nr, nc, player, action)) {
      count += 1;
      nr += dr;
      nc += dc;
    }
  }
  return count;
}

function getFormationKey(formation) {
  return formation.cells.map((cell) => key(cell.row, cell.col)).sort().join("|");
}

function checkVictory() {
  if (state.winner || !isVictoryActive()) return;
  const redCount = countPieces("red");
  const blueCount = countPieces("blue");
  if (redCount === 0 && blueCount === 0) {
    state.winner = "draw";
    addLog("両軍の盤面コマが0になりました");
  } else if (redCount === 0) {
    state.winner = "blue";
    addLog("Blueの勝利: Redの盤面コマが0になりました");
  } else if (blueCount === 0) {
    state.winner = "red";
    addLog("Redの勝利: Blueの盤面コマが0になりました");
    tone(880, 0.16, "triangle", 0.06);
  }
}

function isVictoryActive() {
  return state.turnsCompleted.red >= 1 && state.turnsCompleted.blue >= 1;
}

function countPieces(player) {
  return getBoardPieces(state.board, player).length;
}

function resetGame() {
  state.board = createEmptyBoard();
  state.currentPlayer = "red";
  state.reserves = { red: STARTING_RESERVE, blue: STARTING_RESERVE };
  state.actionsLeft = MAX_ACTIONS;
  state.mode = "place";
  state.selected = null;
  state.turnsCompleted = { red: 0, blue: 0 };
  state.winner = null;
  state.log = [];
  state.lastBattle = "Battle -";
  state.aiThinking = false;
  state.movedFormationsThisTurn = { red: new Set(), blue: new Set() };
  updateDerivedState();
  addLog("Redのターン。配置から始めてください");
  refresh();
}

function addLog(message) {
  state.log.unshift(message);
  state.log = state.log.slice(0, 32);
}

function refresh() {
  updateDerivedState();
  turnTextEl.textContent = state.winner === "draw" ? "Draw" : state.winner ? playerName(state.winner) : playerName(state.currentPlayer);
  actionsLeftEl.textContent = state.actionsLeft;
  resultTextEl.textContent = state.winner ? (state.winner === "draw" ? "Draw" : `${playerName(state.winner)} Win`) : "Playing";
  redReserveEl.textContent = state.reserves.red;
  blueReserveEl.textContent = state.reserves.blue;
  redBoardCountEl.textContent = countPieces("red");
  blueBoardCountEl.textContent = countPieces("blue");
  phaseTextEl.textContent = state.currentPlayer === "red" ? "Red操作中" : "Blue AI行動中";
  lastBattleEl.textContent = state.lastBattle;
  document.querySelectorAll(".mode-button").forEach((button) => {
    button.classList.toggle("selected", button.dataset.mode === state.mode);
    button.disabled = state.aiThinking || state.currentPlayer !== "red" || Boolean(state.winner);
  });
  document.querySelectorAll(".direction-pad button").forEach((button) => {
    button.disabled = state.aiThinking || state.currentPlayer !== "red" || !state.selected || Boolean(state.winner);
  });
  document.querySelector("#endTurn").disabled = state.aiThinking || state.currentPlayer !== "red" || Boolean(state.winner);
  renderSelectionInfo();
  renderLog();
  renderBoard();
}

function renderSelectionInfo() {
  if (!state.selected) {
    selectionInfoEl.textContent = "None";
    return;
  }
  const stats = state.stats.get(key(state.selected.row, state.selected.col));
  const [row, col] = displayCoord(state.selected.row, state.selected.col);
  selectionInfoEl.innerHTML = [
    `位置: ${row}, ${col}`,
    `体力: ${stats?.health ?? 0}`,
    `陣サイズ: ${stats?.formationSize ?? 1}`,
    `過密: ${stats?.penalized ? "あり" : "なし"}`,
  ].join("<br>");
}

function renderLog() {
  logListEl.replaceChildren();
  for (const item of state.log) {
    const li = document.createElement("li");
    li.textContent = item;
    logListEl.append(li);
  }
}

document.querySelectorAll(".mode-button").forEach((button) => {
  button.addEventListener("click", () => {
    state.mode = button.dataset.mode;
    state.selected = null;
    refresh();
  });
});

document.querySelectorAll(".direction-pad button").forEach((button) => {
  button.addEventListener("click", () => moveSelected(button.dataset.dir));
});

document.querySelector("#endTurn").addEventListener("click", endTurn);
document.querySelector("#reset").addEventListener("click", resetGame);
boardEl.addEventListener("pointerdown", handleBoardPointer);
boardEl.addEventListener("keydown", handleBoardKeydown);
soundButtonEl.addEventListener("click", () => {
  state.soundOn = !state.soundOn;
  soundButtonEl.textContent = state.soundOn ? "Sound On" : "Sound Off";
});

renderCoordinates();
resetGame();
