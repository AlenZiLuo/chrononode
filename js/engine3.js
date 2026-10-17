/* ============================================================
   engine3.js — 第三章引擎（重写版）
   REFERENCE ZERO · 历史授时归档恢复

   设计要点（本轮重写的核心）
   ------------------------------------------------------------
   1. 唯一推进状态机：waitState 只有一个值
        IDLE | WAITING_CLICK | WAITING_MODAL
      不再有 blocked / advanceResolver / pendingAdvance 三个标志互相干扰
   2. 所有交互组件都是「同步创建 DOM + 返回 Promise」，
      创建完成后立刻进入 WAITING_CLICK，不存在创建期间丢点击的窗口
   3. 主循环只有一条：runState → resolveNext → 前进
   ============================================================ */

(() => {
  "use strict";

  /* ============================================================
     DOM
     ============================================================ */
  const out      = document.getElementById("output");
  const clkEl    = document.getElementById("clockval");
  const modal    = document.getElementById("modal");
  const modalBody= document.getElementById("modalbody");
  const modalClose = document.getElementById("modalclose");
  const modalHead  = document.querySelector(".modal-head span");
  const nodeState  = document.getElementById("nodeState");

  const spTimeRef  = document.getElementById("spTimeRef");
  const spLocalClk = document.getElementById("spLocalClk");
  const spComm     = document.getElementById("spComm");
  const spMainNode = document.getElementById("spMainNode");

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  function sfx(name, ...args) {
    try {
      if (typeof Sfx !== "undefined" && Sfx && typeof Sfx[name] === "function") {
        Sfx[name](...args);
      }
    } catch (e) { /* 音频失败不影响游戏 */ }
  }

  /* ============================================================
     推进状态机（唯一真相）
     ------------------------------------------------------------
     两种推进源并存：点击（click）与时钟 tick（tick）。
     关键约定：
     1. 渲染阶段（IDLE）不接收任何推进，避免“连过多个状态”
     2. 只有显式调用 waitAdvance() 的瞬间才开始接收
     3. 不设任何“欠账”缓冲：没人在等时的点击一律丢弃
     ============================================================ */
  const WAIT = {
    IDLE:          "IDLE",           // 正在渲染，忽略推进
    WAITING_CLICK: "WAITING_CLICK",  // 等点击或 tick
    WAITING_MODAL: "WAITING_MODAL",  // 等弹窗关闭
  };

  let waitState = WAIT.IDLE;
  let advanceResolver = null;
  let modalResolver = null;

  function setWait(s) { waitState = s; }

  /* 等待推进：点击 或 时钟 tick 任一到达即可 */
  function waitAdvance() {
    /* 先回到 IDLE 再挂载，保证渲染期间不会误触发 */
    setWait(WAIT.WAITING_CLICK);
    return new Promise((res) => { advanceResolver = res; });
  }

  /* 等待弹窗关闭（仅供需要阻塞的流程使用） */
  function waitModalClose() {
    setWait(WAIT.WAITING_MODAL);
    return new Promise((res) => { modalResolver = res; });
  }

  /* 推进触发（点击与 tick 共用） */
  function fireAdvance() {
    if (waitState !== WAIT.WAITING_CLICK) return;
    const r = advanceResolver;
    if (!r) return;
    advanceResolver = null;
    setWait(WAIT.IDLE);
    r();
  }

  /* 时钟每秒回调：既走时，也作为推进源 */
  function onTick() {
    fireAdvance();
  }

  /* ============================================================
     输入事件
     ============================================================ */
  document.addEventListener("click", (e) => {
    /* 侧边栏、交互控件、输入区一律不触发推进 */
    if (e.target.closest(".sidemenu")) return;
    if (e.target.closest(".c3-act")) return;
    if (e.target.closest(".c3-archcard")) return;
    if (e.target.closest(".c3-input")) return;
    if (e.target.closest(".c3-field")) return;
    if (modal && !modal.classList.contains("hidden")) return;
    fireAdvance();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (modal && !modal.classList.contains("hidden")) closeModal();
      return;
    }
    if (e.target && (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA")) return;
    if (e.target && e.target.tagName === "BUTTON") return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (modal && !modal.classList.contains("hidden")) return;
      fireAdvance();
    }
  });

  /* ============================================================
     时钟
     ============================================================ */
  const Clock = (() => {
    let baseSec = parseToSec(STORY.startTime);
    let tick = 0;
    let raw = null;
    let timer = null;

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
      now() { return raw || fmt(baseSec + tick); },
      setTime(s) { baseSec = parseToSec(s); tick = 0; raw = null; paint(false); },
      setRaw(s)  { raw = s; paint(true); },
      step(n = 1) { tick += n; },
      start() {
        if (timer) clearInterval(timer);
        timer = setInterval(() => {
          tick += 1;
          paint(false);
          sfx("clockTick");
        }, 1000);
      },
      stop() { if (timer) { clearInterval(timer); timer = null; } },
    };
  })();

  function paint(bad) {
    clkEl.textContent = Clock.now();
    clkEl.classList.toggle("unverified", !!bad);
  }

  /* ============================================================
     侧边状态面板
     ============================================================ */
  function setPanel(key, textValue, cls) {
    const map = { timeRef: spTimeRef, localClk: spLocalClk, comm: spComm, mainNode: spMainNode };
    const el = map[key];
    if (!el) return;
    el.textContent = textValue;
    el.className = "sp-v" + (cls ? " " + cls : "");
  }

  /* ============================================================
     输出
     ============================================================ */
  let inner = null;
  const LOG = [];

  function logIt(html) { LOG.push(html); }

  function ensureInner() {
    if (!inner || !out.contains(inner)) {
      inner = document.createElement("div");
      inner.className = "c3-out-inner";
      out.appendChild(inner);
    }
    return inner;
  }

  const scrollDown = () => { out.scrollTop = out.scrollHeight; };

  const esc = (s) => String(s).replace(/[&<>]/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));

  function addLine(textValue, cls) {
    const n = document.createElement("div");
    n.className = "c3-line" + (cls ? " " + cls : "");
    n.textContent = textValue === "" ? "\u00a0" : textValue;
    ensureInner().appendChild(n);
    logIt(cls ? `<span class="${cls}">${esc(textValue)}</span>` : esc(textValue));
    scrollDown();
    return n;
  }

  /* ============================================================
     分条播放
     ------------------------------------------------------------
     逐行输出，每行之间停顿，节奏按内容类型区分：
       - 空行 / 分隔线：短
       - 标题（hi）：稍长，像开机逐字打印
       - 普通正文：标准
       - 告警 / 结果（ok bad warn）：略长，让人看清
     点击或时钟 tick 不会打断分条播放。
     ============================================================ */
  function paceFor(line) {
    const t = line.t || "";
    const cls = line.cls || "";

    if (t === "") return 55;                    // 空行
    if (/^[─━═\-—_]{6,}$/.test(t.trim())) return 90;  // 分隔线
    if (cls === "hi") return 180;               // 大标题
    if (cls === "bad" || cls === "warn") return 165;
    if (cls === "ok") return 150;
    if (cls === "mute" || cls === "dimt") return 85;
    return 115;                                  // 普通正文
  }

  async function playLines(lines) {
    if (!Array.isArray(lines) || lines.length === 0) return;

    for (let i = 0; i < lines.length; i++) {
      addLine(lines[i].t, lines[i].cls);
      /* 最后一行不额外等，交给后续流程 */
      if (i < lines.length - 1) {
        await sleep(paceFor(lines[i]));
      }
    }
  }

  function addRaw(html) {
    const n = document.createElement("div");
    n.className = "c3-line";
    n.innerHTML = html;
    ensureInner().appendChild(n);
    logIt(html);
    scrollDown();
    return n;
  }

  function clearScreen() {
    out.innerHTML = "";
    inner = null;
    ensureInner();
  }

  /* ============================================================
     弹窗
     ============================================================ */
  let modalIsLog = false;

  function renderLines(items, container) {
    items.forEach((item) => {
      const n = document.createElement("div");
      n.className = "c3-line" + (item.cls ? " " + item.cls : "");
      n.textContent = item.t === "" ? "\u00a0" : item.t;
      container.appendChild(n);
      logIt(item.cls ? `<span class="${item.cls}">${esc(item.t)}</span>` : esc(item.t));
    });
  }

  function openModal(key) {
    const data = STORY.modals && STORY.modals[key];
    if (!data) { console.warn("[engine3] 弹窗不存在:", key); return; }

    modalIsLog = false;
    sfx("open");
    logIt(`<span class="mute">──── ${esc(data.title)} ────</span>`);

    modalHead.textContent = "[ " + data.title + " ]";
    modalBody.innerHTML = "";

    const wrap = document.createElement("div");
    modalBody.appendChild(wrap);
    renderLines(data.lines || [], wrap);

    modal.classList.remove("hidden");
    modalBody.scrollTop = 0;

    /* 注意：这里不碰 waitState / waitModalClose。
       弹窗只是附层，不能抢占主循环的推进等待，
       否则「开弹窗→关弹窗」会把主循环的等待者冲掉导致卡死。
       打开期间屏幕点击由事件器直接忽略，不需要额外状态。 */
  }

  function openFullLog() {
    modalIsLog = true;
    sfx("open");
    modalHead.textContent = "[ 全部日志 · FULL LOG ]";
    modalBody.innerHTML = "";

    const wrap = document.createElement("div");
    modalBody.appendChild(wrap);

    if (LOG.length === 0) {
      const n = document.createElement("div");
      n.className = "c3-line dimt";
      n.textContent = "（暂无记录）";
      wrap.appendChild(n);
    } else {
      LOG.forEach((html) => {
        const n = document.createElement("div");
        n.className = "c3-line";
        n.innerHTML = html;
        wrap.appendChild(n);
      });
    }

    modal.classList.remove("hidden");
    modalBody.scrollTop = 0;
  }

  function closeModal() {
    if (modal.classList.contains("hidden")) return;

    modal.classList.add("hidden");
    modalBody.innerHTML = "";
    sfx("close");

    if (modalIsLog) { modalIsLog = false; return; }

    /* 只有显式等待弹窗关闭的流程（如 INIT_RECOVERY）才唤醒 */
    if (waitState === WAIT.WAITING_MODAL) {
      const r = modalResolver;
      modalResolver = null;
      setWait(WAIT.IDLE);
      if (r) r();
    }
  }

  modalClose.addEventListener("click", (e) => { e.stopPropagation(); closeModal(); });
  modal.addEventListener("click", (e) => { if (e.target === modal) closeModal(); });
  modalBody.addEventListener("click", (e) => e.stopPropagation());

  const logBtn = document.getElementById("logbtn");
  if (logBtn) logBtn.addEventListener("click", (e) => { e.stopPropagation(); openFullLog(); });

  /* ============================================================
     动作按钮（阻塞式：点下去才继续）
     ============================================================ */
  function askAction(label) {
    return new Promise((resolve) => {
      const row = document.createElement("div");
      row.className = "c3-actbar";
      ensureInner().appendChild(row);

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "c3-act";
      btn.textContent = label;
      row.appendChild(btn);
      scrollToEl(row);

      setWait(WAIT.IDLE);

      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        if (btn.disabled) return;
        btn.disabled = true;
        sfx("clockFix");
        resolve(true);
      });
    });
  }

  /* 一次性动作按钮：点击后立即锁死，禁止重复触发 */
  function askActionOnce(label) {
    return new Promise((resolve) => {
      const row = document.createElement("div");
      row.className = "c3-actbar";
      ensureInner().appendChild(row);

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "c3-act";
      btn.textContent = label;
      row.appendChild(btn);
      scrollToEl(row);

      setWait(WAIT.IDLE);

      let fired = false;

      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        if (fired) return;
        fired = true;
        btn.disabled = true;
        btn.textContent = "[ ... ]";
        sfx("clockFix");
        resolve(true);
      });
    });
  }

  /* 滚动到某一元素，确保它在视口内可见 */
  function scrollToEl(el) {
    if (!el) return;
    try {
      el.scrollIntoView({ block: "nearest", inline: "nearest" });
    } catch (e) {
      /* 降级：手动计算 */
      const top = el.offsetTop;
      out.scrollTop = Math.max(0, top - 80);
    }
    scrollDown();
  }

  /* 清掉上一段遗留的交互控件（按钮 / 输入框 / 卡片）
     只保留正文行，避免内容无限堆叠把新控件顶出屏幕 */
  function clearInteractives() {
    const root = ensureInner();
    root.querySelectorAll(".c3-actbar, .c3-btnlist, .c3-puzzle, .c3-field").forEach((n) => n.remove());
  }

  /* 信息按钮（非阻塞，随时可点） */
  function addInfoButton(label, modalKey) {
    const row = document.createElement("div");
    row.className = "c3-actbar";
    ensureInner().appendChild(row);

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "c3-act";
    btn.textContent = label;
    row.appendChild(btn);
    scrollToEl(row);

    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      openModal(modalKey);
    });

    return btn;
  }

  /* ============================================================
     归档选择（大按钮 + 弹窗）
     ------------------------------------------------------------
     设计：主屏只放三个大按钮，不嵌卡片；
     点击后弹窗展示该归档详情与确认按钮。
     弹窗关闭后回到等待点击，不会把 Promise 卡在流里。
     ============================================================ */
  function askArchivePick() {
    return new Promise((resolve) => {
      /* 先清掉上一段残留控件，避免把新按钮顶出屏幕 */
      clearInteractives();

      const wrap = document.createElement("div");
      wrap.className = "c3-btnlist";
      ensureInner().appendChild(wrap);

      setWait(WAIT.IDLE);

      let solved = false;
      let wrongCount = 0;

      STORY.archives.forEach((a) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "c3-bigbtn";
        btn.dataset.arch = a.id;
        btn.innerHTML =
          '<span class="bb-id">' + esc(a.id) + '</span>' +
          '<span class="bb-name">' + esc(a.nameCn) + '</span>' +
          '<span class="bb-en">' + esc(a.name) + '</span>';

        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          if (solved || btn.disabled) return;
          openArchiveModal(a, btn, wrap, () => {
            solved = true;
            resolve(a.id);
          }, () => { wrongCount += 1; });
        });

        wrap.appendChild(btn);
      });

      /* 卡片整体滚到可见区域 */
      scrollToEl(wrap.firstElementChild || wrap);
    });
  }

  /* 归档详情弹窗 */
  function openArchiveModal(a, btn, wrap, onSolved, onWrong) {
    modalIsLog = false;
    sfx("open");
    modalHead.textContent = "[ " + a.id + " · " + a.nameCn + " ]";
    modalBody.innerHTML = "";

    const box = document.createElement("div");
    box.className = "c3-archmodal";

    box.innerHTML =
      '<div class="am-id">' + esc(a.id) + '</div>' +
      '<div class="am-name">' + esc(a.name) + ' · ' + esc(a.nameCn) + '</div>' +
      '<div class="am-desc">' + esc(a.desc) + '</div>' +
      '<div class="am-row"><span class="am-k">状态 STATUS</span>' +
        '<span class="am-v ' + a.statusCls + '">' + esc(a.status) + '</span></div>' +
      '<div class="am-row"><span class="am-k"></span>' +
        '<span class="am-v dimt">' + esc(a.statusCn) + '</span></div>';

    modalBody.appendChild(box);

    if (a.pass) {
      const act = document.createElement("button");
      act.type = "button";
      act.className = "c4-act";
      act.textContent = "[ 使用此归档 · USE THIS RECORD ]";
      act.addEventListener("click", (e) => {
        e.stopPropagation();
        act.disabled = true;
        sfx("clockFix");

        btn.classList.add("picked");
        btn.disabled = true;
        wrap.querySelectorAll(".c3-bigbtn").forEach((b) => {
          if (b !== btn) { b.classList.add("done"); b.disabled = true; }
        });

        modal.classList.add("hidden");
        modalBody.innerHTML = "";
        addLine("[ OK ] 已选中 " + a.id, "ok");
        onSolved();
      });
      box.appendChild(act);
    } else {
      const rej = document.createElement("div");
      rej.className = "am-reject";
      a.reject.forEach((r) => {
        const n = document.createElement("div");
        n.className = "am-line " + (r.cls || "");
        n.textContent = r.t;
        rej.appendChild(n);
        logIt(`<span class="${r.cls || ""}">${esc(r.t)}</span>`);
      });
      box.appendChild(rej);

      const close = document.createElement("button");
      close.type = "button";
      close.className = "c4-act danger";
      close.textContent = "[ 返回 · BACK ]";
      close.addEventListener("click", (e) => {
        e.stopPropagation();
        sfx("alarm");
        btn.classList.add("rejected");
        btn.disabled = true;
        modal.classList.add("hidden");
        modalBody.innerHTML = "";
        onWrong();
      });
      box.appendChild(close);
    }

    modal.classList.remove("hidden");
    modalBody.scrollTop = 0;
  }

  /* ============================================================
     输入验证
     ============================================================ */
  function normalizeTime(v) {
    let s = String(v).trim().replace(/\s+/g, "").toUpperCase();
    let sign = "";
    if (s.startsWith("+") || s.startsWith("-")) { sign = s[0]; s = s.slice(1); }
    const m = s.match(/^(\d{1,2}):(\d{1,2}):(\d{1,2})$/);
    if (!m) return null;
    const p = (n) => String(Number(n)).padStart(2, "0");
    return sign + p(m[1]) + ":" + p(m[2]) + ":" + p(m[3]);
  }

  /* 时间字符串归一化：支持 H:M:S / HH:MM:SS / 带正负号；并做时分秒范围校验 */
  function normalizeTime(v) {
    let s = String(v).trim().replace(/\s+/g, "").toUpperCase();
    let sign = "";
    if (s.startsWith("+") || s.startsWith("-")) { sign = s[0]; s = s.slice(1); }
    const m = s.match(/^(\d{1,2}):(\d{1,2}):(\d{1,2})$/);
    if (!m) return null;

    const h = Number(m[1]);
    const mi = Number(m[2]);
    const se = Number(m[3]);

    /* 范围校验：分钟 / 秒必须在 0-59 */
    if (mi > 59 || se > 59) return null;
    if (h > 99) return null;

    const p = (n) => String(n).padStart(2, "0");
    return sign + p(h) + ":" + p(mi) + ":" + p(se);
  }

  /* 判定答案：支持多个等价写法 + 时间格式容错 */
  function isCorrectInput(raw, opts) {
    const v = String(raw).trim();
    if (v === "") return false;

    const list = Array.isArray(opts.answers) ? opts.answers
               : (opts.answer != null ? [opts.answer] : []);

    for (const a of list) {
      if (v === String(a).trim()) return true;
    }

    if (opts.timeFormat) {
      const nv = normalizeTime(v);
      if (nv === null) return false;

      /* 不带符号写法：比较时忽略正号 */
      const nvBare = nv.replace(/^\+/, "");

      for (const a of list) {
        const na = normalizeTime(a);
        if (na === null) continue;
        const naBare = na.replace(/^\+/, "");

        if (!opts.signed) {
          if (nvBare === naBare) return true;
        } else {
          if (nv === na) return true;
          /* 正号可省略：+00:01:59 等价 00:01:59 */
          if (nvBare === naBare) return true;
        }
      }
      return false;
    }

    return false;
  }

  function askInput(opts) {
    return new Promise((resolve) => {
      const box = document.createElement("div");
      box.className = "c3-puzzle";
      ensureInner().appendChild(box);

      const title = document.createElement("div");
      title.className = "pq-title";
      title.textContent = opts.title;
      box.appendChild(title);

      if (opts.question) {
        const q = document.createElement("div");
        q.className = "pq-q";
        q.textContent = opts.question;
        box.appendChild(q);
      }
      if (opts.note) {
        const nt = document.createElement("div");
        nt.className = "pq-note";
        nt.textContent = opts.note;
        box.appendChild(nt);
      }

      const field = document.createElement("div");
      field.className = "c3-field";
      box.appendChild(field);

      const input = document.createElement("input");
      input.type = "text";
      input.className = "c3-input";
      input.autocomplete = "off";
      input.spellcheck = false;
      input.maxLength = 16;
      input.placeholder = opts.placeholder || "";

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "c3-act";
      btn.textContent = opts.button || "[ 验证 · VERIFY ]";

      field.appendChild(input);
      field.appendChild(btn);

      const feedback = document.createElement("div");
      feedback.className = "c3-feedback";
      box.appendChild(feedback);

      scrollToEl(box);

      /* 输入阶段不响应屏幕推进 */
      setWait(WAIT.IDLE);

      let done = false;

      function submit() {
        if (done) return;
        const val = (input.value || "").trim();
        if (val === "") return;

        if (isCorrectInput(val, opts)) {
          done = true;
          input.disabled = true;
          btn.disabled = true;
          sfx("clockFix");
          feedback.className = "c3-feedback ok";
          feedback.textContent = opts.okText || "[OK]";
          /* 答对后收起整块交互，避免旧输入框和按钮堆积在屏幕上 */
          setTimeout(() => { if (box.parentNode) box.remove(); }, 700);
          resolve(val);
        } else {
          sfx("alarm");
          feedback.className = "c3-feedback bad";
          feedback.textContent = opts.badText || "[FAIL]";
          input.value = "";
          input.focus();
        }
      }

      field.addEventListener("click", (e) => e.stopPropagation());
      box.addEventListener("click", (e) => e.stopPropagation());
      btn.addEventListener("click", (e) => { e.stopPropagation(); submit(); });
      input.addEventListener("click", (e) => e.stopPropagation());
      input.addEventListener("keydown", (e) => {
        e.stopPropagation();
        if (e.key === "Enter") { e.preventDefault(); submit(); }
      });

      setTimeout(() => input.focus(), 80);
    });
  }

  /* ============================================================
     动画组件
     ============================================================ */
  async function playWave(durationMs) {
    const frames = [
      "▁▂▃▄▅▆▇█▇▆▅▄▃▂▁",
      "▂▃▄▅▆▇█▇▆▅▄▃▂▁▂",
      "▃▄▅▆▇█▇▆▅▄▃▂▁▂▃",
      "▄▅▆▇█▇▆▅▄▃▂▁▂▃▄",
    ];
    const n = addLine(frames[0], "dimt");
    const step = 110;
    const total = Math.max(1, Math.round(durationMs / step));
    for (let i = 1; i < total; i++) {
      await sleep(step);
      n.textContent = frames[i % frames.length];
    }
    n.textContent = "▁▂▃▄▅▆▇█▇▆▅▄▃▂▁  载波信号 CARRIER";
  }

  async function playProgress(label, from, to) {
    const n = addLine("", "ok");
    for (let v = from; v <= to; v++) {
      n.textContent = label + " [" + "#".repeat(v) + ".".repeat(to - v) + "] " +
        String(Math.round((v / to) * 100)).padStart(3, " ") + "%";
      if (v % 2 === 0) sfx("tick");
      await sleep(85);
    }
  }

  /* ============================================================
     3.7 校准序列 —— 15 秒连续动画
     ------------------------------------------------------------
     阶段（总时长约 15s）：
       A  时间轴扫描      0.0 - 3.6s
       B  偏差归零        3.6 - 7.4s
       C  归档回放        7.4 - 10.6s
       D  同步锁定        10.6 - 13.8s
       E  完成            13.8 - 15.0s
     ============================================================ */

  /* 用字符画时间轴：标记位置随进度移动 */
  /* 数字滚动：从 a 跑到 b */
  function lerp(a, b, t) { return a + (b - a) * t; }

  function fmtMS(sec) {
    const p = (n) => String(n).padStart(2, "0");
    const h = Math.floor(sec / 3600) % 100;
    const m = Math.floor(sec / 60) % 60;
    const s = Math.floor(sec) % 60;
    const ms = Math.floor((sec % 1) * 1000);
    return p(h) + ":" + p(m) + ":" + p(s) + "." + String(ms).padStart(3, "0");
  }

  async function playCalibrationSequence() {
    const D = STORY.data;

    setWait(WAIT.IDLE);
    clearInteractives();

    /* 关键：先把音频上下文推到 running，否则开场音效全会被静默丢弃。
       这是点击手势的同一个调用链，浏览器允许在这里 resume。 */
    if (typeof Sfx !== "undefined" && Sfx && typeof Sfx.ensureReady === "function") {
      await Sfx.ensureReady(1500);
    }

    /* 关键：在挂入全屏层之前先发开场音。
       全屏层一进 DOM 就有大量同步排版，会把音频调度挤掉。 */
    sfx("calibStart");

    const localStart = 1 * 3600 + 0 * 60 + 18;
    const target = 1 * 3600 + 2 * 60 + 17;

    /* ============================================================
       全屏科幻舞台
       ============================================================ */
    const overlay = document.createElement("div");
    overlay.className = "c3-fs";
    overlay.innerHTML =
      /* 背景代码流（最底层） */
      '<div class="fs-code" id="fs-code"></div>' +
      /* 背景网格 + 漂移 */
      '<div class="fs-grid"></div>' +
      '<div class="fs-vignette"></div>' +
      /* 星环 */
      '<div class="fs-ring" id="fs-ring"></div>' +
      '<div class="fs-ring fs-ring2" id="fs-ring2"></div>' +
      '<div class="fs-sweep" id="fs-sweep"></div>' +
      /* 中央光核 */
      '<div class="fs-core" id="fs-core"></div>' +
      '<div class="fs-burst" id="fs-burst"></div>' +
      /* HUD 角标 */
      '<div class="fs-hud fs-hud-tl">CHRONONODE // TIME SERVICE</div>' +
      '<div class="fs-hud fs-hud-tr" id="fs-hud-tr">LINK: LOCAL</div>' +
      '<div class="fs-hud fs-hud-bl" id="fs-hud-bl">SEQ: CALIBRATION</div>' +
      '<div class="fs-hud fs-hud-br" id="fs-hud-br">REF: H-03</div>' +
      /* 主显示 */
      '<div class="fs-center">' +
        '<div class="fs-title" id="fs-title">TIME CALIBRATION</div>' +
        '<div class="fs-glyph" id="fs-glyph">00:00:00</div>' +
        '<div class="fs-sub" id="fs-sub">初始化参考写入</div>' +
        '<div class="fs-data" id="fs-data"></div>' +
      '</div>' +
      /* 底部进度 */
      '<div class="fs-bottom">' +
        '<div class="fs-bar"><div class="fs-fill" id="fs-fill"></div></div>' +
        '<div class="fs-pct" id="fs-pct">000%</div>' +
      '</div>';

    document.body.appendChild(overlay);

    /* ---------- 生成背景代码流 ---------- */
    buildCodeStream(overlay.querySelector("#fs-code"));

    const $ = (id) => overlay.querySelector("#" + id);
    const ring   = $("fs-ring");
    const ring2  = $("fs-ring2");
    const sweep  = $("fs-sweep");
    const core   = $("fs-core");
    const burst  = $("fs-burst");
    const glyph  = $("fs-glyph");
    const title  = $("fs-title");
    const sub    = $("fs-sub");
    const dataL  = $("fs-data");
    const fill   = $("fs-fill");
    const pct    = $("fs-pct");
    const hudTr  = $("fs-hud-tr");
    const hudBl  = $("fs-hud-bl");

    function setPct(p) {
      const v = Math.max(0, Math.min(100, p));
      fill.style.width = v + "%";
      pct.textContent = String(Math.round(v)).padStart(3, "0") + "%";
    }

    /* 入场淡入 */
    await sleep(40);
    overlay.classList.add("in");
    sfx("calibStart");

    /* ============ 0 · 星环飞入 0 → 2.4s ============ */
    const PIECES = 16;
    for (let i = 0; i < PIECES; i++) {
      const p = document.createElement("div");
      p.className = "fs-piece";
      const ang = (360 / PIECES) * i;
      const dist = 420 + Math.random() * 320;
      const dx = Math.cos((ang - 90) * Math.PI / 180) * dist;
      const dy = Math.sin((ang - 90) * Math.PI / 180) * dist;
      p.style.setProperty("--ang", ang + "deg");
      p.style.setProperty("--dx", dx.toFixed(0) + "px");
      p.style.setProperty("--dy", dy.toFixed(0) + "px");
      p.style.animationDelay = (i * 32) + "ms";
      ring.appendChild(p);
      /* 每片飞入时根一粒声 */
      if (i % 3 === 0) sfx("calibPiece", i * 32);
    }
    /* 外圈反向碎片 */
    for (let i = 0; i < 8; i++) {
      const p = document.createElement("div");
      p.className = "fs-piece outer";
      const ang = (360 / 12) * i + 15;
      const dist = 520 + Math.random() * 260;
      const dx = Math.cos((ang - 90) * Math.PI / 180) * dist;
      const dy = Math.sin((ang - 90) * Math.PI / 180) * dist;
      p.style.setProperty("--ang", ang + "deg");
      p.style.setProperty("--dx", dx.toFixed(0) + "px");
      p.style.setProperty("--dy", dy.toFixed(0) + "px");
      p.style.animationDelay = (300 + i * 40) + "ms";
      ring2.appendChild(p);
      if (i % 3 === 0) sfx("calibPiece", 300 + i * 40);
    }

    /* 场景内粒子层（漂浮光点） */
    const dust = document.createElement("div");
    dust.className = "fs-dust";
    for (let i = 0; i < 18; i++) {
      const d = document.createElement("i");
      d.style.left = (Math.random() * 100).toFixed(2) + "%";
      d.style.top = (Math.random() * 100).toFixed(2) + "%";
      d.style.animationDelay = (-Math.random() * 9).toFixed(2) + "s";
      d.style.animationDuration = (6 + Math.random() * 9).toFixed(1) + "s";
      d.style.opacity = (0.15 + Math.random() * 0.5).toFixed(2);
      dust.appendChild(d);
    }
    overlay.appendChild(dust);

    title.textContent = "TIME CALIBRATION";
    title.classList.add("show");

    setPct(2);
    await sleep(1500);

    ring.classList.add("live");
    ring2.classList.add("live");
    core.classList.add("live");
    sfx("calibRingLock");
    setPct(14);
    await sleep(900);

    /* ============ 1 · 扫描本地时钟 2.4 → 4.8s ============ */
    title.textContent = "SCANNING LOCAL CLOCK";
    sub.textContent = "读取本地时钟 / READ LOCAL CLOCK";
    hudTr.textContent = "LINK: SELF";
    sweep.classList.add("run");

    const localFrames = [
      "01:00:18.000", "01:00:18.117", "01:00:18.244",
      "01:00:18.391", "01:00:18.502", "01:00:18.618",
    ];
    for (let i = 0; i < localFrames.length; i++) {
      glyph.textContent = localFrames[i];
      glyph.classList.add("tick");
      setTimeout(() => glyph.classList.remove("tick"), 80);
      setPct(14 + (i + 1) * 3);
      sfx("calibScan");
      await sleep(400);
    }

    dataL.innerHTML = "";
    addFsRow(dataL, "LOCAL CLOCK", D.localClock, "live");
    sfx("calibRow");
    setPct(34);
    await sleep(400);

    /* ============ 2 · 归档回放飞入 4.8 → 8.4s ============ */
    title.textContent = "REPLAYING ARCHIVE";
    sub.textContent = "调取历史授时记录 H-03";
    hudTr.textContent = "LINK: ARCHIVE";
    hudBl.textContent = "SEQ: REPLAY";

    const rows = [
      { k: "ARCHIVE ENTRY", v: "H-03", cls: "fly" },
      { k: "CHECKSUM",      v: "26 · VERIFIED", cls: "fly" },
      { k: "REFERENCE TIME",v: D.referenceTime, cls: "fly" },
      { k: "ELAPSED TIME",  v: D.interval, cls: "fly" },
      { k: "RECORD STATUS", v: "INTACT", cls: "fly" },
    ];
    for (let i = 0; i < rows.length; i++) {
      addFsRow(dataL, rows[i].k, rows[i].v, rows[i].cls);
      sfx("calibRow");
      setPct(34 + (i + 1) * 5);
      await sleep(720);
    }

    /* ============ 3 · 偏差收敛 8.4 → 11.2s ============ */
    title.textContent = "RESOLVING OFFSET";
    sub.textContent = "计算并消除时钟偏差";
    hudTr.textContent = "LINK: SYNC";
    hudBl.textContent = "SEQ: OFFSET";

    ring.classList.add("contract");
    ring2.classList.add("contract");

    const tC0 = Date.now();
    const C_MS = 2800;
    while (Date.now() - tC0 < C_MS) {
      const t = (Date.now() - tC0) / C_MS;
      const off = Math.round(119 * (1 - t));
      glyph.textContent = off === 0 ? "OFFSET ±0s" : "OFFSET +" + off + "s";
      glyph.classList.toggle("warn", off > 40);
      setPct(59 + t * 16);
      /* 每 160ms 一声，音高随收敛上升 */
      if (Math.floor(Date.now() / 160) !== Math.floor((Date.now() - 70) / 160)) {
        sfx("calibOffset", off);
      }
      await sleep(70);
    }
    glyph.classList.remove("warn");

    /* ============ 4 · 时钟冲刺 11.2 → 13.8s ============ */
    title.textContent = "APPLYING CORRECTION";
    sub.textContent = "写入参考时刻";
    hudBl.textContent = "SEQ: WRITE";

    const tD0 = Date.now();
    const D_MS = 2600;
    while (Date.now() - tD0 < D_MS) {
      const t = (Date.now() - tD0) / D_MS;
      const e = t < 0.85 ? t * 1.1 : 0.935 + (t - 0.85) * 0.43;
      const cur = lerp(localStart, target, Math.min(1, e));
      glyph.textContent = fmtMS(cur);
      paintCalibClock(cur);
      setPct(75 + t * 22);
      /* 后期脉冲越来越密 */
      if (t > 0.45) sfx("calibRush");
      await sleep(55);
    }

    /* ============ 5 · 锁定光爆 13.8 → 15.0s ============ */
    glyph.textContent = D.targetTime;
    glyph.classList.add("locked");
    title.textContent = "SYNCHRONIZED";
    sub.textContent = "本地时钟已对齐参考时刻";
    hudTr.textContent = "LINK: LOCKED";
    hudBl.textContent = "SEQ: COMPLETE";

    core.classList.add("burst");
    burst.classList.add("go");
    overlay.classList.add("flash");
    setPct(100);
    sfx("calibBurst");

    Clock.setTime("2026-10-13 " + D.targetTime);
    setPanel("localClk", "CALIBRATED", "ok");
    setPanel("timeRef", "VERIFIED", "ok");
    if (nodeState) nodeState.textContent = "LOCAL TIME: CALIBRATED";

    /* 光爆后接完成琶音 */
    setTimeout(() => sfx("calibDone"), 520);

    await sleep(900);

    /* 淡出并清理 */
    overlay.classList.add("out");
    await sleep(700);
    if (overlay.parentNode) overlay.parentNode.removeChild(overlay);

    /* 恢复环境底噪并释放校准通道 */
    sfx("calibEnd");

    Clock.start();
  }

  /* 全屏动画里的数据行 */
  function addFsRow(container, k, v, cls) {
    const r = document.createElement("div");
    r.className = "fs-row" + (cls ? " " + cls : "");
    r.innerHTML =
      '<span class="fs-k">' + esc(k) + '</span>' +
      '<span class="fs-v">' + esc(v) + '</span>';
    container.appendChild(r);
  }

  /* ============================================================
     背景代码流
     多列纵向滚动伪代码，与校准流程同一世界观：
     时间、校验、归档、链路、同步
     ============================================================ */
  const CODE_FRAGMENTS = [
    "ref.time = 01:00:00",
    "interval += +00:02:17",
    "target = ref + interval",
    "checksum(26) == stored",
    "archive[H-03].status",
    "integrity: PASS",
    "offset = target - local",
    "local = 01:00:18",
    "correction +00:01:59",
    "if (offset != 0) {\n  apply(offset)\n}",
    "link.reinit()",
    "carrier.scan(0x2F)",
    "handshake.begin()",
    "sync.lock(TRUE)",
    "node CN-BACKUP-01",
    "mainNode: NO_RESPONSE",
    "time.ref = TRUSTED",
    "record.integrity = INTACT",
    "0x1F 0x02 0x17 0xFF",
    "wait(REFERENCE)",
    "assert(offset === 119)",
    "calib.seq.write()",
    "tx.buffer.flush()",
    "clock.drift = 0.000",
    "emit(TIME_SYNC)",
    "recovery.mode = PARTIAL",
    "comm.service: STANDBY",
    "led.state = ONLINE",
    "log(\"archive accessed\")",
    "retry(3) -> timeout",
    "parse(H-03).fields",
    "verify(sum) == 26",
    "ts.delta = +119s",
    "sync.state = PENDING",
  ];

  function buildCodeStream(host) {
    if (!host) return;

    /* 列数根据宽度决定（压低数量，减轻渲染负担） */
    const cols = Math.max(6, Math.min(12, Math.floor(window.innerWidth / 110)));

    for (let c = 0; c < cols; c++) {
      const col = document.createElement("div");
      col.className = "fs-col";

      /* 每列 10~16 行，重复两次内容以实现无缝纵向滚动 */
      const n = 10 + Math.floor(Math.random() * 7);
      const lines = [];
      for (let i = 0; i < n; i++) {
        const frag = CODE_FRAGMENTS[Math.floor(Math.random() * CODE_FRAGMENTS.length)];
        lines.push(frag);
      }
      const text = lines.join("\n") + "\n";
      col.textContent = text + text;

      /* 速度与延迟错开 */
      const dur = 1.6 + Math.random() * 2.8;      /* 1.6s ~ 4.4s，高速滚屏 */
      col.style.animationDuration = dur.toFixed(1) + "s";
      col.style.animationDelay = (-Math.random() * dur).toFixed(1) + "s";

      host.appendChild(col);
    }
  }

  /* 校准动画期间直接改写顶栏时钟显示 */
  function paintCalibClock(sec) {
    const p = (n) => String(n).padStart(2, "0");
    const h = Math.floor(sec / 3600) % 100;
    const m = Math.floor(sec / 60) % 60;
    const s = Math.floor(sec) % 60;
    const ms = Math.floor((sec % 1) * 1000);
    clkEl.textContent = "2026-10-13 " + p(h) + ":" + p(m) + ":" + p(s) + "." + String(ms).padStart(3, "0");
    clkEl.classList.add("unverified");
  }

  /* ============================================================
     3.8 通信恢复序列（手动触发后播放）
     ============================================================ */
  async function playCommRestore() {
    setWait(WAIT.IDLE);

    await sleep(300);
    addLine("", "");

    const steps = [
      "[SYS] Restoring communication service ...",
      "[SYS] Reinitializing link layer .........",
      "[SYS] Negotiating carrier frequency .....",
    ];
    for (const s of steps) {
      addLine(s, "dimt");
      sfx("tick");
      await sleep(600);
    }

    await playWave(900);

    addLine("", "");
    addLine("CARRIER DETECTED", "ok");
    await sleep(520);
    addLine("INCOMING DATA DETECTED", "ok");
    await sleep(520);
    addLine("HANDSHAKE IN PROGRESS...", "warn");
    await sleep(900);
  }

  /* ============================================================
     状态特效
     ============================================================ */
  async function doClockSync() {
    Clock.stop();

    addLine("[SYNC] Local clock adjusted ................ OK", "ok");
    addLine("[SYNC] Reference consistency .............. VERIFIED", "ok");
    await sleep(400);

    Clock.setTime("2026-10-13 01:02:17");
    sfx("clockFix");
    setPanel("localClk", "CALIBRATED", "ok");
    setPanel("timeRef", "VERIFIED", "ok");
    if (nodeState) nodeState.textContent = "LOCAL TIME: CALIBRATED";

    addLine("[SYNC] Local clock ........................ 01:02:17", "ok");
    addLine("[SYNC] Main node connection ................ NO RESPONSE", "bad");
    await sleep(300);

    Clock.start();
  }

  function doLedOn() {
    setPanel("comm", "NORMAL", "ok");
    if (nodeState) {
      nodeState.innerHTML = '<span class="c3-led on"></span>COMMUNICATION: NORMAL';
    }
    sfx("clockFix");
  }

  async function doIncomingAnomaly() {
    addLine("", "");

    const rows = [
      { ts: "01:02:31", extra: "" },
      { ts: "01:02:29", extra: "shift" },
      { ts: "01:02:33", extra: "ghost" },
    ];

    for (const r of rows) {
      const card = document.createElement("div");
      card.className = "c3-logcard bad";
      card.innerHTML =
        '<div class="lc-body"><span class="lc-id">ARCHIVE H-03 ACCESSED</span></div>' +
        '<div class="lc-ts ' + r.extra + '">' + esc(r.ts) + '  SOURCE: UNKNOWN</div>';
      ensureInner().appendChild(card);
      logIt(`<span class="bad">${esc(r.ts)} ARCHIVE H-03 ACCESSED</span>`);
      scrollDown();
      sfx("tick");
      await sleep(320);
    }

    await sleep(280);
    addLine("", "");
    addLine("时间戳并不一致。", "warn");
    addLine("数据来源无法确认。", "warn");
    addLine("The timestamps do not match.", "dimt");
  }

  function renderReport() {
    const box = document.createElement("div");
    box.className = "c3-data";
    STORY.finalReport.forEach((r) => {
      const row = document.createElement("div");
      row.className = "dr";
      row.innerHTML =
        '<span class="dk">' + esc(r.k) + '</span>' +
        '<span class="dv ' + r.cls + '">' + esc(r.v) + '</span>';
      box.appendChild(row);
      logIt(`<span class="${r.cls}">${esc(r.k)} ${esc(r.v)}</span>`);
    });
    ensureInner().appendChild(box);
    scrollDown();
  }

  /* ============================================================
     渲染一个状态（只渲染，不推进）
     ============================================================ */
  async function renderState(state) {
    const step = STORY.chapter3[state];
    if (!step) { console.warn("[engine3] 未知状态:", state); return; }

    setWait(WAIT.IDLE);

    /* 分条播放：一行一行出现，不是一股脑全跳出来 */
    await playLines(step.lines);

    /* 纯说明按钮：只有当前状态没有阻塞式 action 时才添加，避免抢焦点 */
    const hasBlockingAction = !!step.action;
    if (!hasBlockingAction && step.hint && step.modal) {
      addInfoButton(step.hint, step.modal);
    }
    if (!hasBlockingAction && step.hint2 && step.modal2) {
      addInfoButton(step.hint2, step.modal2);
    }

    if (step.sync) {
      await playWave(1100);
      await doClockSync();
      await playProgress("APPLYING", 0, 10);
    }

    if (step.action === "ARCHIVE_PICK") {
      await askArchivePick();
    }

    /* ---------- 3.5 完整性校验 ---------- */
    if (step.action === "VERIFY_CHECKSUM") {
      await askInput({
        title: "CHECKSUM VERIFICATION",
        question: "INPUT VERIFICATION VALUE:",
        note: "将 H-03 记录中的 ARCHIVE CHECKSUM 填入。",
        placeholder: "??",
        button: "[ 验证 · VERIFY REFERENCE ]",
        answers: [STORY.answers.checksum],
        okText: "[OK] Checksum verified.",
        badText: "[FAIL] Checksum mismatch. Verification rejected.",
      });
    }

    /* ---------- 3.6 时间重建（两题） ---------- */
    if (step.action === "RECALC") {
      /* Puzzle A：目标时刻 */
      await askInput({
        title: "PUZZLE A · TARGET TIME",
        question: "REFERENCE TIME + ELAPSED TIME = ?",
        note: "以 HH:MM:SS 格式输入 · 允许省略前导零",
        placeholder: "00:00:00",
        button: "[ 提交 · SUBMIT ]",
        answers: STORY.answers.targetTimeAlt,
        timeFormat: true,
        okText: "[OK] Target time confirmed.",
        badText: "[FAIL] Target time incorrect. Recalculate.",
      });

      /* Puzzle B：修正量 */
      await askInput({
        title: "PUZZLE B · CLOCK CORRECTION",
        question: "TARGET TIME − LOCAL CLOCK READING = ?",
        note: "以带符号的 HH:MM:SS 输入 · 正负号可选",
        placeholder: "+00:00:00",
        button: "[ 提交 · SUBMIT ]",
        answers: STORY.answers.correctionAlt,
        timeFormat: true,
        signed: true,
        okText: "[OK] Correction value confirmed.",
        badText: "[FAIL] Correction incorrect. Recalculate.",
      });
    }

    /* ---------- 3.7 应用校准 ---------- */
    if (step.action === "APPLY_CALIB") {
      /* 等待玩家点 APPLY CALIBRATION，禁止重复触发 */
      await askActionOnce("[ APPLY CALIBRATION ]");
    }

    /* ---------- 3.7 校准动画（15 秒） ---------- */
    if (step.action === "CALIBRATION_SEQUENCE") {
      await playCalibrationSequence();
    }

    /* ---------- 3.8 手动恢复通信 ---------- */
    if (step.action === "RESTORE_COMM") {
      await askActionOnce("[ RESTORE COMMUNICATION LINK ]");
      await playCommRestore();
    }

    if (step.led) doLedOn();
    if (step.incoming) await doIncomingAnomaly();
    if (step.report) renderReport();
    if (step.tail) step.tail.forEach((l) => addLine(l.t, l.cls));

    if (step.cursor) {
      addRaw('<span class="dimt">AWAITING OPERATOR INPUT</span><span class="cursor"></span>');
    }
  }

  /* ============================================================
     自动跳转
     ============================================================ */
  async function redirectTo(url, seconds) {
    Clock.stop();
    let left = seconds;
    const n = addLine("正在接入下一信道 ...... " + left + "s", "warn");

    while (left > 0) {
      await sleep(1000);
      left -= 1;
      n.textContent = "正在接入下一信道 ...... " + left + "s";
      if (left > 0) sfx("clockTick");
    }

    addLine("LINK ESTABLISHED · 正在跳转", "ok");
    await sleep(400);
    try { window.location.href = url; } catch (e) {}
  }

  /* ============================================================
     主循环（唯一）
     ============================================================ */
  const ORDER = [
    "CONNECTED",
    "REFERENCE_MISSING",
    "ARCHIVE_SELECT",
    "ARCHIVE_VERIFY",
    "VERIFIED",
    "TIME_RECALC",
    "RECALCULATED",
    "RECOVERY_INIT",
    "RESTART",
    "COMM_RESTORED",
    "END",
    "INCOMING",
  ];

  let booted = false;

  async function boot() {
    if (booted) return;
    booted = true;

    out.innerHTML = "";
    inner = null;
    ensureInner();

    if (nodeState) nodeState.textContent = "NODE STATUS: RECOVERY";

    for (let i = 0; i < ORDER.length; i++) {
      const state = ORDER[i];
      const step = STORY.chapter3[state];
      if (!step) break;

      await renderState(state);

      /* 跳转状态：不等点击 */
      if (step.redirect) {
        await redirectTo(step.redirect.url, step.redirect.seconds);
        return;
      }

      /* 动作型状态：交互本身已完成推进，不再多等一次点击 */
      if (!step.action) {
        await waitAdvance();
      }

      /* 清屏过渡 */
      if (step.clearNext) {
        out.classList.add("clearing");
        await sleep(200);
        out.classList.remove("clearing");
        clearScreen();
      }
    }
  }

  /* ============================================================
     启动
     ============================================================ */
  window.addEventListener("load", () => {
    Clock.setTime(STORY.startTime);
    Clock.setRaw(STORY.startTime);
    setPanel("timeRef", "LOST", "bad");
    setPanel("localClk", "UNVERIFIED", "warn");
    setPanel("comm", "STANDBY", "warn");
    setPanel("mainNode", "NO RESPONSE", "bad");
    Clock.start();

    inner = null;
    ensureInner();

    addLine("──────────────────────────", "mute");
    addLine("CHRONONODE", "hi");
    addLine("FINAL RECOVERY ENVIRONMENT · 恢复环境", "dimt");
    addLine("──────────────────────────", "mute");
    addLine("", "");
    addRaw('<span class="ok">[ 单击屏幕开始 ]</span><span class="cursor"></span>');

    LOG.length = 0;
    setWait(WAIT.IDLE);
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
