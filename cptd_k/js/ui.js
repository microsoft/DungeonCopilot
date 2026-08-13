/* =========================================================
   코파일럿 타워디펜스 — HUD / 오버레이
   ========================================================= */

const $ = id => document.getElementById(id);

const UI = (() => {

  function show(id) {
    document.querySelectorAll('.overlay').forEach(el => el.classList.remove('active'));
    if (!id) return;
    const el = $(id);
    if (!el) return;
    el.classList.add('active');
    // 패널이 화면보다 길 때 focus() 가 안쪽을 스크롤해 제목을 잘라먹는다.
    // 항상 맨 위에서 시작하도록 되돌린다.
    el.scrollTop = 0;
    const p = el.querySelector('.panel');
    if (p) p.scrollTop = 0;
  }
  function hideAll() { show(null); }

  /** 패널 스크롤을 건드리지 않는 포커스 */
  function focusSoft(id) {
    const el = $(id);
    if (!el) return;
    try { el.focus({ preventScroll: true }); } catch (e) { el.focus(); }
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  /* ---------------- HUD ---------------- */
  function updateHUD() {
    const w = WAVES[Math.min(Game.waveIndex, WAVE_COUNT - 1)];
    const hw = $('hud-wave');
    if (hw) hw.textContent = `WAVE ${w ? w.id : WAVE_COUNT} / ${WAVE_COUNT}`;
    const hn = $('hud-wave-name');
    if (hn) hn.textContent = w ? w.name : '';

    const inb = $('hud-inbox');
    if (inb) {
      inb.textContent = `${Game.inbox} / ${CONFIG.INBOX_MAX}`;
      inb.classList.toggle('danger', Game.inbox <= 5);
    }
    const cr = $('hud-credit');
    if (cr) cr.textContent = Game.credits;
    const sc = $('hud-score');
    if (sc) sc.textContent = String(Game.score).padStart(5, '0');

    const sp = $('speed-btn');
    if (sp) sp.textContent = `${Game.speed}x`;

    renderPalette();
    tickHUD();
  }

  /** 매 프레임 갱신되는 것 — Work IQ 게이지와 코워크 버튼 */
  function tickHUD() {
    const bar = $('iq-fill');
    if (bar) {
      const p = Math.max(0, Math.min(100, Game.workIQ));
      bar.style.width = p + '%';
      bar.classList.toggle('low', p <= CONFIG.HALLUC_IQ);
      bar.classList.toggle('high', p >= CONFIG.GLOW_FROM);
    }
    const num = $('iq-num');
    if (num) num.textContent = Math.round(Math.max(0, Game.workIQ));

    const mul = $('iq-mult');
    if (mul) mul.textContent = `공격력 x${dmgMult().toFixed(2)}`;

    const cw = $('cowork-btn');
    if (cw) {
      const on = coworkActive();
      const ready = canCowork();
      cw.classList.toggle('ready', ready);
      cw.classList.toggle('active', on);
      cw.textContent = on
        ? `코워크 ${((Game.coworkUntil - Game.now) / 1000).toFixed(1)}s`
        : (ready ? '코워크 발동! (C)' : '코워크 (IQ 100)');
    }

    const nw = $('next-wave-btn');
    if (nw) {
      const build = Game.state === STATE.BUILD;
      nw.disabled = !build;
      nw.textContent = build
        ? `다음 웨이브 (${Math.ceil(Math.max(0, Game.buildTimer) / 1000)}s)`
        : '진행 중…';
    }
  }

  /* ---------------- 타워 팔레트 ---------------- */
  function renderPalette() {
    const box = $('palette');
    if (!box) return;
    if (!box.childElementCount) {
      TOWER_KEYS.forEach((k, i) => {
        const t = TOWER[k];
        const b = document.createElement('button');
        b.className = 'tw-btn';
        b.id = 'tw-' + k;
        b.style.setProperty('--c', t.color);
        b.innerHTML = `
          <span class="tw-key">${i + 1}</span>
          <span class="tw-ico">${t.icon}</span>
          <span class="tw-body">
            <span class="tw-name">${t.name}</span>
            <span class="tw-prod">${t.product}</span>
            <span class="tw-match">${WORK[t.target].icon} ${WORK[t.target].name} 전용</span>
          </span>
          <span class="tw-cost">${t.cost}</span>`;
        b.onclick = () => selectType(k);
        b.title = t.desc;
        box.appendChild(b);
      });
    }
    TOWER_KEYS.forEach(k => {
      const el = $('tw-' + k);
      if (!el) return;
      el.classList.toggle('on', Game.selectedType === k);
      el.classList.toggle('poor', Game.credits < TOWER[k].cost);
    });
  }

  /* ---------------- 설치된 타워 패널 ---------------- */
  function showTowerPanel(t) {
    const p = $('tower-panel');
    if (!p) return;
    const b = TOWER[t.key];
    const st = towerStats(t);
    const upCost = towerCost(t.key, t.level + 1);
    let spent = b.cost;
    for (let l = 2; l <= t.level; l++) spent += towerCost(t.key, l);
    const sell = Math.round(spent * CONFIG.SELL_RATE);

    p.style.setProperty('--c', b.color);
    p.innerHTML = `
      <div class="tp-head"><span class="tp-ico">${b.icon}</span>
        <span><b>${b.name} Lv.${t.level}</b><i>${b.product}</i></span>
        <button class="tp-x" id="tp-close">✕</button>
      </div>
      <div class="tp-match">${WORK[b.target].icon} <b>${WORK[b.target].name}</b>만 처리합니다</div>
      <div class="tp-stat">
        <span>사거리 <b>${Math.round(st.range)}</b></span>
        <span>공격력 <b>${Math.round(st.dmg * dmgMult())}</b></span>
        <span>속도 <b>${(1000 / st.rate).toFixed(1)}/s</b></span>
      </div>
      <div class="tp-act">
        <button class="btn btn-primary btn-sm" id="tp-up" ${t.level >= CONFIG.MAX_LEVEL ? 'disabled' : ''}>
          ${t.level >= CONFIG.MAX_LEVEL ? '최대 레벨' : `업그레이드 ${upCost}`}
        </button>
        <button class="btn btn-ghost btn-sm" id="tp-sell">판매 +${sell}</button>
      </div>`;
    p.classList.add('show');
    $('tp-close').onclick = () => { Game.selectedTower = null; hideTowerPanel(); };
    $('tp-up').onclick = () => { if (upgradeTower(t)) showTowerPanel(t); };
    $('tp-sell').onclick = () => { sellTower(t); hideTowerPanel(); };
  }

  function hideTowerPanel() {
    const p = $('tower-panel');
    if (p) p.classList.remove('show');
  }

  /* ---------------- 타이틀 ---------------- */
  function showTitle() {
    show('ov-title');
    renderBoard('title-board');
    const n = $('name-input');
    if (n) { try { n.focus({ preventScroll: true }); } catch (e) { n.focus(); } }
  }

  /* ---------------- 프롬프트 상자 퀴즈 ---------------- */
  let quizTimer = null, quizLeft = 0, quizPrevState = null;

  function clearQuizTimer() {
    if (quizTimer) { clearInterval(quizTimer); quizTimer = null; }
  }

  function showQuiz() {
    const { question, reward } = Quiz.start();
    quizPrevState = Game.state;
    Game.state = STATE.QUIZ;

    $('quiz-reward').textContent = `보상 · ${reward.label}`;
    $('quiz-q').textContent = question.q;
    const box = $('quiz-opts');
    box.innerHTML = '';
    question.opts.forEach((o, i) => {
      const b = document.createElement('button');
      b.className = 'quiz-opt';
      b.innerHTML = `<span class="qnum">${i + 1}</span><span class="qtxt">${escapeHtml(o)}</span>`;
      b.onclick = () => answerQuiz(i);
      box.appendChild(b);
    });
    $('quiz-result').className = 'quiz-result';
    $('quiz-result').innerHTML = '';
    $('quiz-next').classList.add('hidden');
    $('quiz-skip').classList.remove('hidden');
    show('ov-quiz');

    quizLeft = CONFIG.QUIZ_MS;
    updateQuizBar();
    clearQuizTimer();
    quizTimer = setInterval(() => {
      quizLeft -= 100;
      updateQuizBar();
      // 시간이 지나면 그냥 닫힌다. 벌칙 없음이 이 장치의 핵심이다.
      if (quizLeft <= 0) { clearQuizTimer(); closeQuiz(); }
    }, 100);
  }

  function updateQuizBar() {
    const f = $('quiz-time-fill');
    if (f) f.style.width = Math.max(0, quizLeft / CONFIG.QUIZ_MS * 100) + '%';
    const n = $('quiz-time-num');
    if (n) n.textContent = Math.max(0, quizLeft / 1000).toFixed(1) + '초';
  }

  function answerQuiz(i) {
    if (Quiz.isAnswered()) return;
    clearQuizTimer();
    const r = Quiz.check(i);
    if (!r) return;
    Sfx.play(r.correct ? 'correct' : 'wrong');
    document.querySelectorAll('.quiz-opt').forEach((el, k) => {
      el.disabled = true;
      if (k === r.answer) el.classList.add('right');
      else if (k === i) el.classList.add('wrong');
    });
    const res = $('quiz-result');
    if (r.correct) {
      Game.stats.chestRight++;
      Game.score += CONFIG.SCORE_QUIZ;
      applyChestReward(r.reward);
      res.className = 'quiz-result show ok';
      res.innerHTML = `<b>정답 — ${escapeHtml(r.reward.label)}</b><p>${escapeHtml(r.why)}</p>`;
    } else {
      res.className = 'quiz-result show no';
      res.innerHTML = `<b>오답 — 잃는 것은 없습니다</b><p>${escapeHtml(r.why)}</p>`;
    }
    $('quiz-skip').classList.add('hidden');
    $('quiz-next').classList.remove('hidden');
    focusSoft('quiz-next');
    updateHUD();
  }

  function closeQuiz() {
    clearQuizTimer();
    hideAll();
    if (Game.state === STATE.QUIZ) Game.state = quizPrevState || STATE.BUILD;
    updateHUD();
  }

  /* ---------------- 결과 화면 ---------------- */
  function fillStats(prefix) {
    const set = (id, v) => { const el = $(id); if (el) el.textContent = v; };
    set(prefix + '-score', Game.score);
    set(prefix + '-acc', Math.round(accuracy()) + '%');
    set(prefix + '-killed', Game.stats.killed);
    set(prefix + '-leaked', Game.stats.leaked);
    const r = Leaderboard.rankOf(Game.playerName);
    set(prefix + '-rank', r ? `${r}위` : '-');
  }

  function showGameOver() {
    $('over-name').textContent = Game.playerName || '도전자';
    $('over-wave').textContent = `웨이브 ${Math.min(Game.waveIndex + 1, WAVE_COUNT)}`;
    fillStats('over');
    show('ov-over');
    focusSoft('retry-btn');
  }

  function showWin() {
    $('win-name').textContent = Game.playerName || '도전자';
    $('win-time').textContent = fmtTime(Game.elapsed);
    $('win-iq').textContent = `오브 ${Game.stats.orbs}개 회수 · 코워크 ${Game.stats.cowork}회`;
    $('win-halluc').textContent = `${Game.stats.hallucinations}회`;
    $('win-chest').textContent = `${Game.stats.chestRight} / ${Game.stats.chestSeen}`;
    fillStats('win');
    renderBoard('win-board', 5);
    show('ov-win');
    focusSoft('win-btn');
  }

  function showPause() {
    $('pause-wave').textContent = `웨이브 ${Math.min(Game.waveIndex + 1, WAVE_COUNT)}`;
    $('pause-score').textContent = Game.score;
    show('ov-pause');
    focusSoft('resume-btn');
  }

  /* ---------------- 배너 ---------------- */
  let bannerTimer = null;
  function banner(text, color) {
    const el = $('banner');
    if (!el) return;
    el.textContent = text;
    el.style.borderColor = color || '#4fc3f7';
    el.style.color = color || '#e9f4ff';
    el.classList.add('show');
    clearTimeout(bannerTimer);
    bannerTimer = setTimeout(() => el.classList.remove('show'), 2400);
  }
  function clearBanner() {
    clearTimeout(bannerTimer);
    const el = $('banner');
    if (el) el.classList.remove('show');
  }

  /* ---------------- 리더보드 ---------------- */
  function renderBoard(id, n = 8) {
    const el = $(id);
    if (!el) return;
    const list = Leaderboard.top(n);
    if (!list.length) {
      el.innerHTML = '<p class="board-empty">아직 기록이 없습니다</p>';
      return;
    }
    el.innerHTML = `
      <table class="board">
        <thead><tr><th>#</th><th>이름</th><th>결과</th><th>정확도</th><th>점수</th></tr></thead>
        <tbody>
        ${list.map((r, i) => `
          <tr class="${r.name === Game.playerName ? 'me' : ''}">
            <td>${i + 1}</td>
            <td>${escapeHtml(r.name)}</td>
            <td>${r.cleared ? `클리어 ${fmtTime(r.ms)}` : `웨이브 ${r.wave}`}</td>
            <td>${r.accuracy != null ? r.accuracy + '%' : '-'}</td>
            <td>${r.score}</td>
          </tr>`).join('')}
        </tbody>
      </table>`;
  }

  return {
    show, hideAll, updateHUD, tickHUD, renderPalette,
    showTowerPanel, hideTowerPanel,
    showTitle, showQuiz, answerQuiz, closeQuiz,
    showGameOver, showWin, showPause,
    banner, clearBanner, renderBoard
  };
})();
