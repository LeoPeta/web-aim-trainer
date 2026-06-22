// ====== Camera Control (mouse look) — INPUT LAYER ======
// mousemove is a pure data layer: it only samples movement, cleans spikes,
// and accumulates raw pixels into rawMouse. It never touches sensitivity or camera.
// The camera is updated once per frame in main.js animate() (consumer).

const CLAMP_MOUSE_DELTA = 800;   // per-event px cap: keep fast flicks responsive
const DROP_MOUSE_DELTA = 1000;   // extreme pointer-lock spikes are discarded

document.addEventListener('mousemove', (e) => {
  // Allow mouse movement during countdown and playing
  if (!isLocked || (trainState !== 'playing' && trainState !== 'countdown')) return;

  // Drop only extreme pointer-lock spikes. Large but plausible fast flicks are
  // clamped instead of discarded, avoiding sticky low-sensitivity swipes.
  let mx = e.movementX;
  let my = e.movementY;
  if (
    Math.abs(mx) > DROP_MOUSE_DELTA ||
    Math.abs(my) > DROP_MOUSE_DELTA
  ) {
    return;
  }

  mx = Math.max(-CLAMP_MOUSE_DELTA, Math.min(CLAMP_MOUSE_DELTA, mx));
  my = Math.max(-CLAMP_MOUSE_DELTA, Math.min(CLAMP_MOUSE_DELTA, my));

  // Accumulate cleaned raw pixels; sensitivity is applied in animate().
  rawMouse.dx += mx;
  rawMouse.dy += my;
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

    handlePrimaryShot();
  });
}
