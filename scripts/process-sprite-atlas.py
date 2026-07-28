#!/usr/bin/env python3
"""Split a transparent sprite atlas into normalized WebP assets."""

from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True, type=Path)
    parser.add_argument("--output-dir", required=True, type=Path)
    parser.add_argument("--columns", required=True, type=int)
    parser.add_argument("--rows", required=True, type=int)
    parser.add_argument("--names", required=True)
    parser.add_argument("--size", type=int, default=512)
    parser.add_argument("--padding", type=float, default=0.035)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    names = [name.strip() for name in args.names.split(",") if name.strip()]
    expected = args.columns * args.rows
    if len(names) != expected:
        raise SystemExit(f"Expected {expected} names, received {len(names)}")

    atlas = Image.open(args.input).convert("RGBA")
    args.output_dir.mkdir(parents=True, exist_ok=True)
    cell_width = atlas.width / args.columns
    cell_height = atlas.height / args.rows
    inset = max(1, round(args.size * args.padding))

    for index, name in enumerate(names):
        column = index % args.columns
        row = index // args.columns
        left = round(column * cell_width)
        top = round(row * cell_height)
        right = round((column + 1) * cell_width)
        bottom = round((row + 1) * cell_height)
        cell = atlas.crop((left, top, right, bottom))
        alpha_box = cell.getchannel("A").getbbox()
        if alpha_box is None:
            raise SystemExit(f"Sprite {name} has no visible pixels")

        sprite = cell.crop(alpha_box)
        available = args.size - inset * 2
        scale = min(available / sprite.width, available / sprite.height)
        resized = sprite.resize(
            (max(1, round(sprite.width * scale)), max(1, round(sprite.height * scale))),
            Image.Resampling.LANCZOS,
        )
        canvas = Image.new("RGBA", (args.size, args.size), (0, 0, 0, 0))
        x = (args.size - resized.width) // 2
        y = args.size - inset - resized.height
        canvas.alpha_composite(resized, (x, y))
        canvas.save(
            args.output_dir / f"{name}.webp",
            "WEBP",
            lossless=True,
            quality=95,
            method=6,
        )


if __name__ == "__main__":
    main()
