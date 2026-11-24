import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

export interface Placement {
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: [number, number, number];
  cast?: boolean;
  receive?: boolean;
  name?: string;
}

function place<T extends THREE.Object3D>(object: T, parent: THREE.Object3D, opts: Placement) {
  if (opts.position) object.position.set(...opts.position);
  if (opts.rotation) object.rotation.set(...opts.rotation);
  if (opts.scale) object.scale.set(...opts.scale);
  if (opts.name) object.name = opts.name;
  parent.add(object);
  return object;
}

function finishMesh(mesh: THREE.Mesh, opts: Placement) {
  mesh.castShadow = opts.cast ?? true;
  mesh.receiveShadow = opts.receive ?? true;
  return mesh;
}

export function addGroup(parent: THREE.Object3D, opts: Placement = {}) {
  const group = new THREE.Group();
  return place(group, parent, opts);
}

export function addRoundedBox(
  parent: THREE.Object3D, w: number, h: number, d: number, radius: number,
  material: THREE.Material | THREE.Material[], opts: Placement = {},
) {
  const safeRadius = Math.max(0.001, Math.min(radius, Math.min(w, h, d) * 0.45));
  const geometry = new RoundedBoxGeometry(w, h, d, 2, safeRadius);
  const mesh = finishMesh(new THREE.Mesh(geometry, material), opts);
  return place(mesh, parent, opts);
}

export function addBox(
  parent: THREE.Object3D, w: number, h: number, d: number,
  material: THREE.Material | THREE.Material[], opts: Placement = {},
) {
  const geometry = new THREE.BoxGeometry(w, h, d);
  const mesh = finishMesh(new THREE.Mesh(geometry, material), opts);
  return place(mesh, parent, opts);
}

export function addCylinder(
  parent: THREE.Object3D, radiusTop: number, radiusBottom: number, height: number, segments: number,
  material: THREE.Material | THREE.Material[], opts: Placement = {},
) {
  const geometry = new THREE.CylinderGeometry(radiusTop, radiusBottom, height, segments, 1, false);
  const mesh = finishMesh(new THREE.Mesh(geometry, material), opts);
  return place(mesh, parent, opts);
}

export function addCone(
  parent: THREE.Object3D, radius: number, height: number, segments: number,
  material: THREE.Material | THREE.Material[], opts: Placement = {},
) {
  const geometry = new THREE.ConeGeometry(radius, height, segments, 1, false);
  const mesh = finishMesh(new THREE.Mesh(geometry, material), opts);
  return place(mesh, parent, opts);
}

export function addSphere(
  parent: THREE.Object3D, radius: number, material: THREE.Material | THREE.Material[], opts: Placement = {},
) {
  const geometry = new THREE.SphereGeometry(radius, 20, 14);
  const mesh = finishMesh(new THREE.Mesh(geometry, material), opts);
  return place(mesh, parent, opts);
}

export function addCapsule(
  parent: THREE.Object3D, radius: number, length: number, material: THREE.Material | THREE.Material[], opts: Placement = {},
) {
  const geometry = new THREE.CapsuleGeometry(radius, length, 6, 12);
  const mesh = finishMesh(new THREE.Mesh(geometry, material), opts);
  return place(mesh, parent, opts);
}

export function addTorus(
  parent: THREE.Object3D, radius: number, tube: number, material: THREE.Material | THREE.Material[], opts: Placement = {},
) {
  const geometry = new THREE.TorusGeometry(radius, tube, 8, 32);
  const mesh = finishMesh(new THREE.Mesh(geometry, material), opts);
  return place(mesh, parent, opts);
}

export function addPlane(
  parent: THREE.Object3D, w: number, h: number, material: THREE.Material | THREE.Material[], opts: Placement = {},
) {
  const geometry = new THREE.PlaneGeometry(w, h);
  const mesh = finishMesh(new THREE.Mesh(geometry, material), { cast: false, ...opts });
  return place(mesh, parent, opts);
}

export function addSprite(parent: THREE.Object3D, material: THREE.SpriteMaterial, opts: Placement & { scale?: [number, number, number] } = {}) {
  const sprite = new THREE.Sprite(material);
  if (opts.position) sprite.position.set(...opts.position);
  if (opts.scale) sprite.scale.set(opts.scale[0], opts.scale[1], opts.scale[2] ?? 1);
  parent.add(sprite);
  return sprite;
}

export function traverseMaterials(root: THREE.Object3D, fn: (material: THREE.Material, mesh: THREE.Mesh) => void) {
  root.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    const materials = Array.isArray(child.material) ? child.material : [child.material];
    materials.forEach((material) => fn(material, child));
  });
}

export function disposeObject(root: THREE.Object3D) {
  root.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.geometry.dispose();
      const materials = Array.isArray(child.material) ? child.material : [child.material];
      materials.forEach((material) => {
        // Materiais compartilhados são descartados pelo materials.ts; aqui apenas liberamos geometrias.
        void material;
      });
    }
  });
}
