// ====== Classic Grid Mode ======
let GRID_COLS = 5, GRID_ROWS = 5;
let GRID_X_START = -2, GRID_Y_START = 0.5, GRID_STEP = 1;
let GRID_Z = -8;

// Slot tracking: map from target index to its current slot key
let targetSlots = {};
let usedSlots = new Set();

function prepareClassicTargets() {
  if (currentGrid === '3x3') {
    GRID_COLS = 3; GRID_ROWS = 3;
    GRID_X_START = -1; GRID_Y_START = 4; GRID_STEP = 1;
  } else {
    GRID_COLS = 5; GRID_ROWS = 5;
    GRID_X_START = -2; GRID_Y_START = 3; GRID_STEP = 1;
  }
  GRID_Z = -currentDist;
  targetSlots = {};
  usedSlots = new Set();
}

function resetClassicTarget(target) {
  const idx = target.userData.index;

  // Remember old slot to exclude it when picking new position
  const oldSlot = targetSlots[idx] || null;

  if (oldSlot) {
    usedSlots.delete(oldSlot);
    delete targetSlots[idx];
  }

  if (usedSlots.size >= GRID_COLS * GRID_ROWS) {
    usedSlots.clear();
    targetSlots = {};
  }

  let col, row, key;
  do {
    col = Math.floor(Math.random() * GRID_COLS);
    row = Math.floor(Math.random() * GRID_ROWS);
    key = col + ',' + row;
  } while (usedSlots.has(key) || key === oldSlot);

  usedSlots.add(key);
  targetSlots[idx] = key;

  target.position.set(
    GRID_X_START + col * GRID_STEP,
    GRID_Y_START + row * GRID_STEP,
    GRID_Z
  );

  target.scale.set(currentRadius, currentRadius, currentRadius);
}

function getClassicModeId() {
  const distCode = {8:'N', 12:'M', 16:'F'}[currentDist];
  const sizeCode = {0.45:'B', 0.35:'M', 0.25:'S', 0.15:'T'}[currentRadius];
  const gridCode = currentGrid === '3x3' ? '9' : '25';
  return `${distCode}-${sizeCode}-${totalTime}-${gridCode}`;
}

function getClassicModeLabel(modeId) {
  const parts = modeId.split('-');
  const distLabel = {N:'近', M:'中', F:'远'}[parts[0]];
  const sizeLabel = {B:'大', M:'中', S:'小', T:'极小'}[parts[1]];
  const durLabel = parts[2] >= 60 ? (parts[2] / 60) + '分钟' : parts[2] + '秒';
  const gridLabel = parts[3] === '9' ? '9宫格' : '25宫格';
  return `${distLabel}+${sizeLabel}+${durLabel}+${gridLabel}`;
}

registerTrainingMode({
  id: 'classic',
  label: '3球网格射击',
  targetCount: 3,
  locksCustomSettings: false,
  hint: '',
  getRadius: () => currentRadius,
  getDistance: () => currentDist,
  prepareTargets: prepareClassicTargets,
  resetTarget: resetClassicTarget,
  getModeId: getClassicModeId,
  matchesModeId: modeId => !modeId.startsWith('6B-'),
  getModeLabel: getClassicModeLabel
});
