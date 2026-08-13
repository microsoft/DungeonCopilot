/* =========================================================
   코파일럿 아레나 — 설정 / 도구 / 적 / 웨이브

   핵심 규칙
     적마다 통하는 도구가 하나뿐이다.
     틀린 도구는 죽이지 못한다. 그래서 "무엇을 쓸까"가 실력이 된다.
   ========================================================= */

const CONFIG = {
  W: 960, H: 600,
  MAX_HP: 5,
  PLAYER_SPEED: 3.4,

  WORKIQ_MAX: 100,
  WORKIQ_START: 30,
  WORKIQ_DECAY: 1.5,        // 초당 감소 — 맥락은 신선해야 쓸모 있다
  WORKIQ_PER_ORB: 12,
  WORKIQ_COWORK: 100,       // 이 값에 도달하면 코워크 발동 가능
  COWORK_MS: 9000,

  FIRE_COOL: 240,           // 발사 간격(ms)
  SHOT_SPEED: 9.5,
  SHOT_LIFE: 1400,

  HALLUC_CHANCE: 0.55,      // Work IQ 0 부근에서 환각이 나올 확률
  ORB_EVERY: 4200,          // 맥락 조각 생성 주기
  ORB_LIFE: 11000,
  CHEST_EVERY: 26000,       // 프롬프트 상자 생성 주기
  CHEST_LIFE: 14000,
  QUIZ_MS: 7000,

  INVULN_MS: 1200
};

/* =========================================================
   도구 — 화면의 버튼 4개가 곧 이 4개다
   ========================================================= */
const TOOLS = {
  summarize: {
    key: 'summarize', slot: 1,
    name: '요약', product: 'Copilot Chat',
    color: '#f0b429', icon: '💬',
    hint: '길어서 못 읽는 것'
  },
  analyze: {
    key: 'analyze', slot: 2,
    name: '분석', product: 'Analyst',
    color: '#2fae5f', icon: '📊',
    hint: '숫자로 답해야 하는 것'
  },
  draft: {
    key: 'draft', slot: 3,
    name: '초안', product: 'Copilot in Word',
    color: '#5b8def', icon: '📄',
    hint: '백지에서 시작해야 하는 것'
  },
  ground: {
    key: 'ground', slot: 4,
    name: '근거', product: 'Researcher',
    color: '#b06cf0', icon: '🔎',
    hint: '사실인지 확인해야 하는 것'
  }
};

const TOOL_LIST = ['summarize', 'analyze', 'draft', 'ground'];

/* =========================================================
   적 — 몰려오는 잡무. 테두리 색이 곧 필요한 도구다
   ========================================================= */
const FOES = {
  mail: {
    key: 'mail', tool: 'summarize',
    name: '밀린 메일', label: '읽어야 할 게 200통',
    hp: 2, speed: 0.95, r: 17, score: 100
  },
  data: {
    key: 'data', tool: 'analyze',
    name: '쌓인 데이터', label: '숫자만 잔뜩',
    hp: 3, speed: 0.72, r: 20, score: 140
  },
  blank: {
    key: 'blank', tool: 'draft',
    name: '백지 문서', label: '첫 줄이 안 써짐',
    hp: 2, speed: 1.05, r: 17, score: 120
  },
  rumor: {
    key: 'rumor', tool: 'ground',
    name: '출처 불명', label: '진짜인지 모를 정보',
    hp: 2, speed: 1.25, r: 16, score: 160
  }
};

const FOE_LIST = ['mail', 'data', 'blank', 'rumor'];

/* =========================================================
   웨이브
     앞 웨이브는 한 종류만 내보내 규칙을 안전하게 익히게 하고,
     뒤로 갈수록 섞어서 판단 속도를 요구한다.
   ========================================================= */
const WAVES = [
  { n: 1, types: ['mail'], count: 6, gap: 900, tip: '메일에는 요약(1)을 쓰세요' },
  { n: 2, types: ['data'], count: 6, gap: 880, tip: '데이터에는 분석(2)' },
  { n: 3, types: ['mail', 'data'], count: 9, gap: 780, tip: '색을 보고 도구를 고르세요' },
  { n: 4, types: ['blank'], count: 7, gap: 800, tip: '백지 문서에는 초안(3)' },
  { n: 5, types: ['mail', 'data', 'blank'], count: 12, gap: 700, tip: '맥락(반짝이는 조각)을 주우세요' },
  { n: 6, types: ['rumor'], count: 8, gap: 760, tip: '출처 불명에는 근거(4)' },
  { n: 7, types: ['mail', 'blank', 'rumor'], count: 14, gap: 640, tip: 'Work IQ가 낮으면 헛소리가 나옵니다' },
  { n: 8, types: ['data', 'rumor'], count: 14, gap: 600, tip: '' },
  { n: 9, types: ['mail', 'data', 'blank', 'rumor'], count: 18, gap: 540, tip: 'Work IQ를 채우면 코워크를 쓸 수 있습니다' },
  { n: 10, boss: true, types: ['mail', 'data', 'blank', 'rumor'], count: 10, gap: 900, tip: '분기 마감 — 배운 것을 전부 쓰세요' }
];
