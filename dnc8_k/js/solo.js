/* =========================================================
   던전앤코파일럿 8 — 1인칭 탐험 모드
   한 사람이 문제 하나를 받아 풀고 끝나는 단발성 모드.
   기록을 남기지 않으며, 결과 후 바로 다음 도전자로 넘어간다.
   ========================================================= */

const SOLO = {
  // 슬롯이 멈출 난이도 가중치 (일반 난이도)
  WEIGHTS: { low: 50, mid: 35, high: 15 },
  SPIN_MS: 1700,        // 릴이 도는 시간
  TICK_MS: 90           // 릴 한 칸 넘어가는 간격
};

const TIER_ORDER = ['low', 'mid', 'high'];
const TIER_LABEL_KO = { low: '하급', mid: '중급', high: '상급' };

function pickSoloTier() {
  if (isHell()) return 'high';
  const w = SOLO.WEIGHTS;
  const total = w.low + w.mid + w.high;
  const r = Math.random() * total;
  if (r < w.low) return 'low';
  if (r < w.low + w.mid) return 'mid';
  return 'high';
}

/** 탐험 모드 1회 시작 — 슬롯을 돌린다 */
function startSolo() {
  Game.gameMode = GAME_MODE.EXPLORE;
  Game.state = STATE.SLOT;
  Game.keys = {};

  const tier = pickSoloTier();
  Game.solo = { tier, question: null, options: [], answered: false, timerId: null, timeLeft: 0 };

  Audio8.resume();
  Audio8.playBGM('battle');
  UI.showSlot(tier);
}

/** 슬롯이 멈춘 뒤 문제를 낸다 */
function beginSoloQuestion() {
  const s = Game.solo;
  if (!s) return;

  const picked = pickQuestion(s.tier);
  const opts = picked.q.a.map((text, i) => ({ text, correct: i === picked.q.c }));
  for (let i = opts.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [opts[i], opts[j]] = [opts[j], opts[i]];
  }

  s.question = picked.q;
  s.options = opts;
  s.answered = false;
  s.lockUntil = performance.now() + 300;
  s.timeLeft = CONFIG.TIER[s.tier].time;

  Game.state = STATE.SOLO;
  Audio8.playBGM(s.tier === 'high' ? 'boss' : 'battle');
  UI.showSolo(s);
}

function answerSolo(optIndex) {
  const s = Game.solo;
  if (!s || s.answered) return;
  if (optIndex >= 0 && s.lockUntil && performance.now() < s.lockUntil) return;

  s.answered = true;
  if (s.timerId) { clearInterval(s.timerId); s.timerId = null; }

  const chosen = optIndex >= 0 ? s.options[optIndex] : null;
  const isCorrect = !!(chosen && chosen.correct);
  const correctIdx = s.options.findIndex(o => o.correct);

  Audio8.stopBGM();
  if (isCorrect) {
    Audio8.play('correct');
    setTimeout(() => Audio8.play('stageUp'), 340);
  } else {
    Audio8.play('wrong');
    setTimeout(() => Audio8.play('gameOver'), 260);
  }

  Game.state = STATE.SOLO_RESULT;
  UI.showSoloResult(s, isCorrect, correctIdx, chosen);
}

/** 다음 도전자 — 기록을 남기지 않고 바로 새 문제 */
function nextChallenger() {
  const s = Game.solo;
  if (s && s.timerId) { clearInterval(s.timerId); s.timerId = null; }
  Game.solo = null;
  startSolo();
}

/** 탐험 모드 종료 → 타이틀 */
function exitSolo() {
  const s = Game.solo;
  if (s && s.timerId) { clearInterval(s.timerId); s.timerId = null; }
  Game.solo = null;
  Audio8.stopBGM();
  Game.state = STATE.TITLE;
  Game.keys = {};
  UI.showTitle();
}
