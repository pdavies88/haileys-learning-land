import { describe, expect, it } from '@jest/globals';

import coloring from '../coloring.json';
import pictures from '../pictures.json';
import stories from '../stories.json';
import {
  BUILDS, CHEF_MAX, CHEF_MIN, FRIENDS, GAMES, PANTRY, GAME_SECTIONS, RHYMES, SPELL_WORDS, JIGSAW_PICTURES, LETTERS, MEMORY_SETS, MISSIONS, PETS, PLACES, RECIPES, SIGHT_WORDS, SORT_FRUIT,
  SOUND_PICTURES, STICKERS, STORY_FRIENDS, STORY_HEROES, STORY_OBJECTS, STORY_PLACES, say, spokenLines,
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
      ...STORY_HEROES.map((h) => h.id),
      ...STORY_OBJECTS.map((o) => o.id),
      ...RECIPES.flatMap((r) => [r.result, ...r.steps.flatMap((s) => (s.kind === 'add' ? [s.item] : []))]),
      ...Object.values(SORT_FRUIT).flat(),
      ...PETS.map((p) => p.id),
      ...BUILDS.map((b) => b.id),
      ...GAME_SECTIONS.map((s) => s.picture),
      ...SPELL_WORDS.flat(),
      ...RHYMES.flat(),
    ];
    expect(used.filter((name) => !known.has(name))).toEqual([]);
  });

  it('only lists Sound Safari pictures that start with their letter', () => {
    for (const [letter, names] of Object.entries(SOUND_PICTURES)) {
      for (const name of names) expect(name[0]).toBe(letter);
    }
  });

  it('has fourteen games, each with a screen and a card picture', () => {
    expect(GAMES).toHaveLength(14);
    expect(new Set(GAMES.map((g) => g.id)).size).toBe(14);
  });

  it('credits every Story Shelf book and gives each page a picture', () => {
    for (const story of stories) {
      expect(story.credit).toMatch(/Book Dash/);
      expect(story.source).toMatch(/^https:\/\/github\.com\/bookdash\//);
      expect(story.pages.length).toBeGreaterThan(0);
      for (const page of story.pages) expect(page.image).toMatch(/^\d\d$/);
    }
  });

  it('builds each picture in Shape Quest inside its area', () => {
    for (const build of BUILDS) {
      for (const p of build.pieces) {
        expect(p.x - p.w / 2).toBeGreaterThanOrEqual(0);
        expect(p.x + p.w / 2).toBeLessThanOrEqual(1);
        expect(p.y - p.h / 2).toBeGreaterThanOrEqual(0);
        expect(p.y + p.h / 2).toBeLessThanOrEqual(1);
      }
    }
  });

  it('has 100 coloring pages in categories with known tab icons', () => {
    const pages = coloring.categories.flatMap((c) => Object.keys(c.pages));
    expect(pages).toHaveLength(100);
    expect(new Set(pages).size).toBe(100);
    for (const c of coloring.categories) expect(known.has(c.icon)).toBe(true);
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
      ...STORY_HEROES.flatMap((h) => [
        say.storyIntro(h.id), say.storyEnd(h.id),
        ...STORY_FRIENDS.map((f) => say.storyMeet(h.id, f)),
        ...Object.keys(STORY_PLACES).map((p) => say.storyHome(h.id, p)),
        ...STORY_OBJECTS.map((o) => say.storyFind(h.id, o.id)),
      ]),
      ...RECIPES.flatMap((r) => [
        say.recipe(r.id),
        say.recipeDone(r.id),
        ...r.steps.flatMap((step, i) =>
          step.kind === 'add' ? Array.from({ length: CHEF_MAX - CHEF_MIN + 1 }, (_, n) => say.chefAdd(r.id, i, CHEF_MIN + n)) : [say.recipeStep(r.id, i)],
        ),
      ]),
      ...PANTRY.map(say.picture),
      ...BUILDS.flatMap((b) => [say.build(b.id), say.buildDone(b.id)]),
      ...PETS.flatMap((p) => (['hello', 'hungry', 'wantsPlay', 'wantsBath', 'wantsSleep', 'yum', 'played', 'clean', 'rested', 'notNow', 'loves', 'giggle'] as const).map((w) => say.pet(p.id, w))),
      ...PETS.flatMap((p) => Array.from({ length: 10 }, (_, i) => say.mission(MISSIONS.find((m) => m.animal === p.mission)!, i + 1))),
    ];
    expect(needed.filter((id) => !(id in lines))).toEqual([]);
  });
});
