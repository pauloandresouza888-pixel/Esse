/**
 * Icon set.
 *
 * We ship a hand-made set of 24px round line icons instead of a font or an
 * icon library: about 4 KB of SVG, crisper on low-DPI phones, and the stroke
 * weight matches the game's soft look. Each icon is a path list so the same
 * component works anywhere.
 */
import type { SVGProps } from 'react';

export type IconName =
  | 'home'
  | 'person'
  | 'bag'
  | 'heart'
  | 'map'
  | 'settings'
  | 'play'
  | 'pause'
  | 'plus'
  | 'arrow-left'
  | 'arrow-right'
  | 'check'
  | 'close'
  | 'copy'
  | 'share'
  | 'moon'
  | 'sun'
  | 'clock'
  | 'coin'
  | 'music'
  | 'volume'
  | 'volume-off'
  | 'download'
  | 'trash'
  | 'info'
  | 'accessibility'
  | 'globe'
  | 'shield'
  | 'sparkle'
  | 'user-plus'
  | 'bolt'
  | 'lock'
  | 'grid';

interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'name'> {
  name: IconName;
  size?: number;
  /** Accessible label. When omitted the icon is decorative. */
  label?: string;
}

const PATHS: Record<IconName, string[]> = {
  home: ['M4 10.5 12 4l8 6.5', 'M6 9.5V19a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V9.5', 'M10 20v-5h4v5'],
  person: ['M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z', 'M4.5 20c.8-3.6 3.8-5.5 7.5-5.5s6.7 1.9 7.5 5.5'],
  bag: ['M5 8h14l-1.2 11a1.6 1.6 0 0 1-1.6 1.4H7.8A1.6 1.6 0 0 1 6.2 19L5 8Z', 'M9 8V6.5a3 3 0 0 1 6 0V8'],
  heart: ['M12 20s-7.5-4.6-7.5-9.4A4.1 4.1 0 0 1 12 8a4.1 4.1 0 0 1 7.5 2.6C19.5 15.4 12 20 12 20Z'],
  map: ['m3 6 6-2 6 2 6-2v14l-6 2-6-2-6 2V6Z', 'M9 4v14', 'M15 6v14'],
  settings: [
    'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
    'M19.4 13.5a7.7 7.7 0 0 0 0-3l1.7-1.3-2-3.4-2 .8a7.6 7.6 0 0 0-2.6-1.5L14.1 3h-4l-.4 2.1a7.6 7.6 0 0 0-2.6 1.5l-2-.8-2 3.4 1.7 1.3a7.7 7.7 0 0 0 0 3l-1.7 1.3 2 3.4 2-.8a7.6 7.6 0 0 0 2.6 1.5l.4 2.1h4l.4-2.1a7.6 7.6 0 0 0 2.6-1.5l2 .8 2-3.4-1.7-1.3Z',
  ],
  play: ['M9 5.5v13l10-6.5-10-6.5Z'],
  pause: ['M8 5v14', 'M16 5v14'],
  plus: ['M12 5v14', 'M5 12h14'],
  'arrow-left': ['M19 12H5', 'm11 6-6 6 6 6'],
  'arrow-right': ['M5 12h14', 'm13 6 6 6-6 6'],
  check: ['m5 12.5 4.5 4.5L19 7.5'],
  close: ['m6 6 12 12', 'm18 6-12 12'],
  copy: ['M9 9h10v10a1.5 1.5 0 0 1-1.5 1.5h-7A1.5 1.5 0 0 1 9 19V9Z', 'M15 9V5.5A1.5 1.5 0 0 0 13.5 4h-7A1.5 1.5 0 0 0 5 5.5v7A1.5 1.5 0 0 0 6.5 14H9'],
  share: ['M12 15V4', 'm8 7 4-3 4 3', 'M5 13v5.5A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5V13'],
  moon: ['M19.5 14.5A7.5 7.5 0 0 1 9.5 4.5a7.5 7.5 0 1 0 10 10Z'],
  sun: ['M12 16.5a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9Z', 'M12 2v2', 'M12 20v2', 'M4.2 4.2 5.6 5.6', 'M18.4 18.4l1.4 1.4', 'M2 12h2', 'M20 12h2', 'M4.2 19.8l1.4-1.4', 'M18.4 5.6l1.4-1.4'],
  clock: ['M12 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z', 'M12 8v4.5l3 2'],
  coin: ['M12 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z', 'M14.5 9.5A2.5 2.5 0 0 0 12 8c-1.5 0-2.5.8-2.5 2s1 1.7 2.5 2 2.5.8 2.5 2-1 2-2.5 2a2.5 2.5 0 0 1-2.5-1.5', 'M12 6.5v11'],
  music: ['M9 18V6l10-2v12', 'M9 18a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0Z', 'M19 16a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0Z'],
  volume: ['M11 5 6.5 9H3v6h3.5L11 19V5Z', 'M15 9a4 4 0 0 1 0 6', 'M17.5 6.5a8 8 0 0 1 0 11'],
  'volume-off': ['M11 5 6.5 9H3v6h3.5L11 19V5Z', 'm16 9.5 5 5', 'm21 9.5-5 5'],
  download: ['M12 4v10', 'm8 10.5 4 4 4-4', 'M5 17v2.5h14V17'],
  trash: ['M4.5 6.5h15', 'M9.5 6.5V4.5h5v2', 'M6.5 6.5 7.4 19a1.5 1.5 0 0 0 1.5 1.4h6.2a1.5 1.5 0 0 0 1.5-1.4l.9-12.5', 'M10 10v6.5', 'M14 10v6.5'],
  info: ['M12 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z', 'M12 11v5', 'M12 7.6h.01'],
  accessibility: ['M12 5.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z', 'M4.5 9.5 12 8l7.5 1.5', 'M12 8v5l-3 6.5', 'm12 13 3 6.5'],
  globe: ['M12 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z', 'M4 12h16', 'M12 4c2.2 2.2 3.3 5 3.3 8s-1.1 5.8-3.3 8c-2.2-2.2-3.3-5-3.3-8s1.1-5.8 3.3-8Z'],
  shield: ['M12 4 19 6.5v5c0 4.2-2.8 7.7-7 8.8-4.2-1.1-7-4.6-7-8.8v-5L12 4Z', 'm9 12 2.2 2.2L15.5 10'],
  sparkle: ['M12 3.5 13.8 9l5.5 1.8-5.5 1.8L12 18l-1.8-5.4L4.7 10.8 10.2 9 12 3.5Z', 'M18.5 16.5l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7.7-2Z'],
  'user-plus': ['M10 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z', 'M3 20c.7-3.4 3.5-5.2 7-5.2s6.3 1.8 7 5.2', 'M18.5 8.5v5', 'M21 11h-5'],
  bolt: ['M13.5 3 5 13.5h5L9.5 21 19 10.5h-5.5L13.5 3Z'],
  lock: ['M6.5 10.5h11A1.5 1.5 0 0 1 19 12v6.5A1.5 1.5 0 0 1 17.5 20h-11A1.5 1.5 0 0 1 5 18.5V12a1.5 1.5 0 0 1 1.5-1.5Z', 'M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5'],
  grid: ['M4.5 4.5h6v6h-6v-6Z', 'M13.5 4.5h6v6h-6v-6Z', 'M4.5 13.5h6v6h-6v-6Z', 'M13.5 13.5h6v6h-6v-6Z'],
};

export function Icon({ name, size = 24, label, ...rest }: IconProps) {
  const paths = PATHS[name];
  return (
    <svg
      {...rest}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
    >
      {paths.map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}
