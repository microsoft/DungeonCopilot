/* =========================================================
   던전앤코파일럿 8 — 전투(퀴즈) 시스템
   ========================================================= */

function pickQuestion(tier) {
  const bank = QUIZ_MODES[Game.mode].banks[tier];
  const unused = bank.map((q, i) => `${tier}:${i}`)
    .filter(k => !Game.usedQuestions.has(k));

  // 모두 소진하면 해당 등급만 초기화
  if (unused.length === 0) {
    bank.forEach((q, i) => Game.usedQuestions.delete(`${tier}:${i}`));
    return pickQuestion(tier);
  }
  const key = unused[Math.floor(Math.random() * unused.length)];
  Game.usedQuestions.add(key);
  const idx = parseInt(key.split(':')[1], 10);
  return { q: bank[idx], key };
}

function startBattle(monster) {
  const cfg = CONFIG.TIER[monster.tier];
  const picked = pickQuestion(monster.tier);

  // 보기 섞기 (정답 인덱스 추적)
  const opts = picked.q.a.map((text, i) => ({ text, correct: i === picked.q.c }));
  for (let i = opts.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [opts[i], opts[j]] = [opts[j], opts[i]];
  }

  Game.currentBattle = {
    monster, tier: monster.tier, cfg,
    question: picked.q, options: opts,
    timeLeft: cfg.time,
    answered: false,
    lockUntil: performance.now() + 350,   // 조우 직후 오입력 방지
    timerId: null
  };

  Game.state = STATE.BATTLE;
  clearAutoPath();               // 클릭 이동 중이었다면 멈춘다
  Audio8.play('encounter');
  Audio8.playBGM(monster.tier === 'high' ? 'boss' : 'battle');
  UI.showBattle(Game.currentBattle);
}

function answerBattle(optIndex) {
  const b = Game.currentBattle;
  if (!b || b.answered) return;
  // 타임아웃(-1)은 잠금과 무관하게 처리
  if (optIndex >= 0 && b.lockUntil && performance.now() < b.lockUntil) return;
  b.answered = true;
  if (b.timerId) { clearInterval(b.timerId); b.timerId = null; }

  const chosen = optIndex >= 0 ? b.options[optIndex] : null;
  const isCorrect = !!(chosen && chosen.correct);
  const correctIdx = b.options.findIndex(o => o.correct);

  if (isCorrect) {
    const pts = b.cfg.points;
    Game.stagePoints += pts;
    Game.totalPoints += pts;
    Audio8.play('correct');
    setTimeout(() => Audio8.play('victory'), 320);

    // 몬스터 처치
    const mi = Game.monsters.indexOf(b.monster);
    if (mi >= 0) Game.monsters.splice(mi, 1);
    addFloat(`+${pts}`, b.monster.x + 12, b.monster.y, '#f0b429', 1400);
  } else {
    const dmg = b.cfg.dmg;
    Game.hp = Math.max(0, Game.hp - dmg);
    Audio8.play('wrong');
    setTimeout(() => Audio8.play('hurt'), 240);
    Game.shake = 14;

    // 오답 시 몬스터는 잠시 물러남(재도전 가능)
    b.monster.cooldown = 4000;
    b.monster.changeTimer = 0;
    Game.player.invuln = 1200;
    addFloat(`-${dmg}`, Game.player.x + 12, Game.player.y, '#e2622a', 1400);
  }

  UI.showBattleResult(b, isCorrect, correctIdx, chosen);
  // 해설을 읽을 최소 시간 확보 (버튼 연타로 건너뛰는 것 방지)
  b.continueLockUntil = performance.now() + 600;
}

function closeBattle() {
  const b = Game.currentBattle;
  if (!b) return;
  if (b.continueLockUntil && performance.now() < b.continueLockUntil) return;
  if (b.timerId) { clearInterval(b.timerId); b.timerId = null; }
  Game.currentBattle = null;
  UI.hideBattle();

  if (Game.hp <= 0) { gameOver(); return; }

  Game.state = STATE.PLAY;
  Audio8.playBGM('dungeon');
  UI.updateHUD();

  if (Game.stagePoints >= CONFIG.STAGE_GOAL && !Game.portalOpen) openPortal();
}
