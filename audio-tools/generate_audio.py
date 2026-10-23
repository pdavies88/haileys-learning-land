"""Generates the letter sounds, the sound effects and the audio map. Nothing is downloaded at runtime.

The narrator's spoken lines come from audio-tools/generate_speech_qwen.py (Qwen3-TTS). This script
only speaks the letter sounds (lines starting with "/"), which are phonemes that need Kokoro.

    .tts/venv/bin/python audio-tools/generate_audio.py            # speech and sound effects
    .tts/venv/bin/python audio-tools/generate_audio.py speech [id ...]
    .tts/venv/bin/python audio-tools/generate_audio.py sfx [name ...]

Speech comes from audio-tools/speech.json (run `node scripts/build-speech-list.mjs` first), spoken
by the Kokoro open-source voice model (Apache 2.0). Lines starting with "/" are phonemes, used for
letter sounds. Interface sounds and celebration jingles come from Kenney's sound packs (CC0,
kenney.nl), downloaded once into .cache/kenney/. Instruments and the gentle "try again" sound are
synthesized from tones and noise. Output is AAC (.m4a), encoded
with macOS's built-in afconvert. The script also writes src/content/audio-files.ts.

Setup: .tts/ holds the Kokoro model and a Python venv with kokoro-onnx, soundfile and scipy.
"""

from __future__ import annotations

import hashlib
import io
import json
import subprocess
import sys
import tempfile
import urllib.request
import zipfile
from pathlib import Path

import numpy as np
import soundfile as sf
from scipy import signal

ROOT = Path(__file__).resolve().parent.parent
SPEECH_LIST = ROOT / "audio-tools" / "speech.json"
OUT_SPEECH = ROOT / "assets" / "audio" / "speech"
OUT_SFX = ROOT / "assets" / "audio" / "sfx"
AUDIO_MAP = ROOT / "src" / "content" / "audio-files.ts"
TTS_DIR = ROOT / ".tts"
TTS_CACHE = TTS_DIR / "cache"

KOKORO_LINES = set(json.loads((ROOT / "audio-tools" / "kokoro-lines.json").read_text())["lines"])

SR = 24000  # Kokoro's own rate; plenty for speech and simple effects
# The narrator: Kokoro voice "Heart" (American English), warm and clear, a little slower for kids.
VOICE = "af_heart"
VOICE_LANG = "en-us"
VOICE_SPEED = 0.85

_kokoro = None


def speak(text: str) -> np.ndarray:
    """Speaks one line (or phonemes, if it starts with "/"). Results are cached by voice and text."""
    global _kokoro
    key = hashlib.sha1(f"{VOICE}|{VOICE_SPEED}|{text}".encode()).hexdigest()
    cached = TTS_CACHE / f"{key}.npy"
    if cached.exists():
        return np.load(cached)
    if _kokoro is None:
        from kokoro_onnx import Kokoro

        _kokoro = Kokoro(str(TTS_DIR / "kokoro-v1.0.onnx"), str(TTS_DIR / "voices-v1.0.bin"))
    phonemes = text.startswith("/")
    samples, rate = _kokoro.create(
        text[1:] if phonemes else text, voice=VOICE, speed=VOICE_SPEED, lang=VOICE_LANG, is_phonemes=phonemes
    )
    audio = np.asarray(samples, dtype=np.float64)
    if rate != SR:
        audio = signal.resample_poly(audio, SR, rate)
    loud = np.flatnonzero(np.abs(audio) > 0.01)
    if len(loud):
        audio = audio[max(0, loud[0] - int(0.02 * SR)) : loud[-1] + int(0.06 * SR)]
    TTS_CACHE.mkdir(parents=True, exist_ok=True)
    np.save(cached, audio)
    return audio


def encode(audio: np.ndarray, out_path: Path, bitrate: int) -> None:
    out_path.parent.mkdir(parents=True, exist_ok=True)
    audio = audio / (np.max(np.abs(audio)) + 1e-9) * 10 ** (-1.5 / 20)
    with tempfile.TemporaryDirectory() as tmp:
        wav = Path(tmp) / "in.wav"
        sf.write(wav, audio.astype(np.float32), SR, subtype="PCM_16")
        subprocess.run(
            ["afconvert", "-f", "m4af", "-d", "aac", "-b", str(bitrate), str(wav), str(out_path)],
            check=True,
        )


# ---------------------------------------------------------------------------
# Sound effects
# ---------------------------------------------------------------------------

def tone(freq: float, seconds: float, decay: float, harmonics=((1, 1.0),)) -> np.ndarray:
    t = np.arange(int(SR * seconds)) / SR
    out = sum(amp * np.sin(2 * np.pi * freq * k * t) for k, amp in harmonics)
    return out * np.exp(-t / decay) * np.minimum(1, t / 0.004)


def seq(*parts: tuple[float, np.ndarray]) -> np.ndarray:
    length = max(int(at * SR) + len(p) for at, p in parts)
    out = np.zeros(length)
    for at, p in parts:
        start = int(at * SR)
        out[start : start + len(p)] += p
    return out


def sfx_pop():
    t = np.arange(int(SR * 0.12)) / SR
    freq = 900 * np.exp(-t / 0.03) + 300
    return np.sin(2 * np.pi * np.cumsum(freq) / SR) * np.exp(-t / 0.035)


def sfx_chime():
    bell = ((1, 1.0), (2, 0.3), (3, 0.12))
    return seq((0, tone(1046.5, 0.8, 0.25, bell)), (0.09, tone(1318.5, 0.9, 0.3, bell)), (0.18, tone(1568.0, 1.1, 0.4, bell)))


def sfx_sparkle():
    rng = np.random.default_rng(7)
    parts = [(i * 0.045, tone(f, 0.5, 0.12, ((1, 1.0), (2, 0.2)))) for i, f in enumerate(rng.choice([1568, 1760, 2093, 2349, 2637, 3136], 10))]
    return seq(*parts)


def sfx_tada():
    warm = ((1, 1.0), (2, 0.45), (3, 0.2), (4, 0.1))
    chord = lambda at, notes, length: [(at, tone(f, length, length / 2.5, warm)) for f in notes]
    return seq(*chord(0, [523.25, 659.25], 0.25), *chord(0.16, [587.33, 739.99], 0.25), *chord(0.32, [523.25, 659.25, 783.99, 1046.5], 1.4))


def sfx_whoosh():
    rng = np.random.default_rng(3)
    n = int(SR * 0.3)
    t = np.arange(n) / SR
    noise = rng.standard_normal(n)
    sos = signal.butter(2, [600, 3000], btype="bandpass", fs=SR, output="sos")
    return signal.sosfilt(sos, noise) * np.sin(np.pi * t / t[-1]) ** 2


def sfx_bloop():
    """A soft, friendly 'not quite' sound: two gentle low notes, never a buzzer."""
    soft = ((1, 1.0), (2, 0.15))
    return seq((0, tone(440, 0.3, 0.12, soft)), (0.12, tone(349.2, 0.4, 0.15, soft)))


def sfx_snap():
    t = np.arange(int(SR * 0.08)) / SR
    return np.sin(2 * np.pi * 1200 * t) * np.exp(-t / 0.012) + 0.6 * np.sin(2 * np.pi * 600 * t) * np.exp(-t / 0.02)


def sfx_flip():
    t = np.arange(int(SR * 0.1)) / SR
    freq = 400 + 1400 * t / t[-1]
    return np.sin(2 * np.pi * np.cumsum(freq) / SR) * np.sin(np.pi * t / t[-1])


def sfx_star():
    up = ((1, 1.0), (2, 0.25))
    return seq(*[(i * 0.07, tone(f, 0.4, 0.15, up)) for i, f in enumerate([784, 988, 1175, 1568])])


XYLO_FREQS = [523.25, 587.33, 659.25, 698.46, 783.99, 880.0, 987.77, 1046.5]  # C major, C5 to C6


def xylo(freq: float):
    """A warm wooden bar: a round fundamental with the bright fourth partial of a marimba."""
    return tone(freq, 1.2, 0.35, ((1, 1.0), (4, 0.25), (10, 0.06)))


def sfx_drum():
    t = np.arange(int(SR * 0.6)) / SR
    pitch = 55 + 90 * np.exp(-t / 0.04)
    body = np.sin(2 * np.pi * np.cumsum(pitch) / SR) * np.exp(-t / 0.18)
    rng = np.random.default_rng(5)
    thump = rng.standard_normal(len(t)) * np.exp(-t / 0.01) * 0.3
    return body + thump


def sfx_clap():
    rng = np.random.default_rng(9)
    n = int(SR * 0.3)
    t = np.arange(n) / SR
    noise = rng.standard_normal(n)
    sos = signal.butter(2, [900, 3500], btype="bandpass", fs=SR, output="sos")
    burst = sum(np.exp(-np.maximum(t - d, 0) / 0.012) * (t >= d) for d in (0, 0.011, 0.022))
    return signal.sosfilt(sos, noise) * (burst + 0.6 * np.exp(-t / 0.08))


def sfx_shaker():
    rng = np.random.default_rng(11)
    n = int(SR * 0.28)
    t = np.arange(n) / SR
    sos = signal.butter(2, [3000, 9000], btype="bandpass", fs=SR, output="sos")
    return signal.sosfilt(sos, rng.standard_normal(n)) * np.sin(np.pi * t / t[-1]) ** 0.7


def pluck(freq: float, seconds: float = 1.6) -> np.ndarray:
    """A plucked string (Karplus-Strong): a burst of noise fed through a short, decaying delay loop."""
    rng = np.random.default_rng(int(freq))
    period = int(SR / freq)
    buf = rng.uniform(-1, 1, period)
    out = np.zeros(int(SR * seconds))
    for i in range(len(out)):
        out[i] = buf[i % period]
        buf[i % period] = 0.996 * 0.5 * (buf[i % period] + buf[(i + 1) % period])
    return out


def sfx_strum():
    """A friendly guitar strum down a G major chord."""
    notes = [98.0, 123.47, 146.83, 196.0, 246.94, 392.0]
    return seq(*[(i * 0.018, pluck(f) * (0.8 + 0.04 * i)) for i, f in enumerate(notes)])


# Piano: C4 to C5, every half step, so the keyboard has black keys too.
PIANO_FREQS = [261.63 * 2 ** (i / 12) for i in range(13)]


def piano(freq: float) -> np.ndarray:
    """A soft piano note: bright overtones that fade faster than the fundamental, and a hammer tap."""
    t = np.arange(int(SR * 2.2)) / SR
    out = np.zeros_like(t)
    for k, amp in ((1, 1.0), (2, 0.55), (3, 0.3), (4, 0.18), (5, 0.1), (6, 0.06)):
        # Real strings are a little stretched: each overtone sits slightly sharp.
        f = freq * k * (1 + 0.0004 * k * k)
        out += amp * np.sin(2 * np.pi * f * t) * np.exp(-t * (1.6 + 0.9 * k))
    rng = np.random.default_rng(int(freq))
    hammer = rng.standard_normal(len(t)) * np.exp(-t / 0.004) * 0.15
    return (out + hammer) * np.minimum(1, t / 0.003)


def drum_hit(start: float, end: float, decay: float, seconds: float, noise: float, seed: int) -> np.ndarray:
    """A tuned drum: a pitch that drops quickly from `start` to `end` Hz, plus a little stick noise."""
    t = np.arange(int(SR * seconds)) / SR
    pitch = end + (start - end) * np.exp(-t / 0.03)
    body = np.sin(2 * np.pi * np.cumsum(pitch) / SR) * np.exp(-t / decay)
    rng = np.random.default_rng(seed)
    return body + rng.standard_normal(len(t)) * np.exp(-t / 0.008) * noise


def sfx_kick():
    return drum_hit(150, 48, 0.22, 0.6, 0.2, 21)


def sfx_tomhi():
    return drum_hit(330, 200, 0.2, 0.6, 0.15, 22)


def sfx_tomlo():
    return drum_hit(200, 110, 0.28, 0.8, 0.15, 23)


def sfx_snare():
    rng = np.random.default_rng(24)
    n = int(SR * 0.35)
    t = np.arange(n) / SR
    sos = signal.butter(2, [1500, 8000], btype="bandpass", fs=SR, output="sos")
    rattle = signal.sosfilt(sos, rng.standard_normal(n)) * np.exp(-t / 0.08)
    return rattle + 0.6 * drum_hit(260, 180, 0.06, 0.35, 0, 24)


def sfx_hihat():
    rng = np.random.default_rng(25)
    n = int(SR * 0.15)
    t = np.arange(n) / SR
    sos = signal.butter(4, 7000, btype="highpass", fs=SR, output="sos")
    return signal.sosfilt(sos, rng.standard_normal(n)) * np.exp(-t / 0.03)


def sfx_crash():
    rng = np.random.default_rng(26)
    n = int(SR * 1.8)
    t = np.arange(n) / SR
    sos = signal.butter(2, 4000, btype="highpass", fs=SR, output="sos")
    return signal.sosfilt(sos, rng.standard_normal(n)) * np.exp(-t / 0.5) * np.minimum(1, t / 0.002)


# Guitar strings in standard tuning, low E to high E.
GUITAR_FREQS = [82.41, 110.0, 146.83, 196.0, 246.94, 329.63]


def sfx_bell():
    return tone(1318.5, 1.6, 0.6, ((1, 1.0), (2.4, 0.4), (5.95, 0.15)))


# Kenney sound packs (CC0). Each pack is downloaded once and unzipped into .cache/kenney/<pack>/.
KENNEY_DIR = ROOT / ".cache" / "kenney"
KENNEY_PACKS = {
    "kenney_interface-sounds": "https://kenney.nl/media/pages/assets/interface-sounds/fa43c1dd4d-1677589452/kenney_interface-sounds.zip",
    "kenney_music-jingles": "https://kenney.nl/media/pages/assets/music-jingles/f37e530b9e-1677590399/kenney_music-jingles.zip",
}


def kenney(pack: str, name: str):
    """Loads one Kenney sound as mono audio at the app's sample rate."""

    def load() -> np.ndarray:
        folder = KENNEY_DIR / pack
        if not folder.exists():
            with urllib.request.urlopen(KENNEY_PACKS[pack]) as response:
                zipfile.ZipFile(io.BytesIO(response.read())).extractall(folder)
        audio, rate = sf.read(next(folder.rglob(name)))
        if audio.ndim > 1:
            audio = audio.mean(axis=1)
        return signal.resample_poly(audio, SR, rate) if rate != SR else audio

    return load


UI = "kenney_interface-sounds"
JINGLES = "kenney_music-jingles"

SFX = {
    "pop": kenney(UI, "drop_002.ogg"),
    "chime": kenney(UI, "confirmation_001.ogg"),
    "sparkle": kenney(JINGLES, "jingles_PIZZI10.ogg"),
    "tada": kenney(JINGLES, "jingles_PIZZI02.ogg"),
    "whoosh": kenney(UI, "minimize_007.ogg"),
    "bloop": sfx_bloop,
    "strum": sfx_strum,
    "snap": kenney(UI, "drop_001.ogg"),
    "flip": kenney(UI, "drop_003.ogg"),
    "star": kenney(UI, "maximize_009.ogg"),
    "drum": sfx_drum, "clap": sfx_clap, "shaker": sfx_shaker, "bell": sfx_bell,
    **{f"xylo{i}": (lambda f=f: xylo(f)) for i, f in enumerate(XYLO_FREQS)},
    **{f"piano{i}": (lambda f=f: piano(f)) for i, f in enumerate(PIANO_FREQS)},
    **{f"string{i}": (lambda f=f: pluck(f, 2.4)) for i, f in enumerate(GUITAR_FREQS)},
    "kick": sfx_kick, "snare": sfx_snare, "hihat": sfx_hihat, "tomhi": sfx_tomhi, "tomlo": sfx_tomlo, "crash": sfx_crash,
}


# ---------------------------------------------------------------------------

def generate_speech(only: list[str]) -> None:
    lines = json.loads(SPEECH_LIST.read_text())
    print(f"Speech: {len(lines)} lines")
    for i, (sid, text) in enumerate(lines.items()):
        # Words are spoken by generate_speech_qwen.py. Kokoro makes the letter sounds (phonemes)
        # and the few single words listed in kokoro-lines.json.
        if not (text.startswith("/") or sid in KOKORO_LINES) or (only and sid not in only):
            continue
        out = OUT_SPEECH / f"{sid}.m4a"
        audio = speak(text)
        encode(audio, out, 40000)
        if (i + 1) % 100 == 0:
            print(f"  {i + 1} done")
    # Remove files for lines that no longer exist.
    for old in OUT_SPEECH.glob("*.m4a"):
        if old.stem not in lines:
            old.unlink()


def generate_sfx(only: list[str]) -> None:
    print("Sound effects")
    for name, make in SFX.items():
        if only and name not in only:
            continue
        encode(make(), OUT_SFX / f"{name}.m4a", 64000)


def write_audio_map() -> None:
    lines = json.loads(SPEECH_LIST.read_text())
    out = [
        "// Generated by audio-tools/generate_audio.py. Do not edit by hand.",
        "// Metro only bundles files referenced by a static require(), so every file is listed here.",
        "",
        "export const SPEECH_FILES: Record<string, number> = {",
        *[f"  '{sid}': require('../../assets/audio/speech/{sid}.m4a')," for sid in lines],
        "};",
        "",
        "export const SFX_FILES = {",
        *[f"  {name}: require('../../assets/audio/sfx/{name}.m4a')," for name in SFX],
        "} as const;",
        "",
        "export type SfxName = keyof typeof SFX_FILES;",
        "",
    ]
    AUDIO_MAP.write_text("\n".join(out))
    print(f"  wrote {AUDIO_MAP.relative_to(ROOT)}")


if __name__ == "__main__":
    args = sys.argv[1:]
    target = args[0] if args else "all"
    if target in ("all", "speech"):
        generate_speech(args[1:] if target == "speech" else [])
    if target in ("all", "sfx"):
        generate_sfx(args[1:] if target == "sfx" else [])
    write_audio_map()
