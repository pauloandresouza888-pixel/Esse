/**
 * Icon generator.
 *
 * Rasterizes the SVG brand mark into the PNG sizes the manifest, iOS and
 * Android need. Run with `pnpm icons` (already executed once, the PNGs are
 * committed so a fresh clone needs no extra build tooling).
 *
 * The maskable icon keeps the artwork inside the 80% "safe zone" and fills the
 * rest with the brand background, as required by Android's adaptive icons.
 */
import sharp from 'sharp';
import { mkdir, readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const publicDir = resolve(here, '../public');
const brandMark = await readFile(resolve(publicDir, 'brand/logo-mark.svg'));
const iconSvg = await readFile(resolve(publicDir, 'icons/icon.svg'));

const SIMPLE_SIZES = [96, 128, 144, 192, 256, 384, 512];
const MASKABLE_SIZES = [192, 512];
const APPLE_SIZE = 180;

async function writePng(input: Buffer, size: number, file: string, padding = 0): Promise<void> {
  const inner = Math.round(size * (1 - padding * 2));
  const resized = await sharp(input, { density: 500 }).resize(inner, inner).png().toBuffer();
  if (padding === 0) {
    await sharp(resized).resize(size, size).png({ compressionLevel: 9 }).toFile(file);
    return;
  }
  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: '#FF8B62',
    },
  })
    .composite([{ input: resized, gravity: 'centre' }])
    .png({ compressionLevel: 9 })
    .toFile(file);
}

await mkdir(resolve(publicDir, 'icons'), { recursive: true });

// Standard icons use the rounded-square artwork as-is.
for (const size of SIMPLE_SIZES) {
  const file = resolve(publicDir, `icons/icon-${size}.png`);
  await sharp(iconSvg, { density: 500 }).resize(size, size).png({ compressionLevel: 9 }).toFile(file);
  console.log(`✓ icons/icon-${size}.png`);
}

// Maskable variants: 12% padding keeps the house inside the safe zone.
for (const size of MASKABLE_SIZES) {
  await writePng(iconSvg, size, resolve(publicDir, `icons/maskable-${size}.png`), 0.12);
  console.log(`✓ icons/maskable-${size}.png (padded)`);
}

// Apple touch icon: no transparency, iOS rounds the corners itself.
await sharp({
  create: { width: APPLE_SIZE, height: APPLE_SIZE, channels: 3, background: '#FF8B62' },
})
  .composite([
    {
      input: await sharp(iconSvg, { density: 500 })
        .resize(Math.round(APPLE_SIZE * 0.82))
        .png()
        .toBuffer(),
      gravity: 'centre',
    },
  ])
  .png({ compressionLevel: 9 })
  .toFile(resolve(publicDir, 'apple-touch-icon.png'));
console.log('✓ apple-touch-icon.png');

// Also keep a mark-only PNG for previews in the README.
await sharp(brandMark, { density: 500 })
  .resize(512, 512)
  .png()
  .toFile(resolve(publicDir, 'brand/logo-mark.png'));
console.log('✓ brand/logo-mark.png');
