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
  const mode = getActiveModeConfig();
  if (mode.resetTarget) mode.resetTarget(target);
}

function getModeId() {
  const mode = getActiveModeConfig();
  return mode.getModeId ? mode.getModeId() : '';
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
