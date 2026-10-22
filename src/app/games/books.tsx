import { Image } from 'expo-image';
import { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { FadeIn, FadeInRight, ZoomIn } from 'react-native-reanimated';

import { Bouncy } from '@/components/bouncy';
import { useCelebration } from '@/components/celebration';
import { GameScreen } from '@/components/game-screen';
import { Txt } from '@/components/txt';
import { Colors, Radius, Spacing, cardShadow, raised } from '@/constants/theme';
import { say } from '@/content/learning';
import { STORY_FILES } from '@/content/story-files';
import STORIES from '@/content/stories.json';
import { pause, speak, speechPosition, stopSpeaking } from '@/lib/audio';

type Story = (typeof STORIES)[number];

const wordsOf = (text: string) => text.split(' ').filter(Boolean);
// A short rest after each page, to look at the picture before the page turns.
const PAGE_REST_MS = 1200;
// How long a page with no words stays up.
const PICTURE_PAGE_MS = 3500;

/**
 * Story Shelf: picture books from Book Dash (CC BY 4.0). The narrator reads each page, lights up
 * each word as it goes and turns the page by itself, so there is nothing to tap once the book is
 * open. The speaker button reads the current page again and carries on from there.
 */
export default function Books() {
  const { width, height } = useWindowDimensions();
  const [story, setStory] = useState<Story | null>(null);
  const [page, setPage] = useState(0);
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

  /**
   * Reads one page aloud, lighting each word in turn. Word timing is spread by word length.
   * Resolves `true` once the page has been read, or `false` if the reading was stopped.
   */
  const readPage = async (s: Story, index: number, run: number) => {
    setLit(-1);
    const current = s.pages[index];
    if (!current?.text) {
      await pause(PICTURE_PAGE_MS);
      return reading.current === run;
    }
    const words = wordsOf(current.text);
    const weights = words.map((w) => w.length + 2);
    const total = weights.reduce((a, b) => a + b, 0);
    const seconds = 'seconds' in current && typeof current.seconds === 'number' ? current.seconds : words.length * 0.42;
    // Follow the narrator's real playback position, so the light stays with the voice even if
    // the clip takes a moment to start.
    const timer = setInterval(() => {
      if (reading.current !== run) return clearInterval(timer);
      const heard = speechPosition();
      if (heard <= 0) return;
      let at = (heard / seconds) * total;
      let i = 0;
      while (i < weights.length - 1 && at > weights[i]) at -= weights[i++];
      setLit(i);
    }, 80);
    const finished = await speak(say.bookPage(s.slug, index));
    clearInterval(timer);
    if (reading.current === run) setLit(-1);
    return finished && reading.current === run;
  };

  /** Reads from `index` to the end of the book, turning each page after it has been read. */
  const readFrom = async (s: Story, index: number) => {
    const run = ++reading.current;
    stopSpeaking();
    for (let i = index; i < s.pages.length; i++) {
      setPage(i);
      if (!(await readPage(s, i, run))) return;
      await pause(PAGE_REST_MS);
      if (reading.current !== run) return;
    }
    setPage(s.pages.length);
    celebrate(true);
  };

  const openBook = (s: Story) => {
    setStory(s);
    setPage(0);
    setLit(-1);
    const run = ++reading.current;
    speak(say.bookTitle(s.slug)).then((finished) => {
      if (finished && reading.current === run) readFrom(s, 0);
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
          The end
        </Txt>
        <View style={styles.endButtons}>
          <Bouncy accessibilityLabel="Read it again" style={[styles.endButton, { backgroundColor: Colors.teal }]} onPress={() => readFrom(story, 0)}>
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
            {words.map((word, i) => (
              <View key={i} style={[styles.word, i === lit && styles.wordLit]}>
                <Txt size={textSize} weight={i === lit ? 'heavy' : 'bold'} color={i === lit ? Colors.purpleDark : Colors.text}>
                  {word}
                </Txt>
              </View>
            ))}
          </Animated.View>
          <View style={styles.progress}>
            {story.pages.map((_, i) => (
              <View key={i} style={[styles.dot, i <= page && styles.dotOn]} />
            ))}
          </View>
        </View>
      </View>
    );
  }

  return (
    <GameScreen
      title={story ? story.title : 'Story shelf'}
      background="#CDEFEA"
      onRepeat={() => (story && page < story.pages.length ? readFrom(story, page) : speak(say.line('shelfIntro')))}>
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
  progress: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 6 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: 'rgba(14,140,128,0.2)' },
  dotOn: { backgroundColor: Colors.teal },
  end: { alignItems: 'center', padding: Spacing.lg, gap: Spacing.md },
  endCover: { width: 180, height: 180, borderRadius: Radius.lg },
  endButtons: { flexDirection: 'row', gap: Spacing.md, flexWrap: 'wrap', justifyContent: 'center' },
  endButton: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, borderRadius: 999, ...cardShadow },
  credits: { alignItems: 'center', gap: 4, maxWidth: 560, marginTop: Spacing.md },
  center: { textAlign: 'center' },
});
