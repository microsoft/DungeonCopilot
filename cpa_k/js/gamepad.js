/* =========================================================
   코파일럿 아레나 — 게임패드

   매핑
     스틱 / D-패드  이동
     A B X Y        도구 1 2 3 4  (퀴즈에서는 보기 선택)
     RT / RB        발사
     LB             코워크
     Start          일시정지
     Back           음소거
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
    Game.keys['fire'] = false;
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

    if (hit(8)) {
      Sfx.resume();
      const m = Sfx.toggleMute();
      const mb = document.getElementById('mute-btn');
      if (mb) mb.textContent = m ? '소리 OFF' : '소리 ON';
    }

    if (Game.state === STATE.PLAY) {
      const ax = gp.axes[0] || 0, ay = gp.axes[1] || 0;
      setVK('left', btn(14) || ax < -DEADZONE);
      setVK('right', btn(15) || ax > DEADZONE);
      setVK('up', btn(12) || ay < -DEADZONE);
      setVK('down', btn(13) || ay > DEADZONE);

      // 오른쪽 스틱으로도 조준할 수 있게 둔다
      const rx = gp.axes[2] || 0, ry = gp.axes[3] || 0;
      if (Math.abs(rx) > DEADZONE || Math.abs(ry) > DEADZONE) {
        Game.aim.x = Game.player.x + rx * 200;
        Game.aim.y = Game.player.y + ry * 200;
        Game.keys['fire'] = true;
      } else {
        Game.keys['fire'] = btn(7) || btn(5);
      }

      for (let i = 0; i < 4; i++) if (hit(i)) selectSlot(i + 1);
      if (hit(4)) startCowork();
      if (hit(9)) { pauseGame(); prev = gp.buttons.map(b => b.pressed); return; }
    } else {
      clearVK();
    }

    switch (Game.state) {
      case STATE.TITLE:
        if (hit(0) || hit(9)) click('start-btn');
        break;
      case STATE.QUIZ:
        if (UI.quizOpen()) {
          for (let i = 0; i < 3; i++) if (hit(i)) { UI.answerQuiz(i); break; }
          if (hit(1)) UI.skipQuiz();
        }
        break;
      case STATE.WAVE:
        if (hit(0) || hit(9)) click('wave-btn');
        break;
      case STATE.PAUSE:
        if (hit(0) || hit(9)) resumeGame();
        else if (hit(1)) click('pause-quit');
        break;
      case STATE.OVER:
        if (hit(0) || hit(9)) click('retry-btn');
        else if (hit(1)) click('over-home');
        break;
      case STATE.WIN:
        if (hit(0) || hit(9)) click('win-btn');
        break;
    }

    prev = gp.buttons.map(b => b.pressed);
  }

  function isConnected() { return connected; }

  return { init, poll, isConnected };
})();
