/* =========================================================
   던전앤코파일럿 8 — 부트스트랩 & 입력 처리
   ========================================================= */

(function () {
  const $ = id => document.getElementById(id);

  /* ---------------- 입력 매핑 ----------------
     키보드와 게임패드를 동시에 받는다.
     보기 라벨은 패드 연결 여부에 따라 자동으로 바뀐다. */
  const KEY_MOVE = {
    ArrowUp: 'ArrowUp', ArrowDown: 'ArrowDown',
    ArrowLeft: 'ArrowLeft', ArrowRight: 'ArrowRight',
    KeyW: 'ArrowUp', KeyS: 'ArrowDown', KeyA: 'ArrowLeft', KeyD: 'ArrowRight',
    Numpad8: 'ArrowUp', Numpad2: 'ArrowDown', Numpad4: 'ArrowLeft', Numpad6: 'ArrowRight'
  };
  const KEY_ANSWER = {
    Digit1: 0, Digit2: 1, Digit3: 2, Digit4: 3,
    Numpad1: 0, Numpad2: 1, Numpad3: 2, Numpad4: 3
  };
  const KEY_CONFIRM = ['Enter', 'NumpadEnter', 'Space'];
  const KEY_PAUSE = ['Escape'];
  const KEY_QUIT = ['KeyQ'];

  /* Gamepad API 인덱스는 0,1,2,3 = A,B,X,Y 지만
     8BitDo/닌텐도 배열은 2번이 Y, 3번이 X 각인이라 라벨을 뒤집는다. */
  const PAD_LABELS = ['A', 'B', 'Y', 'X'];
  const KB_LABELS = ['1', '2', '3', '4'];

  function init() {
    buildSprites();

    Game.canvas = $('game-canvas');
    Game.ctx = Game.canvas.getContext('2d');
    Game.canvas.width = CONFIG.GRID * CONFIG.TILE;
    Game.canvas.height = CONFIG.GRID * CONFIG.TILE;

    buildGameModeSelect();
    buildDifficultySelect();
    buildModeSelect();
    bindEvents();
    initGamepad();
    UI.showTitle();

    // 저장된 이름 복원
    const last = localStorage.getItem('dnc8_lastname');
    if (last) $('name-input').value = last;
    $('name-input').focus();
  }

  /* ---------------- 게임패드 ---------------- */
  let padWasConnected = false;

  function updatePadUI(connected) {
    setOptionLabels(connected ? PAD_LABELS : KB_LABELS);
    const el = $('pad-status');
    if (el) {
      el.classList.toggle('on', connected);
      el.innerHTML = `<i class="pad-dot"></i>${connected
        ? `게임패드 연결됨 — 보기를 ${PAD_LABELS.join('·')}로 선택합니다`
        : '게임패드 미연결 — 패드 버튼을 누르면 연결됩니다'}`;
    }
    // 전투창이 이미 열려 있으면 라벨을 즉시 다시 그린다
    UI.refreshOptionLabels();
  }

  function initGamepad() {
    Pad.init((connected) => {
      padWasConnected = connected;
      updatePadUI(connected);
      if (connected) UI.toast('게임패드가 연결되었습니다');
    });

    // file:// 로 열면 게임패드·이미지가 제한될 수 있음을 알린다
    if (location.protocol === 'file:') {
      const warn = $('file-warn');
      if (warn) warn.classList.add('show');
    }

    // 게임 루프가 돌지 않는 화면(타이틀·게임오버)에서도 패드를 받도록 상시 폴링
    (function padTick() {
      if (!Game.running) Pad.poll();
      // 브라우저는 첫 버튼 입력 뒤에야 패드를 노출하므로 상태 변화를 계속 감시한다
      const now = Pad.isConnected();
      if (now !== padWasConnected) {
        padWasConnected = now;
        updatePadUI(now);
      }
      requestAnimationFrame(padTick);
    })();
  }

  /* ---------------- 게임 방식 / 난이도 선택 ---------------- */
  function buildGameModeSelect() {
    const wrap = $('gamemode-select');
    if (!wrap) return;
    const ITEMS = [
      { key: GAME_MODE.DUNGEON, label: '던전 모드', desc: '탐험하며 여러 문제에 도전' },
      { key: GAME_MODE.EXPLORE, label: '탐험 모드', desc: '한 사람 한 문제, 바로 결과' }
    ];
    wrap.innerHTML = '';
    ITEMS.forEach(it => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'mode-chip' + (it.key === Game.gameMode ? ' active' : '');
      b.innerHTML = `${it.label}<small>${it.desc}</small>`;
      b.onclick = () => {
        Game.gameMode = it.key;
        Audio8.resume(); Audio8.play('select');
        wrap.querySelectorAll('.mode-chip').forEach(c => c.classList.remove('active'));
        b.classList.add('active');
        applyGameModeUI();
      };
      wrap.appendChild(b);
    });
    applyGameModeUI();
  }

  function applyGameModeUI() {
    const explore = Game.gameMode === GAME_MODE.EXPLORE;
    $('name-field').hidden = explore;                 // 탐험 모드는 이름을 받지 않는다
    $('title-lb-box').hidden = explore;               // 기록을 남기지 않으므로 리더보드도 숨김
    $('rules-dungeon').hidden = explore;
    $('rules-explore').hidden = !explore;
    document.querySelector('.title-wrap')?.classList.toggle('no-lb', explore);
    $('start-btn').textContent = explore ? '도전 시작' : '던전 입장';
    $('start-hint').innerHTML = explore
      ? '슬롯이 난이도를 정하고 문제가 하나 나옵니다.<br>결과를 본 뒤 바로 다음 사람이 도전합니다.'
      : '몬스터에 부딪히면 퀴즈가 시작됩니다.<br>10점을 모으면 포털이 열립니다.';
  }

  function buildDifficultySelect() {
    const wrap = $('difficulty-select');
    if (!wrap) return;
    const ITEMS = [
      { key: DIFFICULTY.NORMAL, label: '일반', desc: '하·중·상 모두 출제' },
      { key: DIFFICULTY.HELL, label: '헬', desc: '상급 문제만 출제' }
    ];
    wrap.innerHTML = '';
    ITEMS.forEach(it => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'mode-chip' + (it.key === Game.difficulty ? ' active' : '') +
        (it.key === DIFFICULTY.HELL ? ' hell' : '');
      b.innerHTML = `${it.label}<small>${it.desc}</small>`;
      b.onclick = () => {
        Game.difficulty = it.key;
        Audio8.resume();
        Audio8.play(it.key === DIFFICULTY.HELL ? 'encounter' : 'select');
        wrap.querySelectorAll('.mode-chip').forEach(c => c.classList.remove('active'));
        b.classList.add('active');
      };
      wrap.appendChild(b);
    });
  }

  /* ---------------- 모드 선택 UI ---------------- */
  function buildModeSelect() {
    const wrap = $('mode-select');
    wrap.innerHTML = '';
    Object.entries(QUIZ_MODES).forEach(([key, mode]) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'mode-chip' + (key === Game.mode ? ' active' : '');
      b.dataset.mode = key;
      b.innerHTML = `${mode.label}<small>${mode.desc || ''}</small>`;
      b.onclick = () => {
        Game.mode = key;
        Audio8.resume();
        Audio8.play('select');
        wrap.querySelectorAll('.mode-chip').forEach(c => c.classList.remove('active'));
        b.classList.add('active');
      };
      wrap.appendChild(b);
    });
  }

  /* ---------------- 게임 시작 ---------------- */
  function tryStart() {
    Audio8.resume();

    // 탐험 모드는 이름 없이 바로 시작
    if (Game.gameMode === GAME_MODE.EXPLORE) {
      Audio8.play('select');
      startSolo();
      return;
    }

    const input = $('name-input');
    let name = input.value.trim();

    // 게임패드로 시작했는데 이름이 비어 있으면 기본 이름 부여
    if (!name && Pad.isConnected()) {
      name = `도전자${Math.floor(Math.random() * 900 + 100)}`;
      input.value = name;
    }
    if (!name) {
      input.focus();
      input.style.borderColor = 'var(--torch)';
      setTimeout(() => { input.style.borderColor = ''; }, 900);
      return;
    }
    localStorage.setItem('dnc8_lastname', name);
    Audio8.play('stageUp');
    UI.showScreen('screen-play');
    startGame(name, Game.mode);
  }

  /* ---------------- 이벤트 바인딩 ---------------- */
  function bindEvents() {
    $('start-btn').onclick = tryStart;
    $('name-input').addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); tryStart(); }
    });

    $('reset-lb').onclick = () => {
      if (confirm('리더보드 기록을 모두 삭제할까요?')) {
        Leaderboard.clear();
        UI.renderLeaderboard('title-leaderboard');
        Audio8.resume(); Audio8.play('wrong');
      }
    };

    $('stage-continue').onclick = () => {
      Audio8.play('select');
      UI.showScreen('screen-play');
      beginStage();
    };

    /* ---- 탐험 모드 ---- */
    $('solo-next').onclick = () => { Audio8.play('select'); nextChallenger(); };
    $('solo-exit').onclick = () => { Audio8.play('select'); exitSolo(); };

    $('retry-btn').onclick = () => {
      Audio8.play('select');
      UI.showScreen('screen-play');
      startGame(Game.playerName, Game.mode);
    };

    $('home-btn').onclick = () => {
      Audio8.play('select');
      Audio8.stopBGM();
      Game.state = STATE.TITLE;
      UI.showTitle();
    };

    $('mute-btn').onclick = () => {
      Audio8.resume();
      const m = Audio8.toggleMute();
      $('mute-btn').textContent = m ? '소리 OFF' : '소리 ON';
    };

    /* ---- 일시정지 ---- */
    $('pause-btn').onclick = () => pauseGame();
    $('pause-resume').onclick = () => resumeGame();
    $('pause-quit').onclick = () => quitWithRecord();
    $('pause-abandon').onclick = () => {
      $('abandon-confirm').classList.add('show');
      setTimeout(() => $('abandon-no').focus(), 50);
    };
    $('abandon-no').onclick = () => {
      $('abandon-confirm').classList.remove('show');
      $('pause-resume').focus();
    };
    $('abandon-yes').onclick = () => {
      $('abandon-confirm').classList.remove('show');
      abandonGame();
    };

    /* ---- 키보드 ----
       e.key 대신 e.code(물리 키 위치)를 본다.
       한글 자판 상태나 매핑 프로그램의 대문자 전송과 무관하게 동작한다. */
    window.addEventListener('keydown', e => {
      // 이름 입력 중에는 게임 조작 차단
      if (document.activeElement === $('name-input')) return;

      const code = e.code;
      const isConfirm = KEY_CONFIRM.includes(code) || e.key === 'Enter';
      const isPause = KEY_PAUSE.includes(code) || e.key === 'Escape';

      // 음소거 토글
      if (code === 'KeyM' || e.key === 'm' || e.key === 'M' || e.key === 'ㅁ') {
        Audio8.resume();
        const mu = Audio8.toggleMute();
        $('mute-btn').textContent = mu ? '소리 OFF' : '소리 ON';
        return;
      }

      // 탐험 모드: 문제 풀이
      if (Game.state === STATE.SOLO) {
        const s = Game.solo;
        if (!s || s.answered) return;
        let idx = KEY_ANSWER[code];
        if (idx === undefined && /^[1-4]$/.test(e.key)) idx = parseInt(e.key, 10) - 1;
        if (idx !== undefined) {
          e.preventDefault();
          Audio8.play('select');
          answerSolo(idx);
        }
        return;
      }

      // 탐험 모드: 결과 화면
      if (Game.state === STATE.SOLO_RESULT) {
        if (isConfirm) { e.preventDefault(); nextChallenger(); }
        else if (isPause) { e.preventDefault(); exitSolo(); }
        return;
      }

      // 탐험 모드: 슬롯이 도는 중에는 입력 무시
      if (Game.state === STATE.SLOT) return;

      // 전투 중: 보기 선택 / 계속하기
      if (Game.state === STATE.BATTLE) {
        const b = Game.currentBattle;
        if (!b) return;
        let idx = KEY_ANSWER[code];
        if (idx === undefined && /^[1-4]$/.test(e.key)) idx = parseInt(e.key, 10) - 1;

        if (!b.answered && idx !== undefined) {
          e.preventDefault();
          Audio8.play('select');
          answerBattle(idx);
        } else if (b.answered && isConfirm) {
          e.preventDefault();
          Audio8.play('select');
          closeBattle();
        }
        return;
      }

      // 일시정지 화면
      if (Game.state === STATE.PAUSE) {
        if (isPause || isConfirm) { e.preventDefault(); resumeGame(); }
        else if (KEY_QUIT.includes(code) || e.key === 'q' || e.key === 'Q' || e.key === 'ㅂ') {
          e.preventDefault(); quitWithRecord();
        }
        return;
      }

      // 스테이지 전환 화면
      if (Game.state === STATE.STAGE && isConfirm) {
        e.preventDefault();
        $('stage-continue').click();
        return;
      }

      // 게임 오버 화면
      if (Game.state === STATE.OVER && isConfirm) {
        e.preventDefault();
        $('retry-btn').click();
        return;
      }

      // 플레이 중 이동
      if (Game.state === STATE.PLAY) {
        if (isPause) { e.preventDefault(); pauseGame(); return; }
        const dir = KEY_MOVE[code];
        if (dir || code === 'Space') e.preventDefault();
        if (dir) Game.keys[dir] = true;
        Audio8.resume();
      }
    });

    window.addEventListener('keyup', e => {
      const dir = KEY_MOVE[e.code];
      if (dir) Game.keys[dir] = false;
    });

    // 창 포커스를 잃으면 키 상태 초기화 (키 끌림 방지)
    window.addEventListener('blur', () => { Game.keys = {}; });

    bindCanvasClick();
  }

  /* 캔버스를 클릭/터치하면 그 지점까지 자동으로 걸어간다.
     캔버스는 CSS로 확대되어 있으므로 표시 크기 기준으로 좌표를 환산한다. */
  function bindCanvasClick() {
    const cv = $('game-canvas');
    if (!cv) return;

    const toCanvasXY = (clientX, clientY) => {
      const r = cv.getBoundingClientRect();
      return {
        x: (clientX - r.left) * (cv.width / r.width),
        y: (clientY - r.top) * (cv.height / r.height)
      };
    };

    const go = (clientX, clientY) => {
      if (Game.state !== STATE.PLAY) return;
      const { x, y } = toCanvasXY(clientX, clientY);
      Audio8.resume();
      if (moveTo(x, y)) Audio8.play('select');
    };

    cv.addEventListener('click', e => go(e.clientX, e.clientY));

    // 터치는 클릭보다 먼저 처리해 지연(300ms)과 중복 발생을 막는다
    cv.addEventListener('touchstart', e => {
      const t = e.changedTouches[0];
      if (!t) return;
      e.preventDefault();
      go(t.clientX, t.clientY);
    }, { passive: false });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();