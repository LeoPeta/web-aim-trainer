// ====== Gun Model Definition ======
// Shared between gun-editor.html and the game.
// createGun(THREE, params) — pass THREE explicitly so it works
// with both script-tag globals and ES module imports.

var DEFAULT_GUN_PARAMS = {
  body: {
    size:     { x: 0.13,  y: 0.1,    z: 0.45  },
    position: { x: 0,     y: -0.075, z: -0.1  },
    rotation: { x: 0,     y: 0,      z: 0     },   // radians
    color: '#828282'
  },
  grip: {
    size:     { x: 0.12,  y: 0.25,   z: 0.16  },
    position: { x: 0,     y: -0.2,   z: 0     },
    rotation: { x: -0.08726646259971647, y: 0, z: 0 },   // radians (~-5°)
    color: '#7a7a7a'
  },
  magazine: {
    size:     { x: 0.14,  y: 0.15,   z: 0.45  },
    position: { x: 0,     y: 0,      z: -0.1  },
    rotation: { x: 0,     y: 0,      z: 0     },   // radians
    color: '#707070'
  },
  fpsOffset:   { x: 0.6,   y: -0.4,  z: -1    },
  fpsRotation: { x: 0,     y: 0,     z: 0     },   // radians
  fpsFov:      75                                  // 武器独立 FOV（度）—— 只作用于 FPS 模式下的枪
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

  // Magazine
  var magGeo = new THREE.BoxGeometry(1, 1, 1);
  var magMat = new THREE.MeshStandardMaterial({
    color: params.magazine.color, roughness: 0.7, metalness: 0.2
  });
  var mag = new THREE.Mesh(magGeo, magMat);
  mag.scale.set(params.magazine.size.x, params.magazine.size.y, params.magazine.size.z);
  mag.position.set(params.magazine.position.x, params.magazine.position.y, params.magazine.position.z);
  mag.rotation.set(params.magazine.rotation.x, params.magazine.rotation.y, params.magazine.rotation.z);
  mag.name = 'magazine';
  gun.add(mag);

  return gun;
}
