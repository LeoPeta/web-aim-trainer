// ====== Training Control: Start / Restart / Pause / Resume / End / Back to Menu ======

function startTraining() {
  initAudio();
  score = 0; hits = 0; misses = 0;
  timeLeft = totalTime;
  reactionTimes = [];
  lastShotTime = 0;
  yaw = 0; pitch = 0;
  clearInputBuffer();
  camera.rotation.set(0, 0, 0);
  camera.position.set(0, 5, 0);

  prepareActiveModeTargets();
  syncActiveTargets();
  for (const t of activeTargets) resetTarget(t);

  renderHUD();
  updateHUD();
  document.getElementById('menuOverlay').classList.add('hidden');
  document.getElementById('endOverlay').classList.add('hidden');
  document.getElementById('pauseOverlay').classList.add('hidden');
  renderer.domElement.requestPointerLock();

  // Start 3-second countdown
  trainState = 'countdown';
  countdownTime = 3;
  document.getElementById('countdownText').textContent = '3';
  document.getElementById('countdownOverlay').classList.remove('hidden');
  updateRendererVisibility();
  renderSceneOnce();
  lastTime = performance.now();
}

function restartTraining() {
  // Discard current game data (never saved) and restart
  document.getElementById('pauseOverlay').classList.add('hidden');
  startTraining();
}

function pauseTraining() {
  trainState = 'paused';
  clearInputBuffer();
  updateRendererVisibility();
  document.getElementById('pauseOverlay').classList.remove('hidden');
  document.getElementById('crosshairCanvas').style.display = 'none';
  document.getElementById('countdownOverlay').classList.add('hidden');
}

function resumeTraining() {
  // If countdown was interrupted, resume countdown; otherwise resume playing
  if (countdownTime > 0) {
    trainState = 'countdown';
    document.getElementById('countdownOverlay').classList.remove('hidden');
  } else {
    trainState = 'playing';
  }
  clearInputBuffer();
  updateRendererVisibility();
  renderSceneOnce();
  document.getElementById('pauseOverlay').classList.add('hidden');
  renderer.domElement.requestPointerLock();
  lastTime = performance.now();
}

function backToMenu() {
  trainState = 'menu';
  clearInputBuffer();
  updateRendererVisibility();
  document.getElementById('pauseOverlay').classList.add('hidden');
  document.getElementById('endOverlay').classList.add('hidden');
  document.getElementById('menuOverlay').classList.remove('hidden');
  document.getElementById('crosshairCanvas').style.display = 'none';
  document.getElementById('countdownOverlay').classList.add('hidden');
  document.body.classList.remove('playing');
  if (isLocked) document.exitPointerLock();
}

// Render the end-screen headline score + stat grid from a [{label, value}] list,
// so each mode can present its own metrics.
function renderEndStats(generalScore, items) {
  document.getElementById('finalScore').textContent = `综合得分 ${generalScore}`;
  const grid = document.getElementById('statsGrid');
  if (grid) {
    grid.innerHTML = items.map(it =>
      `<div class="stat-item"><div class="stat-val">${it.value}</div><div class="stat-label">${it.label}</div></div>`
    ).join('');
  }
}

function endTraining() {
  trainState = 'over';
  clearInputBuffer();
  updateRendererVisibility();
  if (isLocked) document.exitPointerLock();
  document.getElementById('crosshairCanvas').style.display = 'none';
  document.getElementById('countdownOverlay').classList.add('hidden');
  document.body.classList.remove('playing');

  const mode = getActiveModeConfig();
  const modeId = getModeId();

  let generalScore, recScore, recHits, recMisses, recAccuracy, recReaction, accLegend;

  if (mode.getEndStats) {
    // Aim-only modes (e.g. tracking): hits/misses don't apply. Reuse the
    // record's `accuracy` field for the aim metric so charts need no changes.
    const stats = mode.getEndStats();
    generalScore = mode.getScore ? mode.getScore() : 0;
    recScore = generalScore;
    recHits = 0;
    recMisses = 0;
    recAccuracy = stats.accuracy;
    recReaction = 0;
    accLegend = '在靶率趋势';
    renderEndStats(generalScore, stats.items);
  } else {
    const totalShots = hits + misses;
    const accuracy = totalShots > 0 ? Math.round(hits / totalShots * 100) : 0;
    const avgReaction = reactionTimes.length > 0
      ? Math.round(reactionTimes.reduce((a, b) => a + b, 0) / reactionTimes.length)
      : 0;
    generalScore = calcGeneralScore(hits, misses, avgReaction);
    recScore = score;
    recHits = hits;
    recMisses = misses;
    recAccuracy = accuracy;
    recReaction = avgReaction;
    accLegend = '命中率趋势';
    renderEndStats(generalScore, [
      { label: '命中', value: hits },
      { label: '未中', value: misses },
      { label: '命中率', value: accuracy + '%' },
      { label: '平均反应时长', value: avgReaction + 'ms' },
    ]);
  }

  // Save training record
  saveRecord(modeId, generalScore, recScore, recHits, recMisses, recAccuracy, recReaction);

  // Draw charts
  document.getElementById('legendAcc').textContent = accLegend;
  document.getElementById('chartModeLabel').textContent = '模式: ' + getModeLabel(modeId);
  const records = getRecordsByMode(modeId);
  const hasValidRecords = records.some(r => typeof r.generalScore === 'number');
  drawChart(records);
  drawAccChart(records);
  document.getElementById('chartNoData').style.display = hasValidRecords ? 'none' : 'block';
  document.getElementById('chartsRow').style.display = hasValidRecords ? 'flex' : 'none';

  document.getElementById('endOverlay').classList.remove('hidden');
}
