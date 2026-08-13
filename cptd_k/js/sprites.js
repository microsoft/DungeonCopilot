/* =========================================================
   코파일럿 타워디펜스 — 코드로 그린 도트 스프라이트

   16x16 격자에 사각형만 찍어 만든다. 그림 파일을 두지 않는 것은
   오프라인 부스에서도 폴더 하나로 끝내기 위해서다.
   확대는 imageSmoothingEnabled=false 로 해서 도트가 뭉개지지 않게 한다.
   ========================================================= */

const SPR = 16;

function makeSprite(rects, size = SPR) {
  const c = document.createElement('canvas');
  c.width = size; c.height = size;
  const g = c.getContext('2d');
  for (const [x, y, w, h, col] of rects) { g.fillStyle = col; g.fillRect(x, y, w, h); }
  return c;
}

const INK = '#141020';
const WHT = '#ffffff';

/* ---------------- 적: 밀린 메일 (봉투) ---------------- */
function mailRects(f, C, D) {
  const b = f ? 1 : 0;
  return [
    [1, 3 + b, 14, 10, D],
    [2, 4 + b, 12, 8, C],
    [2, 4 + b, 6, 4, D], [8, 4 + b, 6, 4, D],
    [3, 5 + b, 4, 2, C], [9, 5 + b, 4, 2, C],
    [4, 9 + b, 8, 1, D], [4, 11 + b, 5, 1, D],
    [4, 6 + b, 2, 2, INK], [10, 6 + b, 2, 2, INK],
    [4, 6 + b, 1, 1, WHT], [10, 6 + b, 1, 1, WHT]
  ];
}

/* ---------------- 적: 쌓인 데이터 (막대그래프) ---------------- */
function dataRects(f, C, D) {
  const b = f ? 1 : 0;
  return [
    [1, 2, 14, 13, D],
    [2, 3, 12, 11, C],
    [3, 8 - b, 2, 6, D], [6, 5, 2, 9, D], [9, 9 + b, 2, 5, D], [12, 6, 2, 8, D],
    [3, 8 - b, 2, 1, WHT], [6, 5, 2, 1, WHT], [9, 9 + b, 2, 1, WHT], [12, 6, 2, 1, WHT],
    [4, 3, 2, 2, INK], [10, 3, 2, 2, INK],
    [4, 3, 1, 1, WHT], [10, 3, 1, 1, WHT]
  ];
}

/* ---------------- 적: 백지 문서 (빈 페이지) ---------------- */
function docRects(f, C, D) {
  const b = f ? 1 : 0;
  return [
    [2, 1 + b, 12, 14, D],
    [3, 2 + b, 10, 12, '#eef3ff'],
    [11, 2 + b, 2, 2, C], [11, 2 + b, 2, 1, D],
    [4, 10 + b, 8, 1, C], [4, 12 + b, 5, 1, C],
    [5, 5 + b, 2, 2, INK], [9, 5 + b, 2, 2, INK],
    [5, 5 + b, 1, 1, WHT], [9, 5 + b, 1, 1, WHT],
    [6, 8 + b, 4, 1, '#c3cde4']
  ];
}

/* ---------------- 적: 출처 불명 (물음표 구름) ---------------- */
function claimRects(f, C, D) {
  const b = f ? 1 : 0;
  return [
    [2, 4 + b, 12, 9, D],
    [3, 5 + b, 10, 7, C],
    [1, 7 + b, 2, 4, D], [13, 7 + b, 2, 4, D],
    // 물음표
    [6, 2 + b, 5, 2, WHT], [10, 3 + b, 2, 3, WHT],
    [7, 5 + b, 4, 2, WHT], [7, 7 + b, 2, 2, WHT],
    [7, 10 + b, 2, 2, WHT],
    [4, 8 + b, 2, 2, INK], [11, 8 + b, 2, 2, INK]
  ];
}

const WORK_RECTS = { mail: mailRects, data: dataRects, doc: docRects, claim: claimRects };

/* ---------------- 보스: 분기 마감 (32x32) ---------------- */
function bossRects(f) {
  const A = '#6b4bb5', D = '#361f6b', L = '#b39cf0', E = '#ff4d4d', G = '#f2c033';
  const t = f ? 0 : 1;
  const r = [];
  // 서류 더미 몸통
  r.push([2, 10, 28, 20, D]);
  r.push([3, 11, 26, 17, A]);
  r.push([4, 12, 24, 5, L]);
  // 네 갈래 어깨 — 각 층이 다른 종류의 일이라는 표시
  r.push([0, 14, 3, 6, WORK.mail.color]);
  r.push([29, 14, 3, 6, WORK.data.color]);
  r.push([0, 22, 3, 6, WORK.doc.color]);
  r.push([29, 22, 3, 6, WORK.claim.color]);
  // 머리 (달력)
  r.push([8, 0, 16, 11, D]);
  r.push([9, 2, 14, 8, '#e9eef8']);
  r.push([9, 2, 14, 2, E]);
  r.push([10, 0, 2, 3, '#8b93a3']); r.push([20, 0, 2, 3, '#8b93a3']);
  // 눈 (마감일 숫자 자리)
  r.push([11, 5, 3, 3, INK]); r.push([18, 5, 3, 3, INK]);
  r.push([11, 5, 1, 1, E]); r.push([18, 5, 1, 1, E]);
  // 가슴 코어
  r.push([13, 19, 6, 5, G]);
  r.push([15, 20, 2, 2, WHT]);
  // 발
  r.push([4 + t, 30, 6, 2, D]);
  r.push([22 - t, 30, 6, 2, D]);
  return r;
}

/* ---------------- 타워: 에이전트 로봇 ---------------- */
function towerRects(color, dark, mark, f) {
  const b = f ? 1 : 0;
  const r = [];
  // 받침
  r.push([2, 13, 12, 3, '#2b3350']);
  r.push([3, 12, 10, 2, '#3f4a70']);
  // 몸통
  r.push([3, 5 - b, 10, 8, dark]);
  r.push([4, 6 - b, 8, 6, color]);
  // 헤드 램프
  r.push([6, 2 - b, 4, 3, dark]);
  r.push([7, 3 - b, 2, 1, WHT]);
  // 눈 슬릿
  r.push([5, 7 - b, 6, 2, INK]);
  r.push([5, 7 - b, 2, 2, WHT]);
  // 가슴 표식 — 담당 업무 아이콘을 도트로
  if (mark === 'mail') { r.push([5, 10 - b, 6, 2, WHT]); r.push([6, 10 - b, 1, 1, dark]); r.push([9, 10 - b, 1, 1, dark]); }
  if (mark === 'data') { r.push([5, 11 - b, 1, 1, WHT]); r.push([7, 10 - b, 1, 2, WHT]); r.push([9, 9 - b, 1, 3, WHT]); }
  if (mark === 'doc') { r.push([6, 9 - b, 4, 3, WHT]); r.push([7, 10 - b, 2, 1, dark]); }
  if (mark === 'claim') { r.push([6, 9 - b, 3, 1, WHT]); r.push([8, 10 - b, 1, 1, WHT]); r.push([7, 11 - b, 2, 1, WHT]); }
  return r;
}

/* ---------------- 맥락 오브 ----------------
   이모지 폰트가 없는 PC에서도 종류가 구분되도록 도트로 직접 그린다. */
function orbBase(color, f) {
  const b = f ? 1 : 0;
  return [
    [3, 2 - b, 10, 12, 'rgba(0,0,0,0.45)'],
    [3, 1 - b, 10, 12, color],
    [4, 2 - b, 8, 2, 'rgba(255,255,255,0.4)']
  ];
}

function orbRects(kind, color, f) {
  const b = f ? 1 : 0;
  const r = orbBase(color, f);
  const W = '#ffffff', D = 'rgba(0,0,0,0.55)';
  if (kind === 'mail') {            // ✉ 봉투
    r.push([5, 5 - b, 6, 5, W]);
    r.push([5, 5 - b, 3, 2, D]); r.push([8, 5 - b, 3, 2, D]);
    r.push([6, 6 - b, 1, 1, W]); r.push([9, 6 - b, 1, 1, W]);
  } else if (kind === 'meet') {     // 📅 달력
    r.push([5, 4 - b, 6, 7, W]);
    r.push([5, 4 - b, 6, 2, D]);
    r.push([6, 3 - b, 1, 2, D]); r.push([9, 3 - b, 1, 2, D]);
    r.push([6, 7 - b, 2, 2, D]);
  } else if (kind === 'file') {     // 📎 클립
    r.push([6, 4 - b, 2, 7, W]);
    r.push([9, 4 - b, 2, 5, W]);
    r.push([6, 10 - b, 5, 1, W]);
    r.push([6, 4 - b, 4, 1, W]);
  } else {                          // 💬 말풍선
    r.push([4, 4 - b, 8, 5, W]);
    r.push([5, 9 - b, 3, 2, W]);
    r.push([6, 6 - b, 1, 1, D]); r.push([8, 6 - b, 1, 1, D]);
  }
  return r;
}

/* ---------------- 프롬프트 상자 ---------------- */
function chestRects(f) {
  const b = f ? 1 : 0;
  return [
    [2, 3 - b, 12, 10, '#1b2a4a'],
    [3, 4 - b, 10, 8, '#4fc3f7'],
    [4, 5 - b, 8, 6, '#0d1a2e'],
    [5, 6 - b, 5, 2, '#eaf7ff'],
    [9, 8 - b, 2, 1, '#eaf7ff'],
    [7, 9 - b, 2, 1, '#eaf7ff'],
    [6, 13 - b, 4, 2, '#1b2a4a'],
    [2, 3 - b, 12, 1, '#8fdcff']
  ];
}

/* ---------------- 받은편지함 ---------------- */
function inboxRects(f) {
  const b = f ? 1 : 0;
  return [
    [1, 6, 14, 9, '#3a4570'],
    [2, 7, 12, 7, '#556293'],
    [1, 6, 14, 2, '#8b98c8'],
    [3, 2 - b, 10, 5, '#e9eef8'],
    [3, 2 - b, 10, 1, '#b7c1dd'],
    [4, 4 - b, 8, 1, '#9aa5c6'],
    [2, 10, 12, 1, '#2a3358'],
    [5, 12, 6, 2, '#2a3358']
  ];
}

/* ---------------- 스프라이트 캐시 ---------------- */
const SPRITES = { work: {}, tower: {}, orb: {} };

function buildSprites() {
  for (const k of WORK_KEYS) {
    const w = WORK[k];
    SPRITES.work[k] = [
      makeSprite(WORK_RECTS[k](0, w.color, w.dark)),
      makeSprite(WORK_RECTS[k](1, w.color, w.dark))
    ];
  }
  for (const k of TOWER_KEYS) {
    const t = TOWER[k];
    SPRITES.tower[k] = [
      makeSprite(towerRects(t.color, t.dark, t.target, 0)),
      makeSprite(towerRects(t.color, t.dark, t.target, 1))
    ];
  }
  for (const o of ORB_KINDS) {
    SPRITES.orb[o.key] = [makeSprite(orbRects(o.key, o.color, 0)), makeSprite(orbRects(o.key, o.color, 1))];
  }
  SPRITES.boss = [makeSprite(bossRects(0), 32), makeSprite(bossRects(1), 32)];
  SPRITES.chest = [makeSprite(chestRects(0)), makeSprite(chestRects(1))];
  SPRITES.inbox = [makeSprite(inboxRects(0)), makeSprite(inboxRects(1))];
}
