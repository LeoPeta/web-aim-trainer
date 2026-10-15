// ====== User Preferences (localStorage persistence) ======
const PREFS_KEY = 'aimTrainerPrefs';

function savePreferences() {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify({
      // Per-mode training settings (each mode keeps its own values)
      modeSettings: MODE_SETTINGS,
      currentTrainingMode,
      // Global settings
      sensitivityMultiplier, cameraFov, showGun, colorMode,
      // Crosshair params
      crosshairColor, crosshairLen, crosshairGap, crosshairBorder, crosshairDot,
    }));
  } catch (e) { /* localStorage full or disabled */ }
}

function loadPreferences() {
  let prefs;
  try {
    prefs = JSON.parse(localStorage.getItem(PREFS_KEY));
  } catch (e) { prefs = null; }
  if (!prefs) return;

  // ----- Per-mode settings -----
  if (prefs.modeSettings && typeof prefs.modeSettings === 'object') {
    // Iterate registered modes (not MODE_SETTINGS keys) so modes added later —
    // whose slot is created lazily by ensureModeSettings — still restore.
    for (const id in TRAINING_MODES) {
      ensureModeSettings(id);
      if (prefs.modeSettings[id] && typeof prefs.modeSettings[id] === 'object') {
        MODE_SETTINGS[id] = { ...MODE_SETTINGS[id], ...prefs.modeSettings[id] };
      }
    }
  } else {
    // Legacy top-level values (currentDist/currentRadius/currentGrid/totalTime)
    // migrate into the classic mode slot so existing settings are preserved.
    const distMap = { 8: 'near', 12: 'mid', 16: 'far' };
    const sizeMap = { 0.45: 'big', 0.35: 'mid', 0.25: 'small', 0.15: 'tiny' };
    if (typeof prefs.currentDist === 'number' && distMap[prefs.currentDist]) {
      MODE_SETTINGS.classic.distance = distMap[prefs.currentDist];
    }
    if (typeof prefs.currentRadius === 'number' && sizeMap[prefs.currentRadius]) {
      MODE_SETTINGS.classic.size = sizeMap[prefs.currentRadius];
    }
    if (typeof prefs.currentGrid === 'string') MODE_SETTINGS.classic.grid = prefs.currentGrid;
    if (typeof prefs.totalTime === 'number') MODE_SETTINGS.classic.time = String(prefs.totalTime);
  }

  // ----- Current mode + apply active mode's settings to globals -----
  if (typeof prefs.currentTrainingMode === 'string' && TRAINING_MODES[prefs.currentTrainingMode]) {
    currentTrainingMode = prefs.currentTrainingMode;
  }
  applyModeSettingsToGlobals();
  renderModeTabs();
  renderModeSettings();
  renderModeSelect();

  // ----- Sensitivity -----
  if (typeof prefs.sensitivityMultiplier === 'number') {
    sensitivityMultiplier = prefs.sensitivityMultiplier;
    document.getElementById('sensitivitySlider').value = sensitivityMultiplier;
    document.getElementById('sensitivityVal').value = sensitivityMultiplier.toFixed(2);
  }

  // ----- Camera FOV -----
  if (typeof prefs.cameraFov === 'number') {
    cameraFov = prefs.cameraFov;
    if (cameraFov < 85) cameraFov = 85;
    if (cameraFov > 120) cameraFov = 120;
    document.getElementById('fovSlider').value = cameraFov;
    document.getElementById('fovVal').textContent = cameraFov;
    document.getElementById('fovVVal').textContent =
      Math.round(horizontalToVerticalFov(cameraFov, 16 / 9) * 10) / 10;
    applyCameraFov();
  }

  // ----- Color mode -----
  // 直接改 colorMode + applyColorMode()（而非 setColorMode），理由同下面枪支开关：
  // 恢复过程中不能回写 localStorage。
  if (SCENE_THEMES[prefs.colorMode]) {
    colorMode = prefs.colorMode;
    applyColorMode();
  }

  // ----- Gun viewmodel -----
  // 直接改 showGun + applyGunVisibility()（而非 setShowGun），避免在准心设置
  // 恢复之前就回写 localStorage，把已存的准心参数冲成默认值。
  if (typeof prefs.showGun === 'boolean') {
    showGun = prefs.showGun;
    applyGunVisibility();
  }

  // ----- Crosshair -----
  if (typeof prefs.crosshairColor === 'string') {
    crosshairColor = prefs.crosshairColor;
    const btns = document.getElementById('crosshairColorBtns').querySelectorAll('button');
    btns.forEach(b => {
      // Match by inline style background color
      const bg = b.style.background.toLowerCase();
      const target = crosshairColor.toLowerCase();
      b.classList.toggle('active', bg.includes(target));
    });
  }
  if (typeof prefs.crosshairLen === 'number') {
    crosshairLen = prefs.crosshairLen;
    document.getElementById('crosshairLenSlider').value = crosshairLen;
    document.getElementById('crosshairLenVal').textContent = crosshairLen + 'px';
  }
  if (typeof prefs.crosshairGap === 'number') {
    crosshairGap = prefs.crosshairGap;
    document.getElementById('crosshairGapSlider').value = crosshairGap;
    document.getElementById('crosshairGapVal').textContent = crosshairGap + 'px';
  }
  if (typeof prefs.crosshairBorder === 'number') {
    crosshairBorder = prefs.crosshairBorder;
    document.getElementById('crosshairBorderSlider').value = crosshairBorder;
    document.getElementById('crosshairBorderVal').textContent = crosshairBorder + 'px';
  }
  if (typeof prefs.crosshairDot === 'number') {
    crosshairDot = prefs.crosshairDot;
    document.getElementById('crosshairDotSlider').value = crosshairDot;
    document.getElementById('crosshairDotVal').textContent = crosshairDot + 'px';
  }

  // Redraw crosshair with restored settings
  drawCrosshair();
}
