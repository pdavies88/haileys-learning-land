# Amazon Appstore listing

Copy these into the Amazon Developer Console (developer.amazon.com) in the order below. The console saves each tab separately, and you can come back to any tab before you submit.

Images are in this folder. Rebuild them after retaking the iPad screenshots:

```bash
.art-venv/bin/python scripts/amazon-store-assets.py
```

## Before you start

- [ ] **Amazon customer account and developer account with the same email.** Sign in to developer.amazon.com with your normal Amazon account and finish the developer profile. The console asks for a developer name, which is shown on the listing, and contact details.
- [ ] **Payment and tax details.** The console may ask for these even for a free app. Complete them if it does.
- [ ] **The release build.** Download the `.aab` file from the EAS build page, or find it later with `npx eas-cli@latest build:list --platform android`.
- [ ] **The tester's Amazon email.** This is the Amazon account registered to Hailey's Fire tablet. Find it on the tablet under **Settings → My Account**.

## Step 1: New app

In the console, choose **Apps → Add new app → Android**.

| Field | Value |
| --- | --- |
| App title | Hailey's Learning Land |
| App category | Education. Choose a kids' or early-learning subcategory if the list has one. |
| Customer support email | preston5@protonmail.com |
| Customer support website | https://pdavies88.github.io/haileys-learning-land/support/ |
| Privacy policy URL, if asked here | https://pdavies88.github.io/haileys-learning-land/privacy/ |

## Step 2: Upload your app file

| Field | Value |
| --- | --- |
| App file | The `.aab` from the EAS `production` build |
| Allow Amazon to apply DRM? | No. The app is free, so it needs no copy protection. |
| Language support | English |
| Testing instructions | Paste the text below. |

Testing instructions:

> Hailey's Learning Land is a free learning app for children aged about 3 to 6. It needs no login, has no ads or purchases, and works fully offline. All 14 games are on the home screen. The Grown-ups button opens a parental gate: tap the two numbers that are written as words. Behind the gate are app information and links to the privacy policy and support page, which open in the browser.

Amazon re-signs the app with its own key. The app uses no Amazon or Google sign-in, so you don't need to do anything with the certificate hashes shown on this screen.

## Step 3: Target your app

| Field | Value |
| --- | --- |
| Supported devices | **Amazon Fire Tablets only.** Uncheck Fire TV and Amazon Automotive. The app needs a touch screen. |
| Device rules | None |
| Availability | All countries and regions. The app is in English only, so you could limit it to English-speaking countries instead. |
| Target audience | Apps designed for children |

**Content rating questionnaire.** Answer None or No to every item:

- Subject matter: Violence, Cartoon Violence, Drugs, Nudity, Sex, Intolerance and Profanity are all **None**.
- Academic: Read the wording in the console. If it asks whether the app has educational content, answer **Yes**.
- Account creation or other personal information collected: **No**
- Advertisements: **No**
- Gambling: **No**
- Location detection or location-based services: **No**
- User-generated content or user-to-user communication: **No**

Drawings stay on the screen and are never saved or shared, so they don't count as user-generated content.

**User data privacy.**

- Does your app collect user data or transfer user data to third parties? **No.**
- With a No answer, Amazon doesn't ask for a privacy policy URL here. The policy is still linked from the support website and inside the app.

**Intellectual property.** Amazon may ask for proof that you can use third-party content. Every outside source is openly licensed:

- Pictures: Fluent Emoji by Microsoft, MIT License
- Coloring pages: Noto Emoji by Google, Apache License 2.0
- Picture books: Book Dash, Creative Commons Attribution 4.0
- Sound effects: Kenney, CC0
- Font: Fredoka, SIL Open Font License

If Amazon asks, reply with this list and a link to the Credits section of the support page.

## Step 4: Appstore details

**Pricing:** Free.

**Display title:** Hailey's Learning Land

**Short description** (about 1,200 characters at most; line breaks are removed):

> Fourteen learning games for young children, all free. A friendly voice reads every instruction aloud, so children who can't read yet can play on their own. Children trace letters and numbers, spell words with letter tiles, read 28 narrated picture books, count and add, solve patterns and jigsaws, cook with Little Chef, play a xylophone, drums, piano and guitar, and draw in the Art Studio with 100 coloring pages. Every game gets harder as children answer correctly and eases off when they need help. No ads, no in-app purchases, no accounts and no tracking. Everything works offline.

**Product feature bullets** (3 to 5, one per line):

```
14 learning games for ages 3 to 6: reading, spelling, numbers, art, music and puzzles
28 picture books read aloud, with each word lighting up as it is read
Every instruction is spoken, and every game adjusts to your child's level
No ads, no in-app purchases, no accounts and no data collected
Works fully offline, in the car or on a plane
```

**Long description** (4,000 characters at most, plain text):

```
Hailey's Learning Land is a free, offline learning app for young children. A friendly voice reads every instruction aloud, so children who can't read yet can play on their own.

READ AND SPELL
- Story Shelf: 28 narrated picture books. Each word lights up as it is read, and the pages turn by themselves.
- Word Detective: sight words, reading words to pictures, spelling with letter tiles, and rhymes.
- Magic Letters: trace every capital and lowercase letter, the numbers 1 to 20 and short sight words.
- Sound Safari: match letters to the sounds that start each word.

NUMBERS
- Count & Collect: counting, missing numbers, more or fewer, adding and taking away.
- Little Chef: find the right ingredients, add the right amount, and follow first, next and last steps.

CREATE
- Art Studio: crayons, glitter, stamps, a rainbow color, a magic mirror for symmetrical drawings and 100 coloring pages.
- Build a Story, Make a Friend, and Music Maker with a xylophone, drum kit, piano and guitar.

THINK AND SOLVE
- Puzzle World: patterns, a shape sorter and jigsaws up to 16 pieces.
- Flip & Find, Shape Quest, and My Little Pet: a pocket pet that tells you what it needs.

Every game adjusts as children play. It moves up after two right answers in a row and eases off after a miss. Wrong answers get a gentle "Let's try again!", never a buzzer, and a friendly owl offers a clue when children are stuck, without giving the answer away.

FOR GROWN-UPS
No ads. No in-app purchases. No accounts. No tracking. Nothing is collected or saved. Everything works offline. The grown-ups area is behind a simple parental gate.
```

**Keywords** (comma-separated):

```
kids,learning,reading,phonics,spelling,math,counting,toddler,preschool,kindergarten,coloring,stories,abc,letters,read aloud
```

**Images** (tablet assets):

| Asset | File | Amazon's requirement |
| --- | --- | --- |
| Small icon | `icon-114.png` | 114 × 114 PNG, required |
| Large icon | `icon-512.png` | 512 × 512 PNG, required |
| Screenshots | `screenshots/01-home.png` to `06-art-studio.png` | 3 to 10, required. These are 1600 × 2560 portrait. |
| Promotional image | `promo-1024x500.png` | 1024 × 500, optional |
| Video | none | Optional |

Skip the Fire TV assets. Fire TV isn't a supported device.

## Step 5: Live App Testing

Use this step before public release so Hailey can test the real Appstore version.

1. Open **Live App Testing** for the app in the console.
2. Create a tester group and add the Amazon email registered to her Fire tablet.
3. Choose the uploaded `.aab` and submit the test.
4. Amazon emails the tester a link once the test is ready. Open it on the tablet, or find the app in the Appstore app on that account.
5. If she uses an Amazon Kids profile, add the app to it from the parent profile: **Settings → Profiles & Family Library → her profile → Add Content → Apps**.

To test a fixed build, run a new EAS `production` build and upload it to the same Live App Testing run. EAS raises the `versionCode` each time, and Amazon requires a higher one.

## Step 6: Submit for public release

When testing is done, promote the tested build to the live listing, or choose **Submit App** on the app's page. Amazon reviews the app before it goes live. Review usually takes a few days.

## Later updates

1. Change the `version` in `app.json` when you want a new visible version, such as 1.1.0. EAS raises the `versionCode` by itself.
2. Run `npx eas-cli@latest build --platform android --profile production`.
3. In the console, choose **Add upcoming version**, upload the new `.aab`, update anything that changed, and submit.
