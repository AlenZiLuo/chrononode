/* ============================================================
   audio.js — 音效引擎（Web Audio API 合成，零素材）
   终端风格：蜂鸣 / 滴答 / 静电 / 低频嗡鸣
   ============================================================ */

const Sfx = (() => {
  let ctx = null;
  let master = null;
  let enabled = true;
  let started = false;

  /* 背景白噪音 */
  let ambSrc = null;
  let ambGain = null;
  let ambLow = null;

  /* 懒初始化（必须在用户手势后） */
  function init() {
    if (ctx) return true;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = enabled ? 0.6 : 0;   // 尊重当前开关状态
      master.connect(ctx.destination);
      return true;
    } catch (e) { return false; }
  }

  function ready() {
    if (!enabled) return false;
    if (!init()) return false;
    // 上下文未就绪时不要假装成功：先恢复，本次放弃发声
    if (ctx.state !== "running") {
      if (ctx.state === "suspended") ctx.resume().catch(() => {});
      return false;
    }
    return true;
  }

  /* ---------- 基础发声：振荡器 ---------- */
  function tone({ freq = 880, dur = 0.06, type = "square", vol = 0.25, decay = true, slideTo = null }) {
    if (!ready()) return;
    const t0 = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);

    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(vol, t0 + 0.004);
    if (decay) g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    else g.gain.setValueAtTime(vol, t0 + dur);

    osc.connect(g).connect(master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  /* ---------- 噪声缓冲（静电 / 沙沙声） ---------- */
  function noiseBuffer(seconds = 0.5) {
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  function noise({ dur = 0.18, vol = 0.12, filterHz = 2400, type = "bandpass" }) {
    if (!ready()) return;
    const t0 = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer(dur + 0.05);

    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = filterHz;
    f.Q.value = 0.8;

    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(vol, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

    src.connect(f).connect(g).connect(master);
    src.start(t0);
    src.stop(t0 + dur + 0.05);
  }

  /* ============================================================
     背景白噪音
     ============================================================ */

  /* 启动循环白噪音（只建一次，之后一直响） */
  function startAmbience() {
    if (ambSrc) return;                    // 已在播放

    /* 层 A：噪声 → 低通 1400Hz → 高通 35Hz → 音量 0.16 */
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer(4);           // 4 秒循环缓冲
    src.loop = true;

    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 1400;
    lp.Q.value = 0.7;

    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 35;

    const g = ctx.createGain();
    g.gain.value = 0;                      // 从 0 淡入

    src.connect(lp).connect(hp).connect(g).connect(master);
    src.start();
    g.gain.linearRampToValueAtTime(0.16, ctx.currentTime + 1.5);   // 音量调小

    /* 层 B：低频嗡鸣（频率略低） */
    const lowOsc = ctx.createOscillator();
    lowOsc.type = "sawtooth";
    lowOsc.frequency.value = 42;           // 略低于之前的 52Hz

    const lowLp = ctx.createBiquadFilter();
    lowLp.type = "lowpass";
    lowLp.frequency.value = 130;

    const lowG = ctx.createGain();
    lowG.gain.value = 0;

    lowOsc.connect(lowLp).connect(lowG).connect(master);
    lowOsc.start();
    lowG.gain.linearRampToValueAtTime(0.038, ctx.currentTime + 2);   // 低音量底盘

    ambSrc = src;
    ambGain = g;
    ambLow = lowOsc;
  }

  function stopAmbience() {
    try { if (ambSrc) ambSrc.stop(); } catch (e) {}
    try { if (ambLow) ambLow.stop(); } catch (e) {}
    ambSrc = null;
    ambGain = null;
    ambLow = null;
  }
  /* ============================================================
     对外音效
     ============================================================ */
  const api = {

    /* 页面打开即尝试启动（若被浏览器阻拦，首次手势会补上） */
    autostart() {
      if (!enabled) return;                // 尊重开关状态
      if (!init()) return;
      const tryStart = () => {
        if (ctx.state === "running") { started = true; startAmbience(); return; }
        ctx.resume().then(() => {
          if (ctx.state === "running") { started = true; startAmbience(); }
        }).catch(() => {});
      };
      tryStart();
    },

    /* 用户首次交互时解锁音频 + 启动白噪音 */
    unlock() {
      if (started) return;
      if (!init()) return;
      const go = () => {
        started = true;
        if (enabled) startAmbience();
      };
      if (ctx.state === "running") { go(); return; }
      ctx.resume().then(() => {
        if (ctx.state === "running") go();
      }).catch(() => {});
    },

    /* 开关 */
    setEnabled(on) {
      enabled = !!on;
      if (master) master.gain.value = enabled ? 0.6 : 0;
      if (enabled && ctx) startAmbience();   // 重新打开时恢复白噪音
    },
    isEnabled() { return enabled; },

    /* —— 内容逐行出现（轻滴答） —— */
    tick() {
      tone({ freq: 2200, dur: 0.018, type: "square", vol: 0.09 });
    },

    /* —— 打开弹窗（双音确认） —— */
    open() {
      tone({ freq: 880,  dur: 0.07, type: "square", vol: 0.2 });
      setTimeout(() => tone({ freq: 1320, dur: 0.09, type: "square", vol: 0.18 }), 70);
    },

    /* —— 关闭弹窗（下行音） —— */
    close() {
      tone({ freq: 880, dur: 0.09, type: "square", vol: 0.16, slideTo: 440 });
    },

    /* —— 数据损坏 / 告警（低沉嗡鸣） —— */
    alarm() {
      tone({ freq: 180, dur: 0.28, type: "sawtooth", vol: 0.22, slideTo: 90 });
      noise({ dur: 0.22, vol: 0.1, filterHz: 700, type: "lowpass" });
    },

    /* —— 静电噪声（载波丢失） —— */
    static_(long = false) {
      noise({ dur: long ? 0.7 : 0.3, vol: long ? 0.16 : 0.11, filterHz: 3200 });
      if (long) setTimeout(() => noise({ dur: 0.5, vol: 0.1, filterHz: 1800 }), 200);
    },

    /* —— 时钟秒针（每秒一声，音量恒定） —— */
    clockTick() {
      if (!ready()) return;
      const t0 = ctx.currentTime;
      const osc = ctx.createOscillator();
      const g   = ctx.createGain();

      osc.type = "square";
      osc.frequency.setValueAtTime(1100, t0);

      /* 恒定音量：快速起音 → 保持 → 快速收尾（不做渐变衰减） */
      const V = 0.14;
      g.gain.setValueAtTime(0, t0);
      g.gain.linearRampToValueAtTime(V, t0 + 0.002);   // 2ms 起音
      g.gain.setValueAtTime(V, t0 + 0.028);            // 保持恒定到 28ms
      g.gain.linearRampToValueAtTime(0, t0 + 0.032);   // 4ms 收尾，避免爆音

      osc.connect(g).connect(master);
      osc.start(t0);
      osc.stop(t0 + 0.04);
    },

    /* —— 时钟异常（刺耳高频） —— */
    clockAnomaly() {
      tone({ freq: 2600, dur: 0.12, type: "square", vol: 0.2 });
      setTimeout(() => tone({ freq: 3200, dur: 0.16, type: "square", vol: 0.18 }), 130);
      noise({ dur: 0.5, vol: 0.07, filterHz: 5000 });
    },

    /* —— 时钟修正（上行 chirp） —— */
    clockFix() {
      tone({ freq: 600, dur: 0.22, type: "sine", vol: 0.2, slideTo: 1800 });
    },

    /* —— 清屏（无音效） —— */

    /* —— 结尾光标（极轻） —— */
    blink() {
      tone({ freq: 1800, dur: 0.012, type: "square", vol: 0.05 });
    },
  };

  return api;
})();
