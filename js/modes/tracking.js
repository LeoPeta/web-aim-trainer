// ====== Tracking Mode (跟枪) ======
// 准心压在靶上即计分，无需开火。靶子 1 个、永不消失，按所选轨迹持续移动。
// 综合得分 = 在靶毫秒数 × 在靶率。

// 速度档位 → 轨迹基频 (Hz)
const TRACK_SPEED_HZ = { slow: 0.05, mid: 0.10, fast: 0.15 };
// 振幅占视野半宽/半高的比例（留边，避免靶子贴到画面边缘）
const TRACK_AMP_RATIO = 0.6;
// 垂直振幅上限：相机在 y=5、地面在 y=0，限制靶心不低于 y≈1.2，
// 否则远距离时靶子会沉到地面网格以下（classic 模式的目标也都保持在 y≥0.5）。
const TRACK_MAX_Y_AMP = 3.8;
// 随机游走的加速度标度
const TRACK_RANDOM_ACCEL = 8;
// 水平随机折返：每段最短行程（占半宽 ax 的比例）。
// 调大 → 段更长、折返更疏、更接近旧三角波；调小 → 同侧小幅折返更多、更碎。
const TRACK_H_MIN_LEG = 0.12;
// 8 字完整闭合一圈 = 2 个水平周期（x 走 2 圈、y 走 3 圈才回到起点）
const TRACK_LISSAJOUS_PERIODS = 2;
// 8 字弧长查找表的采样数
const TRACK_LUT_SAMPLES = 512;
// 准心中心点（复用点击模式的射线原点语义，但本文件自持，避免跨文件加载顺序依赖）
const TRACK_CENTER_POINT = { x: 0, y: 0 };

let trackPath = 'lissajous';
let trackSpeed = 'mid';

// ---- Runtime state (per run) ----
let trackOnTime = 0;     // 在靶累计秒数
let trackElapsed = 0;    // playing 累计秒数
let trackPhase = 0;      // 运动相位（秒）
let trackRandom = { x: 0, y: 0, vx: 0, vy: 0 };
let trackH = { x: 0, dir: 1, turnX: 0 };   // 水平随机折返状态
let trackLissajousLut = null;   // 8 字弧长表（按 ax/ay 缓存）

function resetTrackingState() {
  trackOnTime = 0;
  trackElapsed = 0;
  trackPhase = 0;
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

// ---- 8字匀速：弧长参数化 ----
// 直接让 θ ∝ t（x=ax·sinθ, y=ay·sin1.5θ）会让靶子在“腰”上快、两端慢。
// 这里建一张累积弧长表，再把时间线性映射到弧长，使靶子沿曲线恒速移动。
function buildLissajousLut(ax, ay) {
  const n = TRACK_LUT_SAMPLES;
  const cum = new Float32Array(n + 1);
  let px = 0, py = 0, acc = 0;   // θ=0 时 x=ax·sin0=0、y=ay·sin0=0
  for (let i = 1; i <= n; i++) {
    const ph = 4 * Math.PI * (i / n);   // θ: 0 → 4π（完整闭合一圈）
    const x = ax * Math.sin(ph);
    const y = ay * Math.sin(1.5 * ph);
    acc += Math.hypot(x - px, y - py);
    cum[i] = acc;
    px = x;
    py = y;
  }
  return { ax, ay, cum, total: acc, n };
}

function getLissajousLut(ax, ay) {
  const lut = trackLissajousLut;
  if (!lut || lut.ax !== ax || lut.ay !== ay) {
    trackLissajousLut = buildLissajousLut(ax, ay);
  }
  return trackLissajousLut;
}

// 给定已走过的弧长，反查曲线参数 u ∈ [0,1)
function lissajousUAtArc(lut, arc) {
  const d = ((arc % lut.total) + lut.total) % lut.total;
  let lo = 0, hi = lut.n;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (lut.cum[mid] < d) lo = mid + 1; else hi = mid;
  }
  const i = Math.max(1, Math.min(lut.n, lo));
  const s0 = lut.cum[i - 1], s1 = lut.cum[i];
  const seg = s1 - s0;
  const frac = seg > 1e-9 ? (d - s0) / seg : 0;
  return (i - 1 + frac) / lut.n;
}

function lissajousOffsetAt(t, ax, ay) {
  const lut = getLissajousLut(ax, ay);
  const period = TRACK_LISSAJOUS_PERIODS / trackFrequency();  // 一圈的时长
  const u = lissajousUAtArc(lut, (t / period) * lut.total);   // 恒速：时间 ∝ 弧长
  const ph = 4 * Math.PI * u;
  return { x: ax * Math.sin(ph), y: ay * Math.sin(1.5 * ph) };
}

// ---- 水平随机折返：匀速 + 随机折返点 ----
// 折返点必须落在 [x + minLeg, ax] 内，所以左右边界恒为 ±ax（与固定三角波一致），
// 不会越界；每段行程随机，轨迹因此不可预测。
function pickTrackHTurnX(ax) {
  const dir = trackH.dir;
  const reach = Math.abs(ax * dir - trackH.x);   // 本方向还能走的距离
  const minLeg = Math.min(TRACK_H_MIN_LEG * ax, reach);
  trackH.turnX = trackH.x + dir * (minLeg + Math.random() * (reach - minLeg));
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
// 水平随机折返 / 随机游走都读各自的状态（在 updateTrackingFrame 里推进）。
function trackOffsetAt(t) {
  const { ax, ay } = trackAmplitude();
  if (trackPath === 'horizontal') {
    return { x: trackH.x, y: 0 };
  }
  if (trackPath === 'random') {
    return { x: trackRandom.x, y: trackRandom.y };
  }
  return lissajousOffsetAt(t, ax, ay);
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
  const off = trackOffsetAt(0);
  target.position.set(off.x, 5 + off.y, -currentDist);
  target.scale.set(currentRadius, currentRadius, currentRadius);
}

function updateTrackingFrame(dt) {
  trackElapsed += dt;
  trackPhase += dt;
  if (trackPath === 'horizontal') stepTrackHorizontal(dt);
  if (trackPath === 'random') stepTrackRandom(dt);

  const off = trackOffsetAt(trackPhase);
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
  const pathCode = { horizontal: 'H', lissajous: '8', random: 'R' }[trackPath] || '8';
  const speedCode = { slow: 'S', mid: 'M', fast: 'F' }[trackSpeed] || 'M';
  const distCode = { 8: 'N', 12: 'M', 16: 'F' }[currentDist] || 'M';
  const sizeCode = { 0.45: 'B', 0.35: 'M', 0.25: 'S', 0.15: 'T' }[currentRadius] || 'M';
  return `TRK-${pathCode}${speedCode}-${distCode}${sizeCode}-${totalTime}`;
}

function getTrackingModeLabel(modeId) {
  const parts = modeId.split('-');
  const ps = parts[1] || '';
  const ds = parts[2] || '';
  const pathLabel = { H: '水平随机折返', '8': '8字匀速', R: '随机游走' }[ps[0]] || '8字匀速';
  const speedLabel = { S: '慢速', M: '中速', F: '快速' }[ps[1]] || '中速';
  const distLabel = { N: '近', M: '中', F: '远' }[ds[0]] || '中';
  const sizeLabel = { B: '大', M: '中', S: '小', T: '极小' }[ds[1]] || '中';
  const dur = parseInt(parts[3]) || 0;
  const durLabel = dur >= 60 ? (dur / 60) + '分钟' : dur + '秒';
  return `跟枪+${pathLabel}+${speedLabel}+${distLabel}+${sizeLabel}+${durLabel}`;
}

registerTrainingMode({
  id: 'tracking',
  label: '跟枪',
  targetCount: 1,
  noShooting: true,
  hint: '准心压在靶上即计分，无需点击',
  settingGroups: [
    {
      key: 'path',
      label: '运动轨迹',
      options: [
        { id: 'horizontal', label: '水平随机折返', value: 'horizontal' },
        { id: 'lissajous', label: '8字匀速', value: 'lissajous', default: true },
        { id: 'random', label: '随机游走', value: 'random' },
      ],
      apply: v => { trackPath = v; },
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
