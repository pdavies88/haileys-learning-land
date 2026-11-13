import { useEffect, useState } from 'react';

import { useCelebration } from '@/components/celebration';
import { GameScreen } from '@/components/game-screen';
import { ShapeHunt } from '@/components/shape-hunt';
import { say } from '@/content/learning';
import { useRound } from '@/hooks/use-round';
import { speak } from '@/lib/audio';

/**
 * Shape quest: hunt for shapes. Each solved hunt fills a star, three stars move up a level, and
 * the hunts grow trickier as the levels go up.
 */
export default function Quest() {
  const [huntKey, setHuntKey] = useState(0);
  const round = useRound({ total: 3, maxLevel: 3, start: 1 });
  const { celebrate, overlay } = useCelebration();

  useEffect(() => {
    speak(say.line('questHunt'));
  }, []);

  return (
    <GameScreen
      title="Shape quest"
      background="#D6EEFC"
      onRepeat={() => speak(say.line('questHunt'))}
      progress={{ done: round.done, total: round.total }}
      level={round.level}>
      <ShapeHunt
        key={huntKey}
        level={round.level}
        onSolved={async () => {
          await round.success(celebrate);
          setHuntKey((k) => k + 1);
        }}
      />
      {overlay}
    </GameScreen>
  );
}

export { GameError as ErrorBoundary } from '@/components/game-error';
