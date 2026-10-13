// ====== Camera Control (mouse look) — INPUT LAYER ======
// mousemove is a pure data layer: it only accumulates raw pixel deltas into
// pendingMouseX/Y. It never touches sensitivity or camera; main.js consumes
// and resets the pending deltas once per frame (CS-style pipeline).

document.addEventListener('mousemove', (e) => {
  // Allow mouse movement during countdown and playing
  if (!isLocked || (trainState !== 'playing' && trainState !== 'countdown')) return;

  // Accumulate raw pixel deltas; drop single-event spikes >200px (CS-style).
  const movementX = e.movementX || 0;
  const movementY = e.movementY || 0;
  if (Math.abs(movementX) > 200 || Math.abs(movementY) > 200) return;
  pendingMouseX += movementX;
  pendingMouseY += movementY;
});

// FIX: Use pointerlockchange to detect ESC (single press)
document.addEventListener('pointerlockchange', () => {
  const wasLocked = isLocked;
  isLocked = document.pointerLockElement === renderer.domElement;

  if (wasLocked && !isLocked) clearInputBuffer();

  // If pointer lock was lost while playing or countdown → pause
  if (wasLocked && !isLocked && (trainState === 'playing' || trainState === 'countdown')) {
    pauseTraining();
  }

  // Show crosshair when locked during playing or countdown
  const showCrosshair = isLocked && (trainState === 'playing' || trainState === 'countdown');
  document.getElementById('crosshairCanvas').style.display = showCrosshair ? 'block' : 'none';
  document.body.classList.toggle('playing', showCrosshair);
});

// ====== Clicking / Shooting ======
if (renderer) {
  renderer.domElement.addEventListener('click', () => {
    if ((trainState === 'playing' || trainState === 'countdown') && !isLocked) {
      renderer.domElement.requestPointerLock();
    }
  });

  renderer.domElement.addEventListener('mousedown', (e) => {
    // Block shooting during countdown
    if (e.button !== 0 || trainState !== 'playing' || !isLocked) return;

    // Aim-only modes (e.g. tracking) score without shooting; a click must not
    // fire, otherwise it would reset the target and pollute hits/misses.
    if (getActiveModeConfig().noShooting) return;

    handlePrimaryShot();
  });
}
