/* =========================================================
   Copilot World — 진입점 / 입력 배선
   ========================================================= */

const JUMP_KEYS = [' ', 'ArrowUp', 'w', 'W', 'ㅈ'];
const DASH_KEYS = ['Shift', 'j', 'J', 'ㅓ'];
const DRAFT_KEYS = ['k', 'K', 'ㅏ'];

function isTyping(e) {
  const t = e.target;
  return t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA');
}

function setupCanvas() {
  const cv = $('game');
  cv.width = CONFIG.VIEW_COLS * CONFIG.TILE;    // 960
  cv.height = CONFIG.VIEW_ROWS * CONFIG.TILE;   // 544
  Game.canvas = cv;
  Game.ctx = cv.getContext('2d');
  Game.ctx.imageSmoothingEnabled = false;
}

function bindKeys() {
  window.addEventListener('keydown', e => {
    if (isTyping(e)) {
      if (e.key === 'Enter' && Game.state === STATE.TITLE) $('start-btn').click();
      return;
    }

    // 스크롤 방지
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

    if (Game.state === STATE.PLAY) {
      if (JUMP_KEYS.includes(e.key)) {
        if (wantDown() && Game.abilities.draft) requestDraft();
        else { Game.jumpHeld = true; requestJump(); }
      }
      if (DASH_KEYS.includes(e.key)) requestDash();
      if (DRAFT_KEYS.includes(e.key)) requestDraft();
      return;
    }

    if (Game.state === STATE.QUIZ && !Quiz.isAnswered()) {
      const n = parseInt(e.key, 10);
      if (n >= 1 && n <= 4) UI.answerQuiz(n - 1);
      return;
    }

    if (e.key === 'Enter') {
      const map = {
        [STATE.TITLE]: 'start-btn', [STATE.INTRO]: 'intro-btn', [STATE.POWER]: 'power-btn',
        [STATE.CLEAR]: 'clear-btn', [STATE.OVER]: 'retry-btn', [STATE.ENDING]: 'end-btn'
      };
      if (Game.state === STATE.QUIZ && Quiz.isAnswered()) { $('quiz-next').click(); return; }
      const id = map[Game.state];
      if (id) { const el = $(id); if (el) el.click(); }
    }
  });

  window.addEventListener('keyup', e => {
    Game.keys[e.key] = false;
    if (JUMP_KEYS.includes(e.key)) Game.jumpHeld = false;
  });

  window.addEventListener('blur', () => { Game.keys = {}; Game.jumpHeld = false; });
}

/* ---- 터치 조작 ---- */
function bindTouch() {
  const map = {
    'tc-left': 'ArrowLeft', 'tc-right': 'ArrowRight'
  };
  for (const [id, key] of Object.entries(map)) {
    const el = $(id);
    if (!el) continue;
    const on = e => { e.preventDefault(); Sfx.resume(); Game.keys[key] = true; };
    const off = e => { e.preventDefault(); Game.keys[key] = false; };
    el.addEventListener('touchstart', on, { passive: false });
    el.addEventListener('touchend', off, { passive: false });
    el.addEventListener('touchcancel', off, { passive: false });
    el.addEventListener('mousedown', on);
    el.addEventListener('mouseup', off);
    el.addEventListener('mouseleave', off);
  }
  const tap = (id, fn) => {
    const el = $(id);
    if (!el) return;
    const h = e => { e.preventDefault(); Sfx.resume(); fn(); };
    el.addEventListener('touchstart', h, { passive: false });
    el.addEventListener('click', h);
  };
  tap('tc-dash', requestDash);
  tap('tc-draft', requestDraft);

  // 점프 버튼은 누르고 있는 동안 더 높이 뛴다
  const jb = $('tc-jump');
  if (jb) {
    const down = e => { e.preventDefault(); Sfx.resume(); Game.jumpHeld = true; requestJump(); };
    const up = () => { Game.jumpHeld = false; };
    jb.addEventListener('touchstart', down, { passive: false });
    jb.addEventListener('touchend', up);
    jb.addEventListener('touchcancel', up);
    jb.addEventListener('mousedown', down);
    jb.addEventListener('mouseup', up);
    jb.addEventListener('mouseleave', up);
  }
}

function bindButtons() {
  $('start-btn').onclick = () => {
    const name = ($('name-input').value || '').trim() || '도전자';
    Sfx.resume(); Sfx.play('select');
    UI.hideAll();
    startGame(name);
  };

  $('intro-btn').onclick = () => { Sfx.play('select'); UI.hideAll(); beginPlay(); };
  $('power-btn').onclick = () => { Sfx.play('select'); UI.hideAll(); beginPlay(); };
  $('quiz-next').onclick = () => { Sfx.play('select'); UI.hideAll(); afterQuiz(); };
  $('clear-btn').onclick = () => { Sfx.play('select'); UI.hideAll(); goNextStage(); };

  $('resume-btn').onclick = () => resumeGame();
  $('pause-quit').onclick = () => quitToTitle();

  $('retry-btn').onclick = () => {
    Sfx.play('select'); UI.hideAll();
    startGame(Game.playerName);
  };
  $('over-home').onclick = () => { Sfx.play('select'); quitToTitle(); };
  $('end-btn').onclick = () => { Sfx.play('select'); quitToTitle(); };

  $('pause-btn').onclick = () => {
    if (Game.state === STATE.PLAY) pauseGame();
    else if (Game.state === STATE.PAUSE) resumeGame();
  };
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
    el.textContent = on ? `게임패드 연결됨 — ${(id || '').slice(0, 28)}` : '게임패드 미연결 — 패드 버튼을 누르면 연결됩니다';
    el.classList.toggle('on', on);
  });
}

function checkFileProtocol() {
  if (location.protocol === 'file:') {
    $('file-warn').classList.remove('hidden');
  }
}

window.addEventListener('DOMContentLoaded', () => {
  buildSprites();
  setupCanvas();
  bindKeys();
  bindTouch();
  bindButtons();
  bindPad();
  checkFileProtocol();
  UI.updateHUD();
  UI.showTitle();

  // 타이틀에서도 패드 입력을 받기 위해 루프를 미리 돌린다
  (function idle() {
    if (!Game.running) { Pad.poll(); requestAnimationFrame(idle); }
  })();
});
