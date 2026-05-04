import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { LEVELS, LANES } from './levels.js';

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const rand = (min, max) => min + Math.random() * (max - min);
const choice = (items) => items[Math.floor(Math.random() * items.length)];

export class KathmanduChaos {
  constructor({ canvas, ui }) {
    this.canvas = canvas;
    this.ui = ui;
    this.levelIndex = 0;
    this.keys = new Set();
    this.clock = new THREE.Clock();
    this.entities = [];
    this.pickups = [];
    this.running = false;
    this.pausedByOverlay = true;
  }

  async boot() {
    await RAPIER.init();
    this.setupRenderer();
    this.setupInput();
    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.ui.startButton.addEventListener('click', () => this.startFromOverlay());
    this.loadLevel(0);
    this.animate();
  }

  setupRenderer() {
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      preserveDrawingBuffer: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(58, 1, 0.1, 1100);
  }

  setupInput() {
    window.addEventListener('keydown', (event) => {
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' ', 'a', 'd', 'w', 's'].includes(event.key)) {
        event.preventDefault();
      }
      this.keys.add(event.key.toLowerCase());
    });
    window.addEventListener('keyup', (event) => this.keys.delete(event.key.toLowerCase()));
  }

  startFromOverlay() {
    this.ui.overlay.classList.add('hidden');
    this.pausedByOverlay = false;
    this.running = true;
    this.clock.getDelta();
  }

  loadLevel(index) {
    this.levelIndex = index;
    this.level = LEVELS[index];
    this.state = {
      score: 0,
      passengers: 0,
      hearts: 3,
      elapsed: 0,
      distance: 0,
      speed: 0,
      steer: 0,
      invulnerable: 0,
      finished: false
    };

    this.scene.clear();
    this.world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
    this.entities = [];
    this.pickups = [];

    this.buildWorld();
    this.buildPlayer();
    this.populateRoute();
    this.updateRouteUi();
    this.renderHud();
    this.showIntro();
  }

  buildWorld() {
    const { palette } = this.level;
    this.scene.background = new THREE.Color(palette.sky);
    this.scene.fog = new THREE.Fog(palette.fog, 70, 520);

    const hemi = new THREE.HemisphereLight(0xffffff, 0x59605d, 1.45);
    this.scene.add(hemi);

    const sun = new THREE.DirectionalLight(0xffffff, 1.6);
    sun.position.set(-20, 34, -18);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -55;
    sun.shadow.camera.right = 55;
    sun.shadow.camera.top = 55;
    sun.shadow.camera.bottom = -55;
    this.scene.add(sun);

    this.road = new THREE.Group();
    this.scene.add(this.road);

    const roadGeo = new THREE.BoxGeometry(17, 0.35, this.level.length + 80);
    const roadMat = new THREE.MeshStandardMaterial({
      color: palette.road,
      roughness: this.level.wetRoad ? 0.38 : 0.72,
      metalness: this.level.wetRoad ? 0.18 : 0.02
    });
    const road = new THREE.Mesh(roadGeo, roadMat);
    road.position.set(0, -0.2, -this.level.length / 2 + 30);
    road.receiveShadow = true;
    this.scene.add(road);

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(90, this.level.length + 180),
      new THREE.MeshStandardMaterial({ color: 0x6f8061, roughness: 0.85 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.z = -this.level.length / 2 + 15;
    ground.receiveShadow = true;
    this.scene.add(ground);

    this.world.createCollider(RAPIER.ColliderDesc.cuboid(8.5, 0.2, this.level.length / 2 + 40).setTranslation(0, -0.28, -this.level.length / 2 + 30));

    this.addRoadPaint();
    this.addCityBlocks();
  }

  addRoadPaint() {
    const lineMat = new THREE.MeshBasicMaterial({ color: 0xf4f0d8, transparent: true, opacity: 0.78 });
    for (let z = 10; z > -this.level.length; z -= 22) {
      for (const x of [-4.05, -1.35, 1.35, 4.05]) {
        const dash = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.03, 7.5), lineMat);
        dash.position.set(x, 0.03, z);
        this.scene.add(dash);
      }
    }
  }

  addCityBlocks() {
    const colors = [0xbd6b52, 0xd49a63, 0x7aa0a8, 0x6e8064, 0xd6c29b, 0x8b6d9e];
    for (let z = -20; z > -this.level.length - 80; z -= 26) {
      for (const side of [-1, 1]) {
        const width = rand(7, 13);
        const height = rand(4, 15);
        const depth = rand(8, 18);
        const building = new THREE.Mesh(
          new THREE.BoxGeometry(width, height, depth),
          new THREE.MeshStandardMaterial({ color: choice(colors), roughness: 0.76 })
        );
        building.position.set(side * rand(15, 27), height / 2 - 0.15, z + rand(-5, 5));
        building.castShadow = true;
        building.receiveShadow = true;
        this.scene.add(building);

        if (Math.random() > 0.45) {
          const flag = new THREE.Mesh(
            new THREE.BoxGeometry(width * 0.7, 0.08, 0.9),
            new THREE.MeshStandardMaterial({ color: this.level.palette.accent, roughness: 0.5 })
          );
          flag.position.set(building.position.x, height + 0.25, building.position.z);
          this.scene.add(flag);
        }
      }
    }
  }

  buildPlayer() {
    this.player = new THREE.Group();
    this.player.position.set(0, 0.9, 12);
    this.scene.add(this.player);

    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x1ba784, roughness: 0.42, metalness: 0.08 });
    const roofMat = new THREE.MeshStandardMaterial({ color: 0xffcf42, roughness: 0.48 });
    const blackMat = new THREE.MeshStandardMaterial({ color: 0x171717, roughness: 0.55 });
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x8bd3ff, roughness: 0.12, metalness: 0.1 });

    const cabin = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.7, 3.2), bodyMat);
    cabin.position.y = 0.4;
    cabin.castShadow = true;
    this.player.add(cabin);

    const nose = new THREE.Mesh(new THREE.BoxGeometry(1.55, 1.25, 1.6), bodyMat);
    nose.position.set(0, 0.2, -1.85);
    nose.castShadow = true;
    this.player.add(nose);

    const roof = new THREE.Mesh(new THREE.BoxGeometry(2.75, 0.28, 3.75), roofMat);
    roof.position.y = 1.4;
    roof.castShadow = true;
    this.player.add(roof);

    const windshield = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.65, 0.08), glassMat);
    windshield.position.set(0, 0.75, -2.66);
    this.player.add(windshield);

    for (const [x, z] of [[-1.25, -1.4], [1.25, -1.4], [0, 1.45]]) {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.32, 24), blackMat);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(x, -0.55, z);
      wheel.castShadow = true;
      this.player.add(wheel);
    }

    const rb = RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(0, 0.9, 12);
    this.playerBody = this.world.createRigidBody(rb);
    const collider = RAPIER.ColliderDesc.cuboid(1.25, 0.95, 1.95);
    this.world.createCollider(collider, this.playerBody);
  }

  populateRoute() {
    this.addPassengers();
    this.addObstacles('car', this.level.traffic);
    this.addObstacles('cow', this.level.cows);
    this.addObstacles('cyclist', this.level.cyclists);
    this.addObstacles('police', this.level.police);
    this.addFinishGate();
  }

  addPassengers() {
    const spacing = this.level.length / (this.level.passengerGoal + 1);
    for (let i = 0; i < this.level.passengerGoal + 2; i += 1) {
      const lane = choice([LANES[0], LANES[4]]);
      const z = -spacing * (i + 0.75) + rand(-12, 12);
      const passenger = this.createPassenger(lane, z);
      this.pickups.push({ mesh: passenger, collected: false, z, x: lane, value: 120 + i * 15 });
    }
  }

  createPassenger(x, z) {
    const group = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: choice([0xe8505b, 0x6c63ff, 0x2f9e44, 0xf08c00]), roughness: 0.7 });
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 16, 16), new THREE.MeshStandardMaterial({ color: 0xb77b4f }));
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.55, 6, 12), mat);
    head.position.y = 1.05;
    body.position.y = 0.52;
    group.add(head, body);
    group.position.set(x, 0, z);
    group.castShadow = true;
    this.scene.add(group);
    return group;
  }

  addObstacles(type, count) {
    const start = -55;
    const end = -this.level.length + 60;
    for (let i = 0; i < count; i += 1) {
      const z = rand(start, end);
      const x = choice(LANES);
      const mesh = this.createObstacleMesh(type);
      mesh.position.set(x, 0.6, z);
      this.scene.add(mesh);

      const rb = this.world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(x, 0.6, z));
      const half = type === 'cyclist' ? [0.55, 0.9, 0.9] : type === 'cow' ? [0.9, 0.65, 1.25] : [1.1, 0.75, 1.6];
      this.world.createCollider(RAPIER.ColliderDesc.cuboid(...half), rb);
      this.entities.push({ type, mesh, body: rb, x, z, hit: false, wobble: rand(0, Math.PI * 2), penalty: type === 'police' ? 2 : 1 });
    }
  }

  createObstacleMesh(type) {
    const group = new THREE.Group();
    if (type === 'cow') {
      const body = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.75, 2.1), new THREE.MeshStandardMaterial({ color: 0xf2eadf, roughness: 0.9 }));
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.55, 0.75), new THREE.MeshStandardMaterial({ color: 0x6a4a3c, roughness: 0.9 }));
      body.position.y = 0.2;
      head.position.set(0, 0.32, -1.3);
      group.add(body, head);
    } else if (type === 'cyclist') {
      const frame = new THREE.Mesh(new THREE.BoxGeometry(0.28, 1.2, 1.5), new THREE.MeshStandardMaterial({ color: 0x2b8aef, roughness: 0.55 }));
      const rider = new THREE.Mesh(new THREE.CapsuleGeometry(0.23, 0.65, 6, 12), new THREE.MeshStandardMaterial({ color: 0xffd166, roughness: 0.62 }));
      frame.position.y = 0.1;
      rider.position.y = 0.9;
      group.add(frame, rider);
    } else if (type === 'police') {
      const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.32, 0.9, 6, 16), new THREE.MeshStandardMaterial({ color: 0x2348a7, roughness: 0.5 }));
      const hat = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.18, 0.5), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 }));
      body.position.y = 0.55;
      hat.position.y = 1.2;
      group.add(body, hat);
    } else {
      const car = new THREE.Mesh(new THREE.BoxGeometry(2.15, 1.1, 3.2), new THREE.MeshStandardMaterial({ color: choice([0xef476f, 0x118ab2, 0xffc43d, 0x4f5d75]), roughness: 0.48 }));
      const top = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.65, 1.45), new THREE.MeshStandardMaterial({ color: 0xdbeafe, roughness: 0.2 }));
      car.castShadow = true;
      top.position.y = 0.75;
      group.add(car, top);
    }
    group.traverse((child) => {
      if (child.isMesh) child.castShadow = true;
    });
    return group;
  }

  addFinishGate() {
    const z = -this.level.length;
    const mat = new THREE.MeshStandardMaterial({ color: this.level.palette.accent, roughness: 0.45 });
    for (const x of [-7, 7]) {
      const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.5, 5.5, 0.5), mat);
      pillar.position.set(x, 2.6, z);
      pillar.castShadow = true;
      this.scene.add(pillar);
    }
    const banner = new THREE.Mesh(new THREE.BoxGeometry(14.5, 0.75, 0.35), mat);
    banner.position.set(0, 5.25, z);
    banner.castShadow = true;
    this.scene.add(banner);
  }

  update(delta) {
    if (!this.running || this.pausedByOverlay) return;

    this.state.elapsed += delta;
    this.state.invulnerable = Math.max(0, this.state.invulnerable - delta);

    const accel = this.keys.has('w') || this.keys.has('arrowup') ? 17 : 7.5;
    const brake = this.keys.has(' ') || this.keys.has('s') || this.keys.has('arrowdown');
    const topSpeed = this.level.hill ? 30 : 34;
    this.state.speed += (brake ? -26 : accel) * delta;
    this.state.speed = clamp(this.state.speed, 4, topSpeed);

    const left = this.keys.has('a') || this.keys.has('arrowleft');
    const right = this.keys.has('d') || this.keys.has('arrowright');
    const slide = this.level.wetRoad ? 0.72 : 1;
    this.state.steer += ((right ? 1 : 0) - (left ? 1 : 0)) * 9 * delta * slide;
    this.state.steer *= this.level.wetRoad ? 0.93 : 0.86;

    this.player.position.x = clamp(this.player.position.x + this.state.steer * delta * 6.2, -6.7, 6.7);
    this.player.position.z -= this.state.speed * delta;
    this.player.rotation.z = -this.state.steer * 0.08;
    this.player.rotation.y = -this.state.steer * 0.025;
    this.playerBody.setNextKinematicTranslation(this.player.position);

    this.animateEntities(delta);
    this.checkPickups();
    this.checkCollisions();
    this.checkEndState();

    this.world.step();
    this.updateCamera(delta);
    this.renderHud();
  }

  animateEntities(delta) {
    for (const entity of this.entities) {
      if (entity.type === 'cyclist') {
        entity.mesh.position.x += Math.sin(this.state.elapsed * 2.2 + entity.wobble) * delta * 0.65;
        entity.body.setTranslation(entity.mesh.position, true);
      }
      if (entity.type === 'cow') {
        entity.mesh.rotation.y = Math.sin(this.state.elapsed * 1.6 + entity.wobble) * 0.18;
      }
    }
    for (const pickup of this.pickups) {
      if (!pickup.collected) {
        pickup.mesh.rotation.y += delta * 1.8;
        pickup.mesh.position.y = Math.sin(this.state.elapsed * 4 + pickup.z) * 0.08;
      }
    }
  }

  checkPickups() {
    for (const pickup of this.pickups) {
      if (pickup.collected) continue;
      const dx = Math.abs(this.player.position.x - pickup.mesh.position.x);
      const dz = Math.abs(this.player.position.z - pickup.mesh.position.z);
      if (dx < 1.8 && dz < 2.4) {
        pickup.collected = true;
        pickup.mesh.visible = false;
        this.state.passengers += 1;
        this.state.score += pickup.value;
      }
    }
  }

  checkCollisions() {
    if (this.state.invulnerable > 0) return;
    for (const entity of this.entities) {
      if (entity.hit) continue;
      const dx = Math.abs(this.player.position.x - entity.mesh.position.x);
      const dz = Math.abs(this.player.position.z - entity.mesh.position.z);
      if (dx < 1.9 && dz < 2.45) {
        entity.hit = true;
        this.state.hearts -= entity.penalty;
        this.state.score = Math.max(0, this.state.score - entity.penalty * 90);
        this.state.speed = Math.max(5, this.state.speed * 0.45);
        this.state.invulnerable = 1.2;
        this.player.scale.set(1.08, 0.92, 1.08);
        window.setTimeout(() => this.player.scale.set(1, 1, 1), 110);
        break;
      }
    }
  }

  checkEndState() {
    if (this.state.finished) return;
    const outOfTime = this.state.elapsed >= this.level.timeLimit;
    const busted = this.state.hearts <= 0;
    const reachedFinish = this.player.position.z <= -this.level.length;

    if (reachedFinish && this.state.passengers >= this.level.passengerGoal) {
      this.state.finished = true;
      this.state.score += Math.round((this.level.timeLimit - this.state.elapsed) * 10);
      if (this.levelIndex < LEVELS.length - 1) {
        this.showOverlay(`Route cleared. Maya keeps the meter running into ${LEVELS[this.levelIndex + 1].district}.`, 'Next route', () => this.loadLevel(this.levelIndex + 1));
      } else {
        this.showOverlay('Permit saved. Maya becomes the fastest honest tempo driver in the valley.', 'Play again', () => this.loadLevel(0));
      }
    } else if (reachedFinish || outOfTime || busted) {
      this.state.finished = true;
      const reason = busted ? 'The tempo took too many hits.' : outOfTime ? 'The clock ran out in traffic.' : 'You reached the stop without enough passengers.';
      this.showOverlay(`${reason} Try the route again and keep the fares moving.`, 'Retry route', () => this.loadLevel(this.levelIndex));
    }
  }

  updateCamera(delta) {
    const target = new THREE.Vector3(this.player.position.x * 0.38, 8.6, this.player.position.z + 15.5);
    this.camera.position.lerp(target, 1 - Math.pow(0.001, delta));
    this.camera.lookAt(this.player.position.x * 0.2, 1.4, this.player.position.z - 18);
  }

  renderHud() {
    const progress = clamp(Math.abs(this.player.position.z - 12) / (this.level.length + 12), 0, 1);
    this.ui.score.textContent = Math.round(this.state.score).toString();
    this.ui.passengers.textContent = `${this.state.passengers}/${this.level.passengerGoal}`;
    this.ui.time.textContent = Math.max(0, Math.ceil(this.level.timeLimit - this.state.elapsed)).toString();
    this.ui.hearts.textContent = Math.max(0, this.state.hearts).toString();
    this.ui.progressBar.style.width = `${progress * 100}%`;
  }

  updateRouteUi() {
    this.ui.levelName.textContent = this.level.district;
    this.ui.routeTitle.textContent = this.level.name;
    this.ui.routeStory.textContent = this.level.story;
    this.ui.levelIndex.textContent = `${this.levelIndex + 1}/${LEVELS.length}`;
  }

  showIntro() {
    this.showOverlay(this.level.story, this.levelIndex === 0 ? 'Start route' : 'Drive route', () => {
      this.ui.overlay.classList.add('hidden');
      this.pausedByOverlay = false;
      this.running = true;
      this.clock.getDelta();
    });
  }

  showOverlay(text, buttonLabel, action) {
    this.running = false;
    this.pausedByOverlay = true;
    this.ui.overlayText.textContent = text;
    this.ui.startButton.textContent = buttonLabel;
    this.ui.startButton.onclick = action;
    this.ui.overlay.classList.remove('hidden');
  }

  resize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  }

  animate() {
    requestAnimationFrame(() => this.animate());
    const delta = Math.min(this.clock.getDelta(), 0.033);
    this.update(delta);
    this.renderer.render(this.scene, this.camera);
  }
}
