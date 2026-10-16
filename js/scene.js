// ====== Three.js Scene Initialization ======

// 色彩模式的两套场景配色。夜晚 = 改动前的原值。
// 场景里三样东西要上色：天空（scene.background）、地板、墙。三者逐级过渡
// （夜晚 24→34→46、白天 230→214→200），墙根和墙顶两条分界线才看得见。
// 注意：地板现在是真面片了，bg 只代表天空，不再是「天空 + 地板」。
//
// flash 不是场景配色，是「命中闪白」用的颜色（见 targets.js）。它必须跟主题走：
// 夜晚背景 24、闪白才有对比；白天背景是 230，白球等于隐形，所以白天闪深灰。
const SCENE_THEMES = {
  night: { bg: 0x181818, floor: 0x222222, wall: 0x2e2e2e, flash: 0xffffff },
  day:   { bg: 0xe6e6e6, floor: 0xd6d6d6, wall: 0xc8c8c8, flash: 0x303030 },
};

// floorMat / wallMat 必须声明在 try 外面 —— try 块里的 const 是块级作用域，
// applySceneTheme() 在块外拿不到它们。下面 try 里的赋值写的是这两个模块级变量。
let wallMat = null;
let floorMat = null;

try {
  const theme = SCENE_THEMES[colorMode] || SCENE_THEMES.night;

  scene = new THREE.Scene();
  scene.background = new THREE.Color(theme.bg);

  camera = new THREE.PerspectiveCamera(
    horizontalToVerticalFov(cameraFov, window.innerWidth / window.innerHeight),
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.rotation.order = 'YXZ';
  camera.position.set(0, 5, 0);
  // 枪是 camera 的子节点（见 weapon.js），必须让 scene 遍历到它才会被渲染
  scene.add(camera);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  document.body.appendChild(renderer.domElement);
  renderer.domElement.style.display = 'none';

  // Floor —— 一块平铺的地面。和墙一样是不受光的纯色，没有光照渐变、没有阴影，
  // 深度感全靠天空 / 地板 / 墙三条色带的分界线。覆盖 x∈[-20,20]、z∈[-30,10]：
  // 往相机身后铺到 z=+10（相机在 z=0、y=5，垂直往下看要能看到脚下），远端伸到
  // z=-30 藏进墙后面，所以视觉上地板正好在墙根 z=-20 收边，宽 40 与墙对齐。
  const floorGeo = new THREE.PlaneGeometry(40, 40);
  floorMat = new THREE.MeshBasicMaterial({ color: theme.floor, side: THREE.DoubleSide });
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;   // 默认躺在 XY 面朝 +Z，转平后法线朝上
  floor.position.set(0, 0, -10);
  scene.add(floor);

  // Wall —— 竖直墙面，材质与地板同款（不受光的纯色）。
  const wallGeo = new THREE.PlaneGeometry(40, 15);
  wallMat = new THREE.MeshBasicMaterial({ color: theme.wall, side: THREE.DoubleSide });
  const wall = new THREE.Mesh(wallGeo, wallMat);
  wall.position.set(0, 7.5, -20);
  scene.add(wall);

  // Lights
  // 枪在 WEAPON_LAYER 上单独渲染，而 three.js 的 layers 同时过滤灯光 ——
  // 不 enable(WEAPON_LAYER) 的话武器相机收不到任何光照，枪会渲染成全黑。
  const ambientLight = new THREE.AmbientLight(0x9D9D9D, 2.0);
  ambientLight.layers.enable(WEAPON_LAYER);
  scene.add(ambientLight);

  const dirLight = new THREE.DirectionalLight(0xffffff, 0.6);
  dirLight.position.set(5, 8, 5);
  dirLight.layers.enable(WEAPON_LAYER);
  scene.add(dirLight);

  // Raycaster shared with input handler
  raycaster = new THREE.Raycaster();

} catch (e) {
  const errEl = document.getElementById('errorMsg');
  errEl.textContent = '初始化错误: ' + e.message;
  errEl.style.display = 'block';
  console.error('Three.js init error:', e);
}

// ====== 色彩模式 ======
// 切场景配色。UI 那半边（页面底色 / 文字 / 图表）由 settings.js 的 setColorMode()
// 通过 body.theme-day + CSS 变量负责 —— WebGL 读不到 CSS 变量，两边只能分开写、
// 由 setColorMode() 一起触发。
// 场景侧只剩天空 / 地板 / 墙三个颜色要改（网格和墙线已移除，没有需要重建的对象了）。
function applySceneTheme(mode) {
  const theme = SCENE_THEMES[mode] || SCENE_THEMES.night;
  if (!scene) return;

  // scene.background 是个 Color 实例，setHex 原地改，不换对象 ——
  // renderWeaponFrame() 会临时把它摘成 null 再还原引用，换对象会打乱那套逻辑。
  scene.background.setHex(theme.bg);
  if (floorMat) floorMat.color.setHex(theme.floor);
  if (wallMat) wallMat.color.setHex(theme.wall);
}
