import * as THREE from 'three';

const skinTones = [0xb9784d, 0x9f653f, 0xc48759, 0x8f5739];
const clothColors = [0xd94848, 0x2f9e44, 0x2b6cb0, 0xf08c00, 0x8f3f2d, 0x6c63ff];
const vehicleColors = [0xef476f, 0x118ab2, 0xffc43d, 0x4f5d75, 0x2f9e44];

const mat = (color, options = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.68, ...options });
const pick = (items, index = Math.floor(Math.random() * items.length)) => items[index % items.length];

function mesh(geometry, material, position = [0, 0, 0], rotation = [0, 0, 0]) {
  const item = new THREE.Mesh(geometry, material);
  item.position.set(...position);
  item.rotation.set(...rotation);
  item.castShadow = true;
  item.receiveShadow = true;
  return item;
}

function markShadows(group) {
  group.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });
  return group;
}

function textTexture(label, background = '#f8d34a', foreground = '#141414') {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = '#121212';
  ctx.lineWidth = 12;
  ctx.strokeRect(8, 8, canvas.width - 16, canvas.height - 16);
  ctx.fillStyle = foreground;
  ctx.font = '900 54px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label.toUpperCase(), canvas.width / 2, canvas.height / 2 + 2, canvas.width - 44);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function textPlane(label, width, height, background, foreground) {
  return mesh(
    new THREE.PlaneGeometry(width, height),
    new THREE.MeshBasicMaterial({ map: textTexture(label, background, foreground), side: THREE.DoubleSide })
  );
}

export function createTempo(routeLabel = 'Ratna Park', skin = {}) {
  const group = new THREE.Group();
  const bodyMat = mat(skin.body ?? 0x159b77, { roughness: 0.42, metalness: 0.08 });
  const roofMat = mat(skin.roof ?? 0xffcf42, { roughness: 0.48 });
  const trimMat = mat(skin.trim ?? 0xf8f1dc, { roughness: 0.46 });
  const blackMat = mat(0x171717, { roughness: 0.55 });
  const glassMat = mat(0x8bd3ff, { roughness: 0.12, metalness: 0.1 });
  const redMat = mat(skin.stripe ?? 0xd62828, { roughness: 0.52 });
  const chromeMat = mat(0xe5e7eb, { roughness: 0.25, metalness: 0.28 });

  group.add(mesh(new THREE.BoxGeometry(2.4, 1.7, 3.25), bodyMat, [0, 0.4, 0]));
  group.add(mesh(new THREE.BoxGeometry(1.55, 1.25, 1.6), bodyMat, [0, 0.2, -1.85]));
  group.add(mesh(new THREE.BoxGeometry(2.78, 0.28, 3.82), roofMat, [0, 1.4, 0]));
  group.add(mesh(new THREE.BoxGeometry(2.55, 0.08, 3.95), trimMat, [0, 1.62, 0]));
  group.add(mesh(new THREE.BoxGeometry(1.45, 0.65, 0.08), glassMat, [0, 0.75, -2.66]));
  group.add(mesh(new THREE.BoxGeometry(2.15, 0.18, 0.1), trimMat, [0, -0.2, -2.68]));
  group.add(mesh(new THREE.BoxGeometry(2.46, 0.16, 0.08), redMat, [0, 0.82, -0.2]));
  group.add(mesh(new THREE.BoxGeometry(2.46, 0.12, 0.08), roofMat, [0, 0.55, -0.2]));

  const routeBoard = textPlane(routeLabel, 2.2, 0.48, '#ffd43b', '#1b1b1b');
  routeBoard.position.set(0, 1.78, -1.72);
  routeBoard.rotation.x = -0.08;
  group.add(routeBoard);

  const plate = textPlane('BA 1 JA', 0.92, 0.25, '#ffffff', '#111111');
  plate.position.set(0, -0.07, -2.74);
  group.add(plate);

  for (const x of [-0.55, 0.55]) {
    group.add(mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.08, 16), chromeMat, [x, 0.2, -2.72], [Math.PI / 2, 0, 0]));
  }

  for (const [x, z] of [[-1.25, -1.4], [1.25, -1.4], [0, 1.45]]) {
    const wheel = mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.32, 24), blackMat, [x, -0.55, z], [0, 0, Math.PI / 2]);
    group.add(wheel);
    group.add(mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.34, 18), chromeMat, [x, -0.55, z], [0, 0, Math.PI / 2]));
  }

  for (const x of [-1.1, 1.1]) {
    const flag = mesh(new THREE.ConeGeometry(0.18, 0.5, 3), redMat, [x, 1.95, -0.9], [0, 0, Math.PI / 2]);
    flag.scale.y = 0.7;
    group.add(flag);
  }

  const rack = new THREE.Group();
  rack.add(mesh(new THREE.BoxGeometry(2.1, 0.06, 0.06), blackMat, [0, 0, -0.8]));
  rack.add(mesh(new THREE.BoxGeometry(2.1, 0.06, 0.06), blackMat, [0, 0, 0.8]));
  rack.add(mesh(new THREE.BoxGeometry(0.06, 0.06, 1.7), blackMat, [-0.92, 0, 0]));
  rack.add(mesh(new THREE.BoxGeometry(0.06, 0.06, 1.7), blackMat, [0.92, 0, 0]));
  rack.position.y = 1.84;
  group.add(rack);

  return markShadows(group);
}

function addWavingHand(group, skinMaterial, sleeveMaterial, side = 1) {
  const hand = new THREE.Group();
  hand.name = 'wavingPassengerHand';
  hand.position.set(side * 0.34, 0.86, -0.12);
  hand.rotation.z = side * -0.42;
  hand.add(mesh(new THREE.BoxGeometry(0.1, 0.46, 0.1), sleeveMaterial, [0, 0.2, 0], [0, 0, side * -0.08]));
  hand.add(mesh(new THREE.SphereGeometry(0.09, 10, 8), skinMaterial, [0, 0.48, 0]));
  group.add(hand);
}

function addTrafficSignalArm(group) {
  const arm = new THREE.Group();
  arm.name = 'trafficSignalArm';
  arm.position.set(0.5, 0.92, -0.1);
  arm.rotation.z = -0.58;
  arm.add(mesh(new THREE.BoxGeometry(0.1, 0.72, 0.1), mat(0xffffff), [0, 0.3, 0]));
  arm.add(mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.72, 10), mat(0xd94848), [0.04, 0.72, 0], [0, 0, -0.1]));
  arm.add(mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.28, 10), mat(0xffffff), [0.07, 1.06, 0], [0, 0, -0.1]));
  group.add(arm);
}

export function createPassenger(index = 0) {
  const group = new THREE.Group();
  const variant = index % 5;
  const skin = mat(pick(skinTones, index));
  const cloth = mat(pick(clothColors, index));
  const dark = mat(0x202124);
  const accent = mat(pick([0xffcf42, 0xf8f1dc, 0xd94848, 0x2b6cb0], index));

  group.add(mesh(new THREE.CapsuleGeometry(0.24, 0.62, 6, 14), cloth, [0, 0.55, 0]));
  group.add(mesh(new THREE.SphereGeometry(0.28, 18, 14), skin, [0, 1.1, 0]));

  if (variant === 0) {
    group.add(mesh(new THREE.BoxGeometry(0.62, 0.2, 0.5), dark, [0, 1.36, 0]));
    group.add(mesh(new THREE.BoxGeometry(0.18, 0.46, 0.12), dark, [-0.42, 0.52, 0.06]));
  } else if (variant === 1) {
    group.add(mesh(new THREE.TorusGeometry(0.34, 0.04, 8, 18), accent, [0, 0.98, 0], [Math.PI / 2, 0, 0]));
    group.add(mesh(new THREE.BoxGeometry(0.75, 0.1, 0.08), accent, [0.2, 0.74, -0.25], [0, 0, -0.45]));
  } else if (variant === 2) {
    group.add(mesh(new THREE.BoxGeometry(0.44, 0.62, 0.18), dark, [0, 0.62, 0.35]));
    group.add(mesh(new THREE.BoxGeometry(0.9, 0.06, 0.06), accent, [0, 1.48, 0]));
  } else if (variant === 3) {
    group.add(mesh(new THREE.ConeGeometry(0.3, 0.28, 4), accent, [0, 1.36, 0], [0, Math.PI / 4, 0]));
    group.add(mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.0, 8), dark, [0.46, 0.74, 0.1], [0, 0, 0.08]));
  } else {
    group.add(mesh(new THREE.SphereGeometry(0.42, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), accent, [0, 1.45, 0], [0, 0, Math.PI]));
    group.add(mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.82, 8), dark, [0, 0.96, 0]));
  }

  for (const x of [-0.18, 0.18]) {
    group.add(mesh(new THREE.BoxGeometry(0.1, 0.5, 0.12), dark, [x, 0.05, 0]));
  }

  addWavingHand(group, skin, cloth, index % 2 === 0 ? 1 : -1);

  const marker = new THREE.Group();
  marker.name = 'pickupMarker';
  marker.add(mesh(new THREE.TorusGeometry(0.72, 0.055, 10, 40), mat(0xffcf42, { emissive: 0x6b4f00, emissiveIntensity: 0.35 }), [0, 0.04, 0], [Math.PI / 2, 0, 0]));
  marker.add(mesh(new THREE.CylinderGeometry(0.08, 0.34, 0.68, 4), mat(0xffcf42, { emissive: 0x6b4f00, emissiveIntensity: 0.28 }), [0, 1.95, 0], [0, Math.PI / 4, Math.PI]));

  const board = textPlane('PICKUP', 1.12, 0.34, '#ffcf42', '#141414');
  board.name = 'pickupBillboard';
  board.position.set(0, 1.55, 0);
  marker.add(board);
  group.add(marker);

  return markShadows(group);
}

export function createObstacle(type, variant = 0) {
  if (type === 'cow') return createCow();
  if (type === 'cyclist') return createCyclist();
  if (type === 'police') return createTrafficPolice();
  return createTrafficVehicle(variant);
}

function createCow() {
  const group = new THREE.Group();
  const bodyMat = mat(0xf2eadf, { roughness: 0.9 });
  const brownMat = mat(0x6a4a3c, { roughness: 0.9 });
  const bellMat = mat(0xffcf42, { roughness: 0.35, metalness: 0.15 });
  group.add(mesh(new THREE.BoxGeometry(1.65, 0.75, 2.1), bodyMat, [0, 0.2, 0]));
  group.add(mesh(new THREE.BoxGeometry(0.75, 0.55, 0.75), brownMat, [0, 0.32, -1.3]));
  group.add(mesh(new THREE.BoxGeometry(0.24, 0.16, 0.16), brownMat, [-0.25, 0.64, -1.64]));
  group.add(mesh(new THREE.BoxGeometry(0.24, 0.16, 0.16), brownMat, [0.25, 0.64, -1.64]));
  group.add(mesh(new THREE.TorusGeometry(0.42, 0.025, 8, 24), mat(0xd94848), [0, 0.2, -0.9], [Math.PI / 2, 0, 0]));
  group.add(mesh(new THREE.SphereGeometry(0.12, 12, 8), bellMat, [0, -0.04, -1.02]));
  for (const x of [-0.55, 0.55]) {
    for (const z of [-0.58, 0.58]) {
      group.add(mesh(new THREE.BoxGeometry(0.16, 0.58, 0.16), brownMat, [x, -0.42, z]));
    }
  }
  return markShadows(group);
}

function createCyclist() {
  const group = new THREE.Group();
  const frameMat = mat(0x2b8aef, { roughness: 0.55 });
  const black = mat(0x18181b);
  const basket = mat(0xa16207, { roughness: 0.86 });
  group.add(mesh(new THREE.TorusGeometry(0.35, 0.045, 10, 28), black, [-0.34, -0.02, -0.52], [Math.PI / 2, 0, 0]));
  group.add(mesh(new THREE.TorusGeometry(0.35, 0.045, 10, 28), black, [-0.34, -0.02, 0.58], [Math.PI / 2, 0, 0]));
  group.add(mesh(new THREE.BoxGeometry(0.16, 0.08, 1.2), frameMat, [-0.34, 0.32, 0.05], [0.15, 0, 0]));
  group.add(mesh(new THREE.CapsuleGeometry(0.23, 0.65, 6, 12), mat(0xffd166), [0, 0.9, 0]));
  group.add(mesh(new THREE.SphereGeometry(0.22, 16, 12), mat(0xb9784d), [0, 1.36, 0]));
  group.add(mesh(new THREE.BoxGeometry(0.64, 0.34, 0.44), basket, [-0.32, 0.42, -0.98]));
  return markShadows(group);
}

function createTrafficPolice() {
  const group = new THREE.Group();
  const blue = mat(0x2348a7, { roughness: 0.5 });
  const white = mat(0xffffff, { roughness: 0.5 });
  const vest = mat(0xd9f99d, { roughness: 0.42 });
  group.add(mesh(new THREE.CapsuleGeometry(0.32, 0.9, 6, 16), blue, [0, 0.55, 0]));
  group.add(mesh(new THREE.BoxGeometry(0.72, 0.5, 0.05), vest, [0, 0.68, -0.26]));
  group.add(mesh(new THREE.SphereGeometry(0.24, 16, 12), mat(0xb9784d), [0, 1.24, 0]));
  group.add(mesh(new THREE.BoxGeometry(0.8, 0.18, 0.5), white, [0, 1.48, 0]));
  group.add(mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.3, 10), mat(0xd94848), [-0.68, 0.15, -0.2], [0, 0, 0.28]));
  addTrafficSignalArm(group);
  return markShadows(group);
}

function addDhakaTopi(group, y = 1.58, baseColor = 0x243b8f) {
  const topi = new THREE.Group();
  topi.name = 'dhakaTopi';
  topi.add(mesh(new THREE.CylinderGeometry(0.24, 0.28, 0.2, 6), mat(baseColor, { roughness: 0.82 }), [0, 0, 0], [0, Math.PI / 6, 0]));
  topi.add(mesh(new THREE.BoxGeometry(0.46, 0.035, 0.035), mat(0xd94848), [0, 0.055, -0.19], [0, 0.18, 0]));
  topi.add(mesh(new THREE.BoxGeometry(0.38, 0.035, 0.035), mat(0xffcf42), [0, -0.035, 0.19], [0, -0.18, 0]));
  topi.add(mesh(new THREE.BoxGeometry(0.035, 0.035, 0.38), mat(0xf8f1dc), [-0.19, 0.02, 0], [0, 0.32, 0]));
  topi.position.set(0, y, 0);
  group.add(topi);
}

function addSchoolBag(group, color = 0x2b6cb0) {
  const bag = new THREE.Group();
  bag.name = 'schoolBag';
  bag.add(mesh(new THREE.BoxGeometry(0.44, 0.56, 0.2), mat(color, { roughness: 0.72 }), [0, 0.82, 0.25]));
  bag.add(mesh(new THREE.BoxGeometry(0.36, 0.1, 0.04), mat(0xffcf42), [0, 1.02, 0.37]));
  bag.add(mesh(new THREE.BoxGeometry(0.09, 0.58, 0.04), mat(0x202124), [-0.26, 0.82, 0.17], [0, 0, -0.1]));
  bag.add(mesh(new THREE.BoxGeometry(0.09, 0.58, 0.04), mat(0x202124), [0.26, 0.82, 0.17], [0, 0, 0.1]));
  group.add(bag);
}

function addShawl(group, color = 0xd94848) {
  const shawl = new THREE.Group();
  shawl.name = 'wovenShawl';
  shawl.add(mesh(new THREE.BoxGeometry(0.12, 0.72, 0.08), mat(color, { roughness: 0.86 }), [-0.17, 0.97, -0.28], [0, 0, -0.46]));
  shawl.add(mesh(new THREE.BoxGeometry(0.12, 0.44, 0.08), mat(0xf8f1dc, { roughness: 0.86 }), [0.2, 0.74, -0.29], [0, 0, -0.46]));
  shawl.add(mesh(new THREE.BoxGeometry(0.36, 0.045, 0.09), mat(0xffcf42), [0.04, 1.1, -0.31], [0, 0, -0.46]));
  group.add(shawl);
}

function addPoliceVest(group) {
  const vest = new THREE.Group();
  vest.name = 'trafficPoliceVest';
  const neon = mat(0xd9f99d, { roughness: 0.48, emissive: 0x516500, emissiveIntensity: 0.14 });
  vest.add(mesh(new THREE.BoxGeometry(0.58, 0.58, 0.055), neon, [0, 0.9, -0.28]));
  vest.add(mesh(new THREE.BoxGeometry(0.09, 0.62, 0.065), mat(0xffcf42), [-0.16, 0.9, -0.32]));
  vest.add(mesh(new THREE.BoxGeometry(0.09, 0.62, 0.065), mat(0xffcf42), [0.16, 0.9, -0.32]));
  vest.add(mesh(new THREE.BoxGeometry(0.64, 0.055, 0.065), mat(0xffffff), [0, 0.96, -0.33]));
  group.add(vest);
}

function addPoliceBaton(group) {
  const baton = new THREE.Group();
  baton.name = 'trafficBaton';
  baton.add(mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.84, 10), mat(0xd94848), [0.55, 0.72, -0.12], [0, 0, -0.56]));
  baton.add(mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.32, 10), mat(0xffffff), [0.74, 1.05, -0.12], [0, 0, -0.56]));
  group.add(baton);
}

export function createPassengerAccessories(index = 0) {
  const group = new THREE.Group();
  group.name = 'nepaliPassengerAccessories';

  if (index % 3 === 0) {
    addDhakaTopi(group, 1.58, 0x243b8f);
    addSchoolBag(group, 0x2b6cb0);
  } else if (index % 3 === 1) {
    addShawl(group, 0xd94848);
    addDhakaTopi(group, 1.58, 0x8f3f2d);
  } else {
    addShawl(group, 0x2f9e44);
    addSchoolBag(group, 0x8f3f2d);
  }

  addWavingHand(group, mat(0xb9784d), mat(0xffcf42), index % 2 === 0 ? 1 : -1);
  return markShadows(group);
}

export function createPoliceAccessories() {
  const group = new THREE.Group();
  group.name = 'nepaliPoliceAccessories';
  addPoliceVest(group);
  addDhakaTopi(group, 1.58, 0xffffff);
  addPoliceBaton(group);
  addTrafficSignalArm(group);
  return markShadows(group);
}

function addWheelSet(group, black, xs, zs, radius = 0.28) {
  for (const x of xs) {
    for (const z of zs) {
      group.add(mesh(new THREE.CylinderGeometry(radius, radius, 0.2, 16), black, [x, -0.58, z], [0, 0, Math.PI / 2]));
    }
  }
}

function createTrafficVehicle(variant = 0) {
  const group = new THREE.Group();
  const kind = variant % 4;
  const body = mat(pick(vehicleColors, variant), { roughness: 0.48 });
  const glass = mat(0xdbeafe, { roughness: 0.2, metalness: 0.08 });
  const black = mat(0x171717);

  if (kind === 1) {
    group.name = 'trafficBus';
    group.add(mesh(new THREE.BoxGeometry(2.45, 1.45, 4.25), mat(0xf08c00, { roughness: 0.46 }), [0, 0.12, 0]));
    group.add(mesh(new THREE.BoxGeometry(2.18, 0.62, 0.12), glass, [0, 0.72, -2.2]));
    for (let z = -1.35; z <= 1.35; z += 0.9) {
      group.add(mesh(new THREE.BoxGeometry(0.08, 0.42, 0.5), glass, [-1.24, 0.68, z]));
      group.add(mesh(new THREE.BoxGeometry(0.08, 0.42, 0.5), glass, [1.24, 0.68, z]));
    }
    const sign = textPlane('BUS', 1.35, 0.36, '#ffd43b', '#141414');
    sign.position.set(0, 1.02, -2.18);
    group.add(sign);
    addWheelSet(group, black, [-1.03, 1.03], [-1.35, 1.45], 0.32);
  } else if (kind === 2) {
    group.name = 'trafficTaxi';
    group.add(mesh(new THREE.BoxGeometry(2.05, 0.98, 3.0), mat(0xffcf42, { roughness: 0.5 }), [0, -0.08, 0]));
    group.add(mesh(new THREE.BoxGeometry(1.38, 0.62, 1.3), glass, [0, 0.6, -0.12]));
    group.add(mesh(new THREE.BoxGeometry(0.8, 0.18, 0.36), mat(0x111814), [0, 1.05, -0.12]));
    group.add(mesh(new THREE.BoxGeometry(1.92, 0.12, 0.12), mat(0xd94848), [0, 0.34, -1.56]));
    addWheelSet(group, black, [-0.82, 0.82], [-1.02, 1.04], 0.26);
  } else if (kind === 3) {
    group.name = 'trafficScooter';
    group.add(mesh(new THREE.BoxGeometry(0.42, 0.28, 1.65), body, [0, -0.12, 0]));
    group.add(mesh(new THREE.BoxGeometry(0.72, 0.16, 0.36), mat(0x202124), [0, 0.18, 0.08]));
    group.add(mesh(new THREE.CapsuleGeometry(0.17, 0.52, 6, 10), mat(0x2b6cb0), [0, 0.7, 0.1]));
    group.add(mesh(new THREE.SphereGeometry(0.17, 14, 10), mat(0xb9784d), [0, 1.09, -0.02]));
    group.add(mesh(new THREE.BoxGeometry(0.9, 0.08, 0.08), black, [0, 0.44, -0.62]));
    group.add(mesh(new THREE.TorusGeometry(0.24, 0.04, 8, 18), black, [0, -0.38, -0.68], [Math.PI / 2, 0, 0]));
    group.add(mesh(new THREE.TorusGeometry(0.24, 0.04, 8, 18), black, [0, -0.38, 0.74], [Math.PI / 2, 0, 0]));
  } else {
    group.name = 'trafficCar';
    group.add(mesh(new THREE.BoxGeometry(2.15, 1.1, 3.2), body, [0, 0, 0]));
    group.add(mesh(new THREE.BoxGeometry(1.55, 0.65, 1.45), glass, [0, 0.75, -0.15]));
    group.add(mesh(new THREE.BoxGeometry(1.42, 0.28, 0.1), mat(0xffcf42), [0, 0.82, -1.68]));
    addWheelSet(group, black, [-0.86, 0.86], [-1.05, 1.05]);
  }
  return markShadows(group);
}

export function createShopSign(label, accent = 0xffcf42) {
  const group = new THREE.Group();
  const sign = textPlane(label, 3.8, 0.75, `#${accent.toString(16).padStart(6, '0')}`, '#111111');
  sign.position.set(0, 0, 0.08);
  group.add(sign);
  group.add(mesh(new THREE.BoxGeometry(4.05, 0.9, 0.1), mat(0x202124), [0, 0, 0]));
  return markShadows(group);
}

export function createStreetStall(label = 'MOMO') {
  const group = new THREE.Group();
  group.add(mesh(new THREE.BoxGeometry(2.5, 1.0, 1.45), mat(0x8f3f2d), [0, 0.5, 0]));
  group.add(mesh(new THREE.BoxGeometry(2.9, 0.22, 1.75), mat(0xd94848), [0, 1.15, 0]));
  const sign = textPlane(label, 1.7, 0.42, '#ffd43b', '#141414');
  sign.position.set(0, 1.5, -0.76);
  group.add(sign);
  return markShadows(group);
}

export function createPrayerFlags(width = 7) {
  const group = new THREE.Group();
  const colors = [0x2b6cb0, 0xffffff, 0xd94848, 0x2f9e44, 0xffcf42];
  group.add(mesh(new THREE.BoxGeometry(width, 0.04, 0.04), mat(0x40352f), [0, 0, 0]));
  for (let i = 0; i < 13; i += 1) {
    const flag = mesh(new THREE.BoxGeometry(0.36, 0.42, 0.03), mat(colors[i % colors.length]), [-width / 2 + i * (width / 12), -0.25, 0]);
    group.add(flag);
  }
  return markShadows(group);
}

export function createLandmark(theme = 'market', accent = 0xffcf42) {
  const group = new THREE.Group();
  if (theme === 'stupa') {
    group.add(mesh(new THREE.CylinderGeometry(2.7, 3.2, 1.1, 32), mat(0xf8f1dc), [0, 0.55, 0]));
    group.add(mesh(new THREE.SphereGeometry(2.35, 32, 12, 0, Math.PI * 2, 0, Math.PI / 2), mat(0xffffff), [0, 1.1, 0]));
    group.add(mesh(new THREE.BoxGeometry(1.6, 0.72, 1.6), mat(0xffcf42), [0, 2.25, 0]));
    group.add(mesh(new THREE.ConeGeometry(0.9, 2.1, 5), mat(0xd94848), [0, 3.65, 0]));
  } else if (theme === 'durbar') {
    group.add(mesh(new THREE.BoxGeometry(4.8, 3.4, 2.2), mat(0x8f3f2d), [0, 1.7, 0]));
    group.add(mesh(new THREE.ConeGeometry(3.1, 1.2, 4), mat(0x5a3825), [0, 3.95, 0], [0, Math.PI / 4, 0]));
    for (const x of [-1.35, 0, 1.35]) {
      group.add(mesh(new THREE.BoxGeometry(0.65, 1.0, 0.12), mat(0xf8d7a8), [x, 1.75, -1.16]));
    }
  } else if (theme === 'monsoon') {
    group.add(mesh(new THREE.CylinderGeometry(2.8, 2.8, 0.12, 32), mat(0x6b7280, { metalness: 0.18, roughness: 0.28 }), [0, 0.06, 0]));
    group.add(mesh(new THREE.BoxGeometry(3.8, 0.28, 1.1), mat(0xf97316), [0, 0.3, -0.2]));
    group.add(mesh(new THREE.CylinderGeometry(0.25, 0.25, 3.2, 14), mat(0x9ca3af), [0, 1.75, 0]));
  } else if (theme === 'swayambhu') {
    group.add(mesh(new THREE.CylinderGeometry(2.2, 2.8, 1.0, 28), mat(0xf8f1dc), [0, 0.5, 0]));
    group.add(mesh(new THREE.SphereGeometry(1.85, 28, 12, 0, Math.PI * 2, 0, Math.PI / 2), mat(0xffffff), [0, 1.0, 0]));
    group.add(mesh(new THREE.ConeGeometry(0.75, 1.9, 5), mat(accent), [0, 2.8, 0]));
    const flags = createPrayerFlags(6);
    flags.position.set(0, 2.75, -0.3);
    group.add(flags);
  } else {
    group.add(mesh(new THREE.BoxGeometry(4.2, 1.1, 1.5), mat(0x7aa0a8), [0, 0.55, 0]));
    group.add(mesh(new THREE.BoxGeometry(4.6, 0.28, 1.9), mat(accent), [0, 1.25, 0]));
    const sign = textPlane('YATAYAT', 2.7, 0.56, '#ffd43b', '#141414');
    sign.position.set(0, 1.68, -0.9);
    group.add(sign);
  }
  return markShadows(group);
}

export function createRoadHazard(type = 'pothole', accent = 0xffcf42) {
  const group = new THREE.Group();
  group.name = `roadHazard-${type}`;

  if (type === 'puddle') {
    group.add(mesh(new THREE.CylinderGeometry(1.25, 1.7, 0.035, 28), mat(0x74c0e3, { transparent: true, opacity: 0.62, metalness: 0.24, roughness: 0.16 }), [0, 0.02, 0]));
    group.add(mesh(new THREE.CylinderGeometry(0.42, 0.58, 0.04, 18), mat(0xdbeafe, { transparent: true, opacity: 0.48 }), [0.34, 0.04, -0.22]));
  } else if (type === 'barrier') {
    group.add(mesh(new THREE.BoxGeometry(2.2, 0.48, 0.42), mat(0xd94848), [0, 0.24, 0]));
    group.add(mesh(new THREE.BoxGeometry(2.25, 0.12, 0.46), mat(0xffffff), [0, 0.28, 0]));
    for (const x of [-0.82, 0.82]) {
      group.add(mesh(new THREE.BoxGeometry(0.16, 0.72, 0.16), mat(0x202124), [x, 0.36, 0]));
    }
    const lamp = mesh(new THREE.SphereGeometry(0.12, 10, 8), mat(accent, { emissive: accent, emissiveIntensity: 0.32 }), [0, 0.7, 0]);
    group.add(lamp);
  } else {
    group.add(mesh(new THREE.CylinderGeometry(1.0, 1.25, 0.06, 18), mat(0x151719, { roughness: 0.96 }), [0, 0.025, 0]));
    group.add(mesh(new THREE.CylinderGeometry(0.64, 0.82, 0.065, 16), mat(0x2f3437, { roughness: 0.9 }), [0.08, 0.055, -0.05]));
    group.add(mesh(new THREE.TorusGeometry(1.03, 0.045, 8, 24), mat(0x6b5f52), [0, 0.08, 0], [Math.PI / 2, 0, 0]));
  }

  return markShadows(group);
}

function addTinyLamp(group, x, z, color = 0xffcf42) {
  group.add(mesh(new THREE.CylinderGeometry(0.05, 0.08, 0.08, 8), mat(0x8f3f2d), [x, 0.08, z]));
  group.add(mesh(new THREE.SphereGeometry(0.06, 8, 6), mat(color, { emissive: color, emissiveIntensity: 0.45 }), [x, 0.17, z]));
}

function createWire(start, control, end) {
  const curve = new THREE.QuadraticBezierCurve3(
    new THREE.Vector3(...start),
    new THREE.Vector3(...control),
    new THREE.Vector3(...end)
  );
  return mesh(new THREE.TubeGeometry(curve, 14, 0.018, 6), mat(0x171717, { roughness: 0.9 }));
}

function createBusStop(accent) {
  const group = new THREE.Group();
  group.add(mesh(new THREE.BoxGeometry(3.8, 0.18, 1.35), mat(accent), [0, 2.25, 0]));
  group.add(mesh(new THREE.BoxGeometry(3.5, 0.12, 1.1), mat(0x1f2937), [0, 1.22, 0.12]));
  group.add(mesh(new THREE.BoxGeometry(2.6, 0.22, 0.32), mat(0x8f3f2d), [0, 0.58, -0.12]));
  for (const x of [-1.55, 1.55]) {
    group.add(mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.25, 8), mat(0x2f3136), [x, 1.08, -0.5]));
    group.add(mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.25, 8), mat(0x2f3136), [x, 1.08, 0.55]));
  }
  const sign = textPlane('BUS', 1.1, 0.42, '#ffd43b', '#111111');
  sign.position.set(0, 1.72, -0.6);
  group.add(sign);
  return group;
}

function createRoadsideShrine(accent) {
  const group = new THREE.Group();
  group.add(mesh(new THREE.BoxGeometry(1.45, 0.42, 1.15), mat(0x8f3f2d), [0, 0.21, 0]));
  group.add(mesh(new THREE.BoxGeometry(1.08, 1.0, 0.86), mat(0xd6c29b), [0, 0.92, 0]));
  group.add(mesh(new THREE.ConeGeometry(0.86, 0.72, 4), mat(accent), [0, 1.78, 0], [0, Math.PI / 4, 0]));
  group.add(mesh(new THREE.BoxGeometry(0.42, 0.58, 0.08), mat(0x202124), [0, 0.88, -0.47]));
  addTinyLamp(group, -0.48, -0.62);
  addTinyLamp(group, 0.48, -0.62);
  return group;
}

function createShutterShop(label, accent) {
  const group = new THREE.Group();
  group.add(mesh(new THREE.BoxGeometry(4.2, 2.65, 1.05), mat(0x7a5c4d), [0, 1.32, 0]));
  group.add(mesh(new THREE.BoxGeometry(3.35, 1.45, 0.08), mat(0x9ca3af, { metalness: 0.18, roughness: 0.42 }), [0, 0.88, -0.58]));
  for (let y = 0.28; y < 1.46; y += 0.24) {
    group.add(mesh(new THREE.BoxGeometry(3.42, 0.035, 0.1), mat(0x4b5563), [0, y, -0.64]));
  }
  const sign = textPlane(label, 2.6, 0.48, `#${accent.toString(16).padStart(6, '0')}`, '#141414');
  sign.position.set(0, 2.25, -0.62);
  group.add(sign);
  return group;
}

function createBrickStack() {
  const group = new THREE.Group();
  for (let row = 0; row < 4; row += 1) {
    for (let i = 0; i < 5 - row; i += 1) {
      group.add(mesh(new THREE.BoxGeometry(0.52, 0.18, 0.28), mat(0xa84b34), [(i - 2 + row * 0.5) * 0.55, row * 0.19 + 0.09, 0]));
    }
  }
  return group;
}

function createPuddle() {
  const group = new THREE.Group();
  group.add(mesh(new THREE.CylinderGeometry(1.25, 1.55, 0.025, 24), mat(0x7bc6dd, { transparent: true, opacity: 0.58, metalness: 0.2, roughness: 0.18 }), [0, 0.02, 0]));
  group.add(mesh(new THREE.CylinderGeometry(0.38, 0.48, 0.03, 18), mat(0xdbeafe, { transparent: true, opacity: 0.5 }), [0.38, 0.04, -0.16]));
  return group;
}

function createUtilityWires(accent) {
  const group = new THREE.Group();
  for (const x of [-9.8, 9.8]) {
    group.add(mesh(new THREE.CylinderGeometry(0.09, 0.12, 6.2, 10), mat(0x4b3428), [x, 3.1, 0]));
    group.add(mesh(new THREE.BoxGeometry(1.65, 0.08, 0.08), mat(0x4b3428), [x, 5.7, 0]));
    group.add(mesh(new THREE.SphereGeometry(0.13, 8, 6), mat(accent), [x - Math.sign(x) * 0.5, 5.52, 0]));
  }
  group.add(createWire([-9.8, 5.7, -0.25], [0, 4.85, -0.2], [9.8, 5.7, -0.25]));
  group.add(createWire([-9.8, 5.45, 0.18], [0, 4.72, 0.2], [9.8, 5.45, 0.18]));
  return group;
}

function createPrayerWheelRow(accent) {
  const group = new THREE.Group();
  group.add(mesh(new THREE.BoxGeometry(3.6, 0.18, 0.42), mat(0x8f3f2d), [0, 0.32, 0]));
  for (let i = 0; i < 5; i += 1) {
    const wheel = mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.34, 16), mat(i % 2 ? accent : 0xffcf42, { metalness: 0.14, roughness: 0.36 }), [-1.35 + i * 0.68, 0.82, 0], [Math.PI / 2, 0, 0]);
    group.add(wheel);
    group.add(mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.58, 8), mat(0x202124), [-1.35 + i * 0.68, 0.82, 0], [Math.PI / 2, 0, 0]));
  }
  return group;
}

function createRoadBarrier() {
  const group = new THREE.Group();
  for (let i = 0; i < 4; i += 1) {
    const color = i % 2 ? 0xffffff : 0xd94848;
    group.add(mesh(new THREE.BoxGeometry(0.72, 0.42, 0.5), mat(color), [(i - 1.5) * 0.74, 0.21, 0]));
  }
  return group;
}

export function createStreetProp(type = 'busStop', options = {}) {
  const accent = options.accent ?? 0xffcf42;
  const label = options.label ?? 'Chiya';
  let group;
  if (type === 'shrine') group = createRoadsideShrine(accent);
  else if (type === 'shutter') group = createShutterShop(label, accent);
  else if (type === 'bricks') group = createBrickStack();
  else if (type === 'puddle') group = createPuddle();
  else if (type === 'wires') group = createUtilityWires(accent);
  else if (type === 'prayerWheels') group = createPrayerWheelRow(accent);
  else if (type === 'barrier') group = createRoadBarrier();
  else group = createBusStop(accent);
  group.name = `streetProp-${type}`;
  return markShadows(group);
}
