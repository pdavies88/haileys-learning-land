import { Image } from 'expo-image';
import { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { FadeIn, FadeInRight, ZoomIn } from 'react-native-reanimated';

import { Bouncy } from '@/components/bouncy';
import { useCelebration } from '@/components/celebration';
import { GameScreen } from '@/components/game-screen';
import { Pic } from '@/components/pic';
import { Txt } from '@/components/txt';
import { Colors, Radius, Spacing, cardShadow, raised } from '@/constants/theme';
import { SPEECH_FILES } from '@/content/audio-files';
import { say } from '@/content/learning';
import { STORY_FILES } from '@/content/story-files';
import STORIES from '@/content/stories.json';
import { playSfx, speak, stopSpeaking } from '@/lib/audio';

type Story = (typeof STORIES)[number];
type Mode = 'listen' | 'read';

const wordsOf = (text: string) => text.split(' ').filter(Boolean);
/** The spoken line for a word she taps, if the app has one (sight words and many picture words). */
const lineForWord = (word: string) => {
  const clean = word.toLowerCase().replace(/[^a-z']/g, '').replace(/'s$/, '');
  return [`word-${clean}`, `pic-${clean}`].find((id) => id in SPEECH_FILES);
};

/**
 * Story Shelf: picture books from Book Dash (CC BY 4.0). In "Read to me" the narrator reads each
 * page and lights up each word as it goes. In "I'll read" she reads on her own, can tap a word to
 * hear it, and can tap the speaker for help.
 */
export default function Books() {
  const { width, height } = useWindowDimensions();
  const [story, setStory] = useState<Story | null>(null);
  const [page, setPage] = useState(0);
  const [mode, setMode] = useState<Mode>('listen');
  const [lit, setLit] = useState(-1);
  const reading = useRef(0);
  const { celebrate, overlay } = useCelebration();
  const wide = width > height;

  useEffect(() => {
    speak(say.line('shelfIntro'));
    return () => {
      reading.current += 1;
    };
  }, []);

  /** Reads a page aloud, lighting each word in turn. Word timing is spread by word length. */
  const readPage = async (s: Story, index: number) => {
    const run = ++reading.current;
    setLit(-1);
    const current = s.pages[index];
    if (!current?.text) return;
    const words = wordsOf(current.text);
    const weights = words.map((w) => w.length + 2);
    const total = weights.reduce((a, b) => a + b, 0);
    const seconds = 'seconds' in current && typeof current.seconds === 'number' ? current.seconds : words.length * 0.42;
    const TICK = 80;
    let elapsed = 0;
    const timer = setInterval(() => {
      if (reading.current !== run) return clearInterval(timer);
      elapsed += TICK;
      let at = (elapsed / 1000 / seconds) * total;
      let i = 0;
      while (i < weights.length - 1 && at > weights[i]) at -= weights[i++];
      setLit(i);
    }, TICK);
    await speak(say.bookPage(s.slug, index));
    clearInterval(timer);
    if (reading.current === run) setLit(-1);
  };

  const openPage = (s: Story, index: number, readMode = mode) => {
    reading.current += 1;
    stopSpeaking();
    setPage(index);
    setLit(-1);
    if (index >= s.pages.length) {
      playSfx('tada');
      speak(say.line('theEnd')).then(() => celebrate(true));
      return;
    }
    if (readMode === 'listen') readPage(s, index);
  };

  const openBook = (s: Story) => {
    setStory(s);
    setPage(0);
    reading.current += 1;
    speak(say.bookTitle(s.slug), say.line(mode === 'listen' ? 'readToMe' : 'youRead')).then(() => {
      if (mode === 'listen') readPage(s, 0);
    });
  };

  const closeBook = () => {
    reading.current += 1;
    stopSpeaking();
    setStory(null);
    speak(say.line('shelfIntro'));
  };

  let body;
  if (!story) {
    const columns = width >= 900 ? 4 : width >= 600 ? 3 : 2;
    const cover = Math.min((width - Spacing.md * (columns + 1)) / columns, 220);
    body = (
      <ScrollView contentContainerStyle={styles.shelf}>
        <View style={styles.modes}>
          {(['listen', 'read'] as const).map((m) => (
            <Bouncy
              key={m}
              accessibilityLabel={m === 'listen' ? 'Read to me' : "I'll read"}
              style={[styles.mode, mode === m && styles.modeOn]}
              onPress={() => {
                setMode(m);
                speak(say.line(m === 'listen' ? 'readToMe' : 'youRead'));
              }}>
              <Pic name={m === 'listen' ? 'speaker' : 'book'} size={26} />
              <Txt size={17} color={mode === m ? Colors.white : Colors.text}>
                {m === 'listen' ? 'Read to me' : "I'll read"}
              </Txt>
            </Bouncy>
          ))}
        </View>
        <View style={[styles.covers, { gap: Spacing.md }]}>
          {STORIES.map((s, i) => (
            <Animated.View key={s.slug} entering={ZoomIn.delay(i * 40).springify()}>
              <Bouncy accessibilityLabel={s.title} style={[styles.book, { width: cover }]} onPress={() => openBook(s)}>
                <Image source={STORY_FILES[`${s.slug}/cover`]} style={{ width: cover, height: cover }} contentFit="cover" />
                <Txt size={16} weight="bold" numberOfLines={2} style={styles.bookTitle}>
                  {s.title}
                </Txt>
              </Bouncy>
            </Animated.View>
          ))}
        </View>
        <Txt size={13} weight="regular" color={Colors.textSoft} style={styles.shelfCredit}>
          Picture books from Book Dash (bookdash.org), shared under the Creative Commons Attribution 4.0 license.
        </Txt>
      </ScrollView>
    );
  } else if (page >= story.pages.length) {
    body = (
      <ScrollView contentContainerStyle={styles.end}>
        <Animated.View entering={ZoomIn.springify()}>
          <Image source={STORY_FILES[`${story.slug}/cover`]} style={styles.endCover} contentFit="cover" />
        </Animated.View>
        <Txt size={40} weight="heavy" color={Colors.purpleDark}>
          The End
        </Txt>
        <View style={styles.endButtons}>
          <Bouncy accessibilityLabel="Read it again" style={[styles.endButton, { backgroundColor: Colors.teal }]} onPress={() => openPage(story, 0)}>
            <Txt size={20} color={Colors.white}>
              Read again
            </Txt>
          </Bouncy>
          <Bouncy accessibilityLabel="Pick another book" style={[styles.endButton, { backgroundColor: Colors.purple }]} onPress={closeBook}>
            <Txt size={20} color={Colors.white}>
              Another book
            </Txt>
          </Bouncy>
        </View>
        <View style={styles.credits}>
          <Txt size={15} weight="bold">
            {story.title}
          </Txt>
          <Txt size={14} weight="regular" color={Colors.textSoft} style={styles.center}>
            By {story.credit} Licensed under Creative Commons Attribution 4.0 (CC BY 4.0). Source: {story.source}. Pictures were resized
            and narration was added for this app.
          </Txt>
        </View>
      </ScrollView>
    );
  } else {
    const current = story.pages[page];
    const words = wordsOf(current.text);
    const imageBox = wide ? { width: width * 0.55, height: height * 0.7 } : { width: width - Spacing.md * 2, height: height * 0.42 };
    // Big type for few words, smaller for a long page, scaled to the screen.
    const textSize = Math.round(Math.max(20, Math.min(Math.min(width, height) / 18, 1400 / Math.max(words.length, 24))));
    body = (
      <View style={[styles.reader, wide && styles.readerWide]}>
        <Animated.View key={`img-${page}`} entering={FadeIn.duration(350)} style={[styles.pageImage, imageBox]}>
          <Image source={STORY_FILES[`${story.slug}/${current.image}`]} style={StyleSheet.absoluteFill} contentFit="contain" accessibilityLabel={current.alt} />
        </Animated.View>
        <View style={styles.textSide}>
          <Animated.View key={`text-${page}`} entering={FadeInRight.duration(300)} style={styles.words}>
            {words.map((word, i) => {
              const line = mode === 'read' ? lineForWord(word) : undefined;
              const text = (
                <Txt size={textSize} weight={i === lit ? 'heavy' : 'bold'} color={i === lit ? Colors.purpleDark : Colors.text}>
                  {word}
                </Txt>
              );
              return (
                <View key={i} style={[styles.word, i === lit && styles.wordLit]}>
                  {line ? (
                    <Bouncy accessibilityLabel={word} sound={false} onPress={() => speak(line)}>
                      {text}
                    </Bouncy>
                  ) : (
                    text
                  )}
                </View>
              );
            })}
          </Animated.View>
          <View style={styles.turns}>
            <Bouncy accessibilityLabel="Previous page" style={[styles.turn, page === 0 && styles.turnOff]} disabled={page === 0} onPress={() => openPage(story, page - 1)}>
              <Txt size={40} weight="heavy" color={Colors.teal}>
                ‹
              </Txt>
            </Bouncy>
            <Txt size={16} weight="regular" color={Colors.textSoft}>
              {page + 1} / {story.pages.length}
            </Txt>
            <Bouncy accessibilityLabel="Next page" style={[styles.turn, styles.turnNext]} onPress={() => openPage(story, page + 1)}>
              <Txt size={40} weight="heavy" color={Colors.white}>
                ›
              </Txt>
            </Bouncy>
          </View>
        </View>
      </View>
    );
  }

  return (
    <GameScreen
      title={story ? story.title : 'Story Shelf'}
      background="#CDEFEA"
      onRepeat={() => (story && page < story.pages.length ? readPage(story, page) : speak(say.line('shelfIntro')))}>
      {story ? (
        <Bouncy accessibilityLabel="Back to the shelf" style={styles.back} onPress={closeBook}>
          <Txt size={16} color={Colors.textSoft}>
            ‹ All books
          </Txt>
        </Bouncy>
      ) : null}
      {body}
      {overlay}
    </GameScreen>
  );
}

const styles = StyleSheet.create({
  shelf: { padding: Spacing.md, gap: Spacing.lg, alignItems: 'center' },
  modes: { flexDirection: 'row', gap: Spacing.sm, backgroundColor: 'rgba(255,255,255,0.6)', padding: 6, borderRadius: 999 },
  mode: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: Spacing.md, paddingVertical: 10, borderRadius: 999 },
  modeOn: { backgroundColor: Colors.teal },
  covers: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' },
  book: { backgroundColor: Colors.white, borderRadius: Radius.md, overflow: 'hidden', ...raised('#A9D9D2') },
  bookTitle: { padding: Spacing.sm, minHeight: 52 },
  shelfCredit: { textAlign: 'center', maxWidth: 520 },
  back: { alignSelf: 'center', paddingHorizontal: Spacing.md, paddingVertical: 6, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.7)', marginTop: Spacing.xs },
  reader: { flex: 1, alignItems: 'center', padding: Spacing.md, gap: Spacing.md },
  readerWide: { flexDirection: 'row' },
  pageImage: { borderRadius: Radius.lg, overflow: 'hidden' },
  textSide: { flex: 1, alignSelf: 'stretch', justifyContent: 'space-between', gap: Spacing.md },
  words: { flexDirection: 'row', flexWrap: 'wrap', alignContent: 'center', justifyContent: 'center', flex: 1, columnGap: 2, rowGap: 4 },
  word: { paddingHorizontal: 4, borderRadius: 10 },
  wordLit: { backgroundColor: '#FFF1A8' },
  turns: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  turn: { width: 72, height: 72, borderRadius: 36, backgroundColor: Colors.white, alignItems: 'center', justifyContent: 'center', ...raised('#B9DDD7', 5) },
  turnNext: { backgroundColor: Colors.teal, ...raised('#0B7268', 5) },
  turnOff: { opacity: 0.35 },
  end: { alignItems: 'center', padding: Spacing.lg, gap: Spacing.md },
  endCover: { width: 180, height: 180, borderRadius: Radius.lg },
  endButtons: { flexDirection: 'row', gap: Spacing.md, flexWrap: 'wrap', justifyContent: 'center' },
  endButton: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, borderRadius: 999, ...cardShadow },
  credits: { alignItems: 'center', gap: 4, maxWidth: 560, marginTop: Spacing.md },
  center: { textAlign: 'center' },
});
