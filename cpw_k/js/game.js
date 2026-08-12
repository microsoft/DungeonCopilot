/* =========================================================
   Copilot World — 게임 엔진 (횡스크롤 플랫포머)
   ========================================================= */

const CONFIG = {
  TILE: 32,
  VIEW_COLS: 30,
  VIEW_ROWS: 17,
  MAX_HP: 5,
  GRAVITY: 0.58,
  JUMP_V: -11.8,
  MOVE: 3.5,
  AIR_MOVE: 3.5,
  MAX_FALL: 15,
  COYOTE: 110,          // 발판을 벗어난 뒤에도 점프를 받아주는 시간(ms)
  JUMP_BUFFER: 130,     // 착지 직전 점프 입력을 기억하는 시간(ms)
  DASH_V: 9.5,
  DASH_MS: 190,
  DASH_COOL: 620,
  DRAFT_MS: 4200,       // 초안 발판 유지 시간
  INVULN_MS: 1300
};

const STATE = {
  TITLE: 'title', PLAY: 'play', INTRO: 'intro', POWER: 'power',
  QUIZ: 'quiz', CLEAR: 'clear', OVER: 'over', PAUSE: 'pause', ENDING: 'ending'
};

const Game = {
  state: STATE.TITLE,
  canvas: null, ctx: null,
  level: null, levelIndex: 0,
  tiles: null,                 // 현재 스테이지의 가변 타일 (파괴/생성 반영)
  player: null,
  foes: [], coins: [], drafts: [], chores: [], particles: [], floats: [],
  boss: null,
  abilities: {},               // { prompt:true, ... }
  promptDone: false,
  keys: {},
  jumpHeld: false,
  cameraX: 0,
  hp: CONFIG.MAX_HP,
  score: 0,
  coinCount: 0,
  playerName: '',
  startedAt: 0,
  elapsed: 0,
  running: false,
  lastTime: 0,
  animTimer: 0, animFrame: 0,
  shake: 0,
  hintTimer: 0, hintText: ''
};

const T = () => CONFIG.TILE;

/* =========================================================
   타일 판정
   ========================================================= */
function tileAt(tx, ty) {
  if (ty < 0 || ty >= LEVEL_H) return '.';
  if (tx < 0 || tx >= Game.level.width) return '#';   // 좌우 바깥은 벽 취급
  return Game.tiles[ty][tx];
}

function isSolidChar(ch) {
  switch (ch) {
    case '#': case '=': case '?': case 'D': return true;
    case 'p': return Game.promptDone;
    case 'h': return !!Game.abilities.ground;
    default: return false;
  }
}

function isSolidAt(tx, ty) { return isSolidChar(tileAt(tx, ty)); }

function isHazardAt(tx, ty) { return tileAt(tx, ty) === '^'; }

/** 초안 발판(동적)과 겹치는가 */
function draftAt(px, py, w, h) {
  for (const d of Game.drafts) {
    if (px < d.x + d.w && px + w > d.x && py < d.y + d.h && py + h > d.y) return d;
  }
  return null;
}

/** AABB가 고체와 겹치는가 (타일 + 초안 발판) */
function collidesSolid(x, y, w, h) {
  const t = T();
  const x0 = Math.floor(x / t), x1 = Math.floor((x + w - 1) / t);
  const y0 = Math.floor(y / t), y1 = Math.floor((y + h - 1) / t);
  for (let ty = y0; ty <= y1; ty++)
    for (let tx = x0; tx <= x1; tx++)
      if (isSolidAt(tx, ty)) return true;
  return !!draftAt(x, y, w, h);
}

/* =========================================================
   충돌 해결 — 타일 경계에 정확히 붙인다.
   1px 씩 되미는 방식은 매 프레임 미세한 틈이 남아
   onGround 가 깜빡이므로 쓰지 않는다.
   ========================================================= */

/** 세로 이동. 'floor' | 'ceil' | null 을 돌려준다 */
function moveY(e, dy) {
  const t = T();
  const ny = e.y + dy;
  if (!collidesSolid(e.x, ny, e.w, e.h)) { e.y = ny; return null; }

  const x0 = Math.floor(e.x / t), x1 = Math.floor((e.x + e.w - 1) / t);

  if (dy > 0) {
    let surface = Infinity;
    const y0 = Math.floor((e.y + e.h) / t), y1 = Math.floor((ny + e.h - 1) / t);
    for (let ty = y0; ty <= y1; ty++)
      for (let tx = x0; tx <= x1; tx++)
        if (isSolidAt(tx, ty)) { surface = Math.min(surface, ty * t); break; }
    for (const d of Game.drafts) {
      if (e.x < d.x + d.w && e.x + e.w > d.x && d.y + 2 >= e.y + e.h && d.y < ny + e.h) {
        surface = Math.min(surface, d.y);
      }
    }
    e.y = surface === Infinity ? ny : surface - e.h;
    return 'floor';
  }

  let ceil = -Infinity;
  const y0 = Math.floor(ny / t), y1 = Math.floor(e.y / t);
  for (let ty = y1; ty >= y0; ty--)
    for (let tx = x0; tx <= x1; tx++)
      if (isSolidAt(tx, ty)) { ceil = Math.max(ceil, (ty + 1) * t); break; }
  for (const d of Game.drafts) {
    if (e.x < d.x + d.w && e.x + e.w > d.x && d.y + d.h <= e.y + 2 && d.y + d.h > ny) {
      ceil = Math.max(ceil, d.y + d.h);
    }
  }
  e.y = ceil === -Infinity ? ny : ceil;
  return 'ceil';
}

/** 가로 이동. 벽에 막히면 true */
function moveX(e, dx) {
  const t = T();
  const nx = e.x + dx;
  if (!collidesSolid(nx, e.y, e.w, e.h)) { e.x = nx; return false; }

  const y0 = Math.floor(e.y / t), y1 = Math.floor((e.y + e.h - 1) / t);

  if (dx > 0) {
    let wall = Infinity;
    const x0 = Math.floor((e.x + e.w) / t), x1 = Math.floor((nx + e.w - 1) / t);
    for (let tx = x0; tx <= x1; tx++)
      for (let ty = y0; ty <= y1; ty++)
        if (isSolidAt(tx, ty)) { wall = Math.min(wall, tx * t); break; }
    for (const d of Game.drafts) {
      if (e.y < d.y + d.h && e.y + e.h > d.y && d.x >= e.x + e.w - 1) wall = Math.min(wall, d.x);
    }
    e.x = wall === Infinity ? nx : wall - e.w;
  } else {
    let wall = -Infinity;
    const x0 = Math.floor(nx / t), x1 = Math.floor(e.x / t);
    for (let tx = x1; tx >= x0; tx--)
      for (let ty = y0; ty <= y1; ty++)
        if (isSolidAt(tx, ty)) { wall = Math.max(wall, (tx + 1) * t); break; }
    for (const d of Game.drafts) {
      if (e.y < d.y + d.h && e.y + e.h > d.y && d.x + d.w <= e.x + 1) wall = Math.max(wall, d.x + d.w);
    }
    e.x = wall === -Infinity ? nx : wall;
  }
  return true;
}

/* =========================================================
   스테이지 로드
   ========================================================= */
function loadLevel(i) {
  const lv = LEVELS[i];
  Game.levelIndex = i;
  Game.level = lv;
  Game.tiles = lv.tiles.map(row => row.slice());
  Game.promptDone = false;
  Game.cameraX = 0;
  Game.drafts = [];
  Game.chores = [];
  Game.particles = [];
  Game.floats = [];
  Game.shake = 0;

  Game.coins = lv.coins.map(c => ({
    x: c.x * T() + 4, y: c.y * T() + 4, taken: false
  }));

  Game.foes = lv.foes.map(f => ({
    kind: f.kind,
    x: f.x * T() + 4, y: f.y * T() + 6,
    w: 24, h: 26,
    vx: -0.9 - Math.random() * 0.3,
    vy: 0,
    homeX: f.x * T(),
    patrol: (f.patrol || 3) * T(),
    dead: 0,
    hp: f.kind === 'repeat' ? 2 : 1
  }));

  Game.player = {
    x: lv.start.x * T() + 4, y: lv.start.y * T(),
    w: 22, h: 28,
    vx: 0, vy: 0,
    dir: 1,
    onGround: false,
    coyote: 0, jumpBuf: 0,
    invuln: 0,
    dashing: 0, dashCool: 0,
    draftCool: 0, draftCount: 0,
    state: 'idle'
  };

  Game.abilityBox = lv.abilityAt
    ? { x: lv.abilityAt.x * T() + 4, y: lv.abilityAt.y * T() + 4, key: lv.ability, taken: false }
    : null;

  Game.goal = lv.goal ? { x: lv.goal.x * T(), y: lv.goal.y * T() - 32 } : null;

  Game.boss = lv.boss
    ? {
      x: lv.boss.x * T(), y: lv.boss.y * T(),
      w: 44, h: 44,
      vx: 1.4, vy: 0,
      hp: 3, maxHp: 3,
      hurt: 0, fireTimer: 1400, bob: 0
    }
    : null;

  Sfx.playBGM(lv.theme === 'boss' ? 'boss' : 'field');
}

/* =========================================================
   플레이어
   ========================================================= */
function wantLeft() { const k = Game.keys; return k['ArrowLeft'] || k['a'] || k['A'] || k['ㅁ']; }
function wantRight() { const k = Game.keys; return k['ArrowRight'] || k['d'] || k['D'] || k['ㅇ']; }
function wantDown() { const k = Game.keys; return k['ArrowDown'] || k['s'] || k['S'] || k['ㄴ']; }

function requestJump() {
  if (Game.state !== STATE.PLAY) return;
  Game.player.jumpBuf = CONFIG.JUMP_BUFFER;
}

function requestDash() {
  const p = Game.player;
  if (Game.state !== STATE.PLAY || !Game.abilities.analyze) return;
  if (p.dashing > 0 || p.dashCool > 0) return;
  p.dashing = CONFIG.DASH_MS;
  p.dashCool = CONFIG.DASH_COOL;
  p.vy = 0;
  Sfx.play('dash');
  Game.shake = Math.max(Game.shake, 5);
}

function requestDraft() {
  const p = Game.player;
  if (Game.state !== STATE.PLAY || !Game.abilities.draft) return;
  // 공중에서 최대 2번. 무제한이면 발판을 쌓아 하늘까지 올라간다
  if (p.onGround || p.draftCount >= 2 || p.draftCool > 0) return;
  const t = T();
  const bx = Math.round((p.x + p.w / 2 - t * 2) / 4) * 4;
  const by = Math.floor((p.y + p.h + 6) / 4) * 4;
  if (collidesSolid(bx, by, t * 4, 12)) return;
  Game.drafts = [{ x: bx, y: by, w: t * 4, h: 12, life: CONFIG.DRAFT_MS, max: CONFIG.DRAFT_MS }];
  p.draftCount++;
  p.draftCool = 260;
  p.vy = Math.min(p.vy, -2);
  Sfx.play('build');
  addFloat('초안 생성', p.x + p.w / 2, p.y - 6, '#5b8def', 900);
}

/** 초안 발판이 아닌 진짜 바닥을 밟으면 초안을 다시 쓸 수 있다 */
function standingOnDraft(p) {
  for (const d of Game.drafts) {
    if (p.x < d.x + d.w && p.x + p.w > d.x &&
      Math.abs((p.y + p.h) - d.y) < 4) return true;
  }
  return false;
}

function updatePlayer(dt) {
  const p = Game.player;
  const step = dt / 16.667;

  if (p.invuln > 0) p.invuln -= dt;
  if (p.dashCool > 0) p.dashCool -= dt;
  if (p.draftCool > 0) p.draftCool -= dt;
  if (p.jumpBuf > 0) p.jumpBuf -= dt;
  if (p.coyote > 0) p.coyote -= dt;

  /* ---- 대시 ---- */
  if (p.dashing > 0) {
    p.dashing -= dt;
    p.vx = p.dir * CONFIG.DASH_V;
    p.vy = 0;
    spawnParticle(p.x + p.w / 2, p.y + p.h / 2, '#2fae5f');
  } else {
    const acc = p.onGround ? CONFIG.MOVE : CONFIG.AIR_MOVE;
    let target = 0;
    if (wantLeft()) { target = -acc; p.dir = -1; }
    if (wantRight()) { target = acc; p.dir = 1; }
    p.vx += (target - p.vx) * (p.onGround ? 0.34 : 0.16);
    if (Math.abs(p.vx) < 0.05) p.vx = 0;
  }

  /* ---- 점프 ---- */
  if (p.jumpBuf > 0 && (p.onGround || p.coyote > 0) && p.dashing <= 0) {
    p.vy = CONFIG.JUMP_V;
    p.onGround = false;
    p.coyote = 0;
    p.jumpBuf = 0;
    Sfx.play('jump');
  }
  // 점프 키를 일찍 떼면 낮게 뛴다
  if (p.vy < -4 && !Game.jumpHeld) {
    p.vy += 0.55 * step;
  }

  /* ---- 중력 ---- */
  if (p.dashing <= 0) {
    p.vy = Math.min(p.vy + CONFIG.GRAVITY * step, CONFIG.MAX_FALL);
  }

  /* ---- 수평 이동 + 충돌 ---- */
  const wasGround = p.onGround;
  let dx = p.vx * step;
  const maxX = Game.level.width * T() - p.w;
  if (p.x + dx < 0) dx = -p.x;
  if (p.x + dx > maxX) dx = maxX - p.x;

  if (p.dashing > 0 && collidesSolid(p.x + dx, p.y, p.w, p.h)) {
    // 대시 중이면 데이터 벽을 부수고 그대로 통과한다
    if (breakDataAhead(p.x + dx, p.y, p.w, p.h)) p.x += dx;
    else { moveX(p, dx); p.vx = 0; p.dashing = 0; }
  } else if (moveX(p, dx)) {
    p.vx = 0;
  }

  /* ---- 수직 이동 + 충돌 ---- */
  const hit = moveY(p, p.vy * step);
  if (hit === 'floor') {
    if (!wasGround) Sfx.play('land');
    p.onGround = true;
    p.coyote = CONFIG.COYOTE;
    p.vy = 0;
    if (!standingOnDraft(p)) p.draftCount = 0;
  } else {
    if (hit === 'ceil') p.vy = 0;
    if (p.onGround) p.coyote = CONFIG.COYOTE;
    p.onGround = false;
  }

  // 발밑 확인 (발판 위를 걸을 때 매 프레임 확실히 붙잡는다)
  if (!p.onGround && p.vy >= 0 && collidesSolid(p.x, p.y + 2, p.w, p.h)) {
    p.onGround = true;
  }

  // 화면 위로 날아가지 않도록 안전장치
  if (p.y < -2 * T()) { p.y = -2 * T(); p.vy = Math.max(p.vy, 0); }

  p.state = !p.onGround ? 'jump' : (Math.abs(p.vx) > 0.4 ? 'walk' : 'idle');

  /* ---- 낙사 ---- */
  if (p.y > (LEVEL_H + 2) * T()) {
    damage(1, true);
  }

  /* ---- 가시 ---- */
  const t = T();
  const cx = Math.floor((p.x + p.w / 2) / t);
  const cy = Math.floor((p.y + p.h - 2) / t);
  if (isHazardAt(cx, cy)) damage(1);

  checkPickups();
  checkPromptBlock();
}

/** 대시 진행 방향의 데이터 벽을 부순다. 하나라도 부수면 true */
function breakDataAhead(x, y, w, h) {
  const t = T();
  const x0 = Math.floor(x / t), x1 = Math.floor((x + w - 1) / t);
  const y0 = Math.floor(y / t), y1 = Math.floor((y + h - 1) / t);
  let broke = false;
  for (let ty = y0; ty <= y1; ty++) {
    for (let tx = x0; tx <= x1; tx++) {
      if (tileAt(tx, ty) === 'D') {
        // 위아래로 이어진 벽을 통째로 무너뜨린다
        for (let k = 0; k < LEVEL_H; k++) {
          if (Game.tiles[k][tx] === 'D') {
            Game.tiles[k][tx] = '.';
            for (let i = 0; i < 4; i++) spawnParticle(tx * t + 8 + i * 5, k * t + 16, '#2fae5f');
          }
        }
        broke = true;
      }
    }
  }
  if (broke) {
    Sfx.play('break');
    Game.shake = 8;
    addScore(30, x + w / 2, y, '데이터 돌파 +30');
  }
  return broke;
}

/* =========================================================
   프롬프트 블록
   ========================================================= */
function checkPromptBlock() {
  if (Game.promptDone || !Game.abilities.prompt) return;
  const p = Game.player, t = T();
  const x0 = Math.floor((p.x - 8) / t), x1 = Math.floor((p.x + p.w + 8) / t);
  const y0 = Math.floor((p.y - 8) / t), y1 = Math.floor((p.y + p.h + 8) / t);
  for (let ty = y0; ty <= y1; ty++) {
    for (let tx = x0; tx <= x1; tx++) {
      if (tileAt(tx, ty) === '?') { activatePrompt(tx, ty); return; }
    }
  }
}

function activatePrompt(tx, ty) {
  Game.promptDone = true;
  const t = T();
  Sfx.play('portal');
  Game.shake = 6;
  addFloat('"이 벽 어떻게 넘지?"', tx * t, ty * t - 24, '#4fc3f7', 2200);
  UI.banner('프롬프트를 입력했습니다 — 발판이 생겼습니다', '#4fc3f7');
  // 발판 위치에 반짝임
  for (let y = 0; y < LEVEL_H; y++)
    for (let x = 0; x < Game.level.width; x++)
      if (Game.tiles[y][x] === 'p')
        for (let i = 0; i < 5; i++) spawnParticle(x * t + 6 + i * 5, y * t + 16, '#4fc3f7');
  addScore(50, tx * t, ty * t, '');
}

/* =========================================================
   획득물
   ========================================================= */
function overlap(a, ax, ay, aw, ah, bx, by, bw, bh) {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

function checkPickups() {
  const p = Game.player;

  for (const c of Game.coins) {
    if (c.taken) continue;
    if (overlap(null, p.x, p.y, p.w, p.h, c.x, c.y, 24, 24)) {
      c.taken = true;
      Game.coinCount++;
      addScore(10, c.x, c.y, '');
      Sfx.play('coin');
      spawnParticle(c.x + 12, c.y + 12, '#f2c033');
    }
  }

  const box = Game.abilityBox;
  if (box && !box.taken && overlap(null, p.x, p.y, p.w, p.h, box.x - 8, box.y - 10, 42, 46)) {
    box.taken = true;
    grantAbility(box.key);
  }

  if (Game.goal && overlap(null, p.x, p.y, p.w, p.h, Game.goal.x - 10, Game.goal.y, 52, 72)) {
    clearStage();
  }
}

function grantAbility(key) {
  Game.abilities[key] = true;
  Sfx.play('power');
  Game.state = STATE.POWER;
  if (key === 'ground') Sfx.play('reveal');
  UI.showPowerUp(ABILITY[key]);
}

/* =========================================================
   적
   ========================================================= */
function updateFoes(dt) {
  const step = dt / 16.667, t = T();
  const p = Game.player;

  for (const f of Game.foes) {
    if (f.dead > 0) { f.dead -= dt; continue; }
    if (f.dead < 0) continue;

    // 화면 밖은 갱신하지 않는다
    if (f.x < Game.cameraX - 200 || f.x > Game.cameraX + CONFIG.VIEW_COLS * t + 200) continue;

    f.vy = Math.min(f.vy + CONFIG.GRAVITY * step, CONFIG.MAX_FALL);

    // 벽에 막히거나, 순찰 범위를 벗어나거나, 발밑이 끊기면 방향을 바꾼다
    const probeX = f.x + f.vx * step;
    const edgeX = f.vx > 0 ? probeX + f.w + 1 : probeX - 1;
    const noFloor = !collidesSolid(edgeX, f.y + f.h + 2, 1, 3);
    if (Math.abs(probeX - f.homeX) > f.patrol || noFloor) {
      f.vx *= -1;
    } else if (moveX(f, f.vx * step)) {
      f.vx *= -1;
    }

    if (moveY(f, f.vy * step) === 'floor') f.vy = 0;

    if (f.y > (LEVEL_H + 2) * t) { f.dead = -1; continue; }

    // 충돌
    if (overlap(null, p.x, p.y, p.w, p.h, f.x, f.y, f.w, f.h)) {
      const stomping = p.vy > 1.2 && (p.y + p.h) - f.y < 20;
      if (stomping) {
        killFoe(f);
        p.vy = CONFIG.JUMP_V * 0.62;
      } else if (p.dashing > 0) {
        killFoe(f, true);
      } else {
        damage(1);
      }
    }
  }
}

function killFoe(f, byDash) {
  f.hp -= byDash ? 2 : 1;
  if (f.hp > 0) {
    f.vx *= -1.3;
    Sfx.play('stomp');
    addFloat('아직 남았다', f.x, f.y - 10, '#ffd479', 800);
    return;
  }
  f.dead = 260;
  Sfx.play('stomp');
  addScore(byDash ? 30 : 20, f.x, f.y, '');
  for (let i = 0; i < 6; i++) spawnParticle(f.x + 12, f.y + 12, '#ffffff');
}

/* =========================================================
   보스
   ========================================================= */
function updateBoss(dt) {
  const b = Game.boss;
  if (!b) return;
  const step = dt / 16.667, p = Game.player, t = T();

  b.bob += dt * 0.004;
  if (b.hurt > 0) b.hurt -= dt;

  b.x += b.vx * step;
  const left = 42 * t, right = (Game.level.width - 4) * t;
  if (b.x < left) { b.x = left; b.vx *= -1; }
  if (b.x + b.w > right) { b.x = right - b.w; b.vx *= -1; }

  const drawY = b.y + Math.sin(b.bob) * 18;

  // 잡무 투척
  b.fireTimer -= dt;
  if (b.fireTimer <= 0) {
    b.fireTimer = 1500 - (b.maxHp - b.hp) * 320;
    Game.chores.push({
      x: b.x + b.w / 2 - 10, y: drawY + b.h,
      vx: (p.x < b.x ? -1 : 1) * 2.2, vy: 1.2, life: 5200
    });
    Sfx.play('boss');
  }

  // 밟기 판정
  if (b.hurt <= 0 && overlap(null, p.x, p.y, p.w, p.h, b.x, drawY, b.w, b.h)) {
    const stomping = p.vy > 1 && (p.y + p.h) - drawY < 26;
    if (stomping || p.dashing > 0) {
      b.hp--;
      b.hurt = 900;
      b.vx *= -1.25;
      p.vy = CONFIG.JUMP_V * 0.7;
      Sfx.play('break');
      Game.shake = 10;
      addScore(150, b.x, drawY, '유효타!');
      for (let i = 0; i < 12; i++) spawnParticle(b.x + b.w / 2, drawY + b.h / 2, '#b39cf0');
      if (b.hp <= 0) defeatBoss();
    } else {
      damage(1);
    }
  }

  // 투사체
  for (const c of Game.chores) {
    c.life -= dt;
    c.vy = Math.min(c.vy + 0.25 * step, 9);
    c.x += c.vx * step;
    c.y += c.vy * step;
    if (collidesSolid(c.x, c.y, 20, 20)) { c.life = 0; continue; }
    if (overlap(null, p.x, p.y, p.w, p.h, c.x, c.y, 20, 20)) {
      c.life = 0;
      if (p.dashing > 0) { addScore(15, c.x, c.y, ''); Sfx.play('stomp'); }
      else damage(1);
    }
  }
  Game.chores = Game.chores.filter(c => c.life > 0);
}

function defeatBoss() {
  Game.boss.dead = true;
  Game.chores = [];
  Sfx.stopBGM();
  Sfx.play('clear');
  addScore(500, Game.player.x, Game.player.y, '');
  Game.state = STATE.CLEAR;
  setTimeout(() => finishGame(true), 900);
}

/* =========================================================
   피해 / 점수 / 이펙트
   ========================================================= */
function damage(n, fell) {
  const p = Game.player;
  if (p.invuln > 0 && !fell) return;
  Game.hp -= n;
  p.invuln = CONFIG.INVULN_MS;
  Sfx.play('hurt');
  Game.shake = 9;
  UI.updateHUD();

  if (Game.hp <= 0) { finishGame(false); return; }

  if (fell) {
    respawnAtCheckpoint();
  } else {
    p.vy = -6;
    p.vx = -p.dir * 4;
  }
}

/** 낙사하면 카메라 왼쪽 끝의 안전한 땅으로 되돌린다 */
function respawnAtCheckpoint() {
  const p = Game.player, t = T();
  const startTx = Math.floor((Game.cameraX + 3 * t) / t);
  for (let tx = startTx; tx >= 0; tx--) {
    for (let ty = 2; ty < LEVEL_H; ty++) {
      if (isSolidAt(tx, ty) && !isSolidAt(tx, ty - 1) && !isSolidAt(tx, ty - 2)) {
        p.x = tx * t + 5; p.y = (ty - 1) * t - 4;
        p.vx = 0; p.vy = 0;
        return;
      }
    }
  }
  p.x = Game.level.start.x * t + 4;
  p.y = Game.level.start.y * t;
  p.vx = 0; p.vy = 0;
}

function addScore(n, x, y, label) {
  Game.score += n;
  if (label) addFloat(label, x, y - 8, '#ffe89a', 1200);
  UI.updateHUD();
}

function addFloat(text, x, y, color, life = 1100) {
  Game.floats.push({ text, x, y, color, life, max: life });
}

function spawnParticle(x, y, color) {
  Game.particles.push({
    x, y, color,
    vx: (Math.random() - 0.5) * 4,
    vy: -Math.random() * 3 - 0.5,
    life: 420, max: 420
  });
}

function updateEffects(dt) {
  const step = dt / 16.667;
  for (const p of Game.particles) {
    p.life -= dt; p.x += p.vx * step; p.y += p.vy * step; p.vy += 0.22 * step;
  }
  Game.particles = Game.particles.filter(p => p.life > 0);

  for (const f of Game.floats) { f.life -= dt; f.y -= dt * 0.022; }
  Game.floats = Game.floats.filter(f => f.life > 0);

  for (const d of Game.drafts) d.life -= dt;
  Game.drafts = Game.drafts.filter(d => d.life > 0);

  if (Game.shake > 0) Game.shake = Math.max(0, Game.shake - dt * 0.03);
  if (Game.hintTimer > 0) Game.hintTimer -= dt;
}

/* =========================================================
   카메라
   ========================================================= */
function updateCamera() {
  const t = T();
  const viewW = CONFIG.VIEW_COLS * t;
  const target = Game.player.x + Game.player.w / 2 - viewW * 0.42;
  Game.cameraX += (target - Game.cameraX) * 0.12;
  Game.cameraX = Math.max(0, Math.min(Game.cameraX, Game.level.width * t - viewW));
}

/* =========================================================
   스테이지 진행
   ========================================================= */
function clearStage() {
  if (Game.state !== STATE.PLAY) return;
  Game.state = STATE.QUIZ;
  Sfx.play('clear');
  addScore(200, Game.player.x, Game.player.y, '');
  UI.showQuiz(Game.level);
}

/** 퀴즈까지 끝난 뒤 호출 */
function afterQuiz() {
  if (Game.levelIndex + 1 >= LEVELS.length) { finishGame(true); return; }
  Game.state = STATE.CLEAR;
  UI.showStageClear(Game.level, LEVELS[Game.levelIndex + 1]);
}

function goNextStage() {
  loadLevel(Game.levelIndex + 1);
  // 학습용 게임이라 스테이지마다 체력을 채워 준다. 부스에서 초반에 끝나면 안 된다
  Game.hp = CONFIG.MAX_HP;
  Game.state = STATE.INTRO;
  UI.showStageIntro(Game.level);
}

function beginPlay() {
  Game.state = STATE.PLAY;
  Game.keys = {}; Game.jumpHeld = false;
  Game.lastTime = performance.now();
  UI.updateHUD();
  if (Game.level.hint) {
    Game.hintText = Game.level.hint;
    Game.hintTimer = 4200;
  }
}

function startGame(name) {
  Game.playerName = name;
  Game.hp = CONFIG.MAX_HP;
  Game.score = 0;
  Game.coinCount = 0;
  Game.abilities = {};
  Game.startedAt = performance.now();
  Game.elapsed = 0;
  loadLevel(0);
  Game.state = STATE.INTRO;
  UI.showStageIntro(Game.level);
  if (!Game.running) {
    Game.running = true;
    Game.lastTime = performance.now();
    requestAnimationFrame(loop);
  }
}

function finishGame(won) {
  Game.elapsed = performance.now() - Game.startedAt;
  Sfx.stopBGM();
  Sfx.play(won ? 'clear' : 'over');
  if (won) {
    Game.score += Game.hp * 100;
    Game.score += Math.max(0, 600 - Math.floor(Game.elapsed / 1000)) * 2;
  }
  Game.state = won ? STATE.ENDING : STATE.OVER;
  Leaderboard.save(Game.playerName, Game.levelIndex + 1, Game.score, won, Game.elapsed);
  if (won) UI.showEnding(); else UI.showGameOver();
}

/* =========================================================
   일시정지
   ========================================================= */
function pauseGame() {
  if (Game.state !== STATE.PLAY) return;
  Game.state = STATE.PAUSE;
  Game.keys = {}; Game.jumpHeld = false;
  Sfx.play('select');
  UI.showPause();
}

function resumeGame() {
  if (Game.state !== STATE.PAUSE) return;
  Game.state = STATE.PLAY;
  Game.keys = {}; Game.jumpHeld = false;
  Game.lastTime = performance.now();
  Sfx.play('select');
  UI.hidePause();
}

function quitToTitle() {
  UI.hidePause();
  Sfx.stopBGM();
  Game.running = false;
  Game.state = STATE.TITLE;
  Game.keys = {}; Game.jumpHeld = false;
  UI.showTitle();
}

/* =========================================================
   메인 루프
   ========================================================= */
function loop(ts) {
  if (!Game.running) return;
  const dt = Math.min(ts - Game.lastTime || 16, 48);
  Game.lastTime = ts;

  if (typeof Pad !== 'undefined') Pad.poll();

  Game.animTimer += dt;
  if (Game.animTimer > 130) { Game.animTimer = 0; Game.animFrame ^= 1; }

  if (Game.state === STATE.PLAY) {
    updatePlayer(dt);
    updateFoes(dt);
    updateBoss(dt);
    updateCamera();
    Game.elapsed = ts - Game.startedAt;
  }

  updateEffects(dt);
  render();
  requestAnimationFrame(loop);
}
