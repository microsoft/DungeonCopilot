/* =========================================================
   Copilot World — 게임패드 (Gamepad API)

   매핑
     왼쪽 스틱 / D-패드 → 이동
     A(0)               → 점프 · 확인
     B(1)               → 초안 발판
     X(2)               → 분석 대시
     Start(9)           → 일시정지
     Back(8)            → 음소거
     퀴즈 화면에서 A·B·Y·X → 보기 1~4
   ========================================================= */

const Pad = (() => {
  const DEADZONE = 0.35;
  let connected = false;
  let prev = [];
  let onStatus = null;

  const VKEY = { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight' };
  const held = { up: false, down: false, left: false, right: false };

  function init(cb) {
    onStatus = cb;
    window.addEventListener('gamepadconnected', e => {
      connected = true;
      if (onStatus) onStatus(true, e.gamepad.id);
    });
    window.addEventListener('gamepaddisconnected', () => {
      connected = pads().length > 0;
      clearVK();
      if (onStatus) onStatus(connected, null);
    });
  }

  function pads() {
    const raw = navigator.getGamepads ? navigator.getGamepads() : [];
    return Array.from(raw).filter(p => p && p.connected);
  }

  function clearVK() {
    Object.keys(held).forEach(k => {
      if (held[k]) { Game.keys[VKEY[k]] = false; held[k] = false; }
    });
  }

  function setVK(name, on) {
    if (held[name] === on) return;
    held[name] = on;
    Game.keys[VKEY[name]] = on;
  }

  function click(id) { const el = document.getElementById(id); if (el) el.click(); }

  function poll() {
    const list = pads();
    if (!list.length) {
      if (connected) { connected = false; clearVK(); if (onStatus) onStatus(false, null); }
      return;
    }
    if (!connected) { connected = true; if (onStatus) onStatus(true, list[0].id); }

    const gp = list[0];
    const btn = i => !!(gp.buttons[i] && gp.buttons[i].pressed);
    const hit = i => btn(i) && !prev[i];

    const ax = gp.axes[0] || 0, ay = gp.axes[1] || 0;
    const L = btn(14) || ax < -DEADZONE;
    const R = btn(15) || ax > DEADZONE;
    const U = btn(12) || ay < -DEADZONE;
    const D = btn(13) || ay > DEADZONE;

    if (Game.state === STATE.PLAY) {
      setVK('left', L); setVK('right', R); setVK('up', U); setVK('down', D);
      if (L || R || U || D) Sfx.resume();
      Game.jumpHeld = btn(0);
      if (hit(0)) { Sfx.resume(); requestJump(); }
      if (hit(1)) requestDraft();
      if (hit(2)) requestDash();
      if (hit(9)) { pauseGame(); prev = gp.buttons.map(b => b.pressed); return; }
    } else {
      clearVK();
      Game.jumpHeld = false;
    }

    if (hit(8)) {
      Sfx.resume();
      const m = Sfx.toggleMute();
      const mb = document.getElementById('mute-btn');
      if (mb) mb.textContent = m ? '소리 OFF' : '소리 ON';
    }

    switch (Game.state) {
      case STATE.TITLE:
        if (hit(0) || hit(9)) click('start-btn');
        break;
      case STATE.INTRO:
        if (hit(0) || hit(9)) click('intro-btn');
        break;
      case STATE.POWER:
        if (hit(0) || hit(9)) click('power-btn');
        break;
      case STATE.QUIZ:
        if (!Quiz.isAnswered()) {
          for (let i = 0; i < 4; i++) {
            if (hit(i)) { Sfx.resume(); UI.answerQuiz(i); break; }
          }
        } else if (hit(0) || hit(9)) click('quiz-next');
        break;
      case STATE.CLEAR:
        if (hit(0) || hit(9)) click('clear-btn');
        break;
      case STATE.PAUSE:
        if (hit(0) || hit(9)) resumeGame();
        else if (hit(1)) click('pause-quit');
        break;
      case STATE.OVER:
        if (hit(0) || hit(9)) click('retry-btn');
        else if (hit(1)) click('over-home');
        break;
      case STATE.ENDING:
        if (hit(0) || hit(9)) click('end-btn');
        break;
    }

    prev = gp.buttons.map(b => b.pressed);
  }

  function isConnected() { return connected; }

  return { init, poll, isConnected };
})();
