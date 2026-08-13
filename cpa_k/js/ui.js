/* =========================================================
   코파일럿 아레나 — 화면 제어
   ========================================================= */

const $ = id => document.getElementById(id);

const UI = (() => {

  function show(id) {
    document.querySelectorAll('.overlay').forEach(el => el.classList.remove('active'));
    if (id) $(id).classList.add('active');
  }
  function hideAll() { show(null); }

  /* ---------------- 도구 버튼 ---------------- */
  function buildTools() {
    const bar = $('toolbar');
    bar.innerHTML = '';
    TOOL_LIST.forEach((k, i) => {
      const t = TOOLS[k];
      const el = document.createElement('button');
      el.className = 'tool';
      el.dataset.tool = k;
      el.style.setProperty('--c', t.color);
      el.innerHTML = `
        <span class="tool-slot">${i + 1}</span>
        <span class="tool-ico">${t.icon}</span>
        <span class="tool-body">
          <b class="tool-name">${t.name}</b>
          <span class="tool-prod">${t.product}</span>
          <span class="tool-hint">${t.hint}</span>
        </span>`;
      el.onclick = () => { Sfx.resume(); selectTool(k); };
      bar.appendChild(el);
    });
    updateTools();
  }

  function updateTools() {
    document.querySelectorAll('.tool').forEach(el => {
      el.classList.toggle('on', el.dataset.tool === Game.tool);
    });
  }

  /* ---------------- HUD ---------------- */
  function updateHUD() {
    const hp = $('hud-hp');
    if (hp) {
      hp.innerHTML = '';
      for (let i = 0; i < CONFIG.MAX_HP; i++) {
        const s = document.createElement('span');
        s.className = 'heart' + (i < Game.hp ? '' : ' empty');
        s.textContent = i < Game.hp ? '♥' : '♡';
        hp.appendChild(s);
      }
    }
    const w = $('hud-wave');
    if (w) w.textContent = `WAVE ${Game.waveIndex + 1}/${WAVES.length}`;
    const sc = $('hud-score');
    if (sc) sc.textContent = String(Game.score).padStart(6, '0');
    const cb = $('hud-combo');
    if (cb) {
      cb.textContent = Game.combo >= 2 ? `연속 ${Game.combo}` : '';
      cb.classList.toggle('on', Game.combo >= 2);
    }
    updateMeters();
  }

  function updateMeters() {
    const r = workIQRatio();
    const fill = $('iq-fill');
    if (fill) {
      fill.style.width = (r * 100) + '%';
      fill.classList.toggle('full', Game.workIQ >= CONFIG.WORKIQ_MAX);
      fill.classList.toggle('empty', Game.workIQ <= 0);
    }
    const val = $('iq-val');
    if (val) val.textContent = Math.round(Game.workIQ);

    const cw = $('cowork-btn');
    if (cw) {
      const ready = canCowork();
      cw.classList.toggle('ready', ready);
      cw.classList.toggle('active', Game.cowork > 0);
      cw.textContent = Game.cowork > 0
        ? `코워크 ${(Game.cowork / 1000).toFixed(1)}s`
        : (ready ? '코워크 발동 (Space)' : '코워크 — 맥락 100 필요');
    }
    const dmg = $('iq-dmg');
    if (dmg) dmg.textContent = '×' + shotDamage();
  }

  /* ---------------- 타이틀 ---------------- */
  function showTitle() {
    show('ov-title');
    renderBoard('title-board');
    const n = $('name-input');
    if (n) n.focus();
  }

  /* ---------------- 웨이브 클리어 ---------------- */
  function showWaveClear() {
    const next = WAVES[Game.waveIndex + 1];
    $('wave-num').textContent = `WAVE ${Game.waveIndex + 1} 처리 완료`;
    $('wave-score').textContent = Game.score;
    $('wave-combo').textContent = Game.bestCombo;
    $('wave-acc').textContent = Math.round(accuracy()) + '%';
    $('wave-next').textContent = next
      ? (next.boss ? '다음 — 분기 마감 (보스)' : `다음 — WAVE ${next.n}`)
      : '';
    show('ov-wave');
    $('wave-btn').focus();
  }

  /* ---------------- 프롬프트 상자 ---------------- */
  let quizTimer = null, quizDeadline = 0, quizCur = null;

  function showQuiz(q) {
    quizCur = q;
    $('quiz-q').textContent = q.q;
    const box = $('quiz-opts');
    box.innerHTML = '';
    q.opts.forEach((o, i) => {
      const b = document.createElement('button');
      b.className = 'quiz-opt';
      b.innerHTML = `<span class="qnum">${i + 1}</span><span>${o}</span>`;
      b.onclick = () => answerQuiz(i);
      box.appendChild(b);
    });
    $('quiz-why').classList.remove('show');
    $('quiz-why').innerHTML = '';
    show('ov-quiz');

    quizDeadline = performance.now() + CONFIG.QUIZ_MS;
    clearInterval(quizTimer);
    quizTimer = setInterval(() => {
      const left = Math.max(0, quizDeadline - performance.now());
      const bar = $('quiz-bar');
      if (bar) bar.style.width = (left / CONFIG.QUIZ_MS * 100) + '%';
      if (left <= 0) { clearInterval(quizTimer); finishQuiz(false, true); }
    }, 50);
  }

  function answerQuiz(i) {
    if (!quizCur) return;
    clearInterval(quizTimer);
    const correct = i === quizCur.a;
    document.querySelectorAll('.quiz-opt').forEach((el, k) => {
      el.disabled = true;
      if (k === quizCur.a) el.classList.add('right');
      else if (k === i) el.classList.add('wrong');
    });
    const why = $('quiz-why');
    why.className = 'quiz-why show ' + (correct ? 'ok' : 'no');
    why.innerHTML = `<b>${correct ? '정답' : '아쉽네요'}</b><p>${quizCur.why}</p>`;
    setTimeout(() => finishQuiz(correct, false), correct ? 1500 : 2400);
  }

  /** 시간이 지나거나 틀려도 벌칙은 없다. 상자만 사라진다 */
  function finishQuiz(correct, timedOut) {
    clearInterval(quizTimer);
    const q = quizCur;
    quizCur = null;
    if (timedOut && q) {
      const why = $('quiz-why');
      why.className = 'quiz-why show no';
      why.innerHTML = `<b>시간 초과</b><p>${q.why}</p>`;
      setTimeout(() => resolveQuiz(false), 1600);
      return;
    }
    resolveQuiz(correct);
  }

  function skipQuiz() {
    if (!quizCur) return;
    clearInterval(quizTimer);
    quizCur = null;
    resolveQuiz(false);
  }

  function quizOpen() { return !!quizCur; }

  /* ---------------- 일시정지 ---------------- */
  function showPause() {
    $('pause-wave').textContent = Game.waveIndex + 1;
    $('pause-score').textContent = Game.score;
    show('ov-pause');
    $('resume-btn').focus();
  }

  /* ---------------- 결과 ---------------- */
  function showOver() {
    $('over-name').textContent = Game.playerName || '도전자';
    $('over-wave').textContent = Game.waveIndex + 1;
    $('over-score').textContent = Game.score;
    $('over-acc').textContent = Math.round(accuracy()) + '%';
    const r = Leaderboard.rankOf(Game.playerName);
    $('over-rank').textContent = r ? r + '위' : '-';
    show('ov-over');
    $('retry-btn').focus();
  }

  function showWin() {
    $('win-name').textContent = Game.playerName || '도전자';
    $('win-score').textContent = Game.score;
    $('win-combo').textContent = Game.bestCombo;
    $('win-acc').textContent = Math.round(accuracy()) + '%';
    const r = Leaderboard.rankOf(Game.playerName);
    $('win-rank').textContent = r ? r + '위' : '-';
    renderBoard('win-board');
    show('ov-win');
    $('win-btn').focus();
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
    bannerTimer = setTimeout(() => el.classList.remove('show'), 2200);
  }

  /* ---------------- 리더보드 ---------------- */
  function renderBoard(id) {
    const el = $(id);
    if (!el) return;
    const list = Leaderboard.top(8);
    if (!list.length) { el.innerHTML = '<p class="board-empty">아직 기록이 없습니다</p>'; return; }
    el.innerHTML = `
      <table class="board">
        <thead><tr><th>#</th><th>이름</th><th>기록</th><th>점수</th></tr></thead>
        <tbody>
        ${list.map((r, i) => `
          <tr class="${r.name === Game.playerName ? 'me' : ''}">
            <td>${i + 1}</td>
            <td>${esc(r.name)}</td>
            <td>${r.cleared ? '전부 처리' : 'W' + r.wave}</td>
            <td>${r.score}</td>
          </tr>`).join('')}
        </tbody>
      </table>`;
  }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, c =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  return {
    show, hideAll, buildTools, updateTools, updateHUD, updateMeters,
    showTitle, showWaveClear, showQuiz, answerQuiz, skipQuiz, quizOpen,
    showPause, showOver, showWin, banner, renderBoard
  };
})();
