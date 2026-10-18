// Lists every spoken line (id -> text) from src/content/learning.ts into audio-tools/speech.json.
// Node 24 strips TypeScript types on import, so the app's content module is used as-is.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { say, spokenLines } from '../src/content/learning.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const lines = spokenLines();

// Story Shelf: each book's title and the words on each page.
const stories = JSON.parse(readFileSync(join(root, 'src', 'content', 'stories.json'), 'utf8'));
for (const story of stories) {
  lines[say.bookTitle(story.slug)] = story.title;
  story.pages.forEach((page, i) => {
    if (page.text) lines[say.bookPage(story.slug, i)] = page.text;
  });
}
writeFileSync(join(root, 'audio-tools', 'speech.json'), JSON.stringify(lines, null, 2) + '\n');
console.log(`listed ${Object.keys(lines).length} spoken lines`);
