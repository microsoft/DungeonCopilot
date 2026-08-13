/* =========================================================
   코파일럿 타워디펜스 — 8비트 사운드 (WebAudio, 외부 파일 없음)

   사운드 파일을 두지 않는 이유: 부스 PC가 오프라인이거나
   폴더째 USB로 옮겨 다니는 일이 많아 자산 의존을 아예 없앴다.
   ========================================================= */

const Sfx = (() => {
  let ctx = null, master = null, sfxGain = null, bgmGain = null;
  let muted = false;
  let bgmTimer = null, bgmName = null, bgmStep = 0;

  function init() {
    if (ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    // 오디오 장치가 없는 PC(무인 부스 미니PC 등)에서 생성이 실패해도
    // 게임 자체는 굴러가야 하므로 여기서 삼킨다.
    try {
      ctx = new AC();
      master = ctx.createGain(); master.gain.value = 0.5; master.connect(ctx.destination);
      sfxGain = ctx.createGain(); sfxGain.gain.value = 0.9; sfxGain.connect(master);
      bgmGain = ctx.createGain(); bgmGain.gain.value = 0.26; bgmGain.connect(master);
    } catch (e) { ctx = null; }
  }

  function resume() {
    init();
    if (ctx && ctx.state === 'suspended') ctx.resume();
  }

  function tone(freq, dur, opts = {}) {
    if (!ctx || muted) return;
    const { type = 'square', gain = 0.16, when = 0, dest = sfxGain, slide = null } = opts;
    const t = ctx.currentTime + when;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(slide, 20), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g); g.connect(dest);
    osc.start(t); osc.stop(t + dur + 0.02);
  }

  function noise(dur, opts = {}) {
    if (!ctx || muted) return;
    const { gain = 0.13, when = 0, freq = 1400, dest = sfxGain } = opts;
    const t = ctx.currentTime + when;
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource(); src.buffer = buf;
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq;
    const g = ctx.createGain(); g.gain.value = gain;
    src.connect(f); f.connect(g); g.connect(dest);
    src.start(t);
  }

  const SFX = {
    select: () => tone(880, 0.06, { gain: 0.11 }),
    build: () => { tone(523, 0.08); tone(784, 0.11, { when: 0.06 }); },
    deny: () => tone(190, 0.18, { slide: 120, type: 'sawtooth', gain: 0.14 }),
    shot: () => tone(1180, 0.035, { gain: 0.045, type: 'triangle' }),
    kill: () => { tone(300, 0.06, { slide: 120, type: 'triangle', gain: 0.15 }); noise(0.06, { freq: 900, gain: 0.08 }); },
    ignore: () => noise(0.09, { freq: 420, gain: 0.05 }),
    orb: () => { tone(988, 0.07, { gain: 0.14 }); tone(1319, 0.12, { when: 0.055, gain: 0.14 }); },
    leak: () => { tone(300, 0.26, { slide: 90, type: 'sawtooth', gain: 0.2 }); noise(0.16, { freq: 260, gain: 0.12 }); },
    halluc: () => { tone(720, 0.3, { slide: 160, type: 'sawtooth', gain: 0.16 }); noise(0.22, { freq: 2200, gain: 0.08 }); },
    cowork: () => [523, 659, 784, 1047, 1319].forEach((f, i) =>
      tone(f, 0.3, { when: i * 0.07, gain: 0.2, type: 'triangle' })),
    upgrade: () => [659, 880, 1175].forEach((f, i) => tone(f, 0.13, { when: i * 0.07, gain: 0.16 })),
    sell: () => { tone(660, 0.09, { slide: 330, gain: 0.12 }); },
    chest: () => [784, 1047].forEach((f, i) => tone(f, 0.14, { when: i * 0.08, gain: 0.15, type: 'triangle' })),
    correct: () => [784, 1047, 1319].forEach((f, i) => tone(f, 0.16, { when: i * 0.09, gain: 0.17 })),
    wrong: () => tone(220, 0.3, { slide: 120, type: 'sawtooth', gain: 0.14 }),
    waveStart: () => { tone(392, 0.14, { gain: 0.16 }); tone(523, 0.2, { when: 0.12, gain: 0.16 }); },
    waveClear: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.19, { when: i * 0.1, gain: 0.18, type: 'triangle' })),
    boss: () => { tone(110, 0.55, { type: 'sawtooth', gain: 0.22 }); noise(0.45, { freq: 300, gain: 0.15 }); },
    over: () => [392, 330, 262, 196].forEach((f, i) => tone(f, 0.32, { when: i * 0.17, gain: 0.2, type: 'triangle' })),
    win: () => [523, 659, 784, 1047, 1319, 1568].forEach((f, i) =>
      tone(f, 0.26, { when: i * 0.12, gain: 0.2, type: 'triangle' }))
  };

  function play(name) { resume(); const f = SFX[name]; if (f) f(); }

  /* ---- 배경음 ---- */
  const TRACKS = {
    office: {
      bpm: 124,
      lead: [69, 72, 76, 72, 71, 74, 78, 74, 69, 72, 76, 81, 78, 76, 72, 69],
      bass: [45, 0, 52, 0, 47, 0, 54, 0, 45, 0, 52, 0, 50, 0, 40, 0]
    },
    boss: {
      bpm: 158,
      lead: [63, 66, 70, 66, 63, 68, 71, 68, 61, 64, 68, 64, 63, 66, 70, 75],
      bass: [39, 39, 46, 46, 37, 37, 44, 44, 35, 35, 42, 42, 39, 39, 46, 46]
    }
  };

  const hz = m => 440 * Math.pow(2, (m - 69) / 12);

  function playBGM(name) {
    resume();
    if (bgmName === name && bgmTimer) return;
    stopBGM();
    const tr = TRACKS[name];
    if (!tr || !ctx) return;
    bgmName = name; bgmStep = 0;
    const interval = 60000 / tr.bpm / 2;
    bgmTimer = setInterval(() => {
      if (muted) return;
      const i = bgmStep % tr.lead.length;
      const l = tr.lead[i], b = tr.bass[i];
      if (l) tone(hz(l), interval / 1000 * 0.85, { type: 'square', gain: 0.06, dest: bgmGain });
      if (b) tone(hz(b), interval / 1000 * 0.9, { type: 'triangle', gain: 0.11, dest: bgmGain });
      if (i % 4 === 0) noise(0.04, { freq: 3000, gain: 0.035, dest: bgmGain });
      bgmStep++;
    }, interval);
  }

  function stopBGM() {
    if (bgmTimer) clearInterval(bgmTimer);
    bgmTimer = null; bgmName = null;
  }

  function toggleMute() {
    muted = !muted;
    if (master) master.gain.value = muted ? 0 : 0.5;
    return muted;
  }
  function isMuted() { return muted; }

  return { init, resume, play, playBGM, stopBGM, toggleMute, isMuted };
})();
