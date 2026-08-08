/* =========================================================
   던전앤코파일럿 8 — 게임 엔진
   ========================================================= */

const CONFIG = {
  TILE: 32,
  GRID: 19,                 // 정방형 던전 (홀수)
  MAX_HP: 10,
  STAGE_GOAL: 10,           // 포털 개방 점수
  RESPAWN_MS: 6000,         // 몬스터 리스폰 주기
  TIER: {
    low: { name: '슬라임', points: 3, dmg: 2, speed: 0.55, time: 25, color: '#7fae43' },
    mid: { name: '고블린 전사', points: 6, dmg: 3, speed: 0.85, time: 22, color: '#f0b429' },
    high: { name: '데몬 로드', points: 10, dmg: 5, speed: 1.15, time: 20, color: '#e2622a' }
  }
};

const STATE = {
  TITLE: 'title', PLAY: 'play', BATTLE: 'battle', STAGE: 'stage',
  OVER: 'over', PAUSE: 'pause',
  SLOT: 'slot', SOLO: 'solo', SOLO_RESULT: 'soloResult'
};

/* 게임 방식 */
const GAME_MODE = { DUNGEON: 'dungeon', EXPLORE: 'explore' };
/* 난이도 */
const DIFFICULTY = { NORMAL: 'normal', HELL: 'hell' };

const Game = {
  state: STATE.TITLE,
  canvas: null, ctx: null,
  player: null,
  monsters: [],
  walls: null,
  portal: null,
  portalOpen: false,
  stage: 1,
  stagePoints: 0,
  totalPoints: 0,
  hp: CONFIG.MAX_HP,
  playerName: '',
  mode: DEFAULT_MODE,
  gameMode: GAME_MODE.DUNGEON,
  difficulty: DIFFICULTY.NORMAL,
  keys: {},
  lastTime: 0,
  animTimer: 0,
  animFrame: 0,
  respawnTimer: 0,
  currentBattle: null,
  usedQuestions: new Set(),
  floatTexts: [],
  shake: 0,
  cameraX: 0, cameraY: 0,
  running: false,
  solo: null,           // 탐험 모드 1회분 상태
  autoPath: null,       // 클릭 이동 경로 (타일 좌표 배열)
  autoTarget: null      // 클릭 목적지 표시용
};

function isHell() { return Game.difficulty === DIFFICULTY.HELL; }

/* =========================================================
   던전 생성 — 랜덤 정방형 필드
   ========================================================= */
function generateDungeon() {
  const N = CONFIG.GRID;
  const w = [];
  for (let y = 0; y < N; y++) {
    w[y] = [];
    for (let x = 0; x < N; x++) {
      // 외곽은 항상 벽
      w[y][x] = (x === 0 || y === 0 || x === N - 1 || y === N - 1) ? 1 : 0;
    }
  }

  // 랜덤 기둥/벽 배치 (스테이지가 오를수록 복잡)
  const density = Math.min(0.10 + Game.stage * 0.012, 0.20);
  for (let y = 2; y < N - 2; y++) {
    for (let x = 2; x < N - 2; x++) {
      if (Math.random() < density) {
        w[y][x] = 1;
        // 가끔 짧은 벽 조각으로 확장
        if (Math.random() < 0.45) {
          const hor = Math.random() < 0.5;
          const len = 1 + Math.floor(Math.random() * 2);
          for (let i = 1; i <= len; i++) {
            const nx = hor ? x + i : x, ny = hor ? y : y + i;
            if (nx < N - 2 && ny < N - 2) w[ny][nx] = 1;
          }
        }
      }
    }
  }

  // 중앙 스폰 지역은 항상 비움
  const c = Math.floor(N / 2);
  for (let y = c - 1; y <= c + 1; y++)
    for (let x = c - 1; x <= c + 1; x++) w[y][x] = 0;

  // 연결성 보장: 중앙에서 도달 못하는 빈칸은 벽으로 메움
  const seen = Array.from({ length: N }, () => new Array(N).fill(false));
  const q = [[c, c]];
  seen[c][c] = true;
  let reach = 1;
  while (q.length) {
    const [x, y] = q.shift();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (nx >= 0 && ny >= 0 && nx < N && ny < N && !seen[ny][nx] && w[ny][nx] === 0) {
        seen[ny][nx] = true; reach++; q.push([nx, ny]);
      }
    }
  }
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++)
      if (w[y][x] === 0 && !seen[y][x]) w[y][x] = 1;

  // 열린 공간이 너무 적으면 재생성
  if (reach < N * N * 0.42) return generateDungeon();

  Game.walls = w;
}

function isWall(px, py) {
  const T = CONFIG.TILE;
  const gx = Math.floor(px / T), gy = Math.floor(py / T);
  if (gx < 0 || gy < 0 || gx >= CONFIG.GRID || gy >= CONFIG.GRID) return true;
  return Game.walls[gy][gx] === 1;
}

/** 엔티티(정사각 히트박스)가 그 위치에 설 수 있는가 */
function canStand(x, y, size) {
  const m = 3; // 여유
  return !isWall(x + m, y + m) && !isWall(x + size - m, y + m) &&
    !isWall(x + m, y + size - m) && !isWall(x + size - m, y + size - m);
}

function randomFreeTile(minDistFrom, minDist) {
  const T = CONFIG.TILE;
  for (let i = 0; i < 400; i++) {
    const gx = 1 + Math.floor(Math.random() * (CONFIG.GRID - 2));
    const gy = 1 + Math.floor(Math.random() * (CONFIG.GRID - 2));
    if (Game.walls[gy][gx] !== 0) continue;
    const x = gx * T, y = gy * T;
    if (minDistFrom) {
      const d = Math.hypot(x - minDistFrom.x, y - minDistFrom.y);
      if (d < minDist) continue;
    }
    return { x, y };
  }
  return null;
}

/* =========================================================
   몬스터
   ========================================================= */
function tierForStage() {
  // 헬 난이도는 상급만 등장
  if (isHell()) return 'high';
  // 스테이지가 오를수록 상급 비율 증가
  const s = Game.stage;
  const highW = Math.min(8 + s * 5, 42);
  const midW = Math.min(25 + s * 3, 40);
  const lowW = Math.max(100 - highW - midW, 18);
  const r = Math.random() * (lowW + midW + highW);
  if (r < lowW) return 'low';
  if (r < lowW + midW) return 'mid';
  return 'high';
}

function spawnMonster(tier) {
  const pos = randomFreeTile(Game.player, CONFIG.TILE * 3.5);
  if (!pos) return;
  const t = tier || tierForStage();
  const cfg = CONFIG.TIER[t];
  Game.monsters.push({
    tier: t,
    x: pos.x + 4, y: pos.y + 4,
    size: 24,
    dir: Math.floor(Math.random() * 4),
    speed: cfg.speed * (1 + Game.stage * 0.05),
    changeTimer: 500 + Math.random() * 1500,
    cooldown: 0,        // 오답 후 재도전 대기
    spawnFlash: 400
  });
}

function initMonsters() {
  Game.monsters = [];
  const count = Math.min(4 + Game.stage, 9);
  for (let i = 0; i < count; i++) spawnMonster();
}

function updateMonsters(dt) {
  const T = CONFIG.TILE;
  for (const m of Game.monsters) {
    if (m.spawnFlash > 0) m.spawnFlash -= dt;
    if (m.cooldown > 0) m.cooldown -= dt;

    m.changeTimer -= dt;
    if (m.changeTimer <= 0) {
      m.dir = Math.floor(Math.random() * 4);
      m.changeTimer = 700 + Math.random() * 1800;
    }

    const sp = m.speed * (dt / 16);
    const dx = [0, -1, 1, 0][m.dir] * sp;
    const dy = [1, 0, 0, -1][m.dir] * sp;

    if (canStand(m.x + dx, m.y, m.size)) m.x += dx;
    else m.changeTimer = 0;
    if (canStand(m.x, m.y + dy, m.size)) m.y += dy;
    else m.changeTimer = 0;
  }

  // 몬스터끼리 겹치지 않도록 부드럽게 밀어냄
  for (let i = 0; i < Game.monsters.length; i++) {
    for (let j = i + 1; j < Game.monsters.length; j++) {
      const a = Game.monsters[i], b = Game.monsters[j];
      const ax = a.x + a.size / 2, ay = a.y + a.size / 2;
      const bx = b.x + b.size / 2, by = b.y + b.size / 2;
      let dx = bx - ax, dy = by - ay;
      let d = Math.hypot(dx, dy);
      const min = a.size * 0.9;
      if (d > 0 && d < min) {
        const push = (min - d) / 2;
        dx /= d; dy /= d;
        if (canStand(a.x - dx * push, a.y - dy * push, a.size)) {
          a.x -= dx * push; a.y -= dy * push;
        }
        if (canStand(b.x + dx * push, b.y + dy * push, b.size)) {
          b.x += dx * push; b.y += dy * push;
        }
      }
    }
  }
}

/* =========================================================
   플레이어
   ========================================================= */
function initPlayer() {
  const T = CONFIG.TILE;
  const c = Math.floor(CONFIG.GRID / 2);
  Game.player = {
    x: c * T + 4, y: c * T + 4,
    size: 24, dir: 0, speed: 2.4,
    invuln: 0, walking: false
  };
}

function updatePlayer(dt) {
  const p = Game.player;
  if (p.invuln > 0) p.invuln -= dt;

  let dx = 0, dy = 0;
  const K = Game.keys;
  if (K['ArrowLeft'] || K['a'] || K['A'] || K['ㅁ']) { dx -= 1; p.dir = 1; }
  if (K['ArrowRight'] || K['d'] || K['D'] || K['ㅇ']) { dx += 1; p.dir = 2; }
  if (K['ArrowUp'] || K['w'] || K['W'] || K['ㅈ']) { dy -= 1; p.dir = 3; }
  if (K['ArrowDown'] || K['s'] || K['S'] || K['ㄴ']) { dy += 1; p.dir = 0; }

  // 직접 조작이 들어오면 클릭 이동은 즉시 취소한다
  if (dx || dy) clearAutoPath();

  if (!dx && !dy && Game.autoPath) {
    const step = followAutoPath(dt);
    dx = step.dx; dy = step.dy;
    if (step.dir >= 0) p.dir = step.dir;
  }

  p.walking = (dx !== 0 || dy !== 0);
  if (!p.walking) return;

  if (dx && dy) { dx *= 0.707; dy *= 0.707; }
  const sp = p.speed * (dt / 16);
  const nx = p.x + dx * sp, ny = p.y + dy * sp;

  let moved = false;
  if (canStand(nx, p.y, p.size)) { p.x = nx; moved = true; }
  if (canStand(p.x, ny, p.size)) { p.y = ny; moved = true; }

  // 벽에 껴서 진행이 안 되면 경로를 버린다(무한 대기 방지)
  if (!moved && Game.autoPath) clearAutoPath();
}

/* =========================================================
   클릭 이동 — BFS 최단경로
   ========================================================= */
function clearAutoPath() {
  Game.autoPath = null;
  Game.autoTarget = null;
}

/** 타일 좌표 기준 BFS. 도착 불가면 null */
function findPath(sx, sy, tx, ty) {
  const N = CONFIG.GRID;
  if (tx < 0 || ty < 0 || tx >= N || ty >= N) return null;
  if (Game.walls[ty][tx] === 1) return null;
  if (sx === tx && sy === ty) return null;

  const prev = new Int32Array(N * N).fill(-1);
  const seen = new Uint8Array(N * N);
  const queue = [sy * N + sx];
  seen[sy * N + sx] = 1;
  const goal = ty * N + tx;
  const D = [[1, 0], [-1, 0], [0, 1], [0, -1]];

  for (let head = 0; head < queue.length; head++) {
    const cur = queue[head];
    if (cur === goal) {
      const path = [];
      for (let n = goal; n !== -1; n = prev[n]) path.push({ x: n % N, y: (n / N) | 0 });
      path.reverse();
      path.shift();               // 현재 서 있는 칸은 뺀다
      return path.length ? path : null;
    }
    const cx = cur % N, cy = (cur / N) | 0;
    for (const [ox, oy] of D) {
      const nx = cx + ox, ny = cy + oy;
      if (nx < 0 || ny < 0 || nx >= N || ny >= N) continue;
      const ni = ny * N + nx;
      if (seen[ni] || Game.walls[ny][nx] === 1) continue;
      seen[ni] = 1;
      prev[ni] = cur;
      queue.push(ni);
    }
  }
  return null;
}

/** 캔버스 좌표(px)로 이동 명령. 성공하면 true */
function moveTo(px, py) {
  if (Game.state !== STATE.PLAY) return false;
  const T = CONFIG.TILE, p = Game.player;
  const tx = Math.floor(px / T), ty = Math.floor(py / T);
  const sx = Math.floor((p.x + p.size / 2) / T), sy = Math.floor((p.y + p.size / 2) / T);

  const path = findPath(sx, sy, tx, ty);
  if (!path) { clearAutoPath(); return false; }

  Game.autoPath = path;
  Game.autoTarget = { x: tx * T + T / 2, y: ty * T + T / 2, t: performance.now() };
  return true;
}

/** 경로의 다음 칸을 향한 이동 방향을 계산 */
function followAutoPath(dt) {
  const p = Game.player, T = CONFIG.TILE;
  const path = Game.autoPath;
  if (!path || !path.length) { clearAutoPath(); return { dx: 0, dy: 0, dir: -1 }; }

  const node = path[0];
  const cx = p.x + p.size / 2, cy = p.y + p.size / 2;
  const gx = node.x * T + T / 2, gy = node.y * T + T / 2;
  let ddx = gx - cx, ddy = gy - cy;

  // 칸 중심에 충분히 가까우면 다음 칸으로
  if (Math.hypot(ddx, ddy) < 3) {
    path.shift();
    if (!path.length) { clearAutoPath(); return { dx: 0, dy: 0, dir: -1 }; }
    return followAutoPath(dt);
  }

  // 축 하나씩 정렬해 벽 모서리에 걸리지 않게 한다
  let dx = 0, dy = 0, dir = -1;
  if (Math.abs(ddx) > Math.abs(ddy)) {
    dx = Math.sign(ddx); dir = dx < 0 ? 1 : 2;
  } else {
    dy = Math.sign(ddy); dir = dy < 0 ? 3 : 0;
  }

  // 남은 거리가 한 스텝보다 짧으면 지나치지 않도록 비율을 줄인다
  const sp = p.speed * (dt / 16);
  const remain = Math.abs(dx ? ddx : ddy);
  if (remain < sp && sp > 0) { const k = remain / sp; dx *= k; dy *= k; }

  return { dx, dy, dir };
}

/* =========================================================
   충돌 / 전투 트리거
   ========================================================= */
function checkCollisions() {
  const p = Game.player;
  if (p.invuln > 0) return;

  for (const m of Game.monsters) {
    if (m.cooldown > 0) continue;
    const dx = (p.x + p.size / 2) - (m.x + m.size / 2);
    const dy = (p.y + p.size / 2) - (m.y + m.size / 2);
    if (Math.hypot(dx, dy) < (p.size + m.size) / 2 - 6) {
      startBattle(m);
      return;
    }
  }

  // 포털 진입
  if (Game.portalOpen && Game.portal) {
    const dx = (p.x + p.size / 2) - (Game.portal.x + 16);
    const dy = (p.y + p.size / 2) - (Game.portal.y + 16);
    if (Math.hypot(dx, dy) < 22) nextStage();
  }
}

/* =========================================================
   포털 / 스테이지
   ========================================================= */
function openPortal() {
  if (Game.portalOpen) return;
  const pos = randomFreeTile(Game.player, CONFIG.TILE * 4);
  if (!pos) return;
  Game.portal = { x: pos.x, y: pos.y };
  Game.portalOpen = true;
  Audio8.play('portalOpen');
  addFloat('포털이 열렸다!', Game.player.x, Game.player.y - 20, '#4fc3d9', 2200);
  UI.toast('포털이 열렸습니다. 다음 스테이지로 이동하세요');
}

function nextStage() {
  Game.stage++;
  Game.stagePoints = 0;
  Game.portalOpen = false;
  Game.portal = null;
  Audio8.play('stageUp');
  Game.state = STATE.STAGE;
  UI.showStageTransition();
}

function beginStage() {
  generateDungeon();
  initPlayer();
  initMonsters();
  Game.respawnTimer = CONFIG.RESPAWN_MS;
  Game.state = STATE.PLAY;
  Audio8.playBGM('dungeon');
  UI.updateHUD();
}

/* =========================================================
   플로팅 텍스트 / 화면 흔들림
   ========================================================= */
function addFloat(text, x, y, color, life = 1200) {
  Game.floatTexts.push({ text, x, y, color, life, maxLife: life });
}

function updateFloats(dt) {
  for (const f of Game.floatTexts) { f.life -= dt; f.y -= dt * 0.02; }
  Game.floatTexts = Game.floatTexts.filter(f => f.life > 0);
  if (Game.shake > 0) Game.shake -= dt * 0.02;
}

/* =========================================================
   메인 루프
   ========================================================= */
function loop(ts) {
  if (!Game.running) return;
  const dt = Math.min(ts - Game.lastTime || 16, 50);
  Game.lastTime = ts;

  if (typeof Pad !== 'undefined') Pad.poll();

  Game.animTimer += dt;
  if (Game.animTimer > 220) { Game.animTimer = 0; Game.animFrame ^= 1; }

  if (Game.state === STATE.PLAY) {
    updatePlayer(dt);
    updateMonsters(dt);
    checkCollisions();

    Game.respawnTimer -= dt;
    if (Game.respawnTimer <= 0) {
      Game.respawnTimer = CONFIG.RESPAWN_MS;
      const cap = Math.min(5 + Game.stage, 10);
      if (Game.monsters.length < cap) spawnMonster();
    }
  }

  updateFloats(dt);
  if (Game.state === STATE.PLAY || Game.state === STATE.BATTLE || Game.state === STATE.PAUSE) render();
  requestAnimationFrame(loop);
}

function startGame(name, mode) {
  Game.playerName = name;
  Game.mode = mode || DEFAULT_MODE;
  Game.stage = 1;
  Game.stagePoints = 0;
  Game.totalPoints = 0;
  Game.hp = CONFIG.MAX_HP;
  Game.usedQuestions = new Set();
  Game.floatTexts = [];
  Game.portalOpen = false;
  Game.portal = null;
  Game.shake = 0;
  Game.keys = {};
  clearAutoPath();
  if (Game.currentBattle && Game.currentBattle.timerId) clearInterval(Game.currentBattle.timerId);
  Game.currentBattle = null;
  UI.hideBattle();
  beginStage();
  if (!Game.running) {
    Game.running = true;
    Game.lastTime = performance.now();
    requestAnimationFrame(loop);
  }
}

function gameOver() {
  Game.state = STATE.OVER;
  Audio8.stopBGM();
  Audio8.play('gameOver');
  Leaderboard.save(Game.playerName, Game.stage, Game.totalPoints);
  UI.showGameOver();
}

/* =========================================================
   일시정지 / 중도 종료
   ========================================================= */
function pauseGame() {
  if (Game.state !== STATE.PLAY) return;
  Game.state = STATE.PAUSE;
  Game.keys = {};              // 키 끌림 방지
  clearAutoPath();
  Audio8.play('select');
  UI.showPause();
}

function resumeGame() {
  if (Game.state !== STATE.PAUSE) return;
  Game.state = STATE.PLAY;
  Game.keys = {};
  Game.lastTime = performance.now();
  Audio8.play('select');
  UI.hidePause();
}

/** 여기까지의 기록을 남기고 종료 */
function quitWithRecord() {
  if (Game.state !== STATE.PAUSE) return;
  UI.hidePause();
  gameOver();
}

/** 기록을 남기지 않고 타이틀로 */
function abandonGame() {
  if (Game.state !== STATE.PAUSE) return;
  UI.hidePause();
  Audio8.stopBGM();
  Game.running = false;
  Game.state = STATE.TITLE;
  Game.keys = {};
  clearAutoPath();
  UI.showTitle();
}
