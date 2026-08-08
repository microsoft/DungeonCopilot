/* =========================================================
   던전앤코파일럿 8 — 코드로 그린 도트 스프라이트
   모든 스프라이트는 16x16 픽셀 그리드에 사각형으로 그려지고
   렌더링 시 imageSmoothingEnabled=false 로 확대되어
   정통 도트 그래픽 느낌을 유지합니다.
   ========================================================= */

const PAL = {
  outline: '#141020',
  skin: '#f2c99a', skinDk: '#c68a5c',
  hair: '#4a3020',
  armor: '#9aa6cc', armorDk: '#5e6a94',
  cape: '#b03a57', capeDk: '#6e1f34',
  metal: '#e6ecff', metalDk: '#9aa4c0',
  gold: '#f0c040',

  slime: '#4ede4a', slimeDk: '#2a9c34', slimeLt: '#b6f8a8',
  gobSkin: '#79b23f', gobSkinDk: '#4a7526',
  gobArmor: '#a89670', gobArmorDk: '#5f5238',
  demSkin: '#9b46d6', demSkinDk: '#5e2288',
  horn: '#e8dcc0', hornDk: '#a8996f',
  fire: '#d060ff', fireLt: '#f0b0ff',
  eye: '#ff3b3b', eyeW: '#ffffff',

  floorA: '#221d17', floorB: '#29231b', floorDot: '#161209',
  wallTop: '#6b5f4c', wallMid: '#4a4135', wallDk: '#2e281f',
  portalA: '#49b6ff', portalB: '#a8e6ff', portalC: '#1f5aa8'
};

const SPR = 16; // 스프라이트 원본 해상도

/** 사각형 목록으로 16x16 오프스크린 캔버스를 만든다 */
function makeSprite(rects, size = SPR) {
  const c = document.createElement('canvas');
  c.width = size; c.height = size;
  const g = c.getContext('2d');
  for (const [x, y, w, h, col] of rects) {
    g.fillStyle = col;
    g.fillRect(x, y, w, h);
  }
  return c;
}

/* ---------------- 전사 (플레이어) ---------------- */
function warriorRects(dir, frame) {
  const O = PAL.outline, SK = PAL.skin, SD = PAL.skinDk, HR = PAL.hair,
    AR = PAL.armor, AD = PAL.armorDk, CP = PAL.cape, CD = PAL.capeDk,
    MT = PAL.metal, MD = PAL.metalDk, GD = PAL.gold;

  const r = [];
  const wide = frame === 1;              // 걷기 프레임: 다리 벌림
  const bob = frame === 1 ? 1 : 0;       // 상체 살짝 위아래

  // ---- 망토 (몸통 뒤)
  r.push([2, 7 + bob, 12, 8, CD]);
  r.push([3, 7 + bob, 10, 6, CP]);

  // ---- 다리 / 부츠
  if (wide) {
    r.push([4, 13, 3, 3, AD]); r.push([9, 13, 3, 3, AD]);
    r.push([4, 15, 3, 1, O]); r.push([9, 15, 3, 1, O]);
  } else {
    r.push([5, 13, 3, 3, AD]); r.push([8, 13, 3, 3, AD]);
    r.push([5, 15, 3, 1, O]); r.push([8, 15, 3, 1, O]);
  }

  // ---- 몸통 갑옷
  r.push([4, 7 + bob, 8, 7, AD]);
  r.push([5, 7 + bob, 6, 6, AR]);
  r.push([4, 12 + bob, 8, 1, GD]);       // 벨트

  if (dir === 0) {          // 아래 (정면)
    r.push([4, 1, 8, 4, HR]);            // 머리카락
    r.push([5, 2, 6, 5, SK]);            // 얼굴
    r.push([4, 1, 8, 2, HR]);            // 앞머리
    r.push([4, 2, 1, 4, HR]); r.push([11, 2, 1, 4, HR]);
    r.push([6, 4, 1, 1, O]); r.push([9, 4, 1, 1, O]);   // 눈
    r.push([7, 6, 2, 1, SD]);            // 입
    r.push([12, 6, 2, 8, MD]);           // 검 날
    r.push([12, 6, 1, 8, MT]);
    r.push([11, 13, 4, 1, GD]);          // 손잡이
  } else if (dir === 3) {   // 위 (뒷모습)
    r.push([4, 1, 8, 6, HR]);
    r.push([5, 2, 6, 4, '#5c3c28']);
    r.push([12, 5, 2, 8, MD]);
    r.push([12, 5, 1, 8, MT]);
  } else {                  // 좌/우 (측면)
    const flip = dir === 1;              // 1 = 왼쪽
    const X = (x, w) => flip ? [16 - x - w, w] : [x, w];
    let p;
    p = X(4, 8); r.push([p[0], 1, p[1], 4, HR]);
    p = X(6, 5); r.push([p[0], 2, p[1], 5, SK]);
    p = X(4, 7); r.push([p[0], 1, p[1], 2, HR]);
    p = X(4, 2); r.push([p[0], 2, p[1], 4, HR]);        // 뒤통수
    p = X(9, 1); r.push([p[0], 4, p[1], 1, O]);         // 눈
    p = X(12, 2); r.push([p[0], 5, p[1], 9, MD]);       // 검
    p = X(12, 1); r.push([p[0], 5, p[1], 9, MT]);
  }
  return r;
}

/* ---------------- 하급: 슬라임 ---------------- */
function slimeRects(frame) {
  const S = PAL.slime, D = PAL.slimeDk, L = PAL.slimeLt, O = PAL.outline;
  const squash = frame === 1 ? 1 : 0;
  const top = 6 + squash;
  const r = [];
  r.push([2 - squash, 14, 12 + squash * 2, 2, D]);        // 바닥 퍼짐
  r.push([3 - squash, 11, 10 + squash * 2, 4, D]);
  r.push([3, top + 2, 10, 12 - top, S]);
  r.push([4, top, 8, 4, S]);
  r.push([5, top - 1, 6, 2, S]);
  r.push([5, top, 2, 2, L]);                              // 하이라이트
  r.push([5, 10, 2, 2, O]); r.push([9, 10, 2, 2, O]);     // 눈
  r.push([5, 10, 1, 1, PAL.eyeW]); r.push([9, 10, 1, 1, PAL.eyeW]);
  r.push([7, 12, 2, 1, D]);                               // 입
  return r;
}

/* ---------------- 중급: 고블린 전사 ---------------- */
function goblinRects(frame) {
  const G = PAL.gobSkin, GD = PAL.gobSkinDk, A = PAL.gobArmor, AD = PAL.gobArmorDk,
    O = PAL.outline, E = PAL.eye, MT = PAL.metal, MD = PAL.metalDk;
  const wide = frame === 1;
  const r = [];
  // 다리
  if (wide) { r.push([3, 13, 3, 3, GD]); r.push([10, 13, 3, 3, GD]); }
  else { r.push([4, 13, 3, 3, GD]); r.push([9, 13, 3, 3, GD]); }
  // 몸통 갑옷
  r.push([3, 8, 10, 6, AD]);
  r.push([4, 8, 8, 5, A]);
  r.push([7, 9, 2, 3, AD]);
  // 귀
  r.push([1, 4, 3, 2, G]); r.push([12, 4, 3, 2, G]);
  r.push([1, 5, 2, 1, GD]); r.push([13, 5, 2, 1, GD]);
  // 얼굴
  r.push([4, 3, 8, 5, G]);
  r.push([4, 7, 8, 1, GD]);
  // 투구
  r.push([3, 1, 10, 3, AD]);
  r.push([4, 1, 8, 2, A]);
  r.push([7, 0, 2, 2, MD]);          // 투구 뿔
  // 눈
  r.push([5, 5, 2, 1, E]); r.push([9, 5, 2, 1, E]);
  // 송곳니
  r.push([6, 7, 1, 1, PAL.eyeW]); r.push([9, 7, 1, 1, PAL.eyeW]);
  // 도끼
  r.push([13, 4, 1, 9, PAL.hornDk]); // 자루
  r.push([12, 3, 4, 3, MD]);
  r.push([12, 3, 3, 2, MT]);
  return r;
}

/* ---------------- 상급: 데몬 로드 ---------------- */
function demonRects(frame) {
  const D = PAL.demSkin, DD = PAL.demSkinDk, H = PAL.horn, HD = PAL.hornDk,
    F = PAL.fire, FL = PAL.fireLt, O = PAL.outline, E = PAL.eye, GD = PAL.gold;
  const f = frame === 1;
  const r = [];
  // 화염 오라
  r.push([0, f ? 2 : 3, 2, 5, F]);
  r.push([14, f ? 3 : 2, 2, 5, F]);
  r.push([1, f ? 1 : 2, 1, 3, FL]);
  r.push([14, f ? 2 : 1, 1, 3, FL]);
  // 다리
  if (f) { r.push([3, 13, 4, 3, DD]); r.push([9, 13, 4, 3, DD]); }
  else { r.push([4, 13, 4, 3, DD]); r.push([8, 13, 4, 3, DD]); }
  // 몸통
  r.push([2, 8, 12, 6, DD]);
  r.push([3, 8, 10, 5, D]);
  r.push([7, 10, 2, 2, E]);          // 가슴 보석
  r.push([6, 9, 4, 1, GD]);
  // 뿔
  r.push([1, 0, 2, 4, HD]); r.push([13, 0, 2, 4, HD]);
  r.push([2, 1, 2, 2, H]); r.push([12, 1, 2, 2, H]);
  r.push([0, 2, 1, 3, HD]); r.push([15, 2, 1, 3, HD]);
  // 머리
  r.push([3, 2, 10, 6, DD]);
  r.push([4, 2, 8, 5, D]);
  r.push([4, 7, 8, 1, DD]);
  // 눈
  r.push([5, 4, 2, 2, E]); r.push([9, 4, 2, 2, E]);
  r.push([5, 4, 1, 1, FL]); r.push([9, 4, 1, 1, FL]);
  // 이빨
  r.push([5, 7, 1, 1, H]); r.push([7, 7, 1, 1, H]); r.push([10, 7, 1, 1, H]);
  return r;
}

/* ---------------- 포털 ---------------- */
function portalRects(phase) {
  const A = PAL.portalA, B = PAL.portalB, C = PAL.portalC;
  const p = phase % 3;
  const r = [];
  r.push([3, 1, 10, 14, C]);
  r.push([4, 2, 8, 12, A]);
  r.push([5, 3, 6, 10, B]);
  r.push([6, 4 + p, 4, 8 - p * 2, A]);
  r.push([7, 6 - p, 2, 4, B]);
  // 반짝임
  r.push([2, 4 + p, 1, 2, B]);
  r.push([13, 9 - p, 1, 2, B]);
  return r;
}

/* ---------------- 바닥 / 벽 타일 (32px) ---------------- */
function makeFloorTile(variant) {
  const c = document.createElement('canvas');
  c.width = 32; c.height = 32;
  const g = c.getContext('2d');
  g.fillStyle = variant % 2 ? PAL.floorB : PAL.floorA;
  g.fillRect(0, 0, 32, 32);
  // 돌바닥 이음새
  g.fillStyle = PAL.floorDot;
  g.fillRect(0, 0, 32, 2);
  g.fillRect(0, 0, 2, 32);
  g.fillRect(0, 15, 32, 1);
  g.fillRect(15, 0, 1, 16);
  g.fillRect(23, 16, 1, 16);
  // 잡티
  if (variant === 2) { g.fillRect(6, 22, 3, 2); g.fillRect(20, 6, 2, 2); }
  if (variant === 3) { g.fillRect(24, 25, 2, 3); g.fillRect(9, 8, 2, 2); }
  return c;
}

function makeWallTile() {
  const c = document.createElement('canvas');
  c.width = 32; c.height = 32;
  const g = c.getContext('2d');
  g.fillStyle = '#181410'; g.fillRect(0, 0, 32, 32);   // 벽 사이 그림자
  g.fillStyle = PAL.wallDk; g.fillRect(0, 0, 32, 30);
  g.fillStyle = PAL.wallMid; g.fillRect(1, 1, 30, 26);
  g.fillStyle = PAL.wallTop; g.fillRect(1, 1, 30, 7);  // 윗면 하이라이트
  // 벽돌 결
  g.fillStyle = '#3a3227';
  g.fillRect(0, 13, 32, 2);
  g.fillRect(0, 25, 32, 2);
  g.fillRect(11, 1, 2, 12);
  g.fillRect(22, 15, 2, 10);
  g.fillStyle = 'rgba(255,255,255,0.10)';
  g.fillRect(1, 15, 30, 1);
  g.fillRect(1, 27, 30, 1);
  return c;
}

/* ---------------- 스프라이트 캐시 ---------------- */
const SPRITES = {};

function buildSprites() {
  SPRITES.warrior = [];
  for (let d = 0; d < 4; d++) {
    SPRITES.warrior[d] = [makeSprite(warriorRects(d, 0)), makeSprite(warriorRects(d, 1))];
  }
  SPRITES.low = [makeSprite(slimeRects(0)), makeSprite(slimeRects(1))];
  SPRITES.mid = [makeSprite(goblinRects(0)), makeSprite(goblinRects(1))];
  SPRITES.high = [makeSprite(demonRects(0)), makeSprite(demonRects(1))];
  SPRITES.portal = [makeSprite(portalRects(0)), makeSprite(portalRects(1)), makeSprite(portalRects(2))];
  SPRITES.floor = [makeFloorTile(0), makeFloorTile(1), makeFloorTile(2), makeFloorTile(3)];
  SPRITES.wall = makeWallTile();
}
