// ====== Click Mode Shot Handling ======
const CENTER_RAY_POINT = { x: 0, y: 0 };

function handlePrimaryShot() {
  const now = performance.now();

  raycaster.setFromCamera(CENTER_RAY_POINT, camera);
  const intersects = raycaster.intersectObjects(activeTargets);

  if (lastShotTime > 0) {
    reactionTimes.push(now - lastShotTime);
  }

  if (intersects.length > 0) {
    score++;
    hits++;
    playHitSound();
    resetTarget(intersects[0].object);
  } else {
    misses++;
  }
  lastShotTime = now;
  updateHUD();
}
