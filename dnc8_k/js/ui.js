/* =========================================================
   던전앤코파일럿 8 — UI 컨트롤러
   ========================================================= */

/* 보기 4개에 붙는 라벨. 입력 방식에 따라 교체된다.
   키보드=1234, 8BitDo Micro=A B X Y (실제 눌러야 할 버튼과 일치시킨다) */
let OPTION_LABELS = ['1', '2', '3', '4'];
function setOptionLabels(labels) { OPTION_LABELS = labels; }

const UI = (() => {
  const $ = id => document.getElementById(id);

  let toastTimer = null;

  /* ---------------- HUD ---------------- */
  function updateHUD() {
    $('hud-name').textContent = Game.playerName;
    $('hud-stage').textContent = Game.stage;
    $('hud-total').textContent = Game.totalPoints;

    const goal = CONFIG.STAGE_GOAL;
    const sp = Math.min(Game.stagePoints, goal);
    $('hud-progress-text').textContent = `${Game.stagePoints} / ${goal}`;
    $('hud-progress-fill').style.width = `${(sp / goal) * 100}%`;
    $('hud-progress-fill').classList.toggle('full', Game.stagePoints >= goal);

    // 하트 체력 (하트 1개 = 1HP)
    const hearts = $('hud-hearts');
    hearts.innerHTML = '';
    for (let i = 0; i < CONFIG.MAX_HP; i++) {
      const d = document.createElement('span');
      d.className = 'heart ' + (i < Game.hp ? 'full' : 'empty');
      hearts.appendChild(d);
    }
    $('hud-hp-text').textContent = `${Game.hp}/${CONFIG.MAX_HP}`;
    $('hud-portal').classList.toggle('active', Game.portalOpen);
  }

  function toast(msg, ms = 2600) {
    const t = $('toast');
    t.textContent = msg;
    t.classList.add('show');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), ms);
  }

  /* ---------------- 화면 전환 ---------------- */
  function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    if (id) $(id).classList.add('active');
  }

  /* ---------------- 타이틀 ---------------- */
  function showTitle() {
    Game.state = STATE.TITLE;
    showScreen('screen-title');
    renderLeaderboard('title-leaderboard');
  }

  /* ---------------- 리더보드 ---------------- */
  function renderLeaderboard(containerId, highlightName) {
    const el = $(containerId);
    const rows = Leaderboard.top(10);
    if (!rows.length) {
      el.innerHTML = '<p class="lb-empty">아직 기록이 없습니다.<br>첫 번째 도전자가 되어보세요!</p>';
      return;
    }
    const medal = i => `${i + 1}`;
    el.innerHTML = `
      <table class="lb-table">
        <thead><tr><th>순위</th><th>도전자</th><th>스테이지</th><th>점수</th></tr></thead>
        <tbody>
          ${rows.map((r, i) => `
            <tr class="${r.name === highlightName ? 'me' : ''}">
              <td class="lb-rank ${i < 3 ? 'top' : ''}">${medal(i)}</td>
              <td class="lb-name">${escapeHtml(r.name)}</td>
              <td class="lb-stage">${r.stage}</td>
              <td class="lb-pts">${r.points}</td>
            </tr>`).join('')}
        </tbody>
      </table>`;
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  /* ---------------- 전투 ---------------- */
  const TIER_LABEL = { low: '하급', mid: '중급', high: '상급' };
  const PORTRAIT_POS = { low: '0% 50%', mid: '50% 50%', high: '100% 50%' };

  function showBattle(b) {
    const modal = $('battle-modal');
    $('battle-tier').textContent = `${TIER_LABEL[b.tier]} 몬스터`;
    $('battle-tier').className = `battle-tier tier-${b.tier}`;
    $('battle-monster-name').textContent = b.cfg.name;
    $('battle-reward').textContent = `승리 +${b.cfg.points}점`;
    $('battle-risk').textContent = `패배 -${b.cfg.dmg}HP`;

    const portrait = $('battle-portrait');
    portrait.style.backgroundPosition = PORTRAIT_POS[b.tier];
    portrait.className = `battle-portrait tier-${b.tier}`;

    $('battle-question').textContent = b.question.q;

    const list = $('battle-options');
    list.innerHTML = '';
    b.options.forEach((o, i) => {
      const btn = document.createElement('button');
      btn.className = 'opt-btn';
      btn.innerHTML = `<span class="opt-key">${OPTION_LABELS[i]}</span><span class="opt-text">${escapeHtml(o.text)}</span>`;
      btn.onclick = () => { Audio8.play('select'); answerBattle(i); };
      list.appendChild(btn);
    });

    $('battle-result').classList.remove('show');
    $('battle-result').innerHTML = '';
    const hint = $('battle-hint');
    if (hint) {
      hint.textContent = OPTION_LABELS[0] === 'A'
        ? `패드의 ${OPTION_LABELS.join(' · ')} 버튼으로 답을 고르세요`
        : '키보드 1 · 2 · 3 · 4 또는 클릭으로 답을 고르세요';
    }
    modal.classList.add('show');

    // 타이머
    updateTimer(b);
    b.timerId = setInterval(() => {
      b.timeLeft--;
      updateTimer(b);
      if (b.timeLeft <= 5 && b.timeLeft > 0) Audio8.play('tick');
      if (b.timeLeft <= 0) { clearInterval(b.timerId); b.timerId = null; answerBattle(-1); }
    }, 1000);
  }

  function updateTimer(b) {
    const pct = Math.max(0, (b.timeLeft / b.cfg.time) * 100);
    $('battle-timer-fill').style.width = `${pct}%`;
    $('battle-timer-fill').classList.toggle('danger', b.timeLeft <= 5);
    $('battle-timer-text').textContent = `${Math.max(0, b.timeLeft)}초`;
  }

  function showBattleResult(b, isCorrect, correctIdx, chosen) {
    const hint = $('battle-hint');
    if (hint) hint.textContent = '';
    const btns = $('battle-options').querySelectorAll('.opt-btn');
    btns.forEach((btn, i) => {
      btn.disabled = true;
      if (i === correctIdx) btn.classList.add('correct');
      else if (chosen && b.options[i] === chosen) btn.classList.add('wrong');
    });

    const res = $('battle-result');
    const timeout = !chosen;
    const fatal = Game.hp <= 0;
    res.innerHTML = `
      <div class="result-head ${isCorrect ? 'win' : 'lose'}">
        ${isCorrect ? `승리  +${b.cfg.points}점`
        : timeout ? `시간 초과  -${b.cfg.dmg}HP`
          : `패배  -${b.cfg.dmg}HP`}
      </div>
      <div class="result-exp"><strong>해설</strong> ${escapeHtml(b.question.exp)}</div>
      ${fatal ? '<div class="result-fatal">체력이 모두 소진되었습니다…</div>' : ''}
      <button class="btn primary" id="battle-continue">${fatal ? '결과 보기 (Enter)' : '계속하기 (Enter)'}</button>`;
    res.classList.add('show');

    const cont = $('battle-continue');
    cont.onclick = () => { Audio8.play('select'); closeBattle(); };
    cont.disabled = true;
    setTimeout(() => { cont.disabled = false; cont.focus(); }, 600);
  }

  function hideBattle() {
    $('battle-modal').classList.remove('show');
  }

  /* ---------------- 스테이지 전환 ---------------- */
  function showStageTransition() {
    $('stage-num').textContent = Game.stage;
    $('stage-total').textContent = Game.totalPoints;
    $('stage-hp').textContent = `${Game.hp}/${CONFIG.MAX_HP}`;
    showScreen('screen-stage');
    setTimeout(() => $('stage-continue').focus(), 80);
  }

  /* ---------------- 일시정지 ---------------- */
  function showPause() {
    $('pause-stage').textContent = Game.stage;
    $('pause-total').textContent = Game.totalPoints;
    $('pause-hp').textContent = `${Game.hp}/${CONFIG.MAX_HP}`;
    $('abandon-confirm').classList.remove('show');
    $('pause-modal').classList.add('show');
    setTimeout(() => $('pause-resume').focus(), 60);
  }

  function hidePause() {
    $('abandon-confirm').classList.remove('show');
    $('pause-modal').classList.remove('show');
  }

  /* ---------------- 탐험 모드: 슬롯 ---------------- */
  const TIER_PORTRAIT = { low: '0% 50%', mid: '50% 50%', high: '100% 50%' };

  function showSlot(finalTier) {
    showScreen('screen-slot');
    const reel = $('slot-reel');
    const cap = $('slot-caption');
    cap.textContent = '운명을 뽑는 중…';
    reel.className = 'slot-reel spinning';

    const order = ['low', 'mid', 'high'];
    let i = 0;
    const started = performance.now();

    const spin = setInterval(() => {
      const t = order[i % order.length];
      reel.textContent = TIER_LABEL_KO[t];
      reel.dataset.tier = t;
      Audio8.play('tick');
      i++;

      if (performance.now() - started >= SOLO.SPIN_MS) {
        clearInterval(spin);
        // 실제 뽑힌 난이도에서 멈춘다
        reel.textContent = TIER_LABEL_KO[finalTier];
        reel.dataset.tier = finalTier;
        reel.className = `slot-reel stopped tier-${finalTier}`;
        cap.textContent = `${CONFIG.TIER[finalTier].name} 등장!`;
        Audio8.play('encounter');
        setTimeout(() => beginSoloQuestion(), 1100);
      }
    }, SOLO.TICK_MS);
  }

  /* ---------------- 탐험 모드: 문제 ---------------- */
  function showSolo(s) {
    showScreen('screen-solo');
    const cfg = CONFIG.TIER[s.tier];

    $('solo-tier').textContent = `${TIER_LABEL_KO[s.tier]} 문제`;
    $('solo-tier').className = `battle-tier tier-${s.tier}`;
    $('solo-monster').textContent = cfg.name;
    const portrait = $('solo-portrait');
    portrait.style.backgroundPosition = TIER_PORTRAIT[s.tier];
    portrait.className = `solo-portrait tier-${s.tier}`;

    $('solo-question').textContent = s.question.q;

    const list = $('solo-options');
    list.innerHTML = '';
    s.options.forEach((o, i) => {
      const btn = document.createElement('button');
      btn.className = 'opt-btn';
      btn.innerHTML = `<span class="opt-key">${OPTION_LABELS[i]}</span><span class="opt-text">${escapeHtml(o.text)}</span>`;
      btn.onclick = () => { Audio8.play('select'); answerSolo(i); };
      list.appendChild(btn);
    });

    $('solo-hint').textContent = OPTION_LABELS[0] === 'A'
      ? `패드의 ${OPTION_LABELS.join(' · ')} 버튼으로 답을 고르세요`
      : '키보드 1 · 2 · 3 · 4 또는 클릭으로 답을 고르세요';

    updateSoloTimer(s);
    s.timerId = setInterval(() => {
      s.timeLeft--;
      updateSoloTimer(s);
      if (s.timeLeft <= 5 && s.timeLeft > 0) Audio8.play('tick');
      if (s.timeLeft <= 0) { clearInterval(s.timerId); s.timerId = null; answerSolo(-1); }
    }, 1000);
  }

  function updateSoloTimer(s) {
    const cfg = CONFIG.TIER[s.tier];
    const pct = Math.max(0, (s.timeLeft / cfg.time) * 100);
    $('solo-timer-fill').style.width = `${pct}%`;
    $('solo-timer-fill').classList.toggle('danger', s.timeLeft <= 5);
    $('solo-timer-text').textContent = `${Math.max(0, s.timeLeft)}초`;
  }

  /* ---------------- 탐험 모드: 결과 ---------------- */
  function showSoloResult(s, isCorrect, correctIdx, chosen) {
    const btns = $('solo-options').querySelectorAll('.opt-btn');
    btns.forEach((btn, i) => {
      btn.disabled = true;
      if (i === correctIdx) btn.classList.add('correct');
      else if (chosen && s.options[i] === chosen) btn.classList.add('wrong');
    });

    const timeout = !chosen;
    $('solo-result-card').className = `solo-result-card ${isCorrect ? 'win' : 'lose'}`;
    $('solo-verdict-mark').className = `verdict-mark ${isCorrect ? 'win' : 'lose'}`;
    $('solo-verdict').textContent = isCorrect ? '축하합니다!' : '실패';
    $('solo-verdict-sub').textContent = isCorrect
      ? `${TIER_LABEL_KO[s.tier]} 문제를 맞혔습니다`
      : timeout ? '시간이 초과되었습니다. 다시 도전하세요' : '아쉽습니다. 다시 도전하세요';

    $('solo-answer-text').textContent = s.options[correctIdx].text;
    $('solo-exp').textContent = s.question.exp;

    showScreen('screen-solo-result');
    const next = $('solo-next');
    next.disabled = true;
    setTimeout(() => { next.disabled = false; next.focus(); }, 700);
  }

  /* ---------------- 게임 오버 ---------------- */
  function showGameOver() {
    $('over-name').textContent = Game.playerName;
    $('over-stage').textContent = Game.stage;
    $('over-points').textContent = Game.totalPoints;
    const rank = Leaderboard.rankOf(Game.playerName);
    $('over-rank').textContent = rank ? `${rank}위` : '-';
    renderLeaderboard('over-leaderboard', Game.playerName);
    showScreen('screen-over');
  }

  /* 열려 있는 전투/문제 화면의 보기 라벨을 현재 입력 방식에 맞게 다시 그린다 */
  function refreshOptionLabels() {
    document.querySelectorAll('#battle-options .opt-key, #solo-options .opt-key')
      .forEach(el => {
        const i = Array.from(el.closest('.battle-options').children).indexOf(el.closest('.opt-btn'));
        if (i >= 0) el.textContent = OPTION_LABELS[i];
      });

    const text = OPTION_LABELS[0] === 'A'
      ? `패드의 ${OPTION_LABELS.join(' · ')} 버튼으로 답을 고르세요`
      : '키보드 1 · 2 · 3 · 4 또는 클릭으로 답을 고르세요';
    ['battle-hint', 'solo-hint'].forEach(id => {
      const el = $(id);
      if (el && el.textContent) el.textContent = text;
    });

    const guide = $('guide-answer');
    if (guide) {
      guide.textContent = OPTION_LABELS[0] === 'A'
        ? `퀴즈 답: ${OPTION_LABELS.join(' · ')}`
        : '퀴즈 답: 1 · 2 · 3 · 4';
    }
  }

  return {
    updateHUD, toast, showScreen, showTitle, renderLeaderboard,
    showBattle, showBattleResult, hideBattle, refreshOptionLabels,
    showPause, hidePause,
    showSlot, showSolo, showSoloResult,
    showStageTransition, showGameOver, escapeHtml
  };
})();
