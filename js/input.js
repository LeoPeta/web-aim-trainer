// ====== Camera Control (mouse look) ======
// Pointer Lock can report huge movementX/Y on coalesced events.
// We use getCoalescedEvents() to process each sub-event individually,
// then cap total frame rotation as a safety net.
const MAX_FRAME_RADIANS = 15 * Math.PI / 180;          // total frame rotation cap (~15°)

document.addEventListener('mousemove', (e) => {
  // Allow mouse movement during countdown and playing
  if (!isLocked || (trainState !== 'playing' && trainState !== 'countdown')) return;

  // Process coalesced sub-events if available (Chrome/Edge/Firefox 119+)
  // Fallback to the single event for unsupported browsers (Safari)
  const events = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];

  let dYaw = 0, dPitch = 0;
  for (const ce of events) {
    dYaw -= ce.movementX * SENSITIVITY * sensitivityMultiplier;
    dPitch -= ce.movementY * SENSITIVITY * sensitivityMultiplier;
  }

  // Safety: cap total frame rotation to prevent extreme jumps
  dYaw = Math.max(-MAX_FRAME_RADIANS, Math.min(MAX_FRAME_RADIANS, dYaw));
  dPitch = Math.max(-MAX_FRAME_RADIANS, Math.min(MAX_FRAME_RADIANS, dPitch));

  yaw += dYaw;
  pitch = Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, pitch + dPitch));
  camera.rotation.set(pitch, yaw, 0);
});

// FIX: Use pointerlockchange to detect ESC (single press)
document.addEventListener('pointerlockchange', () => {
  const wasLocked = isLocked;
  isLocked = document.pointerLockElement === renderer.domElement;

  // If pointer lock was lost while playing or countdown → pause
  if (wasLocked && !isLocked && (trainState === 'playing' || trainState === 'countdown')) {
    pauseTraining();
  }

  // Show crosshair when locked during playing or countdown
  const showCrosshair = isLocked && (trainState === 'playing' || trainState === 'countdown');
  document.getElementById('crosshairCanvas').style.display = showCrosshair ? 'block' : 'none';
  document.body.classList.toggle('playing', isLocked);
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

    const now = performance.now();

    raycaster.setFromCamera({ x: 0, y: 0 }, camera);
    const intersects = raycaster.intersectObjects(targets);

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
  });
}
