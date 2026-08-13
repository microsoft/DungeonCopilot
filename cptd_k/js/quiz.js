/* =========================================================
   프롬프트 상자 문제

   보너스일 뿐 관문이 아니다. 틀리거나 무시해도 잃는 것이 없어야
   "일단 눌러보자"가 되고, 그래야 실제로 읽힌다.
   그래서 문항은 전부 한 줄, 함정 없이, 실무에서 바로 쓰는 내용만 담았다.
   ========================================================= */

const CHEST_QUESTIONS = [
  {
    q: '사내 문서와 웹을 함께 훑어 근거 있는 조사 보고서가 필요하다면?',
    opts: ['Researcher', 'Analyst'],
    a: 0,
    why: 'Researcher는 여러 출처를 오가며 다단계로 조사합니다. 표 계산이 아니라 "조사 과제"에 씁니다.'
  },
  {
    q: '수천 행짜리 매출 원본에서 이상치를 찾아내야 한다면?',
    opts: ['Researcher', 'Analyst'],
    a: 1,
    why: 'Analyst는 파이썬 코드를 직접 실행해 계산하고 그 과정을 보여줍니다. 숫자 작업은 여기입니다.'
  },
  {
    q: '같은 질문인데 매번 답이 뻔한 일반론이라면 가장 먼저 할 일은?',
    opts: ['프롬프트를 더 길게 쓴다', '관련 파일·메일을 참조로 붙인다'],
    a: 1,
    why: '맥락(파일·메일·회의록)이 붙어야 우리 회사 이야기가 나옵니다. 길이보다 근거가 먼저입니다.'
  },
  {
    q: 'Copilot이 준 문장을 보고서에 넣기 전에 반드시 할 일은?',
    opts: ['인용된 출처를 열어 대조한다', '글자 수를 맞춘다'],
    a: 0,
    why: '근거 확인은 사용자의 몫입니다. 출처 링크를 열어보는 습관이 안전한 활용의 핵심입니다.'
  },
  {
    q: 'Cowork(공동 작업)가 일반 채팅과 가장 다른 점은?',
    opts: ['답이 더 짧다', '단계로 나눠 스스로 진행하고 결과 파일까지 만든다'],
    a: 1,
    why: 'Cowork는 작업 단위입니다. 계획을 세우고 도구를 골라 실행한 뒤 산출물을 남깁니다.'
  },
  {
    q: '좋은 프롬프트에 거의 항상 들어가는 것은?',
    opts: ['역할·맥락·목적·원하는 형식', '정중한 인사말'],
    a: 0,
    why: '"보고서 써줘"는 Copilot이 추측하게 만듭니다. 누가·왜·무엇을·어떤 형식으로를 주세요.'
  },
  {
    q: '답이 마음에 들지 않을 때 가장 효과적인 다음 행동은?',
    opts: ['창을 닫고 직접 쓴다', '무엇이 아쉬운지 짚어 이어서 요청한다'],
    a: 1,
    why: 'Copilot은 대화형입니다. 한 번에 완성하려 하지 말고 "더 짧게, 표로"처럼 고쳐 나가세요.'
  },
  {
    q: '백지 문서에서 제안서를 시작할 때 품질을 가장 크게 좌우하는 것은?',
    opts: ['어떤 파일을 참조로 걸었는가', '글꼴과 여백'],
    a: 0,
    why: 'Word의 초안 만들기에 기존 문서를 걸면 백지에서 출발하지 않아도 됩니다.'
  },
  {
    q: '3일치 팀 채팅과 메일을 놓쳤습니다. 가장 먼저 시킬 일은?',
    opts: ['새 문서를 만들게 한다', '무엇을 놓쳤는지 요약하고 내가 할 일을 뽑게 한다'],
    a: 1,
    why: '따라잡기(catch up)는 Copilot이 가장 잘하는 일입니다. 요약 다음에 액션 아이템까지 시키세요.'
  },
  {
    q: '민감한 사내 자료를 Copilot에 붙여도 되는 이유는?',
    opts: ['업무용 Copilot은 조직의 권한 경계 안에서 동작하기 때문', '어떤 자료든 아무 데나 넣어도 되기 때문'],
    a: 0,
    why: '업무용 Copilot은 내가 접근 권한을 가진 데이터만 봅니다. 다만 권한 밖 공유는 여전히 사용자 책임입니다.'
  }
];

/* 보상 종류 — 셋 중 하나가 무작위로 걸린다 */
const CHEST_REWARDS = [
  { key: 'credit', label: '크레딧 +90', desc: '에이전트를 하나 더 놓을 수 있습니다' },
  { key: 'workiq', label: 'Work IQ 가득', desc: '맥락이 채워져 타워가 세게 때립니다' },
  { key: 'upgrade', label: '무료 업그레이드', desc: '가장 낮은 레벨의 타워가 한 단계 올라갑니다' }
];

const Quiz = (() => {
  let pool = [];
  let current = null;
  let reward = null;
  let answered = false;

  /** 한 판 안에서 같은 문제가 반복되지 않도록 섞어 둔 풀에서 뽑는다 */
  function reset() {
    pool = CHEST_QUESTIONS.map((q, i) => i);
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    current = null; reward = null; answered = false;
  }

  function start() {
    if (!pool.length) reset();
    current = CHEST_QUESTIONS[pool.pop()];
    reward = CHEST_REWARDS[Math.floor(Math.random() * CHEST_REWARDS.length)];
    answered = false;
    return { question: current, reward };
  }

  function check(i) {
    if (!current || answered) return null;
    answered = true;
    return { correct: i === current.a, answer: current.a, why: current.why, reward };
  }

  function isAnswered() { return answered; }
  function get() { return current; }
  function getReward() { return reward; }
  function count() { return CHEST_QUESTIONS.length; }

  return { reset, start, check, isAnswered, get, getReward, count };
})();
