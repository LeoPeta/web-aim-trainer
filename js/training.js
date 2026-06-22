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

function endTraining() {
  trainState = 'over';
  clearInputBuffer();
  updateRendererVisibility();
  if (isLocked) document.exitPointerLock();
  document.getElementById('crosshairCanvas').style.display = 'none';
  document.getElementById('countdownOverlay').classList.add('hidden');
  document.body.classList.remove('playing');

  const totalShots = hits + misses;
  const accuracy = totalShots > 0 ? Math.round(hits / totalShots * 100) : 0;
  const avgReaction = reactionTimes.length > 0
    ? Math.round(reactionTimes.reduce((a, b) => a + b, 0) / reactionTimes.length)
    : 0;

  // Save training record
  const modeId = getModeId();
  const generalScore = calcGeneralScore(hits, misses, avgReaction);
  saveRecord(modeId, generalScore, score, hits, misses, accuracy, avgReaction);

  document.getElementById('finalScore').textContent = `综合得分 ${generalScore}`;
  document.getElementById('statHits').textContent = hits;
  document.getElementById('statMisses').textContent = misses;
  document.getElementById('statAccuracy').textContent = accuracy + '%';
  document.getElementById('statReaction').textContent = avgReaction + 'ms';

  // Draw charts
  document.getElementById('chartModeLabel').textContent = '模式: ' + getModeLabel(modeId);
  const records = getRecordsByMode(modeId);
  const hasValidRecords = records.some(r => typeof r.generalScore === 'number');
  drawChart(records);
  drawAccChart(records);
  document.getElementById('chartNoData').style.display = hasValidRecords ? 'none' : 'block';
  document.getElementById('chartsRow').style.display = hasValidRecords ? 'flex' : 'none';

  document.getElementById('endOverlay').classList.remove('hidden');
}
