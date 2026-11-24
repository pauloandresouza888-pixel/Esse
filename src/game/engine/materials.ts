import * as THREE from 'three';
import { FLOOR_STYLES, WALL_STYLES } from '../constants';
import type { FloorStyleId, WallStyleId } from '../types';
import {
  getTextureSet, makeArtTexture, makeGlowTexture, makeScreenTexture, makeSoftShadowTexture,
  type TexturePattern,
} from './textures';

export interface MaterialOptions {
  roughness?: number;
  metalness?: number;
  normalScale?: number;
  envMapIntensity?: number;
  transparent?: boolean;
  opacity?: number;
  depthWrite?: boolean;
  side?: THREE.Side;
  emissive?: THREE.ColorRepresentation;
  emissiveIntensity?: number;
  flatShading?: boolean;
  toneMapped?: boolean;
}

const createdMaterials: THREE.Material[] = [];

function track<T extends THREE.Material>(material: T): T {
  createdMaterials.push(material);
  return material;
}

export function mat(pattern: TexturePattern, color: THREE.ColorRepresentation = '#ffffff', opts: MaterialOptions = {}) {
  const textures = getTextureSet(pattern);
  const material = new THREE.MeshStandardMaterial({
    map: textures.map,
    normalMap: textures.normalMap,
    roughnessMap: textures.roughnessMap,
    color,
    roughness: opts.roughness ?? 1,
    metalness: opts.metalness ?? 0,
    normalScale: new THREE.Vector2(opts.normalScale ?? 0.55, opts.normalScale ?? 0.55),
    envMapIntensity: opts.envMapIntensity ?? 1,
    transparent: opts.transparent ?? false,
    opacity: opts.opacity ?? 1,
    depthWrite: opts.depthWrite ?? true,
    side: opts.side ?? THREE.FrontSide,
    emissive: opts.emissive ?? 0x000000,
    emissiveIntensity: opts.emissiveIntensity ?? 1,
    flatShading: opts.flatShading ?? false,
  });
  material.userData.pattern = pattern;
  return track(material);
}

export function glass(color: THREE.ColorRepresentation = '#cfe1e6', opacity = 0.42) {
  const material = new THREE.MeshPhysicalMaterial({
    color,
    metalness: 0.05,
    roughness: 0.08,
    transparent: true,
    opacity,
    clearcoat: 1,
    clearcoatRoughness: 0.04,
    ior: 1.45,
    envMapIntensity: 1.6,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  return track(material);
}

export function emissive(color: THREE.ColorRepresentation, intensity = 1) {
  const material = new THREE.MeshBasicMaterial({ color, toneMapped: false });
  material.userData.intensity = intensity;
  return track(material);
}

export function screenMaterial(variant: 'tv' | 'computer' = 'tv') {
  const texture = makeScreenTexture(variant);
  const material = new THREE.MeshBasicMaterial({ map: texture, toneMapped: false, side: THREE.DoubleSide });
  return track(material);
}

export function artMaterial(seed: number, accent = '#c8796b') {
  const texture = makeArtTexture(seed, accent);
  return track(new THREE.MeshStandardMaterial({ map: texture, roughness: 0.72, metalness: 0, envMapIntensity: 0.6 }));
}

export function glowSpriteMaterial() {
  const material = new THREE.SpriteMaterial({
    map: makeGlowTexture(), color: '#ffd39a', transparent: true,
    blending: THREE.AdditiveBlending, depthWrite: false, depthTest: true,
  });
  return track(material);
}

export function softShadowMaterial() {
  const material = new THREE.MeshBasicMaterial({
    map: makeSoftShadowTexture(), transparent: true, depthWrite: false, opacity: 0.85,
  });
  return track(material);
}

export function floorMaterial(style: FloorStyleId) {
  const meta = FLOOR_STYLES[style];
  if (style === 'water') return waterMaterial();
  return mat(meta.pattern as TexturePattern, '#ffffff', {
    roughness: 1,
    normalScale: style === 'grass' || style === 'carpet' ? 0.42 : 0.7,
    envMapIntensity: style === 'marble' || style === 'tile' ? 1.1 : 0.65,
  });
}

export function wallMaterial(style: WallStyleId, opacity = 1) {
  const meta = WALL_STYLES[style];
  return mat(meta.pattern as TexturePattern, '#ffffff', {
    normalScale: 0.7,
    transparent: opacity < 1,
    opacity,
    depthWrite: opacity > 0.95,
    side: THREE.DoubleSide,
  });
}

export function waterMaterial() {
  const textures = getTextureSet('water');
  const material = new THREE.MeshPhysicalMaterial({
    map: textures.map,
    normalMap: textures.normalMap,
    roughnessMap: textures.roughnessMap,
    color: '#bfeef8',
    metalness: 0.08,
    roughness: 0.22,
    clearcoat: 0.9,
    clearcoatRoughness: 0.08,
    transparent: true,
    opacity: 0.82,
    envMapIntensity: 1.5,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  material.userData.animatedWater = true;
  return track(material);
}

export function plain(color: THREE.ColorRepresentation, opts: MaterialOptions = {}) {
  const material = new THREE.MeshStandardMaterial({
    color,
    roughness: opts.roughness ?? 0.6,
    metalness: opts.metalness ?? 0,
    transparent: opts.transparent ?? false,
    opacity: opts.opacity ?? 1,
    side: opts.side ?? THREE.FrontSide,
    emissive: opts.emissive ?? 0x000000,
    emissiveIntensity: opts.emissiveIntensity ?? 1,
    envMapIntensity: opts.envMapIntensity ?? 1,
    depthWrite: opts.depthWrite ?? true,
  });
  return track(material);
}

export function leafMaterial(color = '#4f7b54') {
  return plain(color, { roughness: 0.82, side: THREE.DoubleSide, envMapIntensity: 0.5 });
}

export function disposeMaterials() {
  for (const material of createdMaterials) material.dispose();
  createdMaterials.length = 0;
}
