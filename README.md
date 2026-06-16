# web-aim-trainer
一个基于 Three.js 的鼠标准心训练应用，支持多种训练模式、可定制准心、训练数据本地存储与可视化。

---

## 🎯 功能特性

- **3D 训练场景** — Three.js 渲染，支持 144Hz/240Hz 高刷新率
- **多种训练参数** — 距离 / 球体大小 / 时长 / 宫格布局可自由组合
- **可定制准心** — 颜色、线长、间隙、边框、中心点全部可调，实时预览
- **像素级精准渲染** — 准心采用偶数像素 + 物理像素对齐策略，无抗锯齿、无畸形
- **训练数据存储** — localStorage 自动保存最近 50 次训练，按训练模式聚合
- **趋势可视化** — 结束页面展示双 Y 轴折线图（命中率 + 反应时间），鼠标悬浮查看每局详情
- **零依赖部署** — 双击 HTML 即可运行，不需要任何构建工具或本地服务器

---

## 📁 目录结构

```
aim_training/
├── AIM.html              ← 主入口：HTML 结构 + CSS 样式
├── three.min.js          ← Three.js 库（唯一外部依赖）
├── README.md             ← 本文件
└── js/                   ← JS 模块（按职责拆分）
    ├── main.js           ← 全局状态 + 主循环 + resize
    ├── scene.js          ← Three.js 场景初始化
    ├── settings.js       ← 训练参数与子菜单切换
    ├── targets.js        ← 球体创建与重置逻辑
    ├── crosshair.js      ← 准心绘制系统
    ├── history.js        ← localStorage 历史数据
    ├── chart.js          ← 折线图绘制 + tooltip
    ├── hud.js            ← 屏幕 HUD 更新
    ├── training.js       ← 训练状态机
    ├── input.js          ← 鼠标 / 键盘输入处理
    └── preferences.js    ← 用户设置 localStorage 持久化
```

---

## 🧩 模块说明

### 入口与全局

| 文件 | 行数 | 职责 |
|------|------|------|
| **`AIM.html`** | ~280 | HTML 结构（4 个 overlay：主菜单 / 设置 / 暂停 / 结束）+ CSS 样式 + 按顺序引入 10 个 JS 模块 |
| **`main.js`** | ~70 | 全局共享变量声明（`scene` / `camera` / `trainState` 等）、主渲染循环 `animate`、FPS 计数、窗口 resize |

### 渲染层

| 文件 | 行数 | 职责 |
|------|------|------|
| **`scene.js`** | ~50 | 初始化 Three.js：场景、相机（103° FOV）、墙体、地面网格、灯光、Raycaster |
| **`targets.js`** | ~75 | 球体创建（共享材质，独立 geometry）、`resetTarget()` 随机分配新格子、`applyGridConfig()` 切换 9/25 宫格 |
| **`crosshair.js`** | ~135 | Canvas 绘制准心 + 预览：颜色、线长（1-30px）、间隙（0-10px）、边框（0-5px）、中心点（0-6px），物理像素对齐 |

### 数据层

| 文件 | 行数 | 职责 |
|------|------|------|
| **`settings.js`** | ~60 | 训练参数：距离 / 大小 / 时长 / 宫格 / 灵敏度（0.01-2.00），含子菜单切换函数 |
| **`history.js`** | ~50 | localStorage 读写、`getModeId()` 编码训练模式（如 `N-B-60-9`）、按模式筛选记录 |
| **`chart.js`** | ~165 | 折线图绘制（双 Y 轴、动态量程）+ tooltip（鼠标悬浮显示日期与数据）|

### UI 与控制

| 文件 | 行数 | 职责 |
|------|------|------|
| **`hud.js`** | ~7 | 实时更新屏幕顶部得分 / 命中 / 未中 |
| **`training.js`** | ~80 | 状态机：`startTraining` / `pauseTraining` / `resumeTraining` / `endTraining` / `backToMenu` |
| **`input.js`** | ~55 | `mousemove`（视角控制）、`mousedown`（射线检测）、`pointerlockchange`（自动暂停）|
| **`preferences.js`** | ~95 | `savePreferences()` / `loadPreferences()`：所有用户设置自动持久化到 localStorage（key: `aimTrainerPrefs`），下次打开自动恢复 |

---

## 🔄 数据流

### 启动流程

```
HTML 加载
  ↓
three.min.js 加载
  ↓
main.js   → 声明全局变量
  ↓
scene.js  → 创建 scene/camera/renderer/raycaster
  ↓
settings.js → currentDist=8、currentRadius=0.45 等默认值
  ↓
targets.js  → 立即执行：创建 3 个球体加入 scene
  ↓
crosshair.js → 立即执行：初始化准心 canvas，绘制初始准心
  ↓
history/chart/hud/training/input.js → 注册函数与事件监听
  ↓
requestAnimationFrame(animate) → 主循环开始
```

### 一局训练的完整流程

```
点击「开始训练」 → startTraining()
  ↓
重置状态 + applyGridConfig() + resetTarget(每个球)
  ↓
请求 pointer lock → 进入「playing」状态
  ↓
[每帧] animate() → 计时倒数 + Three.js 渲染
[点击] mousedown → raycaster 检测命中 → resetTarget / 累计未中
[移动] mousemove → 更新 yaw/pitch → camera.rotation
[ESC]  pointerlockchange → 自动调用 pauseTraining()
  ↓
计时归零 → endTraining()
  ↓
计算命中率 + 平均反应时间
  ↓
saveRecord() 写入 localStorage
  ↓
drawChart(getRecordsByMode(modeId)) 绘制历史趋势
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

## 🗂️ 训练模式 ID

每次训练记录会按模式 ID 聚合，便于不同设置间的数据对比：

```
模式 ID 格式：距离-大小-时长-宫格

距离  N=近(8m)  M=中(12m)  F=远(16m)
大小  B=大(0.45)  M=中(0.35)  S=小(0.25)  T=极小(0.15)
时长  30 / 60 / 120
宫格  9 / 25

示例：N-B-60-9    = 近 + 大 + 1分钟 + 9宫格
      F-T-120-25 = 远 + 极小 + 2分钟 + 25宫格
```

---

## 💾 数据存储

- **位置**：浏览器 localStorage，key 为 `aimTrainerHistory`
- **路径**：浏览器内部，不在文件系统中（按 origin 隔离）
- **上限**：50 条记录，超出 FIFO 淘汰最老
- **写入时机**：仅在 `endTraining()`（正常计时结束）时写入
- **不写入**：暂停 → 返回菜单（中途退出不污染历史）

每条记录字段：

```json
{
  "modeId": "N-B-60-9",
  "date": 1718123456789,
  "score": 42,
  "hits": 45,
  "misses": 12,
  "accuracy": 79,
  "avgReaction": 320
}
```

---

## 🛠️ 二次开发指引

### 想新增训练参数？

1. `settings.js` 添加全局变量 + `setXxx()` 函数
2. `AIM.html` 添加对应 setting-group UI
3. `history.js` 的 `getModeId()` 加入新维度的编码
4. （可选）`targets.js` 根据新参数调整生成逻辑

### 想新增准心样式？

1. `crosshair.js` 添加全局变量 + `setXxx()` 函数 + 修改 `drawCrosshairOnCtx()`
2. `AIM.html` 准心设置子菜单添加 UI

### 想修改训练场景？

直接编辑 `scene.js` —— 墙、地板、灯光、相机参数都在这里。

---

## ⚙️ 技术要点

- **状态机**：`trainState` 取值 `'menu' | 'playing' | 'paused' | 'over'`，所有 UI 切换围绕这个变量
- **准心抗畸形**：所有需要居中的尺寸（线宽、中心点）强制偶数物理像素，保证 `cx - lw/2` 永远是整数
- **DPI 适配**：准心 canvas 尺寸 = CSS 尺寸 × `devicePixelRatio`，绘制时切换至物理像素坐标系
- **射击精度**：`raycaster.setFromCamera({x:0, y:0}, camera)` 始终从屏幕几何中心发射，与准心绘制位置无关
- **球体重置**：通过 `oldSlot` 记忆 + 排除，确保命中后球体一定移到不同格子

---

## 📦 依赖

- **Three.js**（`three.min.js`）— 唯一外部依赖，已包含在目录中

---

## 🚀 运行

直接双击 `AIM.html`，或在任何浏览器中打开 — **无需安装、无需服务器**。