// ====== Target Pool ======
// Shared unit sphere geometry — all targets reuse this, scale controls size
const sharedSphereGeo = new THREE.SphereGeometry(1, 32, 32);

// ====== 命中闪白 ======
// 命中瞬间球跳到闪色，再在 TARGET_FLASH_MS 内线性衰减回青色。
// 闪色本身是主题相关的（夜晚白 / 白天深灰），取自 SCENE_THEMES[colorMode].flash。
//
// 40ms 是硬上限，不是随手取的：幻影 11 发/秒 → 出弹间隔 90.9ms。闪白必须明显
// 短于这个间隔，否则连发打同一颗球时它会一直白着、闪不动。40ms ≈ 2.4 帧（60fps），
// 占间隔 44%，连续命中时读起来是「一闪一闪」而不是「常白」。
const TARGET_BASE_COLOR = 0x00ffff;
const TARGET_FLASH_MS = 40;

// 每球一条闪白记录：{ start, color } 或 null。下标与 targets 一致。
const targetFlash = [];
const targetBaseColor = new THREE.Color(TARGET_BASE_COLOR);

// 闪色按当前主题取。颜色每次命中现取，不缓存 —— 白天/夜晚随时可切，
// 缓存住就会在切主题后闪错色。
function flashTarget(target) {
  if (!target || !target.material) return;
  const theme = SCENE_THEMES[colorMode] || SCENE_THEMES.night;
  const color = new THREE.Color(theme.flash);
  targetFlash[target.userData.index] = { start: performance.now(), color: color };
  target.material.color.copy(color);
}

// 撤掉闪白、回到青色。连续命中时 flashTarget 会重置 start，闪白从头再来。
function clearTargetFlash(target) {
  if (!target) return;
  targetFlash[target.userData.index] = null;
  if (target.material) target.material.color.setHex(TARGET_BASE_COLOR);
}

function clearAllTargetFlashes() {
  for (let i = 0; i < targets.length; i++) clearTargetFlash(targets[i]);
}

// 每帧推进衰减。没在闪时整轮是几个 null 判断，可忽略。
function updateTargetFlashes() {
  const now = performance.now();
  for (let i = 0; i < targets.length; i++) {
    const f = targetFlash[i];
    if (!f) continue;
    const t = (now - f.start) / TARGET_FLASH_MS;
    if (t >= 1) {
      clearTargetFlash(targets[i]);
    } else {
      // t=0 全闪色 → t=1 全青色
      targets[i].material.color.lerpColors(targetBaseColor, f.color, 1 - t);
    }
  }
}

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
  for (let i = 0; i < MAX_TARGET_COUNT; i++) {
    // 每个球一份材质。原先六个球共用一份，改颜色会六颗一起变 —— 命中闪白必须
    // 只闪被打中的那一颗，所以这里在循环里逐个新建（geometry 仍然共享）。
    const targetMaterial = new THREE.MeshLambertMaterial({ color: TARGET_BASE_COLOR });
    const target = new THREE.Mesh(sharedSphereGeo, targetMaterial);
    target.userData.index = i;
    target.scale.set(currentRadius, currentRadius, currentRadius);
    target.position.set(0, -100, 0); // offscreen
    target.visible = i < activeTargetCount;
    scene.add(target);
    targets.push(target);
    targetFlash.push(null);
  }
  syncActiveTargets();
})();
