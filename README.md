# Hailey's Learning Land

A free learning app for young children, with fourteen games, built with Expo (SDK 57) and React Native. It runs on iPhone, iPad and Android, including Amazon Fire tablets. Everything works offline: no accounts, ads, purchases, tracking or saved data.

## Games

- **Magic letters:** trace uppercase and lowercase letters with a finger. The letter is finished only when nearly all of it is painted and the finger lifts; then it "comes alive" with a picture, its name and its sound.
- **Word detective:** find the spoken sight word (Dolch pre-primer, then primer words), read a word and pick its picture, spell 3- to 5-letter words from letter tiles, and find rhymes.
- **Count & collect:** feed animals, find numbers up to 20, fill in missing numbers, compare groups (more or fewer), and add and take away within ten.
- **Art studio:** crayon, marker, glitter, 20 stamps and eraser, 10 colors plus a rainbow, 3 sizes, undo, a magic mirror for symmetrical drawings, and 100 coloring pages in six category tabs (`src/content/coloring.json`).
- **Flip & find:** a memory game that grows from 4 to 10 pairs. Every third board matches big letters to little letters.
- **Story shelf:** 28 picture books from Book Dash (CC BY 4.0). "Read to me" narrates each page and lights up each word. "I'll read" lets children read alone and tap a word to hear it.
- **Sound safari:** pick the picture that starts with a letter's sound, or pick the first letter of a picture.
- **Puzzle world:** pattern puzzles (AB, AAB, ABC and more), a shape sorter, and 4-, 9- and 16-piece jigsaws.
- **Make a friend:** choose a friend and a home, then pick a sticker and tap the picture to place it.
- **Build a story:** pick a hero, a place, a friend to meet and a magical object, and hear a story built from prerecorded sentences.
- **Little chef:** recipes with first, next and last steps. Find the right ingredient on a pantry shelf among other foods, add the number on the recipe card and tap Done (tap the bowl to take one out), stir with a spoon, bake, and sort fruit by color. Amounts and decoys grow with each recipe.
- **Shape quest:** hunt for shapes or colors, drag shapes into an outline to build a house, robot, rocket, castle or car, or make any picture in free-build Create mode.
- **Music maker:** a xylophone that plays the moment a bar is touched (several fingers at once), a band of drum, maracas, clapping hands, bell and guitar played by swiping, copy-a-tune (3 to 8 notes), and sing-along songs.
- **My little pet:** a pocket pet that gets hungry, bored, muddy and sleepy. A thought bubble shows what it wants; drag food (counting out the treats it asks for), a ball, bubbles or a bed onto it and it eats, plays, splashes or naps. Tap it for a cuddle. Five happy moments fill the love meter.

Every instruction is spoken aloud, and the speaker button repeats it. Wrong answers get a gentle wiggle and "Let's try again!", never a buzzer, and after two misses an owl Help button offers a clue (it takes away a wrong choice, or plays the next letter's sound) without giving the answer. Games start at a level pitched for a five-year-old, move up after two first-try answers in a row, and ease off after two misses on one question. The current level shows next to the game's title. Answers respond the moment they're touched, extra taps are ignored while a right answer is celebrated, and leaving a game cancels anything it was about to say.

## How it's built

- **Routes:** Expo Router. `src/app/index.tsx` is the home screen, each game is a file in `src/app/games/`, and `src/app/grown-ups.tsx` holds the parental gate and app information.
- **Content:** `src/content/learning.ts` holds every letter, word, picture list and spoken line. The spoken lines are referred to by id through `say`, so the games and the audio generator always agree.
- **Drawing and tracing:** `@shopify/react-native-skia`. Letter tracing turns the letter in the Fredoka font into a shape and checks how much of it the finger has covered, rather than enforcing stroke order.
- **Audio:** `src/lib/audio.ts` plays one narrator queue (a new instruction replaces the old one) and overlapping sound effects with `expo-audio`.

## Generated assets

All pictures and sounds are generated on a Mac and committed, so the app never downloads anything.

```bash
npm run generate:pictures      # Fluent Emoji 3D -> assets/pics; Noto Emoji -> src/content/coloring-outlines.json + assets/coloring previews
node scripts/import-stories.mjs  # Book Dash books -> assets/stories, src/content/stories.json, src/content/story-files.ts
npm run generate:speech-list   # src/content/learning.ts -> audio-tools/speech.json
npm run generate:audio         # letter sounds + sound effects (Kokoro), then every spoken line (Qwen3-TTS) -> assets/audio, src/content/audio-files.ts
node scripts/import-stories.mjs --durations  # after generating audio: page narration lengths for word highlighting
npm run generate:brand         # app icon, splash and website logos
```

- **Pictures:** [Fluent Emoji](https://github.com/microsoft/fluentui-emoji) 3D artwork by Microsoft (MIT). The generator fetches only the images it needs with a sparse git clone. Coloring pages come from [Noto Emoji](https://github.com/googlefonts/noto-emoji) by Google (Apache 2.0), whose flat artwork is rendered large, split into color areas and traced into smooth vector outlines by `scripts/coloring.py` (needs a small Python environment in `.art-venv/`: `python3 -m venv .art-venv && .art-venv/bin/pip install pillow numpy scipy potracer`). Art Studio draws the outlines with Skia, so they stay sharp at any size. potracer (GPL) runs only at build time.
- **Voice:** the narrator is [Qwen3-TTS](https://github.com/QwenLM/Qwen3-TTS) (Apache 2.0). A warm, slow voice for young children was designed once with the 1.7B VoiceDesign model and saved as `audio-tools/narrator-reference.wav`; `audio-tools/generate_speech_qwen.py` clones it for every line with the 0.6B Base model, so all lines share one voice. It needs a Python venv in the git-ignored `.tts2/venv-qwen` (`python3 -m venv .tts2/venv-qwen && .tts2/venv-qwen/bin/pip install qwen-tts soundfile`); the models download once into the Hugging Face cache. `npm run check:speech` transcribes every line with Whisper and lists any that came out wrong; speak those again with `generate_speech_qwen.py --retry 1`. Letter sounds are phonemes, which Qwen can't read, so they still come from the open-source [Kokoro](https://github.com/thewh1teagle/kokoro-onnx) model (Apache 2.0) in `.tts/` (see the Relaxation Station README for setup).
- **Sound effects:** interface sounds and celebration jingles from [Kenney](https://kenney.nl) (CC0), downloaded once into `.cache/kenney/`. Instruments and the gentle "try again" sound are synthesized in `audio-tools/generate_audio.py`.
- **Picture books:** [Book Dash](https://bookdash.org) books from [github.com/bookdash/bookdash-books](https://github.com/bookdash/bookdash-books), CC BY 4.0. Each book's creators are credited at the end of the book and on the grown-ups screen. Pictures are resized with `sips`; narration is generated with the app's voice.

## Commands

```bash
npx expo start          # dev server (development build)
npm run lint
npm run typecheck
npm test
```

## Releasing to TestFlight

Builds are made in the cloud with EAS (`eas.json`). The `production` profile increments the iOS build number on each build, tracked by EAS.

First time only:

```bash
npx eas-cli@latest init                      # links the project to your Expo account (adds extra.eas.projectId to app.json)
npx eas-cli@latest build:version:set -p ios  # only if builds were uploaded before: enter the last build number
```

Each release:

```bash
npx eas-cli@latest build --platform ios --profile production --auto-submit
```

EAS asks for your Apple ID the first time and manages the signing certificates. If the app doesn't exist in App Store Connect yet, create it with bundle ID `com.pdavies.haileyslearningland`. Then paste the "What to Test" text from `store/app-store/metadata.md`.

Store listing text, privacy answers and screenshots (6.9-inch iPhone and 13-inch iPad) are in `store/app-store/`. Retake the screenshots after visible design changes.

## Website

`docs/` is the GitHub Pages site with the privacy policy and support page that the app and store listings link to.

## License

Code: all rights reserved. Pictures: MIT (Fluent Emoji). Coloring pages and voice models: Apache License 2.0. Sound effects: CC0 (Kenney). Picture books: CC BY 4.0 (Book Dash and each book's creators). Font: SIL Open Font License.
