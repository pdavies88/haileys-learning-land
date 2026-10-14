"""Turns full-color pictures into coloring-book line art.

    .art-venv/bin/python scripts/coloring.py <in.png> <out.png> [<in.png> <out.png> ...]

How it works: group the picture's colors into a few flat regions, merge tiny specks and similar
shades (so gradients don't leave stray lines), then draw smooth, even lines along the borders
between regions and around the outside. The result is a transparent PNG with dark lines and
closed areas that are easy to color.

Setup (once): python3 -m venv .art-venv && .art-venv/bin/pip install pillow numpy scipy
"""

from __future__ import annotations

import sys

import numpy as np
from PIL import Image
from scipy import ndimage
from scipy.cluster.vq import kmeans2

LINE = (43, 43, 58)  # #2B2B3A
CLUSTERS = 14
MERGE_DISTANCE = 26  # RGB distance below which two shades count as the same area
MIN_AREA = 0.0012  # specks smaller than this share of the picture merge into a neighbor
LINE_RADIUS = 4.2  # pixels at 1024 px
DARK = 70  # luminance below which a thin stroke in the artwork is already a line


def regions(rgba: np.ndarray) -> np.ndarray:
    inside = rgba[..., 3] > 128
    pixels = rgba[..., :3][inside].astype(float)
    rng = np.random.default_rng(1)
    sample = pixels[rng.choice(len(pixels), min(len(pixels), 40000), replace=False)]
    centers, _ = kmeans2(sample, CLUSTERS, minit="++", seed=1)

    # Merge shades that are close together, such as the steps of a gradient.
    groups = list(range(len(centers)))
    for i in range(len(centers)):
        for j in range(i):
            if np.linalg.norm(centers[i] - centers[j]) < MERGE_DISTANCE:
                old, new = groups[i], groups[j]
                groups = [new if g == old else g for g in groups]
    distances = np.linalg.norm(rgba[..., :3][..., None, :].astype(float) - centers[None, None], axis=-1)
    labels = np.array(groups)[np.argmin(distances, axis=-1)] + 1
    labels[~inside] = 0

    # Smooth ragged anti-aliased edges, then fold small specks into the surrounding area.
    labels = ndimage.median_filter(labels, size=5)
    min_area = MIN_AREA * labels.size
    for _ in range(3):
        changed = False
        for value in np.unique(labels):
            if value == 0:
                continue
            parts, count = ndimage.label(labels == value)
            sizes = ndimage.sum(np.ones_like(parts), parts, range(1, count + 1))
            for index, size in enumerate(sizes, start=1):
                if size >= min_area:
                    continue
                part = parts == index
                ring = ndimage.binary_dilation(part, iterations=2) & ~part
                neighbors = labels[ring]
                if len(neighbors):
                    labels[part] = np.bincount(neighbors).argmax()
                    changed = True
        if not changed:
            break
    return labels


def thin_dark_strokes(rgba: np.ndarray) -> np.ndarray:
    """The artwork's own dark outlines and details (whiskers, eyes, mouths): dark and thin."""
    luminance = rgba[..., :3].astype(float) @ np.array([0.299, 0.587, 0.114])
    dark = (luminance < DARK) & (rgba[..., 3] > 128)
    return dark & ~ndimage.binary_opening(dark, iterations=7)


def line_art(rgba: np.ndarray) -> Image.Image:
    strokes = thin_dark_strokes(rgba)
    labels = regions(rgba)
    # Dark strokes become lines as they are. Give their pixels the label of the nearest area, so
    # the border between the two sides of a stroke isn't drawn twice.
    if strokes.any():
        _, (rows, cols) = ndimage.distance_transform_edt(strokes, return_indices=True)
        labels = labels[rows, cols]
    edges = np.zeros(labels.shape, bool)
    edges[:, 1:] |= labels[:, 1:] != labels[:, :-1]
    edges[1:, :] |= labels[1:, :] != labels[:-1, :]
    # Thicken into lines, then soften so they look drawn rather than pixelated.
    edges |= strokes
    distance = ndimage.distance_transform_edt(~edges)
    alpha = np.clip((LINE_RADIUS + 0.8 - distance) / 1.6, 0, 1)
    alpha = ndimage.gaussian_filter(alpha, 0.7)
    out = np.zeros((*labels.shape, 4), np.uint8)
    out[..., :3] = LINE
    out[..., 3] = (np.clip(alpha * 1.15, 0, 1) * 255).astype(np.uint8)
    return Image.fromarray(out, "RGBA")


if __name__ == "__main__":
    args = sys.argv[1:]
    for source, target in zip(args[::2], args[1::2]):
        image = np.array(Image.open(source).convert("RGBA"))
        line_art(image).save(target, optimize=True)
        print(f"wrote {target}")
