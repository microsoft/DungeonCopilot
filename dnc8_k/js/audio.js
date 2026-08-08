/* =========================================================
   던전앤코파일럿 8 — 칩튠 사운드 엔진
   Web Audio API로 8비트 사운드를 실시간 합성합니다.
   외부 오디오 파일이 전혀 필요 없습니다.
   ========================================================= */

const Audio8 = (() => {
  let ctx = null;
  let masterGain = null;
  let musicGain = null;
  let sfxGain = null;
  let muted = false;
  let started = false;

  // 현재 재생 중인 BGM 스케줄러
  let bgmTimer = null;
  let bgmStep = 0;
  let currentTrack = null;
  let nextNoteTime = 0;

  const A4 = 440;
  const NOTE = {}; // 'C4' -> Hz
  (() => {
    const names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    for (let oct = 1; oct <= 7; oct++) {
      names.forEach((n, i) => {
        const semis = (oct - 4) * 12 + (i - 9);
        NOTE[n + oct] = A4 * Math.pow(2, semis / 12);
      });
    }
  })();

  function init() {
    if (ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    masterGain = ctx.createGain();
    masterGain.gain.value = muted ? 0 : 0.9;
    masterGain.connect(ctx.destination);

    musicGain = ctx.createGain();
    musicGain.gain.value = 0.30;
    musicGain.connect(masterGain);

    sfxGain = ctx.createGain();
    sfxGain.gain.value = 0.55;
    sfxGain.connect(masterGain);
  }

  function resume() {
    init();
    if (ctx && ctx.state === 'suspended') ctx.resume();
    started = true;
  }

  /* ---------- 기본 톤 재생 ---------- */
  function tone(freq, dur, opts = {}) {
    if (!ctx || muted) return;
    const {
      type = 'square', gain = 0.25, dest = sfxGain,
      attack = 0.005, decay = 0, when = 0, detune = 0, slideTo = null
    } = opts;

    const t = ctx.currentTime + when;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(slideTo, 1), t + dur);
    if (detune) osc.detune.setValueAtTime(detune, t);

    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + attack);
    const sustainEnd = t + dur - (decay || dur * 0.4);
    g.gain.setValueAtTime(gain, Math.max(sustainEnd, t + attack + 0.001));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);

    osc.connect(g); g.connect(dest);
    osc.start(t); osc.stop(t + dur + 0.02);
  }

  /* ---------- 노이즈 (타격/드럼) ---------- */
  function noise(dur, opts = {}) {
    if (!ctx || muted) return;
    const { gain = 0.2, when = 0, filterFreq = 1200, dest = sfxGain, sweep = null } = opts;
    const t = ctx.currentTime + when;
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;

    const src = ctx.createBufferSource();
    src.buffer = buf;
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.setValueAtTime(filterFreq, t);
    if (sweep) f.frequency.exponentialRampToValueAtTime(sweep, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);

    src.connect(f); f.connect(g); g.connect(dest);
    src.start(t); src.stop(t + dur + 0.02);
  }

  /* =======================================================
     BGM — 16분음표 스텝 시퀀서
     각 트랙: { bpm, lead:[], bass:[], drum:[] }
     null = 쉼표, 문자열 = 음이름
     ======================================================= */
  const TRACKS = {
    // 던전 탐험: 어둡고 반복적인 단조 루프
    dungeon: {
      bpm: 104,
      lead: [
        'A3', null, 'C4', null, 'E4', null, 'C4', null,
        'D4', null, 'C4', null, 'A3', null, null, null,
        'A3', null, 'C4', null, 'E4', null, 'G4', null,
        'F4', null, 'E4', null, 'D4', null, null, null,
        'C4', null, 'E4', null, 'A4', null, 'E4', null,
        'F4', null, 'E4', null, 'C4', null, null, null,
        'D4', null, 'C4', null, 'B3', null, 'A3', null,
        'G3', null, 'A3', null, null, null, null, null
      ],
      bass: [
        'A2', null, null, null, 'A2', null, null, null,
        'F2', null, null, null, 'F2', null, null, null,
        'C2', null, null, null, 'C2', null, null, null,
        'G2', null, null, null, 'G2', null, null, null,
        'A2', null, null, null, 'A2', null, null, null,
        'F2', null, null, null, 'F2', null, null, null,
        'D2', null, null, null, 'D2', null, null, null,
        'E2', null, null, null, 'E2', null, 'E2', null
      ],
      drum: [
        'k', null, null, null, 'h', null, null, null,
        'k', null, null, 'h', 'h', null, null, null
      ]
    },

    // 전투: 긴장감 있는 빠른 아르페지오
    battle: {
      bpm: 148,
      lead: [
        'E4', 'B4', 'E5', 'B4', 'E4', 'B4', 'E5', 'B4',
        'D4', 'A4', 'D5', 'A4', 'D4', 'A4', 'D5', 'A4',
        'C4', 'G4', 'C5', 'G4', 'C4', 'G4', 'C5', 'G4',
        'B3', 'F#4', 'B4', 'F#4', 'B3', 'F#4', 'B4', 'F#4'
      ],
      bass: [
        'E2', null, 'E2', null, 'E2', null, 'E2', 'E2',
        'D2', null, 'D2', null, 'D2', null, 'D2', 'D2',
        'C2', null, 'C2', null, 'C2', null, 'C2', 'C2',
        'B1', null, 'B1', null, 'B1', null, 'F#2', null
      ],
      drum: [
        'k', null, 'h', null, 's', null, 'h', null,
        'k', null, 'h', 'k', 's', null, 'h', 'h'
      ]
    },

    // 보스(상급 몬스터) 전투: 더 무겁고 위압적
    boss: {
      bpm: 160,
      lead: [
        'A3', 'A3', 'C4', 'A3', 'E4', 'A3', 'F4', 'E4',
        'A3', 'A3', 'C4', 'A3', 'G4', 'F4', 'E4', 'D4',
        'A#3', 'A#3', 'D4', 'A#3', 'F4', 'A#3', 'G4', 'F4',
        'A3', 'C4', 'E4', 'A4', 'G4', 'F4', 'E4', 'C4'
      ],
      bass: [
        'A1', 'A1', null, 'A1', 'A1', null, 'A1', null,
        'A1', 'A1', null, 'A1', 'G1', null, 'G1', null,
        'A#1', 'A#1', null, 'A#1', 'A#1', null, 'A#1', null,
        'A1', null, 'E2', null, 'A1', null, 'E2', 'E2'
      ],
      drum: [
        'k', 'k', 'h', null, 's', null, 'h', 'k',
        'k', null, 'h', 'k', 's', 's', 'h', 'h'
      ]
    }
  };

  function playDrum(kind, when) {
    if (kind === 'k') {           // 킥
      tone(120, 0.12, { type: 'sine', gain: 0.35, when, dest: musicGain, slideTo: 40 });
    } else if (kind === 's') {    // 스네어
      noise(0.10, { gain: 0.16, when, filterFreq: 1800, dest: musicGain });
    } else if (kind === 'h') {    // 하이햇
      noise(0.04, { gain: 0.07, when, filterFreq: 7000, dest: musicGain });
    }
  }

  function scheduleStep() {
    if (!ctx || !currentTrack) return;
    const tr = TRACKS[currentTrack];
    const stepDur = 60 / tr.bpm / 4;  // 16분음표

    // 앞으로 0.2초 구간을 미리 스케줄
    while (nextNoteTime < ctx.currentTime + 0.2) {
      const when = Math.max(0, nextNoteTime - ctx.currentTime);

      const ln = tr.lead[bgmStep % tr.lead.length];
      if (ln && NOTE[ln]) {
        tone(NOTE[ln], stepDur * 1.7, {
          type: 'square', gain: 0.12, when, dest: musicGain, decay: stepDur
        });
        // 옥타브 아래 살짝 겹쳐 두께 추가
        tone(NOTE[ln] / 2, stepDur * 1.5, {
          type: 'triangle', gain: 0.05, when, dest: musicGain
        });
      }

      const bn = tr.bass[bgmStep % tr.bass.length];
      if (bn && NOTE[bn]) {
        tone(NOTE[bn], stepDur * 2.2, {
          type: 'triangle', gain: 0.22, when, dest: musicGain
        });
      }

      const dn = tr.drum[bgmStep % tr.drum.length];
      if (dn) playDrum(dn, when);

      bgmStep++;
      nextNoteTime += stepDur;
    }
  }

  function playBGM(name) {
    init();
    if (!ctx) return;
    if (currentTrack === name) return;
    stopBGM();
    currentTrack = name;
    bgmStep = 0;
    nextNoteTime = ctx.currentTime + 0.05;
    bgmTimer = setInterval(scheduleStep, 40);
    scheduleStep();
  }

  function stopBGM() {
    if (bgmTimer) { clearInterval(bgmTimer); bgmTimer = null; }
    currentTrack = null;
  }

  /* =======================================================
     효과음
     ======================================================= */
  const SFX = {
    step() { noise(0.04, { gain: 0.05, filterFreq: 500 }); },

    encounter() {                       // 몬스터 조우
      tone(NOTE['C5'], 0.07, { gain: 0.22 });
      tone(NOTE['E5'], 0.07, { gain: 0.22, when: 0.06 });
      tone(NOTE['G5'], 0.14, { gain: 0.22, when: 0.12 });
      noise(0.20, { gain: 0.12, filterFreq: 900, sweep: 200, when: 0.10 });
    },

    select() { tone(NOTE['E5'], 0.05, { gain: 0.16, type: 'square' }); },

    correct() {                         // 정답 — 상승 아르페지오
      const seq = ['C5', 'E5', 'G5', 'C6'];
      seq.forEach((n, i) => tone(NOTE[n], 0.14, { gain: 0.24, when: i * 0.075, type: 'square' }));
      seq.forEach((n, i) => tone(NOTE[n] / 2, 0.16, { gain: 0.10, when: i * 0.075, type: 'triangle' }));
    },

    wrong() {                           // 오답 — 하강 + 타격
      tone(NOTE['G4'], 0.14, { gain: 0.24, type: 'sawtooth', slideTo: NOTE['C4'] });
      tone(NOTE['C4'], 0.24, { gain: 0.20, type: 'square', when: 0.12, slideTo: NOTE['G3'] });
      noise(0.18, { gain: 0.20, filterFreq: 400, sweep: 90 });
    },

    hurt() {                            // 체력 감소
      tone(220, 0.18, { type: 'sawtooth', gain: 0.22, slideTo: 70 });
      noise(0.12, { gain: 0.16, filterFreq: 600, sweep: 150 });
    },

    coin() {                            // 점수 획득
      tone(NOTE['B5'], 0.05, { gain: 0.18 });
      tone(NOTE['E6'], 0.16, { gain: 0.18, when: 0.05 });
    },

    portalOpen() {                      // 포털 개방
      for (let i = 0; i < 6; i++) {
        tone(NOTE['C4'] * Math.pow(2, i / 6), 0.30, {
          gain: 0.14, type: 'sine', when: i * 0.06
        });
      }
      tone(NOTE['C5'], 0.6, { gain: 0.18, when: 0.36, type: 'square' });
      tone(NOTE['G5'], 0.6, { gain: 0.14, when: 0.42, type: 'square' });
    },

    stageUp() {                         // 스테이지 진입 팡파레
      const seq = [['G4', 0], ['C5', 0.10], ['E5', 0.20], ['G5', 0.30], ['C6', 0.42]];
      seq.forEach(([n, t]) => {
        tone(NOTE[n], 0.30, { gain: 0.26, when: t, type: 'square' });
        tone(NOTE[n] / 2, 0.32, { gain: 0.12, when: t, type: 'triangle' });
      });
      noise(0.10, { gain: 0.14, filterFreq: 4000, when: 0.42 });
    },

    gameOver() {                        // 게임 오버 — 하강 단조
      const seq = [['C5', 0], ['A4', 0.22], ['F4', 0.44], ['C4', 0.66]];
      seq.forEach(([n, t]) => {
        tone(NOTE[n], 0.5, { gain: 0.24, when: t, type: 'square' });
        tone(NOTE[n] / 2, 0.55, { gain: 0.14, when: t, type: 'triangle' });
      });
      tone(NOTE['C3'], 1.4, { gain: 0.20, when: 0.88, type: 'triangle' });
    },

    victory() {                         // 몬스터 처치
      tone(NOTE['E5'], 0.08, { gain: 0.20 });
      tone(NOTE['G5'], 0.08, { gain: 0.20, when: 0.07 });
      tone(NOTE['C6'], 0.20, { gain: 0.22, when: 0.14 });
    },

    tick() { tone(NOTE['A5'], 0.03, { gain: 0.10, type: 'square' }); }
  };

  function play(name) {
    init();
    if (!ctx || muted) return;
    if (SFX[name]) SFX[name]();
  }

  function toggleMute() {
    muted = !muted;
    if (masterGain) {
      masterGain.gain.setTargetAtTime(muted ? 0 : 0.9, ctx.currentTime, 0.02);
    }
    return muted;
  }

  function isMuted() { return muted; }

  return { resume, play, playBGM, stopBGM, toggleMute, isMuted };
})();
