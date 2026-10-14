// Renders the app icon, splash and web logos: a rainbow and a unicorn on a soft pink-to-purple tile.
// Run after changing the design:  npm run generate:brand  (run generate:pictures first)
import { Buffer } from 'node:buffer';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { Resvg } from '@resvg/resvg-js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const unicorn = readFileSync(join(root, '.cache', 'noto', 'emoji_u1f984.svg'), 'utf8');
const unicornData = `data:image/svg+xml;base64,${Buffer.from(unicorn).toString('base64')}`;

function logo({ corner = 0, background = true } = {}) {
  const tile = background
    ? `<defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0" stop-color="#FFB3D9"/>
          <stop offset="1" stop-color="#B79CFF"/>
        </linearGradient>
      </defs>
      <rect width="100" height="100" rx="${corner}" fill="url(#sky)"/>`
    : '';
  const arc = (r, color) => `<path d="M${50 - r} 78 A${r} ${r} 0 0 1 ${50 + r} 78" fill="none" stroke="${color}" stroke-width="5.5" stroke-linecap="round"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 100 100">
    ${tile}
    ${arc(40, '#FF6B8B')}${arc(34.5, '#FFB347')}${arc(29, '#FFE15C')}${arc(23.5, '#6EDB8F')}${arc(18, '#6BB8FF')}
    <circle cx="20" cy="20" r="2.4" fill="#FFFFFF" opacity="0.9"/>
    <circle cx="82" cy="26" r="1.8" fill="#FFFFFF" opacity="0.9"/>
    <circle cx="74" cy="12" r="1.4" fill="#FFFFFF" opacity="0.8"/>
    <image x="22" y="16" width="58" height="58" href="${unicornData}"/>
  </svg>`;
}

function render(svg, size, out) {
  mkdirSync(dirname(join(root, out)), { recursive: true });
  writeFileSync(join(root, out), new Resvg(svg, { fitTo: { mode: 'width', value: size } }).render().asPng());
  console.log(`wrote ${out} (${size}px)`);
}

render(logo(), 1024, 'assets/images/icon.png');
render(logo({ corner: 22 }), 1024, 'assets/images/splash-icon.png');
render(logo({ corner: 22 }), 48, 'assets/images/favicon.png');
render(logo(), 512, 'store/android/play-icon-512.png');
render(logo({ corner: 22 }), 256, 'docs/logo.png');
render(logo({ corner: 22 }), 48, 'docs/favicon.png');
// Android adaptive icons crop to the middle ~60%, so pad the artwork in.
render(logo({ background: false }).replace('viewBox="0 0 100 100"', 'viewBox="-25 -25 150 150"'), 1024, 'assets/images/android-icon-foreground.png');
