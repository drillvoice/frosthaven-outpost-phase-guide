"""Regenerates the PNG app icons in public/icons (needs Pillow)."""
from pathlib import Path
from PIL import Image, ImageDraw

OUT = Path(__file__).resolve().parent.parent / "public" / "icons"
BG, ICE, GREEN = "#11161d", "#79c7ff", "#63c98f"


def draw(size: int, padding: float = 0.0, rounded: bool = True) -> Image.Image:
    s = 4 * size  # supersample, then downscale for smooth edges
    img = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    if rounded:
        d.rounded_rectangle([0, 0, s - 1, s - 1], radius=s * 96 // 512, fill=BG)
    else:
        d.rectangle([0, 0, s, s], fill=BG)
    k = s * (1 - 2 * padding) / 512
    o = s * padding
    p = lambda x, y: (o + x * k, o + y * k)
    w = max(1, round(20 * k))
    for a, b in [((256, 92), (256, 420)), ((114, 174), (398, 338)), ((114, 338), (398, 174))]:
        d.line([p(*a), p(*b)], fill=ICE, width=w)
    for pts in [[(226, 112), (256, 138), (286, 112)], [(226, 400), (256, 374), (286, 400)]]:
        d.line([p(*q) for q in pts], fill=ICE, width=w, joint="curve")
    r = 96 * k
    cx, cy = p(256, 256)
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=BG, outline=ICE, width=w)
    d.line([p(212, 258), p(244, 290), p(304, 226)], fill=GREEN, width=round(26 * k), joint="curve")
    return img.resize((size, size), Image.LANCZOS)


OUT.mkdir(parents=True, exist_ok=True)
draw(192).save(OUT / "icon-192.png")
draw(512).save(OUT / "icon-512.png")
draw(512, padding=0.1, rounded=False).save(OUT / "icon-maskable-512.png")
draw(180, rounded=False).save(OUT / "apple-touch-icon.png")
print("icons written to", OUT)
