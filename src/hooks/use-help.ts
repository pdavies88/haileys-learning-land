import { useState } from 'react';

import { say } from '@/content/learning';
import { pick, speak } from '@/lib/audio';

/** After this many misses on one question, the Help button appears. */
export const HELP_AFTER = 2;

/**
 * The Help button for multiple-choice questions. It never shows the answer: each press takes one
 * wrong choice away, always leaving at least two to choose from. Call `miss(count)` with the
 * question's miss count, `reset()` for each new question.
 */
export function useHelp<T>() {
  const [removed, setRemoved] = useState<T[]>([]);
  const [misses, setMisses] = useState(0);
  const [tried, setTried] = useState<T[]>([]);

  const removable = (choices: readonly T[], answer: T) => {
    const left = choices.filter((c) => !removed.includes(c));
    return left.length > 2 ? left.filter((c) => c !== answer) : [];
  };

  return {
    removed,
    isGone: (choice: T) => removed.includes(choice),
    /** Records a miss on `choice`. Returns the extra line to say when Help first becomes available. */
    miss: (count: number, choice: T) => {
      setMisses(count);
      setTried((t) => [...t, choice]);
      return count === HELP_AFTER ? [say.line('helpOffer')] : [];
    },
    canHelp: (choices: readonly T[], answer: T) => misses >= HELP_AFTER && removable(choices, answer).length > 0,
    help: (choices: readonly T[], answer: T) => {
      const options = removable(choices, answer);
      if (!options.length) return;
      // Take away a wrong choice she hasn't tried yet; she already knows the ones she tried.
      const untried = options.filter((c) => !tried.includes(c));
      setRemoved((r) => [...r, pick(untried.length ? untried : options)]);
      speak(say.line('helpRemove'));
    },
    reset: () => {
      setRemoved([]);
      setMisses(0);
      setTried([]);
    },
  };
}
