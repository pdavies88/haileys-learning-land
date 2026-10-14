import { describe, expect, it } from '@jest/globals';

import pictures from '../pictures.json';
import {
  FRIENDS, GAMES, JIGSAW_PICTURES, LETTERS, MEMORY_SETS, MISSIONS, PLACES, SIGHT_WORDS, SOUND_PICTURES, STICKERS,
  say, spokenLines,
} from '../learning';

const known = new Set(Object.keys(pictures));

describe('content', () => {
  it('only uses pictures that exist', () => {
    const used = [
      ...Object.values(SOUND_PICTURES).flat(),
      ...MEMORY_SETS.flatMap((s) => s.pictures),
      ...MISSIONS.flatMap((m) => [m.animal, m.food]),
      ...FRIENDS,
      ...STICKERS,
      ...PLACES.flatMap((p) => p.decor),
      ...LETTERS.map((l) => l.word),
      ...GAMES.map((g) => g.picture),
      ...JIGSAW_PICTURES,
    ];
    expect(used.filter((name) => !known.has(name))).toEqual([]);
  });

  it('only lists Sound Safari pictures that start with their letter', () => {
    for (const [letter, names] of Object.entries(SOUND_PICTURES)) {
      for (const name of names) expect(name[0]).toBe(letter);
    }
  });

  it('has 26 letters and no repeated sight words', () => {
    expect(LETTERS).toHaveLength(26);
    expect(new Set(SIGHT_WORDS).size).toBe(SIGHT_WORDS.length);
  });

  it('has a spoken line for everything the games say', () => {
    const lines = spokenLines();
    const needed = [
      ...LETTERS.flatMap((l) => [say.letterName(l), say.letterSound(l), say.letterIsFor(l), say.traceUpper(l), say.traceLower(l)]),
      ...SIGHT_WORDS.flatMap((w) => [say.word(w), say.findWord(w)]),
      ...MISSIONS.flatMap((m) => Array.from({ length: 10 }, (_, i) => say.mission(m, i + 1))),
      ...Object.entries(SOUND_PICTURES).flatMap(([letter, names]) => [say.safariFind(letter), ...names.map((n) => say.startsWith(n, letter))]),
      ...FRIENDS.map(say.picture),
      ...MEMORY_SETS.flatMap((s) => s.pictures.map(say.picture)),
    ];
    expect(needed.filter((id) => !(id in lines))).toEqual([]);
  });
});
