/* ============================================================
   chapter3.js — 第三章剧本数据：《REFERENCE ZERO》
   历史授时归档 · 部分同步 · 收信异常

   本文件只有数据。引擎见 engine3.js。
   ============================================================ */

const STORY = {

  /* 进入本章时承接第二章结尾的未验证时钟 */
  startTime: "2026-10-13 01:00:18",

  /* ============================================================
     归档定义
     ============================================================ */
  archives: [
    {
      id: "H-01",
      name: "REALTIME NETWORK REFERENCE",
      nameCn: "实时网络授时参考",
      desc: "从网络上取得的实时时间参考。",
      status: "NETWORK LINK UNAVAILABLE",
      statusCn: "网络链路不可用",
      statusCls: "bad",
      reject: [
        { t: "[REJECTED] H-01 不符合第 01 条规则。", cls: "bad" },
        { t: "该记录依赖实时网络参考，", cls: "dimt" },
        { t: "而当前网络链路不可用。", cls: "dimt" },
        { t: "NO LIVE REFERENCE SOURCE IS REACHABLE.", cls: "mute" },
      ],
    },
    {
      id: "H-02",
      name: "LOCAL CLOCK HISTORY",
      nameCn: "本地时钟历史",
      desc: "本地时钟此前的读数记录。",
      status: "NOT AN INDEPENDENT REFERENCE",
      statusCn: "不构成独立参考",
      statusCls: "warn",
      reject: [
        { t: "[REJECTED] H-02 不符合第 02 条规则。", cls: "bad" },
        { t: "本地时钟历史是本机自己的读数，", cls: "dimt" },
        { t: "不是独立的时间参考。", cls: "dimt" },
        { t: "LOCAL CLOCK READINGS ARE NOT", cls: "mute" },
        { t: "INDEPENDENT TIME REFERENCES.", cls: "mute" },
      ],
    },
    {
      id: "H-03",
      name: "HISTORICAL TIME REFERENCE",
      nameCn: "历史授时记录",
      desc: "一份此前记录的独立授时参考。",
      status: "INTEGRITY UNVERIFIED",
      statusCn: "完整性未验证",
      statusCls: "warn",
      pass: true,
    },
  ],

  /* ============================================================
     核心数据（贯穿全章的数值）
     ============================================================ */
  data: {
    recordId: "H-03",
    referenceTime: "01:00:00",
    interval: "+00:02:17",
    localClock: "01:00:18",
    checksum: "26",
    targetTime: "01:02:17",
    correction: "+00:01:59",
  },

  /* 正确答案 */
  answers: {
    checksum: "26",
    targetTime: "01:02:17",
    correction: "+00:01:59",
    /* 等价写法（容错） */
    targetTimeAlt: ["1:2:17", "01:2:17", "1:02:17", "01:02:17"],
    correctionAlt: ["00:01:59", "+00:01:59", "0:1:59", "+0:1:59", "00:1:59", "+00:1:59"],
  },

  /* ============================================================
     第三章正文（按状态）
     ============================================================ */
  chapter3: {

    /* ---------- 01 连接备用节点 ---------- */
    CONNECTED: {
      lines: [
        { t: "CHRONONODE / RECOVERY ENVIRONMENT", cls: "hi" },
        { t: "备用授时节点 · 恢复环境", cls: "dimt" },
        { t: "────────────────────────────────────────────", cls: "mute" },
        { t: "" },
        { t: "  NODE ID        CN-BACKUP-01", cls: "" },
        { t: "  NODE CONTROL   ACTIVE", cls: "ok" },
        { t: "  AUTHORIZATION  *** GRANTED", cls: "ok" },
        { t: "  LOCAL CLOCK    FREE RUNNING · 01:00:18", cls: "warn" },
        { t: "  TIME REFERENCE LOST", cls: "bad" },
        { t: "  MAIN NODE      NO RESPONSE", cls: "bad" },
        { t: "────────────────────────────────────────────", cls: "mute" },
      ],
      next: "REFERENCE_MISSING",
    },

    /* ---------- 02 缺少时间参考 ---------- */
    REFERENCE_MISSING: {
      lines: [
        { t: "RECOVERY INITIALIZATION: BLOCKED", cls: "bad" },
        { t: "恢复初始化：已阻断", cls: "bad" },
        { t: "" },
        { t: "  REASON  原因", cls: "dimt" },
        { t: "  NO VALID TIME REFERENCE AVAILABLE", cls: "warn" },
        { t: "  没有可用的有效时间基准", cls: "warn" },
        { t: "" },
        { t: "  本地时钟在自由计时，读数不可信。", cls: "dimt" },
        { t: "  主节点无响应，无法取得实时参考。", cls: "dimt" },
      ],
      hint: "[ 查看节点唤醒记录 · WAKE LOG ]",
      modal: "bootLog",
      next: "ARCHIVE_SELECT",
    },

    /* ---------- 03 历史归档 ---------- */
    ARCHIVE_SELECT: {
      lines: [
        { t: "[INFO] HISTORICAL REFERENCE DATA DETECTED", cls: "ok" },
        { t: "[INFO] 检测到历史授时数据", cls: "ok" },
        { t: "────────────────────────────────────────────", cls: "mute" },
        { t: "  归档类型   TIME CALIBRATION · 时间校准", cls: "" },
        { t: "  存储位置   LOCAL / READ-ONLY", cls: "" },
        { t: "  完整性     NOT YET VERIFIED · 尚未验证", cls: "warn" },
        { t: "────────────────────────────────────────────", cls: "mute" },
        { t: "" },
        { t: "一份此前记录的参考时刻，或许可用于本次恢复。", cls: "" },
        { t: "在选择之前，请先阅读归档选择规则。", cls: "warn" },
      ],
      hint: "[ 归档选择规则 · SELECTION RULE ]",
      modal: "ruleTable",
      action: "ARCHIVE_PICK",
      clearNext: true,
      next: "ARCHIVE_VERIFY",
    },

    /* ---------- 3.5 完整性校验 ---------- */
    ARCHIVE_VERIFY: {
      lines: [
        { t: "REFERENCE VALIDATION", cls: "hi" },
        { t: "参考校验", cls: "dimt" },
        { t: "────────────────────────────────────────────", cls: "mute" },
        { t: "" },
        { t: "  ARCHIVE ENTRY          H-03", cls: "" },
        { t: "  REFERENCE TYPE         HISTORICAL REFERENCE", cls: "" },
        { t: "  RECORD STATUS          INTACT", cls: "ok" },
        { t: "  INDEPENDENT REFERENCE  AVAILABLE", cls: "ok" },
        { t: "" },
        { t: "  CHECKSUM VERIFICATION REQUIRED", cls: "warn" },
        { t: "  需要校验归档完整性", cls: "dimt" },
        { t: "────────────────────────────────────────────", cls: "mute" },
        { t: "  ARCHIVE CHECKSUM       26", cls: "warn" },
      ],
      hint: "[ 打开 H-03 记录 · OPEN RECORD ]",
      modal: "h03Record",
      hint2: "[ 完整性规则 · INTEGRITY RULE ]",
      modal2: "integrityRule",
      action: "VERIFY_CHECKSUM",
      clearNext: true,
      next: "VERIFIED",
    },

    /* ---------- 校验通过 ---------- */
    VERIFIED: {
      lines: [
        { t: "[OK] Checksum verified.", cls: "ok" },
        { t: "[OK] Archive integrity confirmed.", cls: "ok" },
        { t: "[OK] Reference accepted as independent source.", cls: "ok" },
        { t: "" },
        { t: "  REFERENCE SOURCE       H-03", cls: "" },
        { t: "  REFERENCE STATUS       TRUSTED", cls: "ok" },
        { t: "" },
        { t: "[SYS] Validation complete.", cls: "dimt" },
        { t: "[SYS] Proceeding to time reconstruction.", cls: "dimt" },
      ],
      next: "TIME_RECALC",
    },

    /* ---------- 3.6 时间重建 ---------- */
    TIME_RECALC: {
      lines: [
        { t: "TIME RECONSTRUCTION", cls: "hi" },
        { t: "时间重建", cls: "dimt" },
        { t: "────────────────────────────────────────────", cls: "mute" },
        { t: "" },
        { t: "  REFERENCE TIME              01:00:00", cls: "" },
        { t: "  ELAPSED TIME IN ARCHIVE     +00:02:17", cls: "" },
        { t: "  LOCAL CLOCK READING          01:00:18", cls: "warn" },
        { t: "────────────────────────────────────────────", cls: "mute" },
      ],
      action: "RECALC",
      next: "RECALCULATED",
    },

    /* ---------- 重建完成 ---------- */
    RECALCULATED: {
      lines: [
        { t: "[OK] Target time reconstructed.", cls: "ok" },
        { t: "[OK] Clock offset calculated.", cls: "ok" },
        { t: "[OK] Correction value verified.", cls: "ok" },
        { t: "" },
        { t: "  TARGET TIME            01:02:17", cls: "ok" },
        { t: "  CORRECTION             +00:01:59", cls: "ok" },
        { t: "" },
        { t: "  APPLY CORRECTION?", cls: "warn" },
        { t: "  应用时钟修正？", cls: "dimt" },
      ],
      action: "APPLY_CALIB",
      next: "RECOVERY_INIT",
    },

    /* ---------- 3.7 应用校准（动画由引擎播放） ---------- */
    RECOVERY_INIT: {
      lines: [],
      action: "CALIBRATION_SEQUENCE",
      next: "RESTART",
    },

    /* ---------- 3.8 手动恢复通信 ---------- */
    RESTART: {
      lines: [
        { t: "TIME SYNCHRONIZATION: PARTIAL", cls: "warn" },
        { t: "COMMUNICATION SERVICE: STANDBY", cls: "warn" },
        { t: "MAIN NODE: NO RESPONSE", cls: "bad" },
        { t: "" },
        { t: "本地时间已校准，但通信服务尚未启动。", cls: "dimt" },
        { t: "需要手动恢复通信链路。", cls: "warn" },
      ],
      action: "RESTORE_COMM",
      next: "COMM_RESTORED",
    },

    /* ---------- 通信恢复 + 收信 ---------- */
    COMM_RESTORED: {
      lines: [
        { t: "[OK] Communication link established.", cls: "ok" },
        { t: "[OK] Incoming message recovered.", cls: "ok" },
        { t: "" },
        { t: "  COMMUNICATION STATUS   ONLINE", cls: "ok" },
        { t: "  MAIN NODE              NO RESPONSE", cls: "bad" },
      ],
      led: true,
      incoming: true,
      next: "END",
    },

    /* ---------- 最终报告 ---------- */
    END: {
      lines: [
        { t: "RECOVERY SUMMARY", cls: "hi" },
        { t: "恢复摘要", cls: "dimt" },
        { t: "────────────────────────────────────────────", cls: "mute" },
      ],
      report: true,
      next: "INCOMING",
    },

    /* ---------- 来信 ---------- */
    INCOMING: {
      lines: [
        { t: "────────────────────────────────────────────", cls: "mute" },
        { t: "[INCOMING TRANSMISSION]", cls: "hi" },
        { t: "  信道 CHANNEL   PERSONAL", cls: "" },
        { t: "  承载 CARRIER   STABLE", cls: "warn" },
        { t: "  状态 STATUS    WAITING FOR OPERATOR", cls: "warn" },
      ],
      cursor: true,
      redirect: { url: "chapter4.html", seconds: 3 },
    },
  },

  /* ============================================================
     弹窗内容
     ============================================================ */
  modals: {

    bootLog: {
      title: "节点唤醒记录",
      lines: [
        { t: "CHRONONODE / WAKE LOG", cls: "hi" },
        { t: "CN-BACKUP-01 · 2026-10-13", cls: "dimt" },
        { t: "────────────────────────────────", cls: "mute" },
        { t: "01:00:11  LOCAL STORAGE      OK", cls: "ok" },
        { t: "01:00:12  NODE CONTROL       ACTIVE", cls: "ok" },
        { t: "01:00:13  NETWORK STACK      ISOLATED", cls: "bad" },
        { t: "01:00:14  MAIN NODE LINK     RETRY 3/3 TIMEOUT", cls: "bad" },
        { t: "01:00:15  TIME REFERENCE     LOST", cls: "warn" },
        { t: "01:00:16  LOCAL CLOCK        FREE RUNNING", cls: "warn" },
        { t: "────────────────────────────────", cls: "mute" },
        { t: "本地时钟在自由计时。", cls: "dimt" },
        { t: "没有参考时钟可用于校正。", cls: "dimt" },
      ],
    },

    ruleTable: {
      title: "归档选择规则 · SELECTION RULE",
      lines: [
        { t: "ARCHIVE SELECTION RULE", cls: "hi" },
        { t: "归档选择规则", cls: "dimt" },
        { t: "────────────────────────────────", cls: "mute" },
        { t: "有效的恢复参考必须满足：", cls: "" },
        { t: "" },
        { t: "  01. 提供实时可用的网络参考", cls: "ok" },
        { t: "      PROVIDE A LIVE NETWORK REFERENCE", cls: "mute" },
        { t: "" },
        { t: "  02. 是独立于本机时钟的参考", cls: "ok" },
        { t: "      BE INDEPENDENT OF THE LOCAL CLOCK", cls: "mute" },
        { t: "" },
        { t: "  03. 记录完整性可通过校验", cls: "ok" },
        { t: "      PASS THE STORED INTEGRITY CHECK", cls: "mute" },
        { t: "────────────────────────────────", cls: "mute" },
        { t: "本地时钟读数是本机自己的读数，", cls: "warn" },
        { t: "不能作为独立的时间参考。", cls: "warn" },
      ],
    },

    h03Record: {
      title: "H-03 · 历史授时记录",
      lines: [
        { t: "HISTORICAL TIME REFERENCE", cls: "hi" },
        { t: "历史授时记录", cls: "dimt" },
        { t: "  RECORD ID: H-03", cls: "hi" },
        { t: "────────────────────────────────", cls: "mute" },
        { t: "  REFERENCE TIME        01:00:00", cls: "" },
        { t: "  ELAPSED TIME          +00:02:17", cls: "" },
        { t: "  ARCHIVE CHECKSUM      26", cls: "warn" },
        { t: "  CAPTURED AT           2026-10-13 UTC", cls: "" },
        { t: "────────────────────────────────", cls: "mute" },
        { t: "  RECORD STATUS         INTACT", cls: "ok" },
        { t: "  状态                  完好", cls: "dimt" },
      ],
    },

    integrityRule: {
      title: "完整性规则 · INTEGRITY RULE",
      lines: [
        { t: "INTEGRITY RULE / REVISION 1", cls: "hi" },
        { t: "完整性规则 / 修订 1", cls: "dimt" },
        { t: "────────────────────────────────", cls: "mute" },
        { t: "归档中存有一个校验值。", cls: "" },
        { t: "打开 H-03 记录即可看到 ARCHIVE CHECKSUM。", cls: "" },
        { t: "" },
        { t: "将校验值填入下方，", cls: "dimt" },
        { t: "与归档中存储的数值比对。", cls: "dimt" },
        { t: "────────────────────────────────", cls: "mute" },
        { t: "数据位置：H-03 记录 · ARCHIVE CHECKSUM", cls: "warn" },
      ],
    },
  },

  /* ============================================================
     终局报告
     ============================================================ */
  finalReport: [
    { k: "LOCAL TIME",     v: "CALIBRATED", cls: "ok" },
    { k: "SYNCHRONIZATION",v: "PARTIAL",    cls: "warn" },
    { k: "COMMUNICATION",  v: "ONLINE",     cls: "ok" },
    { k: "MAIN NODE",      v: "NO RESPONSE",cls: "bad" },
  ],
};
