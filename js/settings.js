// ====== Training Settings ======
let currentDist = 8;
let currentRadius = 0.45;
let currentGrid = '3x3';
let currentTrainingMode = 'classic';
let sensitivityMultiplier = 0.5;
// 设置面板当前 tab：'general' | 'crosshair' | 某个模式 id
let currentSettingsTab = 'general';

// Per-mode settings: each training mode keeps its own values, keyed by
// setting-group.key → option.id. Game logic reads the global currentDist /
// currentRadius / currentGrid / totalTime, which are synced from the active
// mode's slot via applyModeSettingsToGlobals().
const MODE_SETTINGS = {
  classic: { distance: 'near', size: 'big', grid: '3x3', time: '60' },
  // 六球定位的 distance / size / layout 是 locked 组（只有唯一选项），
  // 这里必须一并列出：ensureModeSettings 见到槽已存在就直接返回，
  // 不会替它补上新加的 key。
  sixBall: { distance: 'far20', size: 'tiny', layout: 'random', time: '60' },
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

// 把存档里失效的 option id 收敛回该组的默认项。选项被删掉或改名后（例如跟枪的
// 「8字匀速」下线），localStorage 里会留着找不到的 id；不清洗的话
// applyModeSettingsToGlobals() 的 find() 会落空、apply 不执行，全局变量停在上一个
// 值，而设置面板因为没有匹配项会显示第一项 —— 界面和行为就此对不上。
// 只在 loadPreferences() 里调一次，不进每帧路径。
function sanitizeModeSettings() {
  for (const id in TRAINING_MODES) {
    ensureModeSettings(id);
    const slot = MODE_SETTINGS[id];
    for (const group of (TRAINING_MODES[id].settingGroups || [])) {
      if (group.options.some(o => o.id === slot[group.key])) continue;
      const def = group.options.find(o => o.default) || group.options[0];
      if (def) slot[group.key] = def.id;
      else delete slot[group.key];
    }
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

// 设置面板里两个固定的全局 tab，排在所有训练模式之前
const SETTINGS_GLOBAL_TABS = [
  { id: 'general', label: '通用' },
  { id: 'crosshair', label: '准心' },
];

function renderModeTabs() {
  const tabs = document.getElementById('modeTabs');
  if (!tabs) return;
  const items = SETTINGS_GLOBAL_TABS.concat(
    Object.values(TRAINING_MODES).map(m => ({ id: m.id, label: m.label }))
  );
  tabs.innerHTML = items.map(t =>
    `<button class="${t.id === currentSettingsTab ? 'active' : ''}" onclick="setSettingsTab('${t.id}')">${t.label}</button>`
  ).join('');
  // tab 多时把当前 tab 滚动到可视区中部
  const active = tabs.querySelector('button.active');
  if (active) {
    tabs.scrollLeft = Math.max(0, active.offsetLeft - (tabs.clientWidth - active.clientWidth) / 2);
  }
  updateTabArrows();
}

// 切 tab：模式 tab 交给 setTrainingMode（同时把该模式设为当前模式），
// 通用 / 准心只切面板。
// 注意先显式写 currentSettingsTab —— 直接点 tab 必须切过去，不能被
// setTrainingMode 里「停在通用/准心则不动」的规则吞掉（那条规则是给
// 主菜单下拉框用的，不是给 tab 点击用的）。
function setSettingsTab(tab) {
  currentSettingsTab = tab;
  if (TRAINING_MODES[tab]) { setTrainingMode(tab); return; }
  renderModeTabs();
  renderModeSettings();
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
  const container = document.getElementById('modeSettingsContainer');
  const hint = document.getElementById('modeHint');
  if (!container) return;

  // 通用 / 准心 / 模式三个 pane 互斥显示
  const isGeneral = currentSettingsTab === 'general';
  const isCrosshair = currentSettingsTab === 'crosshair';
  const general = document.getElementById('generalSettings');
  const crosshair = document.getElementById('crosshairSettings');
  if (general) general.classList.toggle('hidden', !isGeneral);
  if (crosshair) crosshair.classList.toggle('hidden', !isCrosshair);
  container.classList.toggle('hidden', isGeneral || isCrosshair);
  if (hint) hint.classList.toggle('hidden', isGeneral || isCrosshair);
  if (isGeneral || isCrosshair) return;

  const mode = getActiveModeConfig();
  const settings = MODE_SETTINGS[currentTrainingMode] || {};
  container.innerHTML = (mode.settingGroups || []).map(group => {
    const currentId = settings[group.key];
    const opts = group.options.map(opt =>
      `<option value="${opt.id}" ${opt.id === currentId ? 'selected' : ''}>${opt.label}</option>`
    ).join('');
    // locked 组（如六球定位的固定项）只展示不可改：下拉框 disabled 掉、也不挂
    // onchange。它们的值由模式自己的逻辑硬编码，不参与全局变量同步。
    const lockAttr = group.locked ? ' disabled' : '';
    const changeAttr = group.locked ? '' : ` onchange="setModeSetting('${group.key}', this.value)"`;
    return (
      `<div class="setting-group">` +
        `<div class="setting-label">${group.label}</div>` +
        `<select class="setting-select"${lockAttr}${changeAttr}>${opts}</select>` +
      `</div>`
    );
  }).join('');
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
  // 停在某个模式 tab 上时跟着新模式走；停在通用 / 准心则保持不动
  if (!SETTINGS_GLOBAL_TABS.some(t => t.id === currentSettingsTab)) currentSettingsTab = mode;
  applyModeSettingsToGlobals();
  renderModeTabs();
  renderModeSettings();
  renderModeSelect();
  savePreferences();
}

// 主菜单「开始训练」旁的模式下拉框：选项只渲染一次，之后只同步 value。
// 和设置面板的 tab 共享同一个真值 currentTrainingMode，只经 setTrainingMode 写。
function renderModeSelect() {
  const sel = document.getElementById('modeSelect');
  if (!sel) return;
  if (!sel.options.length) {
    sel.innerHTML = Object.values(TRAINING_MODES).map(m =>
      `<option value="${m.id}">${m.label}</option>`
    ).join('');
  }
  sel.value = currentTrainingMode;
}

// ====== Menu Navigation ======
function showSettings() {
  document.getElementById('menuOverlay').classList.add('hidden');
  document.getElementById('settingsOverlay').classList.remove('hidden');
  renderModeTabs();
  renderModeSettings();
}

function hideSettings() {
  document.getElementById('settingsOverlay').classList.add('hidden');
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

// ====== Color Mode ======
// 配色分两半，这里把两边一起切：
//   ① 场景（天空 / 地板 / 墙）→ scene.js 的 applySceneTheme()；
//   ② UI（页面底色 / 文字 / 边框 / 图表）→ body.theme-day 上的 CSS 变量。
// WebGL 读不到 CSS 变量，所以没法只靠一边解决。
function setColorMode(mode) {
  if (!SCENE_THEMES[mode]) return;
  colorMode = mode;
  applyColorMode();
  savePreferences();
}

// 状态 → DOM / 场景的同步（不落盘）。
// loadPreferences() 直接改 colorMode 后调它，避免在恢复过程中回写 localStorage，
// 把还没恢复的准心参数冲成默认值。
function applyColorMode() {
  document.body.classList.toggle('theme-day', colorMode === 'day');
  applySceneTheme(colorMode);
  updateColorModeBtns();
}

// 通用 tab 里的两个按钮的 .active 由 colorMode 反推
function updateColorModeBtns() {
  const btns = document.getElementById('colorModeBtns');
  if (!btns) return;
  const list = btns.querySelectorAll('button');
  if (list.length < 2) return;
  list[0].classList.toggle('active', colorMode === 'night');
  list[1].classList.toggle('active', colorMode === 'day');
}
