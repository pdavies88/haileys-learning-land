import { describe, expect, it } from '@jest/globals';

import { SPY_TARGETS } from '@/content/learning';
import { SCENE_KINDS, buildScene, hitsTarget, visibleShare } from '@/lib/spy-scene';

// Phone upright, phone sideways, Fire tablet sideways, iPad upright.
const SIZES = [[358, 600], [760, 300], [1150, 640], [790, 960]] as const;

describe('I spy scenes', () => {
  it('always hides exactly one target, inside the picture, mostly showing and tappable', () => {
    for (const [width, height] of SIZES)
      for (let round = 0; round < 15; round++)
        for (let seed = 1; seed <= 4; seed++) {
          const kind = SCENE_KINDS[round % SCENE_KINDS.length];
          const targetName = SPY_TARGETS[round % SPY_TARGETS.length].name;
          const scene = buildScene({ kind, targetName, width, height, round, seed: seed * 7919 + round });
          const { target } = scene;
          expect(scene.things.filter((t) => t.kind === 'target')).toHaveLength(1);
          expect(target.x - target.size / 2).toBeGreaterThanOrEqual(0);
          expect(target.x + target.size / 2).toBeLessThanOrEqual(width);
          expect(target.y - target.size / 2).toBeGreaterThanOrEqual(0);
          expect(target.y + target.size / 2).toBeLessThanOrEqual(height);
          expect(visibleShare(scene)).toBeGreaterThanOrEqual(0.66);
          expect(hitsTarget(target, target.x, target.y)).toBe(true);
          expect(hitsTarget(target, target.x + target.size * 0.5, target.y)).toBe(true);
          expect(hitsTarget(target, target.x + target.size * 2, target.y)).toBe(false);
          // A busy picture, not a sparse one.
          expect(scene.things.length).toBeGreaterThan(40);
        }
  });

  it('gives the same picture for the same seed', () => {
    const a = buildScene({ kind: 'park', targetName: 'star', width: 400, height: 600, round: 0, seed: 42 });
    const b = buildScene({ kind: 'park', targetName: 'star', width: 400, height: 600, round: 0, seed: 42 });
    expect(a).toEqual(b);
  });

  it('packs later rounds more busily', () => {
    const count = (round: number) => buildScene({ kind: 'town', targetName: 'heart', width: 800, height: 600, round, seed: 5 }).things.length;
    expect(count(6)).toBeGreaterThan(count(0));
  });
});
