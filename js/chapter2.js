/* ============================================================
   chapter2.js — 第二章剧本：《CHRONONODE》
   备用授时节点 · 恢复授权
   ============================================================ */

const STORY = {

  /* 节点标识 */
  nodeId: "CN-BACKUP-01",

  /* 时钟：承接第一章结尾 */
  startTime: "2026-10-13 00:00:03",

  /* ============================================================
     第二章正文
     ============================================================ */
  chapter2: [

    /* ---------- 01 接入备用节点 ---------- */
    [
      { t: "CHRONONODE / BOOT SEQUENCE", c: "cyan bold" },
    ],
    [
      { t: "[BOOT] ChronoNode Recovery Environment", c: "dim" },
    ],
    [
      { t: "[INIT] Loading node configuration ...... OK", c: "dim" },
      { t: "[INIT] Checking local storage ......... OK", c: "dim" },
      { t: "[INIT] Checking time reference ........ FAILED", c: "red" },
    ],
    { t: "__CLEAR__" },

    [
      { t: "==========================================================", c: "dark" },
      { t: "  CHRONONODE", c: "cyan bold" },
      { t: "  BACKUP TIME REFERENCE NODE", c: "dim" },
      { t: "==========================================================", c: "dark" },
    ],
    [
      { t: "NODE ID       CN-BACKUP-01", c: "dim" },
      { t: "NODE STATUS   __AMBER__STANDBY", amber: true },
      { t: "NETWORK       ISOLATED", c: "dim" },
      { t: "ACCESS LEVEL  __RED__UNAUTHORIZED", red: true },
    ],
    [
      { t: "INCOMING ACCESS REQUEST DETECTED", c: "amber bold" },
    ],

    /* ---------- 02 建立操作员会话 ---------- */
    [
      { t: "ACCESS REQUEST RECEIVED", c: "cyan bold" },
      { t: "  REQUEST SOURCE: REMOTE OPERATOR", c: "dim" },
      { t: "  SESSION STATUS: PENDING", c: "amber" },
    ],
    [
      { t: "__HINT__", hint: true, open: "establishSession", text: "[ ESTABLISH SESSION ]" },
    ],
    { t: "__CLEAR__" },

    [
      { t: "OPERATOR SESSION: ESTABLISHED", c: "green bold" },
      { t: "  LOCAL NODE ACCESS:    GRANTED", c: "green" },
      { t: "  RECOVERY PERMISSION:  __RED__DENIED", red: true },
      { t: "  TIME REFERENCE:       __AMBER__UNAVAILABLE", amber: true },
      { t: "  MAIN NODE:            __RED__NO RESPONSE", red: true },
    ],

    /* ---------- 03 检查节点状态 ---------- */
    [
      { t: "NODE DIAGNOSTICS", c: "cyan bold" },
    ],
    [
      { t: "__HINT__", hint: true, open: "localStatus",   text: "[01] LOCAL SYSTEM STATUS" },
      { t: "__HINT__", hint: true, open: "commLog",       text: "[02] COMMUNICATION LOG" },
      { t: "__HINT__", hint: true, open: "recovArchive",  text: "[03] RECOVERY ARCHIVE" },
    ],
    { t: "__CLEAR__" },

    /* ---------- 04 发现恢复程序 ---------- */
    [
      { t: "RECOVERY ARCHIVE / ENTRY 001", c: "cyan bold" },
      { t: "==========================================================", c: "dark" },
      { t: "  PROGRAM:            TIME REFERENCE RECOVERY", c: "fg" },
      { t: "  STATUS:             __AMBER__LOCKED", amber: true },
      { t: "", },
      { t: "  REQUIRED AUTHORIZATION:", c: "dim" },
      { t: "    TR-RECOVERY / LEVEL 02", c: "amber" },
      { t: "", },
      { t: "  AUTHORIZATION DATA:", c: "dim" },
      { t: "    [ENCRYPTED]", c: "red" },
      { t: "", },
      { t: "  REFERENCE SOURCE:", c: "dim" },
      { t: "    NOT CONFIGURED", c: "dark" },
      { t: "==========================================================", c: "dark" },
    ],
    [
      { t: "ARCHIVED NOTE · BG4LFP", c: "cyan bold" },
    ],
    [
      { t: "子洛> 如果你已经进入备用节点，", c: "white" },
      { t: "子洛> 说明地址恢复成功了。", c: "white" },
    ],
    [
      { t: "子洛> 但不要直接启动恢复程序。", c: "amber" },
    ],
    [
      { t: "子洛> 这里保存着一份独立的授权记录。", c: "white" },
      { t: "子洛> 先恢复记录中的内容，再执行下一步。", c: "white" },
    ],
    [
      { t: "子洛> 不要把“能够访问节点”", c: "white" },
      { t: "子洛> 误认为“已经获得恢复权限”。", c: "white" },
    ],
    { t: "__CLEAR__" },

    /* ---------- 05 解密授权数据 ---------- */
    [
      { t: "AUTHORIZATION RECORD / TR-RECOVERY", c: "cyan bold" },
      { t: "==========================================================", c: "dark" },
      { t: "  DATA STATUS:   ENCRYPTED", c: "red" },
      { t: "  DECRYPTION:    REQUIRED", c: "amber" },
      { t: "", },
      { t: "  SOURCE:        LOCAL ARCHIVE", c: "dim" },
      { t: "  PURPOSE:       TIME REFERENCE RECOVERY", c: "dim" },
      { t: "==========================================================", c: "dark" },
    ],
    [
      { t: "__HINT__", hint: true, open: "decryptRecord", text: "[ DECRYPT RECORD ]" },
    ],

    /* ---------- 06 授权成功，但问题仍未解决 ---------- */
    [
      { t: "DECRYPTION COMPLETE", c: "green bold" },
      { t: "  AUTHORIZATION RECORD: RESTORED", c: "green" },
      { t: "  RECOVERY KEY:         ACCEPTED", c: "green" },
      { t: "", },
      { t: "  AUTHORIZATION LEVEL:  TR-RECOVERY", c: "cyan" },
      { t: "  PERMISSION:           GRANTED", c: "green bold" },
    ],
    { t: "__CLEAR__" },

    [
      { t: "TIME REFERENCE RECOVERY", c: "cyan bold" },
      { t: "==========================================================", c: "dark" },
      { t: "  AUTHORIZATION:      __GREEN__GRANTED", c: "fg" },
      { t: "  RECOVERY PROGRAM:   READY", c: "green" },
      { t: "", },
      { t: "  REFERENCE SOURCE:   __AMBER__UNAVAILABLE", amber: true },
      { t: "  MAIN NODE:          __RED__NO RESPONSE", red: true },
      { t: "==========================================================", c: "dark" },
      { t: "SYSTEM STATUS: WAITING FOR OPERATOR", c: "dim" },
    ],
    [
      { t: "__HINT__", hint: true, open: "initRecovery", text: "[ INITIALIZE RECOVERY ]" },
    ],
    { t: "__CLEAR__" },

    [
      { t: "[CHECK] Authorization verified ...... OK", c: "dim" },
      { t: "[CHECK] Local node integrity ....... OK", c: "dim" },
      { t: "[CHECK] Reference source ........... NOT FOUND", c: "red" },
    ],
    [
      { t: "RECOVERY INITIALIZATION: BLOCKED", c: "red bold" },
      { t: "", },
      { t: "REASON:", c: "dim" },
      { t: "NO VALID TIME REFERENCE AVAILABLE", c: "amber bold" },
    ],
    { t: "__CLEAR__" },

    /* ---------- 07 本章结尾 ---------- */
    [
      { t: "[WARN] TIME REFERENCE LOST", c: "amber" },
      { t: "", },
      { t: "  LOCAL CLOCK:      RUNNING", c: "fg" },
      { t: "  REFERENCE CLOCK:  __RED__UNAVAILABLE", red: true },
      { t: "  CLOCK STATUS:     UNVERIFIED", c: "yellow" },
    ],
    { t: "__CLOCKGLITCH__" },
    [
      { t: "CLOCK DESYNCHRONIZATION DETECTED", c: "red bold" },
    ],
    { t: "__CLEAR__" },

    [
      { t: "==========================================================", c: "dark" },
      { t: "  CHRONONODE", c: "cyan bold" },
      { t: "==========================================================", c: "dark" },
    ],
    [
      { t: "NODE CONTROL:          ACTIVE", c: "green" },
      { t: "RECOVERY AUTHORIZATION: __GREEN__GRANTED", c: "fg" },
      { t: "TIME REFERENCE:        __AMBER__UNVERIFIED", amber: true },
      { t: "MAIN NODE:             __RED__NO RESPONSE", red: true },
    ],
    [
      { t: "NEXT OPERATION:", c: "cyan bold" },
      { t: "ESTABLISH A VALID TIME REFERENCE", c: "white bold" },
    ],
    [
      { t: "STATUS: __AMBER__PENDING", amber: true },
    ],
    [
      { t: "AWAITING OPERATOR INPUT__CURSOR__" },
    ],
  ],

  /* ============================================================
     弹窗内容
     ============================================================ */
  modals: {

    establishSession: {
      title: "操作员会话",
      lines: [
        { t: "ACCESS REQUEST RECEIVED", c: "cyan bold" },
        { t: "", },
        { t: "  REQUEST SOURCE:  REMOTE OPERATOR", c: "dim" },
        { t: "  ROUTE:           PUBLIC NETWORK", c: "dim" },
        { t: "  PRIORITY:        NORMAL", c: "dim" },
        { t: "", },
        { t: "识别到远程操作员接入请求。", c: "fg" },
        { t: "节点处于待机状态，可以接受会话建立。", c: "dim" },
      ],
    },

    localStatus: {
      title: "本地系统状态",
      lines: [
        { t: "[01] LOCAL SYSTEM STATUS", c: "cyan bold" },
        { t: "", },
        { t: "  LOCAL STORAGE:   __GREEN__NORMAL", c: "dim" },
        { t: "  NODE CONTROL:    __GREEN__ACCESSIBLE", c: "dim" },
        { t: "  MAIN NODE COMM:  __RED__NO RESPONSE", c: "dim" },
        { t: "  TIME REFERENCE:  __AMBER__UNAVAILABLE", c: "dim" },
        { t: "", },
        { t: "备用节点自身运行正常。", c: "fg" },
        { t: "本地存储与控制链路均可用。", c: "dim" },
        { t: "问题不在本节点。", c: "amber" },
      ],
    },

    commLog: {
      title: "通信日志",
      lines: [
        { t: "[02] COMMUNICATION LOG", c: "cyan bold" },
        { t: "", },
        { t: "2026-10-12 15:58:02   MAIN NODE    LINK DOWN", c: "red" },
        { t: "2026-10-12 15:58:07   MAIN NODE    LINK DOWN", c: "red" },
        { t: "2026-10-12 15:59:11   MAIN NODE    LINK DOWN", c: "red" },
        { t: "2026-10-13 00:00:03   MAIN NODE    RETRY ... TIMEOUT", c: "red" },
        { t: "", },
        { t: "──────────────────────────────────────────", c: "dark" },
        { t: "主节点连续失联。", c: "fg" },
        { t: "无法从主节点取得可靠的时间参考。", c: "amber" },
        { t: "备用节点只能依靠本地时钟维持运行。", c: "dim" },
      ],
    },

    recovArchive: {
      title: "恢复归档",
      lines: [
        { t: "[03] RECOVERY ARCHIVE", c: "cyan bold" },
        { t: "", },
        { t: "  ENTRY 001", c: "cyan" },
        { t: "    PROGRAM:  TIME REFERENCE RECOVERY", c: "fg" },
        { t: "    STATUS:   __AMBER__LOCKED", c: "dim" },
        { t: "", },
        { t: "检测到一份尚未完成授权的恢复程序。", c: "fg" },
        { t: "该程序需要第二级授权才能启动。", c: "amber" },
      ],
    },

    decryptRecord: {
      title: "授权记录 · TR-RECOVERY",
      lines: [
        { t: "AUTHORIZATION RECORD / TR-RECOVERY", c: "cyan bold" },
        { t: "──────────────────────────────────────────", c: "dark" },
        { t: "  DATA STATUS:  ENCRYPTED", c: "red" },
        { t: "  DECRYPTION:   REQUIRED", c: "amber" },
        { t: "", },
        { t: "授权数据处于加密状态。", c: "fg" },
        { t: "需要经过第二层解密才能恢复。", c: "dim" },
        { t: "", },
        { t: "【待续 —— 解密内容尚未配置】", c: "dark" },
      ],
    },

    initRecovery: {
      title: "初始化恢复",
      lines: [
        { t: "INITIALIZE RECOVERY", c: "cyan bold" },
        { t: "──────────────────────────────────────────", c: "dark" },
        { t: "  AUTHORIZATION:  GRANTED", c: "green" },
        { t: "  PROGRAM:        TIME REFERENCE RECOVERY", c: "fg" },
        { t: "", },
        { t: "即将执行最后一次检查。", c: "dim" },
        { t: "该过程不会修改任何数据。", c: "dim" },
      ],
    },
  },
};
