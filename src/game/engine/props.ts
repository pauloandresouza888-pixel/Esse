import * as THREE from 'three';
import { TILE } from '../constants';
import { getDef } from '../data';
import type { FurnitureObject } from '../types';
import {
  artMaterial, emissive, glass, glowSpriteMaterial, mat, plain, screenMaterial,
} from './materials';
import {
  addBox, addCapsule, addCone, addCylinder, addGroup, addPlane, addRoundedBox,
  addSphere, addSprite, addTorus, type Placement,
} from './primitives';

const cache = new Map<string, THREE.Material>();

function cached<T extends THREE.Material>(key: string, factory: () => T): T {
  const existing = cache.get(key);
  if (existing) return existing as T;
  const created = factory();
  cache.set(key, created);
  return created;
}

const wood = (color = '#ffffff') => cached(`wood:${color}`, () => {
  // O mapa de madeira já carrega a cor; o parâmetro funciona como um verniz suave.
  const tint = new THREE.Color(color).lerp(new THREE.Color('#ffffff'), 0.62);
  return mat('wood', tint, { normalScale: 0.55 });
});
const painted = (color = '#e8e2d8') => cached(`painted:${color}`, () => mat('paintedWood', color, { normalScale: 0.35 }));
const fabric = (color = '#d8b08d') => cached(`fabric:${color}`, () => mat('fabric', color, { normalScale: 0.45, envMapIntensity: 0.6 }));
const fabricPlane = (color: string) => cached(`fabricPlane:${color}`, () => mat('fabric', color, { side: THREE.DoubleSide, normalScale: 0.5 }));
const leather = (color = '#8b6f64') => cached(`leather:${color}`, () => mat('leather', color, { normalScale: 0.35, envMapIntensity: 0.9 }));
const metal = (color = '#b9c0c4') => cached(`metal:${color}`, () => mat('metal', color, { metalness: 0.82, roughness: 0.55, normalScale: 0.35, envMapIntensity: 1.5 }));
const darkMetal = (color = '#3c4650') => cached(`darkMetal:${color}`, () => plain(color, { metalness: 0.65, roughness: 0.32, envMapIntensity: 1.3 }));
const ceramic = (color = '#f2f1ed') => cached(`ceramic:${color}`, () => mat('ceramic', color, { normalScale: 0.2, envMapIntensity: 1.1 }));
const marble = (color = '#ffffff') => cached(`marble:${color}`, () => mat('marble', color, { normalScale: 0.35, envMapIntensity: 1.25 }));
const stone = (color = '#ffffff') => cached(`stone:${color}`, () => mat('stone', color, { normalScale: 0.7 }));
const plastic = (color = '#2f3b44') => cached(`plastic:${color}`, () => mat('plastic', color, { normalScale: 0.25 }));
const leaf = (color = '#4f7b54') => cached(`leaf:${color}`, () => plain(color, { roughness: 0.82, side: THREE.DoubleSide }));
const glow = () => cached('glow', () => glowSpriteMaterial());
const tvScreen = () => cached('screen:tv', () => screenMaterial('tv'));
const pcScreen = () => cached('screen:pc', () => screenMaterial('computer'));
const mirrorMat = () => cached('mirror', () => plain('#cbd8dc', { metalness: 0.92, roughness: 0.06, envMapIntensity: 2.2, side: THREE.DoubleSide }));
const fireGlow = () => cached('fire', () => emissive('#ff9a45'));
const warmLight = () => cached('warmLight', () => emissive('#ffe1a8'));
const screenGlow = () => cached('screenGlow', () => emissive('#79d7ff'));

const BOOK_COLORS = ['#c8796b', '#4f6b63', '#d2a66f', '#3f5963', '#b8847b', '#8aa39a'];

function rand(seed: number) {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

function legs(g: THREE.Group, xs: number[], zs: number[], height: number, material: THREE.Material, radius = 0.026) {
  xs.forEach((x) => zs.forEach((z) => {
    addCylinder(g, radius, radius * 0.8, height, 10, material, { position: [x, height / 2, z] });
  }));
}

function book(g: THREE.Group, x: number, y: number, z: number, color: string, h = 0.25, w = 0.055) {
  addRoundedBox(g, w, h, 0.18, 0.008, plain(color, { roughness: 0.8 }), { position: [x, y + h / 2, z] });
}

function pillow(g: THREE.Group, x: number, y: number, z: number, color: string, w = 0.42, d = 0.28) {
  addRoundedBox(g, w, 0.12, d, 0.06, fabric(color), { position: [x, y, z], rotation: [0, rand(x * 7 + z) * 0.3 - 0.15, 0] });
}

function plantLeaves(g: THREE.Group, y: number, color: string, seed: number, count = 8) {
  for (let i = 0; i < count; i += 1) {
    const angle = (i / count) * Math.PI * 2 + rand(seed + i) * 0.4;
    const length = 0.22 + rand(seed + i * 3) * 0.16;
    const px = Math.cos(angle) * length * 0.55;
    const pz = Math.sin(angle) * length * 0.55;
    addSphere(g, 0.16, leaf(color), {
      position: [px, y + 0.14 + rand(seed + i * 5) * 0.18, pz],
      rotation: [0.5 + rand(seed + i) * 0.5, angle, 0.35],
      scale: [0.55, 0.12, 1.15],
    });
  }
}

export function buildProp(o: FurnitureObject): THREE.Group {
  const def = getDef(o.defId);
  const color = o.color ?? def.defaultColor;
  const v = o.variant ?? 0;
  const W = def.footprint[0] * TILE;
  const D = def.footprint[1] * TILE;
  const g = new THREE.Group();
  g.userData.model = def.model;
  g.userData.defId = def.id;
  g.userData.selectable = true;

  switch (def.model) {
    case 'sofa': {
      const w = Math.min(W * 0.92, 2.2);
      const d = Math.min(D * 0.9, 0.95);
      addRoundedBox(g, w, 0.26, d * 0.88, 0.08, fabric(color), { position: [0, 0.32, 0] });
      [-w * 0.25, w * 0.25].forEach((x) => {
        addRoundedBox(g, w * 0.45, 0.15, d * 0.72, 0.06, fabric(color), { position: [x, 0.53, 0.04] });
        addRoundedBox(g, w * 0.44, 0.5, 0.16, 0.07, fabric(color), { position: [x, 0.72, -d * 0.36] });
      });
      [-w * 0.48, w * 0.48].forEach((x) => addRoundedBox(g, 0.17, 0.42, d * 0.92, 0.07, fabric(color), { position: [x, 0.48, 0] }));
      pillow(g, w * 0.24, 0.67, d * 0.18, '#e9e3d8', 0.34, 0.24);
      pillow(g, -w * 0.28, 0.67, d * 0.16, '#8aa39a', 0.32, 0.22);
      legs(g, [-w * 0.42, w * 0.42], [-d * 0.36, d * 0.36], 0.19, wood('#6f4b36'));
      break;
    }
    case 'armchair': {
      addRoundedBox(g, 0.78, 0.24, 0.72, 0.08, fabric(color), { position: [0, 0.32, 0] });
      addRoundedBox(g, 0.7, 0.14, 0.62, 0.06, fabric(color), { position: [0, 0.5, 0.03] });
      addRoundedBox(g, 0.74, 0.5, 0.16, 0.07, fabric(color), { position: [0, 0.72, -0.3] });
      [-0.36, 0.36].forEach((x) => addRoundedBox(g, 0.14, 0.36, 0.74, 0.06, fabric(color), { position: [x, 0.46, 0] }));
      legs(g, [-0.3, 0.3], [-0.26, 0.26], 0.2, wood('#6f4b36'));
      break;
    }
    case 'coffeeTable': {
      addRoundedBox(g, 1.75, 0.09, 0.68, 0.04, wood(color), { position: [0, 0.43, 0] });
      addRoundedBox(g, 1.5, 0.04, 0.5, 0.02, wood('#6f4b36'), { position: [0, 0.18, 0] });
      legs(g, [-0.76, 0.76], [-0.27, 0.27], 0.4, darkMetal('#3c4650'), 0.022);
      addRoundedBox(g, 0.32, 0.035, 0.23, 0.008, plain(BOOK_COLORS[v % BOOK_COLORS.length]), { position: [-0.35, 0.48, 0.04] });
      addCylinder(g, 0.075, 0.055, 0.16, 12, ceramic('#d8c7b5'), { position: [0.45, 0.53, -0.08] });
      plantLeaves(addGroup(g, { position: [0.45, 0.6, -0.08] }), 0, '#5c8a5e', v + 2, 5);
      break;
    }
    case 'tv': {
      addRoundedBox(g, 1.0, 0.08, 0.32, 0.03, darkMetal(), { position: [0, 0.1, 0] });
      addCylinder(g, 0.035, 0.035, 0.48, 12, darkMetal(), { position: [0, 0.34, 0] });
      addRoundedBox(g, 1.18, 0.7, 0.055, 0.02, darkMetal(color), { position: [0, 0.94, 0] });
      addPlane(g, 1.1, 0.62, tvScreen(), { position: [0, 0.94, 0.032], cast: false });
      addRoundedBox(g, 0.75, 0.055, 0.1, 0.02, darkMetal(), { position: [0, 0.53, 0.18] });
      addBox(g, 0.035, 0.018, 0.022, screenGlow(), { position: [0.48, 0.64, 0.035], cast: false });
      break;
    }
    case 'bookshelf': {
      addRoundedBox(g, 0.95, 1.9, 0.34, 0.03, wood(color), { position: [0, 0.95, 0] });
      addRoundedBox(g, 0.88, 1.78, 0.02, 0.01, painted('#d8c7b5'), { position: [0, 0.95, -0.16] });
      for (let i = 0; i < 4; i += 1) {
        const y = 0.32 + i * 0.44;
        addRoundedBox(g, 0.9, 0.035, 0.34, 0.01, wood('#6f4b36'), { position: [0, y, 0] });
        let x = -0.38;
        for (let b = 0; b < 5; b += 1) {
          const h = 0.22 + rand(v * 10 + i * 5 + b) * 0.12;
          book(g, x, y + 0.02, 0.02, BOOK_COLORS[(v + i + b) % BOOK_COLORS.length], h);
          x += 0.07 + rand(v + b) * 0.02;
        }
      }
      addCylinder(g, 0.09, 0.07, 0.16, 12, ceramic('#d8c7b5'), { position: [0.3, 1.82, 0] });
      plantLeaves(addGroup(g, { position: [0.3, 1.9, 0] }), 0, '#5c8a5e', v + 7, 5);
      break;
    }
    case 'stereo': {
      addRoundedBox(g, 0.48, 0.78, 0.34, 0.05, fabric('#6f6f6f'), { position: [0, 0.39, 0] });
      [0.55, 0.25].forEach((y, i) => {
        addCylinder(g, i === 0 ? 0.095 : 0.14, i === 0 ? 0.095 : 0.14, 0.025, 24, darkMetal('#252d34'), { position: [0, y, 0.18], rotation: [Math.PI / 2, 0, 0] });
        addCylinder(g, 0.045, 0.045, 0.028, 20, plain('#59636b'), { position: [0, y, 0.195], rotation: [Math.PI / 2, 0, 0] });
      });
      addRoundedBox(g, 0.42, 0.06, 0.32, 0.02, wood('#8b6245'), { position: [0, 0.8, 0] });
      addBox(g, 0.07, 0.015, 0.015, screenGlow(), { position: [0.16, 0.71, 0.18], cast: false });
      break;
    }
    case 'rug': {
      addPlane(g, W * 0.94, D * 0.9, fabricPlane(color), { rotation: [-Math.PI / 2, 0, 0], position: [0, 0.006, 0], cast: false });
      for (let i = 0; i < 5; i += 1) {
        const x = -W * 0.38 + i * (W * 0.19);
        addBox(g, W * 0.12, 0.006, D * 0.88, fabricPlane('#e9e3d8'), { position: [x, 0.009, 0], rotation: [0, 0.12, 0], cast: false });
      }
      break;
    }
    case 'floorLamp': {
      addCylinder(g, 0.2, 0.22, 0.045, 24, darkMetal('#4a525a'), { position: [0, 0.025, 0] });
      addCylinder(g, 0.018, 0.018, 1.35, 12, metal('#b9a27d'), { position: [0, 0.72, 0] });
      addCylinder(g, 0.26, 0.18, 0.32, 24, fabric(color), { position: [0, 1.48, 0] });
      addCylinder(g, 0.16, 0.16, 0.02, 20, warmLight(), { position: [0, 1.31, 0], cast: false });
      addSprite(g, glow(), { position: [0, 1.42, 0], scale: [1.25, 1.25, 1] });
      break;
    }
    case 'plant': {
      addCylinder(g, 0.19, 0.14, 0.3, 20, ceramic('#d8c7b5'), { position: [0, 0.15, 0] });
      addCylinder(g, 0.175, 0.175, 0.02, 20, plain('#3b2f26'), { position: [0, 0.305, 0] });
      plantLeaves(g, 0.3, color, v + 3, 10);
      addCylinder(g, 0.018, 0.018, 0.45, 8, leaf('#3f6b45'), { position: [0, 0.52, 0] });
      break;
    }
    case 'painting': {
      addRoundedBox(g, 0.98, 0.72, 0.055, 0.015, wood('#6f4b36'), { position: [0, 0, 0] });
      addPlane(g, 0.88, 0.62, artMaterial(v + 1, color), { position: [0, 0, 0.031], cast: false });
      break;
    }
    case 'fireplace': {
      addRoundedBox(g, 1.55, 1.1, 0.42, 0.04, stone(color), { position: [0, 0.55, 0] });
      addRoundedBox(g, 1.05, 0.62, 0.05, 0.02, darkMetal('#1b2228'), { position: [0, 0.49, 0.225] });
      addRoundedBox(g, 1.75, 0.1, 0.5, 0.025, marble(), { position: [0, 1.15, 0] });
      for (let i = 0; i < 5; i += 1) {
        addCylinder(g, 0.05, 0.05, 0.55, 8, plain('#5b3b28'), { position: [-0.38 + i * 0.19, 0.28, 0.22], rotation: [0, 0, Math.PI / 2 + (i % 2 ? 0.2 : -0.2)] });
      }
      addSphere(g, 0.22, fireGlow(), { position: [0, 0.32, 0.22], scale: [1.6, 0.8, 0.35], cast: false });
      addSprite(g, glow(), { position: [0, 0.42, 0.3], scale: [1.5, 1.1, 1] });
      break;
    }
    case 'diningTable': {
      addRoundedBox(g, 1.72, 0.08, 1.12, 0.06, wood(color), { position: [0, 0.76, 0] });
      addRoundedBox(g, 1.55, 0.05, 0.96, 0.03, wood('#6f4b36'), { position: [0, 0.68, 0] });
      [-0.58, 0.58].forEach((x) => [-0.4, 0.4].forEach((z) => addCylinder(g, 0.045, 0.055, 0.68, 12, darkMetal('#4a525a'), { position: [x, 0.34, z] })));
      addCylinder(g, 0.11, 0.08, 0.22, 16, ceramic('#d8c7b5'), { position: [0, 0.9, 0] });
      plantLeaves(addGroup(g, { position: [0, 0.98, 0] }), 0, '#5c8a5e', v + 4, 6);
      break;
    }
    case 'diningChair': {
      addRoundedBox(g, 0.52, 0.09, 0.5, 0.04, fabric(color), { position: [0, 0.46, 0] });
      addRoundedBox(g, 0.52, 0.55, 0.08, 0.035, wood('#8b6245'), { position: [0, 0.76, -0.23], rotation: [-0.1, 0, 0] });
      legs(g, [-0.2, 0.2], [-0.19, 0.19], 0.42, wood('#6f4b36'), 0.022);
      break;
    }
    case 'bedDouble':
    case 'bedSingle': {
      const double = def.model === 'bedDouble';
      const w = double ? 1.9 : 1.05;
      const d = 2.08;
      addRoundedBox(g, w, 0.28, d, 0.05, wood('#6f4b36'), { position: [0, 0.24, 0] });
      addRoundedBox(g, w - 0.08, 0.22, d - 0.1, 0.08, ceramic('#f2f1ed'), { position: [0, 0.45, 0] });
      addRoundedBox(g, w, 0.86, 0.14, 0.05, fabric(color), { position: [0, 0.66, -d * 0.48] });
      addRoundedBox(g, w - 0.1, 0.09, d * 0.58, 0.05, fabric(color), { position: [0, 0.59, d * 0.16] });
      addRoundedBox(g, w - 0.12, 0.035, d * 0.32, 0.025, fabric('#e9e3d8'), { position: [0, 0.64, -d * 0.28] });
      const pillows = double ? [-0.42, 0.42] : [0];
      pillows.forEach((x) => pillow(g, x, 0.66, -d * 0.34, '#f7f3ec', double ? 0.72 : 0.82, 0.36));
      addRoundedBox(g, w * 0.55, 0.06, 0.5, 0.04, fabric('#8aa39a'), { position: [0, 0.66, d * 0.34], rotation: [0, 0.08, 0] });
      break;
    }
    case 'nightstand': {
      addRoundedBox(g, 0.56, 0.48, 0.46, 0.025, wood(color), { position: [0, 0.24, 0] });
      addRoundedBox(g, 0.5, 0.16, 0.02, 0.01, painted('#e8e2d8'), { position: [0, 0.32, 0.235] });
      addCylinder(g, 0.018, 0.018, 0.05, 10, metal('#b9a27d'), { position: [0, 0.32, 0.25], rotation: [Math.PI / 2, 0, 0] });
      addCylinder(g, 0.09, 0.11, 0.025, 16, darkMetal(), { position: [0, 0.5, 0] });
      addCylinder(g, 0.012, 0.012, 0.2, 8, metal('#b9a27d'), { position: [0, 0.61, 0] });
      addCone(g, 0.14, 0.16, 16, fabric('#e8dcc5'), { position: [0, 0.76, 0] });
      break;
    }
    case 'wardrobe': {
      addRoundedBox(g, 1.8, 2.08, 0.62, 0.035, wood(color), { position: [0, 1.04, 0] });
      [-0.44, 0.44].forEach((x) => {
        addRoundedBox(g, 0.84, 1.94, 0.035, 0.015, painted(color), { position: [x, 1.04, 0.325] });
        for (let i = 0; i < 9; i += 1) addBox(g, 0.72, 0.012, 0.012, wood('#6f4b36'), { position: [x, 0.22 + i * 0.2, 0.347], cast: false });
        addCylinder(g, 0.018, 0.018, 0.22, 10, metal('#b9a27d'), { position: [x + (x < 0 ? 0.3 : -0.3), 1.05, 0.36] });
      });
      break;
    }
    case 'mirror': {
      addRoundedBox(g, 0.72, 1.75, 0.06, 0.03, metal('#b9a27d'), { position: [0, 0.9, 0] });
      addPlane(g, 0.62, 1.62, mirrorMat(), { position: [0, 0.9, 0.035], cast: false });
      addCylinder(g, 0.13, 0.18, 0.05, 16, metal('#b9a27d'), { position: [0, 0.03, 0] });
      break;
    }
    case 'fridge': {
      addRoundedBox(g, 0.86, 1.9, 0.72, 0.05, metal(color), { position: [0, 0.95, 0] });
      [-0.215, 0.215].forEach((x) => {
        addRoundedBox(g, 0.41, 1.18, 0.025, 0.015, metal('#c9ced1'), { position: [x, 1.28, 0.37] });
        addRoundedBox(g, 0.41, 0.55, 0.025, 0.015, metal('#c9ced1'), { position: [x, 0.36, 0.37] });
        addCylinder(g, 0.018, 0.018, 0.3, 10, darkMetal('#51595e'), { position: [x + (x < 0 ? 0.16 : -0.16), 1.3, 0.4] });
      });
      addRoundedBox(g, 0.2, 0.1, 0.012, 0.006, screenGlow(), { position: [0.24, 1.62, 0.39], cast: false });
      break;
    }
    case 'stove': {
      addRoundedBox(g, 0.94, 0.88, 0.66, 0.035, metal(color), { position: [0, 0.44, 0] });
      addRoundedBox(g, 0.9, 0.045, 0.62, 0.02, darkMetal('#20272d'), { position: [0, 0.9, 0] });
      [-0.22, 0.22].forEach((x) => [-0.16, 0.16].forEach((z) => addCylinder(g, 0.09, 0.09, 0.012, 20, darkMetal('#10161b'), { position: [x, 0.93, z] })));
      addRoundedBox(g, 0.76, 0.44, 0.02, 0.015, glass('#4a555d', 0.5), { position: [0, 0.42, 0.34] });
      addRoundedBox(g, 0.6, 0.035, 0.04, 0.01, metal('#c9ced1'), { position: [0, 0.66, 0.36] });
      [-0.3, -0.1, 0.1, 0.3].forEach((x) => addCylinder(g, 0.024, 0.024, 0.03, 12, darkMetal(), { position: [x, 0.86, 0.32], rotation: [Math.PI / 2, 0, 0] }));
      break;
    }
    case 'counter':
    case 'dishwasher': {
      addRoundedBox(g, 1.08, 0.84, 0.62, 0.025, painted(def.model === 'counter' ? color : '#c9ced1'), { position: [0, 0.42, 0] });
      addRoundedBox(g, 1.12, 0.055, 0.66, 0.018, marble(color), { position: [0, 0.87, 0] });
      if (def.model === 'counter') {
        addRoundedBox(g, 0.5, 0.34, 0.018, 0.008, painted('#e8e2d8'), { position: [-0.26, 0.5, 0.315] });
        addRoundedBox(g, 0.5, 0.34, 0.018, 0.008, painted('#e8e2d8'), { position: [0.26, 0.5, 0.315] });
        addCylinder(g, 0.014, 0.014, 0.14, 8, metal('#b9a27d'), { position: [-0.26, 0.62, 0.33], rotation: [Math.PI / 2, 0, 0] });
        addCylinder(g, 0.014, 0.014, 0.14, 8, metal('#b9a27d'), { position: [0.26, 0.62, 0.33], rotation: [Math.PI / 2, 0, 0] });
      } else {
        addRoundedBox(g, 0.9, 0.55, 0.015, 0.01, metal('#8e969b'), { position: [0, 0.48, 0.32] });
        addBox(g, 0.16, 0.025, 0.012, screenGlow(), { position: [0.3, 0.72, 0.335], cast: false });
      }
      break;
    }
    case 'sink': {
      addRoundedBox(g, 1.08, 0.84, 0.62, 0.025, painted('#e8e2d8'), { position: [0, 0.42, 0] });
      addRoundedBox(g, 1.12, 0.055, 0.66, 0.018, marble(), { position: [0, 0.87, 0] });
      addRoundedBox(g, 0.62, 0.035, 0.42, 0.035, metal('#aab2b6'), { position: [0, 0.9, 0.02] });
      addRoundedBox(g, 0.54, 0.02, 0.34, 0.03, darkMetal('#3f4a50'), { position: [0, 0.91, 0.02] });
      addCylinder(g, 0.018, 0.018, 0.3, 10, metal('#c9ced1'), { position: [0, 1.04, -0.24] });
      addCylinder(g, 0.018, 0.018, 0.22, 10, metal('#c9ced1'), { position: [0, 1.18, -0.14], rotation: [Math.PI / 2, 0, 0] });
      addCylinder(g, 0.014, 0.014, 0.06, 10, metal('#c9ced1'), { position: [0, 1.13, -0.04] });
      break;
    }
    case 'kitchenIsland': {
      addRoundedBox(g, 1.95, 0.84, 0.78, 0.03, painted(color), { position: [0, 0.42, 0] });
      addRoundedBox(g, 2.05, 0.07, 0.9, 0.02, marble(), { position: [0, 0.88, 0] });
      [-0.55, 0.55].forEach((x) => {
        addCylinder(g, 0.16, 0.16, 0.055, 20, fabric('#d8b08d'), { position: [x, 0.58, 0.62] });
        addCylinder(g, 0.035, 0.045, 0.55, 10, darkMetal(), { position: [x, 0.28, 0.62] });
        addCylinder(g, 0.2, 0.2, 0.03, 20, darkMetal(), { position: [x, 0.02, 0.62] });
      });
      addCylinder(g, 0.1, 0.08, 0.18, 16, ceramic('#d8c7b5'), { position: [0, 0.99, 0] });
      plantLeaves(addGroup(g, { position: [0, 1.06, 0] }), 0, '#5c8a5e', v + 8, 6);
      break;
    }
    case 'microwave': {
      addRoundedBox(g, 0.62, 0.36, 0.42, 0.025, metal(color), { position: [0, 0.18, 0] });
      addRoundedBox(g, 0.44, 0.26, 0.018, 0.01, glass('#26333a', 0.62), { position: [-0.07, 0.19, 0.215] });
      addRoundedBox(g, 0.1, 0.26, 0.018, 0.008, darkMetal('#2b3339'), { position: [0.24, 0.19, 0.215] });
      addBox(g, 0.06, 0.018, 0.01, screenGlow(), { position: [0.24, 0.28, 0.228], cast: false });
      break;
    }
    case 'toilet': {
      addRoundedBox(g, 0.48, 0.65, 0.2, 0.05, ceramic(), { position: [0, 0.55, -0.28] });
      addCylinder(g, 0.26, 0.2, 0.22, 24, ceramic(), { position: [0, 0.22, 0.08], scale: [1, 1, 1.25] });
      addTorus(g, 0.25, 0.035, ceramic(), { position: [0, 0.34, 0.08], rotation: [Math.PI / 2, 0, 0], scale: [1, 1.18, 1] });
      addRoundedBox(g, 0.44, 0.045, 0.36, 0.04, ceramic(), { position: [0, 0.37, 0.06] });
      addCylinder(g, 0.026, 0.026, 0.02, 12, metal('#b9a27d'), { position: [0.14, 0.9, -0.28] });
      break;
    }
    case 'shower': {
      addRoundedBox(g, 1.0, 0.06, 1.0, 0.025, ceramic('#e6e3dc'), { position: [0, 0.03, 0] });
      addPlane(g, 1.0, 2.0, glass('#cfe1e6', 0.34), { position: [0, 1.03, 0.5], cast: false });
      addPlane(g, 1.0, 2.0, glass('#cfe1e6', 0.3), { position: [0.5, 1.03, 0], rotation: [0, Math.PI / 2, 0], cast: false });
      addCylinder(g, 0.018, 0.018, 1.6, 10, metal('#3c4650'), { position: [-0.42, 0.83, -0.42] });
      addCylinder(g, 0.11, 0.11, 0.035, 20, metal('#c9ced1'), { position: [-0.3, 1.62, -0.2], rotation: [Math.PI / 2, 0, 0] });
      addCylinder(g, 0.012, 0.012, 0.18, 10, metal('#c9ced1'), { position: [-0.42, 0.95, -0.42], rotation: [0, 0, Math.PI / 2] });
      break;
    }
    case 'bathtub': {
      addRoundedBox(g, 1.95, 0.52, 0.92, 0.24, ceramic(), { position: [0, 0.32, 0] });
      addRoundedBox(g, 1.72, 0.035, 0.7, 0.18, glass('#8fc9d8', 0.62), { position: [0, 0.56, 0], cast: false });
      addCylinder(g, 0.018, 0.018, 0.48, 10, metal('#c9ced1'), { position: [0.78, 0.82, -0.35] });
      addCylinder(g, 0.018, 0.018, 0.26, 10, metal('#c9ced1'), { position: [0.68, 1.04, -0.28], rotation: [Math.PI / 2, 0, 0] });
      [-0.7, 0.7].forEach((x) => [-0.3, 0.3].forEach((z) => addCylinder(g, 0.05, 0.06, 0.08, 12, metal('#b9a27d'), { position: [x, 0.04, z] })));
      break;
    }
    case 'sinkBasin': {
      addRoundedBox(g, 0.95, 0.72, 0.52, 0.025, painted('#e8e2d8'), { position: [0, 0.36, 0] });
      addRoundedBox(g, 1.0, 0.05, 0.56, 0.015, marble(), { position: [0, 0.75, 0] });
      addCylinder(g, 0.24, 0.18, 0.12, 24, ceramic(), { position: [0, 0.81, 0.03], scale: [1.25, 1, 0.9] });
      addCylinder(g, 0.013, 0.013, 0.24, 10, metal('#c9ced1'), { position: [0, 0.93, -0.18] });
      addCylinder(g, 0.013, 0.013, 0.16, 10, metal('#c9ced1'), { position: [0, 1.04, -0.1], rotation: [Math.PI / 2, 0, 0] });
      addPlane(g, 0.7, 0.9, mirrorMat(), { position: [0, 1.45, -0.32], cast: false });
      break;
    }
    case 'desk': {
      addRoundedBox(g, 1.92, 0.075, 0.76, 0.025, wood(color), { position: [0, 0.75, 0] });
      addRoundedBox(g, 0.55, 0.62, 0.68, 0.025, painted('#e8e2d8'), { position: [0.62, 0.4, 0] });
      [-0.72, 0.72].forEach((x) => addCylinder(g, 0.035, 0.045, 0.72, 10, darkMetal(), { position: [x, 0.36, -0.28] }));
      addRoundedBox(g, 0.48, 0.15, 0.02, 0.008, painted('#d8c7b5'), { position: [0.62, 0.55, 0.35] });
      addCylinder(g, 0.012, 0.012, 0.12, 8, metal('#b9a27d'), { position: [0.62, 0.55, 0.37], rotation: [Math.PI / 2, 0, 0] });
      break;
    }
    case 'officeChair': {
      addRoundedBox(g, 0.55, 0.12, 0.52, 0.06, fabric(color), { position: [0, 0.52, 0] });
      addRoundedBox(g, 0.52, 0.62, 0.1, 0.05, fabric(color), { position: [0, 0.87, -0.24], rotation: [-0.12, 0, 0] });
      addCylinder(g, 0.045, 0.045, 0.42, 12, darkMetal(), { position: [0, 0.28, 0] });
      for (let i = 0; i < 5; i += 1) {
        const a = (i / 5) * Math.PI * 2;
        addCylinder(g, 0.025, 0.025, 0.38, 8, darkMetal(), { position: [Math.cos(a) * 0.2, 0.07, Math.sin(a) * 0.2], rotation: [0, -a, Math.PI / 2] });
        addCylinder(g, 0.04, 0.04, 0.035, 10, plastic('#20272d'), { position: [Math.cos(a) * 0.38, 0.04, Math.sin(a) * 0.38], rotation: [0, 0, Math.PI / 2] });
      }
      [-0.33, 0.33].forEach((x) => addRoundedBox(g, 0.06, 0.22, 0.06, 0.02, darkMetal(), { position: [x, 0.66, 0.02] }));
      break;
    }
    case 'computer': {
      addRoundedBox(g, 0.78, 0.46, 0.045, 0.015, darkMetal(color), { position: [0, 0.36, -0.12] });
      addPlane(g, 0.72, 0.4, pcScreen(), { position: [0, 0.36, -0.093], cast: false });
      addCylinder(g, 0.025, 0.035, 0.16, 12, darkMetal(), { position: [0, 0.1, -0.12] });
      addRoundedBox(g, 0.18, 0.025, 0.12, 0.012, darkMetal(), { position: [0, 0.03, -0.12] });
      addRoundedBox(g, 0.52, 0.018, 0.16, 0.01, plastic('#4a525a'), { position: [0, 0.015, 0.22] });
      addRoundedBox(g, 0.07, 0.025, 0.1, 0.018, plastic('#4a525a'), { position: [0.34, 0.018, 0.22] });
      addBox(g, 0.02, 0.012, 0.01, screenGlow(), { position: [0.32, 0.05, -0.09], cast: false });
      break;
    }
    case 'treadmill': {
      addRoundedBox(g, 0.72, 0.22, 1.72, 0.06, darkMetal(color), { position: [0, 0.22, 0.12] });
      addRoundedBox(g, 0.62, 0.035, 1.55, 0.03, plain('#20272d', { roughness: 0.9 }), { position: [0, 0.34, 0.12] });
      [-0.36, 0.36].forEach((x) => {
        addCylinder(g, 0.025, 0.025, 1.05, 10, metal('#b9c0c4'), { position: [x, 0.72, -0.62], rotation: [0.32, 0, 0] });
        addCylinder(g, 0.025, 0.025, 0.34, 10, metal('#b9c0c4'), { position: [x, 1.06, -0.78], rotation: [Math.PI / 2, 0, 0] });
      });
      addRoundedBox(g, 0.72, 0.16, 0.26, 0.025, darkMetal('#252d34'), { position: [0, 1.1, -0.72] });
      addPlane(g, 0.52, 0.1, screenGlow(), { position: [0, 1.11, -0.58], rotation: [-Math.PI / 2.6, 0, 0], cast: false });
      break;
    }
    case 'easel': {
      [-0.3, 0.3].forEach((x) => addCylinder(g, 0.022, 0.03, 1.6, 8, wood('#8b6245'), { position: [x, 0.8, -0.12], rotation: [0.12, 0, x > 0 ? -0.14 : 0.14] }));
      addCylinder(g, 0.022, 0.03, 1.4, 8, wood('#8b6245'), { position: [0, 0.7, 0.18], rotation: [-0.2, 0, 0] });
      addRoundedBox(g, 0.66, 0.05, 0.32, 0.015, wood('#8b6245'), { position: [0, 0.62, 0] });
      addRoundedBox(g, 0.62, 0.78, 0.035, 0.01, ceramic('#f7f3ec'), { position: [0, 1.05, 0.02] });
      addPlane(g, 0.56, 0.7, artMaterial(v + 21, color), { position: [0, 1.05, 0.041], cast: false });
      addCylinder(g, 0.11, 0.11, 0.02, 16, wood('#d2a66f'), { position: [0.34, 0.65, 0.14], rotation: [Math.PI / 2, 0, 0] });
      break;
    }
    case 'guitar': {
      addSphere(g, 0.26, wood(color), { position: [0, 0.34, 0.1], scale: [1, 1.15, 0.35] });
      addSphere(g, 0.2, wood(color), { position: [0, 0.62, 0.1], scale: [0.85, 1, 0.35] });
      addCylinder(g, 0.018, 0.018, 0.018, 20, darkMetal('#2b211d'), { position: [0, 0.47, 0.19], rotation: [Math.PI / 2, 0, 0] });
      addRoundedBox(g, 0.11, 0.9, 0.055, 0.02, wood('#8b6245'), { position: [0, 1.12, 0.1] });
      addRoundedBox(g, 0.16, 0.18, 0.06, 0.02, wood('#6f4b36'), { position: [0, 1.62, 0.1] });
      for (let i = -2; i <= 2; i += 1) addCylinder(g, 0.0035, 0.0035, 1.12, 6, metal('#d8d2c7'), { position: [i * 0.021, 1.1, 0.135] });
      break;
    }
    case 'lounger': {
      addRoundedBox(g, 0.78, 0.08, 1.85, 0.05, fabric(color), { position: [0, 0.42, 0.2] });
      addRoundedBox(g, 0.78, 0.08, 0.68, 0.05, fabric(color), { position: [0, 0.72, -0.78], rotation: [-0.72, 0, 0] });
      [-0.36, 0.36].forEach((x) => [-0.8, 0.85].forEach((z) => addCylinder(g, 0.03, 0.035, 0.38, 10, wood('#a97345'), { position: [x, 0.19, z] })));
      pillow(g, 0, 0.82, -0.72, '#e9e3d8', 0.5, 0.28);
      break;
    }
    case 'grill': {
      addCylinder(g, 0.38, 0.32, 0.22, 20, darkMetal(color), { position: [0, 0.72, 0] });
      addCylinder(g, 0.4, 0.4, 0.06, 20, darkMetal('#20272d'), { position: [0, 0.86, 0] });
      addSphere(g, 0.4, darkMetal('#30383e'), { position: [0, 0.9, 0], scale: [1, 0.55, 1], rotation: [0, 0, 0] });
      addCylinder(g, 0.018, 0.018, 0.72, 8, darkMetal(), { position: [-0.28, 0.36, -0.2] });
      addCylinder(g, 0.018, 0.018, 0.72, 8, darkMetal(), { position: [0.28, 0.36, -0.2] });
      addCylinder(g, 0.018, 0.018, 0.72, 8, darkMetal(), { position: [0, 0.36, 0.3] });
      addRoundedBox(g, 0.3, 0.06, 0.12, 0.02, darkMetal(), { position: [0, 0.72, 0.4] });
      [-0.1, 0.1].forEach((x) => addCylinder(g, 0.03, 0.03, 0.035, 12, metal('#b9a27d'), { position: [x, 0.73, 0.46], rotation: [Math.PI / 2, 0, 0] }));
      break;
    }
    case 'bench': {
      for (let i = 0; i < 4; i += 1) addRoundedBox(g, 1.75, 0.045, 0.11, 0.015, wood(color), { position: [0, 0.46, -0.18 + i * 0.12] });
      addRoundedBox(g, 1.75, 0.5, 0.07, 0.02, wood(color), { position: [0, 0.78, -0.25], rotation: [-0.12, 0, 0] });
      [-0.72, 0.72].forEach((x) => {
        addCylinder(g, 0.028, 0.028, 0.45, 8, darkMetal(), { position: [x, 0.22, -0.2] });
        addCylinder(g, 0.028, 0.028, 0.45, 8, darkMetal(), { position: [x, 0.22, 0.2] });
      });
      break;
    }
    case 'flowerBed': {
      addRoundedBox(g, 2.15, 0.12, 0.9, 0.04, plain('#4a382c', { roughness: 1 }), { position: [0, 0.06, 0] });
      for (let i = 0; i < 18; i += 1) {
        const x = -0.95 + rand(v * 30 + i) * 1.9;
        const z = -0.35 + rand(v * 40 + i * 2) * 0.7;
        const hue = [color, '#e8b6c8', '#f3d38a', '#c9a7e8', '#f7f3ec'][i % 5];
        addCylinder(g, 0.012, 0.012, 0.22 + rand(i * 3) * 0.14, 6, leaf('#4f7b54'), { position: [x, 0.22, z] });
        addSphere(g, 0.07, plain(hue, { roughness: 0.8 }), { position: [x, 0.38 + rand(i * 5) * 0.12, z], scale: [1, 0.7, 1] });
      }
      break;
    }
    case 'bike': {
      [-0.78, 0.78].forEach((z) => {
        addTorus(g, 0.36, 0.035, darkMetal('#20272d'), { position: [0, 0.38, z], rotation: [0, Math.PI / 2, 0] });
        addTorus(g, 0.31, 0.012, metal('#b9c0c4'), { position: [0, 0.38, z], rotation: [0, Math.PI / 2, 0] });
        for (let i = 0; i < 8; i += 1) {
          const a = (i / 8) * Math.PI * 2;
          addCylinder(g, 0.004, 0.004, 0.62, 5, metal('#9aa0a2'), { position: [0, 0.38 + Math.sin(a) * 0.31, z + Math.cos(a) * 0.31], rotation: [0, Math.PI / 2, 0] });
        }
      });
      const frameMat = plain(color, { metalness: 0.5, roughness: 0.35 });
      addCylinder(g, 0.018, 0.018, 1.0, 8, frameMat, { position: [0, 0.64, 0], rotation: [Math.PI / 2, 0, 0] });
      addCylinder(g, 0.018, 0.018, 0.82, 8, frameMat, { position: [0, 0.5, -0.35], rotation: [0.7, 0, 0] });
      addCylinder(g, 0.018, 0.018, 0.82, 8, frameMat, { position: [0, 0.5, 0.35], rotation: [-0.7, 0, 0] });
      addCylinder(g, 0.018, 0.018, 0.56, 8, darkMetal(), { position: [0, 0.92, -0.72], rotation: [0.1, 0, 0] });
      addRoundedBox(g, 0.28, 0.05, 0.08, 0.02, darkMetal(), { position: [0, 1.18, -0.72] });
      addRoundedBox(g, 0.12, 0.07, 0.3, 0.04, leather('#3b3430'), { position: [0, 0.96, 0.18] });
      break;
    }
    case 'umbrella': {
      addCylinder(g, 0.22, 0.26, 0.08, 20, stone('#8b8177'), { position: [0, 0.04, 0] });
      addCylinder(g, 0.028, 0.028, 1.75, 12, metal('#b9a27d'), { position: [0, 0.92, 0] });
      addCone(g, 1.25, 0.48, 10, fabricPlane(color), { position: [0, 1.73, 0] });
      addCylinder(g, 0.035, 0.035, 0.12, 10, metal('#b9a27d'), { position: [0, 2.02, 0] });
      break;
    }
    case 'sculpture': {
      addCylinder(g, 0.28, 0.32, 0.6, 20, marble(), { position: [0, 0.3, 0] });
      addTorus(g, 0.24, 0.075, ceramic(color), { position: [0, 0.92, 0], rotation: [0.35, 0.4, 0] });
      addSphere(g, 0.16, ceramic('#e8dcc5'), { position: [0.1, 1.16, 0], scale: [0.8, 1.3, 0.8] });
      break;
    }
    case 'ceilingLamp': {
      addCylinder(g, 0.012, 0.012, 0.55, 8, darkMetal('#4a525a'), { position: [0, -0.28, 0] });
      addCylinder(g, 0.28, 0.16, 0.22, 24, metal('#d2a66f'), { position: [0, -0.62, 0] });
      addCylinder(g, 0.13, 0.13, 0.02, 20, warmLight(), { position: [0, -0.74, 0], cast: false });
      addSprite(g, glow(), { position: [0, -0.72, 0], scale: [1.5, 1.5, 1] });
      break;
    }
    case 'sideTable': {
      addCylinder(g, 0.38, 0.38, 0.05, 32, marble(color), { position: [0, 0.52, 0] });
      addCylinder(g, 0.05, 0.05, 0.5, 12, metal('#b9a27d'), { position: [0, 0.26, 0] });
      addCylinder(g, 0.24, 0.24, 0.035, 24, darkMetal('#4a525a'), { position: [0, 0.02, 0] });
      break;
    }
    default: {
      addRoundedBox(g, W * 0.8, 0.5, D * 0.8, 0.05, painted(color), { position: [0, 0.25, 0] });
    }
  }

  return g;
}

export function clearPropCache() {
  cache.clear();
}
