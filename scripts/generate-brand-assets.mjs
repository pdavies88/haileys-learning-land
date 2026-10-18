// Renders the app icon, splash and web logos: a rocket flying over a rainbow, with a star and
// sparkles, on a sky-blue-to-violet tile. The artwork is Microsoft's Fluent Emoji in its flat
// "Color" style (MIT), which is vector, so the icon is sharp at every size.
// Run after changing the design:  npm run generate:brand
import { Buffer } from 'node:buffer';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { Resvg } from '@resvg/resvg-js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const cacheDir = join(root, '.cache', 'fluent-color');
const FLUENT = 'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets';

async function art(folder, file) {
  const path = join(cacheDir, file);
  if (!existsSync(path)) {
    mkdirSync(cacheDir, { recursive: true });
    const response = await fetch(`${FLUENT}/${encodeURIComponent(folder)}/Color/${file}`);
    if (!response.ok) throw new Error(`Fluent Emoji has no ${folder}/Color/${file}`);
    writeFileSync(path, await response.text());
  }
  return `data:image/svg+xml;base64,${Buffer.from(readFileSync(path, 'utf8')).toString('base64')}`;
}

const rocket = await art('Rocket', 'rocket_color.svg');
const star = await art('Star', 'star_color.svg');
const sparkles = await art('Sparkles', 'sparkles_color.svg');

function logo({ corner = 0, background = true } = {}) {
  const tile = background
    ? `<defs>
        <linearGradient id="sky" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#4FC3F7"/>
          <stop offset="0.55" stop-color="#6D7CF5"/>
          <stop offset="1" stop-color="#9B5CF6"/>
        </linearGradient>
        <radialGradient id="glow" cx="0.3" cy="0.25" r="0.6">
          <stop offset="0" stop-color="#FFFFFF" stop-opacity="0.45"/>
          <stop offset="1" stop-color="#FFFFFF" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <rect width="100" height="100" rx="${corner}" fill="url(#sky)"/>
      <rect width="100" height="100" rx="${corner}" fill="url(#glow)"/>`
    : '';
  const arc = (r, color) => `<path d="M${50 - r} 90 A${r} ${r} 0 0 1 ${50 + r} 90" fill="none" stroke="${color}" stroke-width="5" stroke-linecap="round"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 100 100">
    ${tile}
    <g opacity="0.95">${arc(38, '#FF6B8B')}${arc(32.5, '#FFB347')}${arc(27, '#FFE15C')}${arc(21.5, '#6EDB8F')}${arc(16, '#7FD3FF')}</g>
    <image x="20" y="12" width="60" height="60" href="${rocket}"/>
    <image x="10" y="14" width="16" height="16" href="${star}"/>
    <image x="72" y="52" width="16" height="16" href="${sparkles}"/>
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
