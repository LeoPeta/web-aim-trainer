// ====== Training Mode Registry ======
const TRAINING_MODES = {};

function registerTrainingMode(modeConfig) {
  TRAINING_MODES[modeConfig.id] = modeConfig;
}

function getActiveModeConfig() {
  return TRAINING_MODES[currentTrainingMode] || TRAINING_MODES.classic;
}

function getEffectiveTargetCount() {
  return getActiveModeConfig().targetCount;
}

function getEffectiveRadius() {
  const mode = getActiveModeConfig();
  return mode.getRadius ? mode.getRadius() : currentRadius;
}

function getEffectiveDistance() {
  const mode = getActiveModeConfig();
  return mode.getDistance ? mode.getDistance() : currentDist;
}

function isSixBallMode() {
  return currentTrainingMode === 'sixBall';
}

function prepareActiveModeTargets() {
  const mode = getActiveModeConfig();
  if (mode.prepareTargets) mode.prepareTargets();
}

function resetTarget(target) {
  // 先撤掉命中闪白。3球/6球 这类模式命中即瞬移，球带着闪色挪到新位置会残留
  // 40ms 的白影；闪白只对「球留在原地」的打靶模式有意义。打靶的 onTargetHit
  // 接管了命中、不走 resetTarget，所以它的闪白不会被这里撤掉。
  clearTargetFlash(target);
  const mode = getActiveModeConfig();
  if (mode.resetTarget) mode.resetTarget(target);
}

function getModeId() {
  const mode = getActiveModeConfig();
  return mode.getModeId ? mode.getModeId() : '';
}

// Dispatch an optional per-mode hook. Returns true if the active mode
// implements it, so callers can fall back to their default behaviour.
function callModeHook(name, ...args) {
  const mode = getActiveModeConfig();
  const fn = mode[name];
  if (typeof fn !== 'function') return false;
  fn(...args);
  return true;
}

function getModeLabel(modeId) {
  for (const id in TRAINING_MODES) {
    const mode = TRAINING_MODES[id];
    if (mode.matchesModeId && mode.matchesModeId(modeId)) {
      return mode.getModeLabel(modeId);
    }
  }
  return modeId;
}
