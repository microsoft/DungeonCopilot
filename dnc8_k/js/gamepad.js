/* =========================================================
   던전앤코파일럿 8 — 게임패드 지원 (Gamepad API)
   Xbox / PlayStation / 아케이드 스틱 등 표준 매핑 지원.

   매핑
     왼쪽 스틱 / D-패드 → 이동
     A(0) B(1) X(2) Y(3) → 전투 보기 1~4
     A / Start(9)        → 계속하기 · 다음 스테이지 · 재도전 · 게임 시작
     Back(8)             → 음소거 토글
   ========================================================= */

const Pad = (() => {
  const DEADZONE = 0.35;
  let connected = false;
  let prevButtons = [];
  let onStatusChange = null;

  // 방향 입력을 Game.keys 로 흘려보내기 위한 가상 키
  const VKEY = { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight' };
  let vkeyHeld = { up: false, down: false, left: false, right: false };

  function init(statusCb) {
    onStatusChange = statusCb;
    window.addEventListener('gamepadconnected', e => {
      connected = true;
      if (onStatusChange) onStatusChange(true, e.gamepad.id);
    });
    window.addEventListener('gamepaddisconnected', () => {
      connected = getPads().length > 0;
      clearAllVKeys();
      if (onStatusChange) onStatusChange(connected, null);
    });
  }

  function getPads() {
    const raw = navigator.getGamepads ? navigator.getGamepads() : [];
    return Array.from(raw).filter(p => p && p.connected);
  }

  function clearAllVKeys() {
    Object.keys(vkeyHeld).forEach(k => {
      if (vkeyHeld[k]) { Game.keys[VKEY[k]] = false; vkeyHeld[k] = false; }
    });
  }

  function setVKey(name, pressed) {
    if (vkeyHeld[name] === pressed) return;
    vkeyHeld[name] = pressed;
    Game.keys[VKEY[name]] = pressed;
  }

  /** 매 프레임 호출 — 패드 상태를 읽어 게임 입력으로 변환 */
  function poll() {
    const pads = getPads();
    if (!pads.length) {
      if (connected) { connected = false; clearAllVKeys(); if (onStatusChange) onStatusChange(false, null); }
      return;
    }
    if (!connected) { connected = true; if (onStatusChange) onStatusChange(true, pads[0].id); }

    const gp = pads[0];
    const btn = i => !!(gp.buttons[i] && gp.buttons[i].pressed);
    const pressedNow = i => btn(i) && !prevButtons[i];   // 이번 프레임에 새로 눌림

    /* ---- 이동: 왼쪽 스틱 + D-패드 ---- */
    const ax = gp.axes[0] || 0;
    const ay = gp.axes[1] || 0;
    const dLeft = btn(14) || ax < -DEADZONE;
    const dRight = btn(15) || ax > DEADZONE;
    const dUp = btn(12) || ay < -DEADZONE;
    const dDown = btn(13) || ay > DEADZONE;

    if (Game.state === STATE.PLAY) {
      setVKey('left', dLeft);
      setVKey('right', dRight);
      setVKey('up', dUp);
      setVKey('down', dDown);
      if (dLeft || dRight || dUp || dDown) Audio8.resume();
      // Start → 일시정지
      if (pressedNow(9)) { pauseGame(); prevButtons = gp.buttons.map(x => x.pressed); return; }
    } else {
      clearAllVKeys();
    }

    /* ---- 버튼 액션 ---- */
    // 음소거 (Back/Select)
    if (pressedNow(8)) {
      Audio8.resume();
      const m = Audio8.toggleMute();
      const mb = document.getElementById('mute-btn');
      if (mb) mb.textContent = m ? '소리 OFF' : '소리 ON';
    }

    if (Game.state === STATE.SOLO) {
      const s = Game.solo;
      if (s && !s.answered) {
        for (let i = 0; i < 4; i++) {
          if (pressedNow(i)) {
            Audio8.resume(); Audio8.play('select');
            answerSolo(i);
            break;
          }
        }
      }
    } else if (Game.state === STATE.SOLO_RESULT) {
      if (pressedNow(0) || pressedNow(9)) nextChallenger();
      else if (pressedNow(1)) exitSolo();
    } else if (Game.state === STATE.BATTLE) {
      const b = Game.currentBattle;
      if (b) {
        if (!b.answered) {
          // A/B/X/Y → 보기 1~4
          for (let i = 0; i < 4; i++) {
            if (pressedNow(i)) {
              Audio8.resume(); Audio8.play('select');
              answerBattle(i);
              break;
            }
          }
        } else if (pressedNow(0) || pressedNow(9)) {
          Audio8.play('select');
          closeBattle();
        }
      }
    } else if (Game.state === STATE.PAUSE) {
      // A → 계속하기, B → 기록 남기고 종료
      if (pressedNow(0) || pressedNow(9)) resumeGame();
      else if (pressedNow(1)) quitWithRecord();
    } else if (Game.state === STATE.STAGE) {
      if (pressedNow(0) || pressedNow(9)) {
        const el = document.getElementById('stage-continue');
        if (el) el.click();
      }
    } else if (Game.state === STATE.OVER) {
      if (pressedNow(0) || pressedNow(9)) {
        const el = document.getElementById('retry-btn');
        if (el) el.click();
      } else if (pressedNow(1)) {
        const el = document.getElementById('home-btn');
        if (el) el.click();
      }
    } else if (Game.state === STATE.TITLE) {
      if (pressedNow(0) || pressedNow(9)) {
        const el = document.getElementById('start-btn');
        if (el) el.click();
      }
    }

    // 버튼 상태 저장 (엣지 감지용)
    prevButtons = gp.buttons.map(x => x.pressed);
  }

  function isConnected() { return connected; }

  return { init, poll, isConnected };
})();
