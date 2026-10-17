/* ============================================================
   chapter4.js — 第四章
   INCOMING TRANSMISSION · 消息接收 · QSL 结局

   独立可运行：不依赖第三章、不依赖任何状态机。
   流程严格线性：
     等待点击 → 来信提示 → 数据包 → 子洛消息
     → VIEW FINAL TRANSMISSION → 过渡 → QSL 生日页 → 结束
   ============================================================ */

(() => {
  "use strict";

  /* ============================================================
     DOM
     ============================================================ */
  const out        = document.getElementById("output");
  const clkEl      = document.getElementById("clockval");
  const nodeState  = document.getElementById("nodeState");
  const modal      = document.getElementById("modal");
  const modalBody  = document.getElementById("modalbody");
  const modalHead  = document.getElementById("modalhead");
  const modalClose = document.getElementById("modalclose");

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  function sfx(name) {
    try {
      if (typeof Sfx !== "undefined" && Sfx && typeof Sfx[name] === "function") {
        Sfx[name]();
      }
    } catch (e) { /* 音频失败不影响流程 */ }
  }

  /* ============================================================
     剧本数据
     ============================================================ */
  const T = "2026-10-13";

  const MESSAGES = [
    {
      id: "M-01",
      title: "个人消息 · 子洛",
      sender: "ZILUO",
      senderCn: "子洛",
      meta: [
        ["CHANNEL", "PERSONAL"],
        ["SENDER ", "ZILUO · 子洛"],
        ["STATUS ", "DELIVERED · 已送达"],
        ["TIME   ", T + " 01:02:41"],
      ],
      body: [
        "呼，终于恢复了。",
        "我还以为你要在那个终端里待上好久呢。",
        "",
        "辛苦啦，兰雾。",
        "你真的一步一步把它修好了。",
      ],
      sig: "—— 子洛",
    },
  ];

  const QSL = {
    head:   "CHRONONODE",
    sub:    "COMMUNICATION RESTORED",
    sep:    "──────────────────────────",
    hb:     "HAPPY BIRTHDAY",
    hbCn:   "生 日 快 乐",
    to:     "To Lanwu",
    wish:   "愿你的时间，一直走得准。",
    l73:    "73 · Best wishes",
    quote:  "Some signals take time to reach us.<br>Some connections are worth restoring.",
    done:   "END OF TRANSMISSION",
    tail:   "第四章 完 · CHAPTER 4 COMPLETE",
  };

  /* ============================================================
     终端输出
     ============================================================ */
  let inner = null;
  const LOG = [];

  function ensureInner() {
    if (!inner || !out.contains(inner)) {
      inner = document.createElement("div");
      inner.className = "c4-inner";
      out.appendChild(inner);
    }
    return inner;
  }

  const scrollDown = () => { out.scrollTop = out.scrollHeight; };

  const esc = (s) => String(s).replace(/[&<>]/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));

  function addLine(text, cls) {
    const n = document.createElement("div");
    n.className = "c4-line" + (cls ? " " + cls : "");
    n.textContent = text === "" ? "\u00a0" : text;
    ensureInner().appendChild(n);
    LOG.push(cls ? `<span class="${cls}">${esc(text)}</span>` : esc(text));
    scrollDown();
    return n;
  }

  function addRaw(html) {
    const n = document.createElement("div");
    n.className = "c4-line";
    n.innerHTML = html;
    ensureInner().appendChild(n);
    LOG.push(html);
    scrollDown();
    return n;
  }

  function clearScreen() {
    out.innerHTML = "";
    inner = null;
    ensureInner();
  }

  function addGap() {
    const n = document.createElement("div");
    n.className = "c4-gap";
    ensureInner().appendChild(n);
    scrollDown();
    return n;
  }

  /* ============================================================
     推进控制
     ------------------------------------------------------------
     只有 waitForClick 期间点击才推进；交互期间点击完全无效。
     ============================================================ */
  let clickWaiter = null;
  let accepting = false;   // 是否接受推进点击

  function waitForClick() {
    accepting = true;
    return new Promise((res) => { clickWaiter = res; });
  }

  function tryAdvance() {
    if (!accepting) return;
    if (!clickWaiter) return;
    const r = clickWaiter;
    clickWaiter = null;
    accepting = false;
    r();
  }

  /* 全局点击：排除侧栏、按钮、弹窗 */
  document.addEventListener("click", (e) => {
    if (e.target.closest(".sidemenu")) return;
    if (e.target.closest(".c4-act")) return;
    if (e.target.closest(".modal")) return;
    if (modal && !modal.classList.contains("hidden")) return;
    tryAdvance();
  });

  document.addEventListener("keydown", (e) => {
    if (modal && !modal.classList.contains("hidden")) {
      if (e.key === "Escape") closeModal();
      return;
    }
    if (e.target && (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA")) return;
    if (e.target && e.target.tagName === "BUTTON") return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      tryAdvance();
    }
  });

  /* ============================================================
     按钮：独立组件，点击只触发自己的回调
     ============================================================ */
  function createButton(label, opts) {
    const o = opts || {};
    const row = document.createElement("div");
    row.className = "c4-actbar";
    ensureInner().appendChild(row);

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "c4-act" + (o.final ? " final" : "");
    btn.textContent = label;
    row.appendChild(btn);
    scrollDown();
    return btn;
  }

  /* 点击一次后自行禁用 */
  function waitButton(label, opts) {
    return new Promise((resolve) => {
      const btn = createButton(label, opts);
      accepting = false;

      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        if (btn.disabled) return;
        btn.disabled = true;
        sfx("clockFix");
        resolve(true);
      });
    });
  }

  /* ============================================================
     弹窗
     ============================================================ */
  let modalWaiter = null;

  function openMessage(msg) {
    return new Promise((resolve) => {
      modalWaiter = resolve;
      accepting = false;
      sfx("open");

      LOG.push(`<span class="mute">──── ${esc(msg.title)} ────</span>`);

      modalHead.textContent = "[ " + msg.title + " ]";
      modalBody.innerHTML = "";

      const letter = document.createElement("div");
      letter.className = "c4-letter";

      const meta = document.createElement("div");
      meta.className = "lt-meta";
      meta.textContent = msg.meta
        .map(([k, v]) => k + "  " + v)
        .join("\n");
      letter.appendChild(meta);

      const body = document.createElement("div");
      body.className = "lt-body";
      msg.body.forEach((line) => {
        const p = document.createElement("p");
        p.textContent = line === "" ? "\u00a0" : line;
        body.appendChild(p);
        LOG.push(`<span class="hi">${esc(line)}</span>`);
      });
      letter.appendChild(body);

      const sig = document.createElement("div");
      sig.className = "lt-sig";
      sig.textContent = msg.sig;
      letter.appendChild(sig);

      modalBody.appendChild(letter);
      modal.classList.remove("hidden");
      modalBody.scrollTop = 0;
    });
  }

  function closeModal() {
    if (modal.classList.contains("hidden")) return;
    modal.classList.add("hidden");
    modalBody.innerHTML = "";
    sfx("close");

    const r = modalWaiter;
    modalWaiter = null;
    if (r) r();
  }

  modalClose.addEventListener("click", (e) => {
    e.stopPropagation();
    closeModal();
  });
  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeModal();
  });
  modalBody.addEventListener("click", (e) => e.stopPropagation());

  /* 全部日志 */
  function openFullLog() {
    accepting = false;
    sfx("open");
    modalHead.textContent = "[ 全部日志 · FULL LOG ]";
    modalBody.innerHTML = "";

    const wrap = document.createElement("div");
    modalBody.appendChild(wrap);

    if (LOG.length === 0) {
      const n = document.createElement("div");
      n.className = "c4-line dimt";
      n.textContent = "（暂无记录）";
      wrap.appendChild(n);
    } else {
      LOG.forEach((html) => {
        const n = document.createElement("div");
        n.className = "c4-line";
        n.innerHTML = html;
        wrap.appendChild(n);
      });
    }

    modal.classList.remove("hidden");
    modalBody.scrollTop = 0;
    /* 日志弹窗不产生 modalWaiter，关闭时自然返回 */
  }

  document.getElementById("logbtn").addEventListener("click", (e) => {
    e.stopPropagation();
    openFullLog();
  });

  /* ============================================================
     时钟
     ============================================================ */
  let clockSec = 1 * 3600 + 2 * 60 + 33;   // 2026-10-13 01:02:33
  let clockTimer = null;

  function startClock() {
    clockSec = 1 * 3600 + 2 * 60 + 33;
    paintClock();
    clockTimer = setInterval(() => {
      clockSec += 1;
      paintClock();
      sfx("clockTick");
    }, 1000);
  }

  function stopClock() {
    if (clockTimer) { clearInterval(clockTimer); clockTimer = null; }
  }

  function paintClock() {
    const h = Math.floor(clockSec / 3600) % 24;
    const m = Math.floor(clockSec / 60) % 60;
    const s = clockSec % 60;
    const p = (n) => String(n).padStart(2, "0");
    clkEl.textContent = T + " " + p(h) + ":" + p(m) + ":" + p(s);
  }

  /* ============================================================
     流程阶段标记：供自动化验证精确采样
     （只读钩子，不参与游戏逻辑）
     ============================================================ */
  window.CH4_STAGE = "BOOT";
  window.CH4_STAGE_LOG = ["BOOT"];
  function stage(name) {
    window.CH4_STAGE = name;
    window.CH4_STAGE_LOG.push(name);
  }

  /* ============================================================
     过渡动画
     ============================================================ */
  async function playTransition() {
    const layer = document.createElement("div");
    layer.className = "c4-transition";
    layer.innerHTML =
      '<div class="tr-label">ACQUIRING FINAL TRANSMISSION</div>' +
      '<div class="tr-bar"><div class="tr-fill"></div></div>' +
      '<div class="tr-wave">▁▂▃▄▅▆▇█▇▆▅▄▃▂▁</div>' +
      '<div class="tr-label" style="color:#949494;font-size:12px;">握手 · HANDSHAKE</div>';
    document.body.appendChild(layer);

    await sleep(40);
    layer.classList.add("in");
    await sleep(520);

    const fill = layer.querySelector(".tr-fill");
    fill.style.width = "100%";

    /* 波形动画 */
    const wave = layer.querySelector(".tr-wave");
    const frames = [
      "▁▂▃▄▅▆▇█▇▆▅▄▃▂▁",
      "▂▃▄▅▆▇█▇▆▅▄▃▂▁▂",
      "▃▄▅▆▇█▇▆▅▄▃▂▁▂▃",
      "▄▅▆▇█▇▆▅▄▃▂▁▂▃▄",
      "▅▆▇█▇▆▅▄▃▂▁▂▃▄▅",
    ];
    let fi = 0;
    const waveTimer = setInterval(() => {
      wave.textContent = frames[fi++ % frames.length];
    }, 110);

    await sleep(1150);
    clearInterval(waveTimer);
    wave.textContent = "▁▂▃▄▅▆▇█▇▆▅▄▃▂▁  SIGNAL LOCKED";
    sfx("clockFix");
    await sleep(620);

    return layer;
  }

  /* ============================================================
     QSL 结局页
     ============================================================ */

  /* 无线电信号塔图标（线条风格，跟随字体色） */
  const TOWER_SVG =
    '<svg viewBox="0 0 48 48" width="34" height="34" fill="none" ' +
    'stroke="currentColor" stroke-width="1.6" stroke-linecap="round" ' +
    'stroke-linejoin="round" aria-hidden="true">' +
      /* 塔身 */
      '<path d="M24 40 L20 18 L28 18 Z"/>' +
      '<path d="M21.2 30 L26.8 30"/>' +
      /* 顶部发射点 */
      '<circle cx="24" cy="14" r="2.2"/>' +
      /* 左右信号弧 */
      '<path d="M17.5 10.5 A9 9 0 0 1 17.5 17.5"/>' +
      '<path d="M30.5 10.5 A9 9 0 0 0 30.5 17.5"/>' +
      '<path d="M13 6.5 A15 15 0 0 1 13 21.5"/>' +
      '<path d="M35 6.5 A15 15 0 0 0 35 21.5"/>' +
      /* 塔基横线 */
      '<path d="M15 40 L33 40"/>' +
    '</svg>';

  /* 下载图标（向下箭头 + 托盘） */
  const DL_SVG =
    '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" ' +
    'stroke="currentColor" stroke-width="1.8" stroke-linecap="round" ' +
    'stroke-linejoin="round" aria-hidden="true">' +
      '<path d="M12 4 L12 15"/>' +
      '<path d="M7.5 10.5 L12 15 L16.5 10.5"/>' +
      '<path d="M4.5 19 L19.5 19"/>' +
    '</svg>';

  function showQsl(transLayer) {
    stopClock();

    const page = document.createElement("div");
    page.className = "c4-qsl";
    page.innerHTML =
      '<div class="c4-qsl-inner">' +
        '<div class="c4-qsl-card">' +
          /* 顶部信息条：左档案标识，右信号塔图标 */
          '<div class="q-top">' +
            '<span class="q-top-l">' + esc(QSL.head) + ' · TRANSMISSION ARCHIVE</span>' +
            '<span class="q-top-r">' + TOWER_SVG + '</span>' +
          '</div>' +

          /* 主标题区 */
          '<div class="q-sub">'      + esc(QSL.sub)   + '</div>' +
          '<div class="q-sep">'      + esc(QSL.sep)   + '</div>' +

          /* 主视觉 */
          '<div class="q-hb">'       + esc(QSL.hb)    + '</div>' +
          '<div class="q-hb-cn">'    + esc(QSL.hbCn)  + '</div>' +

          /* 正文 */
          '<div class="q-to">'       + esc(QSL.to)    + '</div>' +
          '<div class="q-wish">'     + esc(QSL.wish)  + '</div>' +
          '<div class="q-73">'       + esc(QSL.l73)   + '</div>' +
          '<div class="q-quote">'    + QSL.quote      + '</div>' +

          /* 音频下载 */
          '<div class="q-dl">' +
            '<a class="q-dl-btn" href="audio/timeline.mp3" download="Timeline.mp3">' +
              '<span class="q-dl-ico">' + DL_SVG + '</span>' +
              '<span class="q-dl-txt">下载音频 · DOWNLOAD AUDIO</span>' +
            '</a>' +
          '</div>' +

          /* 底部信息条 */
          '<div class="q-foot">' +
            '<span class="q-foot-l">' + esc(QSL.done) + '</span>' +
            '<span class="q-foot-r">' + esc(QSL.tail) + '</span>' +
          '</div>' +
        '</div>' +

        /* 制作总结 */
        '<div class="q-stats">' +
          '<div class="qs-hd">PRODUCTION SUMMARY · 制作总结</div>' +
          '<div class="qs-grid">' +
            '<div class="qs-item"><span class="qs-k">耗时</span><span class="qs-v">&lt; 48 h</span></div>' +
            '<div class="qs-item"><span class="qs-k">文件</span><span class="qs-v">12</span></div>' +
            '<div class="qs-item"><span class="qs-k">体积</span><span class="qs-v">4,565,027 B</span></div>' +
            '<div class="qs-item"><span class="qs-k">Token</span><span class="qs-v">603,797,978</span></div>' +
            '<div class="qs-item"><span class="qs-k">API 调用</span><span class="qs-v">2,354</span></div>' +
            '<div class="qs-item"><span class="qs-k">语言</span><span class="qs-v">HTML · CSS · JS</span></div>' +
          '</div>' +
        '</div>' +
      '</div>';
    document.body.appendChild(page);

    /* 淡出过渡层，淡入结局页 */
    if (transLayer) {
      transLayer.style.transition = "opacity .7s ease";
      transLayer.style.opacity = "0";
    }

    setTimeout(() => {
      page.classList.add("in");
      if (transLayer && transLayer.parentNode) {
        transLayer.parentNode.removeChild(transLayer);
      }

      /* 贺卡进场音效，与逐条淡入的时间点对齐 */
      sfx("cardAppear");                              /* .15s  顶部信息条 */
      setTimeout(() => sfx("cardTitle"), 400);        /* .55s  主标题 */
      setTimeout(() => sfx("cardBirthday"), 950);     /* 1.10s HAPPY BIRTHDAY */
      setTimeout(() => sfx("card73"), 2700);          /* 2.85s 73 · Best wishes */
    }, 120);

  }

  /* ============================================================
     分组节奏（参考序章）
     一组内容一次显示完，玩家单击推进到下一组
     ============================================================ */
  async function showGroup(lines) {
    lines.forEach(([text, cls]) => addLine(text, cls));
    scrollDown();
    await waitForClick();
  }

  async function showGap() {
    addGap();
    await waitForClick();
  }

  /* ============================================================
     主流程
     ============================================================ */
  async function play() {
    /* ---------- 1. 来信提示（分组逐条显示） ---------- */
    stage("INCOMING");

    await showGroup([
      ["────────────────────────────────────────────", "mute"],
      ["[INCOMING TRANSMISSION]", "hi"],
    ]);

    await showGroup([
      ["  信道 CHANNEL   PERSONAL · 个人信道", ""],
      ["  承载 CARRIER   STABLE", "ok"],
      ["  来源 SOURCE    REMOTE OPERATOR", "dimt"],
    ]);

    await showGroup([
      ["────────────────────────────────────────────", "mute"],
    ]);

    clearScreen();

    /* ---------- 2. 通信已恢复 ---------- */
    stage("RESTORED");

    await showGroup([
      ["[INFO] COMMUNICATION RESTORED", "ok"],
      ["[INFO] 通信已恢复", "dimt"],
    ]);

    /* ---------- 3. 数据包已接收 ---------- */
    stage("PACKET");

    await showGroup([
      ["[INFO] DATA PACKET RECEIVED", "ok"],
      ["[INFO] 数据包已接收", "dimt"],
    ]);

    /* 数据包详情：一组一次显示 */
    const packet = document.createElement("div");
    packet.className = "c4-packet";
    packet.innerHTML =
      '<div class="pk-row"><span class="pk-k">PACKET ID</span>' +
        '<span class="pk-v">TX-2026-1013-02</span></div>' +
      '<div class="pk-row"><span class="pk-k">CHANNEL</span>' +
        '<span class="pk-v">PERSONAL</span></div>' +
      '<div class="pk-row"><span class="pk-k">INTEGRITY</span>' +
        '<span class="pk-v ok">PASSED · 校验通过</span></div>' +
      '<div class="pk-row"><span class="pk-k">CONTENTS</span>' +
        '<span class="pk-v warn">1 MESSAGE · 1 条消息</span></div>' +
      '<div class="pk-row"><span class="pk-k">STATUS</span>' +
        '<span class="pk-v ok">DELIVERED · 已送达</span></div>';
    ensureInner().appendChild(packet);
    scrollDown();
    LOG.push("──── 数据包 TX-2026-1013-02 ────");
    await waitForClick();

    clearScreen();

    /* ---------- 4. 消息 ---------- */
    for (const msg of MESSAGES) {
      stage("MESSAGE_" + msg.id);

      await showGroup([
        ["[MESSAGE] " + msg.id + " · " + msg.senderCn, "hi"],
      ]);

      await showGroup([
        ["  SENDER   " + msg.sender, "dimt"],
        ["  STATUS   DELIVERED", "ok"],
      ]);

      await waitButton("[ 打开消息 · OPEN MESSAGE ]");
      await openMessage(msg);

      clearScreen();
    }

    /* ---------- 5. VIEW FINAL TRANSMISSION ---------- */
    stage("FINAL_PROMPT");

    await showGroup([
      ["────────────────────────────────────────────", "mute"],
      ["  ALL MESSAGES READ", "hi"],
      ["  所有消息已读", "dimt"],
    ]);

    await showGroup([
      ["[INFO] 1 FINAL TRANSMISSION PENDING", "warn"],
      ["[INFO] 还有 1 条最终传输待接收", "warn"],
    ]);

    await showGroup([
      ["────────────────────────────────────────────", "mute"],
    ]);

    await waitButton("VIEW FINAL TRANSMISSION", { final: true });

    /* ---------- 6. 过渡动画 ---------- */
    clearScreen();
    stage("TRANSITION");
    const transLayer = await playTransition();

    /* ---------- 7. QSL 生日页 ---------- */
    stage("QSL");
    showQsl(transLayer);

    /* ---------- 8. 结束，不再追加任务 ---------- */
    stage("END");
  }

  /* ============================================================
     启动
     ============================================================ */
  let booted = false;

  function boot() {
    if (booted) return;
    booted = true;

    out.innerHTML = "";
    inner = null;
    ensureInner();

    startClock();
    if (nodeState) nodeState.textContent = "COMMUNICATION: NORMAL";

    stage("RUNNING");
    play();
  }

  /* 启动画面 */
  window.addEventListener("load", () => {
    ensureInner();
    paintClock();

    addLine("──────────────────────────", "mute");
    addLine("CHRONONODE", "hi");
    addLine("INCOMING TRANSMISSION · 来信", "dimt");
    addLine("──────────────────────────", "mute");
    addGap();
    addRaw('<span class="ok">[ 单击屏幕开始 ]</span><span class="cursor"></span>');
    LOG.length = 0;

    accepting = false;
  });

  document.addEventListener("click", (e) => {
    if (booted) return;
    if (e.target.closest(".sidemenu")) return;
    boot();
  }, true);

  document.addEventListener("keydown", (e) => {
    if (booted) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      boot();
    }
  }, true);

  /* ============================================================
     音效开关
     ============================================================ */
  const soundBtn   = document.getElementById("soundbtn");
  const soundIcon  = document.getElementById("soundicon");
  const soundLabel = document.getElementById("soundlabel");

  if (soundBtn) {
    soundBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (typeof Sfx === "undefined" || !Sfx) return;
      const on = !Sfx.isEnabled();
      Sfx.setEnabled(on);
      if (on) { Sfx.unlock(); Sfx.tick(); }
      if (soundIcon)  soundIcon.textContent  = on ? "[♪]" : "[×]";
      if (soundLabel) soundLabel.textContent = on ? "音效 开" : "音效 关";
    });
  }

  if (typeof Sfx !== "undefined" && Sfx) {
    if (document.readyState !== "complete") {
      document.addEventListener("DOMContentLoaded", () => Sfx.autostart(), { once: true });
    } else {
      Sfx.autostart();
    }
    ["click", "keydown", "touchstart", "pointerdown"].forEach((ev) =>
      window.addEventListener(ev, () => Sfx.unlock(), { once: true }));
  }
})();
