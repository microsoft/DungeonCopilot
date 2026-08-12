/* =========================================================
   Copilot World — 스테이지 데이터

   레벨은 문자열이 아니라 "배치 명령" 목록으로 만든다.
   손으로 90칸짜리 문자열을 세다 보면 반드시 어긋나기 때문이다.

   타일 문자
     .  빈칸
     #  땅
     =  벽돌 발판
     ?  프롬프트 블록   (프롬프트 능력으로 접촉 시 발동)
     p  프롬프트 발판   (프롬프트 블록 발동 전에는 없는 것과 같다)
     D  데이터 벽       (분석 대시로만 파괴)
     h  숨은 발판       (근거 능력이 있어야 실체가 된다)
     ^  가시
     G  골 깃발
   ========================================================= */

const LEVEL_H = 17;          // 세로 타일 수 (고정)

/* ---- 배치 헬퍼 ---- */
function _grid(w) {
  return Array.from({ length: LEVEL_H }, () => new Array(w).fill('.'));
}

/** 지면: yTop 행부터 바닥까지 채운다 */
function ground(x0, x1, yTop = 15) { return { op: 'ground', x0, x1, yTop }; }
/** 가로 발판 */
function plat(x0, x1, y, ch = '=') { return { op: 'plat', x0, x1, y, ch }; }
/** 세로 기둥 */
function col(x, y0, y1, ch = '=') { return { op: 'col', x, y0, y1, ch }; }
/** 타일 하나 */
function put(x, y, ch) { return { op: 'put', x, y, ch }; }
/** 코인 줄 */
function coins(x0, x1, y) { return { op: 'coins', x0, x1, y }; }
/** 적 배치 — kind: mail | meeting | repeat */
function foe(x, y, kind, patrol = 3) { return { op: 'foe', x, y, kind, patrol }; }

function buildLevel(spec) {
  const g = _grid(spec.width);
  const items = [];   // 코인
  const foes = [];

  const set = (x, y, ch) => {
    if (x < 0 || y < 0 || x >= spec.width || y >= LEVEL_H) return;
    g[y][x] = ch;
  };

  for (const o of spec.ops) {
    switch (o.op) {
      case 'ground':
        for (let x = o.x0; x <= o.x1; x++)
          for (let y = o.yTop; y < LEVEL_H; y++) set(x, y, '#');
        break;
      case 'plat':
        for (let x = o.x0; x <= o.x1; x++) set(x, o.y, o.ch);
        break;
      case 'col':
        for (let y = o.y0; y <= o.y1; y++) set(o.x, y, o.ch);
        break;
      case 'put':
        set(o.x, o.y, o.ch);
        break;
      case 'coins':
        for (let x = o.x0; x <= o.x1; x++) items.push({ x, y: o.y });
        break;
      case 'foe':
        foes.push({ x: o.x, y: o.y, kind: o.kind, patrol: o.patrol });
        break;
    }
  }

  return {
    id: spec.id,
    name: spec.name,
    subtitle: spec.subtitle,
    theme: spec.theme,
    ability: spec.ability || null,
    abilityAt: spec.abilityAt || null,
    hint: spec.hint || null,
    fog: spec.fog || [],
    boss: spec.boss || null,
    width: spec.width,
    tiles: g,
    coins: items,
    foes,
    start: spec.start,
    goal: spec.goal
  };
}

/* =========================================================
   능력 정의
   ========================================================= */
const ABILITY = {
  prompt: {
    key: 'prompt',
    name: '프롬프트',
    product: 'Copilot Chat',
    color: '#4fc3f7',
    icon: '💬',
    desc: '막히면 물어본다. 프롬프트 블록에 닿으면 길이 열린다.',
    how: '프롬프트 블록에 다가가기만 하면 됩니다'
  },
  draft: {
    key: 'draft',
    name: '초안',
    product: 'Copilot in Word',
    color: '#5b8def',
    icon: '📄',
    desc: '빈 화면 앞에서 멈추지 않는다. 발 디딜 초안을 먼저 만든다.',
    how: '공중에서 ↓ + 점프 (패드 B)'
  },
  analyze: {
    key: 'analyze',
    name: '분석',
    product: 'Analyst',
    color: '#2fae5f',
    icon: '📊',
    desc: '쌓인 데이터를 뚫고 지나간다.',
    how: 'Shift 로 대시 (패드 X)'
  },
  ground: {
    key: 'ground',
    name: '근거',
    product: 'Researcher',
    color: '#b06cf0',
    icon: '🔎',
    desc: '안개를 걷어내고 근거 있는 발판을 드러낸다.',
    how: '획득하면 자동으로 적용됩니다'
  }
};

/* =========================================================
   1-1 채팅 평원 — 프롬프트
   ========================================================= */
const L1 = buildLevel({
  id: 1,
  name: '채팅 평원',
  subtitle: 'Copilot Chat',
  theme: 'plain',
  ability: 'prompt',
  abilityAt: { x: 9, y: 14 },
  hint: '높은 벽은 혼자 넘을 수 없습니다. 물어보세요.',
  width: 100,
  start: { x: 2, y: 13 },
  goal: { x: 96, y: 14 },
  ops: [
    // 일반 낭떠러지는 2칸. 점프 한계(3칸)에 딱 맞추면 매번 아슬아슬해진다
    ground(0, 25), ground(28, 53), ground(56, 74), ground(78, 99),

    plat(12, 15, 11), coins(12, 15, 10),
    plat(20, 22, 10), coins(20, 22, 9),
    plat(33, 36, 11), coins(33, 36, 10),
    plat(44, 46, 9), coins(44, 46, 8),
    coins(25, 27, 12),
    coins(53, 55, 12),

    // 1-1은 첫 스테이지라 적을 적게 둔다. 여기서 끝나면 아무것도 못 배운다
    foe(18, 14, 'mail'), foe(34, 14, 'mail', 4),
    foe(48, 14, 'meeting', 3), foe(60, 14, 'mail', 4),

    // ── 관문: 프롬프트 블록 → 벽 높이까지 이어지는 1칸 계단
    put(66, 14, '?'),
    put(68, 14, 'p'), put(69, 13, 'p'), put(70, 12, 'p'), put(71, 11, 'p'),
    col(72, 10, 14, '='),          // 5칸 벽 — 계단 없이는 넘을 수 없다
    plat(73, 76, 10),
    coins(73, 76, 9),

    plat(82, 85, 11), coins(82, 85, 10),
    foe(84, 14, 'repeat', 3),
    coins(90, 94, 12),
    put(96, 14, 'G')
  ]
});

/* =========================================================
   1-2 워드 성 — 초안
   ========================================================= */
const L2 = buildLevel({
  id: 2,
  name: '워드 성',
  subtitle: 'Copilot in Word',
  theme: 'castle',
  ability: 'draft',
  abilityAt: { x: 11, y: 14 },
  hint: '빈 페이지는 건널 수 없습니다. 초안을 놓고 밟으세요.',
  width: 104,
  start: { x: 2, y: 13 },
  goal: { x: 100, y: 14 },
  ops: [
    ground(0, 27), ground(30, 46), ground(51, 76), ground(81, 103),

    plat(6, 9, 13),
    plat(14, 17, 12), coins(14, 17, 11),
    plat(21, 24, 10), coins(21, 24, 9),
    // 관문 바로 앞에는 적을 두지 않는다. 도움닫기를 방해받으면 건널 수 없다
    foe(19, 14, 'mail'), foe(34, 14, 'meeting', 4),

    plat(33, 36, 11), coins(33, 36, 10),
    plat(40, 43, 9), coins(40, 43, 8),

    // ── 관문 1: 초안 없이는 못 건너는 낭떠러지 (47~51)
    coins(48, 50, 10),

    plat(57, 61, 11), coins(57, 61, 10),
    foe(65, 14, 'repeat', 5),
    plat(67, 70, 9), coins(67, 70, 8),

    // ── 관문 2: 두 번째 낭떠러지 (77~81)
    coins(78, 80, 9),

    plat(88, 92, 11), coins(88, 92, 10),
    foe(94, 14, 'meeting'),
    put(100, 14, 'G')
  ]
});

/* =========================================================
   1-3 엑셀 광산 — 분석
   ========================================================= */
const L3 = buildLevel({
  id: 3,
  name: '엑셀 광산',
  subtitle: 'Analyst',
  theme: 'mine',
  ability: 'analyze',
  abilityAt: { x: 8, y: 14 },
  hint: '쌓인 데이터 벽은 대시로 뚫습니다.',
  width: 106,
  start: { x: 2, y: 13 },
  goal: { x: 102, y: 14 },
  ops: [
    ground(0, 40), ground(45, 70), ground(75, 105),

    plat(12, 15, 12), coins(12, 15, 11),
    foe(18, 14, 'repeat', 4),

    // ── 관문 1: 데이터 벽 2겹
    col(22, 10, 14, 'D'), col(23, 10, 14, 'D'),
    coins(25, 28, 12),

    plat(30, 33, 11), coins(30, 33, 10),
    foe(36, 14, 'mail'),

    // ── 관문 2: 낭떠러지(41~45) 건넌 직후 데이터 벽
    coins(41, 44, 10),
    col(48, 9, 14, 'D'), col(49, 9, 14, 'D'),

    plat(54, 58, 11), coins(54, 58, 10),
    foe(60, 14, 'meeting', 5),
    put(64, 14, '^'), put(65, 14, '^'),

    // ── 관문 3: 낭떠러지(71~75) + 좁은 통로 위 데이터 벽
    coins(71, 74, 11),
    plat(80, 94, 10),
    col(86, 11, 14, 'D'),
    coins(80, 84, 9),
    foe(90, 9, 'repeat', 3),
    col(97, 11, 14, 'D'), col(98, 11, 14, 'D'),
    put(102, 14, 'G')
  ]
});

/* =========================================================
   1-4 리서치 탑 — 근거
   ========================================================= */
const L4 = buildLevel({
  id: 4,
  name: '리서치 탑',
  subtitle: 'Researcher',
  theme: 'tower',
  ability: 'ground',
  abilityAt: { x: 12, y: 14 },
  hint: '안개 속 발판은 근거가 있어야 보입니다.',
  width: 108,
  fog: [[26, 54], [65, 95]],
  start: { x: 2, y: 13 },
  goal: { x: 104, y: 14 },
  ops: [
    ground(0, 24), ground(56, 63), ground(97, 107),

    plat(6, 10, 13),
    plat(14, 18, 11), coins(14, 18, 10),
    foe(20, 14, 'mail', 3),

    // ── 안개 구간 1: 숨은 발판 징검다리 (한 칸씩만 오르내린다)
    plat(26, 28, 13, 'h'), coins(26, 28, 12),
    plat(31, 33, 12, 'h'), coins(31, 33, 11),
    plat(36, 38, 12, 'h'),
    plat(41, 43, 11, 'h'), coins(41, 43, 10),
    plat(46, 48, 12, 'h'),
    plat(51, 54, 13, 'h'), coins(51, 54, 12),

    foe(58, 14, 'meeting'),
    coins(57, 61, 12),

    // ── 안개 구간 2: 완만한 상승 후 하강
    plat(66, 68, 13, 'h'),
    plat(71, 73, 12, 'h'), coins(71, 73, 11),
    plat(76, 78, 11, 'h'), coins(76, 78, 10),
    plat(81, 83, 11, 'h'),
    plat(86, 88, 12, 'h'), coins(86, 88, 11),
    plat(91, 94, 13, 'h'),

    foe(102, 14, 'repeat', 3),
    coins(99, 102, 13),
    put(104, 14, 'G')
  ]
});

/* =========================================================
   1-5 코워크 성 — 보스
   ========================================================= */
const L5 = buildLevel({
  id: 5,
  name: '코워크 성',
  subtitle: 'Cowork',
  theme: 'boss',
  hint: '혼자서는 못 이깁니다. 배운 것을 전부 쓰세요.',
  width: 72,
  fog: [[24, 34]],
  start: { x: 2, y: 13 },
  goal: null,
  boss: { x: 58, y: 6 },
  ops: [
    ground(0, 14), ground(19, 23), ground(38, 71),

    // ── 데이터 벽
    col(10, 10, 14, 'D'), col(11, 10, 14, 'D'),
    coins(6, 9, 12),

    // ── 낭떠러지 (15~19) : 초안 필요
    coins(16, 19, 10),

    // ── 안개 + 숨은 발판 (24~34) : 근거 필요
    plat(25, 27, 13, 'h'),
    plat(29, 31, 12, 'h'), coins(29, 31, 11),
    plat(33, 36, 13, 'h'),

    // ── 보스 아레나
    plat(44, 47, 10), plat(54, 57, 10), plat(64, 67, 10),
    col(70, 4, 14, '=')
  ]
});

const LEVELS = [L1, L2, L3, L4, L5];
