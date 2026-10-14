/**
 * Everything the games teach, and every line the narrator speaks.
 *
 * Keep this file free of React Native imports: `scripts/build-speech-list.mjs` imports it with
 * plain Node to list the lines for the audio generator.
 *
 * Spoken lines are referred to by id. `say` builds the ids, so games and the generator always
 * agree on them.
 */

// ---------------------------------------------------------------------------
// Letters
// ---------------------------------------------------------------------------

export type Letter = {
  upper: string;
  lower: string;
  /** A picture for "A is for apple". */
  word: string;
  /** IPA for the letter's sound, read by the voice model as phonemes. */
  sound: string;
};

export const LETTERS: Letter[] = [
  { upper: 'A', lower: 'a', word: 'apple', sound: 'æ' },
  { upper: 'B', lower: 'b', word: 'butterfly', sound: 'bə' },
  { upper: 'C', lower: 'c', word: 'cat', sound: 'kə' },
  { upper: 'D', lower: 'd', word: 'dog', sound: 'də' },
  { upper: 'E', lower: 'e', word: 'egg', sound: 'ɛ' },
  { upper: 'F', lower: 'f', word: 'fish', sound: 'fff' },
  { upper: 'G', lower: 'g', word: 'goat', sound: 'ɡə' },
  { upper: 'H', lower: 'h', word: 'horse', sound: 'hə' },
  { upper: 'I', lower: 'i', word: 'ice cream', sound: 'ɪ' },
  { upper: 'J', lower: 'j', word: 'jellyfish', sound: 'ʤə' },
  { upper: 'K', lower: 'k', word: 'koala', sound: 'kə' },
  { upper: 'L', lower: 'l', word: 'lion', sound: 'lll' },
  { upper: 'M', lower: 'm', word: 'monkey', sound: 'mmm' },
  { upper: 'N', lower: 'n', word: 'nest', sound: 'nnn' },
  { upper: 'O', lower: 'o', word: 'octopus', sound: 'ɑ' },
  { upper: 'P', lower: 'p', word: 'pig', sound: 'pə' },
  { upper: 'Q', lower: 'q', word: 'queen', sound: 'kwə' },
  { upper: 'R', lower: 'r', word: 'rabbit', sound: 'ɹɹɹ' },
  { upper: 'S', lower: 's', word: 'snail', sound: 'sss' },
  { upper: 'T', lower: 't', word: 'turtle', sound: 'tə' },
  { upper: 'U', lower: 'u', word: 'umbrella', sound: 'ʌ' },
  { upper: 'V', lower: 'v', word: 'volcano', sound: 'vvv' },
  { upper: 'W', lower: 'w', word: 'whale', sound: 'wə' },
  { upper: 'X', lower: 'x', word: 'fox', sound: 'ks' },
  { upper: 'Y', lower: 'y', word: 'yo-yo', sound: 'jə' },
  { upper: 'Z', lower: 'z', word: 'zebra', sound: 'zzz' },
];

/** Pictures for Letter Sound Safari, by the letter sound they start with. */
export const SOUND_PICTURES: Record<string, string[]> = {
  a: ['apple', 'ant', 'alligator'],
  b: ['bee', 'banana', 'bear', 'butterfly'],
  c: ['cat', 'car', 'cake', 'cow'],
  d: ['dog', 'duck', 'drum', 'dinosaur'],
  e: ['egg', 'elephant'],
  f: ['fish', 'frog', 'fox', 'flower'],
  g: ['goat', 'grapes', 'gift'],
  h: ['hat', 'horse', 'house', 'heart'],
  j: ['jellyfish', 'juice'],
  k: ['kite', 'koala', 'key'],
  l: ['lion', 'leaf', 'lemon', 'ladybug'],
  m: ['moon', 'monkey', 'mouse', 'mushroom'],
  n: ['nest'],
  o: ['octopus', 'otter'],
  p: ['pig', 'pizza', 'penguin', 'panda'],
  r: ['rabbit', 'rainbow', 'rocket', 'rose'],
  s: ['sun', 'snail', 'star', 'seal'],
  t: ['turtle', 'tiger', 'tree'],
  u: ['umbrella'],
  v: ['volcano', 'violin', 'van'],
  w: ['whale', 'watermelon', 'worm'],
  z: ['zebra'],
};

export const SAFARI_LETTERS = Object.keys(SOUND_PICTURES);

// ---------------------------------------------------------------------------
// Sight words (Dolch pre-primer, then primer)
// ---------------------------------------------------------------------------

export const SIGHT_WORDS_EASY = [
  'a', 'and', 'away', 'big', 'blue', 'can', 'come', 'down', 'find', 'for', 'funny', 'go', 'help', 'here',
  'I', 'in', 'is', 'it', 'jump', 'little', 'look', 'make', 'me', 'my', 'not', 'one', 'play', 'red', 'run',
  'said', 'see', 'the', 'three', 'to', 'two', 'up', 'we', 'where', 'yellow', 'you',
];

export const SIGHT_WORDS_MORE = [
  'all', 'am', 'are', 'at', 'ate', 'be', 'black', 'brown', 'but', 'came', 'did', 'do', 'eat', 'four', 'get',
  'good', 'have', 'he', 'into', 'like', 'must', 'new', 'no', 'now', 'on', 'our', 'out', 'please', 'pretty',
  'ran', 'ride', 'saw', 'say', 'she', 'so', 'soon', 'that', 'there', 'they', 'this', 'too', 'under', 'want',
  'was', 'well', 'went', 'what', 'white', 'who', 'will', 'with', 'yes',
];

export const SIGHT_WORDS = [...SIGHT_WORDS_EASY, ...SIGHT_WORDS_MORE];

// ---------------------------------------------------------------------------
// Numbers
// ---------------------------------------------------------------------------

export const NUMBER_WORDS = [
  'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
  'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty',
];

export type Mission = { animal: string; animalName: string; food: string; foodOne: string; foodMany: string };

/** Count & Collect: feed an animal the right number of treats. */
export const MISSIONS: Mission[] = [
  { animal: 'bunny', animalName: 'bunny', food: 'carrot', foodOne: 'carrot', foodMany: 'carrots' },
  { animal: 'monkey', animalName: 'monkey', food: 'banana', foodOne: 'banana', foodMany: 'bananas' },
  { animal: 'mouse', animalName: 'mouse', food: 'cheese', foodOne: 'piece of cheese', foodMany: 'pieces of cheese' },
  { animal: 'puppy', animalName: 'puppy', food: 'bone', foodOne: 'bone', foodMany: 'bones' },
  { animal: 'squirrel', animalName: 'squirrel', food: 'nut', foodOne: 'nut', foodMany: 'nuts' },
  { animal: 'unicorn', animalName: 'unicorn', food: 'star', foodOne: 'star', foodMany: 'stars' },
  { animal: 'bear', animalName: 'bear', food: 'fish', foodOne: 'fish', foodMany: 'fish' },
  { animal: 'panda', animalName: 'panda', food: 'strawberry', foodOne: 'strawberry', foodMany: 'strawberries' },
];

/** Addition facts for Count & Collect, with sums up to ten. */
export const ADDITION: [number, number][] = [];
for (let a = 1; a <= 9; a++) for (let b = 1; a + b <= 10; b++) ADDITION.push([a, b]);

// ---------------------------------------------------------------------------
// Memory, puzzles and dress-up
// ---------------------------------------------------------------------------

export const MEMORY_SETS: { name: string; pictures: string[] }[] = [
  { name: 'animals', pictures: ['cat', 'dog', 'pig', 'cow', 'frog', 'lion', 'rabbit', 'panda'] },
  { name: 'magic', pictures: ['unicorn', 'crown', 'rainbow', 'star', 'castle', 'fairy', 'gem', 'wand'] },
  { name: 'treats', pictures: ['apple', 'strawberry', 'cupcake', 'ice cream', 'cookie', 'grapes', 'cherries', 'lollipop'] },
  { name: 'garden', pictures: ['butterfly', 'ladybug', 'flower', 'snail', 'bee', 'mushroom', 'sunflower', 'leaf'] },
];

export const SHAPES = ['circle', 'square', 'triangle', 'star', 'heart', 'diamond'] as const;
export type ShapeName = (typeof SHAPES)[number];

export const COLORS: { name: string; hex: string }[] = [
  { name: 'red', hex: '#F2545B' },
  { name: 'orange', hex: '#FF9F43' },
  { name: 'yellow', hex: '#FFD23F' },
  { name: 'green', hex: '#3CC47C' },
  { name: 'blue', hex: '#4D9DE0' },
  { name: 'purple', hex: '#9B6DE3' },
  { name: 'pink', hex: '#FF7EB6' },
];

/** Jigsaw pictures for Little Puzzle World. */
export const JIGSAW_PICTURES = ['unicorn', 'castle', 'butterfly', 'rainbow', 'lion', 'princess', 'rocket', 'turtle'];

export const FRIENDS = ['princess', 'unicorn', 'kitten', 'puppy', 'dragon', 'fairy', 'bunny', 'teddy bear'];
export const STICKERS = [
  'crown', 'bow', 'glasses', 'hat', 'flower', 'star', 'butterfly', 'heart', 'rainbow', 'balloon', 'wand', 'sparkles',
  'gem', 'lollipop',
];
export const PLACES = [
  { id: 'castle', name: 'castle', colors: ['#F8D7F0', '#C9B8FF'], decor: ['castle', 'sparkles', 'rainbow'] },
  { id: 'garden', name: 'garden', colors: ['#C8F2FF', '#B8F0C0'], decor: ['sunflower', 'tree', 'butterfly'] },
  { id: 'beach', name: 'beach', colors: ['#AEE3FF', '#FFE6A8'], decor: ['sun', 'shell', 'dolphin'] },
  { id: 'night', name: 'night sky', colors: ['#2E2A6B', '#6D5BC9'], decor: ['moon', 'star', 'cloud'] },
  { id: 'snow', name: 'snowy land', colors: ['#E3F1FF', '#FFFFFF'], decor: ['snowflake', 'tree', 'penguin'] },
];

// ---------------------------------------------------------------------------
// Games
// ---------------------------------------------------------------------------

export const GAMES = [
  { id: 'letters', title: 'Magic Letters', picture: 'butterfly', color: '#FF7EB6' },
  { id: 'sight-words', title: 'Word Detective', picture: 'magnifier', color: '#4D9DE0' },
  { id: 'counting', title: 'Count & Collect', picture: 'strawberry', color: '#FF9F43' },
  { id: 'art', title: 'Art Studio', picture: 'paint', color: '#9B6DE3' },
  { id: 'memory', title: 'Flip & Find', picture: 'cat', color: '#3CC47C' },
  { id: 'sounds', title: 'Sound Safari', picture: 'lion', color: '#FFB627' },
  { id: 'puzzles', title: 'Puzzle World', picture: 'puzzle', color: '#2EC4B6' },
  { id: 'friends', title: 'Make a Friend', picture: 'unicorn', color: '#F25F8B' },
] as const;
export type GameId = (typeof GAMES)[number]['id'];

// ---------------------------------------------------------------------------
// Spoken lines
// ---------------------------------------------------------------------------

const idOf = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/** Builds the id for each spoken line. Games call these; the generator lists them all. */
export const say = {
  line: (key: keyof typeof LINES) => `line-${key}`,
  game: (id: GameId) => `game-${id}`,
  letterName: (l: Letter) => `letter-${l.lower}`,
  letterSound: (l: Letter) => `sound-${l.lower}`,
  letterIsFor: (l: Letter) => `isfor-${l.lower}`,
  traceUpper: (l: Letter) => `trace-upper-${l.lower}`,
  traceLower: (l: Letter) => `trace-lower-${l.lower}`,
  safariFind: (letter: string) => `safari-find-${letter}`,
  startsWith: (picture: string, letter: string) => `starts-${idOf(picture)}-${letter}`,
  picture: (picture: string) => `pic-${idOf(picture)}`,
  word: (word: string) => `word-${idOf(word)}`,
  findWord: (word: string) => `find-word-${idOf(word)}`,
  number: (n: number) => `num-${n}`,
  findNumber: (n: number) => `find-num-${n}`,
  mission: (m: Mission, n: number) => `mission-${m.animal}-${n}`,
  addition: (a: number, b: number) => `add-${a}-${b}`,
  shapeHome: (color: string, shape: ShapeName) => `home-${color}-${shape}`,
  findShape: (shape: ShapeName) => `find-shape-${shape}`,
  findColor: (color: string) => `find-color-${color}`,
  shape: (shape: ShapeName) => `shape-${shape}`,
  color: (color: string) => `color-${color}`,
  place: (id: string) => `place-${id}`,
};

/** Fixed lines: instructions, encouragement and celebrations. */
export const LINES = {
  welcome: "Hi Hailey! Welcome to your Learning Land. What would you like to play?",
  great: 'Great job!',
  youDidIt: 'You did it!',
  wonderful: 'Wonderful!',
  amazing: 'Amazing!',
  sparkly: 'Sparkly!',
  superStar: "You're a super star!",
  yay: 'Yay!',
  tryAgain: "Let's try again!",
  almost: 'Almost! Try another one.',
  together: "Let's try together.",
  oops: 'Oops! That one is not it.',
  allDone: 'All done! You earned a star!',
  traceIntro: 'Use your finger to trace the letter.',
  traceKeepGoing: 'Keep going! Fill in the whole letter.',
  detectiveIntro: "Hi, I'm Detective Fox! Help me find the hidden words.",
  countIntro: "Let's count! Tap the treats to feed our hungry friend.",
  countTooMany: "Oops, that's enough! Let's count them again.",
  howMany: 'How many altogether?',
  artIntro: 'Welcome to the art studio! Pick a color and start drawing.',
  artColoring: 'Pick a picture to color.',
  artBlank: 'A fresh new page!',
  memoryIntro: 'Flip two cards. Can you find the ones that match?',
  memoryMatch: "It's a match!",
  memoryNope: 'Not a match. Remember where they are!',
  safariIntro: "Welcome to Sound Safari! Let's listen for sounds.",
  puzzleIntro: "Welcome to Puzzle World! Let's solve some puzzles.",
  shapeIntro: 'Drag each shape to its home.',
  jigsawIntro: 'Drag the pieces to finish the picture.',
  questDone: 'You found them all!',
  friendIntro: 'Make a new friend! Pick a friend to dress up.',
  pickPlace: 'Where does your friend live? Pick a place.',
  addStickers: 'Now add some sparkle! Drag stickers onto the picture.',
  grownUps: 'This part is for grown-ups.',
  nextLetter: "Let's try the next letter!",
  newWord: "Here's a new word.",
  levelUp: "You're getting so good at this! Let's make it a little harder.",
};

/** Every spoken line, as id -> text. Lines starting with "/" are phonemes, not words. */
export function spokenLines(): Record<string, string> {
  const lines: Record<string, string> = {};
  for (const [key, text] of Object.entries(LINES)) lines[say.line(key as keyof typeof LINES)] = text;
  for (const game of GAMES) lines[say.game(game.id)] = game.title.replace('&', 'and');

  for (const l of LETTERS) {
    lines[say.letterName(l)] = `${l.upper}.`;
    lines[say.letterSound(l)] = `/${l.sound}`;
    lines[say.letterIsFor(l)] = l.upper === 'X' ? `X is in ${l.word}!` : `${l.upper} is for ${l.word}!`;
    lines[say.traceUpper(l)] = `Let's trace a big ${l.upper}.`;
    lines[say.traceLower(l)] = `Now let's trace a little ${l.lower}.`;
  }
  for (const [letter, pictures] of Object.entries(SOUND_PICTURES)) {
    const upper = letter.toUpperCase();
    lines[say.safariFind(letter)] = `Which one starts with the letter ${upper}?`;
    for (const picture of pictures) lines[say.startsWith(picture, letter)] = `${capitalize(picture)} starts with ${upper}!`;
  }
  const pictureNames = new Set<string>([
    ...Object.values(SOUND_PICTURES).flat(),
    ...MEMORY_SETS.flatMap((s) => s.pictures),
    ...JIGSAW_PICTURES,
    ...FRIENDS,
    ...LETTERS.map((l) => l.word),
  ]);
  for (const picture of pictureNames) lines[say.picture(picture)] = capitalize(picture === 'queen' ? 'queen' : picture);

  for (const word of SIGHT_WORDS) {
    lines[say.word(word)] = word === 'I' ? 'I.' : `${word}.`;
    lines[say.findWord(word)] = `Can you find the word, ${word}?`;
  }
  for (let n = 0; n <= 20; n++) {
    lines[say.number(n)] = `${capitalize(NUMBER_WORDS[n])}!`;
    lines[say.findNumber(n)] = `Can you find the number ${NUMBER_WORDS[n]}?`;
  }
  for (const m of MISSIONS) {
    for (let n = 1; n <= 10; n++) {
      lines[say.mission(m, n)] = `Give the ${m.animalName} ${NUMBER_WORDS[n]} ${n === 1 ? m.foodOne : m.foodMany}.`;
    }
  }
  for (const [a, b] of ADDITION) lines[say.addition(a, b)] = `${capitalize(NUMBER_WORDS[a])} plus ${NUMBER_WORDS[b]}. How many altogether?`;
  for (const shape of SHAPES) {
    lines[say.shape(shape)] = capitalize(shape);
    lines[say.findShape(shape)] = `Find all the ${shape}s!`;
    for (const color of COLORS) lines[say.shapeHome(color.name, shape)] = `Put the ${color.name} ${shape} in its home.`;
  }
  for (const color of COLORS) {
    lines[say.color(color.name)] = capitalize(color.name);
    lines[say.findColor(color.name)] = `Find everything that is ${color.name}!`;
  }
  for (const place of PLACES) lines[say.place(place.id)] = `The ${place.name}!`;
  return lines;
}

function capitalize(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
