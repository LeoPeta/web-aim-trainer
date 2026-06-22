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
  locksCustomSettings: true,
  hint: '固定: 6球 / 超远20m / 极小 / 随机大范围',
  getRadius: () => 0.15,
  getDistance: () => 20,
  prepareTargets: prepareSixBallTargets,
  resetTarget: resetSixBallTarget,
  getModeId: getSixBallModeId,
  matchesModeId: modeId => modeId.startsWith('6B-'),
  getModeLabel: getSixBallModeLabel
});
