"""Speaks every narrator line with Qwen3-TTS, in one consistent voice. Nothing is downloaded at runtime.

    .tts2/venv-qwen/bin/python audio-tools/generate_speech_qwen.py            # every line still to do
    .tts2/venv-qwen/bin/python audio-tools/generate_speech_qwen.py id [id ...]  # just these lines
    .tts2/venv-qwen/bin/python audio-tools/generate_speech_qwen.py --limit 20   # a quick test batch
    .tts2/venv-qwen/bin/python audio-tools/generate_speech_qwen.py --retry 1    # speak again the lines
                                                       # check_speech.py flagged, with another seed

The narrator was designed once with Qwen3-TTS VoiceDesign ("a warm, gentle, cheerful female voice
reading to a five-year-old, speaking slowly and clearly with a smile"). That clip,
audio-tools/narrator-reference.wav, is cloned for every line by the Qwen3-TTS 0.6B Base model
(Apache 2.0), so all lines share one voice. Lines come from audio-tools/speech.json (run
`npm run generate:speech-list` first). Letter sounds (lines starting with "/") are phonemes, which
Qwen can't read; audio-tools/generate_audio.py speaks those with Kokoro.

Each line is cached by model, reference and text in .cache/qwen-tts/, so a stopped run picks up
where it left off and an unchanged line is never spoken twice. Output is AAC (.m4a) in
assets/audio/speech/, encoded with macOS's afconvert.

Setup (once): python3 -m venv .tts2/venv-qwen && .tts2/venv-qwen/bin/pip install qwen-tts soundfile
"""

from __future__ import annotations

import hashlib
import json
import random
import subprocess
import sys
import tempfile
import time
from pathlib import Path

import numpy as np
import soundfile as sf

ROOT = Path(__file__).resolve().parent.parent
SPEECH_LIST = ROOT / "audio-tools" / "speech.json"
OUT = ROOT / "assets" / "audio" / "speech"
CACHE = ROOT / ".cache" / "qwen-tts"
REFERENCE = ROOT / "audio-tools" / "narrator-reference.wav"
REFERENCE_TEXT = (
    "Once upon a time on a little farm near a little village there lived a little chicken called Daisy. "
    "When I grow up, I want to fly high, high into the sky, Daisy said."
)
MODEL = "Qwen/Qwen3-TTS-12Hz-0.6B-Base"
# A few single words Qwen says unclearly stay with Kokoro (see generate_audio.py).
KOKORO_LINES = set(json.loads((ROOT / "audio-tools" / "kokoro-lines.json").read_text())["lines"])
SEED = 42


def cache_path(text: str) -> Path:
    ref = hashlib.sha1(REFERENCE.read_bytes()).hexdigest()[:12]
    key = hashlib.sha1(f"{MODEL}|{ref}|{SEED}|{text}".encode()).hexdigest()
    return CACHE / f"{key}.npy"


def encode(audio: np.ndarray, sr: int, out_path: Path) -> None:
    """Trims silence at the ends, evens out the volume and writes AAC, like the Kokoro lines."""
    audio = np.asarray(audio, dtype=np.float64).reshape(-1)
    peak = float(np.max(np.abs(audio))) or 1.0
    loud = np.flatnonzero(np.abs(audio) > 0.01 * peak)
    if len(loud):
        audio = audio[max(0, loud[0] - int(0.02 * sr)) : loud[-1] + int(0.08 * sr)]
    audio = audio / peak * 10 ** (-1.5 / 20)
    with tempfile.TemporaryDirectory() as tmp:
        wav = Path(tmp) / "in.wav"
        sf.write(wav, audio.astype(np.float32), sr, subtype="PCM_16")
        subprocess.run(["afconvert", "-f", "m4af", "-d", "aac", "-b", "40000", str(wav), str(out_path)], check=True)


def main() -> None:
    args = sys.argv[1:]
    limit = None
    seed = SEED
    retry = False
    if args[:1] == ["--limit"]:
        limit = int(args[1])
        args = args[2:]
    if args[:1] == ["--retry"]:
        # A different seed gives a different take of the same line; the new take replaces the old.
        retry = True
        seed = SEED + int(args[1])
        args = list(json.loads((ROOT / ".cache" / "speech-check.json").read_text()))
    lines = json.loads(SPEECH_LIST.read_text())
    todo = [(sid, text) for sid, text in lines.items() if not text.startswith("/") and sid not in KOKORO_LINES and (not args or sid in args)]
    CACHE.mkdir(parents=True, exist_ok=True)
    OUT.mkdir(parents=True, exist_ok=True)

    # Lines already spoken in this voice only need encoding (fast); the rest need the model.
    fresh = todo if retry else [(sid, text) for sid, text in todo if not cache_path(text).exists()]
    if limit is not None:
        fresh = fresh[:limit]
    print(f"{len(todo)} lines in this voice, {len(fresh)} still to speak", flush=True)

    model = prompt = None
    if fresh:
        import torch
        from qwen_tts import Qwen3TTSModel

        device = "mps" if torch.backends.mps.is_available() else "cpu"
        model = Qwen3TTSModel.from_pretrained(MODEL, device_map=device, dtype=torch.bfloat16, attn_implementation="sdpa")
        prompt = model.create_voice_clone_prompt(ref_audio=str(REFERENCE), ref_text=REFERENCE_TEXT, x_vector_only_mode=False)
        print(f"loaded {MODEL} on {device}", flush=True)

        start = time.time()
        for i, (sid, text) in enumerate(fresh, start=1):
            random.seed(seed)
            np.random.seed(seed)
            torch.manual_seed(seed)
            wavs, sr = model.generate_voice_clone(text=text, language="English", voice_clone_prompt=prompt)
            audio = np.asarray(wavs[0], dtype=np.float32)
            np.save(cache_path(text), np.concatenate([[float(sr)], audio]).astype(np.float32))
            encode(audio, sr, OUT / f"{sid}.m4a")
            if i % 10 == 0 or i == len(fresh):
                per = (time.time() - start) / i
                print(f"  {i}/{len(fresh)} spoken, about {round(per * (len(fresh) - i) / 60)} min left", flush=True)

    # Encode cached lines whose .m4a is missing or older than the cache (for example after a revert).
    for sid, text in todo:
        cached = cache_path(text)
        out = OUT / f"{sid}.m4a"
        if cached.exists() and (not out.exists() or out.stat().st_mtime < cached.stat().st_mtime):
            data = np.load(cached)
            encode(data[1:], int(data[0]), out)
    print("done", flush=True)


if __name__ == "__main__":
    main()
