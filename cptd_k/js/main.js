/* =========================================================
   코파일럿 타워디펜스 — 진입점 / 입력 배선
   ========================================================= */

function isTyping(e) {
  const t = e.target;
  return t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA');
}

function setupCanvas() {
  const cv = $('game');
  cv.width = CONFIG.W;
  cv.height = CONFIG.H;
  Game.canvas = cv;
  Game.ctx = cv.getContext('2d');
  Game.ctx.imageSmoothingEnabled = false;
}

/** 화면 좌표 → 캔버스 논리 좌표 (CSS로 늘어난 만큼 되돌린다) */
function toCanvas(clientX, clientY) {
  const r = Game.canvas.getBoundingClientRect();
  return {
    x: (clientX - r.left) * (CONFIG.W / r.width),
    y: (clientY - r.top) * (CONFIG.H / r.height)
  };
}

function bindCanvas() {
  const cv = $('game');

  cv.addEventListener('click', e => {
    Sfx.resume();
    Game.padMode = false;
    const p = toCanvas(e.clientX, e.clientY);
    canvasTap(p.x, p.y);
  });

  cv.addEventListener('touchstart', e => {
    if (!e.touches.length) return;
    e.preventDefault();
    Sfx.resume();
    Game.padMode = false;
    const t = e.touches[0];
    const p = toCanvas(t.clientX, t.clientY);
    canvasTap(p.x, p.y);
  }, { passive: false });

  cv.addEventListener('mousemove', e => {
    const p = toCanvas(e.clientX, e.clientY);
    Game.mouse = p;
  });
}

function bindKeys() {
  window.addEventListener('keydown', e => {
    if (isTyping(e)) {
      if (e.key === 'Enter' && Game.state === STATE.TITLE) $('start-btn').click();
      return;
    }
    if ([' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) e.preventDefault();
    Sfx.resume();

    if (e.key === 'Escape') {
      if (Game.state === STATE.BUILD || Game.state === STATE.WAVE) pauseGame();
      else if (Game.state === STATE.PAUSE) resumeGame();
      else if (Game.state === STATE.QUIZ) UI.closeQuiz();
      return;
    }
    if (e.key === 'm' || e.key === 'M' || e.key === 'ㅡ') {
      const muted = Sfx.toggleMute();
      $('mute-btn').textContent = muted ? '소리 OFF' : '소리 ON';
      return;
    }

    if (Game.state === STATE.QUIZ) {
      if (!Quiz.isAnswered()) {
        const n = parseInt(e.key, 10);
        const q = Quiz.get();
        if (q && n >= 1 && n <= q.opts.length) UI.answerQuiz(n - 1);
      } else if (e.key === 'Enter') {
        $('quiz-next').click();
      }
      return;
    }

    if (Game.state === STATE.BUILD || Game.state === STATE.WAVE) {
      const n = parseInt(e.key, 10);
      if (n >= 1 && n <= TOWER_KEYS.length) { selectType(TOWER_KEYS[n - 1]); return; }
      if (e.key === ' ') { if (Game.state === STATE.BUILD) startNextWave(); return; }
      if (e.key === 'c' || e.key === 'C' || e.key === 'ㅊ') { triggerCowork(); return; }
      if (e.key === 'x' || e.key === 'X' || e.key === 'ㅌ') { collectNearestOrb(); return; }
      if (e.key === 'f' || e.key === 'F' || e.key === 'ㄹ') { cycleSpeed(); return; }
      return;
    }

    if (e.key === 'Enter') {
      const map = {
        [STATE.TITLE]: 'start-btn', [STATE.OVER]: 'retry-btn', [STATE.WIN]: 'win-btn'
      };
      const id = map[Game.state];
      if (id) { const el = $(id); if (el) el.click(); }
    }
  });
}

function cycleSpeed() {
  const order = [1, 2, 3];
  const i = order.indexOf(Game.speed);
  setSpeed(order[(i + 1) % order.length]);
}

function bindButtons() {
  $('start-btn').onclick = () => {
    const name = ($('name-input').value || '').trim() || '도전자';
    Sfx.resume(); Sfx.play('select');
    UI.hideAll();
    startGame(name);
  };

  $('next-wave-btn').onclick = () => { Sfx.resume(); startNextWave(); };
  $('cowork-btn').onclick = () => { Sfx.resume(); triggerCowork(); };
  $('speed-btn').onclick = () => cycleSpeed();

  $('quiz-next').onclick = () => { Sfx.play('select'); UI.closeQuiz(); };
  $('quiz-skip').onclick = () => { Sfx.play('select'); UI.closeQuiz(); };

  $('pause-btn').onclick = () => {
    if (Game.state === STATE.BUILD || Game.state === STATE.WAVE) pauseGame();
    else if (Game.state === STATE.PAUSE) resumeGame();
  };
  $('resume-btn').onclick = () => resumeGame();
  $('pause-quit').onclick = () => quitToTitle();

  $('retry-btn').onclick = () => { Sfx.play('select'); UI.hideAll(); startGame(Game.playerName); };
  $('over-home').onclick = () => { Sfx.play('select'); quitToTitle(); };
  $('win-btn').onclick = () => { Sfx.play('select'); quitToTitle(); };

  $('mute-btn').onclick = () => {
    Sfx.resume();
    const m = Sfx.toggleMute();
    $('mute-btn').textContent = m ? '소리 OFF' : '소리 ON';
  };

  $('board-clear').onclick = () => {
    if (confirm('리더보드 기록을 모두 지울까요?')) {
      Leaderboard.clear();
      UI.renderBoard('title-board');
    }
  };
}

function bindPad() {
  Pad.init((on, id) => {
    const el = $('pad-status');
    if (!el) return;
    el.textContent = on
      ? `게임패드 연결됨 — ${(id || '').slice(0, 28)}`
      : '게임패드 미연결 — 패드 버튼을 누르면 연결됩니다';
    el.classList.toggle('on', on);
  });
}

function checkFileProtocol() {
  if (location.protocol === 'file:') $('file-warn').classList.remove('hidden');
}

window.addEventListener('DOMContentLoaded', () => {
  buildSprites();
  setupCanvas();
  buildPath();
  buildSpots();
  bindCanvas();
  bindKeys();
  bindButtons();
  bindPad();
  checkFileProtocol();
  UI.updateHUD();
  UI.showTitle();
  render();

  // 타이틀에서도 패드 입력을 받아야 해서 루프를 미리 돌린다
  (function idle() {
    if (!Game.running) { Pad.poll(); requestAnimationFrame(idle); }
  })();
});
