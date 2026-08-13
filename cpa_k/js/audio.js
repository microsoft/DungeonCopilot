/* =========================================================
   코파일럿 아레나 — 8비트 사운드 (WebAudio, 외부 파일 없음)
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
    bgmGain = ctx.createGain(); bgmGain.gain.value = 0.26; bgmGain.connect(master);
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
    const { gain = 0.14, when = 0, freq = 1400, dest = sfxGain } = opts;
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
    // 도구별 발사음 — 소리만 듣고도 뭘 쐈는지 알 수 있게 음높이를 다르게 둔다
    fireSummarize: () => tone(880, 0.09, { slide: 1320, gain: 0.13 }),
    fireAnalyze: () => tone(523, 0.11, { slide: 784, type: 'triangle', gain: 0.14 }),
    fireDraft: () => tone(659, 0.10, { slide: 988, gain: 0.13 }),
    fireGround: () => tone(392, 0.13, { slide: 587, type: 'triangle', gain: 0.14 }),

    hit: () => { tone(1046, 0.07, { gain: 0.16 }); noise(0.06, { freq: 2200, gain: 0.08 }); },
    wrong: () => { tone(180, 0.20, { slide: 110, type: 'sawtooth', gain: 0.16 }); },
    halluc: () => { tone(300, 0.3, { slide: 140, type: 'sawtooth', gain: 0.13 }); noise(0.25, { freq: 500, gain: 0.09 }); },
    orb: () => { tone(1175, 0.06, { gain: 0.11 }); tone(1568, 0.09, { when: 0.05, gain: 0.10 }); },
    hurt: () => tone(320, 0.24, { slide: 90, type: 'sawtooth', gain: 0.2 }),
    combo: () => tone(1318, 0.07, { gain: 0.12 }),
    chest: () => [784, 988, 1318].forEach((f, i) => tone(f, 0.12, { when: i * 0.07, gain: 0.15 })),
    correct: () => [784, 1047, 1319, 1568].forEach((f, i) => tone(f, 0.14, { when: i * 0.08, gain: 0.17 })),
    miss: () => tone(220, 0.3, { slide: 130, type: 'sawtooth', gain: 0.15 }),
    cowork: () => [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.18, { when: i * 0.06, type: 'triangle', gain: 0.18 })),
    wave: () => [659, 880].forEach((f, i) => tone(f, 0.2, { when: i * 0.12, gain: 0.16 })),
    boss: () => { tone(98, 0.55, { type: 'sawtooth', gain: 0.22 }); noise(0.45, { freq: 260, gain: 0.15 }); },
    clear: () => [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.22, { when: i * 0.11, gain: 0.19, type: 'triangle' })),
    over: () => [392, 330, 262, 196].forEach((f, i) => tone(f, 0.3, { when: i * 0.16, gain: 0.19, type: 'triangle' })),
    select: () => tone(880, 0.06, { gain: 0.11 })
  };

  function play(name) { resume(); const f = SFX[name]; if (f) f(); }

  const TRACKS = {
    arena: {
      bpm: 146,
      lead: [69, 0, 72, 76, 0, 74, 71, 0, 67, 0, 71, 74, 0, 72, 69, 0],
      bass: [45, 45, 0, 52, 45, 0, 50, 0, 43, 43, 0, 50, 43, 0, 48, 0]
    },
    boss: {
      bpm: 168,
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
      if (l) tone(hz(l), interval / 1000 * 0.8, { type: 'square', gain: 0.055, dest: bgmGain });
      if (b) tone(hz(b), interval / 1000 * 0.9, { type: 'triangle', gain: 0.10, dest: bgmGain });
      if (i % 4 === 0) noise(0.035, { freq: 3200, gain: 0.035, dest: bgmGain });
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
