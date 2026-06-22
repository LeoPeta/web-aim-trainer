# web-aim-trainer
一个基于 Three.js 的鼠标准心训练应用，支持多种训练模式、可定制准心、训练数据本地存储与可视化。

---

## 🎯 功能特性

- **3D 训练场景** — Three.js 渲染，支持 144Hz/240Hz 高刷新率
- **多种训练模式** — 标准 3 球网格射击 + 6 球定位射击（超远、极小、随机大范围）
- **多种训练参数** — 距离 / 球体大小 / 时长 / 宫格布局可自由组合
- **可调水平视野 hFOV** — 85°~120° 可调，默认 103°，内部自动换算为 Three.js 垂直 FOV
- **3 秒倒计时** — 训练开始前 3-2-1 倒计时，留出准备时间
- **击中音效** — Web Audio API 合成短促 pop 音，零延迟、零文件依赖
- **可定制准心** — 颜色、线长、间隙、边框、中心点全部可调，实时预览
- **像素级精准渲染** — 准心采用偶数像素 + 物理像素对齐策略，无抗锯齿、无畸形
- **综合评分系统** — 综合命中数、命中率、反应时间的加权评分，反应因子采用非对称高斯（防刷分）
- **训练数据存储** — localStorage 自动保存最近 50 次训练，按训练模式聚合
- **趋势可视化** — 结束页面展示综合得分与命中率双折线图，鼠标悬浮查看每局详情
- **零依赖部署** — 双击 HTML 即可运行，不需要任何构建工具或本地服务器

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
│   ├── settings.js        ← 训练参数与子菜单切换
│   ├── targets.js         ← 目标池与 activeTargets 同步
│   ├── modes/             ← 训练模式注册与模式专属逻辑
│   │   ├── registry.js    ← 模式注册表 + getModeId/getModeLabel/resetTarget 分发
│   │   ├── classic.js     ← 标准 3 球网格模式
│   │   └── six-ball.js    ← 6 球定位随机模式
│   ├── scoring/           ← 计分系统
│   │   ├── general-score.js ← 综合得分公式
│   │   └── click-scoring.js ← 点击命中/未中/反应时处理
│   ├── crosshair.js       ← 准心绘制系统
│   ├── history.js         ← localStorage 历史数据存储
│   ├── chart.js           ← 折线图绘制 + tooltip
│   ├── hud.js             ← 屏幕 HUD 更新
│   ├── sound.js           ← 击中音效（Web Audio API）
│   ├── training.js        ← 训练状态机
│   ├── input.js           ← 鼠标输入层（buffer 累加，不碰相机）
│   └── preferences.js     ← 用户设置 localStorage 持久化
└── gun-editor/            ← 独立枪械模型编辑器（暂存，未集成进游戏）
    ├── gun-editor.html    ← 编辑器页面（自由视角 / 第一人称预览 / 参数导出）
    └── gun-model.js       ← 枪械建模定义（2 零件：枪身 + 握把）
```

---

## 🧩 模块说明

### 入口与全局

| 文件 | 行数 | 职责 |
|------|------|------|
| **`index.html`** | ~386 | HTML 结构（5 个 overlay：主菜单 / 玩法设置 / 准心设置 / 暂停 / 结束）+ CSS 样式 + 按顺序引入核心 / modes / scoring JS 模块 |
| **`main.js`** | ~156 | 全局共享变量声明（`scene` / `camera` / `trainState` / `cameraFov` / `rawMouse` / `activeTargets` 等）、hFOV→vFOV 换算、主渲染循环 `animate`（含倒计时递减 + raw input 消费层 + 渲染状态门控）、FPS 计数、窗口 resize |

### 渲染层

| 文件 | 行数 | 职责 |
|------|------|------|
| **`scene.js`** | ~56 | 初始化 Three.js：场景、相机（UI 默认 103° hFOV，内部换算为 vFOV）、renderer 初始隐藏、墙体、地面网格、灯光、Raycaster |
| **`targets.js`** | ~34 | 创建最多 6 个共享 geometry 目标、按当前模式维护 `activeTargets`；具体重置逻辑由 `js/modes/*` 分发 |
| **`crosshair.js`** | ~137 | Canvas 绘制准心 + 预览：颜色、线长（1-30px）、间隙（0-10px）、边框（0-5px）、中心点（0-6px），物理像素对齐 |

### 数据层

| 文件 | 行数 | 职责 |
|------|------|------|
| **`settings.js`** | ~102 | 训练模式、距离 / 大小 / 时长 / 宫格 / 灵敏度（0.1-2.00，默认 0.5，数值对应 Valorant sens）/ hFOV（85°~120°，默认 103°），含 UI 切换函数 |
| **`history.js`** | ~34 | localStorage 读写、保存记录、按模式筛选记录；模式 ID/Label 已迁移到 `js/modes/` |
| **`modes/registry.js`** | ~53 | 模式注册表，提供 `getModeId()` / `getModeLabel()` / `resetTarget()` / 有效参数分发 |
| **`modes/classic.js`** | ~87 | 标准 3 球网格模式：网格生成、slot 排重、经典 modeId/label |
| **`modes/six-ball.js`** | ~80 | 六球定位模式：超远极小目标、随机非网格生成、六球 modeId/label |
| **`scoring/general-score.js`** | ~19 | 综合得分公式 `calcGeneralScore()` |
| **`scoring/click-scoring.js`** | ~24 | 点击类模式射击处理：raycast、命中/未中、反应时、HUD 更新 |
| **`chart.js`** | ~257 | 双折线图绘制（综合得分趋势 + 命中率趋势，独立 Y 轴）+ tooltip（鼠标悬浮显示日期与数据）|

### UI 与控制

| 文件 | 行数 | 职责 |
|------|------|------|
| **`hud.js`** | ~6 | 实时更新屏幕顶部得分 / 命中 / 未中 |
| **`sound.js`** | ~31 | Web Audio API 合成击中音效（600→250Hz 正弦波，80ms 衰减），`initAudio()` 预热 AudioContext |
| **`training.js`** | ~114 | 状态机：`startTraining`（调用当前模式准备目标 + 3 秒倒计时）/ `pauseTraining` / `resumeTraining` / `endTraining` / `backToMenu`，负责状态切换时清空输入和更新 renderer 可见性 |
| **`input.js`** | ~64 | **输入层**：`mousemove` 只采样+清洗尖峰+累加 raw pixels 到 `rawMouse`（不碰灵敏度/相机）、pointer lock 丢失时清空 buffer、`mousedown` 只做状态 guard 并调用 `handlePrimaryShot()` |
| **`preferences.js`** | ~116 | `savePreferences()` / `loadPreferences()`：训练模式、训练参数、灵敏度、hFOV、准心设置自动持久化到 localStorage（key: `aimTrainerPrefs`），下次打开自动恢复 |

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
scene.js  → 创建 scene/camera/renderer/raycaster
  ↓
modes/* + scoring/* → 注册训练模式、模式 ID/Label、计分/射击处理函数
  ↓
settings.js → currentDist=8、currentRadius=0.45、currentTrainingMode='classic' 等默认值
  ↓
targets.js  → 立即执行：创建最多 6 个球体加入 scene，按当前模式激活 3 或 6 个
  ↓
crosshair.js → 立即执行：初始化准心 canvas，绘制初始准心
  ↓
history/chart/hud/sound/training/click-scoring/input/preferences.js → 注册函数与事件监听
  ↓
loadPreferences() → 从 localStorage 恢复用户设置（含 FOV 并更新投影矩阵）
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
[每帧] animate() → countdown/playing: 计时 + 消费 rawMouse 并应用灵敏度 + camera.rotation + Three.js 渲染；paused/over: 保留最后一帧不连续渲染；menu: 隐藏 canvas 不渲染
[点击] mousedown → raycaster 检测命中 → 得分 + playHitSound() + resetTarget / 累计未中
[移动] mousemove → 采样+清洗尖峰 → 累加 raw pixels 到 rawMouse（不碰灵敏度/相机）
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

六球定位模式不会覆盖3球网格射击的距离、大小、宫格设置；切回3球网格射击后会保留之前的3球网格射击设置。

---

## 🗂️ 训练模式 ID

每次训练记录会按模式 ID 聚合，便于不同设置间的数据对比：

```
3球网格射击格式：距离-大小-时长-宫格
六球定位格式：6B-XF-T-时长-RND

距离  N=近(8m)  M=中(12m)  F=远(16m)  XF=超远(20m)
大小  B=大(0.45)  M=中(0.35)  S=小(0.25)  T=极小(0.15)
时长  30 / 60 / 120
宫格  9 / 25
布局  RND=随机非网格

示例：N-B-60-9       = 近 + 大 + 1分钟 + 9宫格
      F-T-120-25    = 远 + 极小 + 2分钟 + 25宫格
      6B-XF-T-60-RND = 六球定位 + 超远20m + 极小 + 1分钟 + 随机
```

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

### 三层架构

输入系统采用类似主流 FPS 的分层结构：**输入层只累加，主循环每帧统一消费**。

```
Input Event(mousemove)
  ↓
输入层 input.js
  - 检查 pointer lock + 状态
  - `|movementX/Y| > 1000px` 的极端尖峰直接丢弃
  - `800px ~ 1000px` 的大位移限幅到 800px，避免低灵敏度快甩粘滞
  - 累加 raw pixels 到 rawMouse.dx / rawMouse.dy
  - 不做灵敏度换算，不修改 yaw/pitch，不写 camera
  ↓
Raw Mouse Buffer(main.js)
  - const rawMouse = { dx: 0, dy: 0 }
  ↓
每帧 animate()
  - 读 rawMouse
  - 立即清零 buffer
  - 在 camera 消费层计算 radPerPx = SENSITIVITY × sensitivityMultiplier
  - yaw -= dx × radPerPx
  - pitch -= dy × radPerPx，并 clamp 到 ±89°
  - camera.rotation.set(pitch, yaw, 0)
```

这样可以避免在高频 mousemove 回调里直接写相机，保证相机只在 render tick 中更新一次，输入采样与相机系统解耦。

### 灵敏度公式

```js
SENSITIVITY = 0.07 * Math.PI / 180;  // ≈ 0.001222 rad/px
radPerPx = SENSITIVITY * sensitivityMultiplier;

yaw   -= rawMouse.dx * radPerPx;
pitch -= rawMouse.dy * radPerPx;
```

| 参数 | 值 | 说明 |
|------|-----|------|
| `SENSITIVITY` | `0.07°` 转弧度 | Valorant yaw 常量，sens=1 时每 count/px 转 0.07° |
| `sensitivityMultiplier` | 0.1 ~ 2.00，默认 0.5 | UI 滑块值，直接对应 Valorant sensitivity |
| `CLAMP_MOUSE_DELTA` | 800px | 单事件大位移限幅阈值，保留快甩但削顶 |
| `DROP_MOUSE_DELTA` | 1000px | 极端 Pointer Lock 尖峰丢弃阈值 |
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

## 💾 数据存储

- **训练历史**：浏览器 localStorage，key 为 `aimTrainerHistory`
- **用户偏好**：浏览器 localStorage，key 为 `aimTrainerPrefs`，保存训练模式、3球网格射击参数、灵敏度、hFOV、准心设置
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

1. 在 `js/modes/` 新增模式文件（如 `tracking-horizontal.js`）
2. 在新文件中调用 `registerTrainingMode({...})`
3. 模式文件自己提供 target count、有效参数、`prepareTargets()`、`resetTarget()`、`getModeId()`、`getModeLabel()`
4. 如是点击类模式，复用 `js/scoring/click-scoring.js` / `general-score.js`
5. 在 `index.html` 增加模式按钮，并在脚本区引入新模式文件

### 想新增训练参数？

1. 全局参数：在 `settings.js` 添加变量 + `setXxx()` 函数，并在 `preferences.js` 持久化
2. 模式专属参数：优先放在对应 `js/modes/*.js`，由模式的有效参数/helper 使用
3. 如参数影响历史分组，在对应模式的 `getModeId()` / `getModeLabel()` 中编码

### 想新增准心样式？

1. `crosshair.js` 添加全局变量 + `setXxx()` 函数 + 修改 `drawCrosshairOnCtx()`
2. `index.html` 准心设置子菜单添加 UI

### 想修改训练场景？

直接编辑 `scene.js` —— 墙、地板、灯光、相机参数都在这里。

### 想修改音效？

直接编辑 `sound.js` —— 当前使用 Web Audio API 合成，可替换为任意波形或音频文件播放。

---

## ⚙️ 技术要点

- **状态机**：`trainState` 取值 `'menu' | 'countdown' | 'playing' | 'paused' | 'over'`，所有 UI 切换围绕这个变量
- **多模式架构**：`js/modes/registry.js` 负责模式注册与分发，具体模式逻辑放在 `js/modes/*.js`，避免在 `training.js` / `targets.js` 堆叠模式 if/else
- **计分拆分**：综合得分公式放在 `js/scoring/general-score.js`，点击命中处理放在 `js/scoring/click-scoring.js`
- **渲染状态门控**：menu 隐藏 Three.js canvas 且不 render；countdown/playing 连续 render；paused/over 保留最后一帧但停止连续 WebGL render；RAF 主循环仍继续运行
- **rawMouse buffer 清理**：状态切换、pointer lock 丢失、非 active 状态都会清空 `rawMouse`，避免暂停/恢复后消费陈旧鼠标增量
- **准心抗畸形**：所有需要居中的尺寸（线宽、中心点）强制偶数物理像素，保证 `cx - lw/2` 永远是整数
- **DPI 适配**：准心 canvas 尺寸 = CSS 尺寸 × `devicePixelRatio`，绘制时切换至物理像素坐标系
- **射击精度**：`raycaster.setFromCamera({x:0, y:0}, camera)` 始终从屏幕几何中心发射，与准心绘制位置无关
- **球体重置**：通过 `oldSlot` 记忆 + 排除，确保命中后球体一定移到不同格子
- **输入系统架构**：`mousemove` 为纯输入层（采样+清洗+累加 raw pixels），不碰灵敏度/相机；`animate()` 主循环每帧统一消费 `rawMouse`，应用灵敏度后写入 `camera.rotation`
- **尖峰处理**：输入层采用双阈值策略，`800px~1000px` 大位移限幅保留快甩响应，`>1000px` 极端 Pointer Lock 尖峰直接丢弃
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
