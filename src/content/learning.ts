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

/** Numbers and short sight words to trace in Magic letters. */
export const TRACE_NUMBERS = Array.from({ length: 20 }, (_, i) => i + 1);
export const TRACE_WORDS = SIGHT_WORDS.filter((w) => w.length >= 2 && w.length <= 3);

/** Words to spell from a picture, shortest first. Each has a picture of the same name. */
export const SPELL_WORDS = [
  ['cat', 'dog', 'pig', 'sun', 'hat', 'van', 'fox', 'bus', 'bed', 'web', 'map', 'bat', 'log', 'ant', 'egg', 'cow', 'bee'],
  ['fish', 'frog', 'duck', 'drum', 'crab', 'nest', 'ship', 'milk', 'bell', 'star', 'moon', 'tree', 'kite', 'cake', 'ring', 'corn', 'boat'],
  ['snake', 'sheep', 'spoon', 'zebra', 'tiger', 'apple', 'lemon', 'horse', 'chair', 'snail'],
];

/** Groups of pictures whose names rhyme. */
export const RHYMES = [
  ['cat', 'hat', 'bat'],
  ['dog', 'frog', 'log'],
  ['bee', 'tree', 'key'],
  ['moon', 'spoon'],
  ['star', 'car'],
  ['cake', 'snake'],
  ['mouse', 'house'],
  ['bear', 'pear', 'chair'],
  ['fox', 'socks'],
  ['goat', 'boat'],
];

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
  { animal: 'kitten', animalName: 'kitten', food: 'fish', foodOne: 'fish', foodMany: 'fish' },
  { animal: 'panda', animalName: 'panda', food: 'strawberry', foodOne: 'strawberry', foodMany: 'strawberries' },
];

/** Addition facts for Count & Collect, with sums up to ten. */
export const ADDITION: [number, number][] = [];
for (let a = 1; a <= 9; a++) for (let b = 1; a + b <= 10; b++) ADDITION.push([a, b]);

/** Take-away facts for Count & Collect: start with `a`, take away `b`, from ten down. */
export const SUBTRACTION: [number, number][] = [];
for (let a = 2; a <= 10; a++) for (let b = 1; b < a; b++) SUBTRACTION.push([a, b]);

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

export const FRIENDS = ['princess', 'robot', 'unicorn', 'dinosaur', 'kitten', 'puppy', 'dragon', 'fairy', 'bunny', 'teddy bear'];
export const STICKERS = [
  'crown', 'bow', 'glasses', 'hat', 'flower', 'star', 'butterfly', 'heart', 'rainbow', 'balloon', 'wand', 'sparkles',
  'gem', 'lollipop', 'rocket', 'car', 'ball', 'guitar',
];
export const PLACES = [
  { id: 'castle', name: 'castle', colors: ['#F8D7F0', '#C9B8FF'], decor: ['castle', 'sparkles', 'rainbow'] },
  { id: 'garden', name: 'garden', colors: ['#C8F2FF', '#B8F0C0'], decor: ['sunflower', 'tree', 'butterfly'] },
  { id: 'beach', name: 'beach', colors: ['#AEE3FF', '#FFE6A8'], decor: ['sun', 'shell', 'dolphin'] },
  { id: 'night', name: 'night sky', colors: ['#2E2A6B', '#6D5BC9'], decor: ['moon', 'star', 'cloud'] },
  { id: 'snow', name: 'snowy land', colors: ['#E3F1FF', '#FFFFFF'], decor: ['snowflake', 'tree', 'penguin'] },
];

// ---------------------------------------------------------------------------
// Build-a-Story
// ---------------------------------------------------------------------------

export const STORY_HEROES = [
  { id: 'unicorn', name: 'Sparkle', intro: 'a little unicorn named Sparkle' },
  { id: 'princess', name: 'Princess Lily', intro: 'a kind princess named Lily' },
  { id: 'dragon', name: 'Ember', intro: 'a friendly dragon named Ember' },
  { id: 'kitten', name: 'Whiskers', intro: 'a curious kitten named Whiskers' },
  { id: 'puppy', name: 'Biscuit', intro: 'a playful puppy named Biscuit' },
  { id: 'fairy', name: 'Twinkle', intro: 'a tiny fairy named Twinkle' },
  { id: 'bunny', name: 'Hoppy', intro: 'a fluffy bunny named Hoppy' },
  { id: 'teddy bear', name: 'Teddy', intro: 'a cuddly teddy bear named Teddy' },
  { id: 'robot', name: 'Bolt', intro: 'a helpful robot named Bolt' },
  { id: 'dinosaur', name: 'Rex', intro: 'a gentle dinosaur named Rex' },
];

/** Where a story can happen: matches PLACES, with words for the story. */
export const STORY_PLACES: Record<string, { home: string; short: string }> = {
  castle: { home: 'a sparkly castle on top of a hill', short: 'castle' },
  garden: { home: 'a garden full of flowers', short: 'garden' },
  beach: { home: 'a little house by the sunny beach', short: 'beach' },
  night: { home: 'a cozy cloud, high up in the night sky', short: 'sky' },
  snow: { home: 'a snowy land where snowflakes danced', short: 'snowy land' },
};

/** Who the hero meets along the way. */
export const STORY_FRIENDS = ['owl', 'turtle', 'penguin', 'fox', 'hedgehog', 'frog'];

export const STORY_OBJECTS = [
  { id: 'wand', name: 'magic wand', event: 'With one wave of the magic wand, the whole {place} filled with rainbows!' },
  { id: 'gem', name: 'shiny gem', event: 'The shiny gem sparkled so brightly that everyone in the {place} came to see.' },
  { id: 'balloon', name: 'red balloon', event: 'Holding the red balloon, our friend floated up, up, up, high over the {place}.' },
  { id: 'cupcake', name: 'giant cupcake', event: 'The giant cupcake was big enough to share with every friend in the {place}.' },
  { id: 'kite', name: 'rainbow kite', event: 'The rainbow kite flew high above the {place}, dancing with the wind.' },
  { id: 'crown', name: 'golden crown', event: 'With the golden crown, our friend threw the biggest party the {place} had ever seen!' },
];

// ---------------------------------------------------------------------------
// Little Chef
// ---------------------------------------------------------------------------

export type ChefStep =
  | { kind: 'add'; item: string; one: string; many: string }
  | { kind: 'stir' }
  | { kind: 'bake' }
  | { kind: 'sort' };

export const RECIPES: { id: string; name: string; result: string; steps: ChefStep[] }[] = [
  {
    id: 'fruit-salad',
    name: 'fruit salad',
    result: 'salad',
    steps: [
      { kind: 'add', item: 'apple', one: 'apple', many: 'apples' },
      { kind: 'add', item: 'banana', one: 'banana', many: 'bananas' },
      { kind: 'stir' },
    ],
  },
  {
    id: 'pizza',
    name: 'pizza',
    result: 'pizza',
    steps: [
      { kind: 'add', item: 'tomato', one: 'tomato', many: 'tomatoes' },
      { kind: 'add', item: 'mushroom', one: 'mushroom', many: 'mushrooms' },
      { kind: 'bake' },
    ],
  },
  {
    id: 'smoothie',
    name: 'smoothie',
    result: 'smoothie',
    steps: [{ kind: 'sort' }, { kind: 'add', item: 'strawberry', one: 'strawberry', many: 'strawberries' }, { kind: 'stir' }],
  },
  {
    id: 'pancakes',
    name: 'pancakes',
    result: 'pancakes',
    steps: [
      { kind: 'add', item: 'egg', one: 'egg', many: 'eggs' },
      { kind: 'stir' },
      { kind: 'add', item: 'blueberries', one: 'blueberry', many: 'blueberries' },
    ],
  },
  {
    id: 'cake',
    name: 'birthday cake',
    result: 'cake',
    steps: [
      { kind: 'add', item: 'egg', one: 'egg', many: 'eggs' },
      { kind: 'add', item: 'cherries', one: 'cherry', many: 'cherries' },
      { kind: 'bake' },
    ],
  },
];

/** Everything on the pantry shelf. The right ingredient sits among a few of these. */
export const PANTRY = [
  'apple', 'banana', 'tomato', 'mushroom', 'strawberry', 'egg', 'blueberries', 'cherries', 'carrot', 'lemon', 'pear',
  'corn', 'cheese', 'grapes', 'orange',
];

/** How many of an ingredient a recipe can ask for. */
export const CHEF_MIN = 2;
export const CHEF_MAX = 9;

/** Fruit for the sorting step, by color. */
export const SORT_FRUIT: Record<string, string[]> = {
  red: ['apple', 'strawberry', 'cherries'],
  yellow: ['banana', 'lemon', 'corn'],
  green: ['green apple', 'pear', 'kiwi'],
  orange: ['orange', 'carrot', 'peach'],
};

const ORDER_WORDS = ['First', 'Next', 'Last'];

// ---------------------------------------------------------------------------
// Color & Shape Quest
// ---------------------------------------------------------------------------

export type BuildShape = ShapeName | 'rectangle';
/** One piece of a build. Position and size are fractions of the build area. */
export type BuildPiece = { shape: BuildShape; color: string; x: number; y: number; w: number; h: number };

export const BUILDS: { id: string; name: string; pieces: BuildPiece[] }[] = [
  {
    id: 'house',
    name: 'house',
    pieces: [
      { shape: 'square', color: 'blue', x: 0.5, y: 0.62, w: 0.46, h: 0.42 },
      { shape: 'triangle', color: 'red', x: 0.5, y: 0.3, w: 0.6, h: 0.3 },
      { shape: 'rectangle', color: 'orange', x: 0.5, y: 0.73, w: 0.12, h: 0.2 },
      { shape: 'circle', color: 'yellow', x: 0.36, y: 0.55, w: 0.11, h: 0.11 },
      { shape: 'circle', color: 'yellow', x: 0.64, y: 0.55, w: 0.11, h: 0.11 },
    ],
  },
  {
    id: 'robot',
    name: 'robot',
    pieces: [
      { shape: 'square', color: 'purple', x: 0.5, y: 0.24, w: 0.3, h: 0.24 },
      { shape: 'rectangle', color: 'blue', x: 0.5, y: 0.6, w: 0.4, h: 0.42 },
      { shape: 'circle', color: 'yellow', x: 0.43, y: 0.22, w: 0.08, h: 0.08 },
      { shape: 'circle', color: 'yellow', x: 0.57, y: 0.22, w: 0.08, h: 0.08 },
      { shape: 'heart', color: 'red', x: 0.5, y: 0.56, w: 0.14, h: 0.14 },
      { shape: 'rectangle', color: 'green', x: 0.22, y: 0.58, w: 0.1, h: 0.3 },
      { shape: 'rectangle', color: 'green', x: 0.78, y: 0.58, w: 0.1, h: 0.3 },
    ],
  },
  {
    id: 'rocket',
    name: 'rocket',
    pieces: [
      { shape: 'rectangle', color: 'blue', x: 0.5, y: 0.56, w: 0.24, h: 0.44 },
      { shape: 'triangle', color: 'red', x: 0.5, y: 0.24, w: 0.24, h: 0.2 },
      { shape: 'circle', color: 'yellow', x: 0.5, y: 0.46, w: 0.12, h: 0.12 },
      { shape: 'triangle', color: 'orange', x: 0.33, y: 0.76, w: 0.14, h: 0.16 },
      { shape: 'triangle', color: 'orange', x: 0.67, y: 0.76, w: 0.14, h: 0.16 },
      { shape: 'star', color: 'pink', x: 0.5, y: 0.66, w: 0.1, h: 0.1 },
    ],
  },
  {
    id: 'castle',
    name: 'castle',
    pieces: [
      { shape: 'square', color: 'purple', x: 0.5, y: 0.66, w: 0.44, h: 0.4 },
      { shape: 'rectangle', color: 'blue', x: 0.22, y: 0.6, w: 0.14, h: 0.52 },
      { shape: 'rectangle', color: 'blue', x: 0.78, y: 0.6, w: 0.14, h: 0.52 },
      { shape: 'triangle', color: 'pink', x: 0.22, y: 0.25, w: 0.2, h: 0.18 },
      { shape: 'triangle', color: 'pink', x: 0.78, y: 0.25, w: 0.2, h: 0.18 },
      { shape: 'rectangle', color: 'orange', x: 0.5, y: 0.76, w: 0.14, h: 0.2 },
      { shape: 'heart', color: 'red', x: 0.5, y: 0.56, w: 0.12, h: 0.12 },
      { shape: 'star', color: 'yellow', x: 0.5, y: 0.34, w: 0.14, h: 0.14 },
    ],
  },
  {
    id: 'car',
    name: 'car',
    pieces: [
      { shape: 'rectangle', color: 'red', x: 0.5, y: 0.58, w: 0.76, h: 0.22 },
      { shape: 'rectangle', color: 'orange', x: 0.5, y: 0.4, w: 0.42, h: 0.16 },
      { shape: 'square', color: 'blue', x: 0.4, y: 0.41, w: 0.12, h: 0.1 },
      { shape: 'square', color: 'blue', x: 0.6, y: 0.41, w: 0.12, h: 0.1 },
      { shape: 'circle', color: 'purple', x: 0.28, y: 0.72, w: 0.18, h: 0.18 },
      { shape: 'circle', color: 'purple', x: 0.72, y: 0.72, w: 0.18, h: 0.18 },
      { shape: 'circle', color: 'yellow', x: 0.84, y: 0.55, w: 0.07, h: 0.07 },
    ],
  },
];

// ---------------------------------------------------------------------------
// Music Maker
// ---------------------------------------------------------------------------

/** Xylophone bars, C major, low to high. Each has a sound effect `xylo-N`. */
export const XYLOPHONE = [
  { note: 'C', color: '#F2545B' },
  { note: 'D', color: '#FF9F43' },
  { note: 'E', color: '#FFD23F' },
  { note: 'F', color: '#3CC47C' },
  { note: 'G', color: '#2EC4B6' },
  { note: 'A', color: '#4D9DE0' },
  { note: 'B', color: '#9B6DE3' },
  { note: 'C', color: '#FF7EB6' },
];

/**
 * Songs to play on the xylophone, one line at a time. Each note is a bar (0 to 7, C up to the next
 * C) and the syllable sung on it. Easiest first.
 */
export type Song = { id: string; title: string; picture: string; lines: [number, string][][] };
const TWINKLE_A: [number, string][] = [[0, 'Twin'], [0, 'kle'], [4, 'twin'], [4, 'kle'], [5, 'lit'], [5, 'tle'], [4, 'star']];
const TWINKLE_B: [number, string][] = [[3, 'How'], [3, 'I'], [2, 'won'], [2, 'der'], [1, 'what'], [1, 'you'], [0, 'are']];
export const SONGS: Song[] = [
  {
    id: 'buns',
    title: 'Hot Cross Buns',
    picture: 'cupcake',
    lines: [
      [[2, 'Hot'], [1, 'cross'], [0, 'buns']],
      [[2, 'Hot'], [1, 'cross'], [0, 'buns']],
      [[0, 'One'], [0, 'a'], [0, 'pen'], [0, 'ny'], [1, 'two'], [1, 'a'], [1, 'pen'], [1, 'ny']],
      [[2, 'Hot'], [1, 'cross'], [0, 'buns']],
    ],
  },
  {
    id: 'mary',
    title: 'Mary Had a Little Lamb',
    picture: 'sheep',
    lines: [
      [[2, 'Ma'], [1, 'ry'], [0, 'had'], [1, 'a'], [2, 'lit'], [2, 'tle'], [2, 'lamb']],
      [[1, 'lit'], [1, 'tle'], [1, 'lamb'], [2, 'lit'], [4, 'tle'], [4, 'lamb']],
      [[2, 'Ma'], [1, 'ry'], [0, 'had'], [1, 'a'], [2, 'lit'], [2, 'tle'], [2, 'lamb'], [2, 'its']],
      [[1, 'fleece'], [1, 'was'], [2, 'white'], [1, 'as'], [0, 'snow']],
    ],
  },
  {
    id: 'twinkle',
    title: 'Twinkle, Twinkle, Little Star',
    picture: 'star',
    lines: [
      TWINKLE_A,
      TWINKLE_B,
      [[4, 'Up'], [4, 'a'], [3, 'bove'], [3, 'the'], [2, 'world'], [2, 'so'], [1, 'high']],
      [[4, 'Like'], [4, 'a'], [3, 'dia'], [3, 'mond'], [2, 'in'], [2, 'the'], [1, 'sky']],
      TWINKLE_A,
      TWINKLE_B,
    ],
  },
  {
    id: 'row',
    title: 'Row, Row, Row Your Boat',
    picture: 'boat',
    lines: [
      [[0, 'Row'], [0, 'row'], [0, 'row'], [1, 'your'], [2, 'boat']],
      [[2, 'Gent'], [1, 'ly'], [2, 'down'], [3, 'the'], [4, 'stream']],
      [[7, 'Mer'], [7, 'ri'], [7, 'ly'], [4, 'mer'], [4, 'ri'], [4, 'ly'], [2, 'mer'], [2, 'ri'], [2, 'ly'], [0, 'mer'], [0, 'ri'], [0, 'ly']],
      [[4, 'Life'], [3, 'is'], [2, 'but'], [1, 'a'], [0, 'dream']],
    ],
  },
];

// ---------------------------------------------------------------------------
// My Little Pet
// ---------------------------------------------------------------------------

/** Things a pet can say. */
export type PetLine =
  | 'hello' | 'hungry' | 'wantsWalk' | 'wantsPlay' | 'wantsBath' | 'wantsSleep' | 'yum' | 'walked' | 'played' | 'clean' | 'rested' | 'notNow' | 'giggle';

export const PETS = [
  { id: 'puppy', name: 'Puppy', mission: 'puppy' },
  { id: 'kitten', name: 'Kitten', mission: 'kitten' },
  { id: 'unicorn', name: 'Unicorn', mission: 'unicorn' },
  { id: 'bunny', name: 'Bunny', mission: 'bunny' },
];

// ---------------------------------------------------------------------------
// Games
// ---------------------------------------------------------------------------

export const GAME_SECTIONS = [
  { id: 'create', title: 'Create', picture: 'paint', color: '#B85F45' },
  { id: 'read', title: 'Read & spell', picture: 'book', color: '#4F7CA8' },
  { id: 'numbers', title: 'Numbers', picture: 'abacus', color: '#C98E2E' },
  { id: 'think', title: 'Think & solve', picture: 'puzzle', color: '#5E8A4A' },
  { id: 'focus', title: 'Calm & focus', picture: 'balloon', color: '#3F8682' },
  { id: 'tots', title: 'Tiny tots', picture: 'duck', color: '#8A6A9E' },
] as const;

export const GAMES = [
  { id: 'art', title: 'Art studio', picture: 'paint', color: '#8B5CF6', section: 'create', skills: 'Draw, color, mirror' },
  { id: 'story', title: 'Build a story', picture: 'book', color: '#6366F1', section: 'create', skills: 'Imagine and tell' },
  { id: 'friends', title: 'Make a friend', picture: 'teddy bear', color: '#F43F8E', section: 'create', skills: 'Dress up and decorate' },
  { id: 'music', title: 'Music maker', picture: 'piano', color: '#EC4899', section: 'create', skills: 'Play and remember tunes' },
  { id: 'letters', title: 'Magic letters', picture: 'butterfly', color: '#FF5FA2', section: 'read', skills: 'Trace letters' },
  { id: 'sight-words', title: 'Word detective', picture: 'magnifier', color: '#3B8EF0', section: 'read', skills: 'Read, spell, rhyme' },
  { id: 'sounds', title: 'Sound safari', picture: 'lion', color: '#F59E0B', section: 'read', skills: 'Letter sounds' },
  { id: 'books', title: 'Story shelf', picture: 'books', color: '#0D9488', section: 'read', skills: 'Read picture books' },
  { id: 'counting', title: 'Count & collect', picture: 'strawberry', color: '#FF8A3D', section: 'numbers', skills: 'Count, add, take away' },
  { id: 'chef', title: 'Little chef', picture: 'chef', color: '#F97316', section: 'numbers', skills: 'Count and follow steps' },
  { id: 'puzzles', title: 'Puzzle world', picture: 'puzzle', color: '#14B8A6', section: 'think', skills: 'Jigsaws and patterns' },
  { id: 'memory', title: 'Flip & find', picture: 'cat', color: '#22C17A', section: 'think', skills: 'Memory and matching' },
  { id: 'quest', title: 'Shape quest', picture: 'blue diamond', color: '#0EA5E9', section: 'think', skills: 'Shapes and building' },
  { id: 'follow', title: 'Follow me', picture: 'robot', color: '#3B82F6', section: 'think', skills: 'Watch, remember, repeat' },
  { id: 'redlight', title: 'Red light, green light', picture: 'stoplight', color: '#EF4444', section: 'focus', skills: 'Stop and go' },
  { id: 'breathe', title: 'Breathe with me', picture: 'balloon', color: '#60A5FA', section: 'focus', skills: 'Slow, calm breaths' },
  { id: 'snail', title: 'Snail trail', picture: 'snail', color: '#65A30D', section: 'focus', skills: 'Slow and steady' },
  { id: 'ispy', title: 'I spy', picture: 'ladybug', color: '#F59E0B', section: 'focus', skills: 'Look closely' },
  { id: 'tots', title: 'Tiny tots', picture: 'duck', color: '#FB923C', section: 'tots', skills: 'Colors and counting' },
  { id: 'balance', title: 'Frog balance', picture: 'frog', color: '#22C55E', section: 'focus', skills: 'Balance the board' },
  { id: 'pop', title: 'Bubble wrap', picture: 'bubbles', color: '#38BDF8', section: 'focus', skills: 'Pop and relax' },
  { id: 'catch', title: 'Catch', picture: 'basket', color: '#F97316', section: 'focus', skills: 'Watch and catch' },
  { id: 'pet', title: 'My little pet', picture: 'puppy', color: '#4CAF50', section: 'think', skills: 'Care and share' },
] as const;
export type GameId = (typeof GAMES)[number]['id'];
export type SectionId = (typeof GAME_SECTIONS)[number]['id'];

/** What I spy asks her to find, a different one each round. */
export const SPY_TARGETS = [
  { name: 'star', plural: 'stars' },
  { name: 'heart', plural: 'hearts' },
  { name: 'ladybug', plural: 'ladybugs' },
  { name: 'strawberry', plural: 'strawberries' },
  { name: 'fish', plural: 'fish' },
];

// ---------------------------------------------------------------------------
// Spoken lines
// ---------------------------------------------------------------------------

const idOf = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/** Builds the id for each spoken line. Games call these; the generator lists them all. */
export const say = {
  line: (key: keyof typeof LINES) => `line-${key}`,
  game: (id: GameId) => `game-${id}`,
  section: (id: SectionId) => `section-${id}`,
  song: (id: string) => `song-${id}`,
  spy: (name: string) => `spy-${name}`,
  letterName: (l: Letter) => `letter-${l.lower}`,
  letterIsFor: (l: Letter) => `isfor-${l.lower}`,
  traceUpper: (l: Letter) => `trace-upper-${l.lower}`,
  traceLower: (l: Letter) => `trace-lower-${l.lower}`,
  traceNumber: (n: number) => `trace-num-${n}`,
  traceWord: (word: string) => `trace-word-${idOf(word)}`,
  safariFind: (letter: string) => `safari-find-${letter}`,
  startsWith: (picture: string, letter: string) => `starts-${idOf(picture)}-${letter}`,
  picture: (picture: string) => `pic-${idOf(picture)}`,
  word: (word: string) => `word-${idOf(word)}`,
  findWord: (word: string) => `find-word-${idOf(word)}`,
  number: (n: number) => `num-${n}`,
  findNumber: (n: number) => `find-num-${n}`,
  mission: (m: Mission, n: number) => `mission-${m.animal}-${n}`,
  addition: (a: number, b: number) => `add-${a}-${b}`,
  subtraction: (a: number, b: number) => `sub-${a}-${b}`,
  spell: (word: string) => `spell-${idOf(word)}`,
  /** Story Shelf narration. The lines come from src/content/stories.json (see scripts/build-speech-list.mjs). */
  bookTitle: (slug: string) => `book-${slug}-title`,
  bookPage: (slug: string, page: number) => `book-${slug}-${page}`,
  rhyme: (word: string) => `rhyme-${idOf(word)}`,
  shapeHome: (color: string, shape: ShapeName) => `home-${color}-${shape}`,
  findShape: (shape: ShapeName) => `find-shape-${shape}`,
  findColor: (color: string) => `find-color-${color}`,
  shape: (shape: ShapeName) => `shape-${shape}`,
  color: (color: string) => `color-${color}`,
  place: (id: string) => `place-${id}`,
  storyIntro: (hero: string) => `story-intro-${idOf(hero)}`,
  storyHome: (hero: string, place: string) => `story-home-${idOf(hero)}-${place}`,
  storyFind: (hero: string, object: string) => `story-find-${idOf(hero)}-${object}`,
  storyEvent: (object: string, place: string) => `story-event-${object}-${place}`,
  storyMeet: (hero: string, friend: string) => `story-meet-${idOf(hero)}-${friend}`,
  storyEnd: (hero: string) => `story-end-${idOf(hero)}`,
  recipe: (id: string) => `recipe-${id}`,
  recipeStep: (id: string, step: number) => `recipe-${id}-step-${step}`,
  chefAdd: (id: string, step: number, count: number) => `recipe-${id}-step-${step}-${count}`,
  build: (id: string) => `build-${id}`,
  pet: (pet: string, what: PetLine) => `pet-${pet}-${what}`,
};

/** Fixed lines: instructions, encouragement and celebrations. */
export const LINES = {
  hello: 'Hi! What shall we play today?',
  tryAgain: "Let's try again!",
  almost: 'Almost! Try again.',
  together: "Let's try together.",
  oops: 'Oops! That one is not it.',
  traceIntro: 'Trace with your finger.',
  traceWatch: 'Watch me first.',
  traceYourTurn: 'Your turn! Start at the dot.',
  traceStartDot: 'Start at the green dot.',
  traceFollow: 'Follow the line.',
  followIntro: 'Watch the colors, then copy!',
  followShapes: 'Watch the shapes, then copy!',
  followYourTurn: 'Your turn!',
  calmBreath: "Let's take a slow breath.",
  rlIntro: 'Hold to go. Let go on red!',
  rlGo: 'Go!',
  rlSlow: 'Slow down!',
  rlStop: 'Stop!',
  rlOops: 'Oops! Red means stop.',
  rlWin: 'You made it!',
  brIntro: 'Hold the balloon and breathe in. Let go and breathe out.',
  brLetGo: 'Now let go.',
  brIn: 'Breathe in.',
  brOut: 'Breathe out.',
  brDone: 'Four calm breaths. Well done!',
  snIntro: 'Take the snail home. Go slow!',
  snFast: 'Too fast! Slow and steady.',
  snHome: 'Home sweet home!',
  spyDone: 'You found them all!',
  tracePickLetter: 'Pick a letter to trace.',
  tracePickNumber: 'Pick a number to trace.',
  tracePickWord: 'Pick a word to trace.',
  detectiveIntro: "Let's find words!",
  countIntro: "Let's count! Tap the treats.",
  countTooMany: "That's enough! Count again.",
  howMany: 'How many altogether?',
  artIntro: 'Pick a color and draw!',
  artColoring: 'Pick a picture to color.',
  artBlank: 'A fresh new page!',
  memoryIntro: 'Find two that match!',
  memoryNope: 'Not a match.',
  memoryMatch: 'Match!',
  popIntro: 'Pop all the bubbles!',
  totsIntro: 'Tap, tap, tap!',
  balIntro: 'Pick a frog. Then tap a spot to make the board level!',
  balWin: "It's level!",
  popMore: 'More bubbles!',
  catchIntro: 'Move the basket. Catch the fruit!',
  catchWin: 'You caught them all!',
  safariIntro: "Let's listen for sounds!",
  puzzleIntro: "Let's solve puzzles!",
  shapeIntro: 'Drag each shape to its home.',
  jigsawIntro: 'Drag the pieces to finish the picture.',
  questDone: 'You found them all!',
  friendIntro: 'Pick a friend.',
  pickPlace: 'Now pick a home.',
  addStickers: 'Pick a sticker. Then tap to stick it.',
  grownUps: 'This part is for grown-ups.',
  nextLetter: "Let's try the next letter!",
  newWord: "Here's a new word.",
  storyPickHero: 'Who is the story about?',
  storyPickPlace: 'Where does it happen?',
  storyPickObject: 'What do they find?',
  storyPickFriend: 'Who do they meet?',
  storyReady: "Here's your story!",
  chefPick: 'What shall we cook?',
  chefStir: 'Stir round and round.',
  chefBake: 'Tap the oven to bake it.',
  chefSort: 'Match each fruit to its color.',
  questPick: 'Hunt for shapes, or build?',
  questHunt: "Let's hunt for shapes!",
  questBuild: 'Pick something to build.',
  musicIntro: 'Tap the bars to play.',
  drumsIntro: 'Tap the drums!',
  pianoIntro: 'Play the piano keys!',
  guitarIntro: 'Swipe across the strings!',
  songsIntro: 'Pick a song!',
  songGlow: 'Tap the glowing bar.',
  songEnd: 'You played the whole song!',
  petPick: 'Pick a pet to take care of!',
  petHowTo: 'Follow the list, one step at a time.',
  petDone: 'All done! What a happy pet.',
  missingNumber: 'What number is missing?',
  whichMore: 'Which group has more?',
  whichFewer: 'Which group has fewer?',
  readPicture: 'Read it. Find the picture.',
  spellIt: 'Tap the letters to spell it.',
  whichLetter: 'Which letter does it start with?',
  whatNext: 'What comes next?',
  patternIntro: 'Look at the pattern.',
  memoryLetters: 'Match big and little letters!',
  questCreate: 'Tap a shape. Drag it anywhere.',
  mirrorOn: 'Magic mirror!',
  rainbowOn: 'Rainbow magic!',
  chefCheck: 'Tap the check when done.',
  helpOffer: 'Need help? Tap the owl.',
  helpRemove: 'One is gone. Try again!',
  helpListen: 'The next letter is',
  chefTooMany: 'Too many! Tap one to take it out.',
  chefMore: 'Not yet! We need some more.',
  shelfIntro: 'Pick a book to read.',
};

/** Every spoken line, as id -> text. Lines starting with "/" are phonemes, not words. */
export function spokenLines(): Record<string, string> {
  const lines: Record<string, string> = {};
  for (const [key, text] of Object.entries(LINES)) lines[say.line(key as keyof typeof LINES)] = text;
  for (const game of GAMES) lines[say.game(game.id)] = `${game.title.replace('&', 'and')}!`;
  for (const section of GAME_SECTIONS) lines[say.section(section.id)] = `${section.title.replace('&', 'and')}!`;
  for (const song of SONGS) lines[say.song(song.id)] = `${song.title}!`;
  for (const target of SPY_TARGETS) lines[say.spy(target.name)] = `Can you find the ${target.name}?`;

  for (const l of LETTERS) {
    lines[say.letterName(l)] = `${l.upper}.`;
    lines[say.letterIsFor(l)] = l.upper === 'X' ? `X is in ${l.word}!` : `${l.upper} is for ${l.word}!`;
    lines[say.traceUpper(l)] = `Let's trace a big ${l.upper}.`;
    lines[say.traceLower(l)] = `Now let's trace a little ${l.lower}.`;
  }
  for (const n of TRACE_NUMBERS) lines[say.traceNumber(n)] = `Let's trace the number ${NUMBER_WORDS[n]}.`;
  for (const word of TRACE_WORDS) lines[say.traceWord(word)] = `Let's trace the word, ${word}.`;
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
    ...SPELL_WORDS.flat(),
    ...RHYMES.flat(),
    ...PANTRY,
  ]);
  for (const picture of pictureNames) lines[say.picture(picture)] = capitalize(picture === 'queen' ? 'queen' : picture);

  for (const word of SIGHT_WORDS) {
    lines[say.word(word)] = word === 'I' ? 'I.' : `${word}.`;
    lines[say.findWord(word)] = `Find the word, ${word}.`;
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
  for (const [a, b] of SUBTRACTION) lines[say.subtraction(a, b)] = `${capitalize(NUMBER_WORDS[a])} take away ${NUMBER_WORDS[b]}?`;
  for (const word of SPELL_WORDS.flat()) lines[say.spell(word)] = `Spell ${word}.`;
  for (const word of RHYMES.flat()) lines[say.rhyme(word)] = `What rhymes with ${word}?`;
  for (const [a, b] of ADDITION) lines[say.addition(a, b)] = `${capitalize(NUMBER_WORDS[a])} plus ${NUMBER_WORDS[b]}?`;
  for (const shape of SHAPES) {
    lines[say.shape(shape)] = capitalize(shape);
    lines[say.findShape(shape)] = `Find all the ${shape}s!`;
    for (const color of COLORS) lines[say.shapeHome(color.name, shape)] = `${capitalize(color.name)} ${shape}.`;
  }
  for (const color of COLORS) {
    lines[say.color(color.name)] = capitalize(color.name);
    lines[say.findColor(color.name)] = `Find everything that is ${color.name}!`;
  }
  for (const place of PLACES) lines[say.place(place.id)] = `The ${place.name}!`;

  for (const hero of STORY_HEROES) {
    lines[say.storyIntro(hero.id)] = `Once upon a time, there was ${hero.intro}.`;
    for (const [placeId, place] of Object.entries(STORY_PLACES)) lines[say.storyHome(hero.id, placeId)] = `${hero.name} lived in ${place.home}.`;
    for (const object of STORY_OBJECTS) lines[say.storyFind(hero.id, object.id)] = `One day, ${hero.name} found a ${object.name}!`;
    for (const friend of STORY_FRIENDS) lines[say.storyMeet(hero.id, friend)] = `Soon, ${hero.name} met a friendly ${friend}, and they became best friends.`;
    lines[say.storyEnd(hero.id)] = `When the day was done, ${hero.name} snuggled up, happy and sleepy. The end!`;
  }
  for (const object of STORY_OBJECTS) {
    for (const [placeId, place] of Object.entries(STORY_PLACES)) lines[say.storyEvent(object.id, placeId)] = object.event.replace('{place}', place.short);
  }
  for (const recipe of RECIPES) {
    lines[say.recipe(recipe.id)] = `Let's make ${recipe.name}!`;
    recipe.steps.forEach((step, i) => {
      const order = ORDER_WORDS[i];
      if (step.kind === 'add') {
        for (let n = CHEF_MIN; n <= CHEF_MAX; n++) lines[say.chefAdd(recipe.id, i, n)] = `${order}, add ${NUMBER_WORDS[n]} ${step.many}.`;
        return;
      }
      lines[say.recipeStep(recipe.id, i)] =
        step.kind === 'stir' ? `${order}, stir it all up!` : step.kind === 'bake' ? `${order}, bake it in the oven!` : `${order}, sort the fruit by color.`;
    });
  }
  for (const build of BUILDS) {
    lines[say.build(build.id)] = `Let's build a ${build.name}!`;
  }
  for (const pet of PETS) {
    lines[say.pet(pet.id, 'hello')] = `Hi! I'm your ${pet.name.toLowerCase()}!`;
    const name = pet.name.toLowerCase();
    lines[say.pet(pet.id, 'hungry')] = `${pet.name} is hungry!`;
    lines[say.pet(pet.id, 'wantsWalk')] = `${pet.name} wants a walk!`;
    lines[say.pet(pet.id, 'walked')] = `What a nice walk!`;
    lines[say.pet(pet.id, 'wantsPlay')] = `${pet.name} wants to play!`;
    lines[say.pet(pet.id, 'wantsBath')] = `Oh no, ${name} is muddy!`;
    lines[say.pet(pet.id, 'wantsSleep')] = `${pet.name} is sleepy!`;
    lines[say.pet(pet.id, 'yum')] = `Yum yum! Thank you!`;
    lines[say.pet(pet.id, 'played')] = `Wheee! Fun!`;
    lines[say.pet(pet.id, 'clean')] = `Splish, splash! All clean!`;
    lines[say.pet(pet.id, 'rested')] = `Good morning!`;
    lines[say.pet(pet.id, 'notNow')] = `Not right now.`;
    lines[say.pet(pet.id, 'giggle')] = `Hee hee! That tickles!`;
  }
  return lines;
}

function capitalize(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
