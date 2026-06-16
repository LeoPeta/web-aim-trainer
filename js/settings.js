// ====== Training Settings ======
let currentDist = 8;
let currentRadius = 0.45;
let currentGrid = '3x3';
let sensitivityMultiplier = 1;

// ====== Settings Functions ======
function setActiveBtn(containerId, btn) {
  const btns = document.getElementById(containerId).querySelectorAll('button');
  btns.forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
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

function validateSensitivity(el) {
  let val = parseFloat(el.value);
  if (isNaN(val) || val < 0.01) val = 0.01;
  if (val > 2) val = 2;
  val = Math.round(val * 100) / 100;
  el.value = val.toFixed(2);
  document.getElementById('sensitivitySlider').value = val;
  sensitivityMultiplier = val;
  savePreferences();
}
