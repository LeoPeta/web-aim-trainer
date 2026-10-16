// ====== Three.js Check ======
if (typeof THREE === 'undefined') {
  document.getElementById('menuOverlay').innerHTML =
    '<h1 style="color:#f44">Three.js 未加载</h1>' +
    '<p>请确认 three.min.js 与 AIM.html 在同一目录下</p>';
  throw new Error('Three.js not loaded');
}

// ====== Global Shared State ======
// Three.js objects (initialized in scene.js)
let scene, camera, renderer, targets = [];

// Camera control state
let yaw = 0, pitch = 0, isLocked = false;
// Pending mouse deltas — input.js accumulates raw pixels here (CS-style);
// processMouseMovement() consumes and resets them once per frame.
let pendingMouseX = 0, pendingMouseY = 0;
let cameraFov = 103;  // horizontal FOV (hFOV) shown in UI

// 色彩模式：'night'（默认，改动前的配色）| 'day'。
// 定义在这里（最先加载的模块）而不是 settings.js，避免 scene.js 建场景时读它命中 TDZ。
let colorMode = 'night';

function horizontalToVerticalFov(hFov, aspect) {
  const hRad = hFov * Math.PI / 180;
  const vRad = 2 * Math.atan(Math.tan(hRad / 2) / aspect);
  return vRad * 180 / Math.PI;
}

function applyCameraFov() {
  if (!camera) return;
  camera.fov = horizontalToVerticalFov(cameraFov, camera.aspect);
  camera.updateProjectionMatrix();
}
// Valorant yaw constant: 0.07°/count at sens 1.0. With Windows pointer
// speed at 6/11 (default) and acceleration off, 1 mouse count ≈ 1 CSS px,
// so this maps 1 px → 0.07° × sensitivityMultiplier, matching Valorant 1:1.
const SENSITIVITY = 0.07 * Math.PI / 180;
const PITCH_LIMIT = 89 * Math.PI / 180;

function shouldShowRenderer() {
  return trainState !== 'menu';
}

function shouldRenderScene() {
  return trainState === 'countdown' || trainState === 'playing';
}

function renderSceneOnce() {
  if (!renderer || !scene || !camera) return;
  renderer.render(scene, camera);
  // 第二遍：武器（枪不可见时 renderWeaponFrame 直接返回，退化成单遍渲染）
  renderWeaponFrame();
}

function updateRendererVisibility() {
  if (!renderer) return;
  renderer.domElement.style.display = shouldShowRenderer() ? 'block' : 'none';
}

function clearInputBuffer() {
  pendingMouseX = 0;
  pendingMouseY = 0;
}

function processMouseMovement() {
  if (pendingMouseX === 0 && pendingMouseY === 0) return;
  const radPerPx = getMouseRadPerPx();
  yaw -= pendingMouseX * radPerPx;
  pitch -= pendingMouseY * radPerPx;
  pitch = Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, pitch));
  camera.rotation.order = 'YXZ';
  camera.rotation.y = yaw;
  camera.rotation.x = pitch;
  pendingMouseX = 0;
  pendingMouseY = 0;
}

function getMouseRadPerPx() {
  return SENSITIVITY * sensitivityMultiplier;
}

// Training state
let score = 0, hits = 0, misses = 0, trainState = 'menu';
let timeLeft = 60, totalTime = 60;
let lastTime = performance.now();
const MAX_TARGET_COUNT = 6;
// 武器专用渲染层：枪在 camera 下、由 weapon.js 的第二台相机单独渲染。
// 定义在这里（最先加载的模块）而不是 weapon.js，避免 scene.js 读取时命中 TDZ。
const WEAPON_LAYER = 1;
let activeTargetCount = 3;
let activeTargets = [];

// Countdown state
let countdownTime = 0;

// Reaction time tracking
let lastShotTime = 0;
let reactionTimes = [];

// Raycaster for clicking detection (used by input.js)
let raycaster;

// ====== FPS Counter & Main Loop ======
let fpsFrames = 0, fpsLast = performance.now();

function animate(time) {
  requestAnimationFrame(animate);

  const dt = (time - lastTime) / 1000;
  lastTime = time;

  if (trainState === 'countdown') {
    countdownTime -= dt;
    const countdownEl = document.getElementById('countdownText');
    const num = Math.ceil(Math.max(0, countdownTime));
    if (num > 0) {
      countdownEl.textContent = num;
    } else {
      // Countdown finished → start playing
      countdownEl.textContent = '';
      document.getElementById('countdownOverlay').classList.add('hidden');
      trainState = 'playing';
      clearInputBuffer();
      updateRendererVisibility();
      lastTime = performance.now();
    }
  }

  if (trainState === 'playing') {
    // Per-mode per-frame hook (e.g. tracking moves the target and scores by aim)
    callModeHook('onFrame', dt);

    timeLeft -= dt;
    const timerEl = document.getElementById('timer');
    timerEl.textContent = '⏱ ' + Math.ceil(Math.max(0, timeLeft));
    timerEl.className = timeLeft < 10 ? 'urgent' : '';

    if (timeLeft <= 0) endTraining();
  }

  // Consume accumulated mouse deltas once per frame (CS-style): apply pending
  // deltas to camera, then reset. input.js guards event recording, so pending
  // is normally 0 outside locked gameplay and this call is a cheap no-op.
  processMouseMovement();

  // 后坐力按 performance.now() 推进（与编辑器同款曲线），枪隐藏时是廉价 no-op
  updateRecoil();

  // 命中闪白按 performance.now() 衰减回青色（40ms），没在闪时是廉价 no-op
  updateTargetFlashes();

  // 连发（打靶模式）按射速出弹；其余模式是廉价 no-op
  stepAutoFire(dt);

  updateRendererVisibility();
  if (shouldRenderScene()) renderSceneOnce();

  // FPS counter
  fpsFrames++;
  if (time - fpsLast >= 1000) {
    document.getElementById('fps').textContent = fpsFrames + ' FPS';
    fpsFrames = 0;
    fpsLast = time;
  }
}

// ====== Window Resize ======
window.addEventListener('resize', () => {
  if (!camera || !renderer) return;
  camera.aspect = window.innerWidth / window.innerHeight;
  applyCameraFov();
  renderer.setSize(window.innerWidth, window.innerHeight);
  updateWeaponAspect();
  initCrosshairCanvas();
  if (trainState === 'paused' || trainState === 'over') renderSceneOnce();
});
