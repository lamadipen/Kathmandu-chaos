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
  createRouteLandmark,
  createShopSign,
  createStreetProp,
  createStreetStall,
  createTempo
} from './visuals.js';
import { modelLibrary } from './modelLoader.js';

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const rand = (min, max) => min + Math.random() * (max - min);
const choice = (items) => items[Math.floor(Math.random() * items.length)];
const scorePopupTextureCache = new Map();
const passengerCalloutTextureCache = new Map();
const routeIntroLabelTextureCache = new Map();
const obstacleNames = {
  car: 'traffic',
  cow: 'cow',
  cyclist: 'cyclist',
  police: 'traffic police'
};
const sharedPassengerBarks = [
  'Bistarai hai, hajur.',
  'Jam cha, horn bajau!',
  'Didi, yo side ma rokdinus.',
  'Dhanyabad, Maya didi!'
];
const routePassengerBarks = {
  market: [
    'Asan chowk samma, dai!',
    'Chiya pasal agadi rokdinus.',
    'Momo ko jhola cha, bistarai!',
    'Office pugnu cha, chito!',
    'Ratna Park bata Asan jane ho?',
    'Tarkari bazaar side ma rokdinus.'
  ],
  stupa: [
    'Boudha gate samma, hajur.',
    'Stupa ghumera hotel jane ho.',
    'Thanka pasal agadi rokdinus.',
    'Bell bajyo, bistarai chalnus.',
    'Tourist lai pick garnu cha.',
    'Chabahil chowk ma left hai.'
  ],
  durbar: [
    'Mangal Bazaar samma, dai!',
    'Patan Durbar side ma rokdinus.',
    'Crafts ko saman cha, jhatka nagarnus.',
    'Juju Dhau lina park garnus.',
    'Galli sano cha, bistarai.',
    'Rato mato bato, careful hai.'
  ],
  monsoon: [
    'Pani paryo, chito tara bistarai!',
    'Kalanki stop samma, hajur.',
    'Puddle bata bachnus hai.',
    'Umbrella bhijyo, bus park rokdinus.',
    'Ring Road jam cha, horn dinus.',
    'Bridge cross garda slow hai.'
  ],
  swayambhu: [
    'Swayambhu gate samma, dai!',
    'Ukalai cha, battery bachnus.',
    'Lassi pasal agadi rokdinus.',
    'Thamel bata stupa jane ho.',
    'Permit inspector parkhera cha!',
    'Prayer flags pachi right hai.'
  ]
};
const passengerPersonalities = [
  { id: 'commuter', prefix: 'Commuter', fareBonus: 0 },
  { id: 'student', prefix: 'Student', fareBonus: 8 },
  { id: 'vendor', prefix: 'Vendor', fareBonus: 12 },
  { id: 'tourist', prefix: 'Tourist', fareBonus: 15 },
  { id: 'elder', prefix: 'Elder', fareBonus: 10 }
];
const routeVisualProfiles = {
  market: {
    sky: 0xc7ecff,
    fog: 0xd9f0ff,
    ground: 0x71865f,
    hemiSky: 0xfff7de,
    hemiGround: 0x4f5e58,
    sun: 0xfff1c2,
    rim: 0xffcf42,
    exposure: 1.08,
    fogNear: 72,
    fogFar: 500
  },
  stupa: {
    sky: 0xd8f4e5,
    fog: 0xe9f8ee,
    ground: 0x668060,
    hemiSky: 0xf6fff1,
    hemiGround: 0x58665d,
    sun: 0xffdfbd,
    rim: 0xffcf42,
    exposure: 1.04,
    fogNear: 68,
    fogFar: 470
  },
  durbar: {
    sky: 0xffddb8,
    fog: 0xffedcf,
    ground: 0x7d6754,
    hemiSky: 0xffe1b8,
    hemiGround: 0x4d3b35,
    sun: 0xffc17a,
    rim: 0xf2a65a,
    exposure: 1.02,
    fogNear: 64,
    fogFar: 450
  },
  monsoon: {
    sky: 0x8faabd,
    fog: 0xbfd2dd,
    ground: 0x546b62,
    hemiSky: 0xd7ebf5,
    hemiGround: 0x344046,
    sun: 0xadc6d6,
    rim: 0x74c0e3,
    exposure: 0.92,
    fogNear: 46,
    fogFar: 360
  },
  swayambhu: {
    sky: 0xded7ff,
    fog: 0xebe7ff,
    ground: 0x5f6f5a,
    hemiSky: 0xf4eeff,
    hemiGround: 0x4a5362,
    sun: 0xffe4ad,
    rim: 0x8ce99a,
    exposure: 1.06,
    fogNear: 58,
    fogFar: 430
  }
};
const progressKey = 'kathmandu-chaos-progress-v1';
const upgradeConfig = {
  battery: { base: 72, step: 8, cost: 550 },
  brakes: { base: 64, step: 9, cost: 450 },
  handling: { base: 68, step: 8, cost: 500 }
};
const tempoSkins = [
  { id: 'classic', name: 'Classic Green', cost: 0, body: 0x159b77, roof: 0xffcf42, trim: 0xf8f1dc, stripe: 0xd62828 },
  { id: 'ratna', name: 'Ratna Red', cost: 650, body: 0xc92a2a, roof: 0xffd43b, trim: 0xf8f1dc, stripe: 0x159b77 },
  { id: 'boudha', name: 'Boudha Blue', cost: 900, body: 0x1971c2, roof: 0xf8f1dc, trim: 0xffcf42, stripe: 0xd94848 },
  { id: 'patan', name: 'Patan Brick', cost: 1200, body: 0x8f3f2d, roof: 0xd6c29b, trim: 0xffcf42, stripe: 0x2f9e44 }
];

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
    this.redLights = [];
    this.trafficLaneSlots = new Map();
    this.effects = [];
    this.weather = null;
    this.running = false;
    this.pausedByOverlay = true;
    this.audio = null;
    this.feedbackTimer = 0;
    this.passengerBarkTimer = 0;
    this.passengerCalloutTimer = 0;
    this.shake = 0;
    this.selectedRoute = 0;
    this.progress = this.loadProgress();
    this.audioMuted = this.progress.audioMuted;
    this.audioVolume = this.progress.audioVolume;
    this.nextMusicTime = 0;
    this.nextAmbientTime = 0;
    this.musicStep = 0;
    this.ambientStep = 0;
    this.hornPulse = 0;
    this.paused = false;
    this.routeIntro = { active: false, age: 0, duration: 3.2 };
    this.tutorialCoach = { active: false, age: 0, stage: 'intro', completeTimer: 0 };
    this.touchInput = {
      left: false,
      right: false,
      accelerate: false,
      brake: false
    };
    this.modelManifest = { enabled: false, passengers: [], police: '' };
    this.assetStatus = { loaded: 0, failed: 0, fallback: true };
  }

  async boot() {
    const bootStarted = performance.now();
    this.showLoadingScreen('Starting Kathmandu traffic physics...');
    await RAPIER.init();
    this.showLoadingScreen('Checking character model manifest...');
    await this.loadModelManifest();
    await this.preloadModelAssets();
    this.showLoadingScreen('Building the first route...');
    this.setupRenderer();
    this.setupInput();
    this.setupTouchControls();
    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.setupGarage();
    this.loadLevel(0, { showIntro: false });
    await this.waitForMinimumLoadingTime(bootStarted);
    this.showGarage();
    this.animate();
  }

  waitForMinimumLoadingTime(startedAt, minimum = 1400) {
    const remaining = minimum - (performance.now() - startedAt);
    if (remaining <= 0) return Promise.resolve();
    this.showLoadingScreen('Warming up the tempo...');
    return new Promise((resolve) => window.setTimeout(resolve, remaining));
  }

  showLoadingScreen(message) {
    if (this.ui.overlayKicker) this.ui.overlayKicker.textContent = 'Loading';
    if (this.ui.overlayTitle) this.ui.overlayTitle.textContent = 'Kathmandu Chaos';
    if (this.ui.overlayText) this.ui.overlayText.textContent = `${message} Built-in low-poly fallbacks are ready if imported models are unavailable.`;
    this.ui.garage?.classList.add('hidden');
    this.ui.resultsMenu?.classList.add('hidden');
    this.ui.pauseMenu?.classList.add('hidden');
    this.ui.overlay?.classList.add('loading');
    this.ui.overlay?.classList.remove('hidden');
    if (this.ui.startButton) this.ui.startButton.classList.add('hidden');
    if (this.ui.secondaryButton) this.ui.secondaryButton.classList.add('hidden');
  }

  async loadModelManifest() {
    try {
      const response = await fetch('/models/manifest.json', { cache: 'no-store' });
      if (!response.ok) {
        this.assetStatus = { loaded: 0, failed: 1, fallback: true };
        return;
      }
      const manifest = await response.json();
      this.modelManifest = {
        enabled: Boolean(manifest.enabled),
        passengers: Array.isArray(manifest.passengers) ? manifest.passengers.filter(Boolean) : [],
        police: manifest.police || '',
        scale: manifest.scale ?? {}
      };
    } catch {
      this.modelManifest = { enabled: false, passengers: [], police: '' };
      this.assetStatus = { loaded: 0, failed: 1, fallback: true };
    }
  }

  async preloadModelAssets() {
    if (!this.modelManifest.enabled) {
      this.assetStatus = { loaded: 0, failed: 0, fallback: true };
      return;
    }

    this.showLoadingScreen('Loading character models...');
    const passengerResults = await Promise.all(this.modelManifest.passengers.map(async (path) => {
      try {
        await modelLibrary.load(path);
        return { path, ok: true };
      } catch {
        return { path, ok: false };
      }
    }));

    let policeOk = false;
    if (this.modelManifest.police) {
      try {
        await modelLibrary.load(this.modelManifest.police);
        policeOk = true;
      } catch {
        policeOk = false;
      }
    }

    const loadedPassengers = passengerResults.filter((result) => result.ok).map((result) => result.path);
    const failed = passengerResults.filter((result) => !result.ok).length + (this.modelManifest.police && !policeOk ? 1 : 0);
    this.modelManifest.passengers = loadedPassengers;
    if (!policeOk) this.modelManifest.police = '';
    this.modelManifest.enabled = loadedPassengers.length > 0 || Boolean(this.modelManifest.police);
    this.assetStatus = {
      loaded: loadedPassengers.length + (policeOk ? 1 : 0),
      failed,
      fallback: failed > 0 || !this.modelManifest.enabled
    };
  }

  loadProgress() {
    const defaults = {
      unlocked: 0,
      bestScores: {},
      routeStars: {},
      wallet: 0,
      upgrades: { battery: 0, brakes: 0, handling: 0 },
      audioMuted: false,
      audioVolume: 0.8,
      skins: ['classic'],
      selectedSkin: 'classic',
      tutorialSeen: false
    };
    try {
      const saved = JSON.parse(window.localStorage.getItem(progressKey));
      return {
        unlocked: clamp(Number(saved?.unlocked ?? 0), 0, LEVELS.length - 1),
        bestScores: saved?.bestScores ?? {},
        routeStars: saved?.routeStars ?? {},
        wallet: Math.max(0, Number(saved?.wallet ?? 0)),
        upgrades: {
          battery: clamp(Number(saved?.upgrades?.battery ?? 0), 0, 3),
          brakes: clamp(Number(saved?.upgrades?.brakes ?? 0), 0, 3),
          handling: clamp(Number(saved?.upgrades?.handling ?? 0), 0, 3)
        },
        audioMuted: Boolean(saved?.audioMuted),
        audioVolume: clamp(Number(saved?.audioVolume ?? 0.8), 0, 1),
        skins: Array.from(new Set(['classic', ...(Array.isArray(saved?.skins) ? saved.skins : [])])).filter((id) => tempoSkins.some((skin) => skin.id === id)),
        selectedSkin: tempoSkins.some((skin) => skin.id === saved?.selectedSkin) ? saved.selectedSkin : 'classic',
        tutorialSeen: Boolean(saved?.tutorialSeen)
      };
    } catch {
      return defaults;
    }
  }

  saveProgress() {
    window.localStorage.setItem(progressKey, JSON.stringify(this.progress));
  }

  setupGarage() {
    this.ui.garageStart?.addEventListener('click', () => this.startSelectedRoute());
    this.ui.audioToggle?.addEventListener('click', () => this.toggleAudio());
    this.ui.tutorialButton?.addEventListener('click', () => this.startRoute(this.selectedRoute, { tutorial: true }));
    this.ui.creditsButton?.addEventListener('click', () => this.showCredits('garage'));
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
    this.ui.skinOptions?.addEventListener('click', (event) => {
      const button = event.target.closest('[data-skin-id]');
      if (button) this.selectSkin(button.dataset.skinId);
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
    this.tutorialCoach.active = false;
    this.hideTutorialCoach();
    this.hideTrafficSignalHud();
    if (this.ui.overlayKicker) this.ui.overlayKicker.textContent = 'Tempo mission';
    if (this.ui.overlayTitle) this.ui.overlayTitle.textContent = 'Kathmandu Chaos';
    this.ui.overlay.classList.add('hidden');
    this.ui.pauseMenu?.classList.add('hidden');
    this.ui.resultsMenu?.classList.add('hidden');
    this.ui.garage.classList.remove('hidden');
    this.selectRoute(Math.min(this.selectedRoute, this.progress.unlocked));
    this.renderGarage();
  }

  showTitleMenu() {
    const cleared = Object.values(this.progress.bestScores ?? {}).filter((score) => Number(score) > 0).length;
    const assetLine = this.assetStatus.loaded > 0
      ? `Loaded ${this.assetStatus.loaded} imported character model${this.assetStatus.loaded === 1 ? '' : 's'}${this.assetStatus.failed ? `; ${this.assetStatus.failed} fallback${this.assetStatus.failed === 1 ? '' : 's'} active` : ''}.`
      : 'Using built-in low-poly character fallbacks.';
    const story = [
      'Maya Lama has one morning to save her family tempo permit.',
      'Kathmandu is already awake: office crowds at Ratna Park, bells near Boudha, brick alleys in Patan, monsoon traffic on Ring Road, and the final climb to Swayambhu.',
      'Pick up passengers, read the landmarks, earn bonus fares, and keep the little green tempo moving.',
      assetLine
    ].join(' ');

    if (this.ui.overlayKicker) this.ui.overlayKicker.textContent = cleared > 0 ? `${cleared}/${LEVELS.length} routes cleared` : 'Story mode';
    if (this.ui.overlayTitle) this.ui.overlayTitle.textContent = 'Kathmandu Chaos';
    this.showOverlay(story, 'Enter garage', () => this.showGarage(), {
      label: 'Credits',
      action: () => this.showCredits('title')
    });
  }

  showCredits(returnTo = 'title') {
    const credits = [
      'Kathmandu Chaos is a Three.js and Rapier arcade prototype created as a Nepali tempo driving game.',
      'Imported starter character models: Kenney Blocky Characters 2.0 by Kenney, licensed Creative Commons Zero (CC0). Credit is appreciated but not required by the license. License file: public/models/vendor/kenney-blocky-characters/License.txt.',
      'Passenger and traffic-police models are production stand-ins with Kathmandu-themed accessory overlays. Built-in low-poly fallback characters, vehicles, streets, landmarks, audio, and UI are generated in this project so the game remains playable if external models fail to load.',
      `Current asset status: ${this.assetStatus.loaded} imported model${this.assetStatus.loaded === 1 ? '' : 's'} loaded, ${this.assetStatus.failed} fallback${this.assetStatus.failed === 1 ? '' : 's'} active.`
    ].join(' ');

    if (this.ui.overlayKicker) this.ui.overlayKicker.textContent = 'Credits & licenses';
    if (this.ui.overlayTitle) this.ui.overlayTitle.textContent = 'Kathmandu Chaos';
    this.showOverlay(credits, returnTo === 'garage' ? 'Back to garage' : 'Back to title', () => {
      if (returnTo === 'garage') this.showGarage();
      else this.showTitleMenu();
    });
  }

  hideGarage() {
    this.ui.garage.classList.add('hidden');
  }

  selectRoute(index) {
    this.selectedRoute = clamp(index, 0, this.progress.unlocked);
    this.renderGarage();
  }

  startSelectedRoute() {
    this.startRoute(this.selectedRoute, { tutorial: !this.progress.tutorialSeen });
  }

  markTutorialSeen() {
    if (this.progress.tutorialSeen) return;
    this.progress.tutorialSeen = true;
    this.saveProgress();
  }

  startRoute(index, options = {}) {
    this.selectedRoute = clamp(index, 0, this.progress.unlocked);
    this.ensureAudio();
    this.hideGarage();
    this.ui.pauseMenu?.classList.add('hidden');
    this.ui.resultsMenu?.classList.add('hidden');
    this.loadLevel(this.selectedRoute, { showIntro: false });
    this.pausedByOverlay = false;
    this.paused = false;
    this.running = true;
    this.startTutorialCoach(Boolean(options.tutorial));
    this.startRouteIntro();
    if (this.audio) this.nextMusicTime = this.audio.ctx.currentTime + 0.1;
    if (this.audio) this.nextAmbientTime = this.audio.ctx.currentTime + 0.25;
    this.playRouteStartSound();
    this.clock.getDelta();
  }

  startTutorialCoach(active) {
    this.tutorialCoach = { active, age: 0, stage: 'intro', completeTimer: 0 };
    if (!active) this.hideTutorialCoach();
  }

  hideTutorialCoach() {
    this.ui.tutorialCoach?.classList.add('hidden');
  }

  setTutorialCoach(step, title, text) {
    if (!this.ui.tutorialCoach) return;
    if (this.ui.tutorialCoachStep) this.ui.tutorialCoachStep.textContent = step;
    if (this.ui.tutorialCoachTitle) this.ui.tutorialCoachTitle.textContent = title;
    if (this.ui.tutorialCoachText) this.ui.tutorialCoachText.textContent = text;
    this.ui.tutorialCoach.classList.remove('hidden');
  }

  updateTutorialCoach(delta) {
    if (!this.tutorialCoach.active) return;
    this.tutorialCoach.age += delta;

    if (this.routeIntro.active) {
      this.setTutorialCoach('First drive', 'Get ready', 'Use W or Go to accelerate when the countdown ends.');
      return;
    }

    const nextPickup = this.pickups.find((pickup) => !pickup.collected);
    const nearPickup = nextPickup
      && Math.abs(this.player.position.z - nextPickup.mesh.position.z) < 24
      && Math.abs(this.player.position.x - nextPickup.mesh.position.x) < 4.5;
    const movingFast = this.state.speed > 16;

    if (this.state.passengers <= 0 && nearPickup) {
      this.tutorialCoach.stage = 'pickup';
      this.setTutorialCoach('Pick up', 'Enter the yellow ring', 'Steer through the ring beside the waiting passenger.');
      return;
    }

    if (this.state.passengers <= 0) {
      this.tutorialCoach.stage = 'find';
      this.setTutorialCoach('Find passenger', 'Follow the arrow', 'The yellow arrow points to the next customer.');
      return;
    }

    if (this.state.passengers < this.level.passengerGoal && this.tutorialCoach.age < 13) {
      this.tutorialCoach.stage = 'traffic';
      this.setTutorialCoach('Street control', 'Horn, brake, red lights', 'Tap H or Horn near traffic. Slow at red lights and brake before tight gaps.');
      return;
    }

    if (this.state.passengers < this.level.passengerGoal) {
      this.tutorialCoach.stage = 'more';
      this.setTutorialCoach('Keep boarding', 'Find more rings', 'Board enough passengers before heading to the finish.');
      return;
    }

    if (this.state.passengers >= this.level.passengerGoal) {
      this.tutorialCoach.stage = 'finish';
      this.setTutorialCoach('Finish route', 'Follow the gate arrow', movingFast ? 'Nice pace. Reach the finish gate before time runs out.' : 'Accelerate toward the finish gate before time runs out.');
      this.tutorialCoach.completeTimer += delta;
      if (this.tutorialCoach.completeTimer > 5) {
        this.markTutorialSeen();
        this.tutorialCoach.active = false;
        this.hideTutorialCoach();
      }
    }
  }

  startRouteIntro() {
    this.routeIntro = { active: true, age: 0, duration: 3.2 };
    this.createRouteIntroLabels();
    this.ui.routeCountdown?.classList.remove('hidden');
    if (this.ui.routeCountdownLabel) this.ui.routeCountdownLabel.textContent = this.level.district;
    if (this.ui.routeCountdownValue) this.ui.routeCountdownValue.textContent = '3';
  }

  finishRouteIntro() {
    this.routeIntro.active = false;
    this.ui.routeCountdown?.classList.add('hidden');
    this.clearRouteIntroLabels();
    this.clock.getDelta();
  }

  createRouteIntroLabels() {
    this.clearRouteIntroLabels();
    const visual = this.getRouteVisualProfile();
    const landmarks = this.level.landmarks ?? [];
    this.routeIntroLabels = landmarks.map((item, index) => {
      const z = -this.level.length * item.at;
      const side = item.type === 'gateArch' || item.type === 'riverBridge' ? 0 : item.side ?? 1;
      const x = this.getRoadCenter(z) + (side === 0 ? 0 : side * 14.2);
      const y = item.type === 'gateArch' ? 7.1 : item.type === 'riverBridge' ? 2.7 : item.type === 'temple' ? 6.4 : 4.55;
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
        map: this.createRouteIntroLabelTexture(item.label, item.type, visual.rim),
        transparent: true,
        depthWrite: false,
        opacity: 0
      }));
      sprite.name = 'routeIntroLandmarkLabel';
      sprite.position.set(x, y, z);
      sprite.scale.set(7.2, 1.7, 1);
      this.scene.add(sprite);
      return { sprite, item, index };
    });
  }

  clearRouteIntroLabels() {
    if (!this.routeIntroLabels) return;
    for (const label of this.routeIntroLabels) {
      this.scene.remove(label.sprite);
      label.sprite.material?.dispose();
    }
    this.routeIntroLabels = [];
  }

  createRouteIntroLabelTexture(label, type, accent = 0xffcf42) {
    const key = `${type}:${label}:${accent}`;
    if (routeIntroLabelTextureCache.has(key)) return routeIntroLabelTextureCache.get(key);

    const canvas = document.createElement('canvas');
    canvas.width = 768;
    canvas.height = 192;
    const ctx = canvas.getContext('2d');
    const accentColor = `#${new THREE.Color(accent).getHexString()}`;
    const typeLabel = type === 'gateArch' ? 'Gate' : type === 'riverBridge' ? 'Bridge' : type === 'busPark' ? 'Bus park' : type === 'temple' ? 'Temple' : 'Chowk';

    ctx.font = '900 62px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.fillStyle = 'rgba(10, 15, 18, 0.88)';
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 8;
    const x = 34;
    const y = 34;
    const width = canvas.width - 68;
    const height = 118;
    const radius = 22;
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = accentColor;
    ctx.font = '900 28px Arial, sans-serif';
    ctx.fillText(typeLabel.toUpperCase(), canvas.width / 2, y + 28, width - 48);
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 58px Arial, sans-serif';
    ctx.fillText(label.toUpperCase(), canvas.width / 2, y + 78, width - 56);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    routeIntroLabelTextureCache.set(key, texture);
    return texture;
  }

  renderGarage() {
    if (!this.ui.garageRoutes) return;
    this.ui.garageWallet.textContent = this.progress.wallet.toString();
    this.ui.garageRoutes.innerHTML = LEVELS.map((level, index) => {
      const locked = index > this.progress.unlocked;
      const selected = index === this.selectedRoute;
      const best = this.progress.bestScores[index] ?? 0;
      const stars = this.getRouteStars(index);
      const status = locked ? 'Locked' : stars > 0 ? `${stars}/3 mastery` : 'Uncleared';
      return `
        <button class="route-option${selected ? ' selected' : ''}${locked ? ' locked' : ''}" data-route-index="${index}" type="button">
          <span>${index + 1}</span>
          <strong>${level.name}</strong>
          <small>${locked ? 'Locked' : best ? `Best fare ${best}` : level.district}</small>
          <i aria-hidden="true">${this.renderStarText(stars)}</i>
          <em>${status}</em>
        </button>
      `;
    }).join('');

    const level = LEVELS[this.selectedRoute];
    const best = this.progress.bestScores[this.selectedRoute] ?? 0;
    const stars = this.getRouteStars(this.selectedRoute);
    this.ui.garageRouteName.textContent = level.name;
    this.ui.garageRouteStory.textContent = level.story;
    this.ui.garagePassengers.textContent = level.passengerGoal.toString();
    this.ui.garageTime.textContent = level.timeLimit.toString();
    this.ui.garageBest.textContent = best.toString();
    if (this.ui.garageMasteryStars) this.ui.garageMasteryStars.textContent = this.renderStarText(stars);
    if (this.ui.garageMasteryStatus) this.ui.garageMasteryStatus.textContent = this.getMasteryStatus(this.selectedRoute);
    if (this.ui.garageUnlockHint) this.ui.garageUnlockHint.textContent = this.getUnlockHint(this.selectedRoute);
    this.renderUpgradeUi();
    this.renderSkinUi();
    this.renderAudioButtons();
    this.ui.garageHint.textContent = this.selectedRoute === this.progress.unlocked && this.progress.unlocked < LEVELS.length - 1
      ? `Clear this route to unlock ${LEVELS[this.progress.unlocked + 1].name}.`
      : 'Replay cleared routes to improve your best fare.';
  }

  getRouteStars(index) {
    return clamp(Number(this.progress.routeStars?.[index] ?? 0), 0, 3);
  }

  renderStarText(stars) {
    const filled = clamp(stars, 0, 3);
    return `${'★'.repeat(filled)}${'☆'.repeat(3 - filled)}`;
  }

  getMasteryStatus(index) {
    const level = LEVELS[index];
    const locked = index > this.progress.unlocked;
    const stars = this.getRouteStars(index);
    if (locked) return `Locked. Clear ${LEVELS[index - 1]?.name ?? 'the previous route'} first.`;
    if (stars === 3) return 'Mastered: fast, clean, and fully passenger-ready.';
    if (stars === 2) return 'Strong clear. Chase a clean run with more time left for 3 stars.';
    if (stars === 1) return 'Cleared. Improve collisions and finish time to raise mastery.';
    return `Goal: board ${level.passengerGoal} passengers before the timer ends.`;
  }

  getUnlockHint(index) {
    if (index > this.progress.unlocked) return 'Locked route';
    if (index < LEVELS.length - 1) {
      const next = LEVELS[index + 1];
      return index === this.progress.unlocked ? `Clear this route to unlock ${next.name}.` : `${next.name} is available after this route.`;
    }
    return 'Final route. Earn 3 stars to fully master Maya’s permit run.';
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

  getSelectedSkin() {
    return tempoSkins.find((skin) => skin.id === this.progress.selectedSkin) ?? tempoSkins[0];
  }

  renderSkinUi() {
    if (!this.ui.skinOptions) return;
    const unlocked = new Set(this.progress.skins ?? ['classic']);
    this.ui.skinOptions.innerHTML = tempoSkins.map((skin) => {
      const owned = unlocked.has(skin.id);
      const selected = this.progress.selectedSkin === skin.id;
      const canBuy = this.progress.wallet >= skin.cost;
      const label = selected ? 'Selected' : owned ? 'Use' : `${skin.cost} fare`;
      return `
        <button class="skin-option${selected ? ' selected' : ''}${!owned && !canBuy ? ' locked' : ''}" data-skin-id="${skin.id}" type="button">
          <i style="--body:#${skin.body.toString(16).padStart(6, '0')}; --roof:#${skin.roof.toString(16).padStart(6, '0')}; --stripe:#${skin.stripe.toString(16).padStart(6, '0')}"></i>
          <strong>${skin.name}</strong>
          <span>${label}</span>
        </button>
      `;
    }).join('');
  }

  selectSkin(id) {
    const skin = tempoSkins.find((item) => item.id === id);
    if (!skin) return;
    const owned = this.progress.skins.includes(id);
    let message;
    if (!owned) {
      if (this.progress.wallet < skin.cost) {
        this.ui.garageHint.textContent = `Need ${skin.cost} fare for ${skin.name}.`;
        return;
      }
      this.progress.wallet -= skin.cost;
      this.progress.skins.push(id);
      message = `${skin.name} unlocked.`;
    } else {
      message = `${skin.name} selected.`;
    }
    this.progress.selectedSkin = id;
    this.saveProgress();
    this.renderGarage();
    this.ui.garageHint.textContent = message;
  }

  confirmResetProgress() {
    const confirmed = window.confirm('Reset unlocked routes, best fares, upgrades, and fare bank?');
    if (!confirmed) return;
    this.progress = { unlocked: 0, bestScores: {}, routeStars: {}, wallet: 0, upgrades: { battery: 0, brakes: 0, handling: 0 }, audioMuted: this.audioMuted, audioVolume: this.audioVolume, skins: ['classic'], selectedSkin: 'classic', tutorialSeen: false };
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
    this.renderer.setPixelRatio(this.getRenderPixelRatio());
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.04;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(58, 1, 0.1, 1100);
  }

  isMobileViewport() {
    return window.innerWidth <= 720 || window.matchMedia?.('(pointer: coarse)').matches;
  }

  getRenderPixelRatio() {
    const maxRatio = this.isMobileViewport() ? 1.35 : 2;
    return Math.min(window.devicePixelRatio || 1, maxRatio);
  }

  setupInput() {
    window.addEventListener('keydown', (event) => {
      this.resumeAudioContext();
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
        if (active) this.ensureAudio();
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
    this.hideTutorialCoach();
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
      this.resumeAudioContext();
      return;
    }
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const master = ctx.createGain();
    const sfx = ctx.createGain();
    const ambience = ctx.createGain();
    const routeFx = ctx.createGain();
    const rain = ctx.createGain();
    const music = ctx.createGain();
    const motor = ctx.createGain();
    master.gain.value = this.audioMuted ? 0 : this.audioVolume;
    sfx.gain.value = 0.24;
    ambience.gain.value = 0.16;
    routeFx.gain.value = 0.24;
    rain.gain.value = 0;
    music.gain.value = 0;
    motor.gain.value = 0;
    sfx.connect(master);
    ambience.connect(master);
    routeFx.connect(master);
    rain.connect(master);
    music.connect(master);
    motor.connect(master);
    master.connect(ctx.destination);
    this.audio = { ctx, master, sfx, ambience, routeFx, rain, music, motor };
    this.startAmbience();
    this.startRainLoop();
    this.startMotor();
    this.nextMusicTime = ctx.currentTime + 0.12;
    this.nextAmbientTime = ctx.currentTime + 0.25;
    this.resumeAudioContext();
  }

  resumeAudioContext() {
    const resume = this.audio?.ctx.resume?.();
    if (resume?.catch) resume.catch(() => {});
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

  playNoise(duration = 0.18, gain = 0.16, destination = null, frequency = 260) {
    if (!this.audio) return;
    const { ctx } = this.audio;
    const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * duration), ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
    const source = ctx.createBufferSource();
    const filter = ctx.createBiquadFilter();
    const amp = ctx.createGain();
    filter.type = 'lowpass';
    filter.frequency.value = frequency;
    amp.gain.setValueAtTime(gain, ctx.currentTime);
    amp.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
    source.buffer = buffer;
    source.connect(filter);
    filter.connect(amp);
    amp.connect(destination ?? this.audio.sfx);
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

  startRainLoop() {
    if (!this.audio || this.audio.rainSource) return;
    const { ctx, rain } = this.audio;
    const duration = 1.5;
    const buffer = ctx.createBuffer(1, ctx.sampleRate * duration, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) data[i] = (Math.random() * 2 - 1) * 0.7;
    const source = ctx.createBufferSource();
    const highpass = ctx.createBiquadFilter();
    const lowpass = ctx.createBiquadFilter();
    source.buffer = buffer;
    source.loop = true;
    highpass.type = 'highpass';
    highpass.frequency.value = 900;
    lowpass.type = 'lowpass';
    lowpass.frequency.value = 5200;
    source.connect(highpass);
    highpass.connect(lowpass);
    lowpass.connect(rain);
    source.start();
    this.audio.rainSource = source;
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
    const { ctx, motor, music, rain, motorOsc, motorFilter } = this.audio;
    const active = this.running && !this.pausedByOverlay;
    const motorGain = active ? clamp(0.025 + this.state.speed / 900, 0.02, 0.075) : 0;
    motor.gain.setTargetAtTime(motorGain, ctx.currentTime, 0.08);
    music.gain.setTargetAtTime(active ? 0.07 : 0, ctx.currentTime, 0.25);
    rain.gain.setTargetAtTime(active && this.level.wetRoad ? 0.18 : 0, ctx.currentTime, 0.45);
    if (motorOsc) motorOsc.frequency.setTargetAtTime(62 + this.state.speed * 6.5, ctx.currentTime, 0.06);
    if (motorFilter) motorFilter.frequency.setTargetAtTime(190 + this.state.speed * 13, ctx.currentTime, 0.08);
    if (active) {
      this.scheduleMusic(delta);
      this.scheduleRouteAmbience();
    }
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

  scheduleRouteAmbience() {
    if (!this.audio) return;
    const { ctx, routeFx } = this.audio;

    while (this.nextAmbientTime < ctx.currentTime + 0.6) {
      const theme = this.level.theme;
      const step = this.ambientStep;
      const when = this.nextAmbientTime - ctx.currentTime;

      if (this.level.wetRoad && step % 2 === 0) {
        this.playNoise(0.12, 0.08, routeFx, 2200);
      }

      if ((theme === 'stupa' || theme === 'swayambhu') && step % 2 === 0) {
        this.playTone(784, 0.5, 'sine', 0.075, when, routeFx);
        this.playTone(1174.66, 0.42, 'sine', 0.045, when + 0.04, routeFx);
      } else if (theme === 'durbar' && step % 3 === 0) {
        this.playTone(659.25, 0.34, 'triangle', 0.06, when, routeFx);
        this.playTone(987.77, 0.18, 'triangle', 0.035, when + 0.1, routeFx);
      } else if (theme === 'market' || theme === 'durbar') {
        this.playNoise(0.2, 0.075, routeFx, 820);
        this.playTone(196 + (step % 3) * 28, 0.11, 'triangle', 0.035, when + 0.02, routeFx);
      } else if (theme === 'monsoon') {
        this.playNoise(0.24, 0.06, routeFx, 520);
        if (step % 3 === 0) this.playTone(110, 0.5, 'sawtooth', 0.035, when, routeFx);
      }

      if (this.level.police > 0 && step % 4 === 2) {
        this.playTone(1500, 0.12, 'square', 0.08, when, routeFx);
        this.playTone(1900, 0.12, 'square', 0.06, when + 0.13, routeFx);
      }

      this.ambientStep += 1;
      this.nextAmbientTime += rand(0.85, 1.7);
    }
  }

  playRouteStartSound() {
    if (!this.audio || this.audioMuted) return;
    this.resumeAudioContext();
    const { routeFx } = this.audio;
    this.playTone(523.25, 0.08, 'triangle', 0.12, 0.02);
    this.playTone(659.25, 0.1, 'triangle', 0.1, 0.11);
    this.playTone(783.99, 0.12, 'triangle', 0.08, 0.2);

    if (this.level.theme === 'market') {
      this.playNoise(0.28, 0.09, routeFx, 850);
      this.playTone(220, 0.12, 'triangle', 0.045, 0.28, routeFx);
    } else if (this.level.theme === 'stupa' || this.level.theme === 'swayambhu') {
      this.playTone(784, 0.6, 'sine', 0.09, 0.26, routeFx);
      this.playTone(1174.66, 0.48, 'sine', 0.055, 0.34, routeFx);
    } else if (this.level.theme === 'durbar') {
      this.playTone(659.25, 0.35, 'triangle', 0.075, 0.26, routeFx);
      this.playTone(987.77, 0.22, 'triangle', 0.045, 0.4, routeFx);
    } else if (this.level.theme === 'monsoon') {
      this.playNoise(0.3, 0.12, routeFx, 2400);
      this.playTone(110, 0.6, 'sawtooth', 0.045, 0.28, routeFx);
    }
  }

  playHorn() {
    if (this.audio) {
      this.playTone(392, 0.18, 'square', 0.18);
      this.playTone(466.16, 0.2, 'square', 0.16, 0.04);
    }
    this.triggerTrafficHornReaction();
    this.showFeedback('Horn!', 'good');
  }

  triggerTrafficHornReaction() {
    this.hornPulse = 0.65;
    if (!this.player) return;
    for (const entity of this.entities) {
      if (!['car', 'cyclist', 'cow', 'police'].includes(entity.type)) continue;
      const dx = Math.abs(entity.mesh.position.x - this.player.position.x);
      const dz = Math.abs(entity.mesh.position.z - this.player.position.z);
      if (dx < 8.5 && dz < 42) {
        entity.hornReact = 1;
        entity.alertSide = Math.sign(entity.mesh.position.x - this.player.position.x) || (Math.random() > 0.5 ? 1 : -1);
      }
    }
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
      landmarkBonus: 0,
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
    this.redLights = [];
    this.bonusObjectives = [];
    this.effects = [];
    this.weather = null;
    this.spawnedSlots = [];
    this.shake = 0;
    this.feedbackTimer = 0;
    this.passengerBarkTimer = 0;
    this.passengerCalloutTimer = 0;
    this.hornPulse = 0;
    this.routeIntroLabels = [];
    this.nextAmbientTime = this.audio ? this.audio.ctx.currentTime + 0.25 : 0;
    this.ambientStep = 0;
    this.routeIntro = { active: false, age: 0, duration: 3.2 };
    this.ui.routeCountdown?.classList.add('hidden');

    this.buildWorld();
    this.buildPlayer();
    this.setupBonusObjectives();
    this.populateRoute();
    this.updateRouteUi();
    this.renderHud();
    if (showIntro) this.showIntro();
  }

  buildWorld() {
    const { palette } = this.level;
    const visual = this.getRouteVisualProfile();
    this.renderer.toneMappingExposure = visual.exposure;
    this.scene.background = new THREE.Color(visual.sky ?? palette.sky);
    this.scene.fog = new THREE.Fog(visual.fog ?? palette.fog, visual.fogNear, visual.fogFar);

    const hemi = new THREE.HemisphereLight(visual.hemiSky, visual.hemiGround, this.level.wetRoad ? 1.18 : 1.36);
    this.scene.add(hemi);

    const sun = new THREE.DirectionalLight(visual.sun, this.level.wetRoad ? 1.15 : 1.72);
    sun.position.set(this.level.theme === 'durbar' ? -28 : -20, 36, this.level.wetRoad ? -10 : -18);
    sun.castShadow = true;
    sun.shadow.mapSize.set(this.isMobileViewport() ? 1024 : 2048, this.isMobileViewport() ? 1024 : 2048);
    sun.shadow.camera.left = -55;
    sun.shadow.camera.right = 55;
    sun.shadow.camera.top = 55;
    sun.shadow.camera.bottom = -55;
    this.scene.add(sun);

    const rim = new THREE.DirectionalLight(visual.rim, this.level.wetRoad ? 0.72 : 0.48);
    rim.position.set(24, 16, 18);
    this.scene.add(rim);

    this.road = new THREE.Group();
    this.scene.add(this.road);

    const roadMat = new THREE.MeshStandardMaterial({
      color: palette.road,
      roughness: this.level.wetRoad ? 0.38 : 0.72,
      metalness: this.level.wetRoad ? 0.18 : 0.02
    });
    const segmentLength = 28;
    for (let z = 24; z > -this.level.length - 50; z -= segmentLength) {
      const center = this.getRoadCenter(z);
      const nextCenter = this.getRoadCenter(z - segmentLength);
      const road = new THREE.Mesh(new THREE.BoxGeometry(17, 0.35, segmentLength + 2), roadMat);
      road.position.set(center, -0.2, z - segmentLength / 2);
      road.rotation.y = Math.atan2(nextCenter - center, segmentLength);
      road.receiveShadow = true;
      this.scene.add(road);
    }

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(90, this.level.length + 180),
      new THREE.MeshStandardMaterial({ color: visual.ground, roughness: 0.85 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.z = -this.level.length / 2 + 15;
    ground.receiveShadow = true;
    this.scene.add(ground);

    this.world.createCollider(RAPIER.ColliderDesc.cuboid(8.5, 0.2, this.level.length / 2 + 40).setTranslation(0, -0.28, -this.level.length / 2 + 30));

    this.addRoadPaint();
    this.addCityBlocks();
    this.addRouteDressing();
    this.addRedLights();
    this.addWeather();
  }

  getRouteVisualProfile() {
    return routeVisualProfiles[this.level.theme] ?? routeVisualProfiles.market;
  }

  getRoadCenter(z) {
    const curve = this.level.roadCurve ?? { amplitude: 0, frequency: 1, phase: 0 };
    if (!curve.amplitude) return 0;
    const progress = clamp((12 - z) / (this.level.length + 12), 0, 1);
    const wave = Math.sin(progress * Math.PI * 2 * curve.frequency + curve.phase);
    const secondary = Math.sin(progress * Math.PI * 4.2 + curve.phase * 0.7) * 0.24;
    return (wave + secondary) * curve.amplitude;
  }

  getRoadAngle(z) {
    const ahead = this.getRoadCenter(z - 8);
    const behind = this.getRoadCenter(z + 8);
    return Math.atan2(ahead - behind, 16);
  }

  getRoadX(laneOffset, z) {
    return this.getRoadCenter(z) + laneOffset;
  }

  addRoadPaint() {
    const visual = this.getRouteVisualProfile();
    const lineMat = new THREE.MeshBasicMaterial({ color: this.level.wetRoad ? 0xdbeafe : 0xf4f0d8, transparent: true, opacity: this.level.wetRoad ? 0.58 : 0.78 });
    const edgeMat = new THREE.MeshBasicMaterial({ color: visual.rim, transparent: true, opacity: this.level.wetRoad ? 0.32 : 0.18 });
    for (let z = 10; z > -this.level.length; z -= 22) {
      const center = this.getRoadCenter(z);
      const angle = this.getRoadAngle(z);
      for (const x of [-4.05, -1.35, 1.35, 4.05]) {
        const dash = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.03, 7.5), lineMat);
        dash.position.set(center + x, 0.03, z);
        dash.rotation.y = angle;
        this.scene.add(dash);
      }
    }

    for (let z = 10; z > -this.level.length; z -= 18) {
      const center = this.getRoadCenter(z);
      const angle = this.getRoadAngle(z);
      for (const x of [-8.45, 8.45]) {
        const edge = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.035, 12), edgeMat);
        edge.position.set(center + x, 0.035, z);
        edge.rotation.y = angle;
        this.scene.add(edge);
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
        const buildingZ = z + rand(-5, 5);
        building.position.set(this.getRoadCenter(buildingZ) + side * rand(15, 27), height / 2 - 0.15, buildingZ);
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
      const stallZ = z + rand(-20, 20);
      stall.position.set(this.getRoadCenter(stallZ) + side * rand(11.5, 14.5), 0, stallZ);
      stall.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;
      this.scene.add(stall);
    }

    for (let z = -110; z > -this.level.length; z -= 180) {
      const flags = createPrayerFlags(rand(5, 8));
      flags.position.set(this.getRoadCenter(z), rand(5.4, 7.2), z);
      flags.rotation.y = rand(-0.25, 0.25);
      this.scene.add(flags);
    }

    this.addGameplayLandmarks();

    const landmarkPositions = [-this.level.length * 0.34, -this.level.length * 0.68];
    for (const [index, z] of landmarkPositions.entries()) {
      const side = index % 2 === 0 ? 1 : -1;
      const landmark = createLandmark(this.level.theme, this.level.palette.accent);
      landmark.position.set(this.getRoadCenter(z) + side * 23, 0, z);
      landmark.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;
      landmark.scale.setScalar(index === 0 ? 1 : 0.82);
      this.scene.add(landmark);
    }

    this.addStreetProps();
  }

  addGameplayLandmarks() {
    const landmarks = this.level.landmarks ?? [];
    for (const item of landmarks) {
      const z = -this.level.length * item.at;
      const landmark = createRouteLandmark(item.type, {
        label: item.label,
        accent: this.level.palette.accent,
        theme: this.level.theme
      });

      if (item.type === 'gateArch' || item.type === 'riverBridge') {
        landmark.position.set(this.getRoadCenter(z), 0, z);
      } else {
        const side = item.side ?? 1;
        landmark.position.set(this.getRoadCenter(z) + side * 22, 0, z);
        landmark.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;
        landmark.scale.setScalar(item.type === 'temple' ? 1.15 : 1);
      }

      this.scene.add(landmark);
      this.addLandmarkSilhouette(item, landmark);
    }
  }

  addLandmarkSilhouette(item, landmark) {
    const visual = this.getRouteVisualProfile();
    const accent = new THREE.Color(visual.rim ?? this.level.palette.accent);

    if (item.type === 'gateArch') {
      const topGlow = new THREE.Mesh(
        new THREE.BoxGeometry(19.4, 0.12, 0.18),
        new THREE.MeshBasicMaterial({ color: accent, transparent: true, opacity: 0.52 })
      );
      topGlow.position.set(0, 6.16, landmark.position.z - 0.74);
      this.scene.add(topGlow);
      return;
    }

    if (item.type === 'riverBridge') {
      const waterGlow = new THREE.Mesh(
        new THREE.PlaneGeometry(26, 16),
        new THREE.MeshBasicMaterial({ color: accent, transparent: true, opacity: 0.12, depthWrite: false })
      );
      waterGlow.rotation.x = -Math.PI / 2;
      waterGlow.position.set(0, 0.012, landmark.position.z);
      this.scene.add(waterGlow);
      return;
    }

    const side = item.side ?? (Math.sign(landmark.position.x) || 1);
    const height = item.type === 'temple' ? 7.2 : item.type === 'busPark' ? 4.6 : 4.2;
    const width = item.type === 'temple' ? 8.6 : item.type === 'busPark' ? 9.2 : 6.4;
    const backdrop = new THREE.Mesh(
      new THREE.PlaneGeometry(width, height),
      new THREE.MeshBasicMaterial({ color: 0x101418, transparent: true, opacity: this.level.wetRoad ? 0.2 : 0.16, depthWrite: false })
    );
    backdrop.position.set(landmark.position.x + side * 1.5, height / 2 + 0.3, landmark.position.z + 0.35);
    backdrop.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;
    this.scene.add(backdrop);

    const rimMarker = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, height * 0.72, 0.12),
      new THREE.MeshBasicMaterial({ color: accent, transparent: true, opacity: 0.7 })
    );
    rimMarker.position.set(landmark.position.x - side * 3.7, height / 2, landmark.position.z - 0.85);
    this.scene.add(rimMarker);
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
        const propZ = z + rand(-12, 12);
        const x = this.getRoadCenter(propZ) + side * (type === 'puddle' ? rand(8.9, 10.3) : rand(10.8, 14.6));
        prop.position.set(x, 0, propZ);
        prop.rotation.y = side > 0 ? -Math.PI / 2 + rand(-0.08, 0.08) : Math.PI / 2 + rand(-0.08, 0.08);
        if (type === 'puddle') prop.scale.setScalar(rand(0.75, 1.15));
        if (type === 'bricks' || type === 'barrier') prop.scale.setScalar(rand(0.85, 1.25));
        this.scene.add(prop);
      }
    }

    for (let z = -135; z > -this.level.length; z -= 215) {
      const wires = createStreetProp('wires', { accent: this.level.palette.accent });
      const wireZ = z + rand(-18, 18);
      wires.position.set(this.getRoadCenter(wireZ), 0, wireZ);
      this.scene.add(wires);
    }
  }

  addRedLights() {
    const stops = this.level.redLights ?? [];
    for (const [index, at] of stops.entries()) {
      const z = -this.level.length * at;
      const center = this.getRoadCenter(z);
      const angle = this.getRoadAngle(z);
      const group = new THREE.Group();
      const poleMat = new THREE.MeshStandardMaterial({ color: 0x2b3034, roughness: 0.6 });
      const redMat = new THREE.MeshBasicMaterial({ color: 0xff2438, transparent: true, opacity: 1 });
      const greenMat = new THREE.MeshBasicMaterial({ color: 0x31d67b, transparent: true, opacity: 0.34 });
      const amberMat = new THREE.MeshBasicMaterial({ color: 0xffcf42, transparent: true, opacity: 0.34 });
      const housingMat = new THREE.MeshStandardMaterial({ color: 0x101418, roughness: 0.5 });
      const glowMat = new THREE.MeshBasicMaterial({ color: 0xff2438, transparent: true, opacity: 0.18, depthWrite: false });

      const gantry = new THREE.Mesh(new THREE.BoxGeometry(18.4, 0.26, 0.26), poleMat);
      gantry.position.set(center, 5.92, z - 0.6);
      gantry.rotation.y = angle;
      group.add(gantry);

      const gantryBack = new THREE.Mesh(new THREE.BoxGeometry(18.4, 0.12, 0.12), poleMat);
      gantryBack.position.set(center, 5.55, z - 0.35);
      gantryBack.rotation.y = angle;
      group.add(gantryBack);

      const overheadBox = new THREE.Mesh(new THREE.BoxGeometry(4.55, 1.58, 0.44), housingMat);
      overheadBox.position.set(center, 5.48, z - 0.82);
      overheadBox.rotation.y = angle;
      group.add(overheadBox);

      const overheadRed = new THREE.Mesh(new THREE.SphereGeometry(0.5, 24, 16), redMat.clone());
      overheadRed.name = 'trafficSignalLamp';
      overheadRed.userData.signalColor = 'red';
      overheadRed.position.set(center - 0.95, 5.48, z - 1.09);
      group.add(overheadRed);

      const overheadAmber = new THREE.Mesh(new THREE.SphereGeometry(0.5, 20, 12), amberMat.clone());
      overheadAmber.name = 'trafficSignalLamp';
      overheadAmber.userData.signalColor = 'yellow';
      overheadAmber.position.set(center, 5.48, z - 1.1);
      group.add(overheadAmber);

      const overheadGreen = new THREE.Mesh(new THREE.SphereGeometry(0.5, 20, 12), greenMat.clone());
      overheadGreen.name = 'trafficSignalLamp';
      overheadGreen.userData.signalColor = 'green';
      overheadGreen.position.set(center + 0.95, 5.48, z - 1.1);
      group.add(overheadGreen);

      const redGlow = new THREE.Mesh(new THREE.PlaneGeometry(5.4, 2.3), glowMat.clone());
      redGlow.name = 'redSignalGlow';
      redGlow.position.set(center, 5.48, z - 1.15);
      redGlow.rotation.y = angle;
      group.add(redGlow);

      for (const side of [-1, 1]) {
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 6.2, 12), poleMat);
        pole.position.set(center + side * 8.65, 2.95, z);
        group.add(pole);
        const box = new THREE.Mesh(new THREE.BoxGeometry(1.08, 1.78, 0.42), housingMat);
        box.position.set(center + side * 8.65, 5.02, z - 0.45);
        group.add(box);
        const red = new THREE.Mesh(new THREE.SphereGeometry(0.34, 20, 14), redMat.clone());
        red.name = 'trafficSignalLamp';
        red.userData.signalColor = 'red';
        red.position.set(center + side * 8.65, 5.46, z - 0.71);
        group.add(red);
        const amber = new THREE.Mesh(new THREE.SphereGeometry(0.24, 16, 10), amberMat.clone());
        amber.name = 'trafficSignalLamp';
        amber.userData.signalColor = 'yellow';
        amber.position.set(center + side * 8.65, 5.0, z - 0.71);
        group.add(amber);
        const green = new THREE.Mesh(new THREE.SphereGeometry(0.24, 16, 10), greenMat.clone());
        green.name = 'trafficSignalLamp';
        green.userData.signalColor = 'green';
        green.position.set(center + side * 8.65, 4.56, z - 0.71);
        group.add(green);
      }
      const stripe = new THREE.Mesh(
        new THREE.BoxGeometry(16.4, 0.035, 0.72),
        new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.82 })
      );
      stripe.position.set(center, 0.055, z + 2.2);
      stripe.rotation.y = angle;
      group.add(stripe);

      const zebraMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.78 });
      for (let i = 0; i < 7; i += 1) {
        const zebra = new THREE.Mesh(new THREE.BoxGeometry(14.6, 0.032, 0.42), zebraMat);
        zebra.position.set(center, 0.068, z + 3.4 + i * 0.72);
        zebra.rotation.y = angle;
        group.add(zebra);
      }

      const stopZone = new THREE.Mesh(
        new THREE.PlaneGeometry(17, 11),
        new THREE.MeshBasicMaterial({ color: 0xffcf42, transparent: true, opacity: 0.06, depthWrite: false })
      );
      stopZone.rotation.x = -Math.PI / 2;
      stopZone.rotation.z = -angle;
      stopZone.position.set(center, 0.061, z + 1.2);
      group.add(stopZone);

      const light = new THREE.PointLight(0xff2438, 2.4, 20, 1.6);
      light.name = 'redSignalLight';
      light.position.set(center, 5.4, z - 1.2);
      group.add(light);

      this.scene.add(group);
      const states = ['red', 'yellow', 'green'];
      this.redLights.push({
        z,
        center,
        group,
        active: true,
        hit: false,
        index,
        signal: states[(index + this.levelIndex) % states.length],
        signalTimer: rand(1.4, 3.4)
      });
    }
  }

  addWeather() {
    if (!this.level.wetRoad) return;
    const count = this.isMobileViewport() ? 320 : 520;
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count);
    for (let i = 0; i < count; i += 1) {
      positions[i * 3] = rand(-24, 24);
      positions[i * 3 + 1] = rand(3, 20);
      positions[i * 3 + 2] = rand(-45, 35);
      velocities[i] = rand(18, 30);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const material = new THREE.PointsMaterial({
      color: 0xdbeafe,
      size: 0.08,
      transparent: true,
      opacity: 0.62,
      depthWrite: false
    });
    const rain = new THREE.Points(geometry, material);
    rain.name = 'monsoonRain';
    rain.frustumCulled = false;
    this.scene.add(rain);

    const mist = new THREE.Mesh(
      new THREE.PlaneGeometry(42, 18),
      new THREE.MeshBasicMaterial({ color: 0xdbeafe, transparent: true, opacity: 0.08, depthWrite: false })
    );
    mist.name = 'monsoonMist';
    const baseZ = this.player?.position.z ?? 0;
    mist.position.set(0, 5.5, baseZ - 25);
    mist.rotation.x = -0.2;
    this.scene.add(mist);

    this.weather = { rain, mist, positions, velocities };
  }

  updateWeather(delta) {
    if (!this.weather) return;
    const { rain, mist, positions, velocities } = this.weather;
    const playerZ = this.player?.position.z ?? 0;
    const playerX = this.player?.position.x ?? 0;
    for (let i = 0; i < velocities.length; i += 1) {
      const offset = i * 3;
      positions[offset] -= delta * 2.4;
      positions[offset + 1] -= velocities[i] * delta;
      positions[offset + 2] += delta * 7.5;
      if (positions[offset + 1] < 0.2 || positions[offset + 2] > 36) {
        positions[offset] = rand(-24, 24);
        positions[offset + 1] = rand(12, 22);
        positions[offset + 2] = rand(-48, -22);
      }
    }
    rain.geometry.attributes.position.needsUpdate = true;
    rain.position.set(playerX * 0.35, 0, playerZ - 8);
    mist.position.set(playerX * 0.2, 5.5, playerZ - 28);
    mist.quaternion.copy(this.camera.quaternion);
  }

  buildPlayer() {
    this.player = createTempo(this.level.routeBoard, this.getSelectedSkin());
    this.player.position.set(this.getRoadCenter(12), 0.9, 12);
    this.scene.add(this.player);

    const rb = RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(this.getRoadCenter(12), 0.9, 12);
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
    const totalPassengers = this.level.passengerGoal + (this.level.extraPassengers ?? 3);
    const spacing = this.level.length / (totalPassengers + 1);
    for (let i = 0; i < totalPassengers; i += 1) {
      const lane = choice([LANES[0], LANES[4]]);
      const z = -spacing * (i + 0.75) + rand(-12, 12);
      const x = this.getRoadX(lane, z);
      const personality = this.getPassengerPersonality(i);
      const passenger = this.createPassenger(x, z, i, personality);
      this.pickups.push({ mesh: passenger, collected: false, z, x, lane, index: i, personality, value: 120 + i * 12 + personality.fareBonus });
      this.spawnedSlots.push({ x, z, radius: 10 });
    }
  }

  getPassengerPersonality(index) {
    const routeShift = this.levelIndex * 2;
    return passengerPersonalities[(index + routeShift) % passengerPersonalities.length];
  }

  createPassenger(x, z, index, personality = null) {
    const group = createPassengerMesh(index);
    group.position.set(x, 0, z);
    this.scene.add(group);
    this.attachPassengerCallout(group, index, personality ?? this.getPassengerPersonality(index));
    this.attachPassengerModel(group, index);
    return group;
  }

  attachPassengerCallout(group, index, personality) {
    const marker = group.getObjectByName('pickupMarker');
    if (!marker) return;
    const label = this.getPassengerCalloutLabel(index, personality);
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: this.createPassengerCalloutTexture(label, personality?.id),
      transparent: true,
      depthWrite: false
    }));
    sprite.name = 'passengerCallout';
    sprite.position.set(0, 2.55, 0);
    sprite.scale.set(2.4, 0.9, 1);
    marker.add(sprite);
  }

  getPassengerCalloutLabel(index, personality) {
    const labels = {
      commuter: ['Tempo!', 'Office!'],
      student: ['School!', 'Tempo!'],
      vendor: ['Yeta!', 'Bazar!'],
      tourist: ['Stupa?', 'Tempo!'],
      elder: ['Roknus!', 'Bistarai!']
    };
    const pool = labels[personality?.id] ?? ['Tempo!', 'Yeta!'];
    return pool[(index + this.levelIndex) % pool.length];
  }

  createPassengerCalloutTexture(label, personalityId = 'commuter') {
    const key = `${personalityId}:${label}`;
    if (passengerCalloutTextureCache.has(key)) return passengerCalloutTextureCache.get(key);

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 192;
    const ctx = canvas.getContext('2d');
    const colors = {
      commuter: '#ffcf42',
      student: '#74c0fc',
      vendor: '#7bed9f',
      tourist: '#f8f1dc',
      elder: '#ffd6a5'
    };
    const bubble = colors[personalityId] ?? '#ffcf42';
    ctx.font = '900 64px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.fillStyle = 'rgba(10, 15, 18, 0.9)';
    ctx.strokeStyle = bubble;
    ctx.lineWidth = 10;
    const x = 28;
    const y = 28;
    const width = canvas.width - 56;
    const height = 112;
    const radius = 28;
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(canvas.width / 2 + 24, y + height);
    ctx.lineTo(canvas.width / 2, y + height + 34);
    ctx.lineTo(canvas.width / 2 - 24, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = bubble;
    ctx.fillText(label.toUpperCase(), canvas.width / 2, y + height / 2 + 2, width - 46);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    passengerCalloutTextureCache.set(key, texture);
    return texture;
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
      const { x, z } = this.isMovingTrafficType(type)
        ? this.findPacedTrafficSlot(start, end, type, i, count)
        : this.findObstacleSlot(start, end, type);
      const variant = type === 'car' ? i : 0;
      const mesh = this.createObstacleMesh(type, variant);
      mesh.position.set(x, 0.6, z);
      mesh.rotation.y = this.getRoadAngle(z);
      this.scene.add(mesh);

      const rb = this.world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(x, 0.6, z));
      const half = this.getObstacleHalfExtents(type, variant);
      this.world.createCollider(RAPIER.ColliderDesc.cuboid(...half), rb);
      const ai = this.getTrafficAiProfile(type, variant);
      this.entities.push({
        type,
        variant,
        mesh,
        body: rb,
        x,
        z,
        baseX: x,
        baseLane: this.getNearestLaneOffset(x, z),
        baseZ: z,
        laneTarget: x,
        aiOffset: 0,
        aiSpeed: ai.speed,
        aiRange: ai.range,
        drift: ai.drift,
        hit: false,
        hornReact: 0,
        alertSide: 0,
        wobble: rand(0, Math.PI * 2),
        penalty: type === 'police' ? 2 : 1
      });
      this.spawnedSlots.push({ x, z, radius: type === 'police' ? 13 : 9 });
    }
  }

  isMovingTrafficType(type) {
    return type === 'car' || type === 'cyclist' || type === 'cow';
  }

  findPacedTrafficSlot(start, end, type, index, count) {
    const minGap = this.getTrafficSpawnGap(type);
    const lanePool = this.getTrafficLanePool(type);
    const span = Math.abs(end - start);
    const segment = span / Math.max(1, count);
    const baseZ = start - segment * (index + 0.5);

    for (let attempt = 0; attempt < 90; attempt += 1) {
      const laneIndex = (index + attempt * 2 + Math.floor(attempt / lanePool.length)) % lanePool.length;
      const x = lanePool[laneIndex];
      const jitter = rand(-segment * 0.34, segment * 0.34);
      const z = clamp(baseZ + jitter + Math.sin(index * 1.7 + attempt) * 4, end, start);
      const absoluteX = this.getRoadX(x, z);
      if (this.isTrafficSlotClear(absoluteX, z, type, minGap)) {
        this.reserveTrafficLaneSlot(absoluteX, z, minGap);
        return { x: absoluteX, z };
      }
    }

    const fallback = this.findObstacleSlot(start, end, type);
    this.reserveTrafficLaneSlot(fallback.x, fallback.z, minGap);
    return fallback;
  }

  getTrafficSpawnGap(type) {
    if (type === 'cyclist') return 18;
    if (type === 'cow') return 24;
    return 28;
  }

  getTrafficLanePool(type) {
    if (type === 'cow') return LANES;
    if (type === 'cyclist') return [LANES[0], LANES[1], LANES[3], LANES[4]];
    return LANES.slice(1, -1);
  }

  getNearestLaneOffset(x, z) {
    const center = this.getRoadCenter(z);
    return LANES.reduce((nearest, lane) => {
      return Math.abs(center + lane - x) < Math.abs(center + nearest - x) ? lane : nearest;
    }, LANES[2]);
  }

  isTrafficSlotClear(x, z, type, minGap) {
    const blocked = this.spawnedSlots.some((slot) => Math.abs(slot.z - z) < slot.radius + minGap && Math.abs(slot.x - x) < 2.3);
    if (blocked) return false;

    const nearPassenger = this.pickups.some((pickup) => Math.abs(pickup.z - z) < 18 && Math.abs(pickup.x - x) < 3.4);
    if (nearPassenger) return false;

    const laneSlots = this.trafficLaneSlots.get(x) ?? [];
    return laneSlots.every((slot) => Math.abs(slot.z - z) > slot.gap + minGap);
  }

  reserveTrafficLaneSlot(x, z, gap) {
    const laneSlots = this.trafficLaneSlots.get(x) ?? [];
    laneSlots.push({ z, gap });
    this.trafficLaneSlots.set(x, laneSlots);
  }

  getTrafficAiProfile(type, variant = 0) {
    if (type === 'cyclist') return { speed: rand(7.2, 10.8), range: 0, drift: 0.55 };
    if (type === 'cow') return { speed: rand(1.2, 2.1), range: 0, drift: 0.32 };
    if (type === 'police') return { speed: 0, range: 0, drift: 0.18 };
    const kind = variant % 4;
    if (kind === 1) return { speed: rand(6.0, 8.2), range: 0, drift: 0.34 };
    if (kind === 3) return { speed: rand(10.5, 15.0), range: 0, drift: 0.62 };
    return { speed: rand(8.4, 12.2), range: 0, drift: 0.42 };
  }

  getObstacleHalfExtents(type, variant = 0) {
    if (type === 'cyclist') return [0.55, 0.9, 0.9];
    if (type === 'cow') return [0.9, 0.65, 1.25];
    if (type === 'police') return [1.1, 0.75, 1.6];
    const kind = variant % 4;
    if (kind === 1) return [1.25, 0.9, 2.15];
    if (kind === 3) return [0.58, 0.9, 1.1];
    return [1.1, 0.75, 1.6];
  }

  findObstacleSlot(start, end, type) {
    const minGap = type === 'police' ? 15 : 10;
    for (let attempt = 0; attempt < 80; attempt += 1) {
      const z = rand(start, end);
      const lanePool = type === 'cow' ? LANES : LANES.slice(1, -1);
      const x = choice(lanePool);
      const absoluteX = this.getRoadX(x, z);
      const blocked = this.spawnedSlots.some((slot) => Math.abs(slot.z - z) < slot.radius + minGap && Math.abs(slot.x - absoluteX) < 1.8);
      const nearPassenger = this.pickups.some((pickup) => Math.abs(pickup.z - z) < 16 && Math.abs(pickup.x - absoluteX) < 3.1);
      if (!blocked && !nearPassenger) return { x: absoluteX, z };
    }
    const z = rand(start, end);
    return { x: this.getRoadX(choice(LANES.slice(1, -1)), z), z };
  }

  createObstacleMesh(type, variant = 0) {
    const mesh = createObstacle(type, variant);
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
      mesh.rotation.y = this.getRoadAngle(z) + rand(-0.25, 0.25);
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
      const x = this.getRoadX(choice(lanePool), z);
      const blocked = this.spawnedSlots.some((slot) => Math.abs(slot.z - z) < slot.radius + minGap && Math.abs(slot.x - x) < 2.4);
      const nearPassenger = this.pickups.some((pickup) => Math.abs(pickup.z - z) < 18 && Math.abs(pickup.x - x) < 3.3);
      if (!blocked && !nearPassenger) return { x, z };
    }
    const z = rand(start, end);
    return { x: this.getRoadX(choice(LANES.slice(1, -1)), z), z };
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
    const center = this.getRoadCenter(z);
    const mat = new THREE.MeshStandardMaterial({ color: this.level.palette.accent, roughness: 0.45 });
    for (const x of [-7, 7]) {
      const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.5, 5.5, 0.5), mat);
      pillar.position.set(center + x, 2.6, z);
      pillar.castShadow = true;
      this.scene.add(pillar);
    }
    const banner = new THREE.Mesh(new THREE.BoxGeometry(14.5, 0.75, 0.35), mat);
    banner.position.set(center, 5.25, z);
    banner.castShadow = true;
    this.scene.add(banner);
  }

  setupBonusObjectives() {
    const landmarksByLabel = new Map((this.level.landmarks ?? []).map((landmark) => [landmark.label, landmark]));
    this.bonusObjectives = (this.level.bonusObjectives ?? []).map((objective, index) => {
      const landmark = landmarksByLabel.get(objective.landmark);
      return {
        ...objective,
        index,
        z: landmark ? -this.level.length * landmark.at : -this.level.length,
        completed: false,
        missed: false
      };
    });
  }

  update(delta) {
    if (!this.running || this.pausedByOverlay) return;
    if (this.routeIntro.active) {
      this.updateRouteIntro(delta);
      this.updateWeather(delta);
      this.updateTutorialCoach(delta);
      this.renderHud();
      return;
    }

    this.state.elapsed += delta;
    this.state.invulnerable = Math.max(0, this.state.invulnerable - delta);
    this.feedbackTimer = Math.max(0, this.feedbackTimer - delta);
    this.passengerBarkTimer = Math.max(0, this.passengerBarkTimer - delta);
    this.passengerCalloutTimer = Math.max(0, this.passengerCalloutTimer - delta);
    this.hornPulse = Math.max(0, this.hornPulse - delta);
    this.state.comboTimer = Math.max(0, this.state.comboTimer - delta);
    this.updateTutorialCoach(delta);
    this.updateRedLightSignals(delta);
    if (this.state.comboTimer <= 0 && this.state.combo > 1) {
      this.state.combo = 1;
    }
    this.shake = Math.max(0, this.shake - delta);

    const nearbyPickup = this.getNearbyPickup();
    this.state.pickupAssist = nearbyPickup ? 1 : Math.max(0, this.state.pickupAssist - delta * 2.4);
    this.updatePassengerCallouts();

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
    this.state.steer += ((right ? 1 : 0) - (left ? 1 : 0)) * (15.2 + handlingBoost * 1.4) * delta * slide;
    this.state.steer *= this.level.wetRoad ? 0.9 : 0.76;

    const previousZ = this.player.position.z;
    const previousCenter = this.getRoadCenter(previousZ);
    const nextZ = this.player.position.z - this.state.speed * delta;
    const nextCenter = this.getRoadCenter(nextZ);
    const curveCarry = (nextCenter - previousCenter) * 0.68;
    this.player.position.z = nextZ;
    this.player.position.x = clamp(this.player.position.x + curveCarry + this.state.steer * delta * 7.8, nextCenter - 6.9, nextCenter + 6.9);
    this.player.rotation.z = -this.state.steer * 0.085;
    this.player.rotation.y = this.getRoadAngle(this.player.position.z) - this.state.steer * 0.032;
    this.playerBody.setNextKinematicTranslation(this.player.position);

    this.animateEntities(delta);
    this.checkBonusObjectives();
    this.checkRedLights();
    this.checkPickups();
    this.checkHazards(delta);
    this.checkCollisions();
    this.checkEndState();
    this.updateEffects(delta);

    this.world.step();
    this.updateCamera(delta);
    this.updateWeather(delta);
    this.renderHud();
  }

  updateRouteIntro(delta) {
    this.routeIntro.age += delta;
    const t = clamp(this.routeIntro.age / this.routeIntro.duration, 0, 1);
    const eased = 1 - (1 - t) ** 3;
    const start = new THREE.Vector3(0, 15.5, this.player.position.z + 58);
    const end = new THREE.Vector3(this.player.position.x * 0.38, 8.6, this.player.position.z + 15.5);
    const lookStart = new THREE.Vector3(0, 1.8, this.player.position.z - 62);
    const lookEnd = new THREE.Vector3(this.player.position.x * 0.2, 1.4, this.player.position.z - 18);
    this.camera.position.lerpVectors(start, end, eased);
    this.camera.lookAt(lookStart.lerp(lookEnd, eased));
    this.updateRouteIntroLabels(t);

    if (this.ui.routeCountdownValue) {
      const remaining = this.routeIntro.duration - this.routeIntro.age;
      this.ui.routeCountdownValue.textContent = remaining <= 0.55 ? 'GO' : Math.max(1, Math.ceil(remaining - 0.55)).toString();
    }

    if (this.ui.routeCountdownLabel && this.routeIntroLabels.length > 0) {
      const activeIndex = clamp(Math.floor(t * this.routeIntroLabels.length), 0, this.routeIntroLabels.length - 1);
      this.ui.routeCountdownLabel.textContent = this.routeIntroLabels[activeIndex].item.label;
    }

    if (this.routeIntro.age >= this.routeIntro.duration) {
      this.finishRouteIntro();
    }
  }

  updateRouteIntroLabels(introProgress) {
    if (!this.routeIntroLabels?.length) return;
    for (const label of this.routeIntroLabels) {
      const start = label.index / this.routeIntroLabels.length;
      const local = clamp((introProgress - start) * this.routeIntroLabels.length, 0, 1);
      const fadeOut = clamp((0.98 - introProgress) * 8, 0, 1);
      const pulse = 1 + Math.sin(this.routeIntro.age * 5.5 + label.index) * 0.035;
      const opacity = Math.sin(local * Math.PI) * fadeOut;
      label.sprite.material.opacity = opacity;
      label.sprite.quaternion.copy(this.camera.quaternion);
      label.sprite.scale.set(7.2 * pulse, 1.7 * pulse, 1);
    }
  }

  animateEntities(delta) {
    for (const entity of this.entities) {
      this.updateTrafficAi(entity, delta);
      if (entity.type === 'cyclist') {
        entity.mesh.rotation.z = Math.sin(this.state.elapsed * 2.8 + entity.wobble) * 0.08;
      }
      if (entity.type === 'cow') {
        entity.mesh.rotation.y += Math.sin(this.state.elapsed * 1.6 + entity.wobble) * 0.01;
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
        const callout = pickup.mesh.getObjectByName('passengerCallout');
        if (callout) {
          const dz = Math.abs(this.player.position.z - pickup.mesh.position.z);
          const isTarget = this.getCurrentTarget().position === pickup.mesh.position;
          const nearScale = isTarget ? 1.18 : dz < 55 ? 1.05 : 0.88;
          const pulse = 1 + Math.sin(this.state.elapsed * 5.6 + pickup.index) * (isTarget ? 0.12 : 0.06);
          callout.quaternion.copy(this.camera.quaternion);
          callout.scale.set(2.4 * nearScale * pulse, 0.9 * nearScale * pulse, 1);
          callout.material.opacity = isTarget || dz < 70 ? 1 : 0.72;
        }
      }
    }
  }

  updatePassengerCallouts() {
    if (this.passengerCalloutTimer > 0 || this.passengerBarkTimer > 0) return;
    const nextPickup = this.pickups
      .filter((pickup) => !pickup.collected && pickup.mesh.position.z < this.player.position.z + 8)
      .sort((a, b) => b.mesh.position.z - a.mesh.position.z)[0];
    if (!nextPickup) return;

    const dx = Math.abs(nextPickup.mesh.position.x - this.player.position.x);
    const dz = Math.abs(nextPickup.mesh.position.z - this.player.position.z);
    if (dz > 62 || dx > 8.2) return;

    const callout = this.getPassengerCalloutLabel(nextPickup.index, nextPickup.personality);
    this.showPassengerBark(`${nextPickup.personality.prefix}: ${callout} Maya didi!`);
    this.playPassengerBarkSound(nextPickup.index);
    this.passengerCalloutTimer = 4.2;
  }

  updateTrafficAi(entity, delta) {
    if (entity.hit) return;

    const dynamic = ['car', 'cyclist', 'cow'].includes(entity.type);
    const playerDx = entity.mesh.position.x - this.player.position.x;
    const playerDz = entity.mesh.position.z - this.player.position.z;
    const nearPlayerAhead = playerDz < -3 && playerDz > -28 && Math.abs(playerDx) < 4.2;
    const blockedAhead = dynamic ? this.entities.some((other) => {
      if (other === entity || other.hit || other.type === 'police') return false;
      const dz = other.mesh.position.z - entity.mesh.position.z;
      return dz < -2 && dz > -12 && Math.abs(other.mesh.position.x - entity.mesh.position.x) < 2.8;
    }) : false;

    entity.hornReact = Math.max(0, entity.hornReact - delta * 1.8);
    const alert = entity.hornReact > 0 ? entity.hornReact : 0;
    const brakeFactor = blockedAhead || nearPlayerAhead ? 0.18 : 1;
    const crawl = dynamic ? entity.aiSpeed * brakeFactor * delta : 0;
    entity.aiOffset += crawl;

    const driftWave = Math.sin(this.state.elapsed * 0.75 + entity.wobble) * entity.drift;
    const alertNudge = alert ? (entity.alertSide || Math.sign(playerDx) || 1) * 1.15 * alert : 0;
    const avoidNudge = nearPlayerAhead ? Math.sign(playerDx || 1) * 0.7 : 0;
    const targetZ = entity.baseZ - entity.aiOffset;
    const roadCenter = this.getRoadCenter(targetZ);
    const previousX = entity.mesh.position.x;
    const previousZ = entity.mesh.position.z;
    const laneBaseX = roadCenter + (entity.baseLane ?? 0);

    entity.mesh.position.x += (laneBaseX + driftWave + alertNudge + avoidNudge - entity.mesh.position.x) * (1 - Math.pow(0.001, delta));
    entity.mesh.position.z += (targetZ - entity.mesh.position.z) * (1 - Math.pow(0.01, delta));
    const lateralVelocity = (entity.mesh.position.x - previousX) / Math.max(delta, 0.001);
    const forwardVelocity = (previousZ - entity.mesh.position.z) / Math.max(delta, 0.001);
    entity.x = entity.mesh.position.x;
    entity.z = entity.mesh.position.z;
    entity.body.setTranslation(entity.mesh.position, true);

    if (entity.type === 'car') {
      entity.mesh.rotation.y = this.getRoadAngle(entity.mesh.position.z) + clamp(lateralVelocity * -0.035, -0.22, 0.22) + Math.sin(this.state.elapsed * 1.4 + entity.wobble) * 0.015;
      entity.mesh.rotation.z = (blockedAhead ? 0.04 : 0) + alert * 0.05 * (entity.alertSide || 1);
    } else if (entity.type === 'cyclist') {
      entity.mesh.rotation.y = this.getRoadAngle(entity.mesh.position.z) + Math.sin(this.state.elapsed * 1.2 + entity.wobble) * 0.08 + clamp(lateralVelocity * -0.045, -0.25, 0.25) + alert * 0.18 * (entity.alertSide || 1);
      entity.mesh.rotation.x = clamp(forwardVelocity * -0.004, -0.05, 0.02);
    } else if (entity.type === 'cow') {
      entity.mesh.rotation.y = this.getRoadAngle(entity.mesh.position.z) + Math.sin(this.state.elapsed * 1.1 + entity.wobble) * 0.18 + alert * 0.25 * (entity.alertSide || 1);
    } else if (entity.type === 'police' && alert) {
      entity.mesh.rotation.y = alert * 0.2 * (entity.alertSide || 1);
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
    const finishZ = -this.level.length;
    return { label: 'Finish gate', position: new THREE.Vector3(this.getRoadCenter(finishZ), 0, finishZ) };
  }

  getActiveBonusObjective() {
    return this.bonusObjectives.find((objective) => !objective.completed && !objective.missed && this.player.position.z > objective.z);
  }

  checkBonusObjectives() {
    if (!this.bonusObjectives.length) return;
    for (const objective of this.bonusObjectives) {
      if (objective.completed || objective.missed) continue;
      if (this.player.position.z > objective.z) continue;

      if (this.isBonusObjectiveMet(objective)) {
        objective.completed = true;
        this.awardLandmarkBonus(objective);
      } else {
        objective.missed = true;
        this.showFeedback(`Bonus missed: ${objective.landmark}`, 'bad');
      }
    }
  }

  isBonusObjectiveMet(objective) {
    if (objective.type === 'passengersBefore') return this.state.passengers >= objective.count;
    if (objective.type === 'speedThrough') return this.state.speed >= objective.minSpeed;
    if (objective.type === 'comboBefore') return this.state.combo >= objective.combo;
    if (objective.type === 'cleanSegment') return this.state.collisions === 0;
    return false;
  }

  awardLandmarkBonus(objective) {
    this.state.landmarkBonus += objective.reward;
    this.state.score += objective.reward;
    const position = new THREE.Vector3(this.getRoadCenter(objective.z), 2.8, objective.z);
    this.spawnScorePopup(position, `BONUS +${objective.reward}`, 'combo');
    this.showFeedback(`Landmark bonus +${objective.reward}: ${objective.label}`, 'good');
    this.playTone(880, 0.12, 'triangle', 0.16);
    this.playTone(1320, 0.14, 'triangle', 0.11, 0.08);
  }

  checkRedLights() {
    if (!this.redLights.length) return;
    for (const light of this.redLights) {
      if (light.hit) continue;
      const dz = Math.abs(this.player.position.z - light.z);
      const dx = Math.abs(this.player.position.x - this.getRoadCenter(light.z));
      if (dz > 3.2 || dx > 8.2) continue;

      light.hit = true;
      this.setTrafficSignalCleared(light);
      const position = new THREE.Vector3(light.center, 2.6, light.z);
      if (light.signal === 'green') {
        this.state.score += 35;
        this.showFeedback('Green light +35', 'good');
        this.spawnScorePopup(position, '+35', 'good');
        this.playTone(740, 0.08, 'triangle', 0.09);
      } else if (light.signal === 'yellow') {
        if (this.state.speed < 16) {
          this.state.score += 30;
          this.showFeedback('Careful through yellow +30', 'good');
          this.spawnScorePopup(position, '+30', 'good');
          this.playTone(620, 0.08, 'triangle', 0.08);
        } else {
          this.showFeedback('Yellow light: careful!', 'bad');
          this.playTone(420, 0.08, 'triangle', 0.07);
        }
      } else if (this.state.speed < 10) {
        this.state.score += 40;
        this.showFeedback('Clean stop at red light +40', 'good');
        this.spawnScorePopup(position, '+40', 'good');
        this.playTone(660, 0.08, 'triangle', 0.09);
      } else {
        this.state.hearts -= 1;
        this.state.collisions += 1;
        this.state.collisionPenalty += 70;
        this.state.score = Math.max(0, this.state.score - 70);
        this.state.speed = Math.max(5, this.state.speed * 0.56);
        this.state.invulnerable = Math.max(this.state.invulnerable, 0.35);
        this.shake = Math.max(this.shake, 0.22);
        this.resetCombo();
        this.flashHit();
        this.playHitSound('police');
        this.showFeedback('Red light! -1 chance', 'bad');
        this.spawnScorePopup(position, '-70', 'bad');
      }
    }
  }

  updateRedLightSignals(delta) {
    if (!this.redLights.length || !this.camera) {
      this.hideTrafficSignalHud();
      return;
    }
    for (const light of this.redLights) {
      if (!light.hit) {
        light.signalTimer -= delta;
        if (light.signalTimer <= 0) {
          const nextStates = ['red', 'yellow', 'green'].filter((state) => state !== light.signal);
          light.signal = choice(nextStates);
          light.signalTimer = rand(1.25, 3.2);
        }
      }
      const dz = light.z - this.player.position.z;
      const approaching = dz < -8 && dz > -105 && !light.hit;
      const pulse = approaching ? 0.72 + Math.sin(this.state.elapsed * 8) * 0.28 : 0.72;
      const activeColor = this.getTrafficSignalColor(light.signal);
      light.group?.traverse((child) => {
        if (child.name === 'trafficSignalLamp' && child.material?.opacity !== undefined) {
          const isActive = child.userData.signalColor === light.signal;
          child.material.transparent = true;
          child.material.color?.setHex(isActive ? activeColor : this.getTrafficSignalColor(child.userData.signalColor, true));
          child.material.opacity = light.hit ? 0.24 : isActive ? pulse : 0.28;
        }
        if (child.name === 'redSignalGlow' && child.material) {
          child.material.color?.setHex(activeColor);
          child.material.opacity = light.hit ? 0.04 : 0.1 + pulse * 0.16;
          child.quaternion.copy(this.camera.quaternion);
        }
        if (child.name === 'redSignalLight') {
          child.color?.setHex(activeColor);
          child.intensity = light.hit ? 0.3 : approaching ? 3.4 : 2.2;
        }
      });
    }
    this.renderTrafficSignalHud();
  }

  getUpcomingTrafficSignal() {
    if (!this.player || !this.redLights.length) return null;
    return this.redLights
      .filter((light) => !light.hit)
      .map((light) => ({ light, distance: this.player.position.z - light.z }))
      .filter((item) => item.distance > -6 && item.distance < 95)
      .sort((a, b) => a.distance - b.distance)[0] ?? null;
  }

  renderTrafficSignalHud() {
    if (!this.ui.trafficSignalHud || this.pausedByOverlay) {
      this.hideTrafficSignalHud();
      return;
    }

    const upcoming = this.getUpcomingTrafficSignal();
    if (!upcoming) {
      this.hideTrafficSignalHud();
      return;
    }

    const { light, distance } = upcoming;
    this.ui.trafficSignalHud.classList.remove('hidden', 'red', 'yellow', 'green');
    this.ui.trafficSignalHud.classList.add(light.signal);
    if (this.ui.trafficSignalDistance) {
      this.ui.trafficSignalDistance.textContent = distance <= 8 ? 'At signal' : `${Math.round(distance)} m`;
    }
    this.ui.trafficSignalStack?.querySelectorAll('.signal-lamp').forEach((lamp) => {
      lamp.classList.toggle('active', lamp.dataset.signal === light.signal);
    });
  }

  hideTrafficSignalHud() {
    this.ui.trafficSignalHud?.classList.add('hidden');
  }

  getTrafficSignalColor(signal, dim = false) {
    if (signal === 'green') return dim ? 0x244535 : 0x31d67b;
    if (signal === 'yellow') return dim ? 0x5f4d20 : 0xffcf42;
    return dim ? 0x5a1c24 : 0xff2438;
  }

  setTrafficSignalCleared(light) {
    light.group?.traverse((child) => {
      if (child.name === 'trafficSignalLamp' && child.material) {
        child.material.color?.setHex(0x405056);
        child.material.transparent = true;
        child.material.opacity = 0.3;
      }
      if (child.name === 'redSignalLight') {
        child.color?.setHex(0x7bed9f);
        child.intensity = 0.8;
      }
    });
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
    const routeLines = routePassengerBarks[this.level.theme] ?? sharedPassengerBarks;
    const sharedLine = sharedPassengerBarks[(pickup.index + this.levelIndex) % sharedPassengerBarks.length];
    const linePool = pickup.index % 3 === 2 ? [...routeLines, sharedLine] : routeLines;
    const line = linePool[(pickup.index + this.levelIndex) % linePool.length];
    const speaker = pickup.personality?.prefix ?? this.getPassengerPersonality(pickup.index).prefix;
    return `${speaker}: ${line}`;
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

  createScorePopupTexture(label, tone = 'good') {
    const key = `${tone}:${label}`;
    if (scorePopupTextureCache.has(key)) return scorePopupTextureCache.get(key);

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 160;
    const ctx = canvas.getContext('2d');
    const fill = tone === 'bad' ? '#d94848' : tone === 'combo' ? '#ffcf42' : '#7bed9f';
    const text = tone === 'combo' ? '#141414' : '#ffffff';

    ctx.font = '900 58px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.fillStyle = 'rgba(10, 15, 18, 0.82)';
    ctx.strokeStyle = fill;
    ctx.lineWidth = 10;
    const x = 22;
    const y = 30;
    const width = canvas.width - 44;
    const height = 96;
    const radius = 18;
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = text;
    ctx.fillText(label, canvas.width / 2, y + height / 2 + 2, width - 34);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    scorePopupTextureCache.set(key, texture);
    return texture;
  }

  spawnScorePopup(position, label, tone = 'good') {
    const material = new THREE.SpriteMaterial({
      map: this.createScorePopupTexture(label, tone),
      transparent: true,
      depthWrite: false
    });
    const sprite = new THREE.Sprite(material);
    sprite.name = 'scorePopup';
    sprite.position.copy(position).add(new THREE.Vector3(0, 2.15, 0));
    sprite.scale.set(3.2, 1, 1);
    this.scene.add(sprite);
    this.effects.push({
      type: 'scorePopup',
      group: sprite,
      age: 0,
      duration: 0.95,
      start: sprite.position.clone(),
      drift: new THREE.Vector3(rand(-0.45, 0.45), 1.8, 0)
    });
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
      } else if (effect.type === 'scorePopup') {
        const t = clamp(effect.age / effect.duration, 0, 1);
        effect.group.position.copy(effect.start).addScaledVector(effect.drift, t);
        effect.group.material.opacity = life;
        const scale = 1 + Math.sin(Math.min(t, 0.5) * Math.PI) * 0.16;
        effect.group.scale.set(3.2 * scale, scale, 1);
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
          if (effect.type === 'scorePopup') effect.group.material.dispose();
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
        this.spawnScorePopup(pickup.mesh.position, `+${pickup.value}`, 'good');
        if (comboBonus > 0) this.spawnScorePopup(pickup.mesh.position, `x${this.state.combo} +${comboBonus}`, 'combo');
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
        this.spawnScorePopup(hazard.mesh.position, '-80', 'bad');
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
        this.spawnScorePopup(hazard.mesh.position, '-35', 'bad');
      } else {
        this.state.speed = Math.max(5, this.state.speed * 0.72);
        this.state.steer += rand(-0.55, 0.55);
        this.shake = Math.max(this.shake, 0.13);
        this.playNoise(0.08, 0.06);
        this.showFeedback('Slippery puddle', 'good');
        this.spawnScorePopup(hazard.mesh.position, 'SLOW', 'combo');
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
        this.spawnScorePopup(entity.mesh.position, `-${penalty}`, 'bad');
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
    const landmarkBonus = completed ? this.state.landmarkBonus : 0;
    const finalFare = Math.max(0, this.state.passengerFare + this.state.comboBonus + landmarkBonus + timeBonus + cleanBonus - this.state.collisionPenalty);
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
      landmarkBonus,
      bonusObjectives: this.bonusObjectives.map((objective) => ({
        label: objective.label,
        reward: objective.reward,
        completed: objective.completed,
        missed: objective.missed
      })),
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
    this.progress.routeStars[this.levelIndex] = Math.max(this.getRouteStars(this.levelIndex), result.stars);
    this.progress.wallet += result.finalFare;
    if (result.unlockedNext) this.progress.unlocked += 1;
    result.walletAfter = this.progress.wallet;
    this.saveProgress();
  }

  showResults(result) {
    this.running = false;
    this.pausedByOverlay = true;
    this.paused = false;
    this.hideTrafficSignalHud();
    if (this.tutorialCoach.active) {
      this.markTutorialSeen();
      this.tutorialCoach.active = false;
      this.hideTutorialCoach();
    }
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
    this.renderRewardBadges(result);
    this.ui.resultsPassengerFare.textContent = result.passengerFare.toString();
    this.ui.resultsTimeBonus.textContent = result.timeBonus.toString();
    this.ui.resultsCleanBonus.textContent = result.cleanBonus.toString();
    if (this.ui.resultsComboBonus) this.ui.resultsComboBonus.textContent = result.comboBonus.toString();
    if (this.ui.resultsLandmarkBonus) this.ui.resultsLandmarkBonus.textContent = result.landmarkBonus.toString();
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

  renderRewardBadges(result) {
    if (!this.ui.rewardBadges) return;
    const badges = this.getRewardBadges(result);
    this.ui.rewardBadges.innerHTML = badges.map((badge) => `
      <div class="reward-badge ${badge.tone}">
        <i>${badge.icon}</i>
        <div><strong>${badge.title}</strong><span>${badge.detail}</span></div>
      </div>
    `).join('');
  }

  getRewardBadges(result) {
    if (!result.completed) {
      return [
        { icon: '!', tone: 'bad', title: 'Route Failed', detail: 'Retry to protect the permit.' },
        { icon: '$', tone: 'bad', title: 'No Payout', detail: 'Finish the route to bank fare.' }
      ];
    }

    const badges = [
      { icon: '$', tone: 'good', title: `+${result.finalFare} Fare`, detail: `Fare bank ${result.walletAfter ?? this.progress.wallet}` }
    ];
    if (result.finalFare > result.oldBest) badges.push({ icon: '*', tone: 'good', title: 'New Best Fare', detail: `${result.oldBest} -> ${result.finalFare}` });
    if (result.unlockedNext) badges.push({ icon: '>', tone: 'good', title: 'New Route', detail: LEVELS[this.levelIndex + 1].name });
    if (result.stars === 3) badges.push({ icon: '3', tone: 'good', title: 'Three-Star Run', detail: 'Fast and clean.' });
    if (result.collisions === 0) badges.push({ icon: 'C', tone: 'good', title: 'Clean Driving', detail: `+${result.cleanBonus} clean bonus` });
    if (result.maxCombo >= 3) badges.push({ icon: 'x', tone: 'good', title: `x${result.maxCombo} Combo`, detail: `+${result.comboBonus} combo fare` });
    const completedBonuses = result.bonusObjectives?.filter((objective) => objective.completed) ?? [];
    if (completedBonuses.length > 0) badges.push({ icon: 'L', tone: 'good', title: 'Landmark Bonus', detail: `${completedBonuses.length}/${result.bonusObjectives.length} earned +${result.landmarkBonus}` });
    return badges;
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
    if (this.ui.speedValue) this.ui.speedValue.textContent = Math.round(this.state.speed * 3.2).toString();
    if (this.ui.speedNeedle) {
      const speedPercent = clamp(this.state.speed / 42, 0, 1);
      this.ui.speedNeedle.style.setProperty('--speed', `${Math.round(speedPercent * 100)}%`);
    }
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
    if (this.levelIndex >= 2) {
      this.hazards.forEach((hazard) => addDot(`hazard-dot ${hazard.type}-dot`, hazard.z));
    }
  }

  renderMinimap() {
    if (!this.ui.minimapPlayer) return;
    const progress = clamp(Math.abs(this.player.position.z - 12) / (this.level.length + 12), 0, 1);
    this.ui.minimapPlayer.style.left = `${progress * 100}%`;
    this.pickups.forEach((pickup, index) => {
      const dot = this.ui.minimapTrack?.querySelectorAll('.passenger-dot')[index];
      if (dot) dot.classList.toggle('collected', pickup.collected);
    });
    if (this.levelIndex >= 2) {
      this.hazards.forEach((hazard, index) => {
        const dot = this.ui.minimapTrack?.querySelectorAll('.hazard-dot')[index];
        if (dot) dot.classList.toggle('cleared', hazard.hit);
      });
    }
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
    if (this.ui.objective) {
      const bonus = this.getActiveBonusObjective();
      this.ui.objective.textContent = bonus
        ? `Bonus: ${bonus.label} +${bonus.reward}`
        : 'Drive through yellow rings to board passengers.';
    }
  }

  updateRouteUi() {
    this.ui.levelName.textContent = this.level.district;
    this.ui.routeTitle.textContent = this.level.name;
    this.ui.routeStory.textContent = this.level.story;
    this.ui.levelIndex.textContent = `${this.levelIndex + 1}/${LEVELS.length}`;
  }

  showIntro() {
    if (this.ui.overlayKicker) this.ui.overlayKicker.textContent = 'Tempo mission';
    if (this.ui.overlayTitle) this.ui.overlayTitle.textContent = this.level.name;
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
    this.hideTutorialCoach();
    this.hideTrafficSignalHud();
    this.ui.garage?.classList.add('hidden');
    this.ui.overlay?.classList.remove('loading');
    this.ui.overlayText.textContent = text;
    this.ui.startButton.textContent = buttonLabel;
    this.ui.startButton.classList.remove('hidden');
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
    this.renderer.setPixelRatio(this.getRenderPixelRatio());
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
