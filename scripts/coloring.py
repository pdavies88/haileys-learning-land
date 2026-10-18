"""Turns full-color pictures into coloring-book line art, as smooth vector outlines.

    .art-venv/bin/python scripts/coloring.py <in.png> <out.svg> [<in.png> <out.svg> ...]

How it works: group the picture's colors into a few flat regions, merge tiny specks and similar
shades (so gradients don't leave stray lines), then draw even lines along the borders between
regions and around the outside. The lines are smoothed and traced into Bezier curves with
potrace, so they stay sharp at any size. The result is an SVG with one dark path.

Setup (once): python3 -m venv .art-venv && .art-venv/bin/pip install pillow numpy scipy potracer
potracer (GPL) runs only here, at build time; its output is ordinary vector data.
"""

from __future__ import annotations

import sys

import numpy as np
import potrace
from PIL import Image
from scipy import ndimage
from scipy.cluster.vq import kmeans2

LINE = (43, 43, 58)  # #2B2B3A
CLUSTERS = 14
MERGE_DISTANCE = 26  # RGB distance below which two shades count as the same area
MIN_AREA = 0.0012  # specks smaller than this share of the picture merge into a neighbor
LINE_RADIUS = 4.0  # pixels at 1024 px
SCALE = 2  # lines are drawn at twice the source size before tracing, for smoother curves
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


def line_mask(rgba: np.ndarray) -> np.ndarray:
    """Where the lines go, at SCALE times the source size, as a smooth-edged true/false image."""
    strokes = thin_dark_strokes(rgba)
    labels = regions(rgba)
    # Dark strokes become lines as they are. Give their pixels the label of the nearest area, so
    # the border between the two sides of a stroke isn't drawn twice.
    if strokes.any():
        _, (rows, cols) = ndimage.distance_transform_edt(strokes, return_indices=True)
        labels = labels[rows, cols]
    # Work at a larger size so the borders can be smoothed into curves rather than pixel steps.
    labels = np.kron(labels, np.ones((SCALE, SCALE), labels.dtype))
    labels = ndimage.median_filter(labels, size=2 * SCALE + 3)
    strokes = np.kron(strokes, np.ones((SCALE, SCALE), bool))
    edges = np.zeros(labels.shape, bool)
    edges[:, 1:] |= labels[:, 1:] != labels[:, :-1]
    edges[1:, :] |= labels[1:, :] != labels[:-1, :]
    edges |= strokes
    lines = ndimage.distance_transform_edt(~edges) <= LINE_RADIUS * SCALE
    # Blur the line shapes a little before cutting them out, so wobbly edges become smooth.
    return ndimage.gaussian_filter(lines.astype(float), 2.2 * SCALE) > 0.5


def line_art(rgba: np.ndarray) -> str:
    """The line art as an SVG document with one filled path."""
    mask = line_mask(rgba)
    # potracer traces the unset pixels, so hand it the inverse. Its curve-joining step can hit a
    # math error on rare shapes; trace those again without joining, which is only a little larger.
    try:
        curves = potrace.Bitmap(~mask).trace(turdsize=30, alphamax=1.25, opticurve=True, opttolerance=0.4)
    except ValueError:
        curves = potrace.Bitmap(~mask).trace(turdsize=30, alphamax=1.25, opticurve=False)
    parts = []
    for curve in curves:
        d = [f"M{curve.start_point.x:.0f} {curve.start_point.y:.0f}"]
        for seg in curve.segments:
            if seg.is_corner:
                d.append(f"L{seg.c.x:.0f} {seg.c.y:.0f}L{seg.end_point.x:.0f} {seg.end_point.y:.0f}")
            else:
                d.append(
                    f"C{seg.c1.x:.0f} {seg.c1.y:.0f} {seg.c2.x:.0f} {seg.c2.y:.0f} {seg.end_point.x:.0f} {seg.end_point.y:.0f}"
                )
        parts.append("".join(d) + "Z")
    height, width = mask.shape
    color = "#%02X%02X%02X" % LINE
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}">'
        f'<path fill="{color}" fill-rule="evenodd" d="{"".join(parts)}"/></svg>\n'
    )


if __name__ == "__main__":
    args = sys.argv[1:]
    for source, target in zip(args[::2], args[1::2]):
        image = np.array(Image.open(source).convert("RGBA"))
        with open(target, "w") as out:
            out.write(line_art(image))
        print(f"wrote {target}")
