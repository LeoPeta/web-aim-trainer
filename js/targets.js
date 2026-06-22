// ====== Target Pool ======
// Shared unit sphere geometry — all targets reuse this, scale controls size
const sharedSphereGeo = new THREE.SphereGeometry(1, 32, 32);

function syncActiveTargets() {
  activeTargetCount = getEffectiveTargetCount();
  activeTargets = [];

  for (let i = 0; i < targets.length; i++) {
    const active = i < activeTargetCount;
    targets[i].visible = active;
    if (active) {
      activeTargets.push(targets[i]);
    } else {
      targets[i].position.set(0, -100, 0);
    }
  }
}

// ====== Target Creation ======
(function createTargets() {
  if (!scene) return; // scene init failed
  const targetMaterial = new THREE.MeshLambertMaterial({ color: 0x00ffff });
  for (let i = 0; i < MAX_TARGET_COUNT; i++) {
    const target = new THREE.Mesh(sharedSphereGeo, targetMaterial);
    target.userData.index = i;
    target.scale.set(currentRadius, currentRadius, currentRadius);
    target.position.set(0, -100, 0); // offscreen
    target.visible = i < activeTargetCount;
    scene.add(target);
    targets.push(target);
  }
  syncActiveTargets();
})();
