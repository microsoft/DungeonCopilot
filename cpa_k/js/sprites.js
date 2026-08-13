/* =========================================================
   코파일럿 아레나 — 코드로 그린 도트 스프라이트
   16x16 그리드에 사각형으로 그리고 확대해 쓴다.
   외부 이미지 파일이 하나도 없다.
   ========================================================= */

const PAL = {
  O: '#141020',
  skin: '#f7cfa4', skinDk: '#c98f5f',
  hair: '#3a2a1c',
  suit: '#2f6fd0', suitDk: '#1d4a91',
  shirt: '#f2f6ff',
  eyeW: '#ffffff'
};

const SPR = 16;

function makeSprite(rects, size = SPR) {
  const c = document.createElement('canvas');
  c.width = size; c.height = size;
  const g = c.getContext('2d');
  for (const [x, y, w, h, col] of rects) { g.fillStyle = col; g.fillRect(x, y, w, h); }
  return c;
}

/* ---------------- 주인공 (위에서 본 시점) ---------------- */
function heroRects(frame) {
  const r = [];
  const b = frame === 1 ? 1 : 0;
  // 그림자 대신 몸통
  r.push([4, 6 + b, 8, 7, PAL.suitDk]);
  r.push([5, 6 + b, 6, 6, PAL.suit]);
  r.push([7, 7 + b, 2, 5, PAL.shirt]);
  // 팔
  r.push([2, 7 + b, 2, 4, PAL.suit]);
  r.push([12, 7 + b, 2, 4, PAL.suit]);
  // 머리
  r.push([4, 1, 8, 6, PAL.skin]);
  r.push([4, 0, 8, 3, PAL.hair]);
  r.push([3, 1, 1, 4, PAL.hair]);
  r.push([12, 1, 1, 4, PAL.hair]);
  r.push([6, 4, 1, 1, PAL.O]);
  r.push([9, 4, 1, 1, PAL.O]);
  // 다리
  r.push([5, 13, 2, 3, PAL.suitDk]);
  r.push([9, 13, 2, 3, PAL.suitDk]);
  return r;
}

/* ---------------- 적: 밀린 메일 ---------------- */
function mailRects(frame) {
  const M = '#efe9db', D = '#b8b09a', L = '#8d8474', O = PAL.O;
  const b = frame === 1 ? 1 : 0;
  const r = [];
  r.push([1, 3 + b, 14, 10, D]);
  r.push([2, 4 + b, 12, 8, M]);
  // 봉투 접힘
  r.push([2, 4 + b, 7, 4, D]);
  r.push([7, 4 + b, 7, 4, D]);
  r.push([3, 5 + b, 5, 3, M]);
  r.push([8, 5 + b, 5, 3, M]);
  r.push([3, 10 + b, 8, 1, L]);
  // 눈
  r.push([4, 8 + b, 2, 2, O]);
  r.push([10, 8 + b, 2, 2, O]);
  r.push([4, 8 + b, 1, 1, PAL.eyeW]);
  r.push([10, 8 + b, 1, 1, PAL.eyeW]);
  return r;
}

/* ---------------- 적: 쌓인 데이터 ---------------- */
function dataRects(frame) {
  const C = '#3fbf72', D = '#1c7a41', L = '#a8f0c4', O = PAL.O;
  const f = frame === 1;
  const r = [];
  r.push([1, 2, 14, 13, D]);
  r.push([2, 3, 12, 11, C]);
  // 표 격자
  r.push([2, 7, 12, 1, D]);
  r.push([2, 11, 12, 1, D]);
  r.push([6, 3, 1, 11, D]);
  r.push([10, 3, 1, 11, D]);
  // 막대
  r.push([3, f ? 4 : 5, 2, f ? 2 : 1, L]);
  r.push([7, f ? 5 : 4, 2, f ? 1 : 2, L]);
  r.push([11, 4, 2, 2, L]);
  // 눈
  r.push([4, 8, 2, 2, O]);
  r.push([10, 8, 2, 2, O]);
  r.push([4, 8, 1, 1, PAL.eyeW]);
  r.push([10, 8, 1, 1, PAL.eyeW]);
  return r;
}

/* ---------------- 적: 백지 문서 ---------------- */
function blankRects(frame) {
  const W = '#eef3ff', D = '#8fa6d8', B = '#5b8def', O = PAL.O;
  const b = frame === 1 ? 1 : 0;
  const r = [];
  r.push([2, 1, 12, 14, D]);
  r.push([3, 2, 10, 12, W]);
  // 접힌 모서리
  r.push([10, 2, 3, 3, D]);
  // 커서만 깜빡이고 내용은 없다
  if (b) r.push([5, 6, 1, 4, B]);
  r.push([4, 11, 3, 1, D]);
  // 눈
  r.push([5, 8, 2, 2, O]);
  r.push([9, 8, 2, 2, O]);
  return r;
}

/* ---------------- 적: 출처 불명 ---------------- */
function rumorRects(frame) {
  const C = '#b06cf0', D = '#6c3ba0', L = '#e0c6ff', O = PAL.O;
  const f = frame === 1;
  const r = [];
  // 흐릿한 구름 모양
  r.push([2, 4 + (f ? 0 : 1), 12, 8, D]);
  r.push([3, 4 + (f ? 0 : 1), 10, 6, C]);
  r.push([1, 6, 2, 4, D]);
  r.push([13, 6, 2, 4, D]);
  // 물음표
  r.push([6, 5, 4, 1, L]);
  r.push([9, 6, 1, 2, L]);
  r.push([7, 8, 3, 1, L]);
  r.push([7, 9, 1, 1, L]);
  r.push([7, 11, 1, 1, L]);
  // 눈
  r.push([4, 8, 1, 2, O]);
  r.push([11, 8, 1, 2, O]);
  return r;
}

/* ---------------- 보스: 분기 마감 ---------------- */
function bossRects(frame) {
  const A = '#6b4bb5', D = '#3c2870', L = '#b39cf0';
  const E = '#ff4d4d', W = '#ffffff', G = '#f2c033';
  const f = frame === 1;
  const r = [];
  r.push([1, 4, 14, 11, D]);
  r.push([2, 4, 12, 9, A]);
  r.push([3, 5, 10, 6, L]);
  // 어깨 뿔
  r.push([0, 2, 3, 3, D]);
  r.push([13, 2, 3, 3, D]);
  // 머리
  r.push([4, 0, 8, 5, D]);
  r.push([5, 1, 6, 3, A]);
  // 눈 3개 — 동시에 여러 일을 본다
  r.push([5, 1, 2, 2, E]);
  r.push([9, 1, 2, 2, E]);
  r.push([7, 3, 2, 2, E]);
  r.push([5, 1, 1, 1, W]);
  r.push([9, 1, 1, 1, W]);
  // 가슴 코어
  r.push([6, 7, 4, 3, G]);
  r.push([7, 8, 2, 1, W]);
  // 하단 촉수
  r.push([2, 15 - (f ? 1 : 0), 3, 1, D]);
  r.push([7, 15, 2, 1, D]);
  r.push([11, 15 - (f ? 0 : 1), 3, 1, D]);
  return r;
}

/* ---------------- 맥락 조각 (Work IQ) ---------------- */
const ORB_KINDS = {
  mail: { icon: '✉', color: '#f0b429', label: '메일' },
  meet: { icon: '📅', color: '#e05a9a', label: '회의' },
  file: { icon: '📎', color: '#4fc3f7', label: '파일' },
  chat: { icon: '💬', color: '#2fae5f', label: '채팅' }
};
const ORB_LIST = ['mail', 'meet', 'file', 'chat'];

/* ---------------- 스프라이트 캐시 ---------------- */
const SPRITES = {};

function buildSprites() {
  SPRITES.hero = [makeSprite(heroRects(0)), makeSprite(heroRects(1))];
  SPRITES.mail = [makeSprite(mailRects(0)), makeSprite(mailRects(1))];
  SPRITES.data = [makeSprite(dataRects(0)), makeSprite(dataRects(1))];
  SPRITES.blank = [makeSprite(blankRects(0)), makeSprite(blankRects(1))];
  SPRITES.rumor = [makeSprite(rumorRects(0)), makeSprite(rumorRects(1))];
  SPRITES.boss = [makeSprite(bossRects(0)), makeSprite(bossRects(1))];
}
