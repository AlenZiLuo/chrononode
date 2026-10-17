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

  /* 校准动画独立通道 */
  let calib = null;

  /* 临时压低环境底噪，动画音效才不会被持续噪声掩盖 */
  function duckAmbience(factor) {
    if (!ambGain || !ambLow) return;
    const t = ctx.currentTime;
    const f = Math.max(0, Math.min(1, factor));
    try {
      ambGain.gain.cancelScheduledValues(t);
      ambGain.gain.linearRampToValueAtTime(0.16 * f, t + 0.25);
      ambLow.gain.cancelScheduledValues(t);
      ambLow.gain.linearRampToValueAtTime(0.038 * f, t + 0.25);
    } catch (e) {}
  }

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

    /* ------------------------------------------------------------
       等待音频上下文真正进入 running 状态
       必须在用户手势内调用（或手势后立即调）。
       返回 Promise<boolean>，供动画开始前 await。
       ------------------------------------------------------------ */
    async ensureReady(timeoutMs = 1200) {
      if (!enabled) return false;
      if (!init()) return false;
      if (ctx.state === "running") return true;

      /* 先尝试 resume，这是关键：必须在手势调用栈附近 */
      try { await ctx.resume(); } catch (e) {}

      /* 轮询直到 running 或超时 */
      const t0 = Date.now();
      while (Date.now() - t0 < timeoutMs) {
        if (ctx.state === "running") {
          if (!started) { started = true; if (enabled) startAmbience(); }
          return true;
        }
        await new Promise((r) => setTimeout(r, 40));
      }
      return ctx.state === "running";
    },

    /* 当前音频状态（调试用） */
    state() {
      return ctx ? ctx.state : "no-context";
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

    /* ============================================================
       校准序列专用音效（独立通道版）
       ------------------------------------------------------------
       设计要点：
       1. 不经过 master，改用独立的 calibBus，避免被环境底噪掩盖
       2. 每个音效自带包络，音量按听感标准化
       3. 所有播放都基于 ctx.currentTime，不依赖 setTimeout 精确同步
       ============================================================ */

    /* 校准通道：独立增益，音量比 master 高 */
    /* ------------------------------------------------------------
       校准通道：带混响的科幻空间
       ------------------------------------------------------------
       关键差异：
       - 干信号与混响信号分开走，避免糊成一团
       - 用短脉冲响应做卷积混响，营造金属舱体回声
       ------------------------------------------------------------ */

    /* 生成一段金属舱体感的脉冲响应 */
    calibIR(seconds) {
      const dur = Math.max(0.2, seconds || 2.2);
      const rate = ctx.sampleRate;
      const len = Math.floor(rate * dur);
      const buf = ctx.createBuffer(2, len, rate);

      for (let ch = 0; ch < 2; ch++) {
        const d = buf.getChannelData(ch);
        for (let i = 0; i < len; i++) {
          const t = i / len;
          /* 前段密集、后段稀疏，模拟金属反射衰减 */
          const decay = Math.pow(1 - t, 2.6);
          /* 叠加早期反射的金属味 */
          const ring = Math.sin(i * 0.017 + ch * 1.7) * 0.35;
          d[i] = (Math.random() * 2 - 1) * decay + ring * decay * 0.4;
        }
      }
      return buf;
    },

    calibBus() {
      if (!ready()) return null;

      if (!calib) {
        /* 干信号总线 */
        calib = ctx.createGain();
        calib.gain.value = 1.0;

        /* 混响支路 */
        const conv = ctx.createConvolver();
        conv.buffer = this.calibIR(2.4);

        const wet = ctx.createGain();
        wet.gain.value = 0.42;          /* 混响湿度 */

        const wetLp = ctx.createBiquadFilter();
        wetLp.type = "lowpass";
        wetLp.frequency.value = 4200;   /* 混响只保留中低频，避免刺耳 */

        calib.connect(ctx.destination);            /* 干声直达 */
        calib.connect(conv);
        conv.connect(wetLp);
        wetLp.connect(wet);
        wet.connect(ctx.destination);              /* 湿声混入 */

        /* 低频轰鸣层：整个动画期间持续，提供压迫感 */
        const drone = ctx.createOscillator();
        drone.type = "sawtooth";
        drone.frequency.value = 38;

        const droneLp = ctx.createBiquadFilter();
        droneLp.type = "lowpass";
        droneLp.frequency.value = 95;
        droneLp.Q.value = 4;

        const droneG = ctx.createGain();
        droneG.gain.value = 0.0001;

        drone.connect(droneLp).connect(droneG).connect(calib);
        drone.start();
        droneG.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + 2.2);

        calibDrone = { osc: drone, gain: droneG };
      }

      duckAmbience(0.06);
      return calib;
    },

    /* 直接向校准通道发包络音 */
    calibTone(freq, dur, type, vol, slideTo, delay) {
      const bus = this.calibBus();
      if (!bus) return;
      const t0 = ctx.currentTime + (delay || 0);
      const osc = ctx.createOscillator();
      const g = ctx.createGain();

      osc.type = type || "sine";
      osc.frequency.setValueAtTime(freq, t0);
      if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);

      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(vol, t0 + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

      osc.connect(g).connect(bus);
      osc.start(t0);
      osc.stop(t0 + dur + 0.03);
    },

    /* 直接向校准通道发噪声 */
    calibNoise(dur, vol, filterHz, delay, type) {
      const bus = this.calibBus();
      if (!bus) return;
      const t0 = ctx.currentTime + (delay || 0);
      const src = ctx.createBufferSource();
      src.buffer = noiseBuffer(dur + 0.05);

      const f = ctx.createBiquadFilter();
      f.type = type || "bandpass";
      f.frequency.value = filterHz || 2400;
      f.Q.value = 0.8;

      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

      src.connect(f).connect(g).connect(bus);
      src.start(t0);
      src.stop(t0 + dur + 0.05);
    },

    /* —— 序列启动：低频下洗 + 舱体嗡鸣 + 气动噪声 —— */
    calibStart() {
      /* 深层下洗，营造「启动」的物理重量 */
      this.calibTone(180, 1.6, "sine", 0.50, 32, 0);
      this.calibTone(90, 2.0, "triangle", 0.34, 28, 0.06);
      /* 金属泛音 */
      this.calibTone(1200, 0.9, "sine", 0.12, 400, 0.15);
      /* 气动噪声，像舱门开启 */
      this.calibNoise(1.3, 0.22, 900, 0, "lowpass");
      /* 高频细闪 */
      this.calibTone(3400, 0.5, "sine", 0.08, 2600, 0.4);
    },

    /* —— 环片飞入：金属碎片吸附 —— */
    calibPiece(delayMs) {
      const d = (delayMs || 0) / 1000;
      const f = 1600 + Math.random() * 2200;
      this.calibTone(f, 0.14, "sine", 0.16, f * 0.75, d);
      /* 偶发金属敲击 */
      if (Math.random() < 0.35) {
        this.calibNoise(0.08, 0.10, 5200, d, "bandpass");
      }
    },

    /* —— 环锁定：强力吸附 + 低频冲击 —— */
    calibRingLock() {
      this.calibTone(220, 1.1, "sawtooth", 0.34, 880, 0);
      this.calibTone(110, 1.3, "sine", 0.40, 55, 0);
      this.calibNoise(0.9, 0.20, 2600, 0, "bandpass");
      this.calibTone(1760, 0.6, "sine", 0.10, 1320, 0.25);
    },

    /* —— 扫描：雷达掠过的窄带啸叫 —— */
    calibScan() {
      this.calibNoise(0.55, 0.20, 3200, 0, "bandpass");
      this.calibTone(2200, 0.5, "sine", 0.12, 900, 0);
      this.calibTone(4400, 0.3, "sine", 0.06, 3000, 0.12);
    },

    /* —— 数据行落定：沉稳的终端确认 —— */
    calibRow() {
      this.calibTone(880, 0.10, "sine", 0.24, null, 0);
      this.calibTone(1320, 0.16, "sine", 0.14, null, 0.05);
      this.calibNoise(0.06, 0.08, 3800, 0, "bandpass");
    },

    /* —— 偏差收敛：音高随剩余量上升 —— */
    calibOffset(remain) {
      const r = Math.max(0, Math.min(119, remain || 0));
      const f = 260 + (1 - r / 119) * 1100;
      this.calibTone(f, 0.11, "sine", 0.18, null, 0);
    },

    /* —— 时钟冲刺：越来越快的脉冲 —— */
    calibRush() {
      this.calibTone(1200, 0.04, "sine", 0.14, null, 0);
      this.calibNoise(0.03, 0.06, 6000, 0, "bandpass");
    },

    /* —— 锁定光爆：多层重磅冲击 —— */
    calibBurst() {
      /* 主爆：极低频砸下 */
      this.calibTone(120, 1.8, "sine", 0.62, 26, 0);
      this.calibTone(300, 1.2, "sawtooth", 0.40, 60, 0.02);
      /* 金属冲击 */
      this.calibTone(2400, 0.5, "sine", 0.26, 700, 0.02);
      /* 上扬撕裂 */
      this.calibTone(600, 1.0, "sine", 0.30, 3200, 0.10);
      /* 宽带噪声爆 */
      this.calibNoise(0.8, 0.34, 5000, 0, "bandpass");
      this.calibNoise(1.4, 0.18, 700, 0.05, "lowpass");
      /* 落地余震 */
      this.calibTone(48, 2.0, "sine", 0.36, null, 0.3);
    },

    /* —— 完成确认：开阔的大三和弦 —— */
    calibDone() {
      const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5];
      notes.forEach((f, i) => {
        this.calibTone(f, 1.2, "sine", 0.24, null, i * 0.075);
      });
      this.calibNoise(0.6, 0.10, 6000, 0, "bandpass");
    },

    /* —— 通信链路建立 —— */
    linkUp() {
      this.calibTone(520, 0.5, "sine", 0.22, 780, 0);
      this.calibTone(1040, 0.7, "sine", 0.18, null, 0.14);
      this.calibNoise(0.5, 0.12, 4200, 0, "bandpass");
    },

    /* —— 动画结束：收掉轰鸣并恢复底噪 —— */
    calibEnd() {
      const t = ctx.currentTime;
      if (calibDrone) {
        try {
          calibDrone.gain.cancelScheduledValues(t);
          calibDrone.gain.exponentialRampToValueAtTime(0.0001, t + 1.4);
          calibDrone.osc.stop(t + 1.6);
        } catch (e) {}
        calibDrone = null;
      }
      duckAmbience(1.0);
      setTimeout(() => {
        if (calib) {
          try { calib.disconnect(); } catch (e) {}
          calib = null;
        }
      }, 1800);
    },

    /* ============================================================
       贺卡（QSL 结局页）音效
       ============================================================ */

    /* —— 贺卡浮现：纸张落定的柔和双音 —— */
    cardAppear() {
      this.calibTone(523.25, 0.9, "sine", 0.30, null, 0);
      this.calibTone(783.99, 1.1, "sine", 0.24, null, 0.12);
      this.calibNoise(0.5, 0.10, 1800, 0);
    },

    /* —— 标题定音：清亮确认 —— */
    cardTitle() {
      this.calibTone(1046.5, 0.55, "sine", 0.26, null, 0);
      this.calibTone(1318.5, 0.7, "sine", 0.18, null, 0.10);
    },

    /* —— 生日快乐主视觉：温暖和弦 —— */
    cardBirthday() {
      this.calibTone(523.25, 1.4, "sine", 0.26, null, 0);
      this.calibTone(659.25, 1.4, "sine", 0.22, null, 0.05);
      this.calibTone(783.99, 1.6, "sine", 0.22, null, 0.10);
      this.calibTone(1046.5, 1.8, "sine", 0.18, null, 0.18);
    },

    /* —— 结尾 73：无线电告别音 —— */
    card73() {
      this.calibTone(880, 0.18, "sine", 0.22, null, 0);
      this.calibTone(1174.7, 0.22, "sine", 0.18, null, 0.12);
    },

    /* —— 清屏（无音效） —— */

    /* —— 结尾光标（极轻） —— */
    blink() {
      tone({ freq: 1800, dur: 0.012, type: "square", vol: 0.05 });
    },
  };

  return api;
})();
