// Imports picture books for Story Shelf from Book Dash (github.com/bookdash/bookdash-books).
// Book Dash books are licensed CC BY 4.0: the app credits each book's creators, links to the source,
// and says what changed (pictures resized, narration added).
//
//   node scripts/import-stories.mjs              text, credits and pictures -> src/content/stories.json,
//                                                assets/stories/, src/content/story-files.ts
//   node scripts/import-stories.mjs --durations  after `npm run generate:audio`, store how long each
//                                                page's narration lasts, for word highlighting
//
// Pictures are resized with macOS's built-in `sips`.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const RAW = 'https://raw.githubusercontent.com/bookdash/bookdash-books/gh-pages';
const SOURCE = 'https://github.com/bookdash/bookdash-books';
const cacheDir = join(root, '.cache', 'bookdash');
const outDir = join(root, 'assets', 'stories');
const storiesFile = join(root, 'src', 'content', 'stories.json');

// Book Dash books whose pictures are in the repository, shortest first: from about 60 words for
// reading alone up to about 420 for "Read to me". A few books in the repository have no page
// pictures (such as What is it? and Hippo Wants to Dance), so they can't be included.
const BOOKS = [
  'come-back-cat', 'sbus-special-shoes', 'how-about-you', 'bathtub-safari', 'a-house-for-mouse',
  'is-there-anyone-like-me', 'i-will-help-you', 'a-beautiful-day', 'rafikis-style', 'whose-button-is-this', 'what-if',
  'grandpas-gold', 'karabos-question', 'little-ants-big-plan', 'lara-the-yellow-ladybird', 'thatos-birthday-surprise',
  'londi-the-dreaming-girl', 'walking-together', 'why-is-nita-upside-down', 'sleepy-mr-sloth', 'lory-dory',
  'sima-and-siza', 'there-must-be-a-rainbow', 'amazing-daisy', 'tortoise-finds-his-home', 'sindiwe-and-the-fireflies',
  'a-tiny-seed', 'a-dancers-tale',
];

const lineId = (slug, page) => `book-${slug}-${page}`;

if (process.argv.includes('--durations')) {
  const stories = JSON.parse(readFileSync(storiesFile, 'utf8'));
  for (const story of stories) {
    story.pages.forEach((page, i) => {
      const file = join(root, 'assets', 'audio', 'speech', `${lineId(story.slug, i)}.m4a`);
      if (!page.text || !existsSync(file)) return;
      const info = execFileSync('afinfo', [file], { encoding: 'utf8' });
      page.seconds = Number(Number(/estimated duration: ([\d.]+)/.exec(info)[1]).toFixed(2));
    });
  }
  writeFileSync(storiesFile, JSON.stringify(stories, null, 2) + '\n');
  console.log('stored narration lengths');
  process.exit(0);
}

async function fetchText(url) {
  const response = await fetch(url);
  return response.ok ? response.text() : null;
}

async function download(url, path) {
  if (existsSync(path)) return true;
  const response = await fetch(url);
  if (!response.ok) return false;
  writeFileSync(path, Buffer.from(await response.arrayBuffer()));
  return true;
}

/** The fields of one book in Book Dash's _data/meta.yml (a simple, flat block per book). */
function metaFor(yaml, slug) {
  const start = yaml.indexOf(`\n  ${slug}:\n`);
  if (start < 0) throw new Error(`No metadata for ${slug}`);
  const block = yaml.slice(start + slug.length + 5).split(/\n {2}\S/)[0];
  const field = (name) => new RegExp(`^ {4}${name}: "([^"]*)"`, 'm').exec(block)?.[1] ?? '';
  return { title: field('title'), creators: field('creator'), description: field('description'), date: field('date') };
}

/** Splits a book into pages: each picture, then the sentences printed under it. */
function pagesOf(markdown) {
  const body = markdown.replace(/^---[\s\S]*?---/, '');
  const pages = [];
  for (const line of body.split('\n').map((l) => l.trim())) {
    const image = /^!\[(.*?)\]\(.*?\/([^/)]+)\.jpg\)/.exec(line);
    if (image) pages.push({ image: image[2], alt: image[1].trim(), lines: [] });
    else if (line && !line.startsWith('#') && !line.startsWith('{') && pages.length) pages[pages.length - 1].lines.push(line);
  }
  return pages.map(({ image, alt, lines }) => ({ image, alt, text: lines.join(' ').replace(/\s+/g, ' ').trim() }));
}

mkdirSync(cacheDir, { recursive: true });
rmSync(outDir, { recursive: true, force: true });
const yaml = await fetchText(`${RAW}/_data/meta.yml`);
const stories = [];
const requires = [];

for (const slug of BOOKS) {
  const markdown = await fetchText(`${RAW}/${slug}/en/index.md`);
  if (!markdown) throw new Error(`No English text for ${slug}`);
  const meta = metaFor(yaml, slug);
  const pages = pagesOf(markdown);
  mkdirSync(join(cacheDir, slug), { recursive: true });
  const names = ['cover', ...pages.map((p) => p.image)];
  let missing = null;
  for (const name of names) {
    const cached = join(cacheDir, slug, `${name}.jpg`);
    const found =
      (await download(`${RAW}/${slug}/en/images/${name}.jpg`, cached)) || (await download(`${RAW}/${slug}/images/${name}.jpg`, cached));
    if (!found) missing ??= name;
  }
  // A few books in the repository are missing their pictures. Leave those out.
  if (missing) {
    console.log(`skipped ${meta.title}: no picture ${missing}`);
    continue;
  }
  mkdirSync(join(outDir, slug), { recursive: true });

  for (const name of names) {
    const cached = join(cacheDir, slug, `${name}.jpg`);
    const out = join(outDir, slug, `${name}.jpg`);
    execFileSync('sips', ['-Z', name === 'cover' ? '480' : '820', '-s', 'format', 'jpeg', '-s', 'formatOptions', '62', cached, '--out', out], {
      stdio: 'ignore',
    });
    requires.push(`  '${slug}/${name}': require('../../assets/stories/${slug}/${name}.jpg'),`);
  }

  stories.push({
    slug,
    title: meta.title,
    description: meta.description,
    credit: `${meta.creators}. Published by Book Dash, ${meta.date.slice(0, 4)}.`,
    source: `${SOURCE}/tree/gh-pages/${slug}`,
    pages: pages.map(({ image, alt, text }) => ({ image, alt, text })),
  });
  console.log(`${meta.title}: ${pages.length} pages`);
}

writeFileSync(storiesFile, JSON.stringify(stories, null, 2) + '\n');
writeFileSync(
  join(root, 'src', 'content', 'story-files.ts'),
  [
    '// Generated by scripts/import-stories.mjs. Do not edit by hand.',
    '// Book Dash picture books, CC BY 4.0. Credits are in src/content/stories.json.',
    '',
    'export const STORY_FILES: Record<string, number> = {',
    ...requires,
    '};',
    '',
  ].join('\n'),
);
console.log(`wrote ${stories.length} books`);
