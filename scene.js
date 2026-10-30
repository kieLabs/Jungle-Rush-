import * as THREE from 'three';
import { CHARACTERS, POWERUPS, isPowerUpActive } from './core.js';

const LANE_X = [-3, 0, 3];
const SEGMENT_LENGTH = 28;
const SEGMENT_COUNT = 9;
const ZONES = [
  { name: 'LOST TEMPLE', sky: 0x789b74, fog: 0x6a8a65, ground: 0x68735a, accent: 0xb8a06b, weather: 'clear' },
  { name: 'DEEP JUNGLE', sky: 0x37694b, fog: 0x28543a, ground: 0x435d41, accent: 0x72b26c, weather: 'rain' },
  { name: 'FALLING WATERS', sky: 0x6b9c9a, fog: 0x60918e, ground: 0x627b77, accent: 0x75ccdb, weather: 'mist' },
  { name: 'HOLLOW CAVES', sky: 0x263a36, fog: 0x1c2d2a, ground: 0x3d4540, accent: 0xb6a978, weather: 'dark' },
  { name: 'EMBER VALLEY', sky: 0x704d3d, fog: 0x603e31, ground: 0x51453d, accent: 0xff8845, weather: 'embers' },
  { name: 'BROKEN SKY BRIDGE', sky: 0x91a7a0, fog: 0x71867b, ground: 0x777a67, accent: 0xd0bf8b, weather: 'wind' }
];

const OBSTACLES = [
  { id: 'stoneWall', label: 'STONE WALL', action: 'switch', kind: 'wall' },
  { id: 'fallenTree', label: 'FALLEN TREE', action: 'jump', kind: 'log' },
  { id: 'fireTrap', label: 'FIRE TRAP', action: 'jump', kind: 'fire' },
  { id: 'movingBarrier', label: 'MOVING BARRIER', action: 'switch', kind: 'barrier' },
  { id: 'spikes', label: 'SPIKES', action: 'jump', kind: 'spikes' },
  { id: 'deepGap', label: 'DEEP GAP', action: 'jump', kind: 'gap' },
  { id: 'brokenBridge', label: 'BROKEN BRIDGE', action: 'jump', kind: 'bridge' },
  { id: 'rollingRock', label: 'ROLLING ROCK', action: 'switch', kind: 'rock' },
  { id: 'lowBranch', label: 'LOW BRANCH', action: 'slide', kind: 'branch' },
  { id: 'ancientGate', label: 'ANCIENT GATE', action: 'slide', kind: 'gate' },
  { id: 'movingPlatform', label: 'MOVING PLATFORM', action: 'jump', kind: 'platform' },
  { id: 'waterJet', label: 'WATER JET', action: 'switch', kind: 'water' },
  { id: 'lavaPit', label: 'LAVA PIT', action: 'jump', kind: 'lava' },
  { id: 'fallingStone', label: 'FALLING STONE', action: 'switch', kind: 'falling' },
  { id: 'rotatingTrap', label: 'ROTATING TRAP', action: 'switch', kind: 'rotor' },
  { id: 'swingingBlade', label: 'SWINGING BLADE', action: 'slide', kind: 'blade' },
  { id: 'collapse', label: 'COLLAPSING PATH', action: 'jump', kind: 'collapse' },
  { id: 'narrowBridge', label: 'NARROW BRIDGE', action: 'switch', kind: 'narrow' }
];

const PICKUP_TYPES = ['coin', 'coin', 'coin', 'coin', 'gem', 'token', 'chest', 'power'];

export class JungleScene {
  constructor(host, save, callbacks = {}) {
    this.host = host;
    this.save = save;
    this.callbacks = callbacks;
    this.clock = new THREE.Clock();
    this.disposed = false;
    this.distance = 0;
    this.speed = 18;
    this.lane = 1;
    this.lanePosition = 0;
    this.jumpTime = 0;
    this.slideTime = 0;
    this.playerAction = 'run';
    this.danger = 0;
    this.elapsed = 0;
    this.entities = [];
    this.segments = [];
    this.particles = [];
    this.falling = false;
    this.fallElapsed = 0;
    this.materials = new Map();
    this.geometries = new Map();
    this.torchLights = [];
    this.clouds = [];
    this.lastZone = -1;
    this.mode = 'classic';
    this.quality = save.settings?.quality || 'high';
    this.reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || false;
    this.initRenderer();
    this.createScene();
    this.createPlayer();
    this.createGuardian();
    this.createAtmosphere();
    this.createSegments();
    this.resize();
    this.setCharacter(save.selectedCharacter);
    window.addEventListener('resize', this.onResize);
    this.clock.start();
  }

  initRenderer() {
    const low = this.quality === 'low' || this.save.settings?.performanceMode;
    this.renderer = new THREE.WebGLRenderer({ antialias: !low, alpha: false, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, low ? 1 : 1.55));
    this.renderer.setSize(this.host.clientWidth || window.innerWidth, this.host.clientHeight || window.innerHeight);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.renderer.shadowMap.enabled = !low;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.domElement.setAttribute('aria-hidden', 'true');
    this.host.appendChild(this.renderer.domElement);
  }

  createScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(ZONES[0].sky);
    this.scene.fog = new THREE.FogExp2(ZONES[0].fog, 0.013);
    this.camera = new THREE.PerspectiveCamera(62, 1, 0.1, 260);
    this.camera.position.set(0, 5.6, 11.4);
    this.camera.lookAt(0, 1.05, -13);
    this.ambient = new THREE.HemisphereLight(0xcde9c4, 0x293222, 1.75);
    this.scene.add(this.ambient);
    this.sun = new THREE.DirectionalLight(0xffedc7, 2.3);
    this.sun.position.set(-9, 17, 8);
    this.sun.castShadow = this.renderer.shadowMap.enabled;
    this.sun.shadow.mapSize.set(1024, 1024);
    this.sun.shadow.camera.left = -17;
    this.sun.shadow.camera.right = 17;
    this.sun.shadow.camera.top = 22;
    this.sun.shadow.camera.bottom = -18;
    this.sun.shadow.camera.near = 1;
    this.sun.shadow.camera.far = 48;
    this.scene.add(this.sun);
    this.world = new THREE.Group();
    this.scene.add(this.world);
    this.trackRoot = new THREE.Group();
    this.world.add(this.trackRoot);
    this.effectsRoot = new THREE.Group();
    this.world.add(this.effectsRoot);
  }

  material(color, options = {}) {
    const key = `${color}|${options.roughness ?? 0.82}|${options.metalness ?? 0}|${options.emissive ?? 0}|${options.transparent ? 1 : 0}|${options.opacity ?? 1}`;
    if (!this.materials.has(key)) {
      this.materials.set(key, new THREE.MeshStandardMaterial({
        color, roughness: options.roughness ?? 0.82, metalness: options.metalness ?? 0,
        emissive: options.emissive ?? 0, emissiveIntensity: options.emissiveIntensity ?? 0.35,
        transparent: options.transparent ?? false, opacity: options.opacity ?? 1,
        side: options.side ?? THREE.FrontSide
      }));
    }
    return this.materials.get(key);
  }

  geometry(key, factory) {
    if (!this.geometries.has(key)) this.geometries.set(key, factory());
    return this.geometries.get(key);
  }

  box(w, h, d, material, parent, x = 0, y = 0, z = 0) {
    const geo = this.geometry(`box-${w}-${h}-${d}`, () => new THREE.BoxGeometry(w, h, d));
    const mesh = new THREE.Mesh(geo, material);
    mesh.position.set(x, y, z);
    mesh.castShadow = this.renderer.shadowMap.enabled;
    mesh.receiveShadow = this.renderer.shadowMap.enabled;
    parent.add(mesh);
    return mesh;
  }

  sphere(r, material, parent, x = 0, y = 0, z = 0, width = 14, height = 10) {
    const geo = this.geometry(`sphere-${r}-${width}-${height}`, () => new THREE.SphereGeometry(r, width, height));
    const mesh = new THREE.Mesh(geo, material);
    mesh.position.set(x, y, z);
    mesh.castShadow = this.renderer.shadowMap.enabled;
    parent.add(mesh);
    return mesh;
  }

  cylinder(rt, rb, h, material, parent, x = 0, y = 0, z = 0, segments = 10) {
    const geo = this.geometry(`cyl-${rt}-${rb}-${h}-${segments}`, () => new THREE.CylinderGeometry(rt, rb, h, segments));
    const mesh = new THREE.Mesh(geo, material);
    mesh.position.set(x, y, z);
    mesh.castShadow = this.renderer.shadowMap.enabled;
    mesh.receiveShadow = this.renderer.shadowMap.enabled;
    parent.add(mesh);
    return mesh;
  }

  createPlayer() {
    this.player = new THREE.Group();
    this.player.position.set(0, 0, 0);
    this.world.add(this.player);
    this.playerRig = new THREE.Group();
    this.player.add(this.playerRig);
    const skin = this.material('#c58c62');
    const outfit = this.material('#1f9b79');
    const dark = this.material('#26352a');
    const gold = this.material('#d7a54b', { metalness: 0.55, roughness: 0.38 });
    const cloth = this.material('#b34d38');
    this.playerMats = { skin, outfit, dark, gold, cloth };
    // backpack
    this.box(.55, .63, .25, dark, this.playerRig, 0, 1.02, .23);
    this.box(.48, .36, .17, gold, this.playerRig, 0, 1.1, .39);
    // torso and belt
    this.torso = this.box(.58, .78, .33, outfit, this.playerRig, 0, 1.2, 0);
    this.box(.63, .13, .37, gold, this.playerRig, 0, .9, 0);
    // head + hair / bandana
    this.sphere(.29, skin, this.playerRig, 0, 1.82, -.01, 14, 10);
    this.sphere(.30, dark, this.playerRig, 0, 2.02, -.045, 14, 8).scale.set(1.08, .48, 1.04);
    this.box(.48, .11, .36, cloth, this.playerRig, 0, 1.91, -.03);
    this.sphere(.055, dark, this.playerRig, -.1, 1.84, -.27, 8, 6);
    this.sphere(.055, dark, this.playerRig, .1, 1.84, -.27, 8, 6);
    // arms pivot at shoulder
    this.leftArm = new THREE.Group(); this.leftArm.position.set(-.38, 1.47, 0); this.playerRig.add(this.leftArm);
    this.box(.19, .58, .22, outfit, this.leftArm, 0, -.27, 0);
    this.sphere(.12, skin, this.leftArm, 0, -.58, -.01, 8, 6);
    this.rightArm = new THREE.Group(); this.rightArm.position.set(.38, 1.47, 0); this.playerRig.add(this.rightArm);
    this.box(.19, .58, .22, outfit, this.rightArm, 0, -.27, 0);
    this.sphere(.12, skin, this.rightArm, 0, -.58, -.01, 8, 6);
    // legs pivot at hips
    this.leftLeg = new THREE.Group(); this.leftLeg.position.set(-.17, .83, 0); this.playerRig.add(this.leftLeg);
    this.box(.23, .65, .27, dark, this.leftLeg, 0, -.32, 0);
    this.box(.29, .16, .42, gold, this.leftLeg, 0, -.68, -.08);
    this.rightLeg = new THREE.Group(); this.rightLeg.position.set(.17, .83, 0); this.playerRig.add(this.rightLeg);
    this.box(.23, .65, .27, dark, this.rightLeg, 0, -.32, 0);
    this.box(.29, .16, .42, gold, this.rightLeg, 0, -.68, -.08);
    this.accessoryRoot = new THREE.Group(); this.playerRig.add(this.accessoryRoot);
    this.playerAura = this.sphere(1.05, this.material('#9cefc0', { transparent: true, opacity: .08, emissive: '#65dba1', emissiveIntensity: .75, side: THREE.DoubleSide }), this.player, 0, 1.1, 0, 16, 10);
    this.playerAura.visible = false;
  }

  createGuardian() {
    this.guardian = new THREE.Group();
    this.guardian.position.set(0, 0, 4.2);
    this.world.add(this.guardian);
    const hide = this.material('#473b31');
    const belly = this.material('#95704b');
    const horn = this.material('#d1b27d');
    const eye = this.material('#ff5b36', { emissive: '#ff3000', emissiveIntensity: 1.5 });
    this.sphere(.8, hide, this.guardian, 0, 1.25, 0, 16, 12).scale.set(1.12, 1.16, .85);
    this.sphere(.58, belly, this.guardian, 0, .94, -.57, 14, 10).scale.set(1.1, 1.1, .45);
    this.sphere(.5, hide, this.guardian, 0, 2.06, -.2, 16, 10);
    this.sphere(.12, eye, this.guardian, -.22, 2.1, -.62, 8, 6);
    this.sphere(.12, eye, this.guardian, .22, 2.1, -.62, 8, 6);
    const jaw = this.box(.63, .24, .55, belly, this.guardian, 0, 1.76, -.55);
    jaw.rotation.x = -.18;
    const hornA = this.cylinder(.03, .17, .57, horn, this.guardian, -.4, 2.52, -.2, 8); hornA.rotation.z = -.44;
    const hornB = this.cylinder(.03, .17, .57, horn, this.guardian, .4, 2.52, -.2, 8); hornB.rotation.z = .44;
    this.guardianArms = [];
    for (const side of [-1, 1]) {
      const arm = new THREE.Group(); arm.position.set(side * .72, 1.6, -.04); this.guardian.add(arm);
      this.cylinder(.18, .23, .85, hide, arm, side * .11, -.38, 0, 9).rotation.z = side * -.18;
      this.sphere(.22, belly, arm, side * .2, -.83, -.04, 9, 7);
      this.guardianArms.push(arm);
    }
    this.guardian.scale.setScalar(.86);
  }

  createAtmosphere() {
    const cloudMat = this.material('#e3e7cb', { transparent: true, opacity: .13, roughness: 1 });
    for (let i = 0; i < 5; i++) {
      const cloud = new THREE.Group();
      for (let j = 0; j < 4; j++) this.sphere(1.7 + Math.random() * .8, cloudMat, cloud, j * 1.2 - 1.8, Math.random() * .7, Math.random() * 1.2, 9, 7);
      cloud.position.set((Math.random() - .5) * 42, 12 + Math.random() * 5, -45 - Math.random() * 135);
      this.scene.add(cloud); this.clouds.push(cloud);
    }
    const rainCount = this.quality === 'low' ? 100 : 220;
    const rainPositions = new Float32Array(rainCount * 3);
    for (let i = 0; i < rainCount; i++) {
      rainPositions[i * 3] = (Math.random() - .5) * 35;
      rainPositions[i * 3 + 1] = Math.random() * 18;
      rainPositions[i * 3 + 2] = -Math.random() * 60;
    }
    const rainGeo = new THREE.BufferGeometry();
    rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPositions, 3));
    const rainMat = new THREE.PointsMaterial({ color: 0xd2eaff, size: .075, transparent: true, opacity: .35, depthWrite: false });
    this.rain = new THREE.Points(rainGeo, rainMat);
    this.scene.add(this.rain);
    this.torchLights = [];
  }

  createSegments() {
    let z = 16;
    for (let i = 0; i < SEGMENT_COUNT; i++) {
      const group = new THREE.Group();
      group.position.z = z;
      this.trackRoot.add(group);
      const segment = { group, z, entities: [], lights: [], index: i };
      this.segments.push(segment);
      this.populateSegment(segment, i * SEGMENT_LENGTH);
      z -= SEGMENT_LENGTH;
    }
  }

  getZone(distance) {
    return Math.floor(Math.max(0, distance) / 780) % ZONES.length;
  }

  setZone(zoneIndex) {
    if (zoneIndex === this.lastZone) return;
    this.lastZone = zoneIndex;
    const zone = ZONES[zoneIndex];
    this.scene.background.setHex(zone.sky);
    this.scene.fog.color.setHex(zone.fog);
    this.ambient.intensity = zoneIndex === 3 ? 0.65 : 1.55;
    this.sun.intensity = zoneIndex === 3 ? 0.42 : zoneIndex === 4 ? 1.75 : 2.1;
    this.sun.color.setHex(zoneIndex === 4 ? 0xffa16e : zoneIndex === 3 ? 0x879fbb : 0xffedca);
    if (this.callbacks.onZone) this.callbacks.onZone(zone.name);
  }

  clearSegment(segment) {
    this.entities = this.entities.filter(entity => entity.segment !== segment);
    for (const entity of segment.entities) {
      if (entity.mesh.parent) entity.mesh.parent.remove(entity.mesh);
    }
    segment.entities.length = 0;
    if (segment.lights?.length) {
      const remove = new Set(segment.lights);
      this.torchLights = this.torchLights.filter(light => !remove.has(light));
      segment.lights.length = 0;
    }
    while (segment.group.children.length) segment.group.remove(segment.group.children[0]);
  }

  populateSegment(segment, worldDistance) {
    this.clearSegment(segment);
    const zoneIndex = this.getZone(worldDistance);
    const zone = ZONES[zoneIndex];
    const ground = this.material(zone.ground);
    const darkStone = this.material('#3b4538');
    const trim = this.material(zoneIndex === 4 ? '#b45c35' : '#a18d62', { metalness: .18 });
    const moss = this.material(zoneIndex === 3 ? '#303e39' : '#315e3d');
    this.box(10.7, .55, SEGMENT_LENGTH + .2, ground, segment.group, 0, -.32, -SEGMENT_LENGTH / 2 + 1);
    this.box(.18, .08, SEGMENT_LENGTH, trim, segment.group, -5.2, -.02, -SEGMENT_LENGTH / 2 + 1);
    this.box(.18, .08, SEGMENT_LENGTH, trim, segment.group, 5.2, -.02, -SEGMENT_LENGTH / 2 + 1);
    for (const laneX of [-1.5, 1.5]) {
      for (let z = -2; z > -SEGMENT_LENGTH; z -= 6) this.box(.045, .014, 2.2, darkStone, segment.group, laneX, -.035, z);
    }
    // Stone pavers and carved edging.
    for (let j = 0; j < 5; j++) {
      const z = -3 - j * 5.2;
      this.box(10.4, .05, .11, trim, segment.group, 0, -.01, z);
    }
    // Side dressing changes with biome.
    for (const side of [-1, 1]) {
      const propCount = zoneIndex === 3 ? 3 : 4;
      for (let i = 0; i < propCount; i++) {
        const z = -3 - i * 6.1 - Math.random() * 2;
        const x = side * (7 + Math.random() * 4);
        if (zoneIndex === 4) this.makeLavaRock(segment.group, x, z, zone);
        else if (zoneIndex === 2) this.makeWaterfallRock(segment.group, x, z, zone);
        else if (zoneIndex === 3) this.makeCaveRock(segment.group, x, z, zone);
        else this.makeJungleTree(segment.group, x, z, zone, i % 2 === 0);
      }
      if (zoneIndex === 0 || zoneIndex === 5) {
        for (let i = 0; i < 2; i++) {
          const z = -5 - i * 14;
          const pillar = this.box(.6, 4 + (i % 2), .7, trim, segment.group, side * 5.9, 1.7, z);
          this.box(1.1, .24, 1.1, darkStone, segment.group, side * 5.9, 3.8 + (i % 2), z);
          pillar.rotation.z = side * -.015;
          this.box(.12, .8, .12, moss, segment.group, side * 5.9, .3, z - .45);
        }
      }
    }
    if (zoneIndex === 0 || zoneIndex === 2 || zoneIndex === 4) {
      for (const side of [-1, 1]) {
        const torchGroup = new THREE.Group();
        torchGroup.position.set(side * 4.65, 0, -13 - Math.random() * 4);
        segment.group.add(torchGroup);
        this.cylinder(.07, .12, 1.35, darkStone, torchGroup, 0, .68, 0, 8);
        this.sphere(.22, this.material(zoneIndex === 4 ? '#ff7136' : '#ffbd57', { emissive: '#ff6b1b', emissiveIntensity: 1.8 }), torchGroup, 0, 1.45, 0, 9, 7);
        const light = new THREE.PointLight(zoneIndex === 4 ? 0xff5b2c : 0xffb75b, 1.4, 9, 2);
        light.position.set(0, 1.4, 0); torchGroup.add(light); this.torchLights.push(light); segment.lights.push(light);
      }
    }
    if (zoneIndex === 2) {
      const water = this.box(1.4, 3.5, 1.3, this.material('#65c6d4', { transparent: true, opacity: .48, emissive: '#1a6e7a', emissiveIntensity: .35 }), segment.group, -6.7, 1.2, -15);
      water.userData.water = true;
    }
    if (zoneIndex === 4) {
      for (const side of [-1, 1]) {
        this.box(1.2, .06, 9, this.material('#fd6734', { emissive: '#d52f10', emissiveIntensity: 1.4 }), segment.group, side * 6.1, -.03, -17);
      }
    }
    if (zoneIndex === 5) {
      // Broken bridge ropes and posts.
      for (const side of [-1, 1]) {
        for (let i = 0; i < 3; i++) this.box(.16, 1.35, .18, trim, segment.group, side * 4.9, .55, -4 - i * 9);
        const rail = this.box(.1, .1, 26, trim, segment.group, side * 4.9, 1.15, -14);
        rail.rotation.x = .015;
      }
    }
    this.generatePattern(segment, worldDistance, zoneIndex);
  }

  makeJungleTree(parent, x, z, zone, tall) {
    const trunkMat = this.material('#55412e');
    const leaf1 = this.material(zone ? '#1f5a3d' : '#2d6e43');
    const leaf2 = this.material('#477f4c');
    const group = new THREE.Group(); group.position.set(x, 0, z); parent.add(group);
    this.cylinder(.2, .35, tall ? 4.8 : 3.3, trunkMat, group, 0, tall ? 2.4 : 1.65, 0, 8);
    for (let j = 0; j < 3; j++) {
      const leaf = this.sphere(tall ? 1.45 : 1.12, j % 2 ? leaf1 : leaf2, group, (j - 1) * .75, (tall ? 4.2 : 3) + j * .2, 0, 9, 7);
      leaf.scale.set(1.1, .82, 1);
    }
    if (Math.random() < .25) {
      const vine = this.cylinder(.025, .03, 2.8, this.material('#386d41'), group, .65, 2.4, .2, 6);
      vine.rotation.z = -.18;
    }
  }

  makeLavaRock(parent, x, z) {
    const group = new THREE.Group(); group.position.set(x, 0, z); parent.add(group);
    this.sphere(1.1, this.material('#443b34'), group, 0, .4, 0, 8, 6).scale.set(1.2, .65, 1.1);
    this.box(.15, .04, 1.4, this.material('#ff7438', { emissive: '#db3510', emissiveIntensity: 1.8 }), group, .1, .75, 0).rotation.z = .3;
  }

  makeWaterfallRock(parent, x, z) {
    const stone = this.material('#5b7470');
    const water = this.material('#6fc9d8', { transparent: true, opacity: .48, emissive: '#207988', emissiveIntensity: .25 });
    this.sphere(1.3, stone, parent, x, .35, z, 9, 7).scale.set(1.3, .75, 1);
    const fall = this.box(.55, 4, .08, water, parent, x + Math.sign(x) * .3, 1.8, z - 1);
    fall.userData.water = true;
  }

  makeCaveRock(parent, x, z) {
    const stone = this.material('#343b38');
    const rock = this.sphere(1.1 + Math.random() * .7, stone, parent, x, 2.1, z, 8, 6);
    rock.scale.set(1.7, 1.7, 1.2);
    const crystal = this.cylinder(.05, .34, 1.3, this.material('#65b9b3', { emissive: '#236a6b', emissiveIntensity: .65 }), parent, x + .4, .5, z - .2, 6);
    crystal.rotation.z = .2;
  }

  generatePattern(segment, worldDistance, zoneIndex) {
    const baseZ = -8 - Math.random() * 5;
    const difficulty = Math.min(0.78, worldDistance / 9500);
    const obstacleCount = Math.random() < .42 + difficulty * .3 ? 2 : 1;
    const blocked = [];
    for (let i = 0; i < obstacleCount; i++) {
      const lane = Math.floor(Math.random() * 3);
      if (blocked.includes(lane)) continue;
      blocked.push(lane);
      let obstacle = OBSTACLES[Math.floor(Math.random() * OBSTACLES.length)];
      if (zoneIndex === 4 && Math.random() < .55) obstacle = OBSTACLES.find(o => o.id === 'lavaPit');
      if (zoneIndex === 5 && Math.random() < .35) obstacle = OBSTACLES.find(o => o.id === 'brokenBridge');
      const mesh = this.createObstacle(obstacle);
      mesh.position.set(LANE_X[lane], 0, baseZ - i * 7.2);
      segment.group.add(mesh);
      const entity = { kind: 'obstacle', id: obstacle.id, action: obstacle.action, mesh, lane, localZ: mesh.position.z, segment, hit: false, phase: Math.random() * 6 };
      segment.entities.push(entity); this.entities.push(entity);
    }
    const coinLane = [0, 1, 2].filter(lane => !blocked.includes(lane))[Math.floor(Math.random() * Math.max(1, 3 - blocked.length))] ?? ((blocked[0] + 1) % 3);
    const coinCount = 5 + Math.floor(Math.random() * 4);
    const startZ = baseZ - 2.5;
    for (let i = 0; i < coinCount; i++) {
      const z = startZ - i * 1.35;
      this.addPickup(segment, 'coin', coinLane, z);
      if (Math.random() < .11) this.addPickup(segment, 'coin', (coinLane + 1) % 3, z - .45);
    }
    const gemChance = this.mode === 'treasure' ? .55 : this.gemBonusActive ? .52 : .33;
    if (Math.random() < gemChance) this.addPickup(segment, 'gem', Math.floor(Math.random() * 3), baseZ - 14);
    if (Math.random() < (this.mode === 'event' ? .48 : .18)) this.addPickup(segment, 'token', Math.floor(Math.random() * 3), baseZ - 18);
    if (Math.random() < (this.mode === 'treasure' ? .24 : (worldDistance < 700 ? .035 : .07))) this.addPickup(segment, 'chest', Math.floor(Math.random() * 3), baseZ - 21);
    if (Math.random() < .23) this.addPickup(segment, 'power', Math.floor(Math.random() * 3), baseZ - 15, Object.keys(POWERUPS).filter(k => !['headStart', 'resurrection'].includes(k))[Math.floor(Math.random() * 8)]);
  }

  createObstacle(def) {
    const group = new THREE.Group();
    const stone = this.material('#777767');
    const dark = this.material('#3d4439');
    const bark = this.material('#67472f');
    const fire = this.material('#ff6c31', { emissive: '#d93c11', emissiveIntensity: 1.45 });
    const metal = this.material('#aab0a0', { metalness: .65, roughness: .32 });
    const hazard = this.material('#d54c36', { emissive: '#9f1d0a', emissiveIntensity: .5 });
    switch (def.kind) {
      case 'wall':
        this.box(2.1, 2.5, .8, stone, group, 0, 1.15, 0);
        this.box(2.3, .25, 1, dark, group, 0, 2.45, 0);
        this.box(.27, .28, .88, metal, group, -.55, 1.7, -.46);
        this.box(.27, .28, .88, metal, group, .55, 1.7, -.46);
        break;
      case 'log':
        this.cylinder(.55, .55, 2.9, bark, group, 0, .62, 0, 9).rotation.z = Math.PI / 2;
        for (let x = -1; x <= 1; x += 2) this.cylinder(.2, .2, .18, stone, group, x * 1.35, .62, 0, 8).rotation.z = Math.PI / 2;
        break;
      case 'fire':
        this.box(2.6, .3, 1.2, dark, group, 0, .18, 0);
        for (let i = -1; i <= 1; i++) {
          const flame = this.sphere(.42, fire, group, i * .65, .62, 0, 8, 7); flame.scale.set(.65, 1.5, .65);
        }
        break;
      case 'barrier':
        this.box(2.7, .25, .22, metal, group, 0, 1.3, 0);
        for (let x = -1.1; x <= 1.1; x += 2.2) this.cylinder(.12, .12, 1.8, dark, group, x, .9, 0, 8);
        break;
      case 'spikes':
        this.box(2.9, .13, 1.2, dark, group, 0, .06, 0);
        for (let x = -1.1; x <= 1.1; x += .55) this.cylinder(0, .22, .78, metal, group, x, .48, 0, 6);
        break;
      case 'gap':
      case 'bridge':
        this.box(3.2, .08, 2.5, this.material('#17241d'), group, 0, -.15, 0);
        this.box(3.2, .06, .28, hazard, group, 0, -.06, -1);
        break;
      case 'rock':
      case 'falling':
        this.sphere(1.05, stone, group, 0, .92, 0, 9, 7);
        this.sphere(.22, mossMaterial(this), group, -.25, 1.72, -.22, 7, 5);
        break;
      case 'branch':
        this.cylinder(.23, .28, 3.1, bark, group, 0, 1.65, 0, 8).rotation.z = Math.PI / 2;
        this.cylinder(.11, .13, .9, bark, group, -.65, 2, 0, 7).rotation.z = -.8;
        this.cylinder(.11, .13, .9, bark, group, .65, 1.95, 0, 7).rotation.z = .8;
        break;
      case 'gate':
        this.box(.34, 2.7, .35, stone, group, -1.25, 1.3, 0);
        this.box(.34, 2.7, .35, stone, group, 1.25, 1.3, 0);
        this.box(2.9, .34, .45, stone, group, 0, 2.56, 0);
        this.box(2.1, .22, .55, bark, group, 0, 1.1, 0);
        break;
      case 'platform':
        this.box(2.4, .28, 1.25, stone, group, 0, .55, 0);
        this.box(2.5, .12, .2, trimMaterial(this), group, 0, .74, -.5);
        break;
      case 'water':
        this.box(2.7, .24, 1.6, this.material('#55c6d5', { emissive: '#1e7182', emissiveIntensity: .5 }), group, 0, .45, 0);
        this.box(2.9, .14, .3, metal, group, 0, .16, .6);
        break;
      case 'lava':
        this.box(3.1, .14, 2, dark, group, 0, .01, 0);
        this.box(2.8, .05, 1.6, fire, group, 0, .1, 0);
        break;
      case 'rotor':
        const post = this.cylinder(.15, .15, 2, dark, group, 0, 1, 0, 8);
        const blade = new THREE.Group(); blade.position.y = 1.65; group.add(blade);
        this.box(3, .16, .2, metal, blade, 0, 0, 0);
        this.sphere(.28, hazard, blade, 0, 0, 0, 8, 6);
        group.userData.moving = blade;
        break;
      case 'blade':
        this.cylinder(.06, .06, 1.7, dark, group, 0, 2.05, 0, 8);
        const swingBlade = new THREE.Group(); swingBlade.position.set(0, 1.25, 0); group.add(swingBlade);
        this.box(2.1, .16, .28, metal, swingBlade, 0, 0, 0);
        for (const x of [-.9, .9]) this.cylinder(.01, .11, .28, hazard, swingBlade, x, -.13, 0, 6);
        group.userData.swinging = swingBlade;
        break;
      case 'collapse':
        this.box(2.8, .24, 1.9, bark, group, 0, .03, 0);
        this.box(.18, .18, 2.1, hazard, group, -1.2, .2, 0);
        break;
      case 'narrow':
        this.box(1.3, .2, 2.4, bark, group, 0, .12, 0);
        this.box(.2, .55, .2, stone, group, -.8, .35, 0);
        this.box(.2, .55, .2, stone, group, .8, .35, 0);
        break;
      default:
        this.box(2, 1.6, .8, stone, group, 0, .8, 0);
    }
    group.userData.obstacle = def.id;
    return group;
  }

  addPickup(segment, type, lane, localZ, powerId = null) {
    const group = new THREE.Group();
    let mat;
    if (type === 'coin') mat = this.material('#f5c84e', { metalness: .74, roughness: .25, emissive: '#7e5010', emissiveIntensity: .35 });
    if (type === 'gem') mat = this.material('#58e4db', { metalness: .38, roughness: .2, emissive: '#1aa8a4', emissiveIntensity: 1.15 });
    if (type === 'token') mat = this.material('#d7a85e', { metalness: .72, roughness: .28, emissive: '#765120', emissiveIntensity: .4 });
    if (type === 'chest') mat = this.material('#9d5c2c', { metalness: .24, roughness: .55 });
    if (type === 'power') mat = this.material('#c1a1ff', { metalness: .25, roughness: .28, emissive: '#6944d9', emissiveIntensity: 1.4 });
    if (type === 'coin') {
      this.cylinder(.32, .32, .11, mat, group, 0, .92, 0, 12).rotation.x = Math.PI / 2;
      this.sphere(.06, this.material('#fff3ae', { emissive: '#facd67', emissiveIntensity: .9 }), group, 0, .92, -.07, 7, 5);
    } else if (type === 'gem') {
      const gem = this.geometry('gem', () => new THREE.OctahedronGeometry(.42, 0));
      const mesh = new THREE.Mesh(gem, mat); mesh.position.y = 1.05; mesh.castShadow = true; group.add(mesh);
      this.sphere(.55, this.material('#65e8e5', { transparent: true, opacity: .13, emissive: '#2bb7ad', emissiveIntensity: .5 }), group, 0, 1.05, 0, 10, 7);
    } else if (type === 'token') {
      this.cylinder(.34, .34, .12, mat, group, 0, .92, 0, 8).rotation.x = Math.PI / 2;
      this.sphere(.12, this.material('#fff0bd'), group, 0, .92, -.08, 8, 6);
    } else if (type === 'chest') {
      this.box(.8, .55, .56, mat, group, 0, .55, 0);
      this.box(.85, .16, .6, this.material('#e6b64f', { metalness: .5 }), group, 0, .84, 0);
      this.box(.14, .35, .64, this.material('#e5c36b', { metalness: .6 }), group, 0, .59, -.01);
      this.sphere(.11, this.material('#fff0a4', { emissive: '#f7ba37', emissiveIntensity: 1.3 }), group, 0, .79, -.34, 7, 5);
    } else {
      this.sphere(.48, mat, group, 0, .98, 0, 10, 8);
      this.sphere(.19, this.material('#fff4ce', { emissive: '#fff4ce', emissiveIntensity: 1.4 }), group, 0, .98, -.27, 8, 6);
    }
    group.position.set(LANE_X[lane], 0, localZ);
    segment.group.add(group);
    const entity = { kind: 'pickup', id: type, powerId, mesh: group, lane, localZ, segment, hit: false, phase: Math.random() * 6 };
    segment.entities.push(entity); this.entities.push(entity);
  }


  setMode(mode) { this.mode = mode || 'classic'; }

  resetRun() {
    this.distance = 0; this.speed = 18; this.lane = 1; this.lanePosition = 0;
    this.jumpTime = 0; this.slideTime = 0; this.danger = 0; this.elapsed = 0; this.stopFall();
    this.player.position.set(0, 0, 0); this.player.rotation.set(0, 0, 0);
    this.playerRig.scale.set(1, 1, 1); this.playerRig.position.set(0, 0, 0);
    this.guardian.position.set(0, 0, 4.2);
    this.segments.forEach((segment, index) => {
      segment.group.position.z = 16 - index * SEGMENT_LENGTH;
      this.populateSegment(segment, index * SEGMENT_LENGTH);
    });
    this.setZone(0);
  }

  setCharacter(id) {
    const character = CHARACTERS.find(item => item.id === id) || CHARACTERS[0];
    this.characterId = character.id;
    this.baseOutfitColor = character.outfit;
    this.playerMats.outfit.color.set(character.outfit);
    this.playerMats.skin.color.set(character.color);
    this.playerMats.cloth.color.set(character.id === 'nyx' ? '#3c3278' : character.id === 'mira' ? '#9c315d' : character.id === 'tala' ? '#176c79' : '#b34d38');
    while (this.accessoryRoot.children.length) this.accessoryRoot.remove(this.accessoryRoot.children[0]);
    const gold = this.playerMats.gold;
    const dark = this.playerMats.dark;
    const skin = this.playerMats.skin;
    if (character.id === 'mira') {
      const petal = this.material('#e989ad');
      for (let i = 0; i < 5; i++) {
        const a = i * Math.PI * 2 / 5;
        this.sphere(.105, petal, this.accessoryRoot, Math.cos(a) * .17, 2.14 + Math.sin(a) * .12, -.02, 7, 5);
      }
      this.sphere(.08, gold, this.accessoryRoot, 0, 2.14, -.02, 7, 5);
    } else if (character.id === 'ravi') {
      const feather = this.material('#d16c38');
      const plume = this.sphere(.14, feather, this.accessoryRoot, .22, 2.22, .02, 8, 6);
      plume.scale.set(.55, 1.9, .5); plume.rotation.z = -.28;
      this.box(.46, .07, .38, gold, this.accessoryRoot, 0, 1.98, 0);
    } else if (character.id === 'nyx') {
      const hood = this.sphere(.35, this.material('#29243f'), this.accessoryRoot, 0, 2.05, .08, 12, 8);
      hood.scale.set(1.2, .75, 1.2);
      this.box(.62, .16, .35, this.material('#4e4679'), this.accessoryRoot, 0, 1.64, .06);
    } else if (character.id === 'tala') {
      this.box(.58, .13, .37, this.material('#39b7b4'), this.accessoryRoot, 0, 1.95, 0);
      this.sphere(.13, this.material('#d6eee0'), this.accessoryRoot, 0, 1.04, -.21, 8, 6);
    } else if (character.id === 'leo') {
      this.box(.52, .09, .38, gold, this.accessoryRoot, 0, 2.16, 0);
      for (let x = -.18; x <= .19; x += .18) this.cylinder(.005, .075, .22, gold, this.accessoryRoot, x, 2.29, 0, 6);
    } else if (character.id === 'zara') {
      const crystal = this.geometry('zara-crystal', () => new THREE.OctahedronGeometry(.19, 0));
      const gem = new THREE.Mesh(crystal, this.material('#a98aff', { emissive: '#6745d0', emissiveIntensity: 1.2 }));
      gem.position.set(0, 2.3, 0); this.accessoryRoot.add(gem);
      this.sphere(.12, this.material('#d6b9ff'), this.accessoryRoot, 0, 1.03, -.2, 8, 6);
    } else if (character.id === 'atlas') {
      const helm = this.material('#9d8152', { metalness: .6, roughness: .3 });
      this.box(.58, .16, .43, helm, this.accessoryRoot, 0, 2.05, 0);
      for (const side of [-1, 1]) {
        const horn = this.cylinder(.01, .085, .34, gold, this.accessoryRoot, side * .28, 2.25, 0, 7);
        horn.rotation.z = side * -.42;
      }
    }
  }

  setOutfit(id = 'default') {
    const colors = { default: this.baseOutfitColor || '#1f9b79', fern: '#387d4b', sunset: '#d8753c' };
    this.playerMats.outfit.color.set(colors[id] || colors.default);
    if (id === 'sunset') this.playerMats.cloth.color.set('#f3c46b');
    else if (id === 'fern') this.playerMats.cloth.color.set('#b3d77c');
    else this.playerMats.cloth.color.set(this.characterId === 'nyx' ? '#3c3278' : this.characterId === 'mira' ? '#9c315d' : '#b34d38');
  }

  moveLane(direction) {
    this.lane = THREE.MathUtils.clamp(this.lane + direction, 0, 2);
    if (this.callbacks.onLane) this.callbacks.onLane(this.lane);
  }

  jump() {
    if (this.jumpTime > 0 || this.slideTime > 0) return false;
    this.jumpTime = .72;
    if (this.callbacks.onAction) this.callbacks.onAction('jump');
    return true;
  }

  slide() {
    if (this.slideTime > 0 || this.jumpTime > 0) return false;
    this.slideTime = .72;
    if (this.callbacks.onAction) this.callbacks.onAction('slide');
    return true;
  }

  useSpecial() {
    if (this.callbacks.onSpecial) this.callbacks.onSpecial();
  }

  update(dt, run, state = 'running') {
    if (this.disposed) return;
    dt = Math.min(dt, .05);
    if (state === 'falling') {
      this.updateFall(dt);
      this.renderer.render(this.scene, this.camera);
      return;
    }
    if (state !== 'running') {
      this.renderer.render(this.scene, this.camera);
      return;
    }
    this.elapsed += dt;
    this.distance = run.distance;
    this.speed = run.currentSpeed || 18;
    this.updatePlayer(dt, run);
    this.updateSegments(dt, run);
    this.updateGuardian(dt, run);
    this.updateAtmosphereFrame(dt, run);
    this.updateParticles(dt);
    this.renderer.render(this.scene, this.camera);
  }

  updatePlayer(dt, run) {
    const targetX = LANE_X[this.lane];
    this.lanePosition = THREE.MathUtils.damp(this.lanePosition, targetX, 14, dt);
    this.player.position.x = this.lanePosition;
    if (this.jumpTime > 0) this.jumpTime = Math.max(0, this.jumpTime - dt);
    if (this.slideTime > 0) this.slideTime = Math.max(0, this.slideTime - dt);
    const phase = this.elapsed * (this.speed * .6);
    this.playerAura.visible = isPowerUpActive(run, 'shield') || isPowerUpActive(run, 'invincible') || isPowerUpActive(run, 'speed');
    if (this.playerAura.visible) { this.playerAura.rotation.y += dt * 1.1; this.playerAura.scale.setScalar(1.02 + Math.sin(this.elapsed * 7) * .05); }
    const jumping = this.jumpTime > 0;
    const sliding = this.slideTime > 0;
    let jumpHeight = 0;
    if (jumping) {
      const t = 1 - this.jumpTime / .72;
      jumpHeight = Math.sin(t * Math.PI) * (isPowerUpActive(run, 'megaJump') ? 2.65 : 1.6);
    }
    this.player.position.y = jumpHeight + (jumping ? 0 : Math.abs(Math.sin(phase * 1.1)) * .045);
    this.player.rotation.z = THREE.MathUtils.damp(this.player.rotation.z, (targetX - this.lanePosition) * -.04, 10, dt);
    this.playerRig.rotation.x = sliding ? .55 : 0;
    this.playerRig.scale.y = THREE.MathUtils.damp(this.playerRig.scale.y, sliding ? .52 : 1, 14, dt);
    this.playerRig.position.y = sliding ? .62 : 0;
    const swing = Math.sin(phase) * (jumping ? .18 : sliding ? .12 : .75);
    this.leftLeg.rotation.x = jumping ? -.8 : sliding ? .15 : swing;
    this.rightLeg.rotation.x = jumping ? -.8 : sliding ? .15 : -swing;
    this.leftArm.rotation.x = jumping ? 1.8 : sliding ? .7 : -swing * .85;
    this.rightArm.rotation.x = jumping ? 1.8 : sliding ? .7 : swing * .85;
    this.leftArm.rotation.z = jumping ? -.22 : .04;
    this.rightArm.rotation.z = jumping ? .22 : -.04;
    this.camera.position.x = THREE.MathUtils.damp(this.camera.position.x, this.lanePosition * .26, 3.8, dt);
    this.camera.lookAt(this.lanePosition * .11, 1.0 + jumpHeight * .12, -13.6);
  }

  updateSegments(dt, run) {
    this.gemBonusActive = isPowerUpActive(run, 'gemBonus');
    const travel = this.speed * dt;
    for (const segment of this.segments) {
      segment.group.position.z += travel;
      for (const child of segment.group.children) {
        if (child.userData.water) child.material.opacity = .38 + (Math.sin(this.elapsed * 4 + child.position.x) + 1) * .08;
      }
      if (segment.group.position.z > 38) {
        let minZ = Math.min(...this.segments.map(s => s.group.position.z));
        segment.group.position.z = minZ - SEGMENT_LENGTH;
        segment.index += SEGMENT_COUNT;
        this.populateSegment(segment, run.distance + 100 + Math.abs(segment.group.position.z));
      }
      for (const entity of segment.entities) {
        if (entity.hit) continue;
        const worldZ = segment.group.position.z + entity.localZ;
        const dz = Math.abs(worldZ);
        if (entity.kind === 'obstacle') {
          this.animateObstacle(entity, dt, worldZ);
          if (dz < 1.15 && Math.abs(entity.mesh.position.x - this.lanePosition) < 1.12) {
            const safe = entity.action === 'jump' ? (this.jumpTime > .08 && this.player.position.y > .58) : entity.action === 'slide' ? this.slideTime > .12 : false;
            if (!safe) {
              entity.hit = true;
              if (this.callbacks.onCollision) this.callbacks.onCollision(entity.id);
            } else if (dz < .65) {
              entity.hit = true;
              if (this.callbacks.onAvoid) this.callbacks.onAvoid(entity.id);
            }
          }
        } else {
          this.animatePickup(entity, dt);
          const magnet = isPowerUpActive(run, 'magnet') || isPowerUpActive(run, 'gemBonus');
          const characterGemPull = this.characterId === 'mira' && entity.id === 'gem';
          const xGap = Math.abs(entity.mesh.position.x - this.lanePosition);
          if ((magnet || characterGemPull) && dz < 9 && (xGap < (characterGemPull ? 4.2 : 3.5) || (entity.id === 'gem' && isPowerUpActive(run, 'gemBonus')))) {
            entity.mesh.position.x = THREE.MathUtils.damp(entity.mesh.position.x, this.lanePosition, 5, dt);
          }
          if (dz < (magnet ? 1.4 : 1.0) && Math.abs(entity.mesh.position.x - this.lanePosition) < 1.15) {
            entity.hit = true;
            this.spawnBurst(entity, segment);
            entity.mesh.visible = false;
            if (this.callbacks.onCollect) this.callbacks.onCollect(entity.id, entity.powerId);
          }
        }
      }
    }
    this.setZone(this.getZone(run.distance));
  }

  spawnBurst(entity, segment) {
    const palette = entity.id === 'gem' ? ['#6ef3e2', '#d1ffff'] : entity.id === 'token' ? ['#f8d37c', '#fff0c1'] : entity.id === 'coin' ? ['#ffd75f', '#fff1ad'] : ['#b9ed91', '#f7f3c5'];
    const group = new THREE.Group();
    group.position.set(entity.mesh.position.x, entity.mesh.position.y + 1, segment.group.position.z + entity.localZ);
    this.effectsRoot.add(group);
    const dots = [];
    for (let i = 0; i < 7; i++) {
      const mat = this.material(palette[i % palette.length], { emissive: palette[i % palette.length], emissiveIntensity: .65 });
      const dot = this.sphere(.07 + Math.random() * .035, mat, group, 0, 0, 0, 6, 5);
      const angle = i / 7 * Math.PI * 2;
      dots.push({ mesh: dot, vx: Math.cos(angle) * (1.2 + Math.random()), vy: .8 + Math.random() * 1.5, vz: Math.sin(angle) * (1.2 + Math.random()) });
    }
    this.particles.push({ group, dots, life: .48, maxLife: .48 });
  }

  updateParticles(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const particle = this.particles[i];
      particle.life -= dt;
      for (const dot of particle.dots) {
        dot.mesh.position.x += dot.vx * dt;
        dot.mesh.position.y += dot.vy * dt;
        dot.mesh.position.z += dot.vz * dt;
        dot.vy -= 3.8 * dt;
        dot.mesh.scale.setScalar(Math.max(.05, particle.life / particle.maxLife));
      }
      if (particle.life <= 0) { this.effectsRoot.remove(particle.group); this.particles.splice(i, 1); }
    }
  }

  animateObstacle(entity, dt, worldZ) {
    const mesh = entity.mesh;
    const t = this.elapsed + entity.phase;
    if (mesh.userData.moving) mesh.userData.moving.rotation.z = Math.sin(t * 2.8) * .55;
    if (mesh.userData.swinging) mesh.userData.swinging.rotation.z = Math.sin(t * 2.6) * .8;
    if (entity.id === 'rollingRock') mesh.rotation.x += dt * 1.7;
    if (entity.id === 'fallingStone') mesh.position.y = Math.max(.7, 1.1 + Math.sin(t * 1.5) * .45);
    if (entity.id === 'movingBarrier') mesh.position.x = Math.sin(t * 1.7) * .26;
    if (entity.id === 'waterJet') mesh.scale.y = .9 + Math.sin(t * 4) * .15;
    if (entity.id === 'collapse' && worldZ > -5) mesh.rotation.x = Math.min(.28, mesh.rotation.x + dt * .25);
  }

  animatePickup(entity, dt) {
    const t = this.elapsed + entity.phase;
    entity.mesh.rotation.y += dt * (entity.id === 'coin' ? 3.8 : 1.8);
    entity.mesh.position.y = Math.sin(t * 3.2) * .1;
    if (entity.id === 'gem' || entity.id === 'power' || entity.id === 'chest') {
      const glow = entity.mesh.children.find(c => c.material?.emissiveIntensity > .5);
      if (glow) glow.material.emissiveIntensity = .8 + Math.sin(t * 4) * .35;
    }
  }

  updateGuardian(dt, run) {
    const chase = Math.min(.85, run.distance / 15000);
    const targetZ = 4.2 - chase - this.danger * .9;
    this.guardian.position.z = THREE.MathUtils.damp(this.guardian.position.z, targetZ, 2.5, dt);
    this.guardian.position.x = Math.sin(this.elapsed * 1.3) * .24;
    this.guardian.rotation.y = Math.sin(this.elapsed * .9) * .1;
    this.guardian.position.y = Math.abs(Math.sin(this.elapsed * 4.2)) * .08;
    this.guardianArms[0].rotation.z = Math.sin(this.elapsed * 4) * .12;
    this.guardianArms[1].rotation.z = -Math.sin(this.elapsed * 4) * .12;
    this.danger = Math.max(0, this.danger - dt * .014);
    if (run.distance > 500 && Math.floor(run.distance / 500) % 2 === 1) this.danger = Math.max(this.danger, .3);
  }

  updateAtmosphereFrame(dt, run) {
    // A slow cycle changes sun warmth independently of the endless distance.
    const cycle = (run.distance % 4200) / 4200;
    const night = (Math.sin(cycle * Math.PI * 2 - Math.PI / 2) + 1) / 2;
    if (this.lastZone !== 3) {
      this.ambient.intensity = 1.55 - night * .7;
      this.sun.intensity = 2.05 - night * 1.25;
      this.sun.color.setRGB(1, .95 - night * .24, .8 - night * .28);
    }
    for (const cloud of this.clouds) {
      cloud.position.x += dt * .32;
      if (cloud.position.x > 24) cloud.position.x = -24;
    }
    const zone = ZONES[this.lastZone] || ZONES[0];
    const positions = this.rain.geometry.attributes.position;
    const rainEnabled = zone.weather === 'rain' || zone.weather === 'mist';
    this.rain.visible = rainEnabled;
    if (rainEnabled && !this.reducedMotion) {
      for (let i = 0; i < positions.count; i++) {
        let y = positions.getY(i) - dt * (zone.weather === 'rain' ? 18 : 5);
        let z = positions.getZ(i);
        if (y < 0) { y = 18; z = -Math.random() * 60; }
        positions.setY(i, y); positions.setZ(i, z + dt * 2);
      }
      positions.needsUpdate = true;
    }
    for (const light of this.torchLights) light.intensity = 1.1 + Math.sin(this.elapsed * 13 + light.position.x) * .35;
  }

  setDanger(value) { this.danger = THREE.MathUtils.clamp(value, 0, 1); }

  startFall() { this.falling = true; this.fallElapsed = 0; }
  stopFall() {
    this.falling = false; this.fallElapsed = 0;
    this.player.rotation.set(0, 0, 0); this.player.position.y = 0;
    this.playerRig.rotation.set(0, 0, 0); this.playerRig.scale.y = 1; this.playerRig.position.y = 0;
    this.guardian.position.z = 4.2; this.guardian.scale.setScalar(.86);
  }

  updateFall(dt) {
    if (!this.falling) return;
    this.fallElapsed += dt;
    const t = Math.min(1, this.fallElapsed / .46);
    this.player.rotation.z = THREE.MathUtils.lerp(0, -1.05, t);
    this.player.rotation.x = THREE.MathUtils.lerp(0, .42, t);
    this.player.position.y = THREE.MathUtils.lerp(0, -.42, t);
    this.playerRig.rotation.x = THREE.MathUtils.lerp(0, .55, t);
    this.guardian.position.z = THREE.MathUtils.lerp(4.2, 1.5, t);
    this.guardian.scale.setScalar(.86 + t * .08);
  }

  resize() {
    if (!this.renderer) return;
    const w = Math.max(1, this.host.clientWidth || window.innerWidth);
    const h = Math.max(1, this.host.clientHeight || window.innerHeight);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
  }

  onResize = () => this.resize();

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    window.removeEventListener('resize', this.onResize);
    this.renderer?.dispose();
    for (const material of this.materials.values()) material.dispose();
    for (const geometry of this.geometries.values()) geometry.dispose();
    this.particles.length = 0;
    this.rain?.geometry.dispose();
    this.rain?.material.dispose();
    this.host.replaceChildren();
  }
}

function mossMaterial(scene) { return scene.material('#4b6843'); }
function trimMaterial(scene) { return scene.material('#c0a26a', { metalness: .25 }); }
