// ====== FPS Viewmodel (gun) ======
// 枪挂在主相机下，整棵子树放在 WEAPON_LAYER 上，由第二台相机（固定 75° FOV）
// 单独渲染一遍。这样：① 枪不受「视野 FOV」设置影响；② 清深度后叠加，枪永远
// 压在场景之上，不会被墙体 / 地面网格遮挡。
// 模型与后坐力曲线与 gun-editor/ 完全一致（复用 gun-model.js 的 createGun）。

const WEAPON_FOV = 75;         // 武器独立 FOV —— 固定，不随设置里的 FOV 变化
const RECOIL_DURATION = 150;   // ms，与编辑器一致
const RECOIL_POS = { x: 0, y: 0.04, z: 0.07 };
const RECOIL_ROT = { x: 0.12, y: 0, z: 0 };

let gun = null;
let weaponCamera = null;
let showGun = true;            // 全局开关，持久化在 aimTrainerPrefs.showGun
let recoilAnim = null;

function initWeapon() {
  if (typeof createGun !== 'function') return;
  const params = (typeof GUN_PARAMS !== 'undefined') ? GUN_PARAMS : DEFAULT_GUN_PARAMS;

  // 武器相机：只看得见 WEAPON_LAYER，近平面 0.01（枪离相机很近）
  weaponCamera = new THREE.PerspectiveCamera(WEAPON_FOV, camera.aspect, 0.01, 100);
  weaponCamera.layers.set(WEAPON_LAYER);
  camera.add(weaponCamera);

  gun = createGun(THREE, params);
  gun.position.set(params.fpsOffset.x, params.fpsOffset.y, params.fpsOffset.z);
  gun.rotation.set(params.fpsRotation.x, params.fpsRotation.y, params.fpsRotation.z);
  // 整棵子树进 WEAPON_LAYER：主相机看不到它，武器相机只看得到它
  gun.traverse(o => o.layers.set(WEAPON_LAYER));
  gun.visible = showGun;
  camera.add(gun);

  updateGunToggleBtns();
}

// 第二遍渲染：清掉深度缓冲后把枪画在已渲染好的场景之上。
// 枪不可见时直接返回，主循环退化成单遍渲染。
//
// 注意 scene.background 必须临时摘掉：three.js 的 WebGLBackground 在背景是 Color 时
// 会置 forceClear = true，而 clear 的条件是 `renderer.autoClear || forceClear` ——
// 或关系，autoClear = false 压不住，第二遍会把刚渲染好的场景整个抹成背景色，
// 只剩一把枪。摘掉背景后 forceClear 保持 false，颜色缓冲才不会被清。
function renderWeaponFrame() {
  if (!renderer || !scene || !weaponCamera || !gun || !gun.visible) return;
  const bg = scene.background;
  scene.background = null;
  renderer.autoClear = false;
  try {
    renderer.clearDepth();
    renderer.render(scene, weaponCamera);
  } finally {
    // 渲染抛错也必须还原：autoClear = false 一旦留在 renderer 上，之后每帧都
    // 不再清屏（画面拖影），而且没有任何地方会把它改回来。
    renderer.autoClear = true;
    scene.background = bg;
  }
}

function updateWeaponAspect() {
  if (!weaponCamera) return;
  weaponCamera.aspect = window.innerWidth / window.innerHeight;
  weaponCamera.updateProjectionMatrix();
}

// 状态 → 场景 / 开关按钮的同步（不落盘）。
// loadPreferences() 直接改 showGun 后调它，避免在恢复过程中回写 localStorage。
function applyGunVisibility() {
  if (gun) gun.visible = showGun;
  updateGunToggleBtns();
}

function setShowGun(on) {
  showGun = !!on;
  if (!showGun) resetRecoil();
  applyGunVisibility();
  savePreferences();
}

// 通用 tab 里的开关按钮：两个按钮的 .active 状态由 showGun 反推
function updateGunToggleBtns() {
  const btns = document.getElementById('gunToggleBtns');
  if (!btns) return;
  const list = btns.querySelectorAll('button');
  if (list.length < 2) return;
  list[0].classList.toggle('active', showGun);
  list[1].classList.toggle('active', !showGun);
}

// ---- 后坐力：与编辑器同款曲线 ----
// 前 25% 快速后坐，后 75% 缓慢复位；一次射击期间不叠加（recoilAnim 非空时忽略）
function triggerRecoil() {
  if (!gun || !gun.visible || recoilAnim) return;
  recoilAnim = {
    startTime: performance.now(),
    startPos: gun.position.clone(),
    startRot: gun.rotation.clone(),
  };
}

function resetRecoil() {
  if (!gun || !recoilAnim) return;
  gun.position.copy(recoilAnim.startPos);
  gun.rotation.copy(recoilAnim.startRot);
  recoilAnim = null;
}

function updateRecoil() {
  if (!recoilAnim || !gun) return;
  const t = Math.min((performance.now() - recoilAnim.startTime) / RECOIL_DURATION, 1);
  const p = t < 0.25 ? t / 0.25 : 1 - (t - 0.25) / 0.75;
  gun.position.set(
    recoilAnim.startPos.x + RECOIL_POS.x * p,
    recoilAnim.startPos.y + RECOIL_POS.y * p,
    recoilAnim.startPos.z + RECOIL_POS.z * p
  );
  gun.rotation.set(
    recoilAnim.startRot.x + RECOIL_ROT.x * p,
    recoilAnim.startRot.y,
    recoilAnim.startRot.z
  );
  if (t >= 1) resetRecoil();
}

initWeapon();
