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
  hint: '',
  settingGroups: [
    {
      key: 'distance',
      label: '目标距离',
      options: [
        { id: 'near', label: '近 (8m)', value: 8 },
        { id: 'mid', label: '中 (12m)', value: 12 },
        { id: 'far', label: '远 (16m)', value: 16 },
      ],
      apply: v => { currentDist = v; },
    },
    {
      key: 'size',
      label: '目标大小',
      options: [
        { id: 'big', label: '大', value: 0.45 },
        { id: 'mid', label: '中', value: 0.35 },
        { id: 'small', label: '小', value: 0.25 },
        { id: 'tiny', label: '极小', value: 0.15 },
      ],
      apply: v => { currentRadius = v; },
    },
    {
      key: 'grid',
      label: '目标布局',
      options: [
        { id: '3x3', label: '9宫格', value: '3x3' },
        { id: '5x5', label: '25宫格', value: '5x5' },
      ],
      apply: v => { currentGrid = v; },
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
  prepareTargets: prepareClassicTargets,
  resetTarget: resetClassicTarget,
  getModeId: getClassicModeId,
  // Classic is the catch-all for every non-prefixed modeId (legacy records
  // look like "N-B-60-9"), so it must explicitly exclude other modes' prefixes.
  matchesModeId: modeId => !modeId.startsWith('6B-') && !modeId.startsWith('TRK-'),
  getModeLabel: getClassicModeLabel
});
