/* =========================================================
   Copilot World — 화면/오버레이 제어
   ========================================================= */

const $ = id => document.getElementById(id);

const UI = (() => {

  function show(id) {
    document.querySelectorAll('.overlay').forEach(el => el.classList.remove('active'));
    if (id) $(id).classList.add('active');
  }
  function hideAll() { show(null); }

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
    const st = $('hud-stage');
    if (st && Game.level) st.textContent = `1-${Game.level.id}\u00a0${Game.level.name}`;
    const sc = $('hud-score');
    if (sc) sc.textContent = String(Game.score).padStart(5, '0');
    const cn = $('hud-coin');
    if (cn) cn.textContent = Game.coinCount;
    renderAbilityBar();
  }

  function renderAbilityBar() {
    const bar = $('hud-abilities');
    if (!bar) return;
    bar.innerHTML = '';
    for (const k of ['prompt', 'draft', 'analyze', 'ground']) {
      const a = ABILITY[k];
      const el = document.createElement('div');
      el.className = 'ab-chip' + (Game.abilities[k] ? ' on' : '');
      el.style.setProperty('--c', a.color);
      el.innerHTML = `<span class="ab-ico">${a.icon}</span><span class="ab-name">${a.name}</span>`;
      el.title = `${a.product} — ${a.how}`;
      bar.appendChild(el);
    }
  }

  /* ---------------- 타이틀 ---------------- */
  function showTitle() {
    show('ov-title');
    renderBoard('title-board');
    $('name-input').focus();
  }

  /* ---------------- 스테이지 인트로 ---------------- */
  function showStageIntro(lv) {
    $('intro-num').textContent = `STAGE 1-${lv.id}`;
    $('intro-name').textContent = lv.name;
    $('intro-sub').textContent = lv.subtitle;
    const ab = lv.ability ? ABILITY[lv.ability] : null;
    $('intro-goal').innerHTML = ab
      ? `이 스테이지에서 <b style="color:${ab.color}">${ab.icon} ${ab.name}</b> 능력을 얻습니다`
      : `배운 능력을 모두 사용해 <b style="color:#e05a9a">보스</b>를 쓰러뜨리세요`;
    show('ov-intro');
    $('intro-btn').focus();
  }

  /* ---------------- 파워업 ---------------- */
  function showPowerUp(ab) {
    $('power-ico').textContent = ab.icon;
    $('power-ico').style.background = ab.color;
    $('power-name').textContent = ab.name;
    $('power-name').style.color = ab.color;
    $('power-product').textContent = ab.product;
    $('power-desc').textContent = ab.desc;
    $('power-how').textContent = ab.how;
    show('ov-power');
    $('power-btn').focus();
  }

  /* ---------------- 퀴즈 ---------------- */
  let quizState = null;

  function showQuiz(lv) {
    const q = Quiz.start(lv.id).question;
    quizState = q;
    $('quiz-stage').textContent = `1-${lv.id} ${lv.name} 클리어`;
    $('quiz-q').textContent = q.q;
    const box = $('quiz-opts');
    box.innerHTML = '';
    q.opts.forEach((o, i) => {
      const b = document.createElement('button');
      b.className = 'quiz-opt';
      b.innerHTML = `<span class="qnum">${i + 1}</span><span class="qtxt">${o}</span>`;
      b.onclick = () => answerQuiz(i);
      box.appendChild(b);
    });
    $('quiz-result').className = 'quiz-result';
    $('quiz-result').innerHTML = '';
    $('quiz-next').classList.add('hidden');
    show('ov-quiz');
  }

  function answerQuiz(i) {
    if (Quiz.isAnswered()) return;
    const r = Quiz.check(i);
    if (!r) return;
    Sfx.play(r.correct ? 'correct' : 'wrong');
    const opts = document.querySelectorAll('.quiz-opt');
    opts.forEach((el, k) => {
      el.disabled = true;
      if (k === r.answer) el.classList.add('right');
      else if (k === i) el.classList.add('wrong');
    });
    if (r.correct) Game.score += 100;
    const res = $('quiz-result');
    res.className = 'quiz-result show ' + (r.correct ? 'ok' : 'no');
    res.innerHTML = `<b>${r.correct ? '정답 +100' : '오답'}</b><p>${r.why}</p>`;
    $('quiz-next').classList.remove('hidden');
    $('quiz-next').focus();
    updateHUD();
  }

  /* ---------------- 스테이지 클리어 ---------------- */
  function showStageClear(lv, next) {
    $('clear-title').textContent = `1-${lv.id} ${lv.name} 돌파`;
    $('clear-score').textContent = Game.score;
    $('clear-coin').textContent = Game.coinCount;
    $('clear-hp').textContent = `${Game.hp} / ${CONFIG.MAX_HP}`;
    $('clear-next').textContent = `다음 — 1-${next.id} ${next.name}`;
    show('ov-clear');
    $('clear-btn').focus();
  }

  /* ---------------- 엔딩 ---------------- */
  function showEnding() {
    $('end-name').textContent = Game.playerName || '도전자';
    $('end-score').textContent = Game.score;
    $('end-coin').textContent = Game.coinCount;
    $('end-time').textContent = fmtTime(Game.elapsed);
    const r = Leaderboard.rankOf(Game.playerName);
    $('end-rank').textContent = r ? `${r}위` : '-';
    renderBoard('end-board');
    show('ov-ending');
    $('end-btn').focus();
  }

  /* ---------------- 게임 오버 ---------------- */
  function showGameOver() {
    $('over-name').textContent = Game.playerName || '도전자';
    $('over-stage').textContent = `1-${Game.level.id} ${Game.level.name}`;
    $('over-score').textContent = Game.score;
    const r = Leaderboard.rankOf(Game.playerName);
    $('over-rank').textContent = r ? `${r}위` : '-';
    show('ov-over');
    $('retry-btn').focus();
  }

  /* ---------------- 일시정지 ---------------- */
  function showPause() {
    $('pause-stage').textContent = `1-${Game.level.id} ${Game.level.name}`;
    $('pause-score').textContent = Game.score;
    show('ov-pause');
    $('resume-btn').focus();
  }
  function hidePause() { hideAll(); }

  /* ---------------- 배너 / 토스트 ---------------- */
  let bannerTimer = null;
  function banner(text, color) {
    const el = $('banner');
    el.textContent = text;
    el.style.borderColor = color || '#4fc3f7';
    el.style.color = color || '#e9f4ff';
    el.classList.add('show');
    clearTimeout(bannerTimer);
    bannerTimer = setTimeout(() => el.classList.remove('show'), 2600);
  }

  /* ---------------- 리더보드 ---------------- */
  function renderBoard(id) {
    const el = $(id);
    if (!el) return;
    const list = Leaderboard.top(8);
    if (!list.length) {
      el.innerHTML = '<p class="board-empty">아직 기록이 없습니다</p>';
      return;
    }
    el.innerHTML = `
      <table class="board">
        <thead><tr><th>#</th><th>이름</th><th>기록</th><th>점수</th></tr></thead>
        <tbody>
        ${list.map((r, i) => `
          <tr class="${r.name === Game.playerName ? 'me' : ''}">
            <td>${i + 1}</td>
            <td>${escapeHtml(r.name)}</td>
            <td>${r.cleared ? `클리어 ${fmtTime(r.ms)}` : `1-${r.stage}`}</td>
            <td>${r.score}</td>
          </tr>`).join('')}
        </tbody>
      </table>`;
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  return {
    show, hideAll, updateHUD, showTitle, showStageIntro, showPowerUp,
    showQuiz, answerQuiz, showStageClear, showEnding, showGameOver,
    showPause, hidePause, banner, renderBoard
  };
})();
