// Builds the app's pictures.
//   - assets/pics/<name>.png       full-color pictures used across the games, from Microsoft's
//                                  Fluent Emoji 3D artwork (MIT)
//   - src/content/coloring-outlines.json  coloring pages as vector outlines, traced from Google's
//                                  flat Noto Emoji artwork (Apache 2.0), which traces cleanly
//   - assets/coloring/<name>.png   small previews of the coloring pages, for the page picker
//   - src/content/picture-files.ts the static require() map Metro needs to bundle them
// A picture with no emoji (such as the eraser) is drawn by hand in assets/art/<name>.svg and listed
// in pictures.json as "art:<name>".
//
// Run after editing src/content/pictures.json:  npm run generate:pictures
// Noto SVGs are downloaded once from github.com/googlefonts/noto-emoji into .cache/noto/. Fluent
// images come from a sparse clone of github.com/microsoft/fluentui-emoji in .cache/fluent/.
import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { Resvg } from '@resvg/resvg-js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const cacheDir = join(root, '.cache', 'noto');
const picsDir = join(root, 'assets', 'pics');
const coloringDir = join(root, 'assets', 'coloring');
const NOTO = 'https://raw.githubusercontent.com/googlefonts/noto-emoji/main/2D/svg';

// Coloring pages, by category, from src/content/coloring.json.
const coloring = JSON.parse(readFileSync(join(root, 'src', 'content', 'coloring.json'), 'utf8'));
const COLORING_PAGES = coloring.categories.flatMap((c) => Object.keys(c.pages));
const coloringCode = Object.fromEntries(coloring.categories.flatMap((c) => Object.entries(c.pages)));

const pictures = JSON.parse(readFileSync(join(root, 'src', 'content', 'pictures.json'), 'utf8'));
delete pictures._comment;

const slug = (name) => name.replace(/\s+/g, '-');

async function svgFor(code) {
  const file = join(cacheDir, `emoji_u${code}.svg`);
  if (!existsSync(file)) {
    const response = await fetch(`${NOTO}/emoji_u${code}.svg`);
    if (!response.ok) throw new Error(`Noto has no emoji_u${code}.svg (HTTP ${response.status})`);
    writeFileSync(file, await response.text());
  }
  return readFileSync(file, 'utf8');
}

function render(svg, size, outputPath) {
  const png = new Resvg(svg, { fitTo: { mode: 'width', value: size }, background: 'rgba(0,0,0,0)' }).render().asPng();
  writeFileSync(outputPath, png);
}

// Fluent Emoji: fetch only each emoji's metadata.json, find our pictures by codepoint, then fetch
// just their 3D images. The whole repository is several gigabytes.
const fluentDir = join(root, '.cache', 'fluent');
const git = (...args) => execFileSync('git', ['-C', fluentDir, ...args], { stdio: 'inherit' });
const sparse = (patterns) => writeFileSync(join(fluentDir, '.git', 'info', 'sparse-checkout'), patterns.join('\n') + '\n');
const METADATA = ['/LICENSE', '/assets/*/metadata.json'];
if (!existsSync(fluentDir)) {
  execFileSync('git', ['clone', '-q', '--depth', '1', '--filter=blob:none', '--no-checkout', 'https://github.com/microsoft/fluentui-emoji.git', fluentDir]);
  git('sparse-checkout', 'init', '--no-cone');
  sparse(METADATA);
  git('checkout', '-q', 'main');
}
const codeKey = (code) => code.toLowerCase().split(/[\s_-]+/).filter((part) => part && part !== 'fe0f').join('-');
const fluentByCode = new Map();
for (const dir of readdirSync(join(fluentDir, 'assets'))) {
  const file = join(fluentDir, 'assets', dir, 'metadata.json');
  if (!existsSync(file)) continue;
  const meta = JSON.parse(readFileSync(file, 'utf8'));
  // People emoji keep their default (yellow) skin tone in a Default folder.
  fluentByCode.set(codeKey(meta.unicode), join('assets', dir, meta.unicodeSkintones ? 'Default' : '', '3D'));
}
const isArt = (code) => code.startsWith('art:');
const fluentFolders = Object.values(pictures).filter((code) => !isArt(code)).map((code) => {
  const folder = fluentByCode.get(codeKey(code));
  if (!folder) throw new Error(`Fluent Emoji has no ${code}`);
  return folder;
});
const escape = (path) => path.replace(/[[\]*?!#]/g, '\\$&');
sparse([...METADATA, ...new Set(fluentFolders.map((folder) => `/${escape(folder)}/*`))]);
git('checkout', '-q', 'main');

for (const dir of [cacheDir, picsDir, coloringDir]) mkdirSync(dir, { recursive: true });

const written = new Map();
for (const [name, code] of Object.entries(pictures)) {
  if (written.has(code)) continue;
  if (isArt(code)) {
    render(readFileSync(join(root, 'assets', 'art', `${code.slice(4)}.svg`), 'utf8'), 256, join(picsDir, `${slug(name)}.png`));
    written.set(code, slug(name));
    continue;
  }
  const folder = join(fluentDir, fluentByCode.get(codeKey(code)));
  const image = readdirSync(folder).find((file) => file.endsWith('.png'));
  copyFileSync(join(folder, image), join(picsDir, `${slug(name)}.png`));
  written.set(code, slug(name));
}
for (const old of readdirSync(picsDir)) {
  if (![...written.values()].some((name) => `${name}.png` === old)) unlinkSync(join(picsDir, old));
}
// Coloring pages: render each picture large in full color, then trace the borders between its
// color areas into smooth vector line art (scripts/coloring.py, needs the .art-venv Python
// environment). The app draws the outlines with Skia, so they stay sharp at any size; small PNGs
// are kept for the page picker.
const sourceDir = join(root, '.cache', 'coloring-src');
const svgDir = join(root, '.cache', 'coloring-svg');
for (const dir of [sourceDir, svgDir]) mkdirSync(dir, { recursive: true });
const pairs = [];
for (const name of COLORING_PAGES) {
  const source = join(sourceDir, `${slug(name)}.png`);
  render(await svgFor(coloringCode[name]), 1024, source);
  pairs.push(source, join(svgDir, `${slug(name)}.svg`));
}
execFileSync(join(root, '.art-venv', 'bin', 'python'), [join(root, 'scripts', 'coloring.py'), ...pairs], { stdio: 'inherit' });

const outlines = {};
for (const name of COLORING_PAGES) {
  const svg = readFileSync(join(svgDir, `${slug(name)}.svg`), 'utf8');
  const size = Number(/viewBox="0 0 (\d+)/.exec(svg)[1]);
  outlines[name] = { size, d: /\sd="([^"]+)"/.exec(svg)[1] };
  render(svg, 256, join(coloringDir, `${slug(name)}.png`));
}
writeFileSync(join(root, 'src', 'content', 'coloring-outlines.json'), JSON.stringify(outlines) + '\n');
for (const old of readdirSync(coloringDir)) {
  if (!COLORING_PAGES.some((name) => `${slug(name)}.png` === old)) unlinkSync(join(coloringDir, old));
}

const lines = [
  '// Generated by scripts/generate-pictures.mjs. Do not edit by hand.',
  '// Pictures: Fluent Emoji by Microsoft, MIT License. Coloring pages: traced from Noto Emoji by Google, Apache License 2.0.',
  '',
  'export const PICTURE_FILES: Record<string, number> = {',
  ...Object.entries(pictures).map(
    ([name, code]) => `  '${name}': require('../../assets/pics/${written.get(code)}.png'),`,
  ),
  '};',
  '',
  'export const COLORING_FILES: Record<string, number> = {',
  ...COLORING_PAGES.map((name) => `  '${name}': require('../../assets/coloring/${slug(name)}.png'),`),
  '};',
  '',
  '/** Coloring page categories, in order, for the picker tabs. */',
  `export const COLORING_CATEGORIES: { id: string; title: string; icon: string; pages: string[] }[] = ${JSON.stringify(
    coloring.categories.map((c) => ({ id: c.id, title: c.title, icon: c.icon, pages: Object.keys(c.pages) })),
    null,
    2,
  )};`,
  '',
];
writeFileSync(join(root, 'src', 'content', 'picture-files.ts'), lines.join('\n'));
console.log(`wrote ${written.size} pictures and ${COLORING_PAGES.length} coloring pages in ${coloring.categories.length} categories`);
