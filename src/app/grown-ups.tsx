import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Bouncy } from '@/components/bouncy';
import { Txt } from '@/components/txt';
import { Colors, Spacing, cardShadow } from '@/constants/theme';
import { NUMBER_WORDS, say } from '@/content/learning';
import { speak } from '@/lib/audio';
import { randomInt, shuffle } from '@/lib/random';

const SITE = 'https://pdavies88.github.io/haileys-learning-land';

function newGate() {
  const first = randomInt(1, 9);
  let second = randomInt(1, 9);
  if (second === first) second = (second % 9) + 1;
  return { answer: [first, second], digits: shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]) };
}

/**
 * A parental gate, then information for grown-ups. The gate asks for two numbers written as
 * words, which a young child who can't read yet can't follow by chance.
 */
export default function GrownUps() {
  const insets = useSafeAreaInsets();
  const [gate, setGate] = useState(newGate);
  const [entered, setEntered] = useState<number[]>([]);
  const [open, setOpen] = useState(false);

  const press = (digit: number) => {
    const next = [...entered, digit];
    if (next[next.length - 1] !== gate.answer[next.length - 1]) {
      setEntered([]);
      setGate(newGate());
      speak(say.line('grownUps'));
      return;
    }
    if (next.length === gate.answer.length) setOpen(true);
    else setEntered(next);
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={{ padding: Spacing.lg, paddingTop: Spacing.lg, paddingBottom: insets.bottom + Spacing.xl, gap: Spacing.md }}>
      <View style={styles.top}>
        <Txt size={28} weight="heavy">
          For grown-ups
        </Txt>
        <Bouncy accessibilityLabel="Close" style={styles.close} onPress={() => router.back()}>
          <Txt size={18} color={Colors.purpleDark}>
            Close
          </Txt>
        </Bouncy>
      </View>

      {!open ? (
        <View style={[styles.card, { alignItems: 'center' }]}>
          <Txt size={18} weight="regular" color={Colors.textSoft} style={{ textAlign: 'center' }}>
            To continue, tap the numbers
          </Txt>
          <Txt size={26} weight="heavy" style={{ textAlign: 'center' }}>
            {NUMBER_WORDS[gate.answer[0]]}, then {NUMBER_WORDS[gate.answer[1]]}
          </Txt>
          <View style={styles.pad}>
            {gate.digits.map((digit) => (
              <Bouncy key={digit} accessibilityLabel={String(digit)} style={styles.key} onPress={() => press(digit)}>
                <Txt size={28} weight="heavy" color={Colors.purpleDark}>
                  {digit}
                </Txt>
              </Bouncy>
            ))}
          </View>
        </View>
      ) : (
        <>
          <View style={styles.card}>
            <Txt size={20} weight="heavy">
              About this app
            </Txt>
            <Txt size={17} weight="regular">
              Hailey&apos;s Learning Land has thirteen learning games for young children: letter tracing, sight
              words, counting, drawing, memory, letter sounds, puzzles, dress-up, stories, cooking, shapes, music and
              a pet to care for. Every game is free and unlocked. There are no ads, no in-app purchases and no
              accounts.
            </Txt>
          </View>
          <View style={styles.card}>
            <Txt size={20} weight="heavy">
              Privacy
            </Txt>
            <Txt size={17} weight="regular">
              The app works completely offline. It collects no information, saves nothing about your child, has no
              analytics or tracking, and never connects to the internet unless you open one of the links below.
            </Txt>
            <Bouncy accessibilityLabel="Privacy policy" style={styles.link} onPress={() => WebBrowser.openBrowserAsync(`${SITE}/privacy/`)}>
              <Txt size={17} color={Colors.purpleDark}>
                Privacy policy
              </Txt>
            </Bouncy>
            <Bouncy accessibilityLabel="Help and support" style={styles.link} onPress={() => WebBrowser.openBrowserAsync(`${SITE}/support/`)}>
              <Txt size={17} color={Colors.purpleDark}>
                Help and support
              </Txt>
            </Bouncy>
            <Txt size={14} weight="regular" color={Colors.textSoft}>
              These links need an internet connection.
            </Txt>
          </View>
          <View style={styles.card}>
            <Txt size={20} weight="heavy">
              Credits
            </Txt>
            <Txt size={15} weight="regular">
              Pictures and coloring pages: based on Noto Emoji by Google, Apache License 2.0. Voice: generated with the open-source Kokoro
              text-to-speech model, Apache License 2.0. Font: Fredoka, SIL Open Font License. Sight words from the
              Dolch word list.
            </Txt>
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  close: { paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md, borderRadius: 999, backgroundColor: Colors.white, ...cardShadow },
  card: { backgroundColor: Colors.white, borderRadius: 24, padding: Spacing.lg, gap: Spacing.sm, ...cardShadow },
  pad: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: Spacing.sm, marginTop: Spacing.md, maxWidth: 320 },
  key: { width: 80, height: 72, borderRadius: 20, backgroundColor: Colors.sky, alignItems: 'center', justifyContent: 'center' },
  link: { paddingVertical: Spacing.sm },
});
