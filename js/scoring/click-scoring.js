// ====== Click Mode Shot Handling ======
const CENTER_RAY_POINT = { x: 0, y: 0 };

function handlePrimaryShot() {
  const now = performance.now();

  // 开火即后坐，命中与未命中一致（枪隐藏时是 no-op）
  triggerRecoil();

  raycaster.setFromCamera(CENTER_RAY_POINT, camera);
  // 只打「当前可见」的球：打靶模式击杀后球会隐身 0.6s 等重生，那段时间
  // 它不该还能被打中（否则白记一发命中）。
  const intersects = raycaster.intersectObjects(activeTargets.filter(t => t.visible));

  if (intersects.length > 0) {
    score++;
    hits++;
    playHitSound();
    flashTarget(intersects[0].object);
    // 模式可接管命中后果（打靶模式是扣血）；没接管就沿用默认的「命中即重生」。
    if (!callModeHook('onTargetHit', intersects[0].object)) {
      resetTarget(intersects[0].object);
    }
  } else {
    misses++;
  }

  // 连发模式（打靶）射击间隔恒为 100ms，反应时长没有意义，不采集。
  // lastShotTime 只服务于反应时长，一并跳过。
  if (!getActiveModeConfig().autoFire) {
    if (lastShotTime > 0) reactionTimes.push(now - lastShotTime);
    lastShotTime = now;
  }
  updateHUD();
}
