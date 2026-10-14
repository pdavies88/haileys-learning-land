// Lists every spoken line (id -> text) from src/content/learning.ts into audio-tools/speech.json.
// Node 24 strips TypeScript types on import, so the app's content module is used as-is.
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { spokenLines } from '../src/content/learning.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const lines = spokenLines();
writeFileSync(join(root, 'audio-tools', 'speech.json'), JSON.stringify(lines, null, 2) + '\n');
console.log(`listed ${Object.keys(lines).length} spoken lines`);
