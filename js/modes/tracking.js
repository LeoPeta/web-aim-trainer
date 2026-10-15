// ====== Tracking Mode (跟枪) ======
// 准心压在靶上即计分，无需开火。靶子 1 个、永不消失，按所选轨迹持续移动。
// 综合得分 = 在靶毫秒数 × 在靶率。

// 速度档位 → 轨迹基频 (Hz)
const TRACK_SPEED_HZ = { slow: 0.05, mid: 0.10, fast: 0.15 };
// 振幅占视野半宽/半高的比例（留边，避免靶子贴到画面边缘）
const TRACK_AMP_RATIO = 0.6;
// 垂直振幅上限：相机在 y=5、地面在 y=0，限制靶心不低于 y≈1.2，
// 否则远距离时靶子会沉到地面以下（classic 模式的目标也都保持在 y≥0.5）。
const TRACK_MAX_Y_AMP = 3.8;
// 随机游走的加速度标度
const TRACK_RANDOM_ACCEL = 8;
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

let trackPath = 'horizontal';
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
let trackRandom = { x: 0, y: 0, vx: 0, vy: 0 };
let trackH = { x: 0, dir: 1, turnX: 0 };   // 水平随机折返状态

function resetTrackingState() {
  trackOnTime = 0;
  trackElapsed = 0;
  trackRandom = { x: 0, y: 0, vx: 0, vy: 0 };
  trackH.x = 0;
  trackH.dir = 1;
  pickTrackHTurnX(trackAmplitude().ax);
}

// 视野中心在 z = -distance 处对应世界坐标 (0, 5)。振幅按当前 FOV 折算，
// 这样换距离 / 换 FOV 时靶子的视觉运动幅度保持一致。
function trackAmplitude() {
  const d = currentDist;
  const hFov = cameraFov * Math.PI / 180;
  const vFov = horizontalToVerticalFov(cameraFov, camera.aspect) * Math.PI / 180;
  return {
    ax: Math.tan(hFov / 2) * d * TRACK_AMP_RATIO,
    ay: Math.min(Math.tan(vFov / 2) * d * TRACK_AMP_RATIO, TRACK_MAX_Y_AMP),
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
// 两种轨迹都读各自的状态（在 updateTrackingFrame 里推进），不再依赖时间参数。
function trackOffsetAt() {
  if (trackPath === 'horizontal') {
    return { x: trackH.x, y: 0 };
  }
  return { x: trackRandom.x, y: trackRandom.y };
}

// 随机游走：随机加速度 + 限速 + 边界反弹
function stepTrackRandom(dt) {
  const { ax, ay } = trackAmplitude();
  const vmax = trackFrequency() * 4 * ax;
  trackRandom.vx += (Math.random() - 0.5) * TRACK_RANDOM_ACCEL * vmax * dt;
  trackRandom.vy += (Math.random() - 0.5) * TRACK_RANDOM_ACCEL * vmax * dt;
  trackRandom.vx = Math.max(-vmax, Math.min(vmax, trackRandom.vx));
  trackRandom.vy = Math.max(-vmax, Math.min(vmax, trackRandom.vy));
  trackRandom.x += trackRandom.vx * dt;
  trackRandom.y += trackRandom.vy * dt;
  if (trackRandom.x > ax)  { trackRandom.x = ax;  trackRandom.vx = -Math.abs(trackRandom.vx); }
  if (trackRandom.x < -ax) { trackRandom.x = -ax; trackRandom.vx =  Math.abs(trackRandom.vx); }
  if (trackRandom.y > ay)  { trackRandom.y = ay;  trackRandom.vy = -Math.abs(trackRandom.vy); }
  if (trackRandom.y < -ay) { trackRandom.y = -ay; trackRandom.vy =  Math.abs(trackRandom.vy); }
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
  if (trackPath === 'horizontal') stepTrackHorizontal(dt);
  if (trackPath === 'random') stepTrackRandom(dt);

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
  const pathCode = { horizontal: 'H', random: 'R' }[trackPath] || 'H';
  const speedCode = { slow: 'S', mid: 'M', fast: 'F' }[trackSpeed] || 'M';
  const legCode = TRACK_LEG_PRESETS[trackLegRange].code;
  const distCode = { 8: 'N', 12: 'M', 16: 'F' }[currentDist] || 'M';
  const sizeCode = { 0.45: 'B', 0.35: 'M', 0.25: 'S', 0.15: 'T' }[currentRadius] || 'M';
  return `TRK-${pathCode}${speedCode}${legCode}-${distCode}${sizeCode}-${totalTime}`;
}

// 解码器：把历史记录的 ID 还原成人话。'8'（8字匀速）已随该轨迹一并下线，
// 所以旧的 TRK-8* 记录会落到回退值、显示成「水平随机折返」——这是刻意取舍，
// 想改成「未知轨迹」只需换掉这里的回退字符串。
//
// 折返行程码是后来加的（ps[2]），早于它的记录没有这一位 → undefined →
// 整段省略，旧记录因此仍按原样显示，不会被扣上一顶不属于它的档位帽子。
function getTrackingModeLabel(modeId) {
  const parts = modeId.split('-');
  const ps = parts[1] || '';
  const ds = parts[2] || '';
  const pathLabel = { H: '水平随机折返', R: '随机游走' }[ps[0]] || '水平随机折返';
  const speedLabel = { S: '慢速', M: '中速', F: '快速' }[ps[1]] || '中速';
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
      key: 'path',
      label: '运动轨迹',
      options: [
        { id: 'horizontal', label: '水平随机折返', value: 'horizontal', default: true },
        { id: 'random', label: '随机游走', value: 'random' },
      ],
      apply: v => { trackPath = v; },
    },
    {
      // 只作用于「水平随机折返」；随机游走不看这两个值。
      key: 'legRange',
      label: '折返行程（水平随机折返）',
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
        { id: 'slow', label: '慢', value: 'slow' },
        { id: 'mid', label: '中', value: 'mid', default: true },
        { id: 'fast', label: '快', value: 'fast' },
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
  getRadius: () => currentRadius,
  getDistance: () => currentDist,
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
