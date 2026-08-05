// ========== 音效系统 - Web Audio API 程序化生成 ==========
(function() {
  let audioCtx = null;
  let masterGain = null;
  let bgmGain = null;
  let sfxGain = null;
  let bgmOscillators = [];
  let bgmInterval = null;
  let bgmPlaying = false;
  let bgmBarIndex = 0;
  let muted = localStorage.getItem('mj_muted') === '1';

  function ensureCtx() {
    if (!audioCtx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return false;
      audioCtx = new Ctx();
      masterGain = audioCtx.createGain();
      masterGain.gain.value = muted ? 0 : 0.9;
      masterGain.connect(audioCtx.destination);

      bgmGain = audioCtx.createGain();
      bgmGain.gain.value = 0.18;
      bgmGain.connect(masterGain);

      sfxGain = audioCtx.createGain();
      sfxGain.gain.value = 0.8;
      sfxGain.connect(masterGain);
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return true;
  }

  // 全局首次点击自动激活音频上下文（浏览器自动播放策略）
  function autoActivate() {
    ensureCtx();
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      document.addEventListener('click', autoActivate, { once: true });
      document.addEventListener('touchstart', autoActivate, { once: true });
    });
  } else {
    document.addEventListener('click', autoActivate, { once: true });
    document.addEventListener('touchstart', autoActivate, { once: true });
  }

  // ===== 点击音 - 清脆短音 =====
  function playClick() {
    if (!ensureCtx()) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1200, audioCtx.currentTime + 0.03);
    gain.gain.setValueAtTime(0, audioCtx.currentTime);
    gain.gain.linearRampToValueAtTime(0.4, audioCtx.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.08);
    osc.connect(gain);
    gain.connect(sfxGain);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.1);
  }

  // ===== 选牌音 - 麻将碰撞感 =====
  function playTileSelect() {
    if (!ensureCtx()) return;
    const now = audioCtx.currentTime;
    // 主体 - 木质敲击
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(420, now);
    osc.frequency.exponentialRampToValueAtTime(180, now + 0.06);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.35, now + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    osc.connect(gain);
    gain.connect(sfxGain);
    osc.start(now);
    osc.stop(now + 0.12);

    // 高频 - 清脆感
    const osc2 = audioCtx.createOscillator();
    const gain2 = audioCtx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1400, now);
    osc2.frequency.exponentialRampToValueAtTime(900, now + 0.04);
    gain2.gain.setValueAtTime(0, now);
    gain2.gain.linearRampToValueAtTime(0.2, now + 0.003);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
    osc2.connect(gain2);
    gain2.connect(sfxGain);
    osc2.start(now);
    osc2.stop(now + 0.08);
  }

  // ===== 出牌音 - 麻将拍桌 =====
  function playPlay() {
    if (!ensureCtx()) return;
    const now = audioCtx.currentTime;
    // 低频轰声
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.1);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.3, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    osc.connect(gain);
    gain.connect(sfxGain);
    osc.start(now);
    osc.stop(now + 0.18);

    // 噪声脆响
    const bufferSize = audioCtx.sampleRate * 0.08;
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }
    const noise = audioCtx.createBufferSource();
    noise.buffer = buffer;
    const noiseGain = audioCtx.createGain();
    noiseGain.gain.value = 0.15;
    const filter = audioCtx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 1000;
    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(sfxGain);
    noise.start(now);
  }

  // ===== 金币/得分音 =====
  function playCoin() {
    if (!ensureCtx()) return;
    const now = audioCtx.currentTime;
    const notes = [660, 990];
    notes.forEach((freq, i) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const t = now + i * 0.06;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.3, t + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
      osc.connect(gain);
      gain.connect(sfxGain);
      osc.start(t);
      osc.stop(t + 0.22);
    });
  }

  // ===== 失败/错误音 =====
  function playError() {
    if (!ensureCtx()) return;
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(110, now + 0.2);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.25, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    osc.connect(gain);
    gain.connect(sfxGain);
    osc.start(now);
    osc.stop(now + 0.28);
  }

  // ===== 胜利音 - 上升琶音 =====
  function playWin() {
    if (!ensureCtx()) return;
    const now = audioCtx.currentTime;
    const notes = [523, 659, 784, 1047]; // C E G C
    notes.forEach((freq, i) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      const t = now + i * 0.08;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.3, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
      osc.connect(gain);
      gain.connect(sfxGain);
      osc.start(t);
      osc.stop(t + 0.35);
    });
  }

  // ===== BGM - 简易中式五声音阶循环 =====
  // 五声音阶宫商角徵羽: C D E G A
  const PENTA = [262, 294, 330, 392, 440]; // 中低音
  const PENTA_HIGH = [523, 587, 659, 784, 880]; // 高音

  function playBGMNote(freq, startTime, duration, volume = 0.2, type = 'triangle') {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(volume, startTime + 0.03);
    gain.gain.setValueAtTime(volume, startTime + duration * 0.7);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
    osc.connect(gain);
    gain.connect(bgmGain);
    osc.start(startTime);
    osc.stop(startTime + duration + 0.05);
    return osc;
  }

  function scheduleBGMBar(startTime, barIndex) {
    // 五声音阶: C D E G A (宫商角徵羽)
    // 高音区: C5 D5 E5 G5 A5 = 523 587 659 784 880
    // 中高区: C4 D4 E4 G4 A4 = 262 294 330 392 440
    // 低音区: C3 G3 C3 = 131 196 131

    // 两句旋律交替（A 段轻快，B 段上扬），每段 8 拍
    const melodyA = [
      [2, 0.5], [3, 0.3], [2, 0.2], [4, 0.5], // 高 宫-徵-宫-羽  (E G E A)
      [3, 0.3], [2, 0.2], [1, 0.5], [0, 0.5], // 徵-宫-商-宫      (G E D C)
    ];
    const melodyB = [
      [4, 0.4], [3, 0.4], [2, 0.4], [4, 0.4], // 羽-徵-宫-羽      (A G E A)
      [3, 0.4], [2, 0.4], [1, 0.4], [0, 0.8], // 徵-宫-商-低宫    (G E D C)
    ];
    // 低音进行: 宫-徵-商-羽（常见的 I-V-vi-IV 变体，用五声）
    const bassLine = [0, 3, 1, 4, 0, 3, 0, 0]; // 对应每拍低音

    const melody = barIndex % 2 === 0 ? melodyA : melodyB;
    const PENTA_MELODY = PENTA_HIGH;

    let t = startTime;
    melody.forEach((m, i) => {
      const freq = PENTA_MELODY[m[0]];
      const dur = m[1];
      // 主旋律 - 三角波为主，加一点点方波增加质感
      playBGMNote(freq, t, dur * 0.9, 0.14, 'triangle');
      playBGMNote(freq, t, dur * 0.85, 0.05, 'square');
      // 低八度陪衬（温暖的底）
      playBGMNote(freq / 2, t, dur * 0.9, 0.07, 'triangle');
      // 低音：每拍一个
      const bassFreq = PENTA[bassLine[i % 8]] / 2; // C3 左右
      playBGMNote(bassFreq, t, Math.min(dur, 0.45), 0.12, 'sine');
      // 鼓点（沙锤感）：每拍开头
      playDrum(t, 0.04, 0.06);
      t += dur;
    });
    return t;
  }

  // 简易沙锤/底鼓噪声
  function playDrum(startTime, duration, volume) {
    const bufferSize = Math.floor(audioCtx.sampleRate * duration);
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      // 衰减的噪声
      const env = 1 - i / bufferSize;
      data[i] = (Math.random() * 2 - 1) * env * env;
    }
    const noise = audioCtx.createBufferSource();
    noise.buffer = buffer;
    const gain = audioCtx.createGain();
    gain.gain.value = volume;
    const filter = audioCtx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 2500;
    filter.Q.value = 1;
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(bgmGain);
    noise.start(startTime);
  }

  function startBGM() {
    if (!ensureCtx()) return;
    if (bgmPlaying) return;
    bgmPlaying = true;
    bgmBarIndex = 0;

    let nextTime = audioCtx.currentTime + 0.1;

    function schedule() {
      if (!bgmPlaying) return;
      while (nextTime < audioCtx.currentTime + 2) {
        nextTime = scheduleBGMBar(nextTime, bgmBarIndex++);
      }
    }
    schedule();
    bgmInterval = setInterval(schedule, 1000);
  }

  function stopBGM() {
    bgmPlaying = false;
    if (bgmInterval) {
      clearInterval(bgmInterval);
      bgmInterval = null;
    }
  }

  // ===== 静音切换 =====
  function toggleMute() {
    muted = !muted;
    localStorage.setItem('mj_muted', muted ? '1' : '0');
    if (masterGain) {
      masterGain.gain.setTargetAtTime(muted ? 0 : 0.6, audioCtx.currentTime, 0.05);
    }
    return muted;
  }

  function isMuted() {
    return muted;
  }

  // 初始化时从存储读取
  if (muted) {
    // 延迟初始化
  }

  window.SoundFX = {
    ensureCtx,
    playClick,
    playTileSelect,
    playPlay,
    playCoin,
    playError,
    playWin,
    startBGM,
    stopBGM,
    toggleMute,
    isMuted,
  };
})();
