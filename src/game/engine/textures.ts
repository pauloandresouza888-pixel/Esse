import * as THREE from 'three';

export type TexturePattern =
  | 'wood' | 'woodPanel' | 'deck' | 'paintedWood'
  | 'tile' | 'marble' | 'stone' | 'concrete' | 'stucco' | 'brick' | 'accent' | 'asphalt'
  | 'grass' | 'water' | 'carpet' | 'fabric' | 'leather' | 'paper' | 'metal' | 'ceramic' | 'plastic';

export interface TextureSet {
  map: THREE.CanvasTexture;
  normalMap: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
}

const cache = new Map<TexturePattern, TextureSet>();
let maxAnisotropy = 4;

export function configureTextures(anisotropy: number) {
  maxAnisotropy = Math.max(1, Math.min(16, Math.floor(anisotropy)));
}

const fract = (v: number) => v - Math.floor(v);
const smoothstep = (edge0: number, edge1: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
};
const mix = (a: number, b: number, t: number) => a + (b - a) * t;

function hash(ix: number, iy: number, seed: number) {
  let h = Math.imul(ix | 0, 374761393) ^ Math.imul(iy | 0, 668265263) ^ Math.imul(seed | 0, 1442695041);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

function valueNoise(u: number, v: number, frequency: number, seed: number) {
  const x = u * frequency;
  const y = v * frequency;
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const tx = smoothstep(0, 1, fract(x));
  const ty = smoothstep(0, 1, fract(y));
  const wrap = (n: number) => ((n % frequency) + frequency) % frequency;
  const a = hash(wrap(x0), wrap(y0), seed);
  const b = hash(wrap(x0 + 1), wrap(y0), seed);
  const c = hash(wrap(x0), wrap(y0 + 1), seed);
  const d = hash(wrap(x0 + 1), wrap(y0 + 1), seed);
  return mix(mix(a, b, tx), mix(c, d, tx), ty);
}

function fbm(u: number, v: number, seed: number, octaves = 4) {
  let sum = 0;
  let amp = 0.55;
  let norm = 0;
  let freq = 2;
  for (let i = 0; i < octaves; i += 1) {
    sum += valueNoise(u, v, freq, seed + i * 31) * amp;
    norm += amp;
    amp *= 0.5;
    freq *= 2;
  }
  return sum / norm;
}

function makeCanvas(size: number) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d', { willReadFrequently: false })!;
  return { canvas, ctx };
}

function setRgb(data: Uint8ClampedArray, i: number, r: number, g: number, b: number, a = 255) {
  data[i] = Math.round(Math.min(255, Math.max(0, r)));
  data[i + 1] = Math.round(Math.min(255, Math.max(0, g)));
  data[i + 2] = Math.round(Math.min(255, Math.max(0, b)));
  data[i + 3] = a;
}

// out = [r, g, b, height, roughness]
function samplePattern(pattern: TexturePattern, u: number, v: number, out: Float32Array) {
  const n = fbm(u, v, 11, 4);
  const fine = fbm(u, v, 71, 3);
  const speck = hash(Math.floor(u * 256), Math.floor(v * 256), 97);
  let r = 220; let g = 216; let b = 208; let h = 0.5 + (n - 0.5) * 0.15; let rough = 0.65;

  switch (pattern) {
    case 'wood':
    case 'deck':
    case 'paintedWood': {
      const planks = pattern === 'deck' ? 6 : 4;
      const pv = fract(v * planks);
      const pu = fract(u * 2.2);
      const seam = Math.min(pv, 1 - pv) < 0.025 || Math.min(pu, 1 - pu) < 0.012 ? 1 : 0;
      const grain = Math.sin((v * 88 + n * 9 + Math.sin(u * 9) * 1.5) * Math.PI) * 0.5 + 0.5;
      const variation = n * 0.55 + grain * 0.25 + fine * 0.2;
      if (pattern === 'paintedWood') {
        r = 218 + variation * 24; g = 214 + variation * 23; b = 206 + variation * 22;
        rough = 0.62 + fine * 0.12;
      } else if (pattern === 'deck') {
        r = mix(122, 181, variation); g = mix(78, 128, variation); b = mix(45, 78, variation);
        rough = 0.78 + fine * 0.1;
      } else {
        r = mix(118, 198, variation); g = mix(74, 139, variation); b = mix(42, 88, variation);
        rough = 0.52 + fine * 0.18;
      }
      if (seam) { r *= 0.52; g *= 0.52; b *= 0.52; h -= 0.18; rough = 0.9; }
      h = 0.42 + variation * 0.18 - seam * 0.22;
      break;
    }
    case 'woodPanel': {
      const slats = fract(u * 11);
      const seam = Math.min(slats, 1 - slats) < 0.055 ? 1 : 0;
      const grain = Math.sin((u * 70 + n * 6) * Math.PI) * 0.5 + 0.5;
      const variation = 0.35 + n * 0.4 + grain * 0.25;
      r = mix(112, 174, variation); g = mix(72, 116, variation); b = mix(44, 74, variation);
      if (seam) { r *= 0.35; g *= 0.35; b *= 0.35; h -= 0.28; }
      h = 0.45 + variation * 0.12 - seam * 0.3;
      rough = 0.6 + fine * 0.14;
      break;
    }
    case 'tile': {
      const cells = 4;
      const cx = fract(u * cells);
      const cy = fract(v * cells);
      const grout = Math.min(cx, 1 - cx) < 0.028 || Math.min(cy, 1 - cy) < 0.028 ? 1 : 0;
      const cloudy = fbm(u * 1.4, v * 1.4, 23, 3);
      r = 205 + cloudy * 36 + fine * 10; g = 201 + cloudy * 34 + fine * 10; b = 191 + cloudy * 32 + fine * 9;
      if (grout) { r = 146; g = 142; b = 136; h = 0.18; rough = 0.92; } else { h = 0.68 + cloudy * 0.08; rough = 0.28 + fine * 0.12; }
      break;
    }
    case 'marble': {
      const warp = fbm(u * 2.2, v * 2.2, 31, 4) * 2.2;
      const veins = Math.pow(Math.abs(Math.sin((u * 3.1 + v * 1.8 + warp) * Math.PI * 2.4)), 18);
      const base = 222 + n * 22;
      r = base - veins * 62; g = base - 2 - veins * 60; b = base - 7 - veins * 54;
      h = 0.62 + n * 0.1 - veins * 0.08;
      rough = 0.2 + fine * 0.12 + veins * 0.1;
      break;
    }
    case 'stone': {
      const cellX = Math.floor(u * 3);
      const cellY = Math.floor(v * 3);
      const cx = fract(u * 3);
      const cy = fract(v * 3);
      const mortar = Math.min(cx, 1 - cx) < 0.035 || Math.min(cy, 1 - cy) < 0.035 ? 1 : 0;
      const cellN = hash(cellX, cellY, 41);
      const variation = n * 0.6 + cellN * 0.3 + fine * 0.1;
      r = 132 + variation * 54; g = 127 + variation * 51; b = 116 + variation * 46;
      if (mortar) { r *= 0.68; g *= 0.68; b *= 0.68; h = 0.25; rough = 0.9; }
      else { h = 0.55 + variation * 0.2; rough = 0.72 + fine * 0.14; }
      break;
    }
    case 'concrete':
    case 'stucco':
    case 'asphalt': {
      const pores = Math.pow(fine, 2.4);
      if (pattern === 'asphalt') {
        r = 52 + n * 22 + pores * 30; g = 55 + n * 22 + pores * 30; b = 58 + n * 22 + pores * 30;
        rough = 0.92; h = 0.45 + pores * 0.2;
      } else if (pattern === 'stucco') {
        r = 224 + n * 20 - pores * 24; g = 217 + n * 20 - pores * 24; b = 203 + n * 20 - pores * 22;
        rough = 0.82 + fine * 0.1; h = 0.5 + pores * 0.16;
      } else {
        r = 142 + n * 28 - pores * 20; g = 146 + n * 28 - pores * 20; b = 146 + n * 28 - pores * 20;
        rough = 0.78 + fine * 0.12; h = 0.5 + pores * 0.12;
      }
      break;
    }
    case 'brick': {
      const rows = 6;
      const row = Math.floor(v * rows);
      const offset = row % 2 === 0 ? 0 : 0.5;
      const bx = fract(u * 3 + offset);
      const by = fract(v * rows);
      const mortar = Math.min(by, 1 - by) < 0.06 || Math.min(bx, 1 - bx) < 0.035 ? 1 : 0;
      const brickN = hash(Math.floor(u * 3 + offset), row, 59);
      r = 146 + brickN * 38 + n * 18; g = 76 + brickN * 22 + n * 12; b = 56 + brickN * 16 + n * 10;
      if (mortar) { r = 182; g = 176; b = 166; h = 0.23; rough = 0.94; }
      else { h = 0.62 + brickN * 0.12; rough = 0.82 + fine * 0.1; }
      break;
    }
    case 'accent': {
      const stripe = Math.sin(u * Math.PI * 18) * 0.5 + 0.5;
      r = 48 + n * 14 + stripe * 6; g = 70 + n * 16 + stripe * 8; b = 77 + n * 18 + stripe * 9;
      h = 0.5 + stripe * 0.035 + n * 0.05;
      rough = 0.7 + fine * 0.12;
      break;
    }
    case 'grass': {
      const blades = Math.sin((u * 170 + fine * 18) * Math.PI) * 0.5 + 0.5;
      const patch = fbm(u * 5, v * 5, 83, 3);
      r = 58 + patch * 42 + blades * 10; g = 92 + patch * 58 + blades * 14; b = 46 + patch * 30 + blades * 8;
      h = 0.42 + blades * 0.12 + patch * 0.08;
      rough = 0.92;
      break;
    }
    case 'water': {
      const wave = Math.sin((u * 8 + v * 5 + n * 1.2) * Math.PI) * 0.5 + 0.5;
      const wave2 = Math.sin((u * 17 - v * 11 + fine * 2) * Math.PI) * 0.5 + 0.5;
      r = 48 + wave * 28; g = 128 + wave * 56; b = 158 + wave2 * 42;
      h = 0.45 + wave * 0.14 + wave2 * 0.08;
      rough = 0.12 + fine * 0.08;
      break;
    }
    case 'carpet': {
      const weave = (Math.sin(u * Math.PI * 96) * Math.sin(v * Math.PI * 96)) * 0.5 + 0.5;
      r = 194 + n * 28 + weave * 10; g = 184 + n * 26 + weave * 9; b = 170 + n * 24 + weave * 8;
      h = 0.46 + weave * 0.12 + fine * 0.08;
      rough = 0.95;
      break;
    }
    case 'fabric': {
      const warp = Math.sin(u * Math.PI * 130) * 0.5 + 0.5;
      const weft = Math.sin(v * Math.PI * 130) * 0.5 + 0.5;
      const weave = warp * 0.5 + weft * 0.5;
      r = 219 + n * 18 + weave * 12; g = 216 + n * 18 + weave * 12; b = 210 + n * 18 + weave * 12;
      h = 0.48 + weave * 0.09 + fine * 0.04;
      rough = 0.88;
      break;
    }
    case 'leather': {
      const pores = Math.pow(fine, 3.2);
      r = 205 + n * 24 + pores * 18; g = 198 + n * 22 + pores * 16; b = 188 + n * 20 + pores * 14;
      h = 0.48 + pores * 0.2 + n * 0.06;
      rough = 0.58 + fine * 0.14;
      break;
    }
    case 'paper': {
      r = 232 + n * 16; g = 228 + n * 16; b = 218 + n * 16;
      h = 0.5 + fine * 0.05;
      rough = 0.9;
      break;
    }
    case 'metal': {
      const brushed = Math.sin(v * Math.PI * 220 + fine * 8) * 0.5 + 0.5;
      r = 190 + brushed * 24 + n * 8; g = 195 + brushed * 24 + n * 8; b = 198 + brushed * 24 + n * 8;
      h = 0.5 + brushed * 0.05;
      rough = 0.28 + fine * 0.12;
      break;
    }
    case 'ceramic':
    case 'plastic': {
      const soft = n * 0.7 + fine * 0.3;
      r = 230 + soft * 18; g = 228 + soft * 18; b = 224 + soft * 18;
      h = 0.51 + soft * 0.03;
      rough = pattern === 'ceramic' ? 0.19 + fine * 0.08 : 0.4 + fine * 0.12;
      break;
    }
  }

  out[0] = r; out[1] = g; out[2] = b;
  out[3] = Math.min(1, Math.max(0, h));
  out[4] = Math.min(1, Math.max(0, rough));
}

function normalStrength(pattern: TexturePattern) {
  switch (pattern) {
    case 'brick': case 'stone': case 'tile': case 'woodPanel': case 'deck': return 3.4;
    case 'wood': return 2.4;
    case 'grass': case 'carpet': case 'fabric': return 2.2;
    case 'water': return 1.6;
    case 'marble': case 'ceramic': case 'metal': case 'plastic': return 0.8;
    default: return 1.8;
  }
}

function toTexture(canvas: HTMLCanvasElement, srgb: boolean) {
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = maxAnisotropy;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = true;
  if (srgb) texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

export function getTextureSet(pattern: TexturePattern, size = 256): TextureSet {
  const existing = cache.get(pattern);
  if (existing) return existing;

  const color = makeCanvas(size);
  const normal = makeCanvas(size);
  const rough = makeCanvas(size);
  const colorData = color.ctx.createImageData(size, size);
  const normalData = normal.ctx.createImageData(size, size);
  const roughData = rough.ctx.createImageData(size, size);
  const heights = new Float32Array(size * size);
  const sample = new Float32Array(5);

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const u = x / size;
      const v = y / size;
      samplePattern(pattern, u, v, sample);
      const i = (y * size + x) * 4;
      setRgb(colorData.data, i, sample[0], sample[1], sample[2]);
      const rv = Math.round(sample[4] * 255);
      setRgb(roughData.data, i, rv, rv, rv);
      heights[y * size + x] = sample[3];
    }
  }

  const strength = normalStrength(pattern);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const left = heights[y * size + ((x - 1 + size) % size)];
      const right = heights[y * size + ((x + 1) % size)];
      const up = heights[((y - 1 + size) % size) * size + x];
      const down = heights[((y + 1) % size) * size + x];
      let nx = -(right - left) * strength;
      let ny = -(down - up) * strength;
      const nz = 1;
      const len = Math.hypot(nx, ny, nz) || 1;
      nx /= len; ny /= len;
      const i = (y * size + x) * 4;
      setRgb(normalData.data, i, (nx * 0.5 + 0.5) * 255, (ny * 0.5 + 0.5) * 255, (nz / len * 0.5 + 0.5) * 255);
    }
  }

  color.ctx.putImageData(colorData, 0, 0);
  normal.ctx.putImageData(normalData, 0, 0);
  rough.ctx.putImageData(roughData, 0, 0);

  const set: TextureSet = {
    map: toTexture(color.canvas, true),
    normalMap: toTexture(normal.canvas, false),
    roughnessMap: toTexture(rough.canvas, false),
  };
  set.map.name = `${pattern}-color`;
  set.normalMap.name = `${pattern}-normal`;
  set.roughnessMap.name = `${pattern}-roughness`;
  cache.set(pattern, set);
  return set;
}

export function disposeTextures() {
  cache.forEach((set) => {
    set.map.dispose(); set.normalMap.dispose(); set.roughnessMap.dispose();
  });
  cache.clear();
}

function seededRandom(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = Math.imul(s ^ (s >>> 15), 2246822519);
    s ^= s >>> 13;
    return (s >>> 0) / 4294967295;
  };
}

export function makeArtTexture(seed = 1, accent = '#c8796b') {
  const size = 256;
  const { canvas, ctx } = makeCanvas(size);
  const rand = seededRandom(seed * 7919 + 13);
  const gradient = ctx.createLinearGradient(0, 0, size, size);
  gradient.addColorStop(0, '#f3e7d5');
  gradient.addColorStop(1, '#d8c7b5');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 14; i += 1) {
    ctx.globalAlpha = 0.16 + rand() * 0.34;
    ctx.fillStyle = i % 3 === 0 ? accent : i % 3 === 1 ? '#3f5963' : '#d2a66f';
    ctx.beginPath();
    const x = rand() * size;
    const y = rand() * size;
    if (i % 2 === 0) {
      ctx.ellipse(x, y, 18 + rand() * 70, 12 + rand() * 46, rand() * Math.PI, 0, Math.PI * 2);
    } else {
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + rand() * 90 - 45, y + rand() * 80 - 40, x + rand() * 120 - 60, y + rand() * 120 - 60);
      ctx.lineWidth = 5 + rand() * 16;
      ctx.strokeStyle = ctx.fillStyle;
      ctx.stroke();
      continue;
    }
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = maxAnisotropy;
  return texture;
}

export function makeScreenTexture(variant: 'tv' | 'computer' = 'tv') {
  const w = 512;
  const h = 288;
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, variant === 'tv' ? '#142a3d' : '#101d2b');
  g.addColorStop(1, variant === 'tv' ? '#a34e5a' : '#2b7a8f');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.globalAlpha = 0.35;
  for (let i = 0; i < 7; i += 1) {
    ctx.fillStyle = i % 2 ? '#8ee0ff' : '#ffd08a';
    ctx.fillRect(28 + i * 62, 28 + (i % 3) * 22, 36 + (i % 2) * 28, 140 + (i % 4) * 20);
  }
  ctx.globalAlpha = 0.9;
  ctx.fillStyle = '#f7e9cf';
  ctx.beginPath();
  ctx.arc(w * 0.68, h * 0.42, 42, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 0.22;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, h - 44, w, 44);
  ctx.globalAlpha = 1;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = maxAnisotropy;
  return texture;
}

export function makeLabelTexture(title: string, subtitle: string, accent = '#ffbe70') {
  const w = 512;
  const h = 128;
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, w, h);
  const radius = 34;
  ctx.fillStyle = 'rgba(12, 20, 28, 0.82)';
  ctx.beginPath();
  ctx.roundRect(8, 12, w - 16, h - 28, radius);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.16)';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.arc(54, 56, 17, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#f7f3ec';
  ctx.font = '600 34px system-ui, -apple-system, Segoe UI, sans-serif';
  ctx.textBaseline = 'middle';
  ctx.fillText(title.slice(0, 18), 88, 48);
  ctx.fillStyle = 'rgba(230, 238, 245, 0.72)';
  ctx.font = '500 23px system-ui, -apple-system, Segoe UI, sans-serif';
  ctx.fillText(subtitle.slice(0, 28), 88, 84);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function makeGlowTexture() {
  const size = 128;
  const { canvas, ctx } = makeCanvas(size);
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(255, 224, 170, 0.95)');
  g.addColorStop(0.35, 'rgba(255, 190, 110, 0.35)');
  g.addColorStop(1, 'rgba(255, 170, 90, 0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function makeSoftShadowTexture() {
  const size = 128;
  const { canvas, ctx } = makeCanvas(size);
  const g = ctx.createRadialGradient(size / 2, size / 2, 4, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(0,0,0,0.42)');
  g.addColorStop(0.55, 'rgba(0,0,0,0.18)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(canvas);
}

export function makeRainTexture() {
  const size = 64;
  const { canvas, ctx } = makeCanvas(size);
  const g = ctx.createLinearGradient(0, 0, 0, size);
  g.addColorStop(0, 'rgba(255,255,255,0)');
  g.addColorStop(0.5, 'rgba(210,230,255,0.85)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(28, 0, 6, size);
  return new THREE.CanvasTexture(canvas);
}
