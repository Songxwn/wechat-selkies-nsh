"""Draws the app icon: a dark console tile with two neon "preview window"
cards (the preview wall) in emerald and cyan. Rendered at 4x and downsampled
with LANCZOS so the edges stay crisp. Pure Pillow, no other deps.

    python tools/make_icon.py
"""

from __future__ import annotations

import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

SIZE = 1024          # final icon size
SS = 4               # supersampling factor
S = SIZE * SS
OUT = Path(__file__).resolve().parent.parent / "icon.png"

BG_TOP = (10, 14, 26)
BG_BOTTOM = (4, 6, 13)
CYAN = (34, 211, 238)
EMERALD = (0, 230, 160)
WHITE = (226, 236, 245)


def px(v: float) -> int:
    """A point in the 1024 grid, scaled to the supersampled canvas."""
    return int(round(v * SS))


def lerp(a, b, t: float):
    return tuple(int(round(a[i] + (b[i] - a[i]) * t)) for i in range(3))


def rounded_mask(size: int, radius: int) -> Image.Image:
    m = Image.new("L", (size, size), 0)
    ImageDraw.Draw(m).rounded_rectangle([0, 0, size - 1, size - 1], radius=radius, fill=255)
    return m


def gradient(size: int, top, bottom) -> Image.Image:
    img = Image.new("RGB", (1, size))
    d = ImageDraw.Draw(img)
    for y in range(size):
        d.point((0, y), lerp(top, bottom, y / max(1, size - 1)))
    return img.resize((size, size), Image.NEAREST)


def radial_glow(size: int, center, radius: int, color, alpha: int) -> Image.Image:
    """A soft radial gradient as an RGBA layer."""
    layer = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    # Draw concentric circles, large to small, with an eased alpha ramp.
    steps = 96
    d = ImageDraw.Draw(layer)
    for i in range(steps, 0, -1):
        t = i / steps
        r = int(radius * t)
        a = int(alpha * (1 - t) ** 2.2)
        d.ellipse(
            [center[0] - r, center[1] - r, center[0] + r, center[1] + r],
            fill=(color[0], color[1], color[2], a),
        )
    return layer


def window_card(rect, radius, accent, fill_alpha, glow: bool) -> Image.Image:
    """A preview card: rounded pane, header dots, two content lines."""
    layer = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    x0, y0, x1, y1 = rect
    w = px(4)  # stroke width

    # Faint inner fill + accent stroke.
    d.rounded_rectangle([x0, y0, x1, y1], radius=radius,
                        fill=(accent[0], accent[1], accent[2], fill_alpha))
    d.rounded_rectangle([x0, y0, x1, y1], radius=radius,
                        outline=(accent[0], accent[1], accent[2], 235), width=w)

    # Header separator.
    head = y0 + px(46)
    d.line([x0 + px(3), head, x1 - px(3), head], fill=(accent[0], accent[1], accent[2], 90), width=px(2))

    # Three header dots.
    dot_r = px(7)
    cy = y0 + px(23)
    for i in range(3):
        cx = x0 + px(26) + i * px(24)
        d.ellipse([cx - dot_r, cy - dot_r, cx + dot_r, cy + dot_r],
                  fill=(accent[0], accent[1], accent[2], 255 if i == 0 else 130))

    # Content lines.
    line_h = px(9)
    pad = px(26)
    for i, frac in enumerate((0.78, 0.52)):
        ly = head + px(40) + i * px(34)
        d.rounded_rectangle(
            [x0 + pad, ly, x0 + pad + (x1 - x0 - 2 * pad) * frac, ly + line_h],
            radius=line_h // 2,
            fill=(WHITE[0], WHITE[1], WHITE[2], 105 if i == 0 else 60),
        )

    if glow:
        blurred = layer.filter(ImageFilter.GaussianBlur(px(26)))
        out = Image.new("RGBA", (S, S), (0, 0, 0, 0))
        out.alpha_composite(blurred)
        out.alpha_composite(blurred)
        out.alpha_composite(layer)
        return out
    return layer


def main() -> None:
    canvas = Image.new("RGBA", (S, S), (0, 0, 0, 0))

    # --- Background tile -------------------------------------------------
    bg = gradient(S, BG_TOP, BG_BOTTOM).convert("RGBA")
    mask = rounded_mask(S, px(224))
    canvas.paste(bg, (0, 0), mask)

    # Top glow behind the emblem.
    canvas.alpha_composite(radial_glow(S, (S // 2, px(120)), px(620), EMERALD, 46))
    canvas.alpha_composite(radial_glow(S, (px(760), px(880)), px(520), CYAN, 34))

    # Fine technical grid, clipped to the tile.
    grid = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    gd = ImageDraw.Draw(grid)
    step = px(64)
    for x in range(0, S, step):
        gd.line([x, 0, x, S], fill=(120, 200, 220, 12), width=px(1))
    for y in range(0, S, step):
        gd.line([0, y, S, y], fill=(120, 200, 220, 12), width=px(1))
    grid.putalpha(Image.composite(grid.getchannel("A"), Image.new("L", (S, S), 0), mask))
    canvas.alpha_composite(grid)

    # --- Emblem: two overlapping preview cards ---------------------------
    back = window_card(
        (px(196), px(268), px(628), px(596)),
        radius=px(64), accent=CYAN, fill_alpha=26, glow=True,
    )
    front = window_card(
        (px(396), px(430), px(828), px(758)),
        radius=px(64), accent=EMERALD, fill_alpha=34, glow=True,
    )
    canvas.alpha_composite(back)
    canvas.alpha_composite(front)

    # Accent underline: a short neon pair suggesting a live status bar.
    bar = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    bd = ImageDraw.Draw(bar)
    by = px(836)
    bd.rounded_rectangle([px(196), by, px(560), by + px(10)], radius=px(5),
                         fill=(EMERALD[0], EMERALD[1], EMERALD[2], 210))
    bd.rounded_rectangle([px(580), by, px(660), by + px(10)], radius=px(5),
                         fill=(CYAN[0], CYAN[1], CYAN[2], 150))
    canvas.alpha_composite(bar.filter(ImageFilter.GaussianBlur(px(3))))
    canvas.alpha_composite(bar)

    # Keep the tile's corners clean after the glow passes.
    final = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    final.paste(canvas, (0, 0), mask)

    icon = final.resize((SIZE, SIZE), Image.LANCZOS)
    icon.save(OUT, "PNG", optimize=True)
    print(f"wrote {OUT} ({icon.size[0]}x{icon.size[1]})")


if __name__ == "__main__":
    main()