# d_main.c 八股分析

> 文件：`chocolate-doom/src/doom/d_main.c`  
> 规模：2002 行  
> 角色：DOOM 引擎的「科举主考官」——负责整场游戏的生命周期调度、帧循环、状态机切换。

---

## 一、破题：此文件何为？

`d_main.c` 是 DOOM 的**入口枢机**。它不做具体的物理碰撞、不做贴图渲染、不做音效合成，但它决定**何时调用谁**。

类比八股：
- 若将 DOOM 视为一篇策论，此文件便是**破题与承题**——定调子、分段落；
- 真正的排比论证（渲染、物理、AI）散落在 `r_*`、`p_*`、`g_*` 诸篇中。

---

## 二、全局状态（对应 React/Vue 中的 pageState）

| 状态变量 | 类型 | 语义 | 八股映射 |
|---------|------|------|---------|
| `gamestate` | `gamestate_t` | 当前所处大阶段：标题、关卡、过场、结局 | **题眼**——整篇文章的中心论点 |
| `gameaction` | `gameaction_t` | 本帧要执行的「动作」：加载关卡、退出、播放demo | **承题**——下一笔要写什么 |
| `gametic` | `int` | 游戏逻辑帧计数器（35Hz） | **句读**——文章读到第几字 |
| `wipegamestate` | `gamestate_t` | 上一次完成 wipe 时的状态 | **过渡句**——承上启下之记忆 |
| `demosequence` | `int` | 当前 demo 播放到第几段 | **典故索引**——引经据典的页码 |
| `advancedemo` | `boolean` | 是否推进 demo 序列 | **伏笔标记**——是否该换典故 |
| `main_loop_started` | `boolean` | 主循环是否已启动 | **开笔标记**——破题后不可回头 |
| `startskill/startepisode/startmap` | `skill_t/int/int` | 开局参数 | **策论选题**——乡试/会试/殿试 |
| `autostart` | `boolean` | 是否跳过标题直接进入关卡 | **快启模式**——省略起讲 |

> 核心观察：**全局单值状态机**。`gamestate` 一个变量统治全屏渲染分支，没有「分屏」「多关卡并行」的概念。

---

## 三、函数名录（起股骨架）

共提取 28 个函数/方法：

```
 89:void D_DoomLoop (void);              // 主循环声明
127:void D_ConnectNetGame(void);        // 网络连接
128:void D_CheckNetGame(void);          // 网络校验
135:void D_ProcessEvents (void);        // 事件泵
162:boolean D_Display (void);           // 帧渲染调度
290:static void EnableLoadingDisk(void);// 加载磁盘图标
331:void D_BindVariables(void);         // 配置绑定
385:boolean D_GrabMouseCallback(void);  // 鼠标捕获回调
405:void D_RunFrame();                  // 单帧执行体
456:void D_DoomLoop (void);             // 主循环实现
511:void D_PageTicker (void);           // 过场计时
522:void D_PageDrawer (void);           // 过场绘制
532:void D_AdvanceDemo (void);          // 推进Demo
542:void D_DoAdvanceDemo (void);        // 执行推进
630:void D_StartTitle (void);           // 进入标题
687:static char *GetGameName(...);      // 获取游戏名
735:static void SetMissionForPackName(...);// 任务包匹配
771:void D_IdentifyVersion(void);       // 识别IWAD版本
855:static void D_SetGameDescription(void);// 设置窗口标题
915:static boolean D_AddFile(...);      // 加载WAD文件
950:void PrintDehackedBanners(void);    // 打印启动横幅
997:static void InitGameVersion(void);  // 初始化游戏版本
1143:void PrintGameVersion(void);       // 打印版本信息
1160:static void D_Endoom(void);        // 退出画面
1179:boolean IsFrenchIWAD(void);        // 法文IWAD检测
1188:static void LoadIwadDeh(void);     // 加载DEH补丁
1282:static void G_CheckDemoStatusAtExit (void); // 退出检查
1290:void D_DoomMain (void);            // 主入口（argc/argv处理）
```

---

## 四、核心方法八股拆解

### 4.1 D_DoomMain() → 破题
- **破题**：从命令行参数到游戏世界的创世过程。
- **所做**：解析 argv → 识别 IWAD → 加载 WAD → 初始化子系统 → 进入标题或关卡。
- **不做**：不处理实时输入（交给 `D_ProcessEvents`），不做逐帧渲染（交给 `D_DoomLoop`）。
- **八股位次**：**起讲**——总领全文，立定格局。

### 4.2 D_DoomLoop() → 承题
- **破题**：`while (1) { D_RunFrame(); }`，永不返回的死循环。
- **所做**：初始化图形窗口后，将 CPU 交给帧驱动器。
- **不做**：不内含 sleep/idle 逻辑（交给 `TryRunTics` 内部的时序控制）。
- **八股位次**：**承题**——接过起讲的话头，自此文章进入正文循环。

### 4.3 D_RunFrame() → 起股
- **破题**：单帧的完整生命周期：时序 → 逻辑 → 渲染 → 刷新。
- **所做**：
  1. `I_StartFrame()` —— 帧起始 IO
  2. `TryRunTics()` —— 执行游戏逻辑（固定 35Hz，可能一次跑多 tic）
  3. `S_UpdateSounds()` —— 更新 3D 音效位置
  4. `D_Display()` —— 根据 `gamestate` 分发渲染
  5. `I_FinishUpdate()` —— 双缓冲翻页
- **不做**：不做网络同步预测（网络层在 `net_client.c`），不做多线程任务派发。
- **八股位次**：**起股**——文章的第一股排比，定 rhythm。

### 4.4 D_Display() → 中股
- **破题**：根据 `gamestate` 进行「状态分发式渲染」。
- **所做**：
  - `GS_LEVEL` → `AM_Drawer` + `ST_Drawer` + `R_RenderPlayerView`
  - `GS_INTERMISSION` → `WI_Drawer`
  - `GS_FINALE` → `F_Drawer`
  - `GS_DEMOSCREEN` → `D_PageDrawer`
- **不做**：不做 shader/流水线/GPU 命令提交（OpenGL/Vulkan 时代远未来临）。
- **八股位次**：**中股**——全文重心，笔墨最浓处。

### 4.5 D_ProcessEvents() → 后股
- **破题**：从 OS 事件队列消费输入，分发到各 Responder。
- **所做**：`I_GetEvent()` → 按优先级调用 `F_Responder` / `M_Responder` / `G_Responder`。
- **不做**：不做输入缓冲队列的持久化（掉帧即丢事件，靠 `I_StartTic` 补偿）。
- **八股位次**：**后股**——对仗中股，输入与输出呼应。

### 4.6 D_StartTitle() / D_PageTicker() → 束股
- **破题**：标题画面与 demo 循环的状态机推进。
- **所做**：`gameaction = ga_nothing`，重置 demo 序列，启动自动播放。
- **不做**：不做关卡加载（那是 `G_InitNew` 的职责）。
- **八股位次**：**束股**——收束全文，回到开篇的「标题」状态，循环往复。

---

## 五、状态机：gamestate 的八股起承转合

```
GS_DEMOSCREEN (标题/Demo) 
        ↓ ga_loadlevel
    GS_LEVEL (关卡中)
        ↓ ga_completed
    GS_INTERMISSION (过关画面)
        ↓ ga_victory / ga_worlddone
    GS_FINALE (结局动画)
        ↓ ga_nothing
    GS_DEMOSCREEN (回到标题)
```

> 没有 `GS_LOADING` 状态！加载是瞬态动作（`gameaction`），不是稳态。此乃 DOS 时代「黑屏加载」之遗风。

---

## 六、并发改造想象（束股之后：展望）

### 6.1 当前架构的「单线程八股」局限

| 维度 | 现状 | 瓶颈 |
|-----|------|------|
| 渲染 | 单线程 `D_Display()` → `I_FinishUpdate()` | CPU 软渲染，帧率锁 35Hz 逻辑 tic |
| 状态 | `gamestate` 全局单值 | 无法分屏、无法预览其他关卡 |
| 网络 | `TryRunTics()` 内阻塞同步 tic | 延迟敏感，没有客户端预测 |
| 输入 | 主线程直接消费 OS 事件 | 无输入线程，复杂操作会卡帧 |

### 6.2 现代化改造的「八股新篇」

| 改造点 | 思路 | 对应八股修辞 |
|-------|------|-------------|
| **状态隔离** | `gamestate` 按 `player_id` / `context_id` 隔离，支持分屏与回放 | **分承**——一题多解 |
| **渲染解耦** | `D_Display()` 仅生成「渲染命令列表」，提交给独立渲染线程/GPU | **转喻**——言在此而意在彼 |
| **网络预测** | 客户端本地先跑「预测 tic」，服务端回包后再调和 | **伏笔千里**——先写后照应 |
| **输入队列** | 独立输入线程写环形缓冲区，主线程按 `gametic` 消费 | **对仗**——上下句各管一摊 |
| **ECS 实体** | `players[]` 数组 → Entity-Component-System | **散体变骈文**——结构化排比 |

### 6.3 最保守的 Chocolate-Doom 式改造

Chocolate-Doom 的宗旨是**保留原版行为**。因此最符合其哲学的改造是：

> **不改 `D_DoomLoop` 的时序契约**，只在 `I_FinishUpdate()` 内部做垂直同步（VSync）与帧间插值；`TryRunTics()` 仍严格跑 35Hz，但允许渲染线程以任意帧率插值显示。

此乃**「旧瓶装新酒」**——八股格式不变，内容 modernization。

---

## 七、结论：一图胜千言

```
┌─────────────────────────────────────────┐
│  D_DoomMain()  破题：创世               │
│      ↓                                  │
│  D_DoomLoop()  承题：死循环              │
│      ↓                                  │
│  ┌──────────────────────────────┐       │
│  │ D_RunFrame()    起股          │       │
│  │   TryRunTics()  中股·逻辑      │       │
│  │   D_Display()   中股·渲染      │       │
│  │   I_FinishUpdate()  束股·刷新  │       │
│  └──────────────────────────────┘       │
│      ↓                                  │
│  D_StartTitle()  回到开篇               │
└─────────────────────────────────────────┘
```

---

*分析完成于 2026-05-17。未修改任何源码，纯粹以「八股」之结构化思维，拆解 1993 年 Id Software 之遗产。*
