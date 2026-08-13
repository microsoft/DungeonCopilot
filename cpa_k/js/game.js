/* =========================================================
   코파일럿 아레나 — 게임 엔진

   설계 원칙
     1) Copilot 사용이 곧 게임 조작이다. 별도 퀴즈로 묻지 않는다.
     2) 적마다 통하는 도구가 하나뿐이라 "무엇을 쓸까"가 실력이 된다.
     3) 맥락(Work IQ)이 없으면 환각이 나온다. 설명 대신 손해로 가르친다.
   ========================================================= */

const STATE = {
  TITLE: 'title', PLAY: 'play', PAUSE: 'pause',
  WAVE: 'wave', QUIZ: 'quiz', OVER: 'over', WIN: 'win'
};

const Game = {
  state: STATE.TITLE,
  canvas: null, ctx: null,

  player: null,
  foes: [], shots: [], orbs: [], chests: [], particles: [], floats: [],

  tool: 'summarize',
  workIQ: CONFIG.WORKIQ_START,
  cowork: 0,                 // 남은 코워크 시간(ms)

  hp: CONFIG.MAX_HP,
  score: 0,
  combo: 0, bestCombo: 0,
  shotsFired: 0, shotsHit: 0,

  waveIndex: 0,
  spawnQueue: [],
  spawnTimer: 0,
  waveActive: false,

  orbTimer: 0,
  chestTimer: 0,

  keys: {},
  aim: { x: 0, y: 0 },       // 마우스/스틱 조준점
  usePointer: false,

  playerName: '',
  startedAt: 0, elapsed: 0,
  lastTime: 0, running: false,
  animTimer: 0, animFrame: 0,
  shake: 0,
  tipText: '', tipTimer: 0
};

/* =========================================================
   보조
   ========================================================= */
function dist(ax, ay, bx, by) { return Math.hypot(ax - bx, ay - by); }
function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

function addFloat(text, x, y, color, life = 900) {
  Game.floats.push({ text, x, y, color, life, max: life });
}

function spawnParticles(x, y, color, n = 8, spd = 3.4) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = Math.random() * spd + 0.6;
    Game.particles.push({
      x, y, color,
      vx: Math.cos(a) * s, vy: Math.sin(a) * s,
      life: 420, max: 420
    });
  }
}

/* =========================================================
   Work IQ — 맥락
   맥락은 신선해야 쓸모 있으므로 시간이 지나면 줄어든다.
   ========================================================= */
function workIQRatio() { return Game.workIQ / CONFIG.WORKIQ_MAX; }

function addWorkIQ(n) {
  const before = Game.workIQ;
  Game.workIQ = clamp(Game.workIQ + n, 0, CONFIG.WORKIQ_MAX);
  if (before < CONFIG.WORKIQ_MAX && Game.workIQ >= CONFIG.WORKIQ_MAX) {
    UI.banner('Work IQ 가득 — 스페이스로 코워크 발동', '#f2c033');
  }
}

/** 맥락이 쌓일수록 한 발이 세진다 */
function shotDamage() {
  return 1 + Math.floor(workIQRatio() * 2.2);   // 1 ~ 3
}

function canCowork() {
  return Game.workIQ >= CONFIG.WORKIQ_COWORK && Game.cowork <= 0;
}

function startCowork() {
  if (!canCowork() || Game.state !== STATE.PLAY) return;
  Game.cowork = CONFIG.COWORK_MS;
  Game.workIQ = 0;                 // 맥락을 전부 쏟아붓는다
  Sfx.play('cowork');
  Game.shake = 10;
  UI.banner('코워크 — 에이전트가 전부 처리합니다', '#f2c033');
  addFloat('COWORK', Game.player.x, Game.player.y - 30, '#f2c033', 1600);
}

/* =========================================================
   플레이어
   ========================================================= */
function initPlayer() {
  Game.player = {
    x: CONFIG.W / 2, y: CONFIG.H / 2,
    r: 14, dir: 1,
    invuln: 0, fireCool: 0,
    moving: false
  };
}

function updatePlayer(dt) {
  const p = Game.player;
  const step = dt / 16.667;
  if (p.invuln > 0) p.invuln -= dt;
  if (p.fireCool > 0) p.fireCool -= dt;

  let dx = 0, dy = 0;
  const K = Game.keys;
  if (K['ArrowLeft'] || K['a'] || K['A'] || K['ㅁ']) dx -= 1;
  if (K['ArrowRight'] || K['d'] || K['D'] || K['ㅇ']) dx += 1;
  if (K['ArrowUp'] || K['w'] || K['W'] || K['ㅈ']) dy -= 1;
  if (K['ArrowDown'] || K['s'] || K['S'] || K['ㄴ']) dy += 1;

  if (dx && dy) { dx *= 0.707; dy *= 0.707; }
  p.moving = !!(dx || dy);
  if (dx) p.dir = dx > 0 ? 1 : -1;

  p.x = clamp(p.x + dx * CONFIG.PLAYER_SPEED * step, p.r, CONFIG.W - p.r);
  p.y = clamp(p.y + dy * CONFIG.PLAYER_SPEED * step, p.r + 40, CONFIG.H - p.r);
}

/* =========================================================
   발사 — 조준은 자동. 실력은 "무엇을 고르느냐"로만 갈린다.
   ========================================================= */
function nearestFoe() {
  const p = Game.player;
  let best = null, bd = Infinity;
  for (const f of Game.foes) {
    if (f.dead) continue;
    const d = dist(p.x, p.y, f.x, f.y);
    if (d < bd) { bd = d; best = f; }
  }
  return best;
}

/** 같은 종류를 우선 노린다. 조준 스트레스를 없애 판단에 집중시킨다 */
function targetFor(tool) {
  const p = Game.player;
  let best = null, bd = Infinity;
  for (const f of Game.foes) {
    if (f.dead) continue;
    if (FOES[f.kind].tool !== tool) continue;
    const d = dist(p.x, p.y, f.x, f.y);
    if (d < bd) { bd = d; best = f; }
  }
  return best || nearestFoe();
}

function fire(tool) {
  const p = Game.player;
  if (Game.state !== STATE.PLAY || p.fireCool > 0) return;
  p.fireCool = CONFIG.FIRE_COOL;

  const t = TOOLS[tool];
  const target = targetFor(tool);
  const ang = target ? Math.atan2(target.y - p.y, target.x - p.x)
    : (Game.aim ? Math.atan2(Game.aim.y - p.y, Game.aim.x - p.x) : 0);

  // 맥락이 바닥나면 그럴듯한 헛소리가 나간다
  const halluc = Game.workIQ <= 0 && Math.random() < CONFIG.HALLUC_CHANCE && Game.cowork <= 0;

  Game.shotsFired++;
  Game.shots.push({
    x: p.x + Math.cos(ang) * 16,
    y: p.y + Math.sin(ang) * 16,
    vx: Math.cos(ang) * CONFIG.SHOT_SPEED,
    vy: Math.sin(ang) * CONFIG.SHOT_SPEED,
    tool, halluc,
    dmg: halluc ? 0 : shotDamage(),
    life: CONFIG.SHOT_LIFE,
    r: 6
  });

  if (halluc) {
    Sfx.play('halluc');
    addFloat('환각', p.x, p.y - 24, '#ff6b6b', 1100);
  } else {
    Sfx.play('fire' + tool.charAt(0).toUpperCase() + tool.slice(1));
  }
}

function updateShots(dt) {
  const step = dt / 16.667;
  for (const s of Game.shots) {
    s.life -= dt;
    s.x += s.vx * step;
    s.y += s.vy * step;

    // 환각은 흔들리며 빗나간다
    if (s.halluc) {
      s.vx += (Math.random() - 0.5) * 1.6;
      s.vy += (Math.random() - 0.5) * 1.6;
    }

    if (s.x < -20 || s.x > CONFIG.W + 20 || s.y < -20 || s.y > CONFIG.H + 20) s.life = 0;
  }
  Game.shots = Game.shots.filter(s => s.life > 0);
}

/* =========================================================
   적
   ========================================================= */
function spawnFoe(kind, isBoss) {
  const def = FOES[kind];
  // 화면 바깥에서 들어온다
  const side = Math.floor(Math.random() * 4);
  let x, y;
  if (side === 0) { x = Math.random() * CONFIG.W; y = -30; }
  else if (side === 1) { x = CONFIG.W + 30; y = 40 + Math.random() * (CONFIG.H - 40); }
  else if (side === 2) { x = Math.random() * CONFIG.W; y = CONFIG.H + 30; }
  else { x = -30; y = 40 + Math.random() * (CONFIG.H - 40); }

  const wave = Game.waveIndex + 1;
  const mult = 1 + wave * 0.06;

  Game.foes.push({
    kind, x, y,
    r: isBoss ? def.r * 2.1 : def.r,
    hp: Math.ceil(def.hp * mult * (isBoss ? 6 : 1)),
    maxHp: Math.ceil(def.hp * mult * (isBoss ? 6 : 1)),
    speed: def.speed * (isBoss ? 0.55 : 1) * (1 + wave * 0.02),
    boss: !!isBoss,
    dead: false,
    flash: 0, resist: 0
  });
}

function updateFoes(dt) {
  const step = dt / 16.667;
  const p = Game.player;

  for (const f of Game.foes) {
    if (f.dead) continue;
    if (f.flash > 0) f.flash -= dt;
    if (f.resist > 0) f.resist -= dt;

    const a = Math.atan2(p.y - f.y, p.x - f.x);
    // 틀린 도구를 맞으면 잠깐 사나워진다
    const sp = f.speed * (f.resist > 0 ? 1.7 : 1) * step;
    f.x += Math.cos(a) * sp;
    f.y += Math.sin(a) * sp;

    if (p.invuln <= 0 && dist(p.x, p.y, f.x, f.y) < p.r + f.r - 4) {
      hurtPlayer();
    }
  }

  // 서로 겹치지 않게 부드럽게 밀어낸다
  for (let i = 0; i < Game.foes.length; i++) {
    const a = Game.foes[i];
    if (a.dead) continue;
    for (let j = i + 1; j < Game.foes.length; j++) {
      const b = Game.foes[j];
      if (b.dead) continue;
      const d = dist(a.x, a.y, b.x, b.y);
      const min = a.r + b.r;
      if (d > 0 && d < min) {
        const push = (min - d) / 2;
        const nx = (b.x - a.x) / d, ny = (b.y - a.y) / d;
        a.x -= nx * push; a.y -= ny * push;
        b.x += nx * push; b.y += ny * push;
      }
    }
  }

  Game.foes = Game.foes.filter(f => !f.dead);
}

/* =========================================================
   충돌 — 이 게임의 핵심 규칙
   ========================================================= */
function checkShotHits() {
  for (const s of Game.shots) {
    if (s.life <= 0) continue;
    for (const f of Game.foes) {
      if (f.dead) continue;
      if (dist(s.x, s.y, f.x, f.y) > f.r + s.r) continue;

      s.life = 0;

      // 환각은 아무것도 못 맞힌다
      if (s.halluc) {
        spawnParticles(f.x, f.y, '#ff6b6b', 5, 2);
        addFloat('빗나감', f.x, f.y - f.r - 8, '#ff6b6b', 800);
        breakCombo();
        break;
      }

      const need = FOES[f.kind].tool;
      const match = Game.cowork > 0 || s.tool === need;

      if (!match) {
        // 틀린 도구 — 죽지 않고 오히려 사나워진다
        Sfx.play('wrong');
        f.resist = 1400;
        spawnParticles(f.x, f.y, '#8a8fa8', 4, 1.8);
        addFloat('안 통함', f.x, f.y - f.r - 8, '#c9ccd6', 900);
        breakCombo();
        break;
      }

      Game.shotsHit++;
      f.hp -= s.dmg;
      f.flash = 140;
      Sfx.play('hit');
      spawnParticles(f.x, f.y, TOOLS[s.tool].color, 6, 2.6);

      if (f.hp <= 0) killFoe(f);
      break;
    }
  }
}

function killFoe(f) {
  f.dead = true;
  const def = FOES[f.kind];
  Game.combo++;
  if (Game.combo > Game.bestCombo) Game.bestCombo = Game.combo;

  const bonus = 1 + Math.min(Game.combo, 20) * 0.1;
  const pts = Math.round((f.boss ? def.score * 8 : def.score) * bonus);
  Game.score += pts;

  spawnParticles(f.x, f.y, TOOLS[def.tool].color, f.boss ? 26 : 12, f.boss ? 5 : 3.4);
  addFloat('+' + pts, f.x, f.y - f.r - 6, TOOLS[def.tool].color, 900);

  if (Game.combo >= 3 && Game.combo % 3 === 0) {
    Sfx.play('combo');
    addFloat('연속 ' + Game.combo, f.x, f.y - f.r - 24, '#f2c033', 900);
  }
  if (f.boss) { Game.shake = 14; Sfx.play('clear'); }

  UI.updateHUD();
}

function breakCombo() {
  if (Game.combo >= 3) addFloat('연속 끊김', Game.player.x, Game.player.y - 28, '#8a8fa8', 800);
  Game.combo = 0;
  UI.updateHUD();
}

function hurtPlayer() {
  const p = Game.player;
  if (p.invuln > 0) return;
  Game.hp--;
  p.invuln = CONFIG.INVULN_MS;
  Game.combo = 0;
  Sfx.play('hurt');
  Game.shake = 10;
  UI.updateHUD();
  if (Game.hp <= 0) endGame(false);
}

/* =========================================================
   맥락 조각 / 프롬프트 상자
   ========================================================= */
function spawnOrb() {
  const kind = ORB_LIST[Math.floor(Math.random() * ORB_LIST.length)];
  Game.orbs.push({
    kind,
    x: 60 + Math.random() * (CONFIG.W - 120),
    y: 90 + Math.random() * (CONFIG.H - 140),
    r: 13,
    life: CONFIG.ORB_LIFE
  });
}

function spawnChest() {
  Game.chests.push({
    x: 80 + Math.random() * (CONFIG.W - 160),
    y: 110 + Math.random() * (CONFIG.H - 180),
    r: 18,
    life: CONFIG.CHEST_LIFE
  });
}

function updatePickups(dt) {
  const p = Game.player;

  for (const o of Game.orbs) {
    o.life -= dt;
    if (dist(p.x, p.y, o.x, o.y) < p.r + o.r + 4) {
      o.life = 0;
      addWorkIQ(CONFIG.WORKIQ_PER_ORB);
      Game.score += 20;
      Sfx.play('orb');
      spawnParticles(o.x, o.y, ORB_KINDS[o.kind].color, 7, 2.4);
      addFloat('맥락 +' + CONFIG.WORKIQ_PER_ORB, o.x, o.y - 16, ORB_KINDS[o.kind].color, 900);
      UI.updateHUD();
    }
  }
  Game.orbs = Game.orbs.filter(o => o.life > 0);

  for (const c of Game.chests) {
    c.life -= dt;
    if (dist(p.x, p.y, c.x, c.y) < p.r + c.r + 4) {
      c.life = 0;
      openChest();
    }
  }
  Game.chests = Game.chests.filter(c => c.life > 0);
}

/** 상자는 길을 막지 않는다. 무시해도 아무 손해가 없다 */
function openChest() {
  Sfx.play('chest');
  Game.state = STATE.QUIZ;
  UI.showQuiz(Quiz.next());
}

function resolveQuiz(correct) {
  if (correct) {
    Game.score += 300;
    Game.hp = Math.min(Game.hp + 1, CONFIG.MAX_HP);
    addWorkIQ(CONFIG.WORKIQ_MAX);
    Sfx.play('correct');
    UI.banner('정답 — 체력 +1, 맥락 가득', '#2fae5f');
  } else {
    Sfx.play('miss');
  }
  Game.state = STATE.PLAY;
  Game.lastTime = performance.now();
  UI.hideAll();
  UI.updateHUD();
}

/* =========================================================
   웨이브
   ========================================================= */
function startWave(i) {
  Game.waveIndex = i;
  const w = WAVES[i];
  Game.spawnQueue = [];
  for (let k = 0; k < w.count; k++) {
    Game.spawnQueue.push(w.types[k % w.types.length]);
  }
  // 순서를 섞어 패턴 암기를 막는다
  for (let k = Game.spawnQueue.length - 1; k > 0; k--) {
    const j = Math.floor(Math.random() * (k + 1));
    [Game.spawnQueue[k], Game.spawnQueue[j]] = [Game.spawnQueue[j], Game.spawnQueue[k]];
  }
  Game.spawnTimer = 400;
  Game.waveActive = true;
  Game.state = STATE.PLAY;
  Game.lastTime = performance.now();

  Sfx.playBGM(w.boss ? 'boss' : 'arena');
  if (w.boss) Sfx.play('boss'); else Sfx.play('wave');

  if (w.tip) { Game.tipText = w.tip; Game.tipTimer = 4200; }
  UI.updateHUD();
}

function updateWave(dt) {
  const w = WAVES[Game.waveIndex];
  if (!Game.waveActive) return;

  if (Game.spawnQueue.length) {
    Game.spawnTimer -= dt;
    if (Game.spawnTimer <= 0) {
      const kind = Game.spawnQueue.shift();
      spawnFoe(kind, w.boss);
      Game.spawnTimer = w.gap;
    }
    return;
  }

  // 다 내보냈고 화면도 비었으면 웨이브 종료
  if (!Game.foes.length) {
    Game.waveActive = false;
    if (Game.waveIndex + 1 >= WAVES.length) { endGame(true); return; }
    Game.state = STATE.WAVE;
    Sfx.play('wave');
    UI.showWaveClear();
  }
}

/* =========================================================
   판 관리
   ========================================================= */
function startGame(name) {
  Game.playerName = name;
  Game.hp = CONFIG.MAX_HP;
  Game.score = 0;
  Game.combo = 0; Game.bestCombo = 0;
  Game.shotsFired = 0; Game.shotsHit = 0;
  Game.workIQ = CONFIG.WORKIQ_START;
  Game.cowork = 0;
  Game.tool = 'summarize';
  Game.foes = []; Game.shots = []; Game.orbs = [];
  Game.chests = []; Game.particles = []; Game.floats = [];
  Game.orbTimer = 2200;
  Game.chestTimer = CONFIG.CHEST_EVERY;
  Game.shake = 0;
  Game.keys = {};
  Game.startedAt = performance.now();
  Game.elapsed = 0;
  Quiz.reset();
  initPlayer();
  UI.hideAll();
  UI.updateHUD();
  startWave(0);

  if (!Game.running) {
    Game.running = true;
    Game.lastTime = performance.now();
    requestAnimationFrame(loop);
  }
}

function accuracy() {
  return Game.shotsFired ? (Game.shotsHit / Game.shotsFired) * 100 : 0;
}

function endGame(won) {
  Game.elapsed = performance.now() - Game.startedAt;
  Sfx.stopBGM();
  Sfx.play(won ? 'clear' : 'over');
  if (won) {
    Game.score += Game.hp * 400;
    Game.score += Math.round(accuracy() * 12);
  }
  Game.state = won ? STATE.WIN : STATE.OVER;
  Leaderboard.save(Game.playerName, Game.score, Game.waveIndex + 1, won, accuracy());
  if (won) UI.showWin(); else UI.showOver();
}

function pauseGame() {
  if (Game.state !== STATE.PLAY) return;
  Game.state = STATE.PAUSE;
  Game.keys = {};
  Sfx.play('select');
  UI.showPause();
}

function resumeGame() {
  if (Game.state !== STATE.PAUSE) return;
  Game.state = STATE.PLAY;
  Game.keys = {};
  Game.lastTime = performance.now();
  Sfx.play('select');
  UI.hideAll();
}

function quitToTitle() {
  Sfx.stopBGM();
  Game.running = false;
  Game.state = STATE.TITLE;
  Game.keys = {};
  UI.showTitle();
}

/* =========================================================
   도구 선택
   ========================================================= */
function selectTool(key) {
  if (!TOOLS[key]) return;
  if (Game.tool === key) return;
  Game.tool = key;
  Sfx.play('select');
  UI.updateTools();
}

function selectSlot(n) {
  const k = TOOL_LIST[n - 1];
  if (k) selectTool(k);
}

/* =========================================================
   이펙트
   ========================================================= */
function updateEffects(dt) {
  const step = dt / 16.667;
  for (const p of Game.particles) {
    p.life -= dt;
    p.x += p.vx * step; p.y += p.vy * step;
    p.vx *= 0.94; p.vy *= 0.94;
  }
  Game.particles = Game.particles.filter(p => p.life > 0);

  for (const f of Game.floats) { f.life -= dt; f.y -= dt * 0.022; }
  Game.floats = Game.floats.filter(f => f.life > 0);

  if (Game.shake > 0) Game.shake = Math.max(0, Game.shake - dt * 0.03);
  if (Game.tipTimer > 0) Game.tipTimer -= dt;
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
  if (Game.animTimer > 160) { Game.animTimer = 0; Game.animFrame ^= 1; }

  if (Game.state === STATE.PLAY) {
    updatePlayer(dt);
    updateFoes(dt);
    updateShots(dt);
    checkShotHits();
    updatePickups(dt);
    updateWave(dt);

    // 맥락은 가만두면 옅어진다
    if (Game.cowork > 0) {
      Game.cowork -= dt;
      if (Game.cowork <= 0) UI.banner('코워크 종료', '#8a8fa8');
    } else {
      Game.workIQ = clamp(Game.workIQ - CONFIG.WORKIQ_DECAY * (dt / 1000), 0, CONFIG.WORKIQ_MAX);
    }

    // 발사 버튼을 누르고 있으면 계속 쏜다
    if (Game.keys[' '] || Game.keys['fire']) fire(Game.tool);

    Game.orbTimer -= dt;
    if (Game.orbTimer <= 0) { Game.orbTimer = CONFIG.ORB_EVERY; spawnOrb(); }

    Game.chestTimer -= dt;
    if (Game.chestTimer <= 0) { Game.chestTimer = CONFIG.CHEST_EVERY; spawnChest(); }

    Game.elapsed = ts - Game.startedAt;
    UI.updateMeters();
  }

  updateEffects(dt);
  render();
  requestAnimationFrame(loop);
}
