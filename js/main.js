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
const SENSITIVITY = 0.002;
const PITCH_LIMIT = 89 * Math.PI / 180;

// Training state
let score = 0, hits = 0, misses = 0, trainState = 'menu';
let timeLeft = 60, totalTime = 60;
let lastTime = performance.now();
const TARGET_COUNT = 3;

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

  if (renderer) renderer.render(scene, camera);

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
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  initCrosshairCanvas();
});
