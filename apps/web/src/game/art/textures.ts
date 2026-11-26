/**
 * Texture registry (Phase 1).
 *
 * Phaser needs raster textures; instead of shipping PNGs we hand it SVG strings
 * and let the browser rasterize once at load, sized for the device pixel ratio.
 * The room background, the furniture and the character all come through here,
 * so the scene never draws shapes by hand.
 */
import Phaser from 'phaser';
import { ROOM_ART_SIZES, ROOM_PLACEMENTS, type Appearance } from '@vida/shared';
import { characterSvg, type CharacterMood } from './characterSvg';
import { FURNITURE, TEXTURES } from './roomSvg';
import { roomBackgroundSvg } from './roomBackground';

/** Multiplier applied to SVG sizes before upload (crisp on 2–3x screens). */
export const SVG_RASTER_SCALE = 2;

export const BACKGROUND_KEY = 'room-background';

function svgDataUri(raw: string): string {
  // `#` breaks data URIs in some browsers, so encode everything.
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(raw)}`;
}

function svgSize(raw: string, axis: 'width' | 'height'): number {
  const match = raw.match(new RegExp(`${axis}="([\\d.]+)"`));
  return match ? Number(match[1]) : 128;
}

/**
 * Adds one SVG texture. Resolves when the canvas contains the drawn art.
 * If the texture already exists it resolves immediately (hot reload friendly).
 */
export function addSvgTexture(
  scene: Phaser.Scene,
  key: string,
  raw: string,
  scale = SVG_RASTER_SCALE,
): Promise<void> {
  if (scene.textures.exists(key)) return Promise.resolve();
  return new Promise((resolve) => {
    const width = Math.max(1, Math.round(svgSize(raw, 'width') * scale));
    const height = Math.max(1, Math.round(svgSize(raw, 'height') * scale));
    const texture = scene.textures.createCanvas(key, width, height);
    if (!texture) {
      resolve();
      return;
    }
    const image = new Image();
    image.decoding = 'async';
    image.onload = () => {
      const context = texture.getContext();
      context.clearRect(0, 0, texture.width, texture.height);
      context.drawImage(image, 0, 0, texture.width, texture.height);
      texture.refresh();
      resolve();
    };
    image.onerror = () => {
      console.warn(`[art] failed to rasterize texture "${key}"`);
      resolve();
    };
    image.src = svgDataUri(raw);
  });
}

export interface TextureManifest {
  furnitureKeys: string[];
  decoKeys: string[];
}

/**
 * Registers every texture the room scene needs. Each furniture texture is keyed
 * by its **catalog id** (`room-bed`), which is what `RoomScene` looks up from
 * the placements in `shared/content`.
 */
export async function loadRoomTextures(
  scene: Phaser.Scene,
  appearance: Appearance,
  quality: 'low' | 'medium' | 'high' = 'high',
): Promise<TextureManifest> {
  const mood: CharacterMood = 'happy';
  const jobs: Promise<void>[] = [];
  const wanted = new Set(ROOM_PLACEMENTS.map((placement) => placement.itemId));

  jobs.push(addSvgTexture(scene, BACKGROUND_KEY, roomBackgroundSvg(), quality === 'low' ? 1.25 : 2));

  for (const spec of FURNITURE) {
    if (!wanted.has(spec.key)) continue;
    // Slightly smaller raster for low quality devices (battery/memory).
    const scale = quality === 'low' ? 1.4 : SVG_RASTER_SCALE;
    jobs.push(addSvgTexture(scene, `room-${spec.key}`, spec.svg(), scale));
  }
  for (const [key, generator] of Object.entries(TEXTURES)) {
    jobs.push(addSvgTexture(scene, `room-deco-${key}`, generator()));
  }

  jobs.push(addSvgTexture(scene, 'character', characterSvg(appearance, { mood })));
  jobs.push(addSvgTexture(scene, 'character-walk-a', characterSvg(appearance, { mood, pose: 'walk', step: 2 })));
  jobs.push(addSvgTexture(scene, 'character-walk-b', characterSvg(appearance, { mood, pose: 'walk', step: -2 })));
  jobs.push(addSvgTexture(scene, 'character-blink', characterSvg(appearance, { mood, blink: true })));
  jobs.push(addSvgTexture(scene, 'character-sit', characterSvg(appearance, { mood: 'happy', pose: 'sit' })));
  jobs.push(addSvgTexture(scene, 'character-sleep', characterSvg(appearance, { mood: 'sleepy' })));

  await Promise.all(jobs);
  return {
    furnitureKeys: ROOM_PLACEMENTS.map((placement) => `room-${placement.itemId}`).filter((key) =>
      scene.textures.exists(key),
    ),
    decoKeys: Object.keys(TEXTURES).map((key) => `room-deco-${key}`),
  };
}

/** Exposed so the scene can size art from the same table. */
export { ROOM_ART_SIZES };
