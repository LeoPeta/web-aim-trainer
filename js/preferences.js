// ====== User Preferences (localStorage persistence) ======
const PREFS_KEY = 'aimTrainerPrefs';

// Helper: find and activate the button matching a value within a button group
function activateBtnByText(containerId, predicate) {
  const btns = document.getElementById(containerId).querySelectorAll('button');
  btns.forEach(b => {
    b.classList.toggle('active', predicate(b));
  });
}

function savePreferences() {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify({
      // Training params
      currentTrainingMode,
      currentDist, currentRadius, totalTime, currentGrid,
      sensitivityMultiplier, cameraFov,
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

  // ----- Training mode -----
  if (typeof prefs.currentTrainingMode === 'string' && TRAINING_MODES[prefs.currentTrainingMode]) {
    currentTrainingMode = prefs.currentTrainingMode;
    activateBtnByText('modeBtns', b =>
      (currentTrainingMode === 'classic' && b.textContent === '3球网格射击') ||
      (currentTrainingMode === 'sixBall' && b.textContent === '六球定位')
    );
  }

  // ----- Training params -----
  if (typeof prefs.currentDist === 'number') {
    currentDist = prefs.currentDist;
    const distLabel = currentDist === 8 ? '近' : currentDist === 12 ? '中' : '远';
    activateBtnByText('distBtns', b => b.textContent.includes(distLabel));
  }
  if (typeof prefs.currentRadius === 'number') {
    currentRadius = prefs.currentRadius;
    const sizeLabel = currentRadius === 0.45 ? '大' : currentRadius === 0.35 ? '中' :
                      currentRadius === 0.25 ? '小' : '极小';
    activateBtnByText('sizeBtns', b => b.textContent === sizeLabel);
  }
  if (typeof prefs.totalTime === 'number') {
    totalTime = prefs.totalTime;
    const timeLabel = totalTime === 30 ? '30秒' : totalTime === 60 ? '1分钟' : '2分钟';
    activateBtnByText('timeBtns', b => b.textContent === timeLabel);
  }
  if (typeof prefs.currentGrid === 'string') {
    currentGrid = prefs.currentGrid;
    const gridLabel = currentGrid === '3x3' ? '9宫格' : '25宫格';
    activateBtnByText('gridBtns', b => b.textContent === gridLabel);
  }
  applyTrainingModeUI();

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
    applyCameraFov();
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
