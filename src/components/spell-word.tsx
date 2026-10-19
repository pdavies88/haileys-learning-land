import { useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';

import { Choice } from '@/components/choice';
import { HelpButton } from '@/components/help-button';
import { Pic } from '@/components/pic';
import { Txt } from '@/components/txt';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { LETTERS, say } from '@/content/learning';
import { HELP_AFTER } from '@/hooks/use-help';
import { playSfx, speak } from '@/lib/audio';
import { shuffle } from '@/lib/random';

const ALPHABET = 'abcdefghijklmnopqrstuvwxyz';
const letterInfo = (letter: string) => LETTERS.find((l) => l.lower === letter)!;

type Props = {
  word: string;
  /** Extra letters that aren't in the word, to make it harder. */
  decoys: number;
  onMiss: () => number;
  onDone: () => void;
};

/**
 * Spell a word from its picture: tap the letter tiles in order. Each right letter says its sound,
 * so she hears the word being built. Give it a new `key` for each word.
 */
export function SpellWord({ word, decoys, onMiss, onDone }: Props) {
  const { width, height } = useWindowDimensions();
  const [tiles] = useState(() => {
    const extra = shuffle([...ALPHABET].filter((l) => !word.includes(l))).slice(0, decoys);
    return shuffle([...word, ...extra]).map((letter, id) => ({ id, letter }));
  });
  const [used, setUsed] = useState<number[]>([]);
  const [wiggles, setWiggles] = useState<Record<number, number>>({});
  const [misses, setMisses] = useState(0);
  const typed = used.length;
  const done = typed === word.length;

  const tap = (tile: { id: number; letter: string }) => {
    if (done || used.includes(tile.id)) return;
    if (tile.letter !== word[typed]) {
      playSfx('bloop');
      setWiggles((w) => ({ ...w, [tile.id]: (w[tile.id] ?? 0) + 1 }));
      const count = onMiss();
      setMisses(count);
      speak(say.letterName(letterInfo(tile.letter)), say.line('tryAgain'), ...(count === HELP_AFTER ? [say.line('helpOffer')] : []));
      return;
    }
    const now = [...used, tile.id];
    setUsed(now);
    setMisses(0);
    playSfx('pop');
    if (now.length === word.length) {
      playSfx('chime');
      onDone();
    } else {
      speak(say.letterSound(letterInfo(tile.letter)));
    }
  };

  const slot = Math.min((width - 60) / word.length - Spacing.sm, height * 0.11, 124);
  const tile = Math.min((width - 60) / Math.min(tiles.length, 5) - Spacing.sm, height * 0.11, 124);

  return (
    <View style={styles.body}>
      <View style={styles.picture}>
        <Pic name={word} size={Math.min(height * 0.22, 260)} />
      </View>
      <View style={styles.slots}>
        {[...word].map((letter, i) => (
          <View key={i} style={[styles.slot, { width: slot, height: slot * 1.15 }, i === typed && styles.slotNext]}>
            {i < typed ? (
              <Animated.View entering={ZoomIn.springify()}>
                <Txt size={slot * 0.62} weight="heavy" color={Colors.purpleDark}>
                  {letter}
                </Txt>
              </Animated.View>
            ) : null}
          </View>
        ))}
      </View>
      <View style={[styles.tiles, { maxWidth: (tile + Spacing.sm) * 5 + Spacing.sm }]}>
        {tiles.map((t) =>
          used.includes(t.id) ? (
            <View key={t.id} style={{ width: tile, height: tile }} />
          ) : (
            <Choice
              key={t.id}
              accessibilityLabel={`Letter ${t.letter}`}
              wiggle={wiggles[t.id] ?? 0}
              style={{ width: tile, height: tile }}
              onPress={() => tap(t)}>
              <Txt size={tile * 0.55} weight="heavy" color={Colors.blue}>
                {t.letter}
              </Txt>
            </Choice>
          ),
        )}
      </View>
      {/* Help plays the sound of the next letter, without pointing at the tile. */}
      <HelpButton visible={!done && misses >= HELP_AFTER} onPress={() => speak(say.line('helpListen'), say.letterSound(letterInfo(word[typed])))} />
    </View>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.lg, padding: Spacing.md },
  picture: { backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: 999, padding: Spacing.md },
  slots: { flexDirection: 'row', gap: Spacing.sm },
  slot: {
    borderRadius: Radius.sm,
    backgroundColor: 'rgba(255,255,255,0.75)',
    borderBottomWidth: 5,
    borderColor: 'rgba(59,142,240,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotNext: { borderColor: Colors.blue },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: Spacing.sm },
});
