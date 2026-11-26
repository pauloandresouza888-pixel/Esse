import sharp from 'sharp';
import { writeFileSync } from 'node:fs';
import { roomBackgroundSvg } from '../src/game/art/roomBackground';
const svg = roomBackgroundSvg();
writeFileSync('/tmp/room-bg.svg', svg);
sharp(Buffer.from(svg)).png().toFile('/tmp/room-bg.png').then(() => console.log('ok', svg.length)).catch((e) => { console.error(e); process.exit(1); });
