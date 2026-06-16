// ====== Grid Config ======
let GRID_COLS = 5, GRID_ROWS = 5;
let GRID_X_START = -2, GRID_Y_START = 0.5, GRID_STEP = 1;
let GRID_Z = -8;

// Slot tracking: map from target index to its current slot key
let targetSlots = {};
let usedSlots = new Set();

function applyGridConfig() {
  if (currentGrid === '3x3') {
    GRID_COLS = 3; GRID_ROWS = 3;
    GRID_X_START = -1; GRID_Y_START = 4; GRID_STEP = 1;
  } else {
    GRID_COLS = 5; GRID_ROWS = 5;
    GRID_X_START = -2; GRID_Y_START = 3; GRID_STEP = 1;
  }
  GRID_Z = -currentDist;
}

// ====== Target Creation ======
// Shared unit sphere geometry — all targets reuse this, scale controls size
const sharedSphereGeo = new THREE.SphereGeometry(1, 32, 32);

(function createTargets() {
  if (!scene) return; // scene init failed
  const targetMaterial = new THREE.MeshLambertMaterial({ color: 0x00ffff });
  for (let i = 0; i < TARGET_COUNT; i++) {
    const target = new THREE.Mesh(sharedSphereGeo, targetMaterial);
    target.userData.index = i;
    target.scale.set(currentRadius, currentRadius, currentRadius);
    target.position.set(0, -100, 0); // offscreen
    scene.add(target);
    targets.push(target);
  }
})();

// ====== Reset target to a new random slot ======
function resetTarget(target) {
  const idx = target.userData.index;

  // Remember old slot to exclude it when picking new position
  const oldSlot = targetSlots[idx] || null;

  if (oldSlot) {
    usedSlots.delete(oldSlot);
    delete targetSlots[idx];
  }

  if (usedSlots.size >= GRID_COLS * GRID_ROWS) {
    usedSlots.clear();
    targetSlots = {};
  }

  let col, row, key;
  do {
    col = Math.floor(Math.random() * GRID_COLS);
    row = Math.floor(Math.random() * GRID_ROWS);
    key = col + ',' + row;
  } while (usedSlots.has(key) || key === oldSlot);

  usedSlots.add(key);
  targetSlots[idx] = key;

  target.position.set(
    GRID_X_START + col * GRID_STEP,
    GRID_Y_START + row * GRID_STEP,
    GRID_Z
  );

  // Update scale to match current radius
  target.scale.set(currentRadius, currentRadius, currentRadius);
}
