// Lists every spoken line (id -> text) from src/content/learning.ts into audio-tools/speech.json.
// Node 24 strips TypeScript types on import, so the app's content module is used as-is.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { say, spokenLines } from '../src/content/learning.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const lines = spokenLines();

// Voice models spell out shouting in capitals ("ROAR" becomes R-O-A-R), so say it in normal case.
// The page still shows the capitals.
const speakable = (text) => text.replace(/\b[A-Z]{3,}\b/g, (word) => word.charAt(0) + word.slice(1).toLowerCase());

// Story Shelf: each book's title and the words on each page.
const stories = JSON.parse(readFileSync(join(root, 'src', 'content', 'stories.json'), 'utf8'));
for (const story of stories) {
  lines[say.bookTitle(story.slug)] = story.title;
  story.pages.forEach((page, i) => {
    if (page.text) lines[say.bookPage(story.slug, i)] = speakable(page.text);
  });
}
writeFileSync(join(root, 'audio-tools', 'speech.json'), JSON.stringify(lines, null, 2) + '\n');
console.log(`listed ${Object.keys(lines).length} spoken lines`);
