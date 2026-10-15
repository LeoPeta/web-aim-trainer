// ====== Three.js Scene Initialization ======

// 色彩模式的两套场景配色。夜晚 = 改动前的原值。
// 注意：地板没有面片，它就是 scene.background 透过 GridHelper 看到的那层底色，
// 所以改 bg 就等于同时改了天空和地板。
const SCENE_THEMES = {
  night: { bg: 0x181818, wall: 0x222222, gridCenter: 0x333333, gridLine: 0x2a2a2a, wallLine: 0x333333 },
  day:   { bg: 0xe6e6e6, wall: 0xdcdcdc, gridCenter: 0x5a5a5a, gridLine: 0x9a9a9a, wallLine: 0x5a5a5a },
};

// 这三个必须声明在 try 外面 —— try 块里的 const 是块级作用域，applySceneTheme()
// 在块外拿不到它们。下面 try 里的赋值写的是这三个模块级变量（不再用 const 遮蔽）。
let gridHelper = null;
let wallMat = null;
let lineMat = null;

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

  // Ground grid
  gridHelper = new THREE.GridHelper(40, 20, theme.gridCenter, theme.gridLine);
  scene.add(gridHelper);

  // Wall
  const wallGeo = new THREE.PlaneGeometry(40, 15);
  wallMat = new THREE.MeshBasicMaterial({ color: theme.wall, side: THREE.DoubleSide });
  const wall = new THREE.Mesh(wallGeo, wallMat);
  wall.position.set(0, 7.5, -20);
  scene.add(wall);

  // Lines
  lineMat = new THREE.LineBasicMaterial({ color: theme.wallLine });
  for (let x = -20; x <= 20; x += 2) {
    const pts = [new THREE.Vector3(x, 0, 0), new THREE.Vector3(x, 0, -20), new THREE.Vector3(x, 15, -20)];
    scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), lineMat));
  }
  for (let y = 0; y <= 14; y += 2) {
    const pts = [new THREE.Vector3(-20, y, -20), new THREE.Vector3(20, y, -20)];
    scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), lineMat));
  }

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
function applySceneTheme(mode) {
  const theme = SCENE_THEMES[mode] || SCENE_THEMES.night;
  if (!scene) return;

  // scene.background 是个 Color 实例，setHex 原地改，不换对象 ——
  // renderWeaponFrame() 会临时把它摘成 null 再还原引用，换对象会打乱那套逻辑。
  scene.background.setHex(theme.bg);
  if (wallMat) wallMat.color.setHex(theme.wall);
  if (lineMat) lineMat.color.setHex(theme.wallLine);
  rebuildGrid(theme.gridCenter, theme.gridLine);
}

// GridHelper 的两个颜色在构造时就烘焙进了 geometry 的顶点色（材质是
// LineBasicMaterial({ vertexColors: true })），改材质颜色没有任何效果 ——
// 只能丢掉旧的、按新色重建。只在切主题时发生，不在每帧路径上。
function rebuildGrid(centerColor, lineColor) {
  if (!scene) return;
  if (gridHelper) {
    scene.remove(gridHelper);
    gridHelper.geometry.dispose();
    gridHelper.material.dispose();
  }
  gridHelper = new THREE.GridHelper(40, 20, centerColor, lineColor);
  scene.add(gridHelper);
}
