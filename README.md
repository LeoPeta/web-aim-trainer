🌐 **在线体验** — <https://leopeta.github.io/web-aim-trainer/>

# web-aim-trainer
一个基于 Three.js 的鼠标准心训练应用，支持多种训练模式、可定制准心、训练数据本地存储与可视化。

---

## 🎯 功能特性

- **3D 训练场景** — Three.js 渲染，支持 144Hz/240Hz 高刷新率
- **多种训练模式** — 3 球网格射击 + 六球定位射击（超远、极小、随机大范围）+ 跟枪（水平随机折返 / 随机游走）
- **多种训练参数** — 距离 / 球体大小 / 时长 / 宫格布局可自由组合
- **统一设置面板** — 通用 / 准心 / 各玩法三个 tab：全局设置（FOV、灵敏度、枪支、色彩模式）与玩法参数集中管理
- **昼夜色彩模式** — 通用 tab 可切「夜晚 / 白天」。白天把天空 / 地板 / 墙面换成浅灰、文字转深色、网格转深色；场景配色走 `SCENE_THEMES`、UI 配色走 CSS 变量，一次切换两边同时生效
- **FPS 视角枪支** — 可开关的第一人称枪械模型（复用 gun-editor 导出的模型），开火触发后坐力动画；武器固定 75° FOV，不受视角 FOV 影响
- **可调水平视野 hFOV** — 85°~120° 可调，默认 103°，内部自动换算为 Three.js 垂直 FOV
- **3 秒倒计时** — 训练开始前 3-2-1 倒计时，留出准备时间
- **击中音效** — Web Audio API 合成短促 pop 音，零延迟、零文件依赖
- **可定制准心** — 颜色、线长、间隙、边框、中心点全部可调，实时预览
- **像素级精准渲染** — 准心采用偶数像素 + 物理像素对齐策略，无抗锯齿、无畸形
- **综合评分系统** — 综合命中数、命中率、反应时间的加权评分，反应因子采用非对称高斯（防刷分）
- **训练数据存储** — localStorage 自动保存最近 50 次训练，按训练模式聚合
- **趋势可视化** — 结束页面展示综合得分与命中率双折线图，鼠标悬浮查看每局详情
- **零依赖部署** — 双击 HTML 即可运行，不需要任何构建工具或本地服务器（或直接访问开头的在线版）

---

## 📁 目录结构

```
web-aim-trainer/
├── index.html             ← 主入口：HTML 结构 + CSS 样式
├── three.min.js           ← Three.js 库（本地备份，实际从 CDN 加载）
├── README.md              ← 本文件
├── js/                    ← JS 模块（按职责拆分）
│   ├── main.js            ← 全局状态 + 主循环 + 输入消费层 + resize
│   ├── scene.js           ← Three.js 场景初始化
│   ├── weapon.js          ← 第一人称枪支：独立 layer + 第二台相机渲染、开关、后坐力
│   ├── settings.js        ← 设置面板（通用 / 准心 / 各玩法 tab）
│   ├── targets.js         ← 目标池与 activeTargets 同步
│   ├── modes/             ← 训练模式注册与模式专属逻辑
│   │   ├── registry.js    ← 模式注册表 + getModeId/getModeLabel/resetTarget 分发
│   │   ├── classic.js     ← 3 球网格模式
│   │   ├── six-ball.js    ← 6 球定位随机模式
│   │   └── tracking.js    ← 跟枪模式（水平随机折返 / 随机游走）
│   ├── scoring/           ← 计分系统
│   │   ├── general-score.js ← 综合得分公式
│   │   └── click-scoring.js ← 点击命中/未中/反应时处理
│   ├── crosshair.js       ← 准心绘制系统
│   ├── history.js         ← localStorage 历史数据存储
│   ├── chart.js           ← 折线图绘制 + tooltip
│   ├── hud.js             ← 屏幕 HUD 更新
│   ├── sound.js           ← 击中音效（Web Audio API）
│   ├── training.js        ← 训练状态机
│   ├── input.js           ← 鼠标输入层（200px 尖峰过滤 + 累加原始像素到 pendingMouseX/Y，不碰相机）
│   └── preferences.js     ← 用户设置 localStorage 持久化
└── gun-editor/            ← 独立枪械模型编辑器（模型已集成进游戏，见 js/weapon.js）
    ├── gun-editor.html    ← 编辑器页面（自由视角 / 第一人称预览 / 参数导出）
    └── gun-model.js       ← 枪械建模定义（3 零件：枪身 + 握把 + 弹匣），编辑器与游戏共用
```

---

## 🧩 模块说明

### 入口与全局

| 文件 | 行数 | 职责 |
|------|------|------|
| **`index.html`** | ~568 | HTML 结构（4 个 overlay：主菜单 / 设置 / 暂停 / 结束）+ CSS 样式（含 `:root` / `body.theme-day` 两组色彩变量）+ 按顺序引入核心 / weapon / modes / scoring JS 模块 |
| **`main.js`** | ~172 | 全局共享变量声明（`scene` / `camera` / `trainState` / `cameraFov` / `colorMode` / `pendingMouseX/Y` / `activeTargets` / `WEAPON_LAYER` 等）、hFOV→vFOV 换算、主渲染循环 `animate`（含倒计时递减 + `processMouseMovement()` 每帧消费 + `updateRecoil()` + 渲染状态门控）、FPS 计数、窗口 resize |

### 渲染层

| 文件 | 行数 | 职责 |
|------|------|------|
| **`scene.js`** | ~112 | 初始化 Three.js：场景、相机（UI 默认 103° hFOV，内部换算为 vFOV）、renderer 初始隐藏、墙体、地面网格、灯光（两个灯都 `layers.enable(WEAPON_LAYER)`）、Raycaster；`scene.add(camera)` 让挂在相机下的枪能被遍历到。另含色彩模式的 `SCENE_THEMES` 表 + `applySceneTheme()` / `rebuildGrid()` |
| **`weapon.js`** | ~125 | 第一人称枪支：`createGun()` 建模 → 整棵子树进 `WEAPON_LAYER` → 第二台固定 75° FOV 的 `weaponCamera` 清深度后叠加渲染；`setShowGun()` 全局开关、`triggerRecoil()` / `updateRecoil()` 后坐力动画 |
| **`targets.js`** | ~34 | 创建最多 6 个共享 geometry 目标、按当前模式维护 `activeTargets`；具体重置逻辑由 `js/modes/*` 分发 |
| **`crosshair.js`** | ~137 | Canvas 绘制准心 + 预览：颜色、线长（1-30px）、间隙（0-10px）、边框（0-5px）、中心点（0-6px），物理像素对齐 |

### 数据层

| 文件 | 行数 | 职责 |
|------|------|------|
| **`settings.js`** | ~262 | **设置面板**：tab 条 = 通用 / 准心 / 各玩法（`SETTINGS_GLOBAL_TABS` + 注册的模式），`currentSettingsTab` 控制三个 pane 互斥显示；`MODE_SETTINGS` per-mode 槽 + `renderModeSettings()` 按 `mode.settingGroups` 配置驱动渲染 + `setModeSetting()` / `setTrainingMode()`；`sanitizeModeSettings()` 把存档里失效的 option id 收敛回该组默认值；主菜单模式下拉框 `renderModeSelect()`；全局灵敏度（0.1-2.00，默认 0.5，数值对应 Valorant sens）/ hFOV（85°~120°，默认 103°）/ 色彩模式（`setColorMode()` / `applyColorMode()`） |
| **`history.js`** | ~34 | localStorage 读写、保存记录、按模式筛选记录；模式 ID/Label 已迁移到 `js/modes/` |
| **`modes/registry.js`** | ~63 | 模式注册表，提供 `getModeId()` / `getModeLabel()` / `resetTarget()` / 有效参数分发 |
| **`modes/classic.js`** | ~130 | 3 球网格模式：网格生成、slot 排重、经典 modeId/label |
| **`modes/six-ball.js`** | ~91 | 六球定位模式：超远极小目标、随机非网格生成、六球 modeId/label |
| **`modes/tracking.js`** | ~289 | 跟枪模式：准心压靶即计分（不开火）；两种轨迹——水平随机折返（匀速 + 随机折返点，行程在 `TRACK_LEG_PRESETS` 的区间内抽取后夹到墙，边界恒为 ±ax）、随机游走（随机加速度 + 限速 + 边界反弹）；折返行程档位同时编码进 modeId |
| **`scoring/general-score.js`** | ~19 | 综合得分公式 `calcGeneralScore()` |
| **`scoring/click-scoring.js`** | ~27 | 点击类模式射击处理：`triggerRecoil()`、raycast、命中/未中、反应时、HUD 更新 |
| **`chart.js`** | ~275 | 双折线图绘制（综合得分趋势 + 命中率趋势，独立 Y 轴）+ tooltip（鼠标悬浮显示日期与数据）；`CHART_PALETTE` 按色彩模式提供折线 / 描边配色 |

### UI 与控制

| 文件 | 行数 | 职责 |
|------|------|------|
| **`hud.js`** | ~31 | 实时更新屏幕顶部得分 / 命中 / 未中 |
| **`sound.js`** | ~31 | Web Audio API 合成击中音效（600→250Hz 正弦波，80ms 衰减），`initAudio()` 预热 AudioContext |
| **`training.js`** | ~152 | 状态机：`startTraining`（调用当前模式准备目标 + 3 秒倒计时）/ `pauseTraining` / `resumeTraining` / `endTraining` / `backToMenu`，负责状态切换时清空输入和更新 renderer 可见性 |
| **`input.js`** | ~54 | **输入层**：`mousemove` 累加 raw pixel delta 到 `pendingMouseX/Y`，单事件 `>200px` 尖峰丢弃（CS 式）、不碰灵敏度/相机、pointer lock 丢失时清空 pending、`mousedown` 只做状态 guard 并调用 `handlePrimaryShot()` |
| **`preferences.js`** | ~131 | `savePreferences()` / `loadPreferences()`：`modeSettings`（每模式独立值）+ `currentTrainingMode` + 灵敏度/hFOV/枪支开关/色彩模式/准心设置持久化到 localStorage（key: `aimTrainerPrefs`），旧版顶层值自动迁移进 classic 槽，恢复时先 `sanitizeModeSettings()` 清掉已下线的选项值，下次打开自动恢复 |

---

## 🔄 数据流

### 启动流程

```
HTML 加载
  ↓
three.min.js 从 CDN 加载（本地文件作为备份）
  ↓
main.js   → 声明全局变量
  ↓
scene.js  → 创建 scene/camera/renderer/raycaster + scene.add(camera) + 灯光 enable(WEAPON_LAYER)
  ↓
gun-model.js → 定义 DEFAULT_GUN_PARAMS / createGun()
  ↓
weapon.js → 立即执行 initWeapon()：建 weaponCamera（固定 75°）+ 建模 + 挂到 camera 下 + 全部进 WEAPON_LAYER
  ↓
modes/* + scoring/* → 注册训练模式、模式 ID/Label、计分/射击处理函数
  ↓
settings.js → 全局默认值 currentDist=8 / currentRadius=0.45 / currentGrid='3x3' + MODE_SETTINGS per-mode 槽（classic/sixBall/tracking 各自独立）+ 设置面板 tab 状态
  ↓
targets.js  → 立即执行：创建最多 6 个球体加入 scene，按当前模式激活 3 或 6 个
  ↓
crosshair.js → 立即执行：初始化准心 canvas，绘制初始准心
  ↓
history/chart/hud/sound/training/click-scoring/input/preferences.js → 注册函数与事件监听
  ↓
loadPreferences() → 从 localStorage 恢复用户设置（含 FOV 并更新投影矩阵、枪支开关、色彩模式）
  ↓
renderModeSelect() → 填充主菜单的模式下拉框（无存档时 loadPreferences 会提前返回，所以这里必须再调一次）
  ↓
requestAnimationFrame(animate) → 主循环开始
```

### 一局训练的完整流程

```
点击「开始训练」 → startTraining()
  ↓
重置状态 + prepareActiveModeTargets() + syncActiveTargets() + resetTarget(每个激活球) + initAudio()
  ↓
请求 pointer lock → 进入「countdown」状态，3 秒倒计时
  ↓
倒计时归零 → trainState = 'playing'
  ↓
[每帧] animate() → countdown/playing: 计时 + 无条件调用 processMouseMovement()（消费 pendingMouseX/Y 并应用灵敏度 + camera.rotation）+ updateRecoil() + 渲染（场景一遍 + 武器一遍）；paused/over: 保留最后一帧不连续渲染；menu: 隐藏 canvas 不渲染
[点击] mousedown → triggerRecoil() → raycaster 检测命中 → 得分 + playHitSound() + resetTarget / 累计未中
[移动] mousemove → 单事件 >200px 尖峰丢弃，否则累加到 pendingMouseX/Y（不碰灵敏度/相机）
[ESC]  pointerlockchange → 自动调用 pauseTraining()
  ↓
训练计时归零 → endTraining()
  ↓
计算命中率 + 平均反应时间 + calcGeneralScore() 综合评分
  ↓
saveRecord() 写入 localStorage
  ↓
drawChart() + drawAccChart() 绘制得分与命中率历史趋势
  ↓
显示结束页面
```

---

## 🎮 操作说明

| 操作 | 效果 |
|------|------|
| 鼠标移动 | 控制视角 |
| 鼠标左键 | 射击 |
| `ESC` | 暂停（自动释放 pointer lock）|
| `F11` | 全屏 / 退出全屏 |

---

## 🧭 训练模式

| 模式 | 目标数量 | 目标大小 | 距离/位置 | 生成方式 | 设置说明 |
|------|----------|----------|-----------|----------|----------|
| 3球网格射击 | 3 | 跟随「目标大小」设置 | 近/中/远 | 9宫格 / 25宫格 | 距离、大小、宫格、时间均可调 |
| 六球定位 | 6 | 极小（0.15） | 超远 20m，贴近后墙 | 大范围连续随机，非网格 | 固定 6球/超远/极小/随机；时间可调 |
| 跟枪 | 1 | 跟随「靶子大小」设置 | 近/中/远 | 水平随机折返 / 随机游走 | 轨迹、折返行程、速度、靶子大小、距离、时间均可调 |

跟枪模式不开火：准心射线压在靶上即累计「在靶」时间，综合得分 = 在靶毫秒数 × 在靶率。两种轨迹都按当前 FOV 折算振幅，换距离 / 换 FOV 时视觉运动幅度保持一致。

「水平随机折返」的每段行程在 `[下限, 上限] × 半宽` 里随机抽取，再夹到墙 —— 上限封住「长时间往一个方向移动」，下限封住「短期内多次折返」。区间按**半宽比例**给，所以换距离 / 换 FOV 时折返节奏完全不变（中速下三档恒为 0.38–1.25 / 0.75–2.00 / 1.25–2.50 秒）。

各模式设置互相独立：六球定位不会覆盖 3 球网格射击的距离、大小、宫格设置，跟枪也不会覆盖另外两个；切回去后各自保留之前的设置。

---

## 🗂️ 训练模式 ID

每次训练记录会按模式 ID 聚合，便于不同设置间的数据对比：

```
3球网格射击格式：距离-大小-时长-宫格
六球定位格式：6B-XF-T-时长-RND
跟枪格式：TRK-轨迹速度行程-距离大小-时长

距离  N=近(8m)  M=中(12m)  F=远(16m)  XF=超远(20m)
大小  B=大(0.45)  M=中(0.35)  S=小(0.25)  T=极小(0.15)
时长  30 / 60 / 120
宫格  9 / 25
布局  RND=随机非网格
轨迹  H=水平随机折返  R=随机游走
速度  S=慢  M=中  F=快
行程  T=紧凑(0.15~0.50 半宽)  E=均衡(0.30~0.80)  W=舒展(0.50~1.00)

示例：N-B-60-9        = 近 + 大 + 1分钟 + 9宫格
      F-T-120-25     = 远 + 极小 + 2分钟 + 25宫格
      6B-XF-T-60-RND = 六球定位 + 超远20m + 极小 + 1分钟 + 随机
      TRK-HME-MM-60  = 跟枪 + 水平随机折返 + 中速 + 均衡行程 + 中距离(12m) + 中靶(0.35) + 1分钟
```

> **行程码是后加的**（`ps[2]`）。早于它的记录没有这一位，解码时整段省略 —— 例如
> `TRK-HM-MM-60` 仍显示成「跟枪+水平随机折返+中速+中+中+1分钟」，不会被扣上一顶
> 不属于它的档位帽子。代价是同一个轨迹/速度/距离组合下，老记录与新记录会分到
> 不同的历史桶里，趋势曲线在切换点断开。

> **历史记录里的 8 字轨迹**：`8=8字匀速` 已随该轨迹一并下线（见 `modes/tracking.js`
> 的 `getTrackingModeLabel()`），所以旧存档里形如 `TRK-8M-MM-60` 的记录会落到解码
> 回退值、显示成「水平随机折返」。这是一次刻意的取舍——旧的 8 字记录无法与新轨迹
> 区分。若要改成更诚实的「未知轨迹」，只需换掉该函数里 pathLabel 的回退字符串。

---

## 📊 综合评分公式

```
综合得分 = hits × 100 × accuracy² × reactionFactor

reactionFactor 采用非对称高斯，峰值在 220ms：
  - 反应 < 220ms：严格衰减（防刷分），σ² = 5000
  - 反应 ≥ 220ms：宽松衰减（慢玩家），σ² = 28800
```

设计意图：既防止通过疯狂点击刷分（低反应时间 → accuracy 必须极高才能补偿），又对反应稍慢的玩家保持合理分数。

---

## 🖱️ 输入系统

### 两段式架构（CS 同款）

输入系统采用主流 FPS 的分层结构：**输入层只累加，主循环每帧统一消费**。

```
Input Event(mousemove)
  ↓
输入层 input.js
  - 检查 pointer lock + 状态
  - 读取 movementX / movementY，单事件 >200px 尖峰丢弃
  - 累加到 pendingMouseX / pendingMouseY
  - 不做灵敏度换算，不修改 yaw/pitch，不写 camera
  ↓
每帧 animate() → processMouseMovement()（无条件调用）
  - pending 为 0 直接返回（非锁定/菜单时是廉价 no-op）
  - 一次性消费：radPerPx = SENSITIVITY × sensitivityMultiplier
  - yaw -= pendingMouseX × radPerPx
  - pitch -= pendingMouseY × radPerPx，并 clamp 到 ±89°
  - camera.rotation.y = yaw; camera.rotation.x = pitch
  - 消费后 pendingMouseX / pendingMouseY 清零
```

### 尖峰过滤

```js
const movementX = e.movementX || 0;
const movementY = e.movementY || 0;
if (Math.abs(movementX) > 200 || Math.abs(movementY) > 200) return;  // 单事件尖峰丢弃
pendingMouseX += movementX;
pendingMouseY += movementY;
```

单次异常大的 mousemove（系统唤醒、pointer lock 重入等）会在输入层被直接丢弃，避免视角瞬移。消费层不做限幅——与 CS 一致，pending 多大就放多大，保证手感完全对应。

### 灵敏度公式

```js
SENSITIVITY = 0.07 * Math.PI / 180;  // ≈ 0.001222 rad/px
radPerPx = SENSITIVITY * sensitivityMultiplier;

yaw   -= pendingMouseX * radPerPx;
pitch -= pendingMouseY * radPerPx;
```

| 参数 | 值 | 说明 |
|------|-----|------|
| `SENSITIVITY` | `0.07°` 转弧度（≈0.001222 rad/px） | Valorant yaw 常量，sens=1 时每 count/px 转 0.07°；设置页已展示 |
| `sensitivityMultiplier` | 0.1 ~ 2.00，默认 0.5 | UI 滑块值，直接对应 Valorant sensitivity |
| 输入限制 | `>200px` 单事件丢弃 | `input.js` 尖峰过滤，其余 raw delta 原样累加 |
| `PITCH_LIMIT` | ±89° | 防止垂直视角翻转 |

匹配 Valorant 的前提：Windows 指针速度保持默认 6/11，并关闭鼠标加速。浏览器无法读取 raw input 或系统鼠标加速状态，因此这是 Web 环境下的近似 1:1 匹配。

### 相机 hFOV

UI 中显示和保存的是**水平 FOV（hFOV）**，不是 Three.js 原生的垂直 FOV（vFOV）。

| 参数 | 值 |
|------|-----|
| 范围 | 85° ~ 120° hFOV |
| 默认 | 103° hFOV |
| 存储 | `aimTrainerPrefs.cameraFov` |

Three.js `PerspectiveCamera.fov` 需要的是 vFOV，因此每次应用设置时会根据当前屏幕宽高比换算：

```js
vFOV = 2 * atan(tan(hFOV / 2) / aspect)
camera.fov = vFOV;
camera.updateProjectionMatrix();
```

`updateProjectionMatrix()` 是必须步骤；Three.js 不会在修改 `camera.fov` 后自动重建投影矩阵。窗口 resize 后也会重新按当前 aspect 换算 hFOV → vFOV。

### 相机旋转顺序

```js
camera.rotation.order = 'YXZ';
```

FPS 视角使用 `YXZ` 顺序：水平 yaw 与垂直 pitch 解耦，避免 `XYZ` 顺序下的翻倒/滚转问题。

---

## 🔫 第一人称枪支

枪挂在主相机下（`camera.add(gun)`），但用**独立的 layer + 第二台相机**单独渲染一遍，而不是靠来回切 `visible`。

### 两遍渲染

```js
// 第一遍：场景（主相机，layer 0）
renderer.render(scene, camera);

// 第二遍：武器（weaponCamera，只看 layer 1）
if (!gun.visible) return;              // 枪关掉时退化成单遍渲染
const bg = scene.background;
scene.background = null;               // ← 必须摘掉，见下
renderer.autoClear = false;
try {
  renderer.clearDepth();               // 清深度 → 枪永远压在最前面，不被墙/网格遮挡
  renderer.render(scene, weaponCamera);
} finally {
  renderer.autoClear = true;
  scene.background = bg;
}
```

**`scene.background` 必须临时摘掉**（踩过的坑）：three.js 的 `WebGLBackground.render()` 在背景是 Color 时会置 `forceClear = true`，而清屏条件是

```js
if ( renderer.autoClear || forceClear ) renderer.clear( ... );
```

是**或**关系 —— `autoClear = false` 压不住 `forceClear`。不摘背景的话，第二遍会把刚渲染好的场景连颜色带深度一起抹成背景色，**画面上只剩一把枪**。（`gun-editor.html` 没这个问题，纯粹因为它的 scene 没设 background。）

用 `try / finally` 而不是顺序执行：`autoClear = false` 一旦因异常留在 renderer 上，之后每一帧都不再清屏（画面拖影），且没有任何地方会把它改回来。

### layer 隔离

| 对象 | layer |
|------|-------|
| 场景（网格 / 墙 / 靶子） | 0（默认） |
| 枪整棵子树 | `WEAPON_LAYER` = 1（`gun.traverse(o => o.layers.set(1))`） |
| 主相机 `camera` | 0 → 看不到枪 |
| 武器相机 `weaponCamera` | `layers.set(1)` → 只看得到枪 |

**灯光必须一起 enable**：three.js 的 `layers` 同时过滤灯光（`projectObject` 里 `isLight` 分支也在 `object.layers.test(camera.layers)` 之内）。所以 `scene.js` 里两个灯都要 `layers.enable(WEAPON_LAYER)`，否则武器相机收不到任何光照，枪会渲染成全黑。

`scene.add(camera)` 也是必须的：枪是相机的子节点，只有相机本身在场景图里，`renderer.render(scene, ...)` 的遍历才会走到枪。

### 武器 FOV 固定 75°

`weaponCamera = new THREE.PerspectiveCamera(75, aspect, 0.01, 100)` —— 独立于主相机，所以设置里的「视野 FOV」只改视角，枪的透视完全不变（和 Valorant / CS 的 viewmodel FOV 是同一个思路）。窗口 resize 时 `updateWeaponAspect()` 单独同步它的 `aspect`。

### 后坐力

`handlePrimaryShot()` 开头调用 `triggerRecoil()`（命中与未命中一致），曲线与 `gun-editor.html` 逐字相同：

```
duration = 150ms
位置偏移 (0, 0.04, 0.07)   旋转偏移 (0.12, 0, 0) rad
p = t < 0.25 ? t / 0.25 : 1 - (t - 0.25) / 0.75
```

前 25% 快速后坐、后 75% 缓慢复位；用 `performance.now()` 计时而非累加 `dt`，与编辑器表现一致。一次动画未播完时再次开火不叠加（`recoilAnim` 非空直接忽略）。

---

## 🎨 色彩模式

通用 tab 顶部可切「夜晚 / 白天」。夜晚 = 项目原有配色（默认），白天把场景和 UI 一起换成浅色调。

### 为什么必须分成两半

WebGL 读不到 CSS 变量，所以配色没法只靠一边解决：

| 半边 | 负责者 | 载体 |
|------|--------|------|
| 场景（天空 / 地板 / 墙 / 网格） | `js/scene.js` 的 `applySceneTheme()` | `SCENE_THEMES` 表 |
| UI（页面底色 / 文字 / 边框 / 图表） | `body.theme-day` 类 | `index.html` 里的 CSS 变量 |

`setColorMode()` 负责把两边一起切，并同步设置面板里的按钮 —— 切换是原子的，不会出现场景已经变白、文字还是浅灰的中间态。

### 配色表

| 元素 | 夜晚 | 白天 |
|------|------|------|
| 天空 / 地板（`scene.background`） | `0x181818` | `0xe6e6e6` |
| 墙 | `0x222222` | `0xdcdcdc` |
| 网格主线 / 墙线 | `0x333333` | `0x5a5a5a` |
| 网格副线 | `0x2a2a2a` | `0x9a9a9a` |
| 页面底色 | `#000` | `#e6e6e6` |
| 主文字 / 强调文字 | `#aaa` / `#fff` | `#444` / `#000` |
| 得分折线 / 图例 | `#00ffff` | `#0088aa` |
| 命中率折线 / 图例 | `#ff8800` | `#c85a00` |

**地板没有面片**：它就是 `scene.background` 透过 `GridHelper` 看到的那层底色。所以改 `bg` 等于同时改了天空和地板。

### 两个必须知道的实现细节

**`GridHelper` 只能重建，不能改色。** 它的两个颜色在构造时就烘焙进了 geometry 的顶点色（材质是 `LineBasicMaterial({ vertexColors: true })`），改材质颜色没有任何效果。所以 `rebuildGrid()` 会 `dispose()` 旧的、按新色重建一个。只在切主题时发生，不在每帧路径上。

**`scene.background` 用 `setHex()` 原地改，不换对象。** 因为 `renderWeaponFrame()` 会临时把它摘成 `null` 再还原引用（见上一节），换对象会打乱那套逻辑。

### 图表配色

canvas 里的颜色同样读不到 CSS 变量，所以 `js/chart.js` 同步维护了一份 `CHART_PALETTE`；CSS 侧的 `--c-chart-score` / `--c-chart-acc` 是给图例文字用的，两处必须一致。

只换了三个值：得分线（亮青在浅底上对比度只有 1.00:1）、命中率线（橙 1.91:1）、末点描边（白）。图表的**网格线和轴标签两种模式共用** —— 深色画在浅底上本来就清楚（11.4:1 / 5.95:1），也和「网格变深」的设计意图一致。

### 已知取舍

- **白色准心在白天模式下几乎看不见**（`#fff` 对 `#e6e6e6` 只有 1.25:1）。准心颜色不跟随主题，需要手动去「准心」tab 选黑色。
- **青色靶子在白天模式下看不见**：`0x00ffff` 与 `#e6e6e6` 的相对亮度只差 0.0006，对比度 1.00:1 —— 数值上等于隐形。靶子颜色目前不跟随主题。
- 准心预览底色固定 `#a4a4a4`，不跟主题 —— 它要能同时衬托白准心和黑准心。
- 黑色准心色块自带写死的 `#555` 边框（为了在深色背景上显形），白天模式下会比另外三个色块的边框略深，不影响使用。

---

## 💾 数据存储

- **训练历史**：浏览器 localStorage，key 为 `aimTrainerHistory`
- **用户偏好**：浏览器 localStorage，key 为 `aimTrainerPrefs`，保存当前训练模式、各模式独立参数、灵敏度、hFOV、枪支开关（`showGun`）、色彩模式（`colorMode`）、准心设置
- **路径**：浏览器内部，不在文件系统中（按 origin 隔离）
- **上限**：50 条记录，超出 FIFO 淘汰最老
- **写入时机**：仅在 `endTraining()`（正常计时结束）时写入
- **不写入**：暂停 → 返回菜单（中途退出不污染历史）

每条记录字段：

```json
{
  "modeId": "N-B-60-9",
  "date": 1718123456789,
  "generalScore": 3250,
  "score": 42,
  "hits": 45,
  "misses": 12,
  "accuracy": 79,
  "avgReaction": 320
}
```

---

## 🛠️ 二次开发指引

### 想新增训练模式？

1. 在 `js/modes/` 新增模式文件（如 `tracking-vertical.js`）
2. 调用 `registerTrainingMode({...})`，声明 `id` / `label` / `targetCount` / `hint` / `settingGroups`（设置组：key + label + options[{id,label,value}] + apply）
3. 模式文件提供 `prepareTargets()`、`resetTarget()`、`getModeId()`、`getModeLabel()` 等
4. 如是点击类模式，复用 `js/scoring/click-scoring.js` / `general-score.js`
5. **设置面板的 tab、主菜单下拉框、设置项全部自动生成**（`settings.js` 按 `settingGroups` 渲染），无需改 HTML；只需在 `index.html` 脚本区引入新模式文件
6. 每模式设置值自动获得独立存储槽（`ensureModeSettings` 按 `settingGroups` 默认值初始化）

### 想新增训练参数？

1. **模式专属参数**：在模式文件的 `settingGroups` 数组里加一个 group（key + label + options + apply），设置面板自动渲染、自动独立存储
2. **全局参数**（如灵敏度 / hFOV / 枪支开关）：在 `settings.js` 添加变量 + `setXxx()` 函数，在 `index.html` 的 `#generalSettings` 里加控件，并在 `preferences.js` 的 `savePreferences()` / `loadPreferences()` 里持久化
3. 如参数影响历史分组，在对应模式的 `getModeId()` / `getModeLabel()` 中编码

### 想新增准心样式？

1. `crosshair.js` 添加全局变量 + `setXxx()` 函数 + 修改 `drawCrosshairOnCtx()`
2. `index.html` 设置面板的 `#crosshairSettings` 里添加 UI

### 想改枪械模型？

1. 打开 `gun-editor/gun-editor.html` 调参（自由视角 / 第一人称预览），点「导出」拿到 `var GUN_PARAMS = {...}`
2. 把导出的参数替换 `gun-editor/gun-model.js` 里的 `DEFAULT_GUN_PARAMS`（或作为 `GUN_PARAMS` 另存）
3. 游戏与编辑器共用 `createGun()`，改一处两边同时生效

### 想修改训练场景？

直接编辑 `scene.js` —— 墙、地板、灯光、相机参数都在这里。

### 想调整色彩模式配色？

1. **场景侧**：改 `scene.js` 的 `SCENE_THEMES`（`night` / `day` 两个键）
2. **UI 侧**：改 `index.html` 里的 `:root`（夜晚）和 `body.theme-day`（白天）两组 CSS 变量
3. **图表**：改 `chart.js` 的 `CHART_PALETTE`，并同步 `index.html` 里的 `--c-chart-score` / `--c-chart-acc`
4. 想加第三个模式（如「黄昏」）：在 `SCENE_THEMES` 加一个键 + 在 `index.html` 加一组 `body.theme-xxx` 变量 + 在通用 tab 加一个按钮；另外 `applyColorMode()` 里目前把 class 名硬编码成了 `theme-day`，需要一并改成按模式拼名

### 想修改音效？

直接编辑 `sound.js` —— 当前使用 Web Audio API 合成，可替换为任意波形或音频文件播放。

---

## ⚙️ 技术要点

- **状态机**：`trainState` 取值 `'menu' | 'countdown' | 'playing' | 'paused' | 'over'`，所有 UI 切换围绕这个变量
- **多模式架构**：`js/modes/registry.js` 负责模式注册与分发，具体模式逻辑放在 `js/modes/*.js`，避免在 `training.js` / `targets.js` 堆叠模式 if/else
- **统一设置面板**：tab 条 = `SETTINGS_GLOBAL_TABS`（通用 / 准心）+ 所有注册的模式。三个 pane（`#generalSettings` / `#crosshairSettings` / `#modeSettingsContainer`）由 `currentSettingsTab` 互斥显示，通用与准心 tab 下的控件是静态 HTML，模式 tab 下由 `settingGroups` 配置驱动渲染
- **模式选择双入口**：主菜单下拉框（`#modeSelect`）和设置面板的模式 tab 共享同一个真值 `currentTrainingMode`，且只经 `setTrainingMode()` 写入 —— 两个入口不可能不同步
- **Per-mode 设置**：每个模式在 `settingGroups` 里声明自己的设置组，`settings.js` 通用渲染；`MODE_SETTINGS` 每模式独立存值，切 tab 互不干扰，新模式自动建槽（`ensureModeSettings`）；`sanitizeModeSettings()` 是它的伴生逻辑，在 `loadPreferences()` 里把存档中已不存在的 option id 收敛回该组默认项 —— 否则 `applyModeSettingsToGlobals()` 的 `find()` 会静默落空、`apply` 不执行，全局变量停在旧值，而面板因为没有匹配项会显示第一项，界面与行为就此对不上
- **计分拆分**：综合得分公式放在 `js/scoring/general-score.js`，点击命中处理放在 `js/scoring/click-scoring.js`
- **渲染状态门控**：menu 隐藏 Three.js canvas 且不 render；countdown/playing 连续 render；paused/over 保留最后一帧但停止连续 WebGL render；RAF 主循环仍继续运行
- **武器两遍渲染**：`renderSceneOnce()` 先画场景（主相机），再清深度画枪（`weaponCamera`，固定 75° FOV，只看 `WEAPON_LAYER`）；枪关闭时 `renderWeaponFrame()` 直接返回，退化成单遍渲染
- **色彩模式分两半**：场景配色由 `SCENE_THEMES` + `applySceneTheme()` 管（WebGL 读不到 CSS 变量），UI 配色由 `body.theme-day` 上的 CSS 变量管，`setColorMode()` 一次触发两边
- **`GridHelper` 换色只能重建**：两个颜色烘焙在 geometry 顶点色里，改材质无效，必须 `dispose()` 后重建
- **恢复偏好不回写**：`loadPreferences()` 走 `applyColorMode()` / `applyGunVisibility()` 这类「只同步状态、不落盘」的 apply 版函数，避免在恢复途中把还没读到的设置冲成默认值
- **pending 清理**：状态切换、pointer lock 丢失都会清空 `pendingMouseX/Y`，避免暂停/恢复后残留鼠标位移
- **准心抗畸形**：所有需要居中的尺寸（线宽、中心点）强制偶数物理像素，保证 `cx - lw/2` 永远是整数
- **DPI 适配**：准心 canvas 尺寸 = CSS 尺寸 × `devicePixelRatio`，绘制时切换至物理像素坐标系
- **射击精度**：`raycaster.setFromCamera({x:0, y:0}, camera)` 始终从屏幕几何中心发射，与准心绘制位置无关
- **球体重置**：通过 `oldSlot` 记忆 + 排除，确保命中后球体一定移到不同格子
- **输入系统架构**：`mousemove` 为纯 raw 输入层（累加原始像素到 `pendingMouseX/Y`，单事件 `>200px` 尖峰丢弃），不碰灵敏度/相机；`animate()` 主循环每帧无条件调用 `processMouseMovement()` 一次性消费 pending 并清零
- **尖峰处理**：输入层单事件 `>200px` 直接丢弃（CS 式）；消费层不做限幅，与 CS 手感保持一致
- **灵敏度匹配**：`SENSITIVITY = 0.07 × π/180`（Valorant yaw 常量），滑块值即 Valorant sensitivity，1:1 对应
- **相机旋转顺序**：`rotation.order = 'YXZ'`，FPS 标准顺序，yaw/pitch 独立不干扰
- **hFOV 更新**：UI 数值表示水平 FOV；应用到 Three.js 前先根据 `aspect` 换算为垂直 FOV，再调用 `camera.updateProjectionMatrix()`
- **音效预热**：`startTraining()` 时调用 `initAudio()` 唤醒 AudioContext，避免首次击中时的延迟

---

## 📦 依赖

- **Three.js** `v0.155.0` — 从 jsDelivr CDN 加载，本地 `three.min.js` 作为离线备份

---

## 🚀 运行

直接双击 `index.html`，或在任何浏览器中打开 — **无需安装、无需服务器**。
