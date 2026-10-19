import { useRef } from 'react';

/**
 * A guard for taps that start something, such as a right answer that celebrates and moves on.
 * The first tap takes the lock; more taps are ignored until `release`. Children tap fast, and a
 * second tap must not count twice or skip a question.
 */
export function useLock() {
  const held = useRef(false);
  return {
    take: () => {
      if (held.current) return false;
      held.current = true;
      return true;
    },
    release: () => {
      held.current = false;
    },
  };
}
