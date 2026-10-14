# Hailey's Learning Land

A free learning app for young children, with thirteen games, built with Expo (SDK 57) and React Native. It runs on iPhone, iPad and Android, including Amazon Fire tablets. Everything works offline: no accounts, ads, purchases, tracking or saved data.

## Games

- **Magic Letters:** trace uppercase and lowercase letters with a finger. A finished letter "comes alive" with a picture, its name and its sound.
- **Word Detective:** find the spoken sight word among 2 to 4 cards (Dolch pre-primer, then primer words).
- **Count & Collect:** feed animals the right number of treats, find numbers up to 20, and try simple addition.
- **Art Studio:** crayon, marker, glitter, stamps and eraser, 10 colors, 3 sizes, undo, and 100 coloring pages in six category tabs (`src/content/coloring.json`).
- **Flip & Find:** a memory game that grows from 3 to 8 pairs.
- **Sound Safari:** pick the picture that starts with a letter's sound.
- **Puzzle World:** shape sorter and 4- and 9-piece jigsaws.
- **Make a Friend:** choose a friend and a home, then decorate with stickers.
- **Build a Story:** pick a hero, a place and a magical object, draw a picture, and hear a story built from prerecorded sentences.
- **Little Chef:** recipes with first, next and last steps: count ingredients into a bowl, stir, bake and sort fruit by color.
- **Shape Quest:** hunt for shapes or colors, or drag shapes into an outline to build a house, a robot or a rocket.
- **Music Maker:** xylophone, drums, copy-a-tune, and sing-along songs (the alphabet song and counting to ten).
- **My Little Pet:** care for a puppy, kitten, unicorn or bunny by feeding it (counting), teaching it words and drawing it toys.

Every instruction is spoken aloud, and the speaker button repeats it. Wrong answers get a gentle wiggle and "Let's try again!", never a buzzer. Games move up a level after three first-try answers in a row, and ease off after two misses on one question.

## How it's built

- **Routes:** Expo Router. `src/app/index.tsx` is the home screen, each game is a file in `src/app/games/`, and `src/app/grown-ups.tsx` holds the parental gate and app information.
- **Content:** `src/content/learning.ts` holds every letter, word, picture list and spoken line. The spoken lines are referred to by id through `say`, so the games and the audio generator always agree.
- **Drawing and tracing:** `@shopify/react-native-skia`. Letter tracing turns the letter in the Fredoka font into a shape and checks how much of it the finger has covered, rather than enforcing stroke order.
- **Audio:** `src/lib/audio.ts` plays one narrator queue (a new instruction replaces the old one) and overlapping sound effects with `expo-audio`.

## Generated assets

All pictures and sounds are generated on a Mac and committed, so the app never downloads anything.

```bash
npm run generate:pictures      # Noto Emoji SVGs -> assets/pics, assets/coloring, src/content/picture-files.ts
npm run generate:speech-list   # src/content/learning.ts -> audio-tools/speech.json
npm run generate:audio         # speech + sound effects -> assets/audio, src/content/audio-files.ts
npm run generate:brand         # app icon, splash and website logos
```

- **Pictures:** [Noto Emoji](https://github.com/googlefonts/noto-emoji) by Google (Apache 2.0), rendered to PNG with resvg. Coloring pages are the same artwork rendered large and traced into clean line art by `scripts/coloring.py` (needs a small Python environment in `.art-venv/`: `python3 -m venv .art-venv && .art-venv/bin/pip install pillow numpy scipy`).
- **Voice:** the open-source [Kokoro](https://github.com/thewh1teagle/kokoro-onnx) text-to-speech model (Apache 2.0), voice `af_heart` at 0.85 speed. Letter sounds are generated from phonemes. The model and its Python venv live in the git-ignored `.tts/` folder (see the Relaxation Station README for setup).
- **Sound effects:** synthesized from tones and noise in `audio-tools/generate_audio.py`.

## Commands

```bash
npx expo start          # dev server (development build)
npm run lint
npm run typecheck
npm test
```

## Website

`docs/` is the GitHub Pages site with the privacy policy and support page that the app and store listings link to.

## License

Code: all rights reserved. Artwork and voice model: Apache License 2.0. Font: SIL Open Font License.
