#!/usr/bin/env python3
"""Generate square Expo app icons from the AWW Laundry logo source."""

from __future__ import annotations

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT.parent / "app logo" / "Gemini_Generated_Image_dfuscodfuscodfus.png"
OUT = ROOT / "apps" / "mobile" / "assets"
BG = (250, 250, 248, 255)  # #FAFAF8


def make_square_icon(size: int, logo_scale: float, filename: str) -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    canvas = Image.new("RGBA", (size, size), BG)
    logo = Image.open(SRC).convert("RGBA")
    max_w = int(size * logo_scale)
    ratio = max_w / logo.width
    new_size = (max_w, int(logo.height * ratio))
    logo = logo.resize(new_size, Image.Resampling.LANCZOS)
    x = (size - new_size[0]) // 2
    y = (size - new_size[1]) // 2
    canvas.paste(logo, (x, y), logo)
    canvas.convert("RGB").save(OUT / filename, format="PNG", optimize=True)
    print(f"created {OUT / filename} ({size}x{size})")


def main() -> None:
    if not SRC.exists():
        raise SystemExit(f"Logo source not found: {SRC}")
    make_square_icon(1024, 0.88, "icon.png")
    make_square_icon(1024, 0.72, "adaptive-icon.png")
    make_square_icon(1024, 0.78, "splash-icon.png")
    make_square_icon(48, 0.88, "favicon.png")


if __name__ == "__main__":
    main()
