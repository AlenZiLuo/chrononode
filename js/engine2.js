/* ============================================================
   engine2.js — 第二章渲染引擎
   CHRONONODE · 备用授时节点
   ============================================================ */

(() => {
  const out    = document.getElementById("output");
  const clkEl  = document.getElementById("clockval");
  const modal      = document.getElementById("modal");
  const modalBody  = document.getElementById("modalbody");
  const modalClose = document.getElementById("modalclose");
  const modalHead  = document.querySelector(".modal-head span");

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  /* ============================================================
     音效安全代理
     ============================================================ */
  function sfx(name, ...args) {
    try {
      if (typeof Sfx !== "undefined" && Sfx && typeof Sfx[name] === "function") {
        Sfx[name](...args);
      }
    } catch (e) { /* 音频失败不影响游戏 */ }
  }

  /* ============================================================
     推进：自动（tick）与手动（单击）并存
     ============================================================ */
  let paused = false;
  let screenResolve = null;
  let screenTickOK  = true;
  let modalResolve  = null;

  function wakeScreen(force) {
    if (!screenResolve) return;
    if (!force && !screenTickOK) return;
    const r = screenResolve;
    screenResolve = null;
    r();
  }

  function wakeModalWait() {
    if (!modalResolve) return;
    const r = modalResolve;
    modalResolve = null;
    r();
  }

  function onClockTick() {
    if (screenTickOK) wakeScreen();
    wakeModalWait();
  }

  function waitTick() {
    screenTickOK = true;
    return new Promise((res) => { screenResolve = res; });
  }

  function waitClick() {
    screenTickOK = false;
    return new Promise((res) => { screenResolve = res; });
  }

  function waitModalTick() {
    return new Promise((res) => { modalResolve = res; });
  }

  function fireAdvance() {
    if (!modal.classList.contains("hidden")) {
      wakeModalWait();
      return;
    }
    if (paused) return;
    wakeScreen(true);
  }

  document.addEventListener("click", (e) => {
    if (modal && !modal.classList.contains("hidden")) return;
    if (e.target.closest(".prompt-hit")) return;
    if (e.target.closest(".sidemenu")) return;
    fireAdvance();
  });
  document.addEventListener("keydown", (e) => {
    if (modal && !modal.classList.contains("hidden")) return;
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fireAdvance(); }
  });

  /* ============================================================
     时钟（本章：正常走时 + 结尾小故障）
     ============================================================ */
  const Clock = (() => {
    let baseSec = parseToSec(STORY.startTime);
    let tick = 0;

    function parseToSec(s) {
      const [d, t] = s.split(" ");
      const [Y, M, D] = d.split("-").map(Number);
      const [h, m, sec] = t.split(":").map(Number);
      return Date.UTC(Y, M - 1, D, h, m, sec) / 1000;
    }
    function fmt(sec) {
      const dt = new Date(sec * 1000);
      const p = (n) => String(n).padStart(2, "0");
      return `${dt.getUTCFullYear()}-${p(dt.getUTCMonth()+1)}-${p(dt.getUTCDate())} ` +
             `${p(dt.getUTCHours())}:${p(dt.getUTCMinutes())}:${p(dt.getUTCSeconds())}`;
    }
    return {
      now()  { return fmt(baseSec + tick); },
      step(n = 1)   { tick += n; },
      setTime(s)    { baseSec = parseToSec(s); tick = 0; },
    };
  })();

  function paintClock(unverified) {
    clkEl.textContent = Clock.now();
    clkEl.classList.toggle("unverified", !!unverified);
  }

  let clockTimer = null;

  function startClock() {
    if (clockTimer) clearInterval(clockTimer);
    clockTimer = setInterval(() => {
      Clock.step(1);
      paintClock(false);
      sfx("clockTick");
      onClockTick();
    }, 1000);
  }

  /* 时钟倒退故障：00:00:18 → 00:00:17 */
  async function clockGlitch() {
    Clock.setTime("2026-10-13 00:00:18");
    paintClock(true);
    sfx("clockAnomaly");
    await sleep(1200);
    Clock.setTime("2026-10-13 00:00:17");
    paintClock(true);
    await sleep(900);
    paintClock(true);
    sfx("clockFix");
  }

  /* ============================================================
     工具
     ============================================================ */
  function scrollDown() { out.scrollTop = out.scrollHeight; }

  function append(target, cls, html) {
    const n = document.createElement("div");
    n.className = cls;
    n.innerHTML = html;
    target.appendChild(n);
    if (target === out) scrollDown();
    else target.scrollTop = target.scrollHeight;
    return n;
  }

  function esc(s) {
    return String(s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
  }

  /* ============================================================
     全局日志
     ============================================================ */
  const LOG = [];
  function logIt(cls, html) { LOG.push({ cls, html }); }

  function renderFullLog() {
    paused = true;
    isFullLog = true;
    sfx("open");

    modalHead.textContent = "[ 全部日志 · FULL LOG ]";
    modalBody.innerHTML = "";
    modal.classList.remove("hidden");

    const box = document.querySelector(".modal-box");
    if (box) box.classList.add("wide");

    const wrap = document.createElement("div");
    modalBody.appendChild(wrap);

    if (LOG.length === 0) {
      append(wrap, "line dim", "（暂无记录）");
    } else {
      for (const e of LOG) append(wrap, e.cls, e.html);
    }
    modalBody.scrollTop = 0;
  }

  const logBtn = document.getElementById("logbtn");
  if (logBtn) {
    logBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      renderFullLog();
    });
  }

  /* ============================================================
     渲染单行
     ============================================================ */
  function renderLine(item, container) {
    let html = esc(item.t);
    html = html.replace(/__REDACTED__/g, '<span class="redacted">????????</span>');
    html = html.replace(/__CURSOR__/g, "");
    html = html.replace(/&lt;hl&gt;([\s\S]*?)&lt;\/hl&gt;/g, '<span class="hl">$1</span>');
    if (item.amber) html = '<span class="amber">' + html + "</span>";
    if (item.red)   html = '<span class="red">'   + html + "</span>";
    if (item.c)     html = '<span class="' + item.c + '">' + html + "</span>";

    const n = document.createElement("div");
    n.className = "line";
    n.innerHTML = html;
    container.appendChild(n);
    logIt("line", n.innerHTML);
    return n;
  }

  /* ============================================================
     渲染一组
     ============================================================ */
  async function renderGroup(group, container) {
    for (const item of group) {

      if (item.t === "__CLEAR__" || item.t === "__CLOCKGLITCH__" ||
          item.t === "__CURSOR__") continue;

      /* 结尾光标 */
      if (item.t && item.t.includes("__CURSOR__")) {
        const n = document.createElement("div");
        n.className = "line";
        n.innerHTML = '<span class="fg">AWAITING OPERATOR INPUT</span><span class="cursor"></span>';
        container.appendChild(n);
        logIt("line", '<span class="fg">AWAITING OPERATOR INPUT</span>');
        continue;
      }

      /* 弹窗按钮 */
      if (item.hint) {
        const wrap = document.createElement("div");
        wrap.className = "line";
        const btn = document.createElement("button");
        btn.className = "prompt-hit";
        btn.textContent = item.text;
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          openModal(item.open);
        });
        wrap.appendChild(btn);
        container.appendChild(wrap);
        logIt("line", `[${item.text.replace(/[\[\]]/g, "").trim()}]`);
        continue;
      }

      renderLine(item, container);
    }
    scrollDown();
  }

  /* ============================================================
     弹窗（内容以静态列表呈现，逐行淡入）
     ============================================================ */
  let modalWrap = null;
  let modalLineQueue = [];
  let modalLineIdx = 0;
  let isFullLog = false;

  function stopModalScroll() {
    modalLineQueue = [];
    modalLineIdx = 0;
  }

  function modalNext() {
    if (isFullLog) return;
    if (modalLineIdx >= modalLineQueue.length) return;
    const item = modalLineQueue[modalLineIdx++];
    if (item.t && item.t !== "") {
      const n = renderLine(item, modalWrap);
      logIt("line", n.innerHTML);
    } else {
      append(modalWrap, "line", "&nbsp;");
      logIt("line", "&nbsp;");
    }
    modalBody.scrollTop = modalBody.scrollHeight;
  }

  async function runModalAuto() {
    modalNext();
    while (!modal.classList.contains("hidden") && modalLineIdx < modalLineQueue.length) {
      await waitModalTick();
      if (modal.classList.contains("hidden")) return;
      modalNext();
    }
  }

  function openModal(key) {
    const data = STORY.modals && STORY.modals[key];
    if (!data) return;

    isFullLog = false;
    paused = true;
    sfx("open");

    logIt("line dim", "──── " + data.title + " ────");

    modalHead.textContent = "[ " + data.title + " ]";
    modalBody.innerHTML = "";
    modal.classList.remove("hidden");

    modalLineQueue = (data.lines || []).slice();
    modalLineIdx = 0;

    modalWrap = document.createElement("div");
    modalBody.appendChild(modalWrap);
    modalBody.scrollTop = 0;

    runModalAuto();
  }

  function closeModal() {
    stopModalScroll();
    modal.classList.add("hidden");
    const box = document.querySelector(".modal-box");
    if (box) box.classList.remove("wide");
    modalBody.innerHTML = "";
    modalWrap = null;
    isFullLog = false;
    paused = false;
    modalResolve = null;
    sfx("close");
  }

  modalClose.addEventListener("click", (e) => { e.stopPropagation(); closeModal(); });
  modal.addEventListener("click", (e) => { if (e.target === modal) closeModal(); });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modal && !modal.classList.contains("hidden")) closeModal();
  });
  modalBody.addEventListener("click", (e) => { e.stopPropagation(); });

  /* ============================================================
     播放
     ============================================================ */
  let liveWrap = null;

  async function play(script) {
    liveWrap = document.createElement("div");
    out.appendChild(liveWrap);

    for (let i = 0; i < script.length; i++) {
      const group = script[i];

      /* ---- 控制指令 ---- */
      if (!Array.isArray(group)) {
        const a = group.t;

        if (a === "__CLEAR__") {
          await waitClick();
          out.classList.add("clearing");
          await sleep(220);
          out.innerHTML = "";
          out.classList.remove("clearing");
          liveWrap = document.createElement("div");
          out.appendChild(liveWrap);
          continue;
        }

        if (a === "__CLOCKGLITCH__") {
          await clockGlitch();
          continue;
        }

        continue;
      }

      /* ---- 内容组 ---- */
      await renderGroup(group, liveWrap);

      if (i < script.length - 1) await waitTick();
    }
  }

  /* ============================================================
     启动：等待首次单击
     ============================================================ */
  let booted = false;

  function boot() {
    if (booted) return;
    booted = true;
    out.innerHTML = "";
    play(STORY.chapter2);
  }

  window.addEventListener("load", () => {
    paintClock(false);
    startClock();

    liveWrap = document.createElement("div");
    out.appendChild(liveWrap);
    liveWrap.innerHTML =
      '<div class="line dim">──────────────────────────</div>' +
      '<div class="line cyan bold">CHRONONODE</div>' +
      '<div class="line dim">备用授时节点 · 恢复环境</div>' +
      '<div class="line dim">──────────────────────────</div>' +
      '<div class="line">&nbsp;</div>' +
      '<div class="line green bold">[ 单击屏幕开始 ]<span class="cursor"></span></div>';
  });

  document.addEventListener("click", (e) => {
    if (booted) return;
    if (e.target.closest(".sidemenu")) return;
    boot();
  }, true);
  document.addEventListener("keydown", (e) => {
    if (booted) return;
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); boot(); }
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

  /* ============================================================
     音频启动 + 首次手势解锁
     ============================================================ */
  if (typeof Sfx !== "undefined" && Sfx) {
    if (document.readyState !== "complete") {
      document.addEventListener("DOMContentLoaded", () => Sfx.autostart(), { once: true });
    } else {
      Sfx.autostart();
    }

    ["click", "keydown", "touchstart", "mousemove", "pointerdown"].forEach((ev) =>
      window.addEventListener(ev, () => Sfx.unlock(), { once: true }));
  }
})();
