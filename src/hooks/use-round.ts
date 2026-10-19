import { useRef, useState } from 'react';

import { say } from '@/content/learning';
import { speak } from '@/lib/audio';

/**
 * Tracks a round of questions and adjusts the difficulty as she plays.
 *
 * Two right answers in a row on the first try move up a level. Two misses on one question move
 * the next question down a level. Nothing is saved: every visit starts fresh at `start`, which is
 * pitched for a five-year-old rather than a toddler.
 */
export function useRound({ total, maxLevel, start = 0 }: { total: number; maxLevel: number; start?: number }) {
  const [level, setLevel] = useState(Math.min(start, maxLevel));
  const [done, setDone] = useState(0);
  const streak = useRef(0);
  const misses = useRef(0);

  /** Call on a wrong answer. Returns how many times she has missed this question. */
  const miss = () => {
    misses.current += 1;
    streak.current = 0;
    if (misses.current === 2) setLevel((l) => Math.max(0, l - 1));
    return misses.current;
  };

  /**
   * Call on a right answer. Celebrates straight away (saying `lead` lines first, such as the
   * word she found), and says so when the level goes up.
   */
  const success = async (celebrate: (big?: boolean, ...lead: string[]) => Promise<void>, ...lead: string[]) => {
    const firstTry = misses.current === 0;
    misses.current = 0;
    streak.current = firstTry ? streak.current + 1 : 0;
    const levelUp = streak.current >= 2 && level < maxLevel;
    if (levelUp) {
      streak.current = 0;
      setLevel(level + 1);
    }
    if (done + 1 >= total) {
      setDone(0);
      await celebrate(true, ...lead);
    } else {
      setDone(done + 1);
      await celebrate(false, ...lead);
    }
    if (levelUp) await speak(say.line('levelUp'));
  };

  return { level, done, total, miss, success };
}
