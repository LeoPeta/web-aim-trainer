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
let cameraFov = 103;  // horizontal FOV (hFOV) shown in UI

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

// Raw mouse delta buffer — input.js writes cleaned pixels, animate() consumes
// them once per frame and applies sensitivity in the camera layer.
const rawMouse = { dx: 0, dy: 0 };

function shouldShowRenderer() {
  return trainState !== 'menu';
}

function shouldRenderScene() {
  return trainState === 'countdown' || trainState === 'playing';
}

function renderSceneOnce() {
  if (renderer && scene && camera) renderer.render(scene, camera);
}

function updateRendererVisibility() {
  if (!renderer) return;
  renderer.domElement.style.display = shouldShowRenderer() ? 'block' : 'none';
}

function clearInputBuffer() {
  rawMouse.dx = 0;
  rawMouse.dy = 0;
}

function getMouseRadPerPx() {
  return SENSITIVITY * sensitivityMultiplier;
}

// Training state
let score = 0, hits = 0, misses = 0, trainState = 'menu';
let timeLeft = 60, totalTime = 60;
let lastTime = performance.now();
const MAX_TARGET_COUNT = 6;
let activeTargetCount = 3;
let activeTargets = [];

// Countdown state
let countdownTime = 0;

// Reaction time tracking
let lastShotTime = 0;
let reactionTimes = [];
let lastClickTime = 0;

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
    timeLeft -= dt;
    const timerEl = document.getElementById('timer');
    timerEl.textContent = '⏱ ' + Math.ceil(Math.max(0, timeLeft));
    timerEl.className = timeLeft < 10 ? 'urgent' : '';

    if (timeLeft <= 0) endTraining();
  }

  // Consume raw mouse pixels once per frame → apply sensitivity → update camera.
  // Input is cleaned at the source (input.js), but sensitivity is applied here
  // to keep the input layer raw and avoid double-scaling.
  // Single threaded: read-then-zero is safe, no input lost between the two lines.
  if (isLocked && (trainState === 'playing' || trainState === 'countdown')) {
    const dx = rawMouse.dx;
    const dy = rawMouse.dy;
    rawMouse.dx = 0;
    rawMouse.dy = 0;

    const radPerPx = getMouseRadPerPx();
    yaw -= dx * radPerPx;
    pitch = Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, pitch - dy * radPerPx));
    camera.rotation.set(pitch, yaw, 0);
  } else {
    clearInputBuffer();
  }

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
  initCrosshairCanvas();
  if (trainState === 'paused' || trainState === 'over') renderSceneOnce();
});
