/* =========================================================
   코파일럿 타워디펜스 — 게임패드 (Gamepad API)

   매핑
     D-패드 / 왼쪽 스틱 → 빌드 커서 이동
     A(0)  배치 · 확인
     B(1)  취소
     X(2)  가장 가까운 맥락 오브 회수
     Y(3)  코워크 발동
     LB(4) / RB(5)  타워 종류 바꾸기
     Start(9)  일시정지 · Back(8) 음소거
   ========================================================= */

const Pad = (() => {
  const DEADZONE = 0.45;
  const REPEAT_MS = 180;
  let connected = false;
  let prev = [];
  let axisCool = 0, lastPoll = 0;
  let onStatus = null;

  function init(cb) {
    onStatus = cb;
    window.addEventListener('gamepadconnected', e => {
      connected = true;
      if (onStatus) onStatus(true, e.gamepad.id);
    });
    window.addEventListener('gamepaddisconnected', () => {
      connected = pads().length > 0;
      if (onStatus) onStatus(connected, null);
    });
  }

  function pads() {
    const raw = navigator.getGamepads ? navigator.getGamepads() : [];
    return Array.from(raw).filter(p => p && p.connected);
  }

  function click(id) { const el = document.getElementById(id); if (el && !el.disabled) el.click(); }

  /** 방향으로 가장 그럴듯한 다음 설치 자리를 고른다 (각도 + 거리 가중) */
  function moveCursor(dx, dy) {
    const cur = Game.spots[Game.cursor];
    if (!cur) { Game.cursor = 0; return; }
    let best = -1, bestScore = Infinity;
    Game.spots.forEach((s, i) => {
      if (i === Game.cursor) return;
      const vx = s.x - cur.x, vy = s.y - cur.y;
      const d = Math.hypot(vx, vy);
      if (d < 1) return;
      const dot = (vx * dx + vy * dy) / d;
      if (dot < 0.55) return;
      const score = d / dot;
      if (score < bestScore) { bestScore = score; best = i; }
    });
    if (best >= 0) { Game.cursor = best; Sfx.play('select'); }
  }

  function poll() {
    const now = performance.now();
    const dt = lastPoll ? now - lastPoll : 16;
    lastPoll = now;
    if (axisCool > 0) axisCool -= dt;

    const list = pads();
    if (!list.length) {
      if (connected) { connected = false; if (onStatus) onStatus(false, null); }
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

    if (hit(8)) {
      Sfx.resume();
      const m = Sfx.toggleMute();
      const mb = document.getElementById('mute-btn');
      if (mb) mb.textContent = m ? '소리 OFF' : '소리 ON';
    }

    if (Game.state === STATE.BUILD || Game.state === STATE.WAVE) {
      if ((L || R || U || D) && axisCool <= 0) {
        Game.padMode = true;
        axisCool = REPEAT_MS;
        moveCursor((R ? 1 : 0) - (L ? 1 : 0), (D ? 1 : 0) - (U ? 1 : 0));
      }
      if (hit(0)) {
        Sfx.resume();
        Game.padMode = true;
        const s = Game.spots[Game.cursor];
        if (s && s.tower) { Game.selectedTower = s.tower; UI.showTowerPanel(s.tower); }
        else if (Game.selectedType) placeTower(Game.selectedType, Game.cursor);
        else Sfx.play('deny');
      }
      if (hit(1)) { Game.selectedType = null; Game.selectedTower = null; UI.hideTowerPanel(); UI.renderPalette(); }
      if (hit(2)) collectNearestOrb();
      if (hit(3)) triggerCowork();
      if (hit(4) || hit(5)) {
        const i = TOWER_KEYS.indexOf(Game.selectedType);
        const n = hit(5) ? (i + 1 + TOWER_KEYS.length) % TOWER_KEYS.length
          : (i - 1 + TOWER_KEYS.length) % TOWER_KEYS.length;
        Game.selectedType = TOWER_KEYS[n];
        UI.renderPalette();
        Sfx.play('select');
      }
      if (hit(9)) pauseGame();
      if (hit(6) || hit(7)) { if (Game.state === STATE.BUILD) startNextWave(); }
    } else {
      switch (Game.state) {
        case STATE.TITLE: if (hit(0) || hit(9)) click('start-btn'); break;
        case STATE.QUIZ:
          if (!Quiz.isAnswered()) {
            const q = Quiz.get();
            const n = q ? q.opts.length : 0;
            // 보기 수만큼만 버튼을 받는다. Start는 언제나 '그냥 닫기'
            for (let i = 0; i < Math.min(n, 4); i++) if (hit(i)) { UI.answerQuiz(i); break; }
            if (hit(9)) UI.closeQuiz();
          } else if (hit(0) || hit(9)) click('quiz-next');
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
    }

    prev = gp.buttons.map(b => b.pressed);
  }

  function isConnected() { return connected; }

  return { init, poll, isConnected };
})();
