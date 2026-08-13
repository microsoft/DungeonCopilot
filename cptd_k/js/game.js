/* =========================================================
   코파일럿 타워디펜스 — 게임 엔진

   설계 의도
     - "맞는 에이전트만 통한다"가 이 게임의 전부다. 그래서 타워는
       자기 담당 종류만 조준하고, 담당이 아닌 일이 사거리에 들어오면
       공격 대신 '무시됨' 표시를 낸다. 그냥 안 쏘면 플레이어는
       타워가 고장 난 줄 안다.
     - Work IQ(맥락)는 두 번째 축이다. 높으면 세게 때리고,
       0이면 환각이 나서 스스로 멈춘다. 글로 설명하지 않고 손해로 가르친다.
   ========================================================= */

const Game = {
  state: STATE.TITLE,
  canvas: null, ctx: null,

  waveIndex: 0,          // 0-based, 진행 중이거나 다음에 올 웨이브
  buildTimer: 0,         // 준비 시간 남은 ms
  waveRunning: false,
  waveT: 0,              // 현재 웨이브 경과 시간 (스폰 스케줄 기준)

  credits: 0,
  inbox: 0,
  score: 0,
  workIQ: 0,
  coworkUntil: 0,        // 코워크 모드 종료 시각 (Game.now 기준)
  coworkReady: false,    // 맥락이 한 번 가득 찼는가 (발동 가능 래치)

  towers: [],
  enemies: [],
  shots: [],
  orbs: [],
  chest: null,
  particles: [],
  floats: [],
  spots: [],

  spawnQueue: [],        // { type, at, hp, speed }
  spawnedAll: false,

  selectedType: null,    // 배치 대기 중인 타워 종류
  selectedTower: null,   // 선택된 설치 타워
  cursor: 0,             // 게임패드 빌드 커서 (spots 인덱스)
  padMode: false,

  orbTimer: 0,
  chestTimer: 0,

  now: 0,                // 게임 내부 누적 시간(ms) — 배속에 영향받는다
  speed: 1,
  running: false,
  lastTime: 0,
  animTimer: 0, animFrame: 0,

  playerName: '',
  startedAt: 0,
  elapsed: 0,

  stats: { killed: 0, leaked: 0, hallucinations: 0, orbs: 0, cowork: 0, chestRight: 0, chestSeen: 0 },

  pathPts: [], pathLen: 0, segLens: [], cumLens: []
};

/* =========================================================
   경로 계산
   ========================================================= */
function buildPath() {
  Game.pathPts = PATH.map(p => ({ x: p[0], y: p[1] }));
  Game.segLens = []; Game.cumLens = [0];
  let total = 0;
  for (let i = 1; i < Game.pathPts.length; i++) {
    const a = Game.pathPts[i - 1], b = Game.pathPts[i];
    const l = Math.hypot(b.x - a.x, b.y - a.y);
    Game.segLens.push(l);
    total += l;
    Game.cumLens.push(total);
  }
  Game.pathLen = total;
}

/** 경로 시작점에서 d px 지점의 좌표 */
function posAt(d) {
  if (d <= 0) return { x: Game.pathPts[0].x, y: Game.pathPts[0].y };
  if (d >= Game.pathLen) {
    const last = Game.pathPts[Game.pathPts.length - 1];
    return { x: last.x, y: last.y };
  }
  for (let i = 1; i < Game.cumLens.length; i++) {
    if (d <= Game.cumLens[i]) {
      const t = (d - Game.cumLens[i - 1]) / (Game.segLens[i - 1] || 1);
      const a = Game.pathPts[i - 1], b = Game.pathPts[i];
      return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
    }
  }
  const last = Game.pathPts[Game.pathPts.length - 1];
  return { x: last.x, y: last.y };
}

function distToSeg(px, py, a, b) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  let t = len2 ? ((px - a.x) * dx + (py - a.y) * dy) / len2 : 0;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (a.x + dx * t), py - (a.y + dy * t));
}

function distToPath(x, y) {
  let m = Infinity;
  for (let i = 1; i < Game.pathPts.length; i++) {
    m = Math.min(m, distToSeg(x, y, Game.pathPts[i - 1], Game.pathPts[i]));
  }
  return m;
}

/* =========================================================
   설치 자리 — 경로에서 충분히 떨어진 격자점만 남긴다.
   좌표를 손으로 적으면 경로를 고칠 때마다 겹치므로 계산으로 뽑는다.
   ========================================================= */
function buildSpots() {
  Game.spots = [];
  for (let y = 46; y <= CONFIG.H - 40; y += 56) {
    for (let x = 44; x <= CONFIG.W - 40; x += 60) {
      if (distToPath(x, y) < 46) continue;
      if (Math.hypot(x - INBOX.x, y - INBOX.y) < 70) continue;
      Game.spots.push({ x, y, tower: null });
    }
  }
}

function spotAt(x, y, r = 26) {
  let best = null, bd = r;
  Game.spots.forEach((s, i) => {
    const d = Math.hypot(s.x - x, s.y - y);
    if (d < bd) { bd = d; best = i; }
  });
  return best;
}

/* =========================================================
   Work IQ
   ========================================================= */
function dmgMult() {
  const t = Math.max(0, Math.min(1, Game.workIQ / CONFIG.WORKIQ_MAX));
  return CONFIG.DMG_MIN + (CONFIG.DMG_MAX - CONFIG.DMG_MIN) * t;
}

function coworkActive() { return Game.now < Game.coworkUntil; }

function addWorkIQ(v) {
  Game.workIQ = Math.max(0, Math.min(CONFIG.WORKIQ_MAX, Game.workIQ + v));
  // 가득 차면 충전 완료로 잠근다. 감쇠로 곧장 풀리면 누를 틈이 없다.
  if (Game.workIQ >= CONFIG.WORKIQ_MAX) {
    if (!Game.coworkReady && !coworkActive()) {
      UI.banner('코워크 준비 완료 — C 키로 발동', '#f2c033');
    }
    Game.coworkReady = true;
  } else if (Game.workIQ < CONFIG.COWORK_KEEP) {
    Game.coworkReady = false;
  }
}

function canCowork() {
  return Game.coworkReady && !coworkActive() &&
    (Game.state === STATE.WAVE || Game.state === STATE.BUILD);
}

function triggerCowork() {
  if (!canCowork()) { Sfx.play('deny'); return false; }
  Game.coworkReady = false;
  Game.coworkUntil = Game.now + CONFIG.COWORK_MS;
  Game.workIQ = CONFIG.WORKIQ_AFTER_COWORK;
  Game.stats.cowork++;
  Sfx.play('cowork');
  UI.banner('코워크 모드 — 모든 에이전트가 모든 일을 처리합니다', '#f2c033');
  for (const t of Game.towers) burst(t.x, t.y, '#f2c033', 10);
  UI.updateHUD();
  return true;
}

/* =========================================================
   타워
   ========================================================= */
function towerCost(key, level) {
  const base = TOWER[key].cost;
  return level <= 1 ? base : Math.round(base * 0.8 * (level - 1));
}

function towerStats(t) {
  const b = TOWER[t.key];
  const lv = t.level - 1;
  return {
    range: b.range + lv * 16,
    rate: b.rate * Math.pow(0.88, lv),
    dmg: b.dmg * Math.pow(1.55, lv)
  };
}

function placeTower(key, spotIndex) {
  if (!TOWER[key]) return false;
  const s = Game.spots[spotIndex];
  if (!s || s.tower) { Sfx.play('deny'); return false; }
  const cost = TOWER[key].cost;
  if (Game.credits < cost) {
    Sfx.play('deny');
    UI.banner('크레딧이 부족합니다', '#e05a5a');
    return false;
  }
  Game.credits -= cost;
  const t = {
    key, x: s.x, y: s.y, spot: spotIndex, level: 1,
    cool: 0, stunUntil: 0, ignoreCool: 0, kills: 0, flash: 0
  };
  s.tower = t;
  Game.towers.push(t);
  Sfx.play('build');
  burst(t.x, t.y, TOWER[key].color, 8);
  UI.updateHUD();
  return true;
}

function upgradeTower(t) {
  if (!t || t.level >= CONFIG.MAX_LEVEL) { Sfx.play('deny'); return false; }
  const cost = towerCost(t.key, t.level + 1);
  if (Game.credits < cost) {
    Sfx.play('deny');
    UI.banner('크레딧이 부족합니다', '#e05a5a');
    return false;
  }
  Game.credits -= cost;
  t.level++;
  Sfx.play('upgrade');
  burst(t.x, t.y, TOWER[t.key].color, 10);
  UI.updateHUD();
  return true;
}

/** 무료 업그레이드 (프롬프트 상자 보상) — 가장 낮은 레벨부터 올린다 */
function freeUpgrade() {
  const cands = Game.towers.filter(t => t.level < CONFIG.MAX_LEVEL);
  if (!cands.length) return null;
  cands.sort((a, b) => a.level - b.level);
  const t = cands[0];
  t.level++;
  burst(t.x, t.y, TOWER[t.key].color, 12);
  return t;
}

function sellTower(t) {
  if (!t) return false;
  let spent = TOWER[t.key].cost;
  for (let l = 2; l <= t.level; l++) spent += towerCost(t.key, l);
  Game.credits += Math.round(spent * CONFIG.SELL_RATE);
  const s = Game.spots[t.spot];
  if (s) s.tower = null;
  Game.towers = Game.towers.filter(x => x !== t);
  if (Game.selectedTower === t) Game.selectedTower = null;
  Sfx.play('sell');
  UI.updateHUD();
  return true;
}

/* =========================================================
   적
   ========================================================= */
function spawnEnemy(type, hp, speed, bossDef) {
  const e = {
    type, dist: 0, speed,
    hp, maxHp: hp,
    boss: !!bossDef,
    seg: bossDef ? Object.assign({}, bossDef.seg) : null,
    leak: bossDef ? bossDef.leak : 1,
    hit: 0, dead: false, slowT: 0
  };
  if (bossDef) {
    e.maxHp = WORK_KEYS.reduce((s, k) => s + bossDef.seg[k], 0);
    e.hp = e.maxHp;
    e.name = bossDef.name;
  }
  Game.enemies.push(e);
  return e;
}

/** 이 타워가 이 적을 실제로 때릴 수 있는가 (보스는 남은 층 기준) */
function canHit(e, want) {
  if (coworkActive()) return e.seg ? WORK_KEYS.some(k => e.seg[k] > 0) : true;
  if (e.seg) return e.seg[want] > 0;
  return e.type === want;
}

/** 보스는 층마다 담당이 다르다. 코워크 중에만 남은 층 아무데나 들어간다. */
function damageEnemy(e, amount, type) {
  if (e.dead) return 0;
  let applied = 0;
  if (e.seg) {
    let key = type;
    // 코워크가 아니면 담당 층이 이미 비었을 때 옆 층으로 넘어가지 않는다.
    // 넘어가게 두면 타워 한 종류로 보스를 깎을 수 있어 보스의 의미가 사라진다.
    if (coworkActive()) key = WORK_KEYS.find(k => e.seg[k] > 0);
    if (!key || !(e.seg[key] > 0)) return 0;
    applied = Math.min(e.seg[key], amount);
    e.seg[key] -= applied;
    e.hp = WORK_KEYS.reduce((s, k) => s + Math.max(0, e.seg[k]), 0);
  } else {
    applied = Math.min(e.hp, amount);
    e.hp -= applied;
  }
  e.hit = 120;
  if (e.hp <= 0) killEnemy(e);
  return applied;
}

function killEnemy(e) {
  if (e.dead) return;
  e.dead = true;
  const p = posAt(e.dist);
  const w = WORK[e.type];
  burst(p.x, p.y, w.color, e.boss ? 30 : 9);
  Game.stats.killed++;
  const bounty = e.boss ? 260 : bountyFor(Game.waveIndex + 1);
  Game.credits += bounty;
  Game.score += e.boss ? CONFIG.SCORE_BOSS : CONFIG.SCORE_KILL;
  float(p.x, p.y - 14, `+${bounty}`, '#f2c033');
  Sfx.play(e.boss ? 'win' : 'kill');
  UI.updateHUD();
}

function leakEnemy(e) {
  e.dead = true;
  Game.stats.leaked++;
  Game.inbox -= e.leak;
  Game.score = Math.max(0, Game.score + CONFIG.SCORE_LEAK);
  const p = posAt(Game.pathLen);
  burst(p.x, p.y, '#e05a5a', 12);
  float(INBOX.x - 10, INBOX.y - 36, `-${e.leak}`, '#e05a5a');
  Sfx.play('leak');
  UI.updateHUD();
  if (Game.inbox <= 0) {
    Game.inbox = 0;
    gameOver();
  }
}

/* =========================================================
   연출용 소품
   ========================================================= */
function burst(x, y, color, n = 8) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = 40 + Math.random() * 110;
    Game.particles.push({
      x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
      life: 320 + Math.random() * 260, t: 0, color, size: 2 + Math.random() * 2
    });
  }
}

function float(x, y, text, color) {
  Game.floats.push({ x, y, text, color, t: 0, life: 900 });
}

/* =========================================================
   맥락 오브 / 프롬프트 상자
   ========================================================= */
function spawnOrb() {
  const kind = ORB_KINDS[Math.floor(Math.random() * ORB_KINDS.length)];
  // 경로 근처에 떨어뜨린다 — 흐름을 보다가 자연스럽게 눈에 걸리게
  const d = 120 + Math.random() * (Game.pathLen - 240);
  const p = posAt(d);
  const p2 = posAt(Math.min(Game.pathLen, d + 8));
  const dx = p2.x - p.x, dy = p2.y - p.y;
  const l = Math.hypot(dx, dy) || 1;
  const side = Math.random() < 0.5 ? 1 : -1;
  let x = p.x + (-dy / l) * 30 * side;
  let y = p.y + (dx / l) * 30 * side;
  x = Math.max(24, Math.min(CONFIG.W - 24, x));
  y = Math.max(24, Math.min(CONFIG.H - 24, y));
  Game.orbs.push({ kind: kind.key, x, y, t: 0, life: CONFIG.ORB_LIFE_MS });
}

function collectOrb(i) {
  const o = Game.orbs[i];
  if (!o) return false;
  Game.orbs.splice(i, 1);
  addWorkIQ(CONFIG.WORKIQ_ORB);
  Game.stats.orbs++;
  Game.score += 10;
  const k = ORB_KINDS.find(k => k.key === o.kind);
  float(o.x, o.y - 12, `Work IQ +${CONFIG.WORKIQ_ORB}`, k ? k.color : '#4fc3f7');
  burst(o.x, o.y, k ? k.color : '#4fc3f7', 7);
  Sfx.play('orb');
  UI.updateHUD();
  return true;
}

function collectNearestOrb() {
  if (!Game.orbs.length) return false;
  return collectOrb(0);
}

function orbAt(x, y, r = 24) {
  for (let i = Game.orbs.length - 1; i >= 0; i--) {
    if (Math.hypot(Game.orbs[i].x - x, Game.orbs[i].y - y) < r) return i;
  }
  return -1;
}

function spawnChest() {
  if (Game.chest) return;
  // 설치 자리가 아닌 빈 공간에 놓는다 (타워를 가리지 않게)
  const free = Game.spots.filter(s => !s.tower);
  if (!free.length) return;
  const s = free[Math.floor(Math.random() * free.length)];
  Game.chest = { x: s.x, y: s.y, t: 0, life: CONFIG.CHEST_LIFE_MS };
}

function openChest() {
  if (!Game.chest) return false;
  Game.chest = null;
  Game.stats.chestSeen++;
  Sfx.play('chest');
  UI.showQuiz();
  return true;
}

function chestAt(x, y, r = 26) {
  if (!Game.chest) return false;
  return Math.hypot(Game.chest.x - x, Game.chest.y - y) < r;
}

/** 상자 보상 적용. 무시/오답에는 절대 불이익을 주지 않는다. */
function applyChestReward(reward) {
  if (!reward) return '';
  if (reward.key === 'credit') {
    Game.credits += 90;
    UI.banner('크레딧 +90', '#f2c033');
  } else if (reward.key === 'workiq') {
    addWorkIQ(CONFIG.WORKIQ_MAX);
    UI.banner('Work IQ 가득 — 맥락이 채워졌습니다', '#4fc3f7');
  } else {
    const t = freeUpgrade();
    if (t) UI.banner(`${TOWER[t.key].name} 에이전트 Lv.${t.level}`, TOWER[t.key].color);
    else { Game.credits += 90; UI.banner('올릴 타워가 없어 크레딧 +90', '#f2c033'); }
  }
  UI.updateHUD();
  return reward.label;
}

/* =========================================================
   웨이브 진행
   ========================================================= */
function queueWave(w) {
  Game.spawnQueue = [];
  if (w.boss) {
    Game.spawnQueue.push({ type: 'mail', at: 0, boss: w.boss });
  }
  for (const g of w.groups) {
    for (let i = 0; i < g.count; i++) {
      Game.spawnQueue.push({ type: g.type, at: g.delay + i * g.gap, hp: g.hp, speed: g.speed });
    }
  }
  Game.spawnQueue.sort((a, b) => a.at - b.at);
  Game.spawnedAll = false;
}

function startNextWave() {
  if (Game.waveRunning) return false;
  if (Game.state !== STATE.BUILD) return false;
  const w = WAVES[Game.waveIndex];
  if (!w) return false;

  // 준비 시간을 남기고 시작하면 그만큼 보너스
  const bonus = Math.floor(Math.max(0, Game.buildTimer) / 1000) * CONFIG.EARLY_BONUS_PER_SEC;
  if (bonus > 0) {
    Game.credits += bonus;
    float(CONFIG.W / 2, 120, `조기 시작 +${bonus}`, '#f2c033');
  }

  Game.buildTimer = 0;
  Game.waveRunning = true;
  Game.state = STATE.WAVE;
  Game.waveT = 0;
  queueWave(w);
  Sfx.play(w.boss ? 'boss' : 'waveStart');
  Sfx.playBGM(w.boss ? 'boss' : 'office');
  UI.banner(`웨이브 ${w.id} — ${w.name}`, w.boss ? '#e05a9a' : '#4fc3f7');
  UI.updateHUD();
  return true;
}

function enterBuildPhase() {
  Game.state = STATE.BUILD;
  Game.waveRunning = false;
  Game.buildTimer = CONFIG.BUILD_MS;
  UI.updateHUD();
}

function finishWave() {
  const w = WAVES[Game.waveIndex];
  Game.waveRunning = false;
  Game.credits += w.reward;
  Game.score += CONFIG.SCORE_WAVE;
  Sfx.play('waveClear');
  Game.waveIndex++;
  if (Game.waveIndex >= WAVE_COUNT) { winGame(); return; }
  UI.banner(`웨이브 ${w.id} 완료 — 크레딧 +${w.reward}`, '#2fae5f');
  enterBuildPhase();
}

/* =========================================================
   업데이트
   ========================================================= */
function updateTowers(dt) {
  const mult = dmgMult();
  const cw = coworkActive();

  for (const t of Game.towers) {
    if (t.flash > 0) t.flash -= dt;
    if (Game.now < t.stunUntil) continue;
    if (t.ignoreCool > 0) t.ignoreCool -= dt;

    const st = towerStats(t);
    t.cool -= dt;
    if (t.cool > 0) continue;

    const want = TOWER[t.key].target;
    let target = null, bestDist = -1, sawOther = null;

    for (const e of Game.enemies) {
      if (e.dead) continue;
      const p = posAt(e.dist);
      if (Math.hypot(p.x - t.x, p.y - t.y) > st.range) continue;
      const match = canHit(e, want);
      if (!match) { if (!sawOther) sawOther = e; continue; }
      // 가장 앞선(받은편지함에 가까운) 적부터 잡는다
      if (e.dist > bestDist) { bestDist = e.dist; target = e; }
    }

    if (!target) {
      // 담당이 아닌 일이 지나갈 때는 침묵 대신 '무시됨'을 보여준다.
      // 이 피드백이 없으면 플레이어는 타워가 고장 났다고 생각한다.
      if (sawOther && t.ignoreCool <= 0) {
        t.ignoreCool = 1500;
        float(t.x, t.y - 26, '무시됨', '#8b93a3');
        for (let i = 0; i < 4; i++) {
          Game.particles.push({
            x: t.x + (Math.random() - 0.5) * 14, y: t.y - 16,
            vx: (Math.random() - 0.5) * 22, vy: -18 - Math.random() * 18,
            life: 520, t: 0, color: 'rgba(160,170,195,0.85)', size: 2.5
          });
        }
        Sfx.play('ignore');
      }
      continue;
    }

    t.cool = st.rate;
    const p = posAt(target.dist);

    // Work IQ가 바닥이면 확신에 찬 헛소리를 한다 → 빗나가고 스스로 멈춘다
    if (Game.workIQ <= CONFIG.HALLUC_IQ && Math.random() < CONFIG.HALLUC_CHANCE) {
      Game.stats.hallucinations++;
      t.stunUntil = Game.now + CONFIG.HALLUC_STUN_MS;
      const ang = Math.random() * Math.PI * 2;
      Game.shots.push({
        x1: t.x, y1: t.y - 10,
        x2: t.x + Math.cos(ang) * st.range, y2: t.y + Math.sin(ang) * st.range,
        color: '#e05a5a', t: 0, life: 260, halluc: true
      });
      float(t.x, t.y - 30, '환각', '#e05a5a');
      burst(t.x, t.y, '#e05a5a', 6);
      Sfx.play('halluc');
      continue;
    }

    const dmg = st.dmg * mult * (cw ? 1.25 : 1);
    damageEnemy(target, dmg, want);
    t.kills += target.dead ? 1 : 0;
    t.flash = 90;
    Game.shots.push({
      x1: t.x, y1: t.y - 10, x2: p.x, y2: p.y,
      color: cw ? '#f2c033' : TOWER[t.key].color, t: 0, life: 150, halluc: false
    });
    Sfx.play('shot');
  }
}

function updateEnemies(dt) {
  const sec = dt / 1000;
  for (const e of Game.enemies) {
    if (e.dead) continue;
    e.dist += e.speed * sec;
    if (e.hit > 0) e.hit -= dt;
    if (e.dist >= Game.pathLen) leakEnemy(e);
  }
  Game.enemies = Game.enemies.filter(e => !e.dead);
}

function updateSpawn(dt) {
  if (!Game.waveRunning) return;
  Game.waveT += dt;
  const w = WAVES[Game.waveIndex];
  while (Game.spawnQueue.length && Game.spawnQueue[0].at <= Game.waveT) {
    const s = Game.spawnQueue.shift();
    if (s.boss) spawnEnemy(s.type, 0, s.boss.speed, s.boss);
    else spawnEnemy(s.type, s.hp, s.speed, null);
  }
  if (!Game.spawnQueue.length) Game.spawnedAll = true;
  if (Game.spawnedAll && !Game.enemies.length && Game.state === STATE.WAVE) finishWave();
}

function updateDrops(dt) {
  Game.orbTimer -= dt;
  if (Game.orbTimer <= 0) {
    Game.orbTimer = CONFIG.ORB_MIN_MS + Math.random() * (CONFIG.ORB_MAX_MS - CONFIG.ORB_MIN_MS);
    if (Game.orbs.length < 4) spawnOrb();
  }
  for (let i = Game.orbs.length - 1; i >= 0; i--) {
    const o = Game.orbs[i];
    o.t += dt;
    if (o.t >= o.life) Game.orbs.splice(i, 1);
  }

  Game.chestTimer -= dt;
  if (Game.chestTimer <= 0) {
    Game.chestTimer = CONFIG.CHEST_MIN_MS + Math.random() * (CONFIG.CHEST_MAX_MS - CONFIG.CHEST_MIN_MS);
    spawnChest();
  }
  if (Game.chest) {
    Game.chest.t += dt;
    // 무시해도 아무 일 없이 사라진다. 이게 이 게임의 약속이다.
    if (Game.chest.t >= Game.chest.life) Game.chest = null;
  }
}

function updateFx(dt) {
  const sec = dt / 1000;
  for (let i = Game.particles.length - 1; i >= 0; i--) {
    const p = Game.particles[i];
    p.t += dt;
    p.x += p.vx * sec; p.y += p.vy * sec;
    p.vy += 220 * sec;
    if (p.t >= p.life) Game.particles.splice(i, 1);
  }
  for (let i = Game.floats.length - 1; i >= 0; i--) {
    const f = Game.floats[i];
    f.t += dt; f.y -= 26 * sec;
    if (f.t >= f.life) Game.floats.splice(i, 1);
  }
  for (let i = Game.shots.length - 1; i >= 0; i--) {
    const s = Game.shots[i];
    s.t += dt;
    if (s.t >= s.life) Game.shots.splice(i, 1);
  }
}

/** 배속·일시정지가 적용된 뒤의 dt(ms)를 받는다 */
function step(dt) {
  Game.now += dt;
  Game.animTimer += dt;
  if (Game.animTimer > 220) { Game.animTimer = 0; Game.animFrame ^= 1; }

  if (Game.state !== STATE.BUILD && Game.state !== STATE.WAVE) return;

  addWorkIQ(-CONFIG.WORKIQ_DECAY * dt / 1000);

  updateDrops(dt);
  updateSpawn(dt);
  updateTowers(dt);
  updateEnemies(dt);
  updateFx(dt);

  if (Game.state === STATE.BUILD) {
    Game.buildTimer -= dt;
    if (Game.buildTimer <= 0) startNextWave();
  }
}

/* =========================================================
   루프
   ========================================================= */
function loop(ts) {
  if (!Game.running) return;
  const raw = Game.lastTime ? Math.min(64, ts - Game.lastTime) : 16;
  Game.lastTime = ts;

  if (Game.state === STATE.BUILD || Game.state === STATE.WAVE) {
    Game.elapsed = performance.now() - Game.startedAt;
    // 배속은 여러 번 나눠 돌린다. 한 번에 큰 dt를 주면 적이 타워를 건너뛴다.
    const steps = Math.max(1, Math.round(Game.speed));
    const dt = raw * Game.speed / steps;
    for (let i = 0; i < steps; i++) {
      if (Game.state !== STATE.BUILD && Game.state !== STATE.WAVE) break;
      step(dt);
    }
  }

  Pad.poll();
  render();
  UI.tickHUD();
  requestAnimationFrame(loop);
}

/* =========================================================
   판 시작 / 끝
   ========================================================= */
function startGame(name) {
  // 결과 화면을 띄운 채로 재시작하는 경로가 있어 여기서 반드시 걷어낸다
  UI.hideAll();
  UI.hideTowerPanel();
  UI.clearBanner();
  Game.playerName = name || '도전자';
  Game.waveIndex = 0;
  Game.credits = CONFIG.START_CREDITS;
  Game.inbox = CONFIG.INBOX_MAX;
  Game.score = 0;
  Game.workIQ = CONFIG.WORKIQ_START;
  Game.coworkUntil = 0;
  Game.coworkReady = false;
  Game.towers = []; Game.enemies = []; Game.shots = [];
  Game.orbs = []; Game.chest = null; Game.particles = []; Game.floats = [];
  Game.spawnQueue = []; Game.spawnedAll = false;
  Game.selectedType = null; Game.selectedTower = null;
  Game.cursor = 0; Game.padMode = false;
  Game.orbTimer = 2200; Game.chestTimer = CONFIG.CHEST_MIN_MS;
  Game.now = 0; Game.waveT = 0;
  Game.speed = 1;
  Game.stats = { killed: 0, leaked: 0, hallucinations: 0, orbs: 0, cowork: 0, chestRight: 0, chestSeen: 0 };
  Game.startedAt = performance.now();
  Game.elapsed = 0;
  Game.lastTime = 0;

  buildPath();
  buildSpots();
  Quiz.reset();

  enterBuildPhase();
  Sfx.playBGM('office');

  if (!Game.running) {
    Game.running = true;
    requestAnimationFrame(loop);
  }
  UI.updateHUD();
}

function accuracy() {
  const total = Game.stats.killed + Game.stats.leaked;
  return total ? (Game.stats.killed / total) * 100 : 100;
}

function gameOver() {
  if (Game.state === STATE.OVER || Game.state === STATE.WIN) return;
  Game.state = STATE.OVER;
  Game.waveRunning = false;
  Sfx.stopBGM();
  Sfx.play('over');
  Leaderboard.save(Game.playerName, Game.waveIndex + 1, Game.score, accuracy(), false, Game.elapsed);
  UI.showGameOver();
}

function winGame() {
  if (Game.state === STATE.WIN) return;
  Game.state = STATE.WIN;
  Game.waveRunning = false;
  Game.score += Game.inbox * 40 + Math.round(accuracy()) * 5;
  Sfx.stopBGM();
  Sfx.play('win');
  Leaderboard.save(Game.playerName, WAVE_COUNT, Game.score, accuracy(), true, Game.elapsed);
  UI.showWin();
}

let pausedFrom = null;
function pauseGame() {
  if (Game.state !== STATE.BUILD && Game.state !== STATE.WAVE) return;
  pausedFrom = Game.state;
  Game.state = STATE.PAUSE;
  Sfx.stopBGM();
  UI.showPause();
}
function resumeGame() {
  if (Game.state !== STATE.PAUSE) return;
  Game.state = pausedFrom || STATE.BUILD;
  Sfx.playBGM(Game.waveIndex === WAVE_COUNT - 1 && Game.waveRunning ? 'boss' : 'office');
  UI.hideAll();
  UI.updateHUD();
}

function quitToTitle() {
  Game.state = STATE.TITLE;
  Game.running = false;
  Sfx.stopBGM();
  UI.showTitle();
}

/* =========================================================
   캔버스 입력 — 우선순위: 상자 > 오브 > 설치된 타워 > 빈 자리
   ========================================================= */
function canvasTap(x, y) {
  if (Game.state !== STATE.BUILD && Game.state !== STATE.WAVE) return;

  if (chestAt(x, y)) { openChest(); return; }

  const oi = orbAt(x, y);
  if (oi >= 0) { collectOrb(oi); return; }

  const si = spotAt(x, y);
  if (si === null) { Game.selectedTower = null; UI.hideTowerPanel(); return; }

  const s = Game.spots[si];
  if (s.tower) {
    Game.selectedTower = s.tower;
    Game.selectedType = null;
    UI.showTowerPanel(s.tower);
    Sfx.play('select');
    return;
  }
  if (Game.selectedType) {
    if (placeTower(Game.selectedType, si)) {
      Game.selectedTower = null;
      UI.hideTowerPanel();
      if (Game.credits < TOWER[Game.selectedType].cost) Game.selectedType = null;
      UI.renderPalette();
    }
    return;
  }
  Game.selectedTower = null;
  UI.hideTowerPanel();
}

function selectType(key) {
  if (!TOWER[key]) return;
  Game.selectedType = Game.selectedType === key ? null : key;
  Game.selectedTower = null;
  UI.hideTowerPanel();
  UI.renderPalette();
  Sfx.play('select');
}

function setSpeed(v) {
  Game.speed = v;
  UI.updateHUD();
}
