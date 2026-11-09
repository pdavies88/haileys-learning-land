// Renders the app icon, favicons and web logos from the storybook logo art:
//   - assets/brand/logo-source.jpg   the full logo, as drawn (a book house in a tree, with a badger
//                                    and a fox reading on the branches, over the app's name)
//   - assets/brand/icon-source.jpg   the icon drawing: the book house in its own tree
//   - assets/brand/icon-art.png      that drawing, squared up on warm paper
//   - assets/images/logo.png         the full logo cut out of its page, for the home screen and splash
// Run after changing the art:  npm run generate:brand
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { Resvg } from '@resvg/resvg-js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const PAPER = '#F7F1E3';
const dataUri = (path, type) => `data:${type};base64,${readFileSync(join(root, path)).toString('base64')}`;
const iconArt = dataUri('assets/brand/icon-art.png', 'image/png');
const logoArt = dataUri('assets/images/logo.png', 'image/png');

/** The book house filling a square, with rounded corners where the platform doesn't add its own. */
const icon = (corner = 0) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <defs><clipPath id="c"><rect width="100" height="100" rx="${corner}"/></clipPath></defs>
  <g clip-path="url(#c)"><rect width="100" height="100" fill="${PAPER}"/><image width="100" height="100" href="${iconArt}"/></g>
</svg>`;

/** Android adaptive icons crop the foreground to the middle ~60%, so the art sits in a circle there. */
const androidForeground = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <defs><clipPath id="c"><circle cx="50" cy="50" r="33"/></clipPath></defs>
  <image x="17" y="17" width="66" height="66" href="${iconArt}" clip-path="url(#c)"/>
</svg>`;

/** The full logo on paper, for the web pages. */
const logo = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 768">
  <rect width="1024" height="768" fill="${PAPER}"/><image width="1024" height="768" href="${logoArt}"/>
</svg>`;

function render(svg, size, out) {
  mkdirSync(dirname(join(root, out)), { recursive: true });
  writeFileSync(join(root, out), new Resvg(svg, { fitTo: { mode: 'width', value: size } }).render().asPng());
  console.log(`wrote ${out} (${size}px)`);
}

render(icon(), 1024, 'assets/images/icon.png');
render(icon(22), 1024, 'assets/images/splash-icon.png');
render(icon(22), 48, 'assets/images/favicon.png');
render(icon(), 512, 'store/android/play-icon-512.png');
render(logo, 512, 'docs/logo.png');
render(icon(22), 48, 'docs/favicon.png');
render(androidForeground, 1024, 'assets/images/android-icon-foreground.png');
