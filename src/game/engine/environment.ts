import * as THREE from 'three';
import {
  LOT_D, LOT_W, POOL, TILE, clamp, gridX, gridZ, objectCenterX, objectCenterZ,
} from '../constants';
import type { GameState, Season, Weather } from '../types';
import { emissive, glowSpriteMaterial, mat, plain, waterMaterial } from './materials';
import { makeRainTexture } from './textures';
import {
  addBox, addCone, addCylinder, addPlane, addRoundedBox, addSphere, addSprite, disposeObject,
} from './primitives';

interface Palette {
  top: THREE.Color;
  bottom: THREE.Color;
  sun: THREE.Color;
  fog: THREE.Color;
  fogDensity: number;
}

const SKY_STOPS: Array<{ at: number; top: string; bottom: string; sun: string }> = [
  { at: 0, top: '#091424', bottom: '#1d3047', sun: '#243b59' },
  { at: 300, top: '#13233d', bottom: '#35445a', sun: '#405a7d' },
  { at: 380, top: '#4b5d84', bottom: '#f0a26f', sun: '#ffc27a' },
  { at: 480, top: '#6ea8dc', bottom: '#d9edf6', sun: '#fff2d0' },
  { at: 1020, top: '#73aee0', bottom: '#dcecf4', sun: '#fff0cf' },
  { at: 1140, top: '#414d79', bottom: '#ee9066', sun: '#ffb974' },
  { at: 1260, top: '#111e35', bottom: '#2a3b53', sun: '#324764' },
  { at: 1440, top: '#091424', bottom: '#1d3047', sun: '#243b59' },
];

function paletteFor(minutes: number, weather: Weather): Palette {
  const m = ((minutes % 1440) + 1440) % 1440;
  let a = SKY_STOPS[0];
  let b = SKY_STOPS[SKY_STOPS.length - 1];
  for (let i = 0; i < SKY_STOPS.length - 1; i += 1) {
    if (m >= SKY_STOPS[i].at && m <= SKY_STOPS[i + 1].at) {
      a = SKY_STOPS[i]; b = SKY_STOPS[i + 1]; break;
    }
  }
  const t = clamp((m - a.at) / Math.max(1, b.at - a.at), 0, 1);
  const top = new THREE.Color(a.top).lerp(new THREE.Color(b.top), t);
  const bottom = new THREE.Color(a.bottom).lerp(new THREE.Color(b.bottom), t);
  const sun = new THREE.Color(a.sun).lerp(new THREE.Color(b.sun), t);
  let fogDensity = 0.0075;
  if (weather === 'cloudy') {
    const gray = new THREE.Color('#8b98a6');
    top.lerp(gray, 0.34); bottom.lerp(gray, 0.28); sun.lerp(gray, 0.35); fogDensity = 0.011;
  } else if (weather === 'rain') {
    const gray = new THREE.Color('#56677a');
    top.lerp(gray, 0.58); bottom.lerp(gray, 0.44); sun.lerp(gray, 0.6); fogDensity = 0.018;
  } else if (weather === 'storm') {
    const gray = new THREE.Color('#303b50');
    top.lerp(gray, 0.72); bottom.lerp(gray, 0.58); sun.lerp(gray, 0.78); fogDensity = 0.024;
  }
  const fog = bottom.clone().lerp(top, 0.45);
  return { top, bottom, sun, fog, fogDensity };
}

function tiledMaterial(pattern: 'grass' | 'asphalt' | 'concrete', repeatX: number, repeatY: number) {
  const material = mat(pattern, '#ffffff', { normalScale: 0.6 });
  (['map', 'normalMap', 'roughnessMap'] as const).forEach((key) => {
    const original = material[key];
    if (!original) return;
    const texture = original.clone();
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(repeatX, repeatY);
    texture.needsUpdate = true;
    (material as unknown as Record<string, THREE.Texture | null>)[key] = texture;
  });
  return material;
}

function seedRandom(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = Math.imul(s ^ (s >>> 15), 2246822519);
    s ^= s >>> 13;
    return (s >>> 0) / 4294967295;
  };
}

export class Environment {
  readonly group = new THREE.Group();
  private scene: THREE.Scene;
  private skyMat: THREE.ShaderMaterial;
  private sky: THREE.Mesh;
  private sun: THREE.DirectionalLight;
  private moon: THREE.DirectionalLight;
  private hemi: THREE.HemisphereLight;
  private ambient: THREE.AmbientLight;
  private grassMat: THREE.MeshStandardMaterial;
  private waterMat: THREE.MeshPhysicalMaterial;
  private cloudMat: THREE.MeshStandardMaterial;
  private glowMat: THREE.SpriteMaterial;
  private starMat: THREE.PointsMaterial;
  private precipitationMat: THREE.PointsMaterial;
  private precipitation: THREE.Points;
  private precipPositions: Float32Array;
  private precipSpeeds: Float32Array;
  private clouds: THREE.Group[] = [];
  private gardenLights: THREE.PointLight[] = [];
  private foliageMaterials: THREE.MeshStandardMaterial[] = [];
  private flowerGroups: THREE.Object3D[] = [];
  private stars: THREE.Points;
  private lastQuality = '';
  private lightningTimer = 8;
  private lightningFlash = 0;
  private lastSeason: Season | null = null;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.group.name = 'Ambiente';
    scene.add(this.group);

    scene.fog = new THREE.FogExp2('#91a9bb', 0.008);
    this.skyMat = new THREE.ShaderMaterial({
      uniforms: {
        topColor: { value: new THREE.Color('#6ea8dc') },
        bottomColor: { value: new THREE.Color('#d9edf6') },
        sunColor: { value: new THREE.Color('#fff2d0') },
        sunDirection: { value: new THREE.Vector3(0, 1, 0) },
        sunIntensity: { value: 1 },
      },
      vertexShader: `
        varying vec3 vWorldPosition;
        void main() {
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPosition.xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 topColor;
        uniform vec3 bottomColor;
        uniform vec3 sunColor;
        uniform vec3 sunDirection;
        uniform float sunIntensity;
        varying vec3 vWorldPosition;
        void main() {
          vec3 dir = normalize(vWorldPosition);
          float h = clamp(dir.y * 0.5 + 0.5, 0.0, 1.0);
          vec3 color = mix(bottomColor, topColor, pow(h, 0.85));
          float disc = pow(max(dot(dir, normalize(sunDirection)), 0.0), 900.0) * sunIntensity;
          float halo = pow(max(dot(dir, normalize(sunDirection)), 0.0), 18.0) * sunIntensity * 0.14;
          color += sunColor * (disc + halo);
          gl_FragColor = vec4(color, 1.0);
        }
      `,
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
    });
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(180, 32, 20), this.skyMat);
    this.sky.frustumCulled = false;
    this.group.add(this.sky);

    this.sun = new THREE.DirectionalLight('#fff0d2', 2.1);
    this.sun.position.set(24, 30, 18);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.sun.shadow.camera.left = -28;
    this.sun.shadow.camera.right = 28;
    this.sun.shadow.camera.top = 28;
    this.sun.shadow.camera.bottom = -28;
    this.sun.shadow.camera.near = 1;
    this.sun.shadow.camera.far = 100;
    this.sun.shadow.bias = -0.00035;
    this.sun.shadow.normalBias = 0.025;
    this.sun.shadow.radius = 3;
    this.sun.target.position.set(0, 0, 0);
    this.group.add(this.sun, this.sun.target);

    this.moon = new THREE.DirectionalLight('#8fb6e8', 0);
    this.moon.position.set(-20, 22, -14);
    this.group.add(this.moon);

    this.hemi = new THREE.HemisphereLight('#cfe8ff', '#5b604e', 1.05);
    this.ambient = new THREE.AmbientLight('#ffffff', 0.18);
    this.group.add(this.hemi, this.ambient);

    this.grassMat = tiledMaterial('grass', 32, 32);
    this.waterMat = waterMaterial();
    this.cloudMat = plain('#ffffff', { transparent: true, opacity: 0.28, depthWrite: false, roughness: 1 });
    this.glowMat = glowSpriteMaterial();
    this.starMat = new THREE.PointsMaterial({ color: '#ffffff', size: 0.42, transparent: true, opacity: 0, depthWrite: false, sizeAttenuation: true });
    this.precipitationMat = new THREE.PointsMaterial({
      map: makeRainTexture(), color: '#bcd8ff', size: 0.48, transparent: true,
      opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true,
    });

    this.createTerrain();
    this.createStreet();
    this.createPool();
    this.createGarden();
    this.createClouds();
    this.stars = this.createStars();
    const precip = this.createPrecipitation();
    this.precipitation = precip.points;
    this.precipPositions = precip.positions;
    this.precipSpeeds = precip.speeds;
  }

  private createTerrain() {
    const ground = addPlane(this.group, 150, 150, this.grassMat, { rotation: [-Math.PI / 2, 0, 0], position: [0, -0.16, 0], cast: false, receive: true });
    ground.name = 'Terreno';
    const border = mat('concrete', '#ffffff', { normalScale: 0.5 });
    addRoundedBox(this.group, LOT_W * TILE + 1.1, 0.22, LOT_D * TILE + 1.1, 0.08, border, { position: [0, -0.2, 0], cast: false });
    const lawn = mat('grass', '#ffffff', { normalScale: 0.45 });
    addPlane(this.group, LOT_W * TILE + 0.5, LOT_D * TILE + 0.5, lawn, { rotation: [-Math.PI / 2, 0, 0], position: [0, -0.075, 0], cast: false, receive: true });
  }

  private createStreet() {
    const asphalt = tiledMaterial('asphalt', 12, 2);
    addPlane(this.group, 80, 7, asphalt, { rotation: [-Math.PI / 2, 0, 0], position: [0, -0.12, LOT_D * TILE / 2 + 5.2], cast: false, receive: true });
    const sidewalk = tiledMaterial('concrete', 12, 1);
    addBox(this.group, 80, 0.16, 2.3, sidewalk, { position: [0, -0.06, LOT_D * TILE / 2 + 1.6], cast: false, receive: true });
    addBox(this.group, 80, 0.08, 0.12, mat('stone', '#ffffff'), { position: [0, 0.02, LOT_D * TILE / 2 + 2.75], cast: false });
    for (let i = -3; i <= 3; i += 1) {
      addBox(this.group, 2.4, 0.02, 0.09, plain('#e8e2d8'), { position: [i * 7, -0.015, LOT_D * TILE / 2 + 5.2], cast: false });
    }
  }

  private createPool() {
    const cx = objectCenterX(POOL.x0, POOL.w);
    const cz = objectCenterZ(POOL.z0, POOL.d);
    const w = POOL.w * TILE - 0.12;
    const d = POOL.d * TILE - 0.12;
    const water = addPlane(this.group, w, d, this.waterMat, { rotation: [-Math.PI / 2, 0, 0], position: [cx, 0.025, cz], cast: false, receive: false });
    water.renderOrder = 3;
    water.name = 'Água da piscina';

    const coping = mat('marble', '#ffffff', { normalScale: 0.35 });
    [[0, -d / 2 - 0.08, w + 0.35, 0.16], [0, d / 2 + 0.08, w + 0.35, 0.16]].forEach(([x, z, ww, dd]) => addBox(this.group, ww, 0.07, dd, coping, { position: [cx + x, 0.035, cz + z], cast: false }));
    [[-w / 2 - 0.08, 0, 0.16, d], [w / 2 + 0.08, 0, 0.16, d]].forEach(([x, z, ww, dd]) => addBox(this.group, ww, 0.07, dd, coping, { position: [cx + x, 0.035, cz + z], cast: false }));
    const ladderMat = plain('#c9ced1', { metalness: 0.85, roughness: 0.2 });
    [-0.28, 0.28].forEach((x) => {
      addCylinder(this.group, 0.022, 0.022, 0.8, 10, ladderMat, { position: [cx + w / 2 - 0.35 + x, 0.38, cz - d / 2 + 0.1] });
      addCylinder(this.group, 0.022, 0.022, 0.35, 10, ladderMat, { position: [cx + w / 2 - 0.35 + x, 0.74, cz - d / 2 + 0.26], rotation: [Math.PI / 2, 0, 0] });
    });
    const poolLight = new THREE.PointLight('#69d7f0', 0.4, 7, 2);
    poolLight.position.set(cx, 0.2, cz);
    this.group.add(poolLight);
    this.gardenLights.push(poolLight);
  }

  private createGarden() {
    const rand = seedRandom(20261124);
    const trunkMat = mat('wood', '#9b7654', { normalScale: 0.5 });
    const leafA = plain('#4f7b54', { roughness: 0.86, side: THREE.DoubleSide });
    const leafB = plain('#3f6b45', { roughness: 0.86, side: THREE.DoubleSide });
    const hedgeMat = plain('#406c48', { roughness: 0.9 });
    this.foliageMaterials.push(leafA, leafB, hedgeMat);

    const treeSpots: Array<[number, number]> = [
      [-18, -15], [-20, -6], [-19, 4], [-17, 12], [-11, -18], [0, -19], [10, -18], [18, -15],
      [20, -5], [19, 5], [17, 12], [-15, 16], [14, 16],
    ];
    treeSpots.forEach(([x, z], i) => {
      const g = new THREE.Group();
      g.position.set(x, -0.05, z);
      const h = 2.4 + rand() * 1.8;
      addCylinder(g, 0.13, 0.2, h, 10, trunkMat, { position: [0, h / 2, 0] });
      for (let j = 0; j < 3; j += 1) {
        addSphere(g, 0.85 + rand() * 0.45, j % 2 ? leafA : leafB, {
          position: [(rand() - 0.5) * 0.8, h + 0.3 + j * 0.35, (rand() - 0.5) * 0.8],
          scale: [1.15, 0.9, 1.05],
        });
      }
      if (i % 3 === 0) addCone(g, 1.0, 2.2, 10, leafB, { position: [0, h + 1.1, 0] });
      this.group.add(g);
    });

    // Sebes em instâncias para manter o desempenho.
    const hedgeGeo = new THREE.BoxGeometry(0.9, 0.62, 0.9);
    const hedgeCount = 46;
    const hedges = new THREE.InstancedMesh(hedgeGeo, hedgeMat, hedgeCount);
    const dummy = new THREE.Object3D();
    for (let i = 0; i < hedgeCount; i += 1) {
      const edge = i % 4;
      const t = (i / hedgeCount) * LOT_W * TILE - LOT_W * TILE / 2;
      let x = t; let z = -LOT_D * TILE / 2 - 1.1;
      if (edge === 1) { x = -LOT_W * TILE / 2 - 1.1; z = t; }
      if (edge === 2) { x = t; z = -LOT_D * TILE / 2 - 1.9; }
      if (edge === 3) { x = LOT_W * TILE / 2 + 1.1; z = t; }
      if (z > LOT_D * TILE / 2 - 1) z = LOT_D * TILE / 2 - 1;
      dummy.position.set(x, 0.2, z);
      dummy.scale.set(0.9 + rand() * 0.4, 0.8 + rand() * 0.5, 0.9 + rand() * 0.4);
      dummy.rotation.set(0, rand() * 0.4, 0);
      dummy.updateMatrix();
      hedges.setMatrixAt(i, dummy.matrix);
    }
    hedges.castShadow = true;
    hedges.receiveShadow = true;
    this.group.add(hedges);

    const flowerColors = ['#e8b6c8', '#f3d38a', '#c9a7e8', '#f7f3ec', '#e98d7a'];
    flowerColors.forEach((color, ci) => {
      const geo = new THREE.SphereGeometry(0.085, 8, 6);
      const material = plain(color, { roughness: 0.8 });
      const count = 26;
      const mesh = new THREE.InstancedMesh(geo, material, count);
      const d = new THREE.Object3D();
      for (let i = 0; i < count; i += 1) {
        const side = i % 2 === 0 ? -1 : 1;
        const x = side * (LOT_W * TILE / 2 + 1.8 + rand() * 3.5);
        const z = -LOT_D * TILE / 2 + rand() * LOT_D * TILE;
        d.position.set(x, 0.12 + rand() * 0.12, Math.min(z, LOT_D * TILE / 2 - 1));
        d.scale.setScalar(0.8 + rand() * 0.8);
        d.updateMatrix();
        mesh.setMatrixAt(i, d.matrix);
      }
      mesh.castShadow = false;
      this.group.add(mesh);
      this.flowerGroups.push(mesh);
      void ci;
    });

    // Postes e luzes de jardim.
    const lampPositions: Array<[number, number]> = [
      [gridX(4) - 0.4, gridZ(18) + 0.4], [gridX(18) + 0.4, gridZ(17) + 0.4],
      [gridX(19) + 0.2, gridZ(9)], [gridX(2), gridZ(17)],
      [gridX(9), gridZ(3) - 0.6],
    ];
    lampPositions.forEach(([x, z]) => {
      addCylinder(this.group, 0.035, 0.05, 1.55, 10, plain('#3c4650', { metalness: 0.6 }), { position: [x, 0.78, z] });
      addCylinder(this.group, 0.16, 0.16, 0.04, 16, plain('#3c4650', { metalness: 0.6 }), { position: [x, 1.57, z] });
      addSphere(this.group, 0.09, emissive('#ffe1a8'), { position: [x, 1.52, z], cast: false });
      addSprite(this.group, this.glowMat, { position: [x, 1.52, z], scale: [1.25, 1.25, 1] });
      const light = new THREE.PointLight('#ffd6a0', 0, 6.5, 2);
      light.position.set(x, 1.5, z);
      this.group.add(light);
      this.gardenLights.push(light);
    });

    // Luzes internas discretas.
    [[gridX(7), gridZ(7)], [gridX(15), gridZ(7)], [gridX(7), gridZ(14)], [gridX(16), gridZ(14)]].forEach(([x, z]) => {
      const light = new THREE.PointLight('#ffd8a8', 0, 9, 2);
      light.position.set(x, 2.35, z);
      this.group.add(light);
      this.gardenLights.push(light);
    });
  }

  private createClouds() {
    const rand = seedRandom(7731);
    for (let i = 0; i < 9; i += 1) {
      const cloud = new THREE.Group();
      const baseX = -45 + rand() * 90;
      const baseZ = -40 + rand() * 80;
      const y = 20 + rand() * 12;
      cloud.position.set(baseX, y, baseZ);
      for (let j = 0; j < 5; j += 1) {
        addSphere(cloud, 1.4 + rand() * 1.5, this.cloudMat, {
          position: [(j - 2) * 1.5 + rand(), (rand() - 0.5) * 0.7, (rand() - 0.5) * 1.4],
          scale: [1.5, 0.55, 0.9], cast: false, receive: false,
        });
      }
      cloud.userData.speed = 0.12 + rand() * 0.18;
      this.clouds.push(cloud);
      this.group.add(cloud);
    }
  }

  private createStars() {
    const count = 380;
    const positions = new Float32Array(count * 3);
    const rand = seedRandom(99173);
    for (let i = 0; i < count; i += 1) {
      const angle = rand() * Math.PI * 2;
      const radius = 60 + rand() * 80;
      const y = 18 + rand() * 70;
      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = Math.sin(angle) * radius;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const points = new THREE.Points(geometry, this.starMat);
    points.frustumCulled = false;
    this.group.add(points);
    return points;
  }

  private createPrecipitation() {
    const count = 1100;
    const positions = new Float32Array(count * 3);
    const speeds = new Float32Array(count);
    const rand = seedRandom(424242);
    for (let i = 0; i < count; i += 1) {
      positions[i * 3] = -28 + rand() * 56;
      positions[i * 3 + 1] = 1 + rand() * 26;
      positions[i * 3 + 2] = -28 + rand() * 56;
      speeds[i] = 0.75 + rand() * 0.7;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const points = new THREE.Points(geometry, this.precipitationMat);
    points.frustumCulled = false;
    points.visible = false;
    this.group.add(points);
    return { points, positions, speeds };
  }

  private updateSeason(season: Season) {
    if (this.lastSeason === season) return;
    this.lastSeason = season;
    const tint: Record<Season, string> = {
      spring: '#ffffff', summer: '#f3f7df', autumn: '#e5d7b7', winter: '#dfe9e6',
    };
    const foliage: Record<Season, string> = {
      spring: '#4f8a55', summer: '#3f7b48', autumn: '#bd7b43', winter: '#6f8f7c',
    };
    this.grassMat.color.set(tint[season]);
    this.foliageMaterials.forEach((material, i) => material.color.set(i === 2 ? foliage[season] : new THREE.Color(foliage[season]).multiplyScalar(i === 0 ? 1 : 0.88)));
    this.flowerGroups.forEach((group) => { group.visible = season !== 'winter'; });
  }

  private updatePrecipitation(dt: number, weather: Weather, season: Season) {
    const winter = season === 'winter';
    const active = weather === 'rain' || weather === 'storm';
    this.precipitation.visible = active;
    if (!active) return;
    const snow = winter;
    this.precipitationMat.color.set(snow ? '#ffffff' : '#bcd8ff');
    this.precipitationMat.size = snow ? 0.28 : weather === 'storm' ? 0.58 : 0.46;
    this.precipitationMat.opacity = snow ? 0.82 : weather === 'storm' ? 0.7 : 0.5;
    const speed = snow ? 2.4 : weather === 'storm' ? 19 : 13;
    const drift = weather === 'storm' ? 2.2 : 0.7;
    for (let i = 0; i < this.precipSpeeds.length; i += 1) {
      const idx = i * 3;
      this.precipPositions[idx + 1] -= dt * speed * this.precipSpeeds[i];
      this.precipPositions[idx] += dt * drift * (snow ? Math.sin(i) * 0.3 : 1);
      if (this.precipPositions[idx + 1] < 0) {
        this.precipPositions[idx + 1] = 22 + (i % 7);
        this.precipPositions[idx] = -28 + ((i * 37) % 56);
        this.precipPositions[idx + 2] = -28 + ((i * 53) % 56);
      }
      if (this.precipPositions[idx] > 28) this.precipPositions[idx] = -28;
    }
    this.precipitation.geometry.attributes.position.needsUpdate = true;
  }

  update(dt: number, state: GameState) {
    const minutes = state.clock.minutes;
    const weather = state.weather;
    const season = state.clock.season;
    const pal = paletteFor(minutes, weather);
    const elevation = Math.sin(((minutes - 360) / 720) * Math.PI);
    const dayFactor = clamp((elevation + 0.12) / 0.62, 0, 1);
    const nightFactor = 1 - clamp((elevation + 0.2) / 0.5, 0, 1);
    const weatherFactor = weather === 'clear' ? 1 : weather === 'cloudy' ? 0.68 : weather === 'rain' ? 0.42 : 0.3;

    this.skyMat.uniforms.topColor.value.copy(pal.top);
    this.skyMat.uniforms.bottomColor.value.copy(pal.bottom);
    this.skyMat.uniforms.sunColor.value.copy(pal.sun);
    const bg = pal.bottom.clone().lerp(pal.top, 0.42);
    this.scene.background = bg;
    if (this.scene.fog instanceof THREE.FogExp2) {
      this.scene.fog.color.copy(pal.fog);
      this.scene.fog.density = pal.fogDensity;
    }
    if ('environmentIntensity' in this.scene) {
      (this.scene as THREE.Scene & { environmentIntensity: number }).environmentIntensity = 0.3 + dayFactor * 0.75;
    }

    const azimuth = (minutes / 1440) * Math.PI * 2 - Math.PI / 2;
    const radius = 42;
    const sunY = Math.max(1.5, elevation * 34 + 10);
    const sunX = Math.cos(azimuth) * radius;
    const sunZ = Math.sin(azimuth) * radius;
    this.sun.position.set(sunX, sunY, sunZ);
    this.sun.color.copy(pal.sun);
    this.sun.intensity = (0.08 + dayFactor * 2.15) * weatherFactor + this.lightningFlash * 1.6;
    this.sun.castShadow = state.settings.shadows && dayFactor > 0.12;
    this.moon.position.set(-sunX, 24, -sunZ);
    this.moon.intensity = nightFactor * 0.38;
    this.hemi.intensity = 0.32 + dayFactor * 0.85 * weatherFactor + this.lightningFlash * 0.5;
    this.ambient.intensity = 0.14 + dayFactor * 0.16 + nightFactor * 0.08 + this.lightningFlash * 0.35;
    this.skyMat.uniforms.sunDirection.value.set(sunX, Math.max(0.1, elevation), sunZ).normalize();
    this.skyMat.uniforms.sunIntensity.value = dayFactor * (weather === 'clear' ? 1.25 : weather === 'cloudy' ? 0.45 : 0.12);

    const lampIntensity = nightFactor * 1.55;
    this.gardenLights.forEach((light, i) => { light.intensity = lampIntensity * (i === 0 ? 1.4 : 1); });
    this.glowMat.opacity = 0.22 + nightFactor * 0.7;

    const cloudOpacity = weather === 'clear' ? 0.16 : weather === 'cloudy' ? 0.55 : weather === 'rain' ? 0.72 : 0.88;
    this.cloudMat.opacity = cloudOpacity;
    this.cloudMat.color.set(weather === 'storm' ? '#6d7480' : weather === 'rain' ? '#a9b4be' : '#ffffff');
    this.clouds.forEach((cloud) => {
      cloud.position.x += dt * (cloud.userData.speed as number) * (weather === 'storm' ? 2.2 : 1);
      if (cloud.position.x > 55) cloud.position.x = -55;
    });
    this.starMat.opacity = nightFactor * (weather === 'clear' ? 0.9 : weather === 'cloudy' ? 0.35 : 0.08);
    this.stars.visible = nightFactor > 0.05;

    if (this.waterMat.normalMap) {
      this.waterMat.normalMap.offset.x += dt * 0.018;
      this.waterMat.normalMap.offset.y += dt * 0.012;
      this.waterMat.normalMap.needsUpdate = true;
    }
    this.waterMat.opacity = 0.72 + Math.sin(performance.now() * 0.0008) * 0.05;

    this.updatePrecipitation(dt, weather, season);
    this.updateSeason(season);

    if (weather === 'storm') {
      this.lightningTimer -= dt;
      if (this.lightningTimer <= 0) {
        this.lightningFlash = 1;
        this.lightningTimer = 5 + Math.random() * 9;
      }
    } else {
      this.lightningTimer = 6;
    }
    this.lightningFlash = Math.max(0, this.lightningFlash - dt * 4.5);

    const quality = state.settings.quality;
    if (this.lastQuality !== quality) {
      this.lastQuality = quality;
      const size = quality === 'high' ? 2048 : 1024;
      this.sun.shadow.mapSize.set(size, size);
      if (this.sun.shadow.map) {
        this.sun.shadow.map.dispose();
        this.sun.shadow.map = null;
      }
    }
  }

  dispose() {
    this.scene.remove(this.group);
    this.group.traverse((child) => {
      if (child instanceof THREE.Points) {
        child.geometry.dispose();
        (child.material as THREE.Material).dispose();
      }
    });
    disposeObject(this.group);
    this.skyMat.dispose();
    this.scene.fog = null;
    this.scene.background = null;
  }
}
