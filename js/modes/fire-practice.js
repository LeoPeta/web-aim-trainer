// ====== Fire Practice Mode (打靶) ======
// 4 层 × 1 球：球分别锁死在 z = -12 / -14 / -16 / -18 四个平面上，在各自的矩形里
// 做匀速直线运动，永不离开。长按左键连发（幻影 11 发/秒 / 狂徒 9.75 发/秒）；
// 每球 100 血，命中一发扣 20（即 5 发一杀），打死 0.6 秒后在某层随机点重生。
//
// 为什么是「恒定线速度」而不是恒定角速度：
//   球的线速度 v 与层无关（慢 / 中 / 较快 / 快 / 极快 = 2.0 / 3.4 / 4.9 / 5.73 / 6.75 m/s），
//   四层同一个数。
//   代价是屏幕上的角速度 ω = v / d 随深度递减 —— 近层看着快、远层看着慢。
//   这个取舍是有意的。反过来的方案（恒定 ω，即让水平分量 = ω·d）会让远层球的
//   世界速度成为近层的 1.5 倍，而垂直振幅被 3.8m 上限卡死、四层共用同一个值，
//   于是纵向往返时间 ∝ 1/d —— 18m 撞上下墙的频率正好是 12m 的 1.5 倍，肉眼看得出来。
//   恒定 v 之后四层的纵向往返时间完全一致，代价就是屏幕速度不再一致。
//   这两个性质数学上不可能同时成立，只能二选一。
//   逐层屏幕横扫耗时（中速 v = 3.4）= 2·ax / v = 1.5074·d / v，
//   实测 12m → 5.32s   14m → 6.21s   16m → 7.10s   18m → 7.99s（平均 6.66s）。
//
// 方向为什么不是各向同性：
//   各向同性（方向每次碰边重抽）时平均纵向分量 2/π = 0.637，球有一半时间在以
//   ≥45° 的仰角斜着走，纵向往返比横向短得多 —— 盒子宽一倍，上下墙却被撞得
//   更勤，看起来就是不停上下弹。真实对局的移动以横向为主，所以这里改成
//   「横向为主 + 受限仰角」：dirx 恒为 ±1（水平分量就是 v），diry 是一个
//   |坡度| ≤ tan25° 的随机量。
//   实测（中速 v = 3.4、4000 秒仿真）：平均 |坡度| 0.208，水平分量占 97.9%，
//   纵向往返 9.84 秒（四层一致），是各向同性 3.82 秒的 2.6 倍；
//   横向随深度为 5.33 / 6.21 / 7.10 / 7.99 秒。
//   注意「纵向往返 / 横向往返」这个比值 = ay / (ax·平均|坡度|)，v 被约掉了 ——
//   换速度档位只改快慢，不改四层「有多纵」的形状。

// 四个平面（层）的距离
const FIRE_PLANES = [12, 14, 16, 18];

// 速度档位 → 线速度 (m/s)，四层共用同一个值。
// 5 个数值全部取自无畏契约的武器移动状态（跟枪共用同一套命名与数值）：
//   slow    2.00  持枪静步      fast    5.73  持手枪奔跑
//   mid     3.40  持刀静步      extreme 6.75  持刀奔跑
//   brisk   4.90  持狙奔跑
// 6.75 是基础跑速（持刀奔跑），3.40 是其标准静步（= 6.75 × 0.504）。
// 为什么少了「持步枪奔跑 5.4」：它和「持手枪奔跑 5.73」只差 6.1%（12m 屏幕横扫
// 3.35s vs 3.16s），做成相邻档位玩家分不出来 —— 5 个选项会只有 4 种手感。
// 去掉 5.4、把 6.75 补进顶档之后，相邻比是 1.70 / 1.44 / 1.17 / 1.18，跨度 3.375×。
const FIRE_SPEED = { slow: 2.0, mid: 3.4, brisk: 4.9, fast: 5.73, extreme: 6.75 };

// 平面内的活动矩形：与跟枪模式同款（视野半宽/半高的 60%），垂直再卡
// 3.8m 上限 —— 相机在 y=5、地板在 y=0，不卡的话远层球会沉到地板以下。
// 上限四层共用（12 / 14 / 16 / 18m 全都被卡到 3.8m），加上线速度也恒定，
// 于是四层的纵向往返时间完全相同；横向往返 2·ax / v ∝ d，随深度变长。
// 副作用：屏幕上半高角随深度递减（12m 17.6° → 18m 11.9°），横向恒 37.0°，
// 画面矩形的宽高比因此从 2.1:1 拉到 3.1:1 —— 远层更扁。
const FIRE_AMP_RATIO = 0.6;
const FIRE_MAX_Y_AMP = 3.8;

// 血量 / 伤害 / 重生延迟 / 射速
const FIRE_MAX_HP = 100;
const FIRE_DAMAGE = 20;           // 5 发一杀
const FIRE_RESPAWN_DELAY = 0.6;   // 秒

// 连发速度挡位（发/秒），照 Valorant 的两把步枪取名
const FIRE_RATE_PRESETS = { phantom: 11, vandal: 9.75 };
const FIRE_DEFAULT_RATE_KEY = 'phantom';

// 后坐动画时长 = 射击间隔 × 这个比例（见注册处的 recoilMs getter）。
// 0.9 让幻影落在 81.8ms（≈ 早先按 10 发/秒手调的 80ms，手感不变）、狂徒 92.3ms。
// 为什么留余量而不是取满：triggerRecoil() 的判据是「动画播完了没」，时长严格
// 等于间隔的话，边界帧上 dt 累积与 performance.now() 谁先谁后不确定，判成
// 「没播完」就会漏掉那一发的后坐力 —— 正是 80ms 当初要消灭的症状。
// 余量 9~10ms 不到一帧，肉眼是连续压枪而不是一顿一顿。
const FIRE_RECOIL_RATIO = 0.9;

// 重生点与死亡点的最小距离：每次在 [1, 5] m 内随机抽一个。
// 用拒绝采样，最多试 32 次（沿用六球的做法）；超了就用最后一次抽到的点。
const FIRE_RESPAWN_MIN_DIST = [1, 5];
const FIRE_RESPAWN_MAX_ATTEMPTS = 32;

// 纵向坡度上限。方向不是各向同性，而是「横向为主 + 受限仰角」：
// dirx 恒为 ±1，diry 是 |坡度| ≤ tan25° ≈ 0.466 的随机量 —— 水平分量占比
// 恒 ≥ 90.6%，球永远以横向为主的方向移动，上下只是缓慢漂移。
// 调这个数就是调「纵向有多活」。实测中速 v = 3.4、四层平均的纵向往返
// （横向随深度为 5.33 / 6.21 / 7.10 / 7.99 秒）：
//   15° → 16.8s   20° → 12.8s   25° → 10.0s   30° → 8.2s   35° → 7.1s   45° → 5.3s
// 表里的横/纵比值与速度档位无关（v 在比值里约掉了），换档只改绝对秒数。
const FIRE_MAX_TILT = 25 * Math.PI / 180;
const FIRE_MAX_SLOPE = Math.tan(FIRE_MAX_TILT);

// 视野中心在 z = -d 处对应的世界高度（相机在 (0,5,0)），与跟枪模式一致
const FIRE_EYE_Y = 5;

// ---- Mode settings (global-scope, written by settingGroups[].apply) ----
let fireSpeed = 'mid';
let fireRate = FIRE_RATE_PRESETS[FIRE_DEFAULT_RATE_KEY];

// ---- Runtime state (per run) ----
let fireKills = 0;
// 每个球一份运行时状态，下标 = target.userData.index（本模式只用前 3 个）：
//   target    对应的 Three.js 球（resetTarget 时挂上）
//   plane     当前所在层（FIRE_PLANES 的下标）
//   hp        剩余血量
//   ox / oy   相对视野中心的偏移（世界单位）；世界坐标 = (ox, 5 + oy, -FIRE_PLANES[plane])
//   dirx      水平方向，恒为 ±1（水平分量就是 v，速度大小每帧现算，改速度档位立刻生效）
//   diry      纵向坡度，|diry| ≤ FIRE_MAX_SLOPE；纵向速度 = v * diry
//   deadUntil 死亡结束时刻 (ms)；0 = 活着
let fireBalls = [];

function prepareFireTargets() {
  fireKills = 0;
  fireBalls = [];
  for (let i = 0; i < FIRE_PLANES.length; i++) {
    fireBalls.push({
      target: null,
      plane: i,
      hp: FIRE_MAX_HP,
      ox: 0, oy: 0,
      dirx: 1, diry: 0,
      deadUntil: 0,
    });
  }
}

function fireSpeedValue() {
  return FIRE_SPEED[fireSpeed] || FIRE_SPEED.mid;
}

// 某一层的活动矩形半宽 / 半高（世界单位）
function firePlaneExtent(d) {
  const hFov = cameraFov * Math.PI / 180;
  const vFov = horizontalToVerticalFov(cameraFov, camera.aspect) * Math.PI / 180;
  return {
    ax: Math.tan(hFov / 2) * d * FIRE_AMP_RATIO,
    ay: Math.min(Math.tan(vFov / 2) * d * FIRE_AMP_RATIO, FIRE_MAX_Y_AMP),
  };
}

// ---- 方向采样：横向为主 + 受限仰角 ----
function fireRandomDirx() {
  return Math.random() < 0.5 ? -1 : 1;
}
function fireRandomSlope() {
  return (Math.random() * 2 - 1) * FIRE_MAX_SLOPE;
}
// 撞上下墙后必须朝内走：hitY = +1（撞顶墙）→ 坡度取负
function fireSlopeAwayFrom(hitY) {
  const mag = Math.random() * FIRE_MAX_SLOPE;
  return hitY > 0 ? -mag : mag;
}

function placeFireBall(b) {
  b.target.position.set(b.ox, FIRE_EYE_Y + b.oy, -FIRE_PLANES[b.plane]);
}

// 一帧的匀速推进 + 边界换向。
// 速度大小恒为 v（与层无关），水平分量就是 v、纵向是 v·diry 的缓慢漂移。
// 换向不做镜面反射：矩形台球是准周期的，弹几次之后轨迹就能被预判。这里
// 横向折返点本来就固定在墙上（和镜面反射一样），但每次碰边都重抽纵向坡度，
// 所以纵向不会形成可预判的周期。
function stepFireBall(b, dt) {
  const d = FIRE_PLANES[b.plane];
  const ext = firePlaneExtent(d);
  const speed = fireSpeedValue();   // 恒定线速度，与层无关

  b.ox += b.dirx * speed * dt;
  b.oy += b.diry * speed * dt;

  let hitX = 0, hitY = 0;
  if (b.ox > ext.ax) { b.ox = ext.ax; hitX = 1; }
  else if (b.ox < -ext.ax) { b.ox = -ext.ax; hitX = -1; }
  if (b.oy > ext.ay) { b.oy = ext.ay; hitY = 1; }
  else if (b.oy < -ext.ay) { b.oy = -ext.ay; hitY = -1; }

  if (hitX) b.dirx = -b.dirx;                 // 横向折返
  if (hitY) b.diry = fireSlopeAwayFrom(hitY); // 换到朝内的坡度
  else if (hitX) b.diry = fireRandomSlope();  // 折返时坡度重抽，避免纵向形成周期
}

// 当前没有活球占着的层。3 球 3 层时通常只剩「它刚死的那一层」，
// 但如果两个球在 0.6 秒内先后被打死，两层同时空出来，后重生的那个
// 会随机挑一个 —— 两个球就此换层。
function fireFreePlanes() {
  const taken = new Array(FIRE_PLANES.length).fill(false);
  for (const b of fireBalls) {
    if (b.target && b.deadUntil === 0) taken[b.plane] = true;
  }
  const free = [];
  for (let i = 0; i < taken.length; i++) if (!taken[i]) free.push(i);
  return free;
}

function fireSpawnBall(b, plane, ox, oy) {
  b.plane = plane;
  b.ox = ox;
  b.oy = oy;
  b.dirx = fireRandomDirx();
  b.diry = fireRandomSlope();
  b.hp = FIRE_MAX_HP;
  b.deadUntil = 0;
  b.target.visible = true;
  b.target.scale.set(currentRadius, currentRadius, currentRadius);
  placeFireBall(b);
}

function respawnFireBall(b) {
  const free = fireFreePlanes();
  const plane = free.length > 0 ? free[(Math.random() * free.length) | 0] : b.plane;
  const ext = firePlaneExtent(FIRE_PLANES[plane]);

  // 距死亡点至少 random(1, 5) 米。准心通常就在死亡点附近（刚在那儿打死它），
  // 所以这条规则天然把球从准心下推开了。
  const minDist = FIRE_RESPAWN_MIN_DIST[0]
    + Math.random() * (FIRE_RESPAWN_MIN_DIST[1] - FIRE_RESPAWN_MIN_DIST[0]);
  const deathOx = b.ox, deathOy = b.oy;

  let ox = 0, oy = 0;
  for (let i = 0; i < FIRE_RESPAWN_MAX_ATTEMPTS; i++) {
    ox = (Math.random() * 2 - 1) * ext.ax;
    oy = (Math.random() * 2 - 1) * ext.ay;
    if (Math.hypot(ox - deathOx, oy - deathOy) >= minDist) break;
  }
  fireSpawnBall(b, plane, ox, oy);
}

function resetFireTarget(target) {
  const b = fireBalls[target.userData.index];
  if (!b) return;
  b.target = target;
  // 开局：球 i 占第 i 层，层内随机点、随机方向
  const ext = firePlaneExtent(FIRE_PLANES[b.plane]);
  fireSpawnBall(b, b.plane,
    (Math.random() * 2 - 1) * ext.ax,
    (Math.random() * 2 - 1) * ext.ay);
}

// 命中接管：扣血，血尽则击杀（隐身 0.6s，随后重生）。
// 返回非空即表示「已接管」，click-scoring 不会再调 resetTarget。
function onFireTargetHit(target) {
  const b = fireBalls[target.userData.index];
  if (!b || b.deadUntil > 0) return;   // 死亡窗口内不该被打中（射线已过滤，双保险）

  b.hp -= FIRE_DAMAGE;
  if (b.hp > 0) return;

  fireKills++;
  b.hp = 0;
  b.deadUntil = performance.now() + FIRE_RESPAWN_DELAY * 1000;
  target.visible = false;
}

function updateFireFrame(dt) {
  const now = performance.now();
  for (const b of fireBalls) {
    if (!b.target) continue;
    if (b.deadUntil > 0) {
      // 死亡窗口内冻结（球不可见，位置无所谓），到点后换层/换点重生
      if (now >= b.deadUntil) respawnFireBall(b);
      continue;
    }
    stepFireBall(b, dt);
    placeFireBall(b);
  }
  updateHUD();
}

// 命中率 = 命中 / 发射。没开过火显示 "--"（分母为 0 不算）。
function fireAccuracy() {
  const total = hits + misses;
  if (total === 0) return '--';
  return Math.round(hits / total * 100) + '%';
}

function getFireModeId() {
  // 编码用 S/M/A/F/X。S/M/F 三位刻意保持旧的档位语义（慢/中/快），
  // 这样历史里的 TGT-M* 记录解码出来的档位名跟当年一模一样。
  const speedCode = { slow: 'S', mid: 'M', brisk: 'A', fast: 'F', extreme: 'X' }[fireSpeed] || 'M';
  const sizeCode = { 0.45: 'B', 0.35: 'M', 0.25: 'S', 0.15: 'T' }[currentRadius] || 'M';
  return `TGT-${speedCode}${sizeCode}-${totalTime}`;
}

// 解码器：把历史记录的 ID 还原成人话。
//
// 这里解出的是**档位名**（慢速/中速/较快/快速/极快），不是设置面板上那个
// 带武器状态的标签。原因不是长度，是诚实性：旧的 M 记录当年跑的是 4.5 m/s，
// 不是现在 mid 的 3.4 m/s（持刀静步）。解码成「中（持刀静步）」等于给那局
// 扣一顶它没跑过的帽子。档位名是中性的 —— 当年叫中速，现在也叫中速，两边都成立。
function getFireModeLabel(modeId) {
  const parts = modeId.split('-');
  const ps = parts[1] || '';
  const speedLabel = { S: '慢速', M: '中速', A: '较快', F: '快速', X: '极快' }[ps[0]] || '中速';
  const sizeLabel = { B: '大', M: '中', S: '小', T: '极小' }[ps[1]] || '中';
  const dur = parseInt(parts[2]) || 0;
  const durLabel = dur >= 60 ? (dur / 60) + '分钟' : dur + '秒';
  return `打靶+${speedLabel}+${sizeLabel}+${durLabel}`;
}

registerTrainingMode({
  id: 'firePractice',
  label: '打靶',
  targetCount: 4,
  // 长按左键连发（input.js 的 stepAutoFire），且不采集反应时长 ——
  // 射击间隔恒定（幻影 90.9ms / 狂徒 102.6ms），反应时长这个指标在本模式没有意义。
  autoFire: true,
  // 必须是 getter：射速现在是设置项，注册时写死的数字读不到用户后来改的值
  get fireRateHz() { return fireRate; },
  // 后坐时长同样是 getter，由射速推导 —— 枪的节奏必须跟着射速走。
  // 写死 80ms 时，狂徒 102.6ms 的间隔会在每发之间留下 22.6ms 的静止位（1.4 帧），
  // 枪看着一顿一顿的；推导之后两挡的静止余量都是 9~10ms。
  get recoilMs() { return FIRE_RECOIL_RATIO * 1000 / fireRate; },
  settingGroups: [
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
      apply: v => { fireSpeed = v; },
    },
    {
      key: 'size',
      label: '球大小',
      options: [
        { id: 'big', label: '大', value: 0.45 },
        { id: 'mid', label: '中', value: 0.35, default: true },
        { id: 'small', label: '小', value: 0.25 },
        { id: 'tiny', label: '极小', value: 0.15 },
      ],
      apply: v => { currentRadius = v; },
    },
    // locked：只展示不可改，值由本文件硬编码，不参与全局变量同步。
    {
      key: 'planes',
      label: '平面距离',
      locked: true,
      options: [{ id: 'four', label: '12 / 14 / 16 / 18 m', value: FIRE_PLANES }],
    },
    {
      key: 'rate',
      label: '连发速度',
      options: [
        { id: 'phantom', label: '幻影 11 发/秒', value: FIRE_RATE_PRESETS.phantom, default: true },
        { id: 'vandal', label: '狂徒 9.75 发/秒', value: FIRE_RATE_PRESETS.vandal },
      ],
      apply: v => { fireRate = v; },
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
    { label: '击杀', value: () => fireKills },
    { label: '命中率', value: fireAccuracy },
  ],
  prepareTargets: prepareFireTargets,
  resetTarget: resetFireTarget,
  onFrame: updateFireFrame,
  onTargetHit: onFireTargetHit,
  getScore: () => {
    const total = hits + misses;
    const acc = total > 0 ? hits / total : 0;
    return Math.round(fireKills * 1000 * acc * acc);
  },
  getEndStats: () => {
    const total = hits + misses;
    const acc = total > 0 ? Math.round(hits / total * 100) : 0;
    return {
      accuracy: acc,
      // 有射击的模式用「命中率趋势」，不是跟枪的「在靶率趋势」
      accLegend: '命中率趋势',
      // 带上真实命中/未中，供历史记录和图表 tooltip 使用
      hits: hits,
      misses: misses,
      items: [
        { label: '击杀', value: fireKills },
        { label: '命中', value: hits },
        { label: '未中', value: misses },
        { label: '命中率', value: total > 0 ? acc + '%' : '--' },
      ],
    };
  },
  getModeId: getFireModeId,
  matchesModeId: modeId => modeId.startsWith('TGT-'),
  getModeLabel: getFireModeLabel,
});
