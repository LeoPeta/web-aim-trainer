// ====== Tracking Mode (跟枪) ======
// 准心压在靶上即计分，无需开火。靶子 1 个、永不消失，沿水平随机折返轨迹持续移动。
// 综合得分 = 在靶毫秒数 × 在靶率。

// 速度档位 → 轨迹基频 (Hz)。
// 5 个基频不是拍脑袋定的：先定「15m 处的参考线速度」，再换算成基频。参考线速度
// 与打靶共用同一套武器移动状态（见 fire-practice.js 的 FIRE_SPEED）。换算两步：
//   ω = v15 / 15                                     目标角速度（跟枪是恒定角速度模型）
//   f = ω / (4 · TRACK_AMP_RATIO · tan(hFOV / 2))     基频，stepTrackHorizontal 用它算线速度
// 默认 hFOV = 103° 时 tan(51.5°) = 1.25717，分母 = 3.01721：
//   slow    2.00 m/s → ω 0.1333 → f 0.0442      fast    5.73 m/s → ω 0.3820 → f 0.1266
//   mid     3.40 m/s → ω 0.2267 → f 0.0751      extreme 6.75 m/s → ω 0.4500 → f 0.1491
//   brisk   4.90 m/s → ω 0.3267 → f 0.1083
// ⚠ 这里存的是基频而不是角速度，所以换 FOV 时 ω 会跟着 tan(hFOV/2) 变（85° 打 0.73
// 折，120° 变 1.38 倍）。这是跟枪一直以来的行为，本次没有改动 —— 改成直接存角速度、
// 让 FOV 无关是另一个独立的行为变更。
const TRACK_SPEED_HZ = { slow: 0.0442, mid: 0.0751, brisk: 0.1083, fast: 0.1266, extreme: 0.1491 };
// 振幅占视野半宽的比例（留边，避免靶子贴到画面边缘）
const TRACK_AMP_RATIO = 0.6;
// 折返行程预设：id → 每段行程区间（占半宽 ax 的比例）+ modeId 里的编码字符。
// 下限封住「短期内多次折返」，上限封住「长时间往一个方向移动」。
// 改档位只动这张表 —— 设置面板的选项标签和 modeId 编码都从它派生。
const TRACK_LEG_PRESETS = {
  tight: { label: '紧凑', min: 0.15, max: 0.50, code: 'T' },
  even:  { label: '均衡', min: 0.30, max: 0.80, code: 'E' },
  wide:  { label: '舒展', min: 0.50, max: 1.00, code: 'W' },
};
const TRACK_LEG_DEFAULT = 'even';
// 准心中心点（复用点击模式的射线原点语义，但本文件自持，避免跨文件加载顺序依赖）
const TRACK_CENTER_POINT = { x: 0, y: 0 };

let trackSpeed = 'mid';
// 折返行程：档位 id + 展开后的区间（world 单位由 pickTrackHTurnX 乘 ax 得到）
let trackLegRange = TRACK_LEG_DEFAULT;
let trackLegMin = TRACK_LEG_PRESETS[TRACK_LEG_DEFAULT].min;
let trackLegMax = TRACK_LEG_PRESETS[TRACK_LEG_DEFAULT].max;

function applyTrackLegRange(id) {
  const p = TRACK_LEG_PRESETS[id];
  if (!p) return;
  trackLegRange = id;
  trackLegMin = p.min;
  trackLegMax = p.max;
}

// ---- Runtime state (per run) ----
let trackOnTime = 0;     // 在靶累计秒数
let trackElapsed = 0;    // playing 累计秒数
let trackH = { x: 0, dir: 1, turnX: 0 };   // 水平随机折返状态

function resetTrackingState() {
  trackOnTime = 0;
  trackElapsed = 0;
  trackH.x = 0;
  trackH.dir = 1;
  pickTrackHTurnX(trackAmplitude().ax);
}

// 视野中心在 z = -distance 处对应世界坐标 (0, 5)。振幅按当前 FOV 折算，
// 这样换距离 / 换 FOV 时靶子的视觉运动幅度保持一致。
function trackAmplitude() {
  const d = currentDist;
  const hFov = cameraFov * Math.PI / 180;
  return {
    ax: Math.tan(hFov / 2) * d * TRACK_AMP_RATIO,
  };
}

function trackFrequency() {
  return TRACK_SPEED_HZ[trackSpeed] || TRACK_SPEED_HZ.mid;
}

// ---- 水平随机折返：匀速 + 随机折返点 ----
// 折返点必须落在 [x + minLeg, ax] 内，所以左右边界恒为 ±ax（与固定三角波一致），
// 不会越界；每段行程随机，轨迹因此不可预测。
//
// 行程在 [trackLegMin, trackLegMax]·ax 里抽，再夹到墙。这一步不会产生短于
// trackLegMin 的碎段：设折返点 i 处「本方向到墙距离」为 r_i，由
// x_i = x_{i-1} − dir_i·L_{i-1} 可推出 r_i = 2·ax + L_{i-1} − r_{i-1}，
// 代入 L_{i-1} ≥ trackLegMin·ax 和 r_{i-1} ≤ 2·ax 得 r_i ≥ trackLegMin·ax ——
// 每个折返点都天然至少还剩一个最短行程的空间。前提是 trackLegMin ≤ 1
// （预设表里最大 0.50）且运行中不改档位（改档会重置到 x=0 重新起跑）。
function pickTrackHTurnX(ax) {
  const dir = trackH.dir;
  const reach = Math.abs(ax * dir - trackH.x);   // 本方向还能走的距离
  const want = (trackLegMin + Math.random() * (trackLegMax - trackLegMin)) * ax;
  trackH.turnX = trackH.x + dir * Math.min(want, reach);
}

// 匀速推进 + 到点折返。溢出量带入下一段，保证速度精确、掉帧不丢时间。
function stepTrackHorizontal(dt) {
  const ax = trackAmplitude().ax;
  let remain = trackFrequency() * 4 * ax * dt;   // 与三角波线速度相同
  let guard = 0;
  while (remain > 1e-9 && guard++ < 64) {
    const dir = trackH.dir;
    const dist = (trackH.turnX - trackH.x) * dir;
    if (dist > remain) {
      trackH.x += dir * remain;
      remain = 0;
    } else {
      trackH.x = trackH.turnX;
      remain -= dist;
      trackH.dir = -dir;
      pickTrackHTurnX(ax);
    }
  }
}

// 轨迹偏移量（相对视野中心，单位：世界坐标）。
// 读 trackH 的状态（在 updateTrackingFrame 里推进），不依赖时间参数 —— 折返
// 溢出量带入下一段，掉帧不会丢时间。
function trackOffsetAt() {
  return { x: trackH.x, y: 0 };
}

function trackingPct() {
  return trackElapsed > 0 ? Math.round(trackOnTime / trackElapsed * 100) : 0;
}

// ---- Mode hooks ----
function prepareTrackingTargets() {
  resetTrackingState();
}

function resetTrackingTarget(target) {
  const off = trackOffsetAt();
  target.position.set(off.x, 5 + off.y, -currentDist);
  target.scale.set(currentRadius, currentRadius, currentRadius);
}

function updateTrackingFrame(dt) {
  trackElapsed += dt;
  stepTrackHorizontal(dt);

  const off = trackOffsetAt();
  const target = activeTargets[0];
  if (target) target.position.set(off.x, 5 + off.y, -currentDist);

  // 准心射线命中靶子 = 在靶
  raycaster.setFromCamera(TRACK_CENTER_POINT, camera);
  if (raycaster.intersectObjects(activeTargets).length > 0) {
    trackOnTime += dt;
  }

  updateHUD();
}

function getTrackingModeId() {
  // 轨迹码恒为 'H'（随机游走已下线，不再有第二种）。**这一位不能删**：删掉后
  // modeId 从 5 段变 4 段，历史里的 TRK-R* 会被按新格式解析、读成别的轨迹。
  const pathCode = 'H';
  // 编码用 S/M/A/F/X，与打靶同一套。S/M/F 三位保持旧的档位语义，
  // 所以历史里的 TRK-*M* 记录解码出来的档位名跟当年一模一样。
  const speedCode = { slow: 'S', mid: 'M', brisk: 'A', fast: 'F', extreme: 'X' }[trackSpeed] || 'M';
  const legCode = TRACK_LEG_PRESETS[trackLegRange].code;
  const distCode = { 8: 'N', 12: 'M', 16: 'F' }[currentDist] || 'M';
  const sizeCode = { 0.45: 'B', 0.35: 'M', 0.25: 'S', 0.15: 'T' }[currentRadius] || 'M';
  return `TRK-${pathCode}${speedCode}${legCode}-${distCode}${sizeCode}-${totalTime}`;
}

// 解码器：把历史记录的 ID 还原成人话。
//
// 轨迹码表里三项都留着，哪怕只剩一种还在跑：
//   'H' 水平随机折返 —— 唯一的在役轨迹
//   'R' 随机游走     —— 已下线，但表项必须留，否则旧的 TRK-R* 记录会被
//                       回退成「水平随机折返」，把随机游走的成绩张冠李戴
//   '8' 8字匀速      —— 更早下线，连码位都失效了（它当年占的也是 ps[0]），
//                       所以 TRK-8* 只能落到回退值，显示成「水平随机折返」。
//                       这是一次刻意的取舍；想改成更诚实的「未知轨迹」，
//                       只需换掉下面 pathLabel 的回退字符串。
//
// 折返行程码是后来加的（ps[2]），早于它的记录没有这一位 → undefined →
// 整段省略，旧记录因此仍按原样显示，不会被扣上一顶不属于它的档位帽子。
//
// 速度码解出的同样是**档位名**（慢速/中速/较快/快速/极快），不是设置面板上
// 带武器状态的标签 —— 理由与打靶的 getFireModeLabel 相同：旧的 M 记录当年跑的
// 是 f = 0.10（ω ≈ 0.30），不是现在 mid 的 f = 0.0751（持刀静步）。给历史记录
// 写武器状态等于声称它按那个状态跑过，而它没有。
function getTrackingModeLabel(modeId) {
  const parts = modeId.split('-');
  const ps = parts[1] || '';
  const ds = parts[2] || '';
  const pathLabel = { H: '水平随机折返', R: '随机游走' }[ps[0]] || '水平随机折返';
  const speedLabel = { S: '慢速', M: '中速', A: '较快', F: '快速', X: '极快' }[ps[1]] || '中速';
  const legLabel = { T: '紧凑', E: '均衡', W: '舒展' }[ps[2]];
  const distLabel = { N: '近', M: '中', F: '远' }[ds[0]] || '中';
  const sizeLabel = { B: '大', M: '中', S: '小', T: '极小' }[ds[1]] || '中';
  const dur = parseInt(parts[3]) || 0;
  const durLabel = dur >= 60 ? (dur / 60) + '分钟' : dur + '秒';
  return `跟枪+${pathLabel}+${speedLabel}` + (legLabel ? `+${legLabel}` : '')
    + `+${distLabel}+${sizeLabel}+${durLabel}`;
}

registerTrainingMode({
  id: 'tracking',
  label: '跟枪',
  targetCount: 1,
  noShooting: true,
  settingGroups: [
    {
      key: 'legRange',
      label: '折返行程',
      options: Object.keys(TRACK_LEG_PRESETS).map(id => {
        const p = TRACK_LEG_PRESETS[id];
        return {
          id,
          label: `${p.label}（${p.min.toFixed(2)}~${p.max.toFixed(2)} 半宽）`,
          value: id,
          default: id === TRACK_LEG_DEFAULT,
        };
      }),
      apply: v => { applyTrackLegRange(v); },
    },
    {
      key: 'speed',
      label: '运动速度',
      options: [
        { id: 'slow', label: '慢（持枪静步）', value: 'slow' },
        { id: 'mid', label: '中（持刀静步）', value: 'mid', default: true },
        { id: 'brisk', label: '较快（持狙奔跑）', value: 'brisk' },
        { id: 'fast', label: '快（持手枪奔跑）', value: 'fast' },
        { id: 'extreme', label: '极快（持刀奔跑）', value: 'extreme' },
      ],
      apply: v => { trackSpeed = v; },
    },
    {
      key: 'size',
      label: '靶子大小',
      options: [
        { id: 'big', label: '大', value: 0.45 },
        { id: 'mid', label: '中', value: 0.35, default: true },
        { id: 'small', label: '小', value: 0.25 },
        { id: 'tiny', label: '极小', value: 0.15 },
      ],
      apply: v => { currentRadius = v; },
    },
    {
      key: 'distance',
      label: '目标距离',
      options: [
        { id: 'near', label: '近 (8m)', value: 8 },
        { id: 'mid', label: '中 (12m)', value: 12, default: true },
        { id: 'far', label: '远 (16m)', value: 16 },
      ],
      apply: v => { currentDist = v; },
    },
    {
      key: 'time',
      label: '训练时间',
      options: [
        { id: '30', label: '30秒', value: 30 },
        { id: '60', label: '1分钟', value: 60, default: true },
        { id: '120', label: '2分钟', value: 120 },
      ],
      apply: v => { totalTime = v; },
    },
  ],
  hudItems: [
    { label: '在靶', value: () => trackingPct() + '%' },
  ],
  prepareTargets: prepareTrackingTargets,
  resetTarget: resetTrackingTarget,
  onFrame: updateTrackingFrame,
  getScore: () => {
    if (trackElapsed <= 0) return 0;
    return Math.round(trackOnTime * 1000 * (trackOnTime / trackElapsed));
  },
  getEndStats: () => ({
    accuracy: trackingPct(),
    items: [{ label: '在靶率', value: trackingPct() + '%' }],
  }),
  getModeId: getTrackingModeId,
  matchesModeId: modeId => modeId.startsWith('TRK-'),
  getModeLabel: getTrackingModeLabel,
});
