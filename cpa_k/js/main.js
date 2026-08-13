/* =========================================================
   코파일럿 아레나 — 진입점 / 입력 배선
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

  // 마우스로 조준·발사
  const toGame = e => {
    const r = cv.getBoundingClientRect();
    const cx = (e.touches ? e.touches[0].clientX : e.clientX) - r.left;
    const cy = (e.touches ? e.touches[0].clientY : e.clientY) - r.top;
    return { x: cx * (CONFIG.W / r.width), y: cy * (CONFIG.H / r.height) };
  };

  cv.addEventListener('mousemove', e => {
    const p = toGame(e);
    Game.aim.x = p.x; Game.aim.y = p.y;
  });
  cv.addEventListener('mousedown', e => {
    e.preventDefault();
    Sfx.resume();
    const p = toGame(e);
    Game.aim.x = p.x; Game.aim.y = p.y;
    Game.keys['fire'] = true;
  });
  window.addEventListener('mouseup', () => { Game.keys['fire'] = false; });

  cv.addEventListener('touchstart', e => {
    e.preventDefault();
    Sfx.resume();
    const p = toGame(e);
    Game.aim.x = p.x; Game.aim.y = p.y;
    Game.keys['fire'] = true;
  }, { passive: false });
  cv.addEventListener('touchmove', e => {
    e.preventDefault();
    const p = toGame(e);
    Game.aim.x = p.x; Game.aim.y = p.y;
  }, { passive: false });
  const end = e => { if (e) e.preventDefault(); Game.keys['fire'] = false; };
  cv.addEventListener('touchend', end, { passive: false });
  cv.addEventListener('touchcancel', end, { passive: false });
}

function bindKeys() {
  window.addEventListener('keydown', e => {
    if (isTyping(e)) {
      if (e.key === 'Enter' && Game.state === STATE.TITLE) $('start-btn').click();
      return;
    }
    if ([' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) e.preventDefault();

    Sfx.resume();
    Game.keys[e.key] = true;

    if (e.key === 'Escape') {
      if (Game.state === STATE.PLAY) pauseGame();
      else if (Game.state === STATE.PAUSE) resumeGame();
      return;
    }
    if (e.key === 'm' || e.key === 'M' || e.key === 'ㅡ') {
      const muted = Sfx.toggleMute();
      $('mute-btn').textContent = muted ? '소리 OFF' : '소리 ON';
      return;
    }

    // 프롬프트 상자 — 숫자로 답하고, ESC로 그냥 지나칠 수 있다
    if (Game.state === STATE.QUIZ) {
      const n = parseInt(e.key, 10);
      if (n >= 1 && n <= 3) UI.answerQuiz(n - 1);
      return;
    }

    if (Game.state === STATE.PLAY) {
      const n = parseInt(e.key, 10);
      if (n >= 1 && n <= 4) { selectSlot(n); return; }
      if (e.key === ' ') { startCowork(); return; }
      if (e.key === 'q' || e.key === 'Q' || e.key === 'ㅂ') {
        // 이전 도구로
        const i = TOOL_LIST.indexOf(Game.tool);
        selectTool(TOOL_LIST[(i + TOOL_LIST.length - 1) % TOOL_LIST.length]);
      }
      if (e.key === 'e' || e.key === 'E' || e.key === 'ㄷ') {
        const i = TOOL_LIST.indexOf(Game.tool);
        selectTool(TOOL_LIST[(i + 1) % TOOL_LIST.length]);
      }
      return;
    }

    if (e.key === 'Enter') {
      const map = {
        [STATE.TITLE]: 'start-btn', [STATE.WAVE]: 'wave-btn',
        [STATE.OVER]: 'retry-btn', [STATE.WIN]: 'win-btn'
      };
      const id = map[Game.state];
      if (id) { const el = $(id); if (el) el.click(); }
    }
  });

  window.addEventListener('keyup', e => { Game.keys[e.key] = false; });
  window.addEventListener('blur', () => { Game.keys = {}; });
}

function bindButtons() {
  $('start-btn').onclick = () => {
    const name = ($('name-input').value || '').trim() || '도전자';
    Sfx.resume(); Sfx.play('select');
    startGame(name);
  };
  $('wave-btn').onclick = () => {
    Sfx.play('select');
    UI.hideAll();
    startWave(Game.waveIndex + 1);
  };
  $('resume-btn').onclick = () => resumeGame();
  $('pause-quit').onclick = () => { UI.hideAll(); quitToTitle(); };
  $('retry-btn').onclick = () => { Sfx.play('select'); startGame(Game.playerName); };
  $('over-home').onclick = () => { Sfx.play('select'); quitToTitle(); };
  $('win-btn').onclick = () => { Sfx.play('select'); quitToTitle(); };

  $('pause-btn').onclick = () => {
    if (Game.state === STATE.PLAY) pauseGame();
    else if (Game.state === STATE.PAUSE) resumeGame();
  };
  $('mute-btn').onclick = () => {
    Sfx.resume();
    const m = Sfx.toggleMute();
    $('mute-btn').textContent = m ? '소리 OFF' : '소리 ON';
  };
  $('cowork-btn').onclick = () => { Sfx.resume(); startCowork(); };
  $('quiz-skip').onclick = () => UI.skipQuiz();
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

window.addEventListener('DOMContentLoaded', () => {
  buildSprites();
  setupCanvas();
  UI.buildTools();
  bindKeys();
  bindButtons();
  bindPad();
  if (location.protocol === 'file:') $('file-warn').classList.remove('hidden');
  UI.updateHUD();
  UI.showTitle();

  // 타이틀에서도 패드를 받기 위해 미리 돌린다
  (function idle() {
    if (!Game.running) { Pad.poll(); requestAnimationFrame(idle); }
  })();
});
