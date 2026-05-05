import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { LEVELS, LANES } from './levels.js';
import {
  createLandmark,
  createObstacle,
  createPassenger as createPassengerMesh,
  createPassengerAccessories,
  createPoliceAccessories,
  createPrayerFlags,
  createRoadHazard,
  createShopSign,
  createStreetProp,
  createStreetStall,
  createTempo
} from './visuals.js';
import { modelLibrary } from './modelLoader.js';

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const rand = (min, max) => min + Math.random() * (max - min);
const choice = (items) => items[Math.floor(Math.random() * items.length)];
const obstacleNames = {
  car: 'traffic',
  cow: 'cow',
  cyclist: 'cyclist',
  police: 'traffic police'
};
const passengerBarks = [
  'Asan samma, dai!',
  'Bistarai hai, hajur.',
  'School pugnu cha, chito!',
  'Momo pasal agadi rokdinus.',
  'Ratna Park jane ho?',
  'Jam cha, horn bajau!',
  'Didi, yo side ma rokdinus.',
  'Dhanyabad, Maya didi!'
];
const progressKey = 'kathmandu-chaos-progress-v1';
const upgradeConfig = {
  battery: { base: 72, step: 8, cost: 550 },
  brakes: { base: 64, step: 9, cost: 450 },
  handling: { base: 68, step: 8, cost: 500 }
};

export class KathmanduChaos {
  constructor({ canvas, ui }) {
    this.canvas = canvas;
    this.ui = ui;
    this.levelIndex = 0;
    this.keys = new Set();
    this.clock = new THREE.Clock();
    this.entities = [];
    this.pickups = [];
    this.hazards = [];
    this.effects = [];
    this.running = false;
    this.pausedByOverlay = true;
    this.audio = null;
    this.feedbackTimer = 0;
    this.passengerBarkTimer = 0;
    this.shake = 0;
    this.selectedRoute = 0;
    this.progress = this.loadProgress();
    this.audioMuted = this.progress.audioMuted;
    this.audioVolume = this.progress.audioVolume;
    this.nextMusicTime = 0;
    this.musicStep = 0;
    this.paused = false;
    this.touchInput = {
      left: false,
      right: false,
      accelerate: false,
      brake: false
    };
    this.modelManifest = { enabled: false, passengers: [], police: '' };
  }

  async boot() {
    await RAPIER.init();
    await this.loadModelManifest();
    this.setupRenderer();
    this.setupInput();
    this.setupTouchControls();
    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.setupGarage();
    this.loadLevel(0, { showIntro: false });
    this.showGarage();
    this.animate();
  }

  async loadModelManifest() {
    try {
      const response = await fetch('/models/manifest.json', { cache: 'no-store' });
      if (!response.ok) return;
      const manifest = await response.json();
      this.modelManifest = {
        enabled: Boolean(manifest.enabled),
        passengers: Array.isArray(manifest.passengers) ? manifest.passengers.filter(Boolean) : [],
        police: manifest.police || '',
        scale: manifest.scale ?? {}
      };
    } catch {
      this.modelManifest = { enabled: false, passengers: [], police: '' };
    }
  }

  loadProgress() {
    try {
      const saved = JSON.parse(window.localStorage.getItem(progressKey));
      return {
        unlocked: clamp(Number(saved?.unlocked ?? 0), 0, LEVELS.length - 1),
        bestScores: saved?.bestScores ?? {},
        wallet: Math.max(0, Number(saved?.wallet ?? 0)),
        upgrades: {
          battery: clamp(Number(saved?.upgrades?.battery ?? 0), 0, 3),
          brakes: clamp(Number(saved?.upgrades?.brakes ?? 0), 0, 3),
          handling: clamp(Number(saved?.upgrades?.handling ?? 0), 0, 3)
        },
        audioMuted: Boolean(saved?.audioMuted),
        audioVolume: clamp(Number(saved?.audioVolume ?? 0.8), 0, 1)
      };
    } catch {
      return { unlocked: 0, bestScores: {}, wallet: 0, upgrades: { battery: 0, brakes: 0, handling: 0 }, audioMuted: false, audioVolume: 0.8 };
    }
  }

  saveProgress() {
    window.localStorage.setItem(progressKey, JSON.stringify(this.progress));
  }

  setupGarage() {
    this.ui.garageStart?.addEventListener('click', () => this.startSelectedRoute());
    this.ui.audioToggle?.addEventListener('click', () => this.toggleAudio());
    this.ui.pauseAudioToggle?.addEventListener('click', () => this.toggleAudio());
    this.ui.volumeSlider?.addEventListener('input', (event) => this.setAudioVolume(Number(event.target.value) / 100));
    this.ui.pauseVolumeSlider?.addEventListener('input', (event) => this.setAudioVolume(Number(event.target.value) / 100));
    this.ui.resetProgress?.addEventListener('click', () => this.confirmResetProgress());
    this.ui.resumeButton?.addEventListener('click', () => this.resumeGame());
    this.ui.restartButton?.addEventListener('click', () => this.startRoute(this.levelIndex));
    this.ui.garageButton?.addEventListener('click', () => this.showGarage());
    this.ui.resultsRetry?.addEventListener('click', () => this.startRoute(this.levelIndex));
    this.ui.resultsGarage?.addEventListener('click', () => this.showGarage());
    [this.ui.batteryUpgrade, this.ui.brakesUpgrade, this.ui.handlingUpgrade].forEach((button) => {
      button?.addEventListener('click', () => this.buyUpgrade(button.dataset.upgrade));
    });
    this.ui.garageRoutes?.addEventListener('click', (event) => {
      const card = event.target.closest('[data-route-index]');
      if (!card) return;
      const index = Number(card.dataset.routeIndex);
      if (index > this.progress.unlocked) {
        this.selectRoute(this.progress.unlocked);
        return;
      }
      this.selectRoute(index);
    });
  }

  showGarage() {
    this.running = false;
    this.pausedByOverlay = true;
    this.paused = false;
    this.ui.overlay.classList.add('hidden');
    this.ui.pauseMenu?.classList.add('hidden');
    this.ui.resultsMenu?.classList.add('hidden');
    this.ui.garage.classList.remove('hidden');
    this.selectRoute(Math.min(this.selectedRoute, this.progress.unlocked));
    this.renderGarage();
  }

  hideGarage() {
    this.ui.garage.classList.add('hidden');
  }

  selectRoute(index) {
    this.selectedRoute = clamp(index, 0, this.progress.unlocked);
    this.renderGarage();
  }

  startSelectedRoute() {
    this.startRoute(this.selectedRoute);
  }

  startRoute(index) {
    this.selectedRoute = clamp(index, 0, this.progress.unlocked);
    this.ensureAudio();
    this.hideGarage();
    this.ui.pauseMenu?.classList.add('hidden');
    this.ui.resultsMenu?.classList.add('hidden');
    this.loadLevel(this.selectedRoute, { showIntro: false });
    this.pausedByOverlay = false;
    this.paused = false;
    this.running = true;
    if (this.audio) this.nextMusicTime = this.audio.ctx.currentTime + 0.1;
    this.clock.getDelta();
  }

  renderGarage() {
    if (!this.ui.garageRoutes) return;
    this.ui.garageWallet.textContent = this.progress.wallet.toString();
    this.ui.garageRoutes.innerHTML = LEVELS.map((level, index) => {
      const locked = index > this.progress.unlocked;
      const selected = index === this.selectedRoute;
      const best = this.progress.bestScores[index] ?? 0;
      return `
        <button class="route-option${selected ? ' selected' : ''}${locked ? ' locked' : ''}" data-route-index="${index}" type="button">
          <span>${index + 1}</span>
          <strong>${level.name}</strong>
          <small>${locked ? 'Locked' : best ? `Best fare ${best}` : level.district}</small>
        </button>
      `;
    }).join('');

    const level = LEVELS[this.selectedRoute];
    const best = this.progress.bestScores[this.selectedRoute] ?? 0;
    this.ui.garageRouteName.textContent = level.name;
    this.ui.garageRouteStory.textContent = level.story;
    this.ui.garagePassengers.textContent = level.passengerGoal.toString();
    this.ui.garageTime.textContent = level.timeLimit.toString();
    this.ui.garageBest.textContent = best.toString();
    this.renderUpgradeUi();
    this.renderAudioButtons();
    this.ui.garageHint.textContent = this.selectedRoute === this.progress.unlocked && this.progress.unlocked < LEVELS.length - 1
      ? `Clear this route to unlock ${LEVELS[this.progress.unlocked + 1].name}.`
      : 'Replay cleared routes to improve your best fare.';
  }

  renderUpgradeUi() {
    for (const key of Object.keys(upgradeConfig)) {
      const level = this.progress.upgrades[key];
      const percent = upgradeConfig[key].base + level * upgradeConfig[key].step;
      this.ui[`${key}Bar`].style.setProperty('--value', `${percent}%`);
      const button = this.ui[`${key}Upgrade`];
      const cost = this.getUpgradeCost(key);
      button.textContent = level >= 3 ? `${this.labelUpgrade(key)} max` : `${this.labelUpgrade(key)} ${cost}`;
      button.disabled = level >= 3 || this.progress.wallet < cost;
    }
  }

  labelUpgrade(key) {
    return key.charAt(0).toUpperCase() + key.slice(1);
  }

  getUpgradeCost(key) {
    return upgradeConfig[key].cost * (this.progress.upgrades[key] + 1);
  }

  buyUpgrade(key) {
    if (!upgradeConfig[key] || this.progress.upgrades[key] >= 3) return;
    const cost = this.getUpgradeCost(key);
    if (this.progress.wallet < cost) {
      this.ui.garageHint.textContent = `Need ${cost} fare for ${this.labelUpgrade(key)}.`;
      return;
    }
    this.progress.wallet -= cost;
    this.progress.upgrades[key] += 1;
    this.saveProgress();
    this.ui.garageHint.textContent = `${this.labelUpgrade(key)} upgraded. The tempo will feel better on the next route.`;
    this.renderGarage();
  }

  confirmResetProgress() {
    const confirmed = window.confirm('Reset unlocked routes, best fares, upgrades, and fare bank?');
    if (!confirmed) return;
    this.progress = { unlocked: 0, bestScores: {}, wallet: 0, upgrades: { battery: 0, brakes: 0, handling: 0 }, audioMuted: this.audioMuted, audioVolume: this.audioVolume };
    this.selectedRoute = 0;
    this.saveProgress();
    this.loadLevel(0, { showIntro: false });
    this.showGarage();
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
      if (event.key === 'Escape' || event.key.toLowerCase() === 'p') {
        event.preventDefault();
        this.togglePause();
        return;
      }
      if (event.key.toLowerCase() === 'h' && !event.repeat) {
        event.preventDefault();
        this.ensureAudio();
        this.playHorn();
        return;
      }
      this.keys.add(event.key.toLowerCase());
    });
    window.addEventListener('keyup', (event) => this.keys.delete(event.key.toLowerCase()));
  }

  setupTouchControls() {
    const bindHold = (button, key) => {
      if (!button) return;
      const setActive = (active, event) => {
        event.preventDefault();
        this.touchInput[key] = active;
        button.classList.toggle('active', active);
        if (active) button.setPointerCapture?.(event.pointerId);
      };
      button.addEventListener('pointerdown', (event) => setActive(true, event));
      button.addEventListener('pointerup', (event) => setActive(false, event));
      button.addEventListener('pointercancel', (event) => setActive(false, event));
      button.addEventListener('lostpointercapture', () => {
        this.touchInput[key] = false;
        button.classList.remove('active');
      });
    };

    bindHold(this.ui.touchLeft, 'left');
    bindHold(this.ui.touchRight, 'right');
    bindHold(this.ui.touchAccelerate, 'accelerate');
    bindHold(this.ui.touchBrake, 'brake');
    this.ui.touchPause?.addEventListener('click', (event) => {
      event.preventDefault();
      this.togglePause();
    });
    this.ui.touchHorn?.addEventListener('click', (event) => {
      event.preventDefault();
      this.ensureAudio();
      this.playHorn();
    });
  }

  togglePause() {
    if (this.ui.garage && !this.ui.garage.classList.contains('hidden')) return;
    if (this.ui.overlay && !this.ui.overlay.classList.contains('hidden')) return;
    if (!this.running && !this.paused) return;
    if (this.paused) {
      this.resumeGame();
    } else {
      this.pauseGame();
    }
  }

  pauseGame() {
    this.paused = true;
    this.running = false;
    this.pausedByOverlay = true;
    this.ui.pauseMenu?.classList.remove('hidden');
    this.renderAudioButtons();
  }

  resumeGame() {
    this.paused = false;
    this.pausedByOverlay = false;
    this.running = true;
    this.ui.pauseMenu?.classList.add('hidden');
    this.clock.getDelta();
  }

  startFromOverlay() {
    this.ensureAudio();
    this.ui.overlay.classList.add('hidden');
    this.pausedByOverlay = false;
    this.running = true;
    this.clock.getDelta();
  }

  ensureAudio() {
    if (this.audio) {
      this.audio.ctx.resume?.();
      return;
    }
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const master = ctx.createGain();
    const sfx = ctx.createGain();
    const ambience = ctx.createGain();
    const music = ctx.createGain();
    const motor = ctx.createGain();
    master.gain.value = this.audioMuted ? 0 : this.audioVolume;
    sfx.gain.value = 0.24;
    ambience.gain.value = 0.16;
    music.gain.value = 0;
    motor.gain.value = 0;
    sfx.connect(master);
    ambience.connect(master);
    music.connect(master);
    motor.connect(master);
    master.connect(ctx.destination);
    this.audio = { ctx, master, sfx, ambience, music, motor };
    this.startAmbience();
    this.startMotor();
    this.nextMusicTime = ctx.currentTime + 0.12;
  }

  toggleAudio() {
    this.audioMuted = !this.audioMuted;
    this.progress.audioMuted = this.audioMuted;
    if (this.audio) this.audio.master.gain.value = this.audioMuted ? 0 : this.audioVolume;
    this.saveProgress();
    this.renderAudioButtons();
  }

  setAudioVolume(value) {
    this.audioVolume = clamp(value, 0, 1);
    this.progress.audioVolume = this.audioVolume;
    if (this.audio && !this.audioMuted) this.audio.master.gain.value = this.audioVolume;
    this.saveProgress();
    this.renderAudioButtons();
  }

  renderAudioButtons() {
    const label = this.audioMuted ? 'Audio off' : 'Audio on';
    if (this.ui.audioToggle) this.ui.audioToggle.textContent = label;
    if (this.ui.pauseAudioToggle) this.ui.pauseAudioToggle.textContent = label;
    const sliderValue = Math.round(this.audioVolume * 100).toString();
    if (this.ui.volumeSlider) this.ui.volumeSlider.value = sliderValue;
    if (this.ui.pauseVolumeSlider) this.ui.pauseVolumeSlider.value = sliderValue;
  }

  playTone(frequency, duration = 0.12, type = 'sine', gain = 0.3, when = 0, destination = null) {
    if (!this.audio) return;
    const { ctx } = this.audio;
    const start = ctx.currentTime + when;
    const osc = ctx.createOscillator();
    const amp = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, start);
    amp.gain.setValueAtTime(0.0001, start);
    amp.gain.exponentialRampToValueAtTime(gain, start + 0.015);
    amp.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(amp);
    amp.connect(destination ?? this.audio.sfx);
    osc.start(start);
    osc.stop(start + duration + 0.04);
  }

  playNoise(duration = 0.18, gain = 0.16) {
    if (!this.audio) return;
    const { ctx } = this.audio;
    const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * duration), ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
    const source = ctx.createBufferSource();
    const filter = ctx.createBiquadFilter();
    const amp = ctx.createGain();
    filter.type = 'lowpass';
    filter.frequency.value = 260;
    amp.gain.setValueAtTime(gain, ctx.currentTime);
    amp.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
    source.buffer = buffer;
    source.connect(filter);
    filter.connect(amp);
    amp.connect(this.audio.sfx);
    source.start();
  }

  startAmbience() {
    if (!this.audio || this.audio.ambienceSource) return;
    const { ctx, ambience } = this.audio;
    const duration = 2;
    const buffer = ctx.createBuffer(1, ctx.sampleRate * duration, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < data.length; i += 1) {
      last = last * 0.985 + (Math.random() * 2 - 1) * 0.015;
      data[i] = last;
    }
    const source = ctx.createBufferSource();
    const lowpass = ctx.createBiquadFilter();
    const highpass = ctx.createBiquadFilter();
    source.buffer = buffer;
    source.loop = true;
    lowpass.type = 'lowpass';
    lowpass.frequency.value = 900;
    highpass.type = 'highpass';
    highpass.frequency.value = 90;
    source.connect(lowpass);
    lowpass.connect(highpass);
    highpass.connect(ambience);
    source.start();
    this.audio.ambienceSource = source;
  }

  startMotor() {
    if (!this.audio || this.audio.motorOsc) return;
    const { ctx, motor } = this.audio;
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    osc.type = 'sawtooth';
    osc.frequency.value = 70;
    filter.type = 'lowpass';
    filter.frequency.value = 220;
    osc.connect(filter);
    filter.connect(motor);
    osc.start();
    this.audio.motorOsc = osc;
    this.audio.motorFilter = filter;
  }

  updateAudio(delta) {
    if (!this.audio) return;
    const { ctx, motor, music, motorOsc, motorFilter } = this.audio;
    const active = this.running && !this.pausedByOverlay;
    const motorGain = active ? clamp(0.025 + this.state.speed / 900, 0.02, 0.075) : 0;
    motor.gain.setTargetAtTime(motorGain, ctx.currentTime, 0.08);
    music.gain.setTargetAtTime(active ? 0.07 : 0, ctx.currentTime, 0.25);
    if (motorOsc) motorOsc.frequency.setTargetAtTime(62 + this.state.speed * 6.5, ctx.currentTime, 0.06);
    if (motorFilter) motorFilter.frequency.setTargetAtTime(190 + this.state.speed * 13, ctx.currentTime, 0.08);
    if (active) this.scheduleMusic(delta);
  }

  scheduleMusic() {
    if (!this.audio) return;
    const { ctx, music } = this.audio;
    const notes = [220, 277.18, 329.63, 392, 329.63, 277.18, 246.94, 293.66];
    while (this.nextMusicTime < ctx.currentTime + 0.35) {
      const note = notes[this.musicStep % notes.length];
      const accent = this.musicStep % 4 === 0 ? 0.07 : 0.045;
      this.playTone(note, 0.16, 'triangle', accent, this.nextMusicTime - ctx.currentTime, music);
      if (this.musicStep % 4 === 0) this.playTone(note / 2, 0.22, 'sine', 0.045, this.nextMusicTime - ctx.currentTime, music);
      this.musicStep += 1;
      this.nextMusicTime += 0.32;
    }
  }

  playHorn() {
    if (!this.audio) return;
    this.playTone(392, 0.18, 'square', 0.18);
    this.playTone(466.16, 0.2, 'square', 0.16, 0.04);
    this.showFeedback('Horn!', 'good');
  }

  playPickupSound() {
    this.playTone(660, 0.08, 'triangle', 0.22);
    this.playTone(990, 0.12, 'triangle', 0.2, 0.08);
  }

  playPassengerBarkSound(index = 0) {
    const base = 280 + (index % 4) * 34;
    this.playTone(base, 0.055, 'triangle', 0.07);
    this.playTone(base + 90, 0.065, 'triangle', 0.06, 0.07);
    this.playTone(base + 38, 0.055, 'triangle', 0.05, 0.15);
  }

  playHitSound(type) {
    if (type === 'police') {
      this.playTone(1400, 0.11, 'square', 0.16);
      this.playTone(1750, 0.11, 'square', 0.14, 0.12);
    } else {
      this.playNoise(0.2, 0.18);
      this.playTone(110, 0.18, 'sawtooth', 0.12);
    }
  }

  loadLevel(index, options = {}) {
    const { showIntro = true } = options;
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
      pickupAssist: 0,
      passengerFare: 0,
      combo: 1,
      comboTimer: 0,
      comboBonus: 0,
      maxCombo: 1,
      collisionPenalty: 0,
      collisions: 0,
      finished: false
    };

    this.scene.clear();
    this.world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
    this.entities = [];
    this.pickups = [];
    this.hazards = [];
    this.effects = [];
    this.spawnedSlots = [];
    this.shake = 0;
    this.feedbackTimer = 0;
    this.passengerBarkTimer = 0;

    this.buildWorld();
    this.buildPlayer();
    this.populateRoute();
    this.updateRouteUi();
    this.renderHud();
    if (showIntro) this.showIntro();
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
    this.addRouteDressing();
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
    const shopLabels = this.level.signs ?? ['Chiya', 'Momo', 'Yatayat'];
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

        if (Math.random() > 0.38) {
          const sign = createShopSign(choice(shopLabels), this.level.palette.accent);
          sign.position.set(building.position.x - side * (width / 2 + 0.08), Math.min(height - 0.45, 2.5), building.position.z);
          sign.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;
          this.scene.add(sign);
        }

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

  addRouteDressing() {
    const stallLabels = this.level.signs ?? ['Momo', 'Chiya'];
    for (let z = -80; z > -this.level.length; z -= 140) {
      const side = Math.random() > 0.5 ? 1 : -1;
      const stall = createStreetStall(choice(stallLabels));
      stall.position.set(side * rand(11.5, 14.5), 0, z + rand(-20, 20));
      stall.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;
      this.scene.add(stall);
    }

    for (let z = -110; z > -this.level.length; z -= 180) {
      const flags = createPrayerFlags(rand(5, 8));
      flags.position.set(0, rand(5.4, 7.2), z);
      flags.rotation.y = rand(-0.25, 0.25);
      this.scene.add(flags);
    }

    const landmarkPositions = [-this.level.length * 0.34, -this.level.length * 0.68];
    for (const [index, z] of landmarkPositions.entries()) {
      const side = index % 2 === 0 ? 1 : -1;
      const landmark = createLandmark(this.level.theme, this.level.palette.accent);
      landmark.position.set(side * 23, 0, z);
      landmark.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;
      landmark.scale.setScalar(index === 0 ? 1 : 0.82);
      this.scene.add(landmark);
    }

    this.addStreetProps();
  }

  getRoutePropTypes() {
    const shared = ['busStop', 'shutter', 'bricks', 'barrier'];
    if (this.level.theme === 'stupa') return ['prayerWheels', 'shrine', 'busStop', 'shutter'];
    if (this.level.theme === 'durbar') return ['shrine', 'bricks', 'shutter', 'barrier'];
    if (this.level.theme === 'monsoon') return ['puddle', 'busStop', 'barrier', 'shutter'];
    if (this.level.theme === 'swayambhu') return ['prayerWheels', 'shrine', 'bricks', 'busStop'];
    return shared;
  }

  addStreetProps() {
    const propTypes = this.getRoutePropTypes();
    const labels = this.level.signs ?? ['Chiya', 'Momo'];
    for (let z = -45; z > -this.level.length; z -= 58) {
      for (const side of [-1, 1]) {
        if (Math.random() < 0.18) continue;
        const type = choice(propTypes);
        const prop = createStreetProp(type, { accent: this.level.palette.accent, label: choice(labels) });
        const x = side * (type === 'puddle' ? rand(8.9, 10.3) : rand(10.8, 14.6));
        prop.position.set(x, 0, z + rand(-12, 12));
        prop.rotation.y = side > 0 ? -Math.PI / 2 + rand(-0.08, 0.08) : Math.PI / 2 + rand(-0.08, 0.08);
        if (type === 'puddle') prop.scale.setScalar(rand(0.75, 1.15));
        if (type === 'bricks' || type === 'barrier') prop.scale.setScalar(rand(0.85, 1.25));
        this.scene.add(prop);
      }
    }

    for (let z = -135; z > -this.level.length; z -= 215) {
      const wires = createStreetProp('wires', { accent: this.level.palette.accent });
      wires.position.set(0, 0, z + rand(-18, 18));
      this.scene.add(wires);
    }
  }

  buildPlayer() {
    this.player = createTempo(this.level.routeBoard);
    this.player.position.set(0, 0.9, 12);
    this.scene.add(this.player);

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
    this.addHazards();
    this.addFinishGate();
    this.renderMinimapMarkers();
  }

  addPassengers() {
    const spacing = this.level.length / (this.level.passengerGoal + 1);
    for (let i = 0; i < this.level.passengerGoal + 2; i += 1) {
      const lane = choice([LANES[0], LANES[4]]);
      const z = -spacing * (i + 0.75) + rand(-12, 12);
      const passenger = this.createPassenger(lane, z, i);
      this.pickups.push({ mesh: passenger, collected: false, z, x: lane, index: i, value: 120 + i * 15 });
      this.spawnedSlots.push({ x: lane, z, radius: 10 });
    }
  }

  createPassenger(x, z, index) {
    const group = createPassengerMesh(index);
    group.position.set(x, 0, z);
    this.scene.add(group);
    this.attachPassengerModel(group, index);
    return group;
  }

  async attachPassengerModel(group, index) {
    if (!this.modelManifest.enabled || this.modelManifest.passengers.length === 0) return;
    const path = this.modelManifest.passengers[index % this.modelManifest.passengers.length];
    try {
      const model = await modelLibrary.cloneScene(path);
      if (!group.parent || group.visible === false) return;
      model.name = 'externalPassengerModel';
      model.scale.setScalar(this.modelManifest.scale?.passenger ?? 0.72);
      model.position.set(0, 0, 0);
      group.children
        .filter((child) => child.name !== 'pickupMarker')
        .forEach((child) => {
          child.visible = false;
        });
      group.add(model);
      group.add(createPassengerAccessories(index));
    } catch (error) {
      console.warn(`Could not load passenger model: ${path}`, error);
    }
  }

  addObstacles(type, count) {
    const start = -55;
    const end = -this.level.length + 60;
    for (let i = 0; i < count; i += 1) {
      const { x, z } = this.findObstacleSlot(start, end, type);
      const mesh = this.createObstacleMesh(type);
      mesh.position.set(x, 0.6, z);
      this.scene.add(mesh);

      const rb = this.world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(x, 0.6, z));
      const half = type === 'cyclist' ? [0.55, 0.9, 0.9] : type === 'cow' ? [0.9, 0.65, 1.25] : [1.1, 0.75, 1.6];
      this.world.createCollider(RAPIER.ColliderDesc.cuboid(...half), rb);
      this.entities.push({ type, mesh, body: rb, x, z, hit: false, wobble: rand(0, Math.PI * 2), penalty: type === 'police' ? 2 : 1 });
      this.spawnedSlots.push({ x, z, radius: type === 'police' ? 13 : 9 });
    }
  }

  findObstacleSlot(start, end, type) {
    const minGap = type === 'police' ? 15 : 10;
    for (let attempt = 0; attempt < 80; attempt += 1) {
      const z = rand(start, end);
      const lanePool = type === 'cow' ? LANES : LANES.slice(1, -1);
      const x = choice(lanePool);
      const blocked = this.spawnedSlots.some((slot) => Math.abs(slot.z - z) < slot.radius + minGap && Math.abs(slot.x - x) < 1.8);
      const nearPassenger = this.pickups.some((pickup) => Math.abs(pickup.z - z) < 16 && Math.abs(pickup.x - x) < 3.1);
      if (!blocked && !nearPassenger) return { x, z };
    }
    return { x: choice(LANES.slice(1, -1)), z: rand(start, end) };
  }

  createObstacleMesh(type) {
    const mesh = createObstacle(type);
    if (type === 'police') this.attachPoliceModel(mesh);
    return mesh;
  }

  addHazards() {
    const hazards = this.level.hazards ?? {};
    this.addHazardType('pothole', hazards.potholes ?? 0);
    this.addHazardType('puddle', hazards.puddles ?? 0);
    this.addHazardType('barrier', hazards.barriers ?? 0);
  }

  addHazardType(type, count) {
    const start = -70;
    const end = -this.level.length + 70;
    for (let i = 0; i < count; i += 1) {
      const { x, z } = this.findHazardSlot(start, end, type);
      const mesh = createRoadHazard(type, this.level.palette.accent);
      mesh.position.set(x, type === 'barrier' ? 0.02 : 0.04, z);
      mesh.rotation.y = rand(-0.25, 0.25);
      if (type === 'pothole') mesh.scale.setScalar(rand(0.82, 1.28));
      if (type === 'puddle') mesh.scale.set(rand(0.85, 1.35), 1, rand(0.72, 1.1));
      this.scene.add(mesh);
      this.hazards.push({ type, mesh, x, z, hit: false, cooldown: 0 });
      this.spawnedSlots.push({ x, z, radius: type === 'barrier' ? 9 : 6 });
    }
  }

  findHazardSlot(start, end, type) {
    const minGap = type === 'barrier' ? 13 : 8;
    for (let attempt = 0; attempt < 80; attempt += 1) {
      const z = rand(start, end);
      const lanePool = type === 'puddle' ? LANES : LANES.slice(1, -1);
      const x = choice(lanePool);
      const blocked = this.spawnedSlots.some((slot) => Math.abs(slot.z - z) < slot.radius + minGap && Math.abs(slot.x - x) < 2.4);
      const nearPassenger = this.pickups.some((pickup) => Math.abs(pickup.z - z) < 18 && Math.abs(pickup.x - x) < 3.3);
      if (!blocked && !nearPassenger) return { x, z };
    }
    return { x: choice(LANES.slice(1, -1)), z: rand(start, end) };
  }

  async attachPoliceModel(group) {
    if (!this.modelManifest.enabled || !this.modelManifest.police) return;
    try {
      const model = await modelLibrary.cloneScene(this.modelManifest.police);
      if (!group.parent) return;
      model.name = 'externalPoliceModel';
      model.scale.setScalar(this.modelManifest.scale?.police ?? 0.78);
      model.position.set(0, -0.55, 0);
      group.children.forEach((child) => {
        child.visible = false;
      });
      group.add(model);
      group.add(createPoliceAccessories());
    } catch (error) {
      console.warn(`Could not load police model: ${this.modelManifest.police}`, error);
    }
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
    this.feedbackTimer = Math.max(0, this.feedbackTimer - delta);
    this.passengerBarkTimer = Math.max(0, this.passengerBarkTimer - delta);
    this.state.comboTimer = Math.max(0, this.state.comboTimer - delta);
    if (this.state.comboTimer <= 0 && this.state.combo > 1) {
      this.state.combo = 1;
    }
    this.shake = Math.max(0, this.shake - delta);

    const nearbyPickup = this.getNearbyPickup();
    this.state.pickupAssist = nearbyPickup ? 1 : Math.max(0, this.state.pickupAssist - delta * 2.4);

    const batteryBoost = this.progress.upgrades.battery * 1.7;
    const brakeBoost = this.progress.upgrades.brakes * 3.4;
    const handlingBoost = this.progress.upgrades.handling * 0.7;
    const accelerating = this.keys.has('w') || this.keys.has('arrowup') || this.touchInput.accelerate;
    const brake = this.keys.has(' ') || this.keys.has('s') || this.keys.has('arrowdown') || this.touchInput.brake;
    const accel = accelerating ? 18.5 + batteryBoost : 6.8 + batteryBoost * 0.35;
    const baseTopSpeed = (this.level.hill ? 30 : 35) + this.progress.upgrades.battery * 2.2;
    const topSpeed = nearbyPickup ? Math.min(baseTopSpeed, 16) : baseTopSpeed;
    this.state.speed += (brake ? -30 - brakeBoost : accel) * delta;
    this.state.speed -= this.state.speed * (this.level.wetRoad ? 0.07 : 0.045) * delta;
    this.state.speed = clamp(this.state.speed, 4, topSpeed);

    const left = this.keys.has('a') || this.keys.has('arrowleft') || this.touchInput.left;
    const right = this.keys.has('d') || this.keys.has('arrowright') || this.touchInput.right;
    const slide = this.level.wetRoad ? 0.82 : 1;
    this.state.steer += ((right ? 1 : 0) - (left ? 1 : 0)) * (9.6 + handlingBoost) * delta * slide;
    this.state.steer *= this.level.wetRoad ? 0.94 : 0.84;

    this.player.position.x = clamp(this.player.position.x + this.state.steer * delta * 6.2, -6.7, 6.7);
    this.player.position.z -= this.state.speed * delta;
    this.player.rotation.z = -this.state.steer * 0.08;
    this.player.rotation.y = -this.state.steer * 0.025;
    this.playerBody.setNextKinematicTranslation(this.player.position);

    this.animateEntities(delta);
    this.checkPickups();
    this.checkHazards(delta);
    this.checkCollisions();
    this.checkEndState();
    this.updateEffects(delta);

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
      if (entity.type === 'police') {
        const signalArm = entity.mesh.getObjectByName('trafficSignalArm');
        if (signalArm) {
          signalArm.rotation.z = -0.72 + Math.sin(this.state.elapsed * 3.4 + entity.wobble) * 0.46;
          signalArm.rotation.x = Math.sin(this.state.elapsed * 2.2 + entity.wobble) * 0.12;
        }
        const baton = entity.mesh.getObjectByName('trafficBaton');
        if (baton) {
          baton.rotation.z = Math.sin(this.state.elapsed * 2.7 + entity.wobble) * 0.18;
        }
      }
    }
    for (const pickup of this.pickups) {
      if (!pickup.collected) {
        pickup.mesh.rotation.y += delta * 1.8;
        pickup.mesh.position.y = Math.sin(this.state.elapsed * 4 + pickup.z) * 0.08;
        const hand = pickup.mesh.getObjectByName('wavingPassengerHand');
        if (hand) {
          const side = hand.position.x >= 0 ? 1 : -1;
          hand.rotation.z = side * (-0.34 + Math.sin(this.state.elapsed * 5.4 + pickup.index) * 0.42);
          hand.rotation.x = Math.sin(this.state.elapsed * 4.2 + pickup.index) * 0.16;
        }
        const marker = pickup.mesh.getObjectByName('pickupMarker');
        if (marker) {
          const pulse = 1 + Math.sin(this.state.elapsed * 5 + pickup.z) * 0.1;
          marker.scale.set(pulse, pulse, pulse);
        }
        const billboard = pickup.mesh.getObjectByName('pickupBillboard');
        if (billboard) {
          billboard.quaternion.copy(this.camera.quaternion);
        }
      }
    }
  }

  getNearbyPickup() {
    return this.pickups.find((pickup) => {
      if (pickup.collected) return false;
      const dx = Math.abs(this.player.position.x - pickup.mesh.position.x);
      const dz = Math.abs(this.player.position.z - pickup.mesh.position.z);
      return dx < 2.4 && dz < 6.2;
    });
  }

  getCurrentTarget() {
    const nextPickup = this.pickups
      .filter((pickup) => !pickup.collected && pickup.mesh.position.z < this.player.position.z + 8)
      .sort((a, b) => b.mesh.position.z - a.mesh.position.z)[0];

    if (this.state.passengers < this.level.passengerGoal && nextPickup) {
      return { label: 'Next passenger', position: nextPickup.mesh.position };
    }
    return { label: 'Finish gate', position: new THREE.Vector3(0, 0, -this.level.length) };
  }

  showFeedback(message, tone = 'good') {
    if (!this.ui.feedback) return;
    this.ui.feedback.textContent = message;
    this.ui.feedback.classList.remove('bad', 'good', 'show');
    this.ui.feedback.classList.add(tone, 'show');
    this.feedbackTimer = 1.2;
  }

  showPassengerBark(message) {
    if (!this.ui.passengerBark || !this.ui.passengerBarkText) return;
    this.ui.passengerBarkText.textContent = message;
    this.ui.passengerBark.classList.remove('show');
    void this.ui.passengerBark.offsetWidth;
    this.ui.passengerBark.classList.add('show');
    this.passengerBarkTimer = 2.25;
  }

  getPassengerBark(pickup) {
    const routeOffset = this.levelIndex * 2;
    return passengerBarks[(pickup.index + routeOffset) % passengerBarks.length];
  }

  awardPickupFare(pickup) {
    const quickPickup = this.state.passengers > 0 && this.state.comboTimer > 0;
    if (quickPickup) {
      this.state.combo = Math.min(5, this.state.combo + 1);
    } else {
      this.state.combo = 1;
    }
    this.state.comboTimer = 8;
    this.state.maxCombo = Math.max(this.state.maxCombo, this.state.combo);

    const comboBonus = this.state.combo > 1 ? Math.round(pickup.value * (this.state.combo - 1) * 0.22) : 0;
    this.state.passengerFare += pickup.value;
    this.state.comboBonus += comboBonus;
    this.state.score += pickup.value + comboBonus;
    return comboBonus;
  }

  resetCombo() {
    this.state.combo = 1;
    this.state.comboTimer = 0;
  }

  flashHit() {
    if (!this.ui.screenFlash) return;
    this.ui.screenFlash.classList.add('hit');
    window.setTimeout(() => this.ui.screenFlash.classList.remove('hit'), 90);
  }

  spawnPickupBurst(position) {
    const group = new THREE.Group();
    const material = new THREE.MeshBasicMaterial({ color: 0xffcf42, transparent: true, opacity: 1 });
    for (let i = 0; i < 10; i += 1) {
      const bit = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), material.clone());
      const angle = (i / 10) * Math.PI * 2;
      bit.position.set(Math.cos(angle) * 0.35, 1.1 + Math.random() * 0.6, Math.sin(angle) * 0.35);
      bit.userData.velocity = new THREE.Vector3(Math.cos(angle) * rand(1.5, 3), rand(1.2, 2.6), Math.sin(angle) * rand(1.5, 3));
      group.add(bit);
    }
    group.position.copy(position);
    this.scene.add(group);
    this.effects.push({ type: 'burst', group, age: 0, duration: 0.6 });
  }

  prepareFadeMaterials(object) {
    object.traverse((child) => {
      if (!child.isMesh || child.userData.fadeReady) return;
      const materials = Array.isArray(child.material) ? child.material : [child.material];
      const cloned = materials.map((material) => {
        const copy = material.clone();
        copy.transparent = true;
        copy.depthWrite = false;
        return copy;
      });
      child.material = Array.isArray(child.material) ? cloned : cloned[0];
      child.userData.fadeReady = true;
    });
  }

  setObjectOpacity(object, opacity) {
    object.traverse((child) => {
      if (!child.isMesh) return;
      const materials = Array.isArray(child.material) ? child.material : [child.material];
      materials.forEach((material) => {
        material.opacity = opacity;
      });
    });
  }

  spawnBoardingEffect(pickup) {
    const marker = pickup.mesh.getObjectByName('pickupMarker');
    if (marker) marker.visible = false;
    pickup.mesh.visible = true;
    this.prepareFadeMaterials(pickup.mesh);
    this.effects.push({
      type: 'boarding',
      group: pickup.mesh,
      age: 0,
      duration: 0.52,
      start: pickup.mesh.position.clone(),
      startScale: pickup.mesh.scale.clone(),
      side: Math.sign(pickup.mesh.position.x - this.player.position.x) || 1,
      targetOffset: new THREE.Vector3(0, 0.95, 0.62)
    });
  }

  updateEffects(delta) {
    for (let i = this.effects.length - 1; i >= 0; i -= 1) {
      const effect = this.effects[i];
      effect.age += delta;
      const life = clamp(1 - effect.age / effect.duration, 0, 1);
      if (effect.type === 'boarding') {
        const t = clamp(effect.age / effect.duration, 0, 1);
        const eased = 1 - (1 - t) ** 3;
        const target = this.player.position.clone().add(effect.targetOffset);
        target.x += effect.side * 0.52;
        effect.group.position.lerpVectors(effect.start, target, eased);
        effect.group.position.y += Math.sin(t * Math.PI) * 1.05;
        effect.group.rotation.y += delta * 7.5;
        effect.group.scale.copy(effect.startScale).multiplyScalar(1 - eased * 0.48);
        this.setObjectOpacity(effect.group, life);
      } else {
        effect.group.children.forEach((child) => {
          child.position.addScaledVector(child.userData.velocity, delta);
          child.userData.velocity.y -= 4.5 * delta;
          child.material.opacity = life;
        });
      }
      if (effect.age >= effect.duration) {
        if (effect.type === 'boarding') {
          effect.group.visible = false;
          effect.group.scale.copy(effect.startScale);
        } else {
          this.scene.remove(effect.group);
        }
        this.effects.splice(i, 1);
      }
    }
  }

  checkPickups() {
    for (const pickup of this.pickups) {
      if (pickup.collected) continue;
      const dx = Math.abs(this.player.position.x - pickup.mesh.position.x);
      const dz = Math.abs(this.player.position.z - pickup.mesh.position.z);
      if (dx < 2.15 && dz < 3.1) {
        pickup.collected = true;
        const comboBonus = this.awardPickupFare(pickup);
        this.state.passengers += 1;
        this.state.speed = Math.max(5, this.state.speed * 0.72);
        this.spawnPickupBurst(pickup.mesh.position);
        this.spawnBoardingEffect(pickup);
        this.playPickupSound();
        this.playPassengerBarkSound(pickup.index);
        this.showPassengerBark(this.getPassengerBark(pickup));
        const comboText = comboBonus > 0 ? ` x${this.state.combo} combo +${comboBonus}` : '';
        this.showFeedback(`Passenger boarded +${pickup.value}${comboText}`, 'good');
      }
    }
  }

  checkHazards(delta) {
    for (const hazard of this.hazards) {
      hazard.cooldown = Math.max(0, hazard.cooldown - delta);
      if (hazard.hit && hazard.type !== 'puddle') continue;
      if (hazard.cooldown > 0) continue;

      const dx = Math.abs(this.player.position.x - hazard.mesh.position.x);
      const dz = Math.abs(this.player.position.z - hazard.mesh.position.z);
      const range = hazard.type === 'barrier' ? { x: 1.9, z: 1.8 } : hazard.type === 'puddle' ? { x: 1.8, z: 2.2 } : { x: 1.55, z: 1.65 };
      if (dx >= range.x || dz >= range.z) continue;

      hazard.cooldown = 1.1;
      if (hazard.type === 'barrier') {
        hazard.hit = true;
        this.state.hearts -= 1;
        this.state.collisionPenalty += 80;
        this.state.collisions += 1;
        this.state.score = Math.max(0, this.state.score - 80);
        this.state.speed = Math.max(4, this.state.speed * 0.42);
        this.state.invulnerable = 0.8;
        this.shake = 0.38;
        this.resetCombo();
        this.playHitSound('car');
        this.flashHit();
        this.showFeedback('Blocked lane -1 chance', 'bad');
        hazard.mesh.rotation.z = 0.22;
      } else if (hazard.type === 'pothole') {
        hazard.hit = true;
        this.state.collisionPenalty += 35;
        this.state.score = Math.max(0, this.state.score - 35);
        this.state.speed = Math.max(5, this.state.speed * 0.58);
        this.state.steer += rand(-0.8, 0.8);
        this.shake = Math.max(this.shake, 0.24);
        this.resetCombo();
        this.playNoise(0.12, 0.1);
        this.showFeedback('Pothole! Combo broken -35', 'bad');
      } else {
        this.state.speed = Math.max(5, this.state.speed * 0.72);
        this.state.steer += rand(-0.55, 0.55);
        this.shake = Math.max(this.shake, 0.13);
        this.playNoise(0.08, 0.06);
        this.showFeedback('Slippery puddle', 'good');
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
        const penalty = entity.penalty * 90;
        this.state.collisionPenalty += penalty;
        this.state.collisions += 1;
        this.state.score = Math.max(0, this.state.score - penalty);
        this.resetCombo();
        this.state.speed = Math.max(5, this.state.speed * 0.45);
        this.state.invulnerable = 1.2;
        this.shake = entity.type === 'police' ? 0.45 : 0.3;
        this.playHitSound(entity.type);
        this.flashHit();
        this.showFeedback(`Hit ${obstacleNames[entity.type]} -${entity.penalty} chance`, 'bad');
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
      const result = this.calculateResult(true);
      this.applySuccessfulResult(result);
      this.playTone(523, 0.1, 'triangle', 0.18);
      this.playTone(659, 0.1, 'triangle', 0.18, 0.09);
      this.playTone(784, 0.14, 'triangle', 0.18, 0.18);
      this.showResults(result);
    } else if (reachedFinish || outOfTime || busted) {
      this.state.finished = true;
      this.playHitSound('car');
      const reason = busted ? 'The tempo took too many hits.' : outOfTime ? 'The clock ran out in traffic.' : 'You reached the stop without enough passengers.';
      this.showResults(this.calculateResult(false, reason));
    }
  }

  calculateResult(completed, failReason = '') {
    const timeRemaining = Math.max(0, this.level.timeLimit - this.state.elapsed);
    const timeBonus = completed ? Math.round(timeRemaining * 10) : 0;
    const cleanBonus = completed && this.state.collisions === 0 ? 220 : completed && this.state.collisions <= 1 ? 90 : 0;
    const finalFare = Math.max(0, this.state.passengerFare + this.state.comboBonus + timeBonus + cleanBonus - this.state.collisionPenalty);
    const passengerRatio = this.state.passengers / this.level.passengerGoal;
    let stars = 0;
    if (completed) {
      stars = 1;
      if (passengerRatio >= 1 && this.state.collisions <= 2 && timeRemaining > this.level.timeLimit * 0.12) stars = 2;
      if (this.state.collisions === 0 && timeRemaining > this.level.timeLimit * 0.25) stars = 3;
    }
    const oldBest = this.progress.bestScores[this.levelIndex] ?? 0;
    return {
      completed,
      failReason,
      routeName: this.level.name,
      finalFare,
      passengerFare: this.state.passengerFare,
      comboBonus: this.state.comboBonus,
      timeBonus,
      cleanBonus,
      collisionPenalty: this.state.collisionPenalty,
      passengers: this.state.passengers,
      passengerGoal: this.level.passengerGoal,
      timeRemaining: Math.round(timeRemaining),
      collisions: this.state.collisions,
      maxCombo: this.state.maxCombo,
      stars,
      oldBest,
      newBest: Math.max(oldBest, finalFare),
      unlockedNext: completed && this.levelIndex === this.progress.unlocked && this.progress.unlocked < LEVELS.length - 1
    };
  }

  applySuccessfulResult(result) {
    this.progress.bestScores[this.levelIndex] = result.newBest;
    this.progress.wallet += result.finalFare;
    if (result.unlockedNext) this.progress.unlocked += 1;
    this.saveProgress();
  }

  showResults(result) {
    this.running = false;
    this.pausedByOverlay = true;
    this.paused = false;
    this.ui.overlay?.classList.add('hidden');
    this.ui.garage?.classList.add('hidden');
    this.ui.pauseMenu?.classList.add('hidden');

    this.ui.resultsKicker.textContent = result.completed ? 'Route complete' : 'Route failed';
    this.ui.resultsTitle.textContent = result.routeName;
    this.ui.resultsStars.textContent = '★★★';
    this.ui.resultsStars.style.setProperty('--stars', `${result.stars}`);
    this.ui.resultsSummary.textContent = result.completed
      ? this.getResultSummary(result)
      : `${result.failReason} Collect enough passengers and protect the tempo.`;
    this.ui.resultsFinalFare.textContent = result.finalFare.toString();
    this.ui.resultsPassengerFare.textContent = result.passengerFare.toString();
    this.ui.resultsTimeBonus.textContent = result.timeBonus.toString();
    this.ui.resultsCleanBonus.textContent = result.cleanBonus.toString();
    if (this.ui.resultsComboBonus) this.ui.resultsComboBonus.textContent = result.comboBonus.toString();
    this.ui.resultsPenalty.textContent = result.collisionPenalty ? `-${result.collisionPenalty}` : '0';
    this.ui.resultsPassengers.textContent = `${result.passengers}/${result.passengerGoal}`;
    this.ui.resultsBest.textContent = result.newBest.toString();
    this.ui.resultsBest.classList.toggle('new-best', result.finalFare > result.oldBest);

    if (result.completed && this.levelIndex < LEVELS.length - 1) {
      this.ui.resultsPrimary.textContent = result.unlockedNext ? 'Next route' : 'Continue';
      this.ui.resultsPrimary.onclick = () => this.startRoute(this.levelIndex + 1);
    } else {
      this.ui.resultsPrimary.textContent = 'Garage';
      this.ui.resultsPrimary.onclick = () => this.showGarage();
    }
    this.ui.resultsMenu.classList.remove('hidden');
  }

  getResultSummary(result) {
    if (result.completed && result.maxCombo >= 4) return `Route cleared with a x${result.maxCombo} pickup streak. Maya kept the fare meter hot.`;
    if (result.stars === 3) return `Perfect tempo work. ${result.timeRemaining}s left, no collisions, and a clean fare bank run.`;
    if (result.stars === 2) return `Good route. ${result.timeRemaining}s left with ${result.collisions} collision${result.collisions === 1 ? '' : 's'}.`;
    return `Route cleared. Upgrade the tempo or replay for a cleaner, faster fare.`;
  }

  updateCamera(delta) {
    const target = new THREE.Vector3(this.player.position.x * 0.38, 8.6, this.player.position.z + 15.5);
    this.camera.position.lerp(target, 1 - Math.pow(0.001, delta));
    if (this.shake > 0) {
      const amount = this.shake * 0.55;
      this.camera.position.x += rand(-amount, amount);
      this.camera.position.y += rand(-amount * 0.55, amount * 0.55);
    }
    this.camera.lookAt(this.player.position.x * 0.2, 1.4, this.player.position.z - 18);
  }

  renderHud() {
    const progress = clamp(Math.abs(this.player.position.z - 12) / (this.level.length + 12), 0, 1);
    this.ui.score.textContent = Math.round(this.state.score).toString();
    this.ui.passengers.textContent = `${this.state.passengers}/${this.level.passengerGoal}`;
    this.ui.time.textContent = Math.max(0, Math.ceil(this.level.timeLimit - this.state.elapsed)).toString();
    this.ui.hearts.textContent = Math.max(0, this.state.hearts).toString();
    if (this.ui.combo) this.ui.combo.textContent = `x${this.state.combo}`;
    if (this.ui.comboMeter) this.ui.comboMeter.classList.toggle('active', this.state.combo > 1);
    this.ui.progressBar.style.width = `${progress * 100}%`;
    if (this.ui.speedLines) {
      this.ui.speedLines.style.opacity = `${clamp((this.state.speed - 16) / 18, 0, 0.42)}`;
    }
    if (this.ui.feedback && this.feedbackTimer <= 0) {
      this.ui.feedback.classList.remove('show');
    }
    if (this.ui.passengerBark && this.passengerBarkTimer <= 0) {
      this.ui.passengerBark.classList.remove('show');
    }
    this.renderTargetGuide();
    this.renderMinimap();
  }

  renderMinimapMarkers() {
    if (!this.ui.minimapTrack) return;
    this.ui.minimapTrack.querySelectorAll('.minimap-dot').forEach((node) => node.remove());
    const addDot = (className, z) => {
      const dot = document.createElement('b');
      dot.className = `minimap-dot ${className}`;
      const progress = clamp(Math.abs(z - 12) / (this.level.length + 12), 0, 1);
      dot.style.left = `${progress * 100}%`;
      this.ui.minimapTrack.appendChild(dot);
    };
    this.pickups.forEach((pickup) => addDot('passenger-dot', pickup.z));
    this.entities
      .filter((entity) => entity.type === 'police')
      .forEach((entity) => addDot('police-dot', entity.z));
  }

  renderMinimap() {
    if (!this.ui.minimapPlayer) return;
    const progress = clamp(Math.abs(this.player.position.z - 12) / (this.level.length + 12), 0, 1);
    this.ui.minimapPlayer.style.left = `${progress * 100}%`;
    this.pickups.forEach((pickup, index) => {
      const dot = this.ui.minimapTrack?.querySelectorAll('.passenger-dot')[index];
      if (dot) dot.classList.toggle('collected', pickup.collected);
    });
  }

  renderTargetGuide() {
    if (!this.ui.targetGuide) return;
    const target = this.getCurrentTarget();
    const dx = target.position.x - this.player.position.x;
    const dz = target.position.z - this.player.position.z;
    const distance = Math.max(0, Math.round(Math.hypot(dx, dz)));
    const angle = Math.atan2(dx, -dz);
    this.ui.targetLabel.textContent = target.label;
    this.ui.targetDistance.textContent = `${distance} m`;
    this.ui.targetArrow.style.transform = `rotate(${angle}rad)`;
  }

  updateRouteUi() {
    this.ui.levelName.textContent = this.level.district;
    this.ui.routeTitle.textContent = this.level.name;
    this.ui.routeStory.textContent = this.level.story;
    this.ui.levelIndex.textContent = `${this.levelIndex + 1}/${LEVELS.length}`;
  }

  showIntro() {
    this.showOverlay(this.level.story, this.levelIndex === 0 ? 'Start route' : 'Drive route', () => {
      this.ensureAudio();
      this.ui.overlay.classList.add('hidden');
      this.pausedByOverlay = false;
      this.running = true;
      this.clock.getDelta();
    });
  }

  showOverlay(text, buttonLabel, action, secondary = null) {
    this.running = false;
    this.pausedByOverlay = true;
    this.ui.garage?.classList.add('hidden');
    this.ui.overlayText.textContent = text;
    this.ui.startButton.textContent = buttonLabel;
    this.ui.startButton.onclick = () => {
      this.ensureAudio();
      action();
    };
    if (secondary && this.ui.secondaryButton) {
      this.ui.secondaryButton.textContent = secondary.label;
      this.ui.secondaryButton.onclick = () => {
        this.ensureAudio();
        secondary.action();
      };
      this.ui.secondaryButton.classList.remove('hidden');
    } else if (this.ui.secondaryButton) {
      this.ui.secondaryButton.classList.add('hidden');
      this.ui.secondaryButton.onclick = null;
    }
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
    this.updateAudio(delta);
    this.renderer.render(this.scene, this.camera);
  }
}
