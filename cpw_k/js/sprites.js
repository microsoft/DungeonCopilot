/* =========================================================
   Copilot World — 코드로 그린 도트 스프라이트
   16x16 그리드에 사각형으로 그리고, imageSmoothingEnabled=false 로
   확대해 정통 도트 느낌을 유지한다. (dnc8 방식 계승)
   ========================================================= */

const PAL = {
  O: '#141020',
  skin: '#f7cfa4', skinDk: '#c98f5f',
  hair: '#3a2a1c',
  suit: '#2f6fd0', suitDk: '#1d4a91',
  shirt: '#f2f6ff',
  tie: '#ff9a3c',
  shoe: '#2a2622',

  mail: '#e8e2d2', mailDk: '#b3ab97', mailLine: '#8d8474',
  meet: '#e05a5a', meetDk: '#962f2f',
  rep: '#8a8fa8', repDk: '#565c74',

  bossA: '#6b4bb5', bossDk: '#3c2870', bossLt: '#b39cf0',
  eye: '#ff4d4d', eyeW: '#ffffff',

  gold: '#f2c033', goldDk: '#b07d10', goldLt: '#ffe89a',

  brickA: '#8a6a45', brickB: '#6d5136', brickDk: '#3f2f1f',
  soilA: '#5c4a32', soilB: '#4a3b28',
  grass: '#5aa64a', grassDk: '#3d7a33',
  stoneA: '#8790a6', stoneB: '#6a7288', stoneDk: '#414859',
  mineA: '#5e5346', mineB: '#4a4137',
  data: '#2fae5f', dataDk: '#1c7a41', dataLt: '#8ff0b8',
  hidden: '#b06cf0', hiddenDk: '#6c3ba0',
  spike: '#c9ccd6', spikeDk: '#7c8090'
};

const SPR = 16;

function makeSprite(rects, size = SPR) {
  const c = document.createElement('canvas');
  c.width = size; c.height = size;
  const g = c.getContext('2d');
  for (const [x, y, w, h, col] of rects) { g.fillStyle = col; g.fillRect(x, y, w, h); }
  return c;
}

/* ---------------- 주인공: 직장인 ---------------- */
function heroRects(dir, frame, state) {
  const O = PAL.O, SK = PAL.skin, SD = PAL.skinDk, HR = PAL.hair,
    SU = PAL.suit, SUD = PAL.suitDk, SH = PAL.shirt, TI = PAL.tie, SO = PAL.shoe;
  const r = [];
  const flip = dir < 0;
  const X = (x, w) => flip ? [16 - x - w, w] : [x, w];
  const P = (x, y, w, h, c) => { const p = X(x, w); r.push([p[0], y, p[1], h, c]); };

  const jumping = state === 'jump';
  const wide = frame === 1 && !jumping;
  const bob = wide ? 1 : 0;

  // 다리
  if (jumping) {
    P(4, 12, 3, 3, SUD); P(9, 11, 3, 3, SUD);
    P(4, 15, 3, 1, SO); P(9, 14, 3, 1, SO);
  } else if (wide) {
    P(3, 12, 3, 3, SUD); P(10, 12, 3, 3, SUD);
    P(3, 15, 4, 1, SO); P(9, 15, 4, 1, SO);
  } else {
    P(5, 12, 3, 3, SUD); P(8, 12, 3, 3, SUD);
    P(4, 15, 4, 1, SO); P(8, 15, 4, 1, SO);
  }

  // 몸통 (정장 재킷)
  P(4, 7 + bob, 8, 6, SUD);
  P(5, 7 + bob, 6, 5, SU);
  P(7, 7 + bob, 2, 5, SH);          // 셔츠
  P(7, 8 + bob, 2, 3, TI);          // 넥타이

  // 팔
  if (jumping) { P(2, 5, 2, 4, SU); P(12, 5, 2, 4, SU); }
  else { P(2, 8 + bob, 2, 4, SU); P(12, 8 + bob, 2, 4, SU); }

  // 머리
  P(4, 1, 8, 6, SK);
  P(4, 0, 8, 3, HR);                // 머리카락
  P(3, 1, 1, 4, HR); P(12, 1, 1, 3, HR);
  P(4, 6, 8, 1, SD);                // 턱 그림자
  if (flip || dir > 0) {
    P(9, 4, 1, 1, O);               // 측면 눈
  }
  P(6, 4, 1, 1, O); P(9, 4, 1, 1, O);
  return r;
}

/* ---------------- 적: 메일 더미 ---------------- */
function mailRects(frame) {
  const M = PAL.mail, D = PAL.mailDk, L = PAL.mailLine, O = PAL.O;
  const b = frame === 1 ? 1 : 0;
  const r = [];
  r.push([1, 13 + b, 14, 3, D]);
  r.push([2, 6 + b, 12, 8, M]);
  r.push([2, 6 + b, 12, 1, D]);
  r.push([3, 8 + b, 10, 1, L]);
  r.push([3, 10 + b, 7, 1, L]);
  // 봉투 접힘
  r.push([2, 6 + b, 7, 4, D]); r.push([7, 6 + b, 7, 4, D]);
  r.push([3, 7 + b, 5, 3, M]); r.push([8, 7 + b, 5, 3, M]);
  // 눈
  r.push([4, 11 + b, 2, 2, O]); r.push([10, 11 + b, 2, 2, O]);
  r.push([4, 11 + b, 1, 1, PAL.eyeW]); r.push([10, 11 + b, 1, 1, PAL.eyeW]);
  return r;
}

/* ---------------- 적: 회의 알림 ---------------- */
function meetRects(frame) {
  const C = PAL.meet, D = PAL.meetDk, O = PAL.O, W = PAL.eyeW;
  const f = frame === 1;
  const r = [];
  // 종
  r.push([4, 2, 8, 3, D]);
  r.push([3, 5, 10, 7, C]);
  r.push([4, 5, 8, 5, D]);
  r.push([5, 5, 6, 4, C]);
  r.push([2, 11, 12, 2, D]);
  r.push([7, 0, 2, 2, D]);           // 손잡이
  r.push([6, 13, 4, 3, D]);          // 추
  // 흔들림 표시
  if (f) { r.push([0, 6, 2, 1, C]); r.push([14, 8, 2, 1, C]); }
  else { r.push([0, 8, 2, 1, C]); r.push([14, 6, 2, 1, C]); }
  // 눈
  r.push([5, 7, 2, 2, O]); r.push([9, 7, 2, 2, O]);
  r.push([5, 7, 1, 1, W]); r.push([9, 7, 1, 1, W]);
  return r;
}

/* ---------------- 적: 반복 작업 ---------------- */
function repRects(frame) {
  const C = PAL.rep, D = PAL.repDk, O = PAL.O, W = PAL.eyeW;
  const f = frame === 1;
  const r = [];
  // 톱니바퀴 몸통
  r.push([3, 3, 10, 10, D]);
  r.push([4, 4, 8, 8, C]);
  const t = f ? 0 : 1;
  r.push([6 + t, 1, 3, 2, D]); r.push([6 - t, 13, 3, 2, D]);
  r.push([1, 6 + t, 2, 3, D]); r.push([13, 6 - t, 2, 3, D]);
  r.push([6, 6, 4, 4, D]);
  // 눈
  r.push([5, 6, 2, 2, O]); r.push([9, 6, 2, 2, O]);
  r.push([5, 6, 1, 1, W]); r.push([9, 6, 1, 1, W]);
  return r;
}

/* ---------------- 보스: 코워크 오버로드 ---------------- */
function bossRects(frame) {
  const A = PAL.bossA, D = PAL.bossDk, L = PAL.bossLt, E = PAL.eye, W = PAL.eyeW, G = PAL.gold;
  const f = frame === 1;
  const r = [];
  // 망토 / 몸통
  r.push([1, 5, 14, 10, D]);
  r.push([2, 5, 12, 8, A]);
  r.push([3, 6, 10, 5, L]);
  // 어깨 뿔
  r.push([0, 3, 3, 3, D]); r.push([13, 3, 3, 3, D]);
  // 머리
  r.push([4, 0, 8, 6, D]);
  r.push([5, 1, 6, 4, A]);
  // 눈 3개 (동시에 여러 일을 본다)
  r.push([5, 2, 2, 2, E]); r.push([9, 2, 2, 2, E]);
  r.push([7, 4, 2, 2, E]);
  r.push([5, 2, 1, 1, W]); r.push([9, 2, 1, 1, W]);
  // 가슴 코어
  r.push([6, 8, 4, 3, G]);
  r.push([7, 9, 2, 1, W]);
  // 하단 촉수
  const t = f ? 0 : 1;
  r.push([2, 15 - t, 3, 1, D]);
  r.push([7, 15, 2, 1, D]);
  r.push([11, 15 - (1 - t), 3, 1, D]);
  return r;
}

/* ---------------- 투사체: 잡무 ---------------- */
function choreRects() {
  const r = [];
  r.push([4, 4, 8, 8, PAL.meetDk]);
  r.push([5, 5, 6, 6, PAL.meet]);
  r.push([6, 6, 2, 2, PAL.eyeW]);
  return r;
}

/* ---------------- 코인: 크레딧 ---------------- */
function coinRects(phase) {
  const G = PAL.gold, D = PAL.goldDk, L = PAL.goldLt;
  const w = [10, 7, 3, 7][phase % 4];
  const x = 8 - Math.floor(w / 2);
  const r = [];
  r.push([x, 2, w, 12, D]);
  r.push([x + 1, 3, Math.max(w - 2, 1), 10, G]);
  if (w > 5) {
    r.push([x + 2, 4, 2, 8, L]);
    r.push([x + Math.floor(w / 2) - 1, 6, 2, 4, D]);
  }
  return r;
}

/* ---------------- 깃발 ---------------- */
function flagRects(frame) {
  const r = [];
  r.push([7, 0, 2, 16, '#cfd6e6']);
  const wv = frame === 1 ? 1 : 0;
  r.push([9, 1 + wv, 6, 5, '#2f6fd0']);
  r.push([9, 2 + wv, 5, 3, '#5b9cf7']);
  r.push([6, 14, 4, 2, '#8790a6']);
  return r;
}

/* ---------------- 능력 아이템 상자 ---------------- */
function abilityBoxRects(color, phase) {
  const r = [];
  const g = phase % 2 ? 1 : 0;
  r.push([1, 1, 14, 14, '#1b1f2e']);
  r.push([2, 2, 12, 12, color]);
  r.push([3, 3, 10, 10, '#ffffff']);
  r.push([4, 4, 8, 8, color]);
  r.push([6 + g, 6, 4 - g * 2, 4, '#ffffff']);
  return r;
}

/* =========================================================
   32px 타일
   ========================================================= */
function tileCanvas(draw) {
  const c = document.createElement('canvas');
  c.width = 32; c.height = 32;
  draw(c.getContext('2d'));
  return c;
}

function makeGroundTile(theme, top) {
  return tileCanvas(g => {
    const soil = theme === 'mine' ? PAL.mineA : theme === 'castle' || theme === 'boss' ? PAL.stoneB : PAL.soilA;
    const soilB = theme === 'mine' ? PAL.mineB : theme === 'castle' || theme === 'boss' ? PAL.stoneDk : PAL.soilB;
    g.fillStyle = soil; g.fillRect(0, 0, 32, 32);
    g.fillStyle = soilB;
    g.fillRect(0, 12, 32, 2); g.fillRect(14, 0, 2, 12); g.fillRect(6, 14, 2, 18);
    g.fillRect(22, 14, 2, 18); g.fillRect(0, 24, 32, 2);
    if (top) {
      if (theme === 'plain') {
        g.fillStyle = PAL.grassDk; g.fillRect(0, 0, 32, 8);
        g.fillStyle = PAL.grass; g.fillRect(0, 0, 32, 5);
        g.fillStyle = '#7cc96a';
        g.fillRect(2, 0, 3, 2); g.fillRect(12, 0, 3, 2); g.fillRect(24, 0, 3, 2);
      } else {
        g.fillStyle = theme === 'mine' ? '#7a6a55' : PAL.stoneA;
        g.fillRect(0, 0, 32, 6);
        g.fillStyle = 'rgba(255,255,255,0.12)'; g.fillRect(0, 0, 32, 2);
      }
    }
  });
}

function makeBrickTile(theme) {
  return tileCanvas(g => {
    const a = theme === 'castle' || theme === 'boss' ? PAL.stoneA : PAL.brickA;
    const b = theme === 'castle' || theme === 'boss' ? PAL.stoneB : PAL.brickB;
    g.fillStyle = PAL.brickDk; g.fillRect(0, 0, 32, 32);
    g.fillStyle = b; g.fillRect(0, 0, 32, 30);
    g.fillStyle = a; g.fillRect(1, 1, 30, 13);
    g.fillRect(1, 16, 14, 13);
    g.fillRect(17, 16, 14, 13);
    g.fillStyle = 'rgba(255,255,255,0.14)';
    g.fillRect(1, 1, 30, 2); g.fillRect(1, 16, 14, 2); g.fillRect(17, 16, 14, 2);
  });
}

function makePromptTile(active, phase) {
  return tileCanvas(g => {
    const c = active ? '#4fc3f7' : '#5a6478';
    g.fillStyle = '#14202e'; g.fillRect(0, 0, 32, 32);
    g.fillStyle = c; g.fillRect(2, 2, 28, 28);
    g.fillStyle = '#0d1622'; g.fillRect(5, 5, 22, 22);
    g.fillStyle = active ? '#eaf7ff' : '#8b93a3';
    // 말풍선 안의 물음표
    g.fillRect(11, 9, 10, 3); g.fillRect(18, 12, 3, 4);
    g.fillRect(14, 16, 7, 3); g.fillRect(14, 19, 3, 3);
    g.fillRect(14, 24, 3, 3);
    if (active && phase % 2) {
      g.fillStyle = 'rgba(255,255,255,0.22)'; g.fillRect(2, 2, 28, 28);
    }
  });
}

function makePlatformTile() {
  return tileCanvas(g => {
    g.fillStyle = '#1a2b3d'; g.fillRect(0, 6, 32, 20);
    g.fillStyle = '#4fc3f7'; g.fillRect(0, 6, 32, 6);
    g.fillStyle = '#8fdcff'; g.fillRect(0, 6, 32, 2);
    g.fillStyle = '#2c6f96';
    for (let x = 2; x < 32; x += 8) g.fillRect(x, 14, 4, 4);
  });
}

function makeDataTile() {
  return tileCanvas(g => {
    g.fillStyle = PAL.dataDk; g.fillRect(0, 0, 32, 32);
    g.fillStyle = PAL.data; g.fillRect(1, 1, 30, 30);
    // 표 격자
    g.fillStyle = PAL.dataDk;
    g.fillRect(0, 10, 32, 2); g.fillRect(0, 21, 32, 2);
    g.fillRect(10, 0, 2, 32); g.fillRect(21, 0, 2, 32);
    g.fillStyle = PAL.dataLt;
    g.fillRect(2, 2, 7, 2); g.fillRect(13, 13, 7, 2); g.fillRect(24, 24, 6, 2);
  });
}

function makeHiddenTile(revealed) {
  return tileCanvas(g => {
    if (!revealed) {
      g.fillStyle = 'rgba(176,108,240,0.16)';
      g.fillRect(2, 8, 28, 4);
      return;
    }
    g.fillStyle = PAL.hiddenDk; g.fillRect(0, 4, 32, 22);
    g.fillStyle = PAL.hidden; g.fillRect(1, 5, 30, 8);
    g.fillStyle = '#e0c6ff'; g.fillRect(1, 5, 30, 2);
    g.fillStyle = '#4d2a78';
    for (let x = 3; x < 32; x += 7) g.fillRect(x, 15, 4, 6);
  });
}

function makeSpikeTile() {
  return tileCanvas(g => {
    g.fillStyle = PAL.spikeDk; g.fillRect(0, 26, 32, 6);
    g.fillStyle = PAL.spike;
    for (let i = 0; i < 4; i++) {
      const x = i * 8;
      g.beginPath();
      g.moveTo(x, 27); g.lineTo(x + 4, 10); g.lineTo(x + 8, 27);
      g.closePath(); g.fill();
    }
  });
}

/* ---------------- 스프라이트 캐시 ---------------- */
const SPRITES = { tiles: {} };

function buildSprites() {
  SPRITES.hero = {};
  for (const st of ['idle', 'walk', 'jump']) {
    SPRITES.hero[st] = {
      1: [makeSprite(heroRects(1, 0, st)), makeSprite(heroRects(1, 1, st))],
      '-1': [makeSprite(heroRects(-1, 0, st)), makeSprite(heroRects(-1, 1, st))]
    };
  }
  SPRITES.mail = [makeSprite(mailRects(0)), makeSprite(mailRects(1))];
  SPRITES.meeting = [makeSprite(meetRects(0)), makeSprite(meetRects(1))];
  SPRITES.repeat = [makeSprite(repRects(0)), makeSprite(repRects(1))];
  SPRITES.boss = [makeSprite(bossRects(0)), makeSprite(bossRects(1))];
  SPRITES.chore = makeSprite(choreRects());
  SPRITES.coin = [0, 1, 2, 3].map(p => makeSprite(coinRects(p)));
  SPRITES.flag = [makeSprite(flagRects(0)), makeSprite(flagRects(1))];
  SPRITES.box = {};
  for (const k of Object.keys(ABILITY)) {
    SPRITES.box[k] = [
      makeSprite(abilityBoxRects(ABILITY[k].color, 0)),
      makeSprite(abilityBoxRects(ABILITY[k].color, 1))
    ];
  }

  for (const theme of ['plain', 'castle', 'mine', 'tower', 'boss']) {
    SPRITES.tiles[theme] = {
      groundTop: makeGroundTile(theme, true),
      ground: makeGroundTile(theme, false),
      brick: makeBrickTile(theme)
    };
  }
  SPRITES.tiles.prompt = [makePromptTile(false, 0), makePromptTile(true, 0), makePromptTile(true, 1)];
  SPRITES.tiles.platform = makePlatformTile();
  SPRITES.tiles.data = makeDataTile();
  SPRITES.tiles.hidden = [makeHiddenTile(false), makeHiddenTile(true)];
  SPRITES.tiles.spike = makeSpikeTile();
}
