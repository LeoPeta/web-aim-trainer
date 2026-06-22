// ====== Gun Model Definition ======
// Shared between gun-editor.html and the game.
// createGun(THREE, params) — pass THREE explicitly so it works
// with both script-tag globals and ES module imports.

var DEFAULT_GUN_PARAMS = {
  body: {
    size:     { x: 0.25,  y: 0.07,  z: 0.05  },
    position: { x: 0,     y: 0,     z: 0     },
    rotation: { x: 0,     y: 0,     z: 0     },   // radians
    color: '#888888'
  },
  grip: {
    size:     { x: 0.05,  y: 0.13,  z: 0.045 },
    position: { x: -0.04, y: -0.09, z: 0.003 },
    rotation: { x: 0,     y: 0,     z: 0.2   },   // radians (~11.5°)
    color: '#3a3a3a'
  },
  fpsOffset:   { x: 0.25,  y: -0.22, z: -0.45 },
  fpsRotation: { x: 0,     y: 0,     z: 0     }    // radians
};

function createGun(THREE, params) {
  if (!params) params = DEFAULT_GUN_PARAMS;
  var gun = new THREE.Group();
  gun.name = 'gun';

  // Body — unit box scaled to size (allows live resize without geometry rebuild)
  var bodyGeo = new THREE.BoxGeometry(1, 1, 1);
  var bodyMat = new THREE.MeshStandardMaterial({
    color: params.body.color, roughness: 0.55, metalness: 0.35
  });
  var body = new THREE.Mesh(bodyGeo, bodyMat);
  body.scale.set(params.body.size.x, params.body.size.y, params.body.size.z);
  body.position.set(params.body.position.x, params.body.position.y, params.body.position.z);
  body.rotation.set(params.body.rotation.x, params.body.rotation.y, params.body.rotation.z);
  body.name = 'body';
  gun.add(body);

  // Grip
  var gripGeo = new THREE.BoxGeometry(1, 1, 1);
  var gripMat = new THREE.MeshStandardMaterial({
    color: params.grip.color, roughness: 0.75, metalness: 0.1
  });
  var grip = new THREE.Mesh(gripGeo, gripMat);
  grip.scale.set(params.grip.size.x, params.grip.size.y, params.grip.size.z);
  grip.position.set(params.grip.position.x, params.grip.position.y, params.grip.position.z);
  grip.rotation.set(params.grip.rotation.x, params.grip.rotation.y, params.grip.rotation.z);
  grip.name = 'grip';
  gun.add(grip);

  return gun;
}
