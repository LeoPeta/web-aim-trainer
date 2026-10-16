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

  if (wasLocked && !isLocked) { clearInputBuffer(); releaseTrigger(); }

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
// 连发（打靶模式）：mousedown 只置位，真正按射速出弹由 stepAutoFire() 每帧推进，
// 在 main.js 的 animate() 里调用。单发模式（其余全部）行为完全不变。
let triggerHeld = false;
let fireCooldown = 0;

function releaseTrigger() {
  triggerHeld = false;
  fireCooldown = 0;
}

// 每帧推进连发。非连发模式 / 没按住 / 不在 playing 时是廉价 no-op。
// guard 防大 dt：标签页切走再回来时 rAF 的 dt 可能是好几秒，不设上限
// 会瞬间打出几十发。
function stepAutoFire(dt) {
  const mode = getActiveModeConfig();
  if (!mode.autoFire || !triggerHeld || trainState !== 'playing' || !isLocked) {
    fireCooldown = 0;
    return;
  }
  fireCooldown -= dt;
  let guard = 0;
  while (fireCooldown <= 0 && guard++ < 4) {
    handlePrimaryShot();
    fireCooldown += 1 / (mode.fireRateHz || 10);
  }
  // guard 触发时欠下的时间不带到下一帧，否则卡顿后会连喷
  if (fireCooldown < 0) fireCooldown = 0;
}

if (renderer) {
  renderer.domElement.addEventListener('click', () => {
    if ((trainState === 'playing' || trainState === 'countdown') && !isLocked) {
      renderer.domElement.requestPointerLock();
    }
  });

  renderer.domElement.addEventListener('mousedown', (e) => {
    // Block shooting during countdown
    if (e.button !== 0 || trainState !== 'playing' || !isLocked) return;

    const mode = getActiveModeConfig();

    // Aim-only modes (e.g. tracking) score without shooting; a click must not
    // fire, otherwise it would reset the target and pollute hits/misses.
    if (mode.noShooting) return;

    // 连发模式（打靶）：按住即持续开火，松开才停 —— 出弹交给 stepAutoFire()
    if (mode.autoFire) { triggerHeld = true; fireCooldown = 0; return; }

    handlePrimaryShot();
  });

  // 松开左键停火。挂 document 而不是 canvas：canvas 在暂停/结束时会被隐藏，
  // 挂它可能收不到 mouseup，枪就会一直连发下去。
  document.addEventListener('mouseup', (e) => {
    if (e.button === 0) releaseTrigger();
  });
}
