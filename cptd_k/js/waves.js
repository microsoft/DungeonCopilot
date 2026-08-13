/* =========================================================
   웨이브 — 들어오는 일의 흐름

   앞 웨이브는 일부러 한 종류만 보낸다.
   "맞는 에이전트만 통한다"는 규칙을 안전하게 배우게 하려는 것이고,
   6웨이브부터 섞어서 배치를 다시 짜게 만든다.
   ========================================================= */

const WAVES = [
  {
    id: 1, name: '월요일 아침', note: '밀린 메일만 들어옵니다',
    reward: 55,
    groups: [{ type: 'mail', count: 8, gap: 850, delay: 0, hp: 30, speed: 76 }]
  },
  {
    id: 2, name: '보고서 요청', note: '백지 문서가 섞입니다',
    reward: 60,
    groups: [
      { type: 'mail', count: 6, gap: 800, delay: 0, hp: 34, speed: 78 },
      { type: 'doc', count: 6, gap: 900, delay: 5200, hp: 36, speed: 74 }
    ]
  },
  {
    id: 3, name: '원본 데이터 도착', note: '분석 없이는 못 막습니다',
    reward: 70,
    groups: [{ type: 'data', count: 11, gap: 720, delay: 0, hp: 46, speed: 72 }]
  },
  {
    id: 4, name: '출처 불명 자료', note: '근거 에이전트가 필요합니다',
    reward: 80,
    groups: [
      { type: 'claim', count: 8, gap: 780, delay: 0, hp: 52, speed: 80 },
      { type: 'mail', count: 8, gap: 700, delay: 3400, hp: 50, speed: 82 }
    ]
  },
  {
    id: 5, name: '분기 중간 점검', note: '문서와 데이터가 함께',
    reward: 90,
    groups: [
      { type: 'doc', count: 10, gap: 700, delay: 0, hp: 62, speed: 78 },
      { type: 'data', count: 10, gap: 700, delay: 4000, hp: 64, speed: 76 }
    ]
  },
  {
    id: 6, name: '전부 한꺼번에', note: '네 종류가 동시에 옵니다',
    reward: 105,
    groups: [
      { type: 'mail', count: 7, gap: 640, delay: 0, hp: 70, speed: 82 },
      { type: 'data', count: 7, gap: 640, delay: 1600, hp: 74, speed: 78 },
      { type: 'doc', count: 7, gap: 640, delay: 3200, hp: 72, speed: 80 },
      { type: 'claim', count: 7, gap: 640, delay: 4800, hp: 76, speed: 84 }
    ]
  },
  {
    id: 7, name: '팩트체크 폭주', note: '출처 불명 자료가 빠르게 몰려옵니다',
    reward: 115,
    groups: [
      { type: 'claim', count: 15, gap: 520, delay: 0, hp: 84, speed: 96 },
      { type: 'doc', count: 6, gap: 900, delay: 6000, hp: 86, speed: 78 }
    ]
  },
  {
    id: 8, name: '메일함 폭발', note: '메일과 데이터가 두 배로',
    reward: 125,
    groups: [
      { type: 'mail', count: 14, gap: 480, delay: 0, hp: 96, speed: 88 },
      { type: 'data', count: 12, gap: 600, delay: 2600, hp: 104, speed: 78 }
    ]
  },
  {
    id: 9, name: '마감 전야', note: '네 종류 전부, 더 단단하게',
    reward: 140,
    groups: [
      { type: 'mail', count: 10, gap: 540, delay: 0, hp: 112, speed: 90 },
      { type: 'claim', count: 10, gap: 560, delay: 1800, hp: 120, speed: 92 },
      { type: 'data', count: 10, gap: 560, delay: 3600, hp: 124, speed: 80 },
      { type: 'doc', count: 10, gap: 560, delay: 5400, hp: 118, speed: 84 }
    ]
  },
  {
    id: 10, name: '분기 마감', note: '보스 — 네 가지 능력이 전부 필요합니다',
    reward: 0,
    boss: {
      name: '분기 마감',
      speed: 34,
      /* 층(segment)마다 처리 담당이 다르다. 한 종류 타워만으로는 절대 못 깬다. */
      seg: { mail: 620, data: 620, doc: 620, claim: 620 },
      leak: 20
    },
    groups: [
      { type: 'mail', count: 8, gap: 900, delay: 4000, hp: 110, speed: 92 },
      { type: 'data', count: 8, gap: 900, delay: 9000, hp: 118, speed: 82 },
      { type: 'doc', count: 8, gap: 900, delay: 14000, hp: 114, speed: 86 },
      { type: 'claim', count: 8, gap: 900, delay: 19000, hp: 122, speed: 94 }
    ]
  }
];

const WAVE_COUNT = WAVES.length;

/** 처치 보상 — 웨이브가 올라갈수록 조금씩 오른다 */
function bountyFor(waveId) {
  return 6 + Math.floor(waveId * 0.9);
}
