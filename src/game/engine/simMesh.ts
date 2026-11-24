import * as THREE from 'three';
import { moodLabel } from '../constants';
import type { Appearance, Sim } from '../types';
import { makeLabelTexture } from './textures';
import { mat, plain } from './materials';
import {
  addBox, addCapsule, addCylinder, addRoundedBox, addSphere, addTorus, type Placement,
} from './primitives';

interface SimParts {
  body: THREE.Group;
  head: THREE.Group;
  torso: THREE.Mesh;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
}

export interface SimAnimationState {
  moving: boolean;
  pose?: string;
  atWork?: boolean;
  mood?: number;
}

export function appearanceKey(a: Appearance) {
  return JSON.stringify(a);
}

export function buildSimMesh(appearance: Appearance): THREE.Group {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);

  const skin = plain(appearance.skin, { roughness: 0.72, envMapIntensity: 0.7 });
  const hairMat = mat('fabric', appearance.hair, { roughness: 0.86, normalScale: 0.35, envMapIntensity: 0.4 });
  const topMat = mat('fabric', appearance.top, { roughness: 0.88, normalScale: 0.4, envMapIntensity: 0.5 });
  const bottomMat = mat('fabric', appearance.bottom, { roughness: 0.9, normalScale: 0.4, envMapIntensity: 0.45 });
  const shoeMat = plain(appearance.shoes, { roughness: 0.55 });
  const eyeWhite = plain('#f7f3ec', { roughness: 0.35 });
  const iris = plain(appearance.eyes, { roughness: 0.3 });
  const pupil = plain('#1b2024', { roughness: 0.25 });
  const mouthMat = plain('#a55e5b', { roughness: 0.7 });
  const browMat = plain(new THREE.Color(appearance.hair).multiplyScalar(0.75), { roughness: 0.9 });

  // Pernas com pivôs para animação.
  const makeLeg = (x: number) => {
    const pivot = new THREE.Group();
    pivot.position.set(x, 0.86, 0);
    body.add(pivot);
    addCapsule(pivot, 0.073, 0.52, bottomMat, { position: [0, -0.33, 0] });
    addRoundedBox(pivot, 0.16, 0.1, 0.25, 0.04, shoeMat, { position: [0, -0.69, 0.055] });
    return pivot;
  };
  const leftLeg = makeLeg(-0.115);
  const rightLeg = makeLeg(0.115);

  // Torso e pescoço.
  const torso = addRoundedBox(body, 0.46, 0.62, 0.27, 0.12, topMat, { position: [0, 1.14, 0] });
  addRoundedBox(body, 0.34, 0.12, 0.25, 0.05, topMat, { position: [0, 1.47, 0] });
  addCylinder(body, 0.072, 0.078, 0.14, 12, skin, { position: [0, 1.52, 0] });

  // Braços com pivôs.
  const makeArm = (x: number) => {
    const pivot = new THREE.Group();
    pivot.position.set(x, 1.42, 0);
    pivot.rotation.z = x < 0 ? -0.09 : 0.09;
    body.add(pivot);
    addCapsule(pivot, 0.058, 0.42, topMat, { position: [0, -0.26, 0] });
    addCapsule(pivot, 0.052, 0.16, skin, { position: [0, -0.5, 0] });
    addSphere(pivot, 0.058, skin, { position: [0, -0.61, 0] });
    return pivot;
  };
  const leftArm = makeArm(-0.285);
  const rightArm = makeArm(0.285);

  // Cabeça e rosto.
  const head = new THREE.Group();
  head.position.set(0, 1.7, 0);
  body.add(head);
  addSphere(head, 0.175, skin, { position: [0, 0, 0], scale: [0.95, 1.12, 0.94] });
  addSphere(head, 0.045, skin, { position: [-0.17, -0.02, 0], scale: [0.5, 1, 0.7] });
  addSphere(head, 0.045, skin, { position: [0.17, -0.02, 0], scale: [0.5, 1, 0.7] });
  addSphere(head, 0.026, skin, { position: [0, -0.035, 0.168], scale: [0.8, 1.1, 0.8] });
  [-0.065, 0.065].forEach((x) => {
    addSphere(head, 0.036, eyeWhite, { position: [x, 0.035, 0.151], scale: [1, 0.78, 0.55] });
    addSphere(head, 0.018, iris, { position: [x, 0.035, 0.176], scale: [1, 1, 0.5] });
    addSphere(head, 0.008, pupil, { position: [x, 0.035, 0.187], scale: [1, 1, 0.5] });
    addBox(head, 0.055, 0.009, 0.012, browMat, { position: [x, 0.083, 0.165], rotation: [0, 0, x < 0 ? 0.08 : -0.08] });
  });
  addRoundedBox(head, 0.065, 0.012, 0.01, 0.005, mouthMat, { position: [0, -0.082, 0.164] });

  if (appearance.freckles) {
    [-0.095, -0.07, 0.07, 0.095].forEach((x, i) => {
      addSphere(head, 0.006, plain('#9b644b', { roughness: 1 }), { position: [x, -0.025 + (i % 2) * 0.018, 0.153], cast: false });
    });
  }

  if (appearance.glasses) {
    [-0.067, 0.067].forEach((x) => addTorus(head, 0.052, 0.007, plain('#3b4147', { metalness: 0.7, roughness: 0.25 }), { position: [x, 0.035, 0.178], rotation: [0, 0, 0] }));
    addBox(head, 0.055, 0.008, 0.008, plain('#3b4147', { metalness: 0.7, roughness: 0.25 }), { position: [0, 0.035, 0.178] });
  }

  // Penteados.
  const hairCap = addSphere(head, 0.182, hairMat, { position: [0, 0.075, -0.012], scale: [1.02, 0.72, 1.02] });
  void hairCap;
  switch (appearance.hairStyle) {
    case 'fade':
      addSphere(head, 0.178, hairMat, { position: [0, 0.11, -0.01], scale: [0.92, 0.45, 0.95] });
      break;
    case 'wavy':
      addSphere(head, 0.13, hairMat, { position: [-0.13, -0.05, -0.02], scale: [0.7, 1.5, 0.9] });
      addSphere(head, 0.13, hairMat, { position: [0.13, -0.05, -0.02], scale: [0.7, 1.5, 0.9] });
      break;
    case 'long':
      addSphere(head, 0.16, hairMat, { position: [-0.13, -0.24, -0.05], scale: [0.65, 1.8, 0.8] });
      addSphere(head, 0.16, hairMat, { position: [0.13, -0.24, -0.05], scale: [0.65, 1.8, 0.8] });
      addSphere(head, 0.19, hairMat, { position: [0, 0.02, -0.12], scale: [1.1, 0.9, 0.7] });
      break;
    case 'bun':
      addSphere(head, 0.115, hairMat, { position: [0, 0.18, -0.18], scale: [1, 1, 0.9] });
      addCylinder(head, 0.055, 0.055, 0.035, 12, plain('#8b6245'), { position: [0, 0.18, -0.24], rotation: [Math.PI / 2, 0, 0] });
      break;
    case 'curly':
      for (let i = 0; i < 9; i += 1) {
        const a = (i / 9) * Math.PI * 2;
        addSphere(head, 0.075, hairMat, { position: [Math.cos(a) * 0.14, 0.11 + Math.sin(a * 2) * 0.04, Math.sin(a) * 0.12], scale: [1, 0.9, 1] });
      }
      break;
    default:
      addRoundedBox(head, 0.31, 0.07, 0.28, 0.035, hairMat, { position: [0, 0.13, -0.01] });
  }

  const parts: SimParts = { body, head, torso, leftArm, rightArm, leftLeg, rightLeg };
  root.userData.parts = parts;
  root.userData.appearanceKey = appearanceKey(appearance);
  root.userData.phase = Math.random() * Math.PI * 2;
  root.scale.set(appearance.build * appearance.height, appearance.height, appearance.build * appearance.height);
  root.userData.selectable = true;
  return root;
}

export function animateSimMesh(root: THREE.Group, dt: number, state: SimAnimationState) {
  const parts = root.userData.parts as SimParts | undefined;
  if (!parts) return;
  const phase = ((root.userData.phase as number) ?? 0) + dt * (state.moving ? 9 : state.pose === 'exercise' ? 7 : 1.7);
  root.userData.phase = phase;
  const { body, head, torso, leftArm, rightArm, leftLeg, rightLeg } = parts;
  const pose = state.pose ?? 'stand';

  // Reset suave da pose.
  body.rotation.x = THREE.MathUtils.lerp(body.rotation.x, 0, Math.min(1, dt * 8));
  body.rotation.z = THREE.MathUtils.lerp(body.rotation.z, 0, Math.min(1, dt * 8));
  body.position.y = THREE.MathUtils.lerp(body.position.y, 0, Math.min(1, dt * 8));
  leftLeg.rotation.x = 0;
  rightLeg.rotation.x = 0;
  leftArm.rotation.x = 0;
  rightArm.rotation.x = 0;
  torso.rotation.x = 0;

  if (pose === 'lie') {
    body.rotation.x = -Math.PI / 2;
    body.position.y = 0.58;
    leftArm.rotation.x = 0.25;
    rightArm.rotation.x = 0.25;
    head.rotation.y = Math.sin(phase * 0.25) * 0.08;
    return;
  }

  const amplitude = state.moving ? 0.62 : pose === 'exercise' ? 0.48 : 0.035;
  const swing = Math.sin(phase) * amplitude;
  leftLeg.rotation.x = swing;
  rightLeg.rotation.x = -swing;
  leftArm.rotation.x = -swing * 0.72;
  rightArm.rotation.x = swing * 0.72;
  head.rotation.y = Math.sin(phase * 0.32) * 0.09;
  torso.rotation.z = Math.sin(phase * 0.5) * 0.018;
  torso.position.y = 1.14 + Math.sin(phase * 2) * 0.008;

  if (pose === 'sit') {
    body.position.y = -0.11;
    leftLeg.rotation.x = -1.05;
    rightLeg.rotation.x = -1.05;
    leftArm.rotation.x = -0.55;
    rightArm.rotation.x = -0.55;
    torso.rotation.x = 0.07;
  } else if (pose === 'work') {
    leftArm.rotation.x = -0.9 + Math.sin(phase * 2.4) * 0.08;
    rightArm.rotation.x = -0.9 - Math.sin(phase * 2.4) * 0.08;
    torso.rotation.x = 0.12;
  } else if (pose === 'clean') {
    leftArm.rotation.x = -0.8 + Math.sin(phase * 2) * 0.35;
    rightArm.rotation.x = -0.8 - Math.sin(phase * 2) * 0.35;
    torso.rotation.x = 0.16;
  } else if (pose === 'exercise') {
    torso.rotation.x = 0.08;
    leftArm.rotation.x = -0.6 + swing * 0.4;
    rightArm.rotation.x = -0.6 - swing * 0.4;
  }
}

export function makeSimLabelSprite(sim: Sim) {
  const mood = moodLabel(sim.mood);
  const subtitle = sim.activity?.label ?? (sim.atWork ? 'No trabalho' : mood.label);
  const texture = makeLabelTexture(sim.name, subtitle, mood.color);
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false, depthWrite: false });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(2.15, 0.54, 1);
  sprite.position.set(0, 2.18, 0);
  sprite.renderOrder = 20;
  sprite.userData.key = `${sim.name}|${subtitle}|${mood.color}`;
  return sprite;
}

export function updateSimLabelSprite(sprite: THREE.Sprite, sim: Sim) {
  const mood = moodLabel(sim.mood);
  const subtitle = sim.activity?.label ?? (sim.atWork ? 'No trabalho' : mood.label);
  const key = `${sim.name}|${subtitle}|${mood.color}`;
  if (sprite.userData.key === key) return;
  const oldTexture = sprite.material.map;
  const texture = makeLabelTexture(sim.name, subtitle, mood.color);
  sprite.material.map = texture;
  sprite.material.needsUpdate = true;
  sprite.userData.key = key;
  oldTexture?.dispose();
}
