// ====== Three.js Scene Initialization ======
try {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x181818);

  camera = new THREE.PerspectiveCamera(
    horizontalToVerticalFov(cameraFov, window.innerWidth / window.innerHeight),
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.rotation.order = 'YXZ';
  camera.position.set(0, 5, 0);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  document.body.appendChild(renderer.domElement);
  renderer.domElement.style.display = 'none';

  // Ground grid
  scene.add(new THREE.GridHelper(40, 20, 0x333333, 0x2a2a2a));

  // Wall
  const wallGeo = new THREE.PlaneGeometry(40, 15);
  const wallMat = new THREE.MeshBasicMaterial({ color: 0x222222, side: THREE.DoubleSide });
  const wall = new THREE.Mesh(wallGeo, wallMat);
  wall.position.set(0, 7.5, -20);
  scene.add(wall);

  // Lines
  const lineMat = new THREE.LineBasicMaterial({ color: 0x333333 });
  for (let x = -20; x <= 20; x += 2) {
    const pts = [new THREE.Vector3(x, 0, 0), new THREE.Vector3(x, 0, -20), new THREE.Vector3(x, 15, -20)];
    scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), lineMat));
  }
  for (let y = 0; y <= 14; y += 2) {
    const pts = [new THREE.Vector3(-20, y, -20), new THREE.Vector3(20, y, -20)];
    scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), lineMat));
  }

  // Lights
  scene.add(new THREE.AmbientLight(0x9D9D9D, 2.0));
  const dirLight = new THREE.DirectionalLight(0xffffff, 0.6);
  dirLight.position.set(5, 8, 5);
  scene.add(dirLight);

  // Raycaster shared with input handler
  raycaster = new THREE.Raycaster();

} catch (e) {
  const errEl = document.getElementById('errorMsg');
  errEl.textContent = '初始化错误: ' + e.message;
  errEl.style.display = 'block';
  console.error('Three.js init error:', e);
}
