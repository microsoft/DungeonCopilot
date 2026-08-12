/* =========================================================
   Copilot World — 8비트 사운드 (WebAudio, 외부 파일 없음)
   ========================================================= */

const Sfx = (() => {
  let ctx = null, master = null, sfxGain = null, bgmGain = null;
  let muted = false;
  let bgmTimer = null, bgmName = null, bgmStep = 0;

  function init() {
    if (ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = 0.5; master.connect(ctx.destination);
    sfxGain = ctx.createGain(); sfxGain.gain.value = 0.9; sfxGain.connect(master);
    bgmGain = ctx.createGain(); bgmGain.gain.value = 0.30; bgmGain.connect(master);
  }

  function resume() {
    init();
    if (ctx && ctx.state === 'suspended') ctx.resume();
  }

  function tone(freq, dur, opts = {}) {
    if (!ctx || muted) return;
    const { type = 'square', gain = 0.18, when = 0, dest = sfxGain, slide = null } = opts;
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
    const { gain = 0.15, when = 0, freq = 1400, dest = sfxGain } = opts;
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
    jump: () => tone(420, 0.14, { slide: 780, gain: 0.16 }),
    land: () => noise(0.05, { freq: 500, gain: 0.07 }),
    coin: () => { tone(988, 0.07); tone(1319, 0.13, { when: 0.06 }); },
    stomp: () => { tone(300, 0.06, { slide: 110, type: 'triangle', gain: 0.2 }); noise(0.08, { freq: 900 }); },
    hurt: () => { tone(320, 0.22, { slide: 90, type: 'sawtooth', gain: 0.2 }); },
    dash: () => { noise(0.16, { freq: 2400, gain: 0.13 }); tone(660, 0.16, { slide: 1500, type: 'triangle', gain: 0.1 }); },
    build: () => { tone(523, 0.08); tone(784, 0.1, { when: 0.07 }); },
    reveal: () => { tone(659, 0.1, { type: 'triangle' }); tone(880, 0.1, { when: 0.09, type: 'triangle' }); tone(1175, 0.18, { when: 0.18, type: 'triangle' }); },
    break: () => { noise(0.22, { freq: 700, gain: 0.2 }); tone(180, 0.2, { slide: 60, type: 'sawtooth', gain: 0.14 }); },
    power: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.14, { when: i * 0.08, gain: 0.2 })),
    clear: () => [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.2, { when: i * 0.11, gain: 0.2, type: 'triangle' })),
    over: () => [392, 330, 262, 196].forEach((f, i) => tone(f, 0.3, { when: i * 0.16, gain: 0.2, type: 'triangle' })),
    select: () => tone(880, 0.06, { gain: 0.12 }),
    correct: () => [784, 1047, 1319].forEach((f, i) => tone(f, 0.16, { when: i * 0.09, gain: 0.18 })),
    wrong: () => tone(200, 0.35, { slide: 110, type: 'sawtooth', gain: 0.18 }),
    boss: () => { tone(110, 0.5, { type: 'sawtooth', gain: 0.22 }); noise(0.4, { freq: 300, gain: 0.16 }); },
    portal: () => [440, 554, 659, 880].forEach((f, i) => tone(f, 0.25, { when: i * 0.07, type: 'triangle', gain: 0.14 }))
  };

  function play(name) { resume(); const f = SFX[name]; if (f) f(); }

  /* ---- 배경음 ---- */
  const TRACKS = {
    field: {
      bpm: 138,
      lead: [72, 76, 79, 76, 74, 77, 81, 77, 72, 76, 79, 84, 81, 79, 76, 72],
      bass: [48, 0, 55, 0, 50, 0, 57, 0, 48, 0, 55, 0, 53, 0, 43, 0]
    },
    boss: {
      bpm: 162,
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
      if (l) tone(hz(l), interval / 1000 * 0.85, { type: 'square', gain: 0.07, dest: bgmGain });
      if (b) tone(hz(b), interval / 1000 * 0.9, { type: 'triangle', gain: 0.12, dest: bgmGain });
      if (i % 4 === 0) noise(0.04, { freq: 3000, gain: 0.04, dest: bgmGain });
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
