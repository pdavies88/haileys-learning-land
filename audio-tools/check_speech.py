"""Listens to the narrator lines with Whisper and flags any that don't say what they should.

    .tts2/venv-chatterbox/bin/python audio-tools/check_speech.py            # every spoken line
    .tts2/venv-chatterbox/bin/python audio-tools/check_speech.py id [id ...]

Voice models occasionally repeat a word, drop the end of a sentence or mumble. This transcribes each
.m4a in assets/audio/speech/ and compares the words with audio-tools/speech.json. Lines that match
less than THRESHOLD are listed in .cache/speech-check.json, ready to be spoken again with
generate_speech_qwen.py --retry. Needs a venv with transformers, torch, soundfile and numpy (the
.tts2 Chatterbox venv has them) and downloads openai/whisper-small.en once.
"""

from __future__ import annotations

import difflib
import json
import re
import subprocess
import sys
import tempfile
from pathlib import Path

import numpy as np
import soundfile as sf

ROOT = Path(__file__).resolve().parent.parent
SPEECH_LIST = ROOT / "audio-tools" / "speech.json"
AUDIO = ROOT / "assets" / "audio" / "speech"
REPORT = ROOT / ".cache" / "speech-check.json"
THRESHOLD = 0.8

NUMBERS = "zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen twenty".split()


def words(text: str) -> list[str]:
    text = text.lower().replace("’", "'")
    out = []
    for w in re.findall(r"[a-z0-9']+", text):
        out.append(NUMBERS[int(w)] if w.isdigit() and int(w) <= 20 else w.strip("'"))
    return [w for w in out if w]


def load(path: Path) -> np.ndarray:
    with tempfile.TemporaryDirectory() as tmp:
        wav = Path(tmp) / "a.wav"
        subprocess.run(["afconvert", "-f", "WAVE", "-d", "LEI16@16000", "-c", "1", str(path), str(wav)], check=True)
        audio, _ = sf.read(wav)
    return audio.astype(np.float32)


def main() -> None:
    from transformers import pipeline

    asr = pipeline("automatic-speech-recognition", model="openai/whisper-small.en", device="cpu")
    lines = json.loads(SPEECH_LIST.read_text())
    ids = [sid for sid, text in lines.items() if not text.startswith("/") and (not sys.argv[1:] or sid in sys.argv[1:])]
    flagged = {}
    for i, sid in enumerate(ids, start=1):
        heard = asr(load(AUDIO / f"{sid}.m4a"))["text"]
        score = difflib.SequenceMatcher(None, words(lines[sid]), words(heard)).ratio()
        if score < THRESHOLD:
            flagged[sid] = {"text": lines[sid], "heard": heard.strip(), "score": round(score, 2)}
            print(f"  ? {sid}: heard {heard.strip()!r} ({score:.2f})", flush=True)
        if i % 100 == 0:
            print(f"  checked {i}/{len(ids)}", flush=True)
    REPORT.write_text(json.dumps(flagged, indent=2))
    print(f"{len(flagged)} of {len(ids)} lines need another look; listed in {REPORT.relative_to(ROOT)}", flush=True)


if __name__ == "__main__":
    main()
