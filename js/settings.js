// ====== Training Settings ======
let currentDist = 8;
let currentRadius = 0.45;
let currentGrid = '3x3';
let currentTrainingMode = 'classic';
let sensitivityMultiplier = 0.5;

// Per-mode settings: each training mode keeps its own values, keyed by
// setting-group.key → option.id. Game logic reads the global currentDist /
// currentRadius / currentGrid / totalTime, which are synced from the active
// mode's slot via applyModeSettingsToGlobals().
const MODE_SETTINGS = {
  classic: { distance: 'near', size: 'big', grid: '3x3', time: '60' },
  sixBall: { time: '60' },
};

// ====== Mode Settings (config-driven tabs) ======
function getSettingGroup(modeConfig, key) {
  return (modeConfig.settingGroups || []).find(g => g.key === key);
}

// Lazily create a per-mode settings slot from the mode's settingGroups
// (defaults to the first option, or the one marked default:true). This keeps
// future modes working without touching MODE_SETTINGS.
function ensureModeSettings(mode) {
  if (MODE_SETTINGS[mode]) return;
  MODE_SETTINGS[mode] = {};
  const cfg = TRAINING_MODES[mode];
  if (!cfg) return;
  for (const group of (cfg.settingGroups || [])) {
    const def = group.options.find(o => o.default) || group.options[0];
    if (def) MODE_SETTINGS[mode][group.key] = def.id;
  }
}

function applyModeSettingsToGlobals() {
  ensureModeSettings(currentTrainingMode);
  const settings = MODE_SETTINGS[currentTrainingMode] || {};
  const mode = getActiveModeConfig();
  for (const group of (mode.settingGroups || [])) {
    const opt = group.options.find(o => o.id === settings[group.key]);
    if (opt && group.apply) group.apply(opt.value);
  }
}

function renderModeTabs() {
  const tabs = document.getElementById('modeTabs');
  if (!tabs) return;
  tabs.innerHTML = Object.values(TRAINING_MODES).map(m =>
    `<button class="${m.id === currentTrainingMode ? 'active' : ''}" onclick="setTrainingMode('${m.id}')">${m.label}</button>`
  ).join('');
  // tab 多时把当前 tab 滚动到可视区中部
  const active = tabs.querySelector('button.active');
  if (active) {
    tabs.scrollLeft = Math.max(0, active.offsetLeft - (tabs.clientWidth - active.clientWidth) / 2);
  }
  updateTabArrows();
}

// tab 条可横向滚动：溢出时显示左右箭头（到端变暗）
function updateTabArrows() {
  const tabs = document.getElementById('modeTabs');
  const prev = document.getElementById('tabPrev');
  const next = document.getElementById('tabNext');
  if (!tabs || !prev || !next) return;
  const scrollable = tabs.scrollWidth > tabs.clientWidth + 1;
  prev.classList.toggle('visible', scrollable);
  next.classList.toggle('visible', scrollable);
  prev.classList.toggle('disabled', tabs.scrollLeft <= 0);
  next.classList.toggle('disabled', tabs.scrollLeft >= tabs.scrollWidth - tabs.clientWidth - 1);
}

function scrollModeTabs(dir) {
  const tabs = document.getElementById('modeTabs');
  if (!tabs) return;
  tabs.scrollLeft += dir * 110;  // 每次滚动约一个 tab 宽
  updateTabArrows();
}

function renderModeSettings() {
  const mode = getActiveModeConfig();
  const settings = MODE_SETTINGS[currentTrainingMode] || {};
  const container = document.getElementById('modeSettingsContainer');
  if (!container) return;
  container.innerHTML = (mode.settingGroups || []).map(group => {
    const currentId = settings[group.key];
    const opts = group.options.map(opt =>
      `<option value="${opt.id}" ${opt.id === currentId ? 'selected' : ''}>${opt.label}</option>`
    ).join('');
    return (
      `<div class="setting-group">` +
        `<div class="setting-label">${group.label}</div>` +
        `<select class="setting-select" onchange="setModeSetting('${group.key}', this.value)">${opts}</select>` +
      `</div>`
    );
  }).join('');
  const hint = document.getElementById('modeHint');
  if (hint) hint.textContent = mode.hint || '';
}

function setModeSetting(key, id) {
  ensureModeSettings(currentTrainingMode);
  const group = getSettingGroup(getActiveModeConfig(), key);
  if (!group) return;
  const opt = group.options.find(o => o.id === id);
  if (!opt) return;
  MODE_SETTINGS[currentTrainingMode][key] = id;
  if (group.apply) group.apply(opt.value);
  renderModeSettings();
  savePreferences();
}

function setTrainingMode(mode) {
  if (!TRAINING_MODES[mode]) return;
  ensureModeSettings(mode);
  currentTrainingMode = mode;
  applyModeSettingsToGlobals();
  renderModeTabs();
  renderModeSettings();
  savePreferences();
}

// ====== Menu Navigation ======
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
  renderModeTabs();
  renderModeSettings();
}

function hideGameplay() {
  document.getElementById('gameplayOverlay').classList.add('hidden');
  document.getElementById('menuOverlay').classList.remove('hidden');
}

// ====== Global Settings ======
function setSensitivity(val) {
  sensitivityMultiplier = parseFloat(val);
  document.getElementById('sensitivityVal').value = sensitivityMultiplier.toFixed(2);
  savePreferences();
}

function setCameraFov(val) {
  cameraFov = parseInt(val);
  document.getElementById('fovVal').textContent = cameraFov;
  // vFOV 按 16:9 换算展示；实际投影仍由 applyCameraFov() 按屏幕真实比例应用
  document.getElementById('fovVVal').textContent =
    Math.round(horizontalToVerticalFov(cameraFov, 16 / 9) * 10) / 10;
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
