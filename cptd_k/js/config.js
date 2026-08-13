/* =========================================================
   코파일럿 타워디펜스 — 설정값 한곳 모으기

   밸런스를 손볼 때 이 파일만 열면 되도록 수치를 전부 여기 둔다.
   (게임 로직 안에 상수를 흩어 놓으면 부스 현장에서 난이도를
    급히 낮춰야 할 때 손댈 곳을 못 찾는다.)
   ========================================================= */

const CONFIG = {
  W: 960,
  H: 544,

  START_CREDITS: 170,
  INBOX_MAX: 20,

  /* ---- Work IQ (맥락) ---- */
  WORKIQ_START: 45,
  WORKIQ_MAX: 100,
  WORKIQ_DECAY: 1.35,        // 초당 감소. 맥락은 가만 두면 상한다
  WORKIQ_ORB: 15,            // 오브 1개 회수량
  WORKIQ_AFTER_COWORK: 25,   // 코워크를 쓰고 나면 맥락을 다 태운다
  /* 100 을 찍는 순간 감쇠로 바로 99가 되어 버튼을 누를 틈이 없다.
     그래서 한 번 가득 차면 '충전됨' 상태를 유지하고, 이 값 아래로
     떨어질 때까지 발동할 수 있게 한다. */
  COWORK_KEEP: 82,
  COWORK_MS: 8000,

  /* 대미지 배율: Work IQ 0 → 0.55배, 100 → 1.6배 */
  DMG_MIN: 0.55,
  DMG_MAX: 1.60,
  GLOW_FROM: 70,             // 이 값을 넘으면 타워에 발광 효과

  /* ---- 환각 ---- */
  HALLUC_IQ: 8,              // 이 아래에서 환각 발생
  HALLUC_CHANCE: 0.34,       // 발사당 확률
  HALLUC_STUN_MS: 2600,

  /* ---- 오브 / 프롬프트 상자 ---- */
  ORB_MIN_MS: 4200, ORB_MAX_MS: 7600,
  ORB_LIFE_MS: 12000,
  CHEST_MIN_MS: 15000, CHEST_MAX_MS: 24000,
  CHEST_LIFE_MS: 15000,
  QUIZ_MS: 7000,

  /* ---- 진행 ---- */
  BUILD_MS: 14000,           // 웨이브 사이 준비 시간
  EARLY_BONUS_PER_SEC: 3,    // 준비시간을 남기고 시작하면 초당 크레딧
  SELL_RATE: 0.6,
  MAX_LEVEL: 3,

  /* ---- 점수 ---- */
  SCORE_KILL: 15,
  SCORE_WAVE: 250,
  SCORE_BOSS: 1200,
  SCORE_QUIZ: 150,
  SCORE_LEAK: -40
};

/* =========================================================
   들어오는 일 (적) — 색과 "이걸 처리하는 에이전트"가 1:1
   ========================================================= */
const WORK = {
  mail: {
    key: 'mail', name: '밀린 메일', icon: '📧', color: '#f0b429', dark: '#a3760f',
    by: 'summarize', hint: '요약으로 걷어낸다'
  },
  data: {
    key: 'data', name: '쌓인 데이터', icon: '📊', color: '#2fae5f', dark: '#1c7a41',
    by: 'analyze', hint: '분석으로 뚫는다'
  },
  doc: {
    key: 'doc', name: '백지 문서', icon: '📄', color: '#5b8def', dark: '#2f5bb0',
    by: 'draft', hint: '초안으로 채운다'
  },
  claim: {
    key: 'claim', name: '출처 불명', icon: '❓', color: '#b06cf0', dark: '#6c3ba0',
    by: 'ground', hint: '근거로 확인한다'
  }
};

const WORK_KEYS = ['mail', 'data', 'doc', 'claim'];

/* =========================================================
   타워 = 코파일럿 에이전트
   target: 이 타워가 처리할 수 있는 유일한 일 종류
   ========================================================= */
const TOWER = {
  summarize: {
    key: 'summarize', name: '요약', icon: '📧', product: 'Copilot Chat',
    target: 'mail', color: '#f0b429', dark: '#8a6209',
    cost: 40, range: 118, rate: 700, dmg: 12,
    desc: '긴 메일 더미를 훑어 요점만 남긴다'
  },
  analyze: {
    key: 'analyze', name: '분석', icon: '📊', product: 'Analyst',
    target: 'data', color: '#2fae5f', dark: '#155c30',
    cost: 55, range: 100, rate: 900, dmg: 19,
    desc: '코드를 돌려 원본 데이터를 계산한다'
  },
  draft: {
    key: 'draft', name: '초안', icon: '📄', product: 'Copilot in Word',
    target: 'doc', color: '#5b8def', dark: '#254a8f',
    cost: 50, range: 128, rate: 820, dmg: 15,
    desc: '백지 대신 초안부터 놓고 시작한다'
  },
  ground: {
    key: 'ground', name: '근거', icon: '🔎', product: 'Researcher',
    target: 'claim', color: '#b06cf0', dark: '#5c2f8f',
    cost: 65, range: 150, rate: 1080, dmg: 24,
    desc: '여러 출처를 훑어 사실을 확인한다'
  }
};

const TOWER_KEYS = ['summarize', 'analyze', 'draft', 'ground'];

/* =========================================================
   맥락 오브 — 주우면 Work IQ 회복
   ========================================================= */
const ORB_KINDS = [
  { key: 'mail', icon: '✉️', label: '메일', color: '#f0b429' },
  { key: 'meet', icon: '📅', label: '회의', color: '#e05a5a' },
  { key: 'file', icon: '📎', label: '파일', color: '#4fc3f7' },
  { key: 'chat', icon: '💬', label: '대화', color: '#7bd88f' }
];

/* =========================================================
   경로 — 왼쪽 밖에서 들어와 오른쪽 아래 받은편지함으로
   ========================================================= */
const PATH = [
  [-40, 92], [206, 92], [206, 226], [432, 226], [432, 92],
  [706, 92], [706, 356], [140, 356], [140, 470], [896, 470]
];

/* 받은편지함 위치 (경로 끝) */
const INBOX = { x: 912, y: 470 };

const STATE = {
  TITLE: 'title', BRIEF: 'brief', BUILD: 'build', WAVE: 'wave',
  QUIZ: 'quiz', PAUSE: 'pause', OVER: 'over', WIN: 'win'
};
