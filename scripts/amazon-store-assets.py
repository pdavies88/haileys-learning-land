"""Builds the Amazon Appstore images from the App Store screenshots and the Play icon.

Amazon accepts only Fire tablet sizes, so each 13-inch iPad screenshot loses its status bar and
sits under a caption on a 1600 x 2560 portrait canvas. Also writes the 114 px small icon and the
1024 x 500 promotional image.

Run after retaking the iPad screenshots:
  .art-venv/bin/python scripts/amazon-store-assets.py
"""

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
IPAD = ROOT / "store" / "app-store" / "screenshots" / "ipad-13"
OUT = ROOT / "store" / "amazon"
FONT = ROOT / "node_modules" / "@expo-google-fonts" / "fredoka" / "700Bold" / "Fredoka_700Bold.ttf"
ICON = ROOT / "store" / "android" / "play-icon-512.png"

WIDTH, HEIGHT = 1600, 2560
STATUS_BAR = 90  # iPad status bar height in the 2064 px wide screenshots
BACKGROUND = (246, 243, 255)  # theme background, #F6F3FF
INK = (42, 30, 79)  # theme text, #2A1E4F
TOP, BOTTOM = (79, 195, 247), (155, 92, 246)  # the icon's sky-blue to violet tile

CAPTIONS = {
    "01-home": "14 learning games, all free",
    "02-story-shelf": "28 picture books, read aloud",
    "03-read-along": "Every word lights up as it's read",
    "04-spelling": "Spell words with letter tiles",
    "05-patterns": "Patterns, shapes and jigsaws",
    "06-art-studio": "Draw, color and make magic",
}


def gradient(size, start, end, horizontal=False):
    """A two-color linear gradient."""
    w, h = size
    steps = w if horizontal else h
    strip = Image.new("RGB", (steps, 1) if horizontal else (1, steps))
    for i in range(steps):
        t = i / max(steps - 1, 1)
        color = tuple(round(a + (b - a) * t) for a, b in zip(start, end))
        strip.putpixel((i, 0) if horizontal else (0, i), color)
    return strip.resize(size)


def rounded(image, radius):
    mask = Image.new("L", image.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, *image.size), radius, fill=255)
    return mask


def screenshot(name, caption):
    shot = Image.open(IPAD / f"{name}.png").convert("RGB")
    shot = shot.crop((0, STATUS_BAR, shot.width, shot.height))
    inner = WIDTH - 2 * 60
    shot = shot.resize((inner, round(shot.height * inner / shot.width)), Image.LANCZOS)

    canvas = Image.new("RGB", (WIDTH, HEIGHT), BACKGROUND)
    band = 400
    canvas.paste(gradient((WIDTH, band), TOP, BOTTOM, horizontal=True), (0, 0))
    draw = ImageDraw.Draw(canvas)
    font = ImageFont.truetype(str(FONT), 92)
    draw.text((WIDTH / 2, band / 2), caption, font=font, fill="white", anchor="mm")

    top = band + (HEIGHT - band - shot.height) // 2
    canvas.paste(shot, (60, top), rounded(shot, 48))
    canvas.save(OUT / "screenshots" / f"{name}.png", optimize=True)


def promo():
    canvas = gradient((1024, 500), TOP, BOTTOM, horizontal=True).convert("RGBA")
    icon = Image.open(ICON).convert("RGBA").resize((300, 300), Image.LANCZOS)
    canvas.paste(icon, (80, 100), rounded(icon, 66))
    draw = ImageDraw.Draw(canvas)
    draw.text((430, 205), "Hailey's", font=ImageFont.truetype(str(FONT), 72), fill="white", anchor="ls")
    draw.text((430, 290), "Learning Land", font=ImageFont.truetype(str(FONT), 72), fill="white", anchor="ls")
    draw.text((432, 350), "Learn, read, create and play", font=ImageFont.truetype(str(FONT), 34), fill=(255, 255, 255, 230), anchor="ls")
    canvas.convert("RGB").save(OUT / "promo-1024x500.png", optimize=True)


def main():
    (OUT / "screenshots").mkdir(parents=True, exist_ok=True)
    for name, caption in CAPTIONS.items():
        screenshot(name, caption)
    icon = Image.open(ICON).convert("RGBA")
    icon.save(OUT / "icon-512.png", optimize=True)
    icon.resize((114, 114), Image.LANCZOS).save(OUT / "icon-114.png", optimize=True)
    promo()


if __name__ == "__main__":
    main()
