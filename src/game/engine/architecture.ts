import * as THREE from 'three';
import {
  HOUSE, LOT_D, LOT_W, TILE, WALL_HEIGHT, WALL_THICKNESS, gridX, gridZ, tileCenterX, tileCenterZ,
} from '../constants';
import { getFloorStyle } from '../lot';
import type { FloorStyleId, Lot, Wall } from '../types';
import { floorMaterial, glass, mat, plain, wallMaterial } from './materials';
import {
  addBox, addCylinder, addGroup, addRoundedBox, disposeObject,
} from './primitives';

const floorMatCache = new Map<FloorStyleId, THREE.Material>();
let sharedBaseboard: THREE.Material | null = null;
let sharedTrim: THREE.Material | null = null;
let sharedFrame: THREE.Material | null = null;

function baseboard() {
  if (!sharedBaseboard) sharedBaseboard = mat('paintedWood', '#e8e2d8', { normalScale: 0.3 });
  return sharedBaseboard;
}
function trim() {
  if (!sharedTrim) sharedTrim = plain('#6f4b36', { roughness: 0.72 });
  return sharedTrim;
}
function frame() {
  if (!sharedFrame) sharedFrame = plain('#3c4650', { metalness: 0.55, roughness: 0.35 });
  return sharedFrame;
}

export function clearArchitectureCache() {
  floorMatCache.clear();
  sharedBaseboard = null;
  sharedTrim = null;
  sharedFrame = null;
}

function clearGroup(group: THREE.Group) {
  while (group.children.length) {
    const child = group.children[0];
    group.remove(child);
    disposeObject(child);
  }
}

function getFloorMat(style: FloorStyleId) {
  let material = floorMatCache.get(style);
  if (!material) {
    material = floorMaterial(style);
    floorMatCache.set(style, material);
  }
  return material;
}

export function rebuildFloors(lot: Lot, root: THREE.Group) {
  clearGroup(root);
  const byStyle = new Map<FloorStyleId, Array<{ x: number; z: number }>>();
  for (let x = 0; x < lot.width; x += 1) {
    for (let z = 0; z < lot.depth; z += 1) {
      const style = getFloorStyle(lot, x, z);
      if (!byStyle.has(style)) byStyle.set(style, []);
      byStyle.get(style)!.push({ x, z });
    }
  }
  const dummy = new THREE.Object3D();
  byStyle.forEach((tiles, style) => {
    const geometry = new THREE.BoxGeometry(TILE, 0.12, TILE);
    const mesh = new THREE.InstancedMesh(geometry, getFloorMat(style), tiles.length);
    mesh.castShadow = false;
    mesh.receiveShadow = true;
    mesh.userData.floorStyle = style;
    if (style === 'water') mesh.renderOrder = 1;
    tiles.forEach((tile, i) => {
      dummy.position.set(tileCenterX(tile.x), -0.06, tileCenterZ(tile.z));
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      const variation = 0.94 + ((tile.x * 13 + tile.z * 7) % 9) * 0.008;
      mesh.setColorAt(i, new THREE.Color(variation, variation, variation));
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    root.add(mesh);
  });
}

export function buildWall(wall: Wall): THREE.Group {
  const g = new THREE.Group();
  const dynamicMaterials: THREE.Material[] = [];
  const wallMat = wallMaterial(wall.style, 0.999);
  dynamicMaterials.push(wallMat);
  const glassMat = glass('#cfe1e6', 0.38);
  dynamicMaterials.push(glassMat);

  const L = TILE;
  const H = WALL_HEIGHT;
  const T = WALL_THICKNESS;
  const baseY = 0.12;

  if (wall.kind === 'wall') {
    addRoundedBox(g, L, H, T, 0.018, wallMat, { position: [0, H / 2, 0] });
    addBox(g, L, 0.11, T + 0.025, baseboard(), { position: [0, 0.055, 0] });
    addBox(g, L, 0.045, T + 0.02, trim(), { position: [0, H - 0.025, 0] });
  } else if (wall.kind === 'door') {
    const postW = 0.11;
    [-L / 2 + postW / 2, L / 2 - postW / 2].forEach((x) => {
      addRoundedBox(g, postW, H, T + 0.03, 0.015, wallMat, { position: [x, H / 2, 0] });
    });
    addRoundedBox(g, L, 0.32, T + 0.03, 0.012, wallMat, { position: [0, H - 0.16, 0] });
    const doorPivot = addGroup(g, { position: [-L / 2 + postW, 0, 0], rotation: [0, -0.26, 0] });
    const doorW = L - postW * 2 - 0.02;
    addRoundedBox(doorPivot, doorW, H - 0.34, 0.045, 0.012, glassMat, { position: [doorW / 2, (H - 0.34) / 2 + 0.02, 0] });
    addBox(doorPivot, doorW, 0.055, 0.055, frame(), { position: [doorW / 2, 0.08, 0.005] });
    addBox(doorPivot, doorW, 0.055, 0.055, frame(), { position: [doorW / 2, H - 0.38, 0.005] });
    addCylinder(doorPivot, 0.018, 0.018, 0.14, 10, plain('#d2a66f', { metalness: 0.8, roughness: 0.25 }), { position: [doorW - 0.09, 1.05, 0.05], rotation: [Math.PI / 2, 0, 0] });
    addBox(g, L, 0.11, T + 0.025, baseboard(), { position: [0, 0.055, 0] });
  } else {
    const sillH = 0.92;
    const topH = H - 2.22;
    addRoundedBox(g, L, sillH, T, 0.012, wallMat, { position: [0, sillH / 2, 0] });
    addRoundedBox(g, L, topH, T, 0.012, wallMat, { position: [0, H - topH / 2, 0] });
    addRoundedBox(g, L, 1.3, 0.035, 0.008, glassMat, { position: [0, sillH + 0.65, 0] });
    addBox(g, L, 0.06, T + 0.035, frame(), { position: [0, sillH + 0.03, 0] });
    addBox(g, L, 0.06, T + 0.035, frame(), { position: [0, 2.19, 0] });
    addBox(g, 0.055, 1.3, T + 0.04, frame(), { position: [0, sillH + 0.65, 0] });
    addBox(g, L + 0.06, 0.075, T + 0.08, marbleSill(), { position: [0, sillH, 0] });
    addBox(g, L, 0.11, T + 0.025, baseboard(), { position: [0, 0.055, 0] });
  }

  const isH = wall.axis === 'h';
  const center = new THREE.Vector3(
    isH ? gridX(wall.x + 0.5) : gridX(wall.x),
    H / 2,
    isH ? gridZ(wall.z) : gridZ(wall.z + 0.5),
  );
  g.position.copy(center);
  g.rotation.y = isH ? 0 : Math.PI / 2;
  g.userData.wallKey = wall.key;
  g.userData.axis = wall.axis;
  g.userData.kind = wall.kind;
  g.userData.center = center;
  g.userData.outwardSign = isH ? (wall.z < LOT_D / 2 ? -1 : 1) : (wall.x < LOT_W / 2 ? -1 : 1);
  g.userData.dynamicMaterials = dynamicMaterials;
  g.userData.currentOpacity = 1;
  g.userData.selectable = true;
  return g;
}

let sharedSill: THREE.Material | null = null;
function marbleSill() {
  if (!sharedSill) sharedSill = mat('marble', '#ffffff', { normalScale: 0.3 });
  return sharedSill;
}

export function rebuildWalls(lot: Lot, root: THREE.Group) {
  clearGroup(root);
  Object.values(lot.walls).forEach((wall) => {
    root.add(buildWall(wall));
  });
}

export function setWallOpacity(group: THREE.Group, opacity: number) {
  const materials = group.userData.dynamicMaterials as THREE.Material[] | undefined;
  if (!materials) return;
  group.userData.currentOpacity = opacity;
  materials.forEach((material) => {
    const m = material as THREE.Material & { opacity: number; transparent: boolean; depthWrite: boolean };
    m.opacity = opacity < 0.95 ? opacity * (m === materials[1] ? 0.75 : 1) : 0.999;
    m.transparent = true;
    m.depthWrite = opacity > 0.95;
    m.needsUpdate = true;
  });
}

export function updateWallCutaway(root: THREE.Group, camera: THREE.Camera, dt: number) {
  const cam = camera.position;
  const lowAngle = cam.y < 13;
  root.children.forEach((child) => {
    if (!(child instanceof THREE.Group)) return;
    const center = child.userData.center as THREE.Vector3 | undefined;
    const axis = child.userData.axis as 'h' | 'v' | undefined;
    const sign = child.userData.outwardSign as number | undefined;
    if (!center || !axis || sign === undefined) return;
    const dir = new THREE.Vector3().subVectors(cam, center);
    const facing = (axis === 'h' ? dir.z : dir.x) * sign;
    const occluding = lowAngle && facing > 0.35;
    const target = occluding ? 0.12 : 1;
    const current = (child.userData.currentOpacity as number) ?? 1;
    const next = THREE.MathUtils.lerp(current, target, Math.min(1, dt * 7));
    setWallOpacity(child, next);
  });
}

export function createGrid() {
  const grid = new THREE.GridHelper(LOT_W * TILE, LOT_W, 0xf4d9a8, 0x6d8794);
  const material = grid.material as THREE.LineBasicMaterial;
  material.transparent = true;
  material.opacity = 0.38;
  material.depthWrite = false;
  grid.position.y = 0.018;
  grid.visible = false;
  return grid;
}

export function createRoof() {
  const g = new THREE.Group();
  const w = HOUSE.w * TILE + 1.5;
  const d = HOUSE.d * TILE + 1.5;
  const cx = gridX(HOUSE.x0 + HOUSE.w / 2);
  const cz = gridZ(HOUSE.z0 + HOUSE.d / 2);
  g.position.set(cx, WALL_HEIGHT + 0.1, cz);
  const roofMat = mat('metal', '#4a525a', { metalness: 0.65, roughness: 0.55, normalScale: 0.4 });
  addRoundedBox(g, w, 0.22, d, 0.08, roofMat, { position: [0, 0, 0] });
  const edge = plain('#2f3b44', { roughness: 0.65, metalness: 0.35 });
  addBox(g, w + 0.12, 0.18, 0.14, edge, { position: [0, 0.16, -d / 2] });
  addBox(g, w + 0.12, 0.18, 0.14, edge, { position: [0, 0.16, d / 2] });
  addBox(g, 0.14, 0.18, d, edge, { position: [-w / 2, 0.16, 0] });
  addBox(g, 0.14, 0.18, d, edge, { position: [w / 2, 0.16, 0] });
  g.traverse((child) => { if (child instanceof THREE.Mesh) child.castShadow = true; });
  g.visible = false;
  g.userData.roof = true;
  return g;
}
