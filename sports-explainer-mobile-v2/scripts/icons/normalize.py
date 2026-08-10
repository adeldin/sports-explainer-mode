#!/usr/bin/env python3
"""Normalize generated artwork into real, correctly-sized PNGs.

    python3 scripts/icons/normalize.py [--check]

WHY THIS EXISTS — two things the generators get wrong, both silent:

1. WRONG FORMAT. Recraft's removeBackground returns WEBP data no matter what response_format asks
   for, and we were saving it as `.png`. `file` reports "RIFF ... Web/P image" on every stripped
   icon. A mislabeled asset is a landmine: Metro keys behaviour off the extension, so it may bundle
   fine on one platform and fail on another, and nothing warns you at build time.

2. WRONG SIZE. Generators emit 1024x1024, ~500-900kb each. Thirty-six icons plus characters is
   ~25MB of app bundle for art drawn at 28-56 points. Every user pays that on install.

Pillow is used rather than `sips` because sips cannot WRITE webp ("Can't write format:
org.webmproject.webp") and therefore cannot fix problem 1 at all — it was the wrong tool.

Idempotent: already-correct files are left alone, so this is safe to run after every generate.
"""
import os
import sys
from PIL import Image

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..")
TARGETS = [
    (os.path.join(ROOT, "assets", "icons"), 256, "icons"),
    (os.path.join(ROOT, "assets", "characters"), 512, "characters"),
]
check = "--check" in sys.argv

before_total = after_total = 0
fixed_format = resized = 0

for directory, target_px, label in TARGETS:
    if not os.path.isdir(directory):
        continue
    files = sorted(f for f in os.listdir(directory) if f.endswith(".png"))
    if not files:
        continue
    print(f"\n{label} -> {target_px}px")
    for name in files:
        path = os.path.join(directory, name)
        before = os.path.getsize(path)
        before_total += before

        with Image.open(path) as im:
            fmt = im.format                      # the TRUE format, not the extension
            w, h = im.size
            has_alpha = im.mode in ("RGBA", "LA") or "transparency" in im.info
            needs_format = fmt != "PNG"
            needs_resize = max(w, h) > target_px

            if check:
                flag = []
                if needs_format: flag.append(f"format={fmt}")
                if needs_resize: flag.append(f"{w}px")
                if not has_alpha: flag.append("NO ALPHA")
                print(f"  {name:<20} {before//1024:>4}kb  {' '.join(flag) or 'ok'}")
                after_total += before
                continue

            if not needs_format and not needs_resize:
                print(f"  {name:<20} already ok")
                after_total += before
                continue

            out = im.convert("RGBA")             # preserve/introduce an alpha channel
            if needs_resize:
                scale = target_px / max(w, h)
                out = out.resize((max(1, round(w * scale)), max(1, round(h * scale))), Image.LANCZOS)

        out.save(path, format="PNG", optimize=True)
        after = os.path.getsize(path)
        after_total += after
        if needs_format: fixed_format += 1
        if needs_resize: resized += 1
        note = []
        if needs_format: note.append(f"{fmt}->PNG")
        if needs_resize: note.append(f"{w}->{target_px}px")
        print(f"  {name:<20} {before//1024:>4}kb -> {after//1024:>4}kb  ({', '.join(note)})")

mb = lambda n: f"{n/1024/1024:.2f}MB"
if check:
    print(f"\ncurrent total: {mb(before_total)}")
else:
    print(f"\nformat fixed: {fixed_format}   resized: {resized}")
    print(f"total: {mb(before_total)} -> {mb(after_total)}")
