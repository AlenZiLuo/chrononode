/* ============================================================
   chapter2.js — 第二章剧本：《CHRONONODE》
   备用授时节点 · 恢复授权
   ============================================================ */

const STORY = {

  /* 节点标识 */
  nodeId: "CN-BACKUP-01",

  /* 时钟：凌晨 1 点开始 */
  startTime: "2026-10-13 01:00:00",

  /* ============================================================
     第二章正文
     ============================================================ */
  chapter2: [

    /* ---------- 01 接入备用节点 ---------- */
    [
      { t: "CHRONONODE / BOOT SEQUENCE", c: "cyan bold" },
      { t: "备用授时节点 · 启动序列", c: "dim" },
    ],
    [
      { t: "[BOOT] ChronoNode Recovery Environment", c: "dim" },
      { t: "[BOOT] 备用节点恢复环境", c: "dim" },
    ],
    [
      { t: "[INIT] Loading node configuration ...... OK", c: "dim" },
      { t: "[INIT] 载入节点配置 ............. 通过", c: "dim" },
      { t: "[INIT] Checking local storage ......... OK", c: "dim" },
      { t: "[INIT] 检查本地存储 ............. 通过", c: "dim" },
      { t: "[INIT] Checking time reference ........ FAILED", c: "red" },
      { t: "[INIT] 检查时间基准 ............. 失败", c: "red" },
    ],
    { t: "__CLEAR__" },

    [
      { t: "==========================================================", c: "dark" },
      { t: "  CHRONONODE", c: "cyan bold" },
      { t: "  备用授时节点  ·  BACKUP TIME REFERENCE NODE", c: "dim" },
      { t: "==========================================================", c: "dark" },
    ],
    [
      { t: "NODE ID       CN-BACKUP-01", c: "dim" },
      { t: "节点编号      CN-BACKUP-01", c: "dim" },
      { t: "NODE STATUS   __AMBER__STANDBY", amber: true },
      { t: "节点状态      待机", c: "dim" },
      { t: "NETWORK       ISOLATED", c: "dim" },
      { t: "网络          已隔离", c: "dim" },
      { t: "ACCESS LEVEL  __RED__UNAUTHORIZED", red: true },
      { t: "访问权限      未授权", c: "dim" },
    ],
    [
      { t: "INCOMING ACCESS REQUEST DETECTED", c: "amber bold" },
      { t: "检测到接入请求", c: "amber" },
    ],

    /* ---------- 02 建立操作员会话 ---------- */
    [
      { t: "ACCESS REQUEST RECEIVED", c: "cyan bold" },
      { t: "已接收到接入请求", c: "dim" },
      { t: "  REQUEST SOURCE:  REMOTE OPERATOR", c: "dim" },
      { t: "  请求来源：远程操作员", c: "dim" },
      { t: "  SESSION STATUS:  PENDING", c: "amber" },
      { t: "  会话状态：等待中", c: "dim" },
    ],
    [
      { t: "__HINT__", hint: true, open: "establishSession", text: "[ 建立会话 · ESTABLISH SESSION ]" },
    ],
    { t: "__CLEAR__" },

    [
      { t: "OPERATOR SESSION: ESTABLISHED", c: "green bold" },
      { t: "操作员会话：已建立", c: "green" },
      { t: "  LOCAL NODE ACCESS:    GRANTED", c: "green" },
      { t: "  本地节点访问：已授权", c: "dim" },
      { t: "  RECOVERY PERMISSION:  __RED__DENIED", red: true },
      { t: "  恢复权限：拒绝", c: "dim" },
      { t: "  TIME REFERENCE:       __AMBER__UNAVAILABLE", amber: true },
      { t: "  时间基准：不可用", c: "dim" },
      { t: "  MAIN NODE:            __RED__NO RESPONSE", red: true },
      { t: "  主节点：无响应", c: "dim" },
    ],

    /* ---------- 03 检查节点状态 ---------- */
    [
      { t: "NODE DIAGNOSTICS", c: "cyan bold" },
      { t: "节点诊断", c: "dim" },
    ],
    [
      { t: "__HINT__", hint: true, open: "localStatus",   text: "[01] 本地系统状态 · LOCAL SYSTEM STATUS" },
      { t: "__HINT__", hint: true, open: "commLog",       text: "[02] 通信日志 · COMMUNICATION LOG" },
      { t: "__HINT__", hint: true, open: "recovArchive",  text: "[03] 恢复归档 · RECOVERY ARCHIVE" },
    ],
    { t: "__CLEAR__" },

    /* ---------- 04 发现恢复程序 + 授权记录 ---------- */
    [
      { t: "RECOVERY ARCHIVE / ENTRY 001", c: "cyan bold" },
      { t: "恢复归档 / 条目 001", c: "dim" },
      { t: "==========================================================", c: "dark" },
      { t: "  程序 PROGRAM:      TIME REFERENCE RECOVERY", c: "fg" },
      { t: "                     时间基准恢复", c: "dim" },
      { t: "  状态 STATUS:       __AMBER__LOCKED", amber: true },
      { t: "                     已锁定", c: "dim" },
      { t: "", },
      { t: "  所需授权 REQUIRED AUTHORIZATION:", c: "dim" },
      { t: "    TR-RECOVERY / LEVEL 02", c: "amber" },
      { t: "    第二级恢复授权", c: "dim" },
      { t: "", },
      { t: "  授权数据 AUTHORIZATION DATA:", c: "dim" },
      { t: "    [ENCRYPTED]  已加密", c: "red" },
      { t: "", },
      { t: "  参考源 REFERENCE SOURCE:", c: "dim" },
      { t: "    NOT CONFIGURED  未配置", c: "dark" },
      { t: "==========================================================", c: "dark" },
    ],
    [
      { t: "ARCHIVED NOTE · BG4LFP", c: "cyan bold" },
      { t: "归档留言 · BG4LFP", c: "dim" },
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
    [
      { t: "__HINT__", hint: true, open: "authRecord", text: "[ 查看授权记录 · AUTH RECORD ]" },
    ],

    /* ---------- 05 输入恢复密钥 ---------- */
    [
      { t: "AUTHORIZATION REQUIRED", c: "cyan bold" },
      { t: "需要恢复密钥", c: "dim" },
      { t: "==========================================================", c: "dark" },
      { t: "  将解密得到的密钥输入下方。", c: "dim" },
      { t: "==========================================================", c: "dark" },
    ],
    { t: "__PASSWORD__", answer: "20261013.17", prompt: "请输入恢复密钥 · ENTER RECOVERY KEY", placeholder: "__________.__" },
    [
      { t: "KEY ACCEPTED", c: "green bold" },
      { t: "密钥已接受", c: "green" },
    ],

    /* ---------- 06 授权成功，但问题仍未解决 ---------- */
    [
      { t: "DECRYPTION COMPLETE", c: "green bold" },
      { t: "解密完成", c: "green" },
      { t: "  AUTHORIZATION RECORD: RESTORED", c: "green" },
      { t: "  授权记录：已恢复", c: "dim" },
      { t: "  RECOVERY KEY:         ***", c: "green" },
      { t: "  恢复密钥：已接受", c: "dim" },
      { t: "", },
      { t: "  AUTHORIZATION LEVEL:  TR-RECOVERY", c: "cyan" },
      { t: "  授权级别：TR-RECOVERY", c: "dim" },
      { t: "  PERMISSION:           GRANTED", c: "green bold" },
      { t: "  权限：已授予", c: "dim" },
    ],
    { t: "__CLEAR__" },

    [
      { t: "TIME REFERENCE RECOVERY", c: "cyan bold" },
      { t: "时间基准恢复", c: "dim" },
      { t: "==========================================================", c: "dark" },
      { t: "  授权 AUTHORIZATION:   __GREEN__GRANTED", c: "fg" },
      { t: "                        已授予", c: "dim" },
      { t: "  恢复程序 PROGRAM:     READY", c: "green" },
      { t: "                        就绪", c: "dim" },
      { t: "", },
      { t: "  参考源 REFERENCE:   __AMBER__UNAVAILABLE", amber: true },
      { t: "                      不可用", c: "dim" },
      { t: "  主节点 MAIN NODE:   __RED__NO RESPONSE", red: true },
      { t: "                      无响应", c: "dim" },
      { t: "==========================================================", c: "dark" },
      { t: "SYSTEM STATUS: WAITING FOR OPERATOR", c: "dim" },
      { t: "系统状态：等待操作员", c: "dim" },
    ],
    [
      { t: "__HINT__", hint: true, open: "initRecovery", text: "[ 初始化恢复 · INITIALIZE RECOVERY ]" },
    ],
    { t: "__CLEAR__" },

    [
      { t: "[CHECK] Authorization verified ...... OK", c: "dim" },
      { t: "[CHECK] 授权校验 ............... 通过", c: "dim" },
      { t: "[CHECK] Local node integrity ....... OK", c: "dim" },
      { t: "[CHECK] 本地节点完整性 ......... 通过", c: "dim" },
      { t: "[CHECK] Reference source ........... NOT FOUND", c: "red" },
      { t: "[CHECK] 参考源 ............... 未找到", c: "red" },
    ],
    [
      { t: "RECOVERY INITIALIZATION: BLOCKED", c: "red bold" },
      { t: "恢复初始化：已阻断", c: "red" },
      { t: "", },
      { t: "REASON:  原因", c: "dim" },
      { t: "NO VALID TIME REFERENCE AVAILABLE", c: "amber bold" },
      { t: "没有可用的有效时间基准", c: "amber" },
    ],
    { t: "__CLEAR__" },

    /* ---------- 07 本章结尾 ---------- */
    [
      { t: "[WARN] TIME REFERENCE LOST", c: "amber" },
      { t: "[WARN] 时间基准丢失", c: "amber" },
      { t: "", },
      { t: "  LOCAL CLOCK:      RUNNING", c: "fg" },
      { t: "  本地时钟：行走中", c: "dim" },
      { t: "  REFERENCE CLOCK:  __RED__UNAVAILABLE", red: true },
      { t: "  参考时钟：不可用", c: "dim" },
      { t: "  CLOCK STATUS:     UNVERIFIED", c: "yellow" },
      { t: "  时钟状态：未经验证", c: "dim" },
    ],
    { t: "__CLOCKGLITCH__" },
    [
      { t: "CLOCK DESYNCHRONIZATION DETECTED", c: "red bold" },
      { t: "检测到时钟失同步", c: "red" },
    ],
    { t: "__CLEAR__" },

    [
      { t: "==========================================================", c: "dark" },
      { t: "  CHRONONODE", c: "cyan bold" },
      { t: "==========================================================", c: "dark" },
    ],
    [
      { t: "NODE CONTROL:          ACTIVE", c: "green" },
      { t: "节点控制：活动", c: "dim" },
      { t: "RECOVERY AUTHORIZATION: __GREEN__GRANTED", c: "fg" },
      { t: "恢复授权：已授予", c: "dim" },
      { t: "TIME REFERENCE:        __AMBER__UNVERIFIED", amber: true },
      { t: "时间基准：未经验证", c: "dim" },
      { t: "MAIN NODE:             __RED__NO RESPONSE", red: true },
      { t: "主节点：无响应", c: "dim" },
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
        { t: "已接收到接入请求", c: "dim" },
        { t: "", },
        { t: "  请求来源 REQUEST SOURCE:  REMOTE OPERATOR", c: "dim" },
        { t: "                            远程操作员", c: "dim" },
        { t: "  路由 ROUTE:              PUBLIC NETWORK", c: "dim" },
        { t: "                            公共网络", c: "dim" },
        { t: "  优先级 PRIORITY:         NORMAL", c: "dim" },
        { t: "                            常规", c: "dim" },
        { t: "", },
        { t: "识别到远程操作员接入请求。", c: "fg" },
        { t: "节点处于待机状态，可以接受会话建立。", c: "dim" },
      ],
    },

    localStatus: {
      title: "本地系统状态",
      lines: [
        { t: "[01] LOCAL SYSTEM STATUS", c: "cyan bold" },
        { t: "[01] 本地系统状态", c: "dim" },
        { t: "", },
        { t: "  本地存储 LOCAL STORAGE:    __GREEN__NORMAL", c: "dim" },
        { t: "                              正常", c: "dim" },
        { t: "  节点控制 NODE CONTROL:     __GREEN__ACCESSIBLE", c: "dim" },
        { t: "                              可访问", c: "dim" },
        { t: "  主节点通信 MAIN NODE:      __RED__NO RESPONSE", c: "dim" },
        { t: "                              无响应", c: "dim" },
        { t: "  时间基准 TIME REFERENCE:   __AMBER__UNAVAILABLE", c: "dim" },
        { t: "                              不可用", c: "dim" },
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
        { t: "[02] 通信日志", c: "dim" },
        { t: "", },
        { t: "2026-10-12 15:58:02   主节点 MAIN NODE   链路中断 LINK DOWN", c: "red" },
        { t: "2026-10-12 15:58:07   主节点 MAIN NODE   链路中断 LINK DOWN", c: "red" },
        { t: "2026-10-12 15:59:11   主节点 MAIN NODE   链路中断 LINK DOWN", c: "red" },
        { t: "2026-10-13 00:00:03   主节点 MAIN NODE   重试 RETRY ... 超时 TIMEOUT", c: "red" },
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
        { t: "[03] 恢复归档", c: "dim" },
        { t: "", },
        { t: "  条目 ENTRY 001", c: "cyan" },
        { t: "    程序 PROGRAM:  TIME REFERENCE RECOVERY", c: "fg" },
        { t: "                   时间基准恢复", c: "dim" },
        { t: "    状态 STATUS:   __AMBER__LOCKED", c: "dim" },
        { t: "                   已锁定", c: "dim" },
        { t: "", },
        { t: "检测到一份尚未完成授权的恢复程序。", c: "fg" },
        { t: "该程序需要第二级授权才能启动。", c: "amber" },
      ],
    },

    authRecord: {
      title: "授权记录 · TR-RECOVERY",
      lines: [
        { t: "AUTHORIZATION RECORD / TR-RECOVERY", c: "cyan bold" },
        { t: "授权记录 / TR-RECOVERY", c: "dim" },
        { t: "──────────────────────────────────────────", c: "dark" },
        { t: "  数据状态 DATA STATUS:   ENCRYPTED", c: "red" },
        { t: "                          已加密", c: "dim" },
        { t: "  解密 DECRYPTION:        REQUIRED", c: "amber" },
        { t: "                          需要解密", c: "dim" },
        { t: "", },
        { t: "PAYLOAD / ENCRYPTED HEX", c: "cyan bold" },
        { t: "加密载荷 · 十六进制", c: "dim" },
        { t: "──────────────────────────────────────────", c: "dark" },
        { t: "575A52204348555220575A5220564C4120525148204348555220", c: "green" },
        { t: "52514820574B5548482047525720525148205648594851", c: "green" },
        { t: "──────────────────────────────────────────", c: "dark" },
        { t: "", },
        { t: "ARCHIVED NOTE · BG4LFP", c: "cyan bold" },
        { t: "归档留言 · BG4LFP", c: "dim" },
        { t: "", },
        { t: "The payload is intact.", c: "white" },
        { t: "负载本身是完整的。", c: "dim" },
        { t: "", },
        { t: "Hexadecimal is only its outer shell.", c: "white" },
        { t: "十六进制只是它的外层。", c: "dim" },
        { t: "", },
        { t: "The alphabet has been displaced.", c: "white" },
        { t: "字母表中发生了位移。", c: "dim" },
        { t: "", },
        { t: "Restore each character by reversing the <span class=\"hl\">three-step offset</span>.", c: "white" },
        { t: "逆转那个三位偏移，逐字复原。", c: "dim" },
      ],
    },

    initRecovery: {
      title: "初始化恢复",
      lines: [
        { t: "INITIALIZE RECOVERY", c: "cyan bold" },
        { t: "初始化恢复", c: "dim" },
        { t: "──────────────────────────────────────────", c: "dark" },
        { t: "  授权 AUTHORIZATION:  GRANTED", c: "green" },
        { t: "                        已授予", c: "dim" },
        { t: "  程序 PROGRAM:        TIME REFERENCE RECOVERY", c: "fg" },
        { t: "                        时间基准恢复", c: "dim" },
        { t: "", },
        { t: "即将执行最后一次检查。", c: "dim" },
        { t: "该过程不会修改任何数据。", c: "dim" },
      ],
    },
  },
};
