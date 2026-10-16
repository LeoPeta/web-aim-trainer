// ====== Six-Ball Positioning Mode ======
const SIX_BALL_SPAWN = {
  type: 'randomRect',
  xMin: -8,
  xMax: 8,
  yMin: 2,
  yMax: 12,
  z: -19.85,
  minSeparation: 0.9,
  oldPositionMinDistance: 1.0,
  maxAttempts: 32
};

let targetRandomPositions = {};

function prepareSixBallTargets() {
  targetRandomPositions = {};
}

function resetSixBallTarget(target) {
  const idx = target.userData.index;
  const oldPos = targetRandomPositions[idx] || null;

  let x = 0, y = 0;

  for (let attempt = 0; attempt < SIX_BALL_SPAWN.maxAttempts; attempt++) {
    x = SIX_BALL_SPAWN.xMin + Math.random() * (SIX_BALL_SPAWN.xMax - SIX_BALL_SPAWN.xMin);
    y = SIX_BALL_SPAWN.yMin + Math.random() * (SIX_BALL_SPAWN.yMax - SIX_BALL_SPAWN.yMin);

    if (oldPos && Math.hypot(x - oldPos.x, y - oldPos.y) < SIX_BALL_SPAWN.oldPositionMinDistance) {
      continue;
    }

    let tooClose = false;
    for (const key in targetRandomPositions) {
      if (parseInt(key) === idx) continue;
      const pos = targetRandomPositions[key];
      if (Math.hypot(x - pos.x, y - pos.y) < SIX_BALL_SPAWN.minSeparation) {
        tooClose = true;
        break;
      }
    }

    if (!tooClose) {
      break;
    }
  }

  // If all attempts fail, use the last sampled position rather than blocking.
  targetRandomPositions[idx] = { x, y };
  target.position.set(x, y, SIX_BALL_SPAWN.z);

  target.scale.set(0.15, 0.15, 0.15);
}

function getSixBallModeId() {
  return `6B-XF-T-${totalTime}-RND`;
}

function getSixBallModeLabel(modeId) {
  const parts = modeId.split('-');
  const dur = parseInt(parts[3]);
  const durLabel = dur >= 60 ? (dur / 60) + '分钟' : dur + '秒';
  return `六球定位+超远20m+极小+${durLabel}+随机`;
}

registerTrainingMode({
  id: 'sixBall',
  label: '六球定位',
  targetCount: 6,
  // 前三组 locked：和 3 球同样的四行排版，但只有「训练时间」能改。
  // 这几个值是固定的，由本文件的生成逻辑硬编码（SIX_BALL_SPAWN 的 z=-19.85、
  // scale 0.15、非网格随机），所以没有 apply —— 不参与全局变量同步。
  settingGroups: [
    {
      key: 'distance',
      label: '目标距离',
      locked: true,
      options: [{ id: 'far20', label: '超远 (20m)', value: 20 }],
    },
    {
      key: 'size',
      label: '目标大小',
      locked: true,
      options: [{ id: 'tiny', label: '极小', value: 0.15 }],
    },
    {
      key: 'layout',
      label: '目标布局',
      locked: true,
      options: [{ id: 'random', label: '随机非网格', value: 'random' }],
    },
    {
      key: 'time',
      label: '训练时间',
      options: [
        { id: '30', label: '30秒', value: 30 },
        { id: '60', label: '1分钟', value: 60 },
        { id: '120', label: '2分钟', value: 120 },
      ],
      apply: v => { totalTime = v; },
    },
  ],
  prepareTargets: prepareSixBallTargets,
  resetTarget: resetSixBallTarget,
  getModeId: getSixBallModeId,
  matchesModeId: modeId => modeId.startsWith('6B-'),
  getModeLabel: getSixBallModeLabel
});
