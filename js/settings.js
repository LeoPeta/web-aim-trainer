// ====== Training Settings ======
let currentDist = 8;
let currentRadius = 0.45;
let currentGrid = '3x3';
let currentTrainingMode = 'classic';
let sensitivityMultiplier = 0.5;


// ====== Settings Functions ======
function setActiveBtn(containerId, btn) {
  const btns = document.getElementById(containerId).querySelectorAll('button');
  btns.forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}

function applyTrainingModeUI() {
  const mode = getActiveModeConfig();
  const locked = !!mode.locksCustomSettings;
  ['distGroup', 'sizeGroup', 'gridGroup'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = locked ? 'none' : 'flex';
  });

  const hint = document.getElementById('modeHint');
  if (hint) hint.textContent = mode.hint || '';
}

function setTrainingMode(mode) {
  currentTrainingMode = TRAINING_MODES[mode] ? mode : 'classic';
  setActiveBtn('modeBtns', event.target);
  applyTrainingModeUI();
  savePreferences();
}

function setDist(mode) {
  setActiveBtn('distBtns', event.target);
  currentDist = mode === 'near' ? 8 : mode === 'mid' ? 12 : 16;
  savePreferences();
}

function setSize(mode) {
  setActiveBtn('sizeBtns', event.target);
  currentRadius = mode === 'big' ? 0.45 : mode === 'mid' ? 0.35 : mode === 'small' ? 0.25 : 0.15;
  savePreferences();
}

function setTime(sec) {
  setActiveBtn('timeBtns', event.target);
  totalTime = sec;
  savePreferences();
}

function setGrid(mode) {
  setActiveBtn('gridBtns', event.target);
  currentGrid = mode;
  savePreferences();
}

function showSettings() {
  document.getElementById('menuOverlay').classList.add('hidden');
  document.getElementById('settingsOverlay').classList.remove('hidden');
}

function hideSettings() {
  document.getElementById('settingsOverlay').classList.add('hidden');
  document.getElementById('menuOverlay').classList.remove('hidden');
}

function showGameplay() {
  document.getElementById('menuOverlay').classList.add('hidden');
  document.getElementById('gameplayOverlay').classList.remove('hidden');
}

function hideGameplay() {
  document.getElementById('gameplayOverlay').classList.add('hidden');
  document.getElementById('menuOverlay').classList.remove('hidden');
}

function setSensitivity(val) {
  sensitivityMultiplier = parseFloat(val);
  document.getElementById('sensitivityVal').value = sensitivityMultiplier.toFixed(2);
  savePreferences();
}

function setCameraFov(val) {
  cameraFov = parseInt(val);
  document.getElementById('fovVal').textContent = cameraFov;
  applyCameraFov();
  savePreferences();
}

function validateSensitivity(el) {
  let val = parseFloat(el.value);
  if (isNaN(val) || val < 0.1) val = 0.1;
  if (val > 2) val = 2;
  val = Math.round(val * 100) / 100;
  el.value = val.toFixed(2);
  document.getElementById('sensitivitySlider').value = val;
  sensitivityMultiplier = val;
  savePreferences();
}

