"""Generate the deterministic Jungle Jumper runtime UI raster set.

The generated concept sheet lives in art-source/ui; this script redraws the
runtime pieces on the project's strict pixel grid and approved palette.
"""

from pathlib import Path
from PIL import Image, ImageDraw


OUT = Path(__file__).resolve().parents[1] / "public" / "assets" / "ui"
OUT.mkdir(parents=True, exist_ok=True)

INK = "#211936"
WARM = "#3D2440"
SHADOW = "#334B68"
GREEN = "#2ECC71"
GREEN_DARK = "#1E8449"
TEAL = "#2E8B7A"
GOLD = "#F1C40F"
GOLD_DARK = "#B77910"
CREAM = "#FFE6A3"
WHITE = "#FFFFFF"
RED = "#C0392B"
BLUE = "#00BFFF"
BROWN = "#6B4A7B"
BROWN_DARK = "#4A2A5A"


def canvas(size):
    return Image.new("RGBA", size, (0, 0, 0, 0))


def save(image, name):
    image.save(OUT / f"{name}.png", optimize=True)


def pixel_panel(size, fill, edge=INK, accent=CREAM, corner=6, inner=None):
    w, h = size
    im = canvas(size)
    d = ImageDraw.Draw(im)
    # Stepped, not antialiased, corners.
    d.rectangle((corner, 0, w - corner - 1, h - 1), fill=edge)
    d.rectangle((0, corner, w - 1, h - corner - 1), fill=edge)
    d.rectangle((corner - 2, 2, w - corner + 1, h - 3), fill=fill)
    d.rectangle((2, corner - 2, w - 3, h - corner + 1), fill=fill)
    if inner:
        d.rectangle((5, 6, w - 6, h - 6), fill=inner)
    d.line((corner, 3, w - corner - 1, 3), fill=accent, width=2)
    d.line((3, corner, 3, h - corner - 1), fill=accent, width=2)
    d.line((corner, h - 4, w - corner - 1, h - 4), fill=WARM, width=2)
    return im


def button(size, state, small=False):
    base = GREEN if state != "pressed" else GREEN_DARK
    accent = GOLD if state == "focused" else CREAM
    im = pixel_panel(size, base, accent=accent, corner=5 if small else 7)
    d = ImageDraw.Draw(im)
    w, h = size
    if state == "focused":
        d.rectangle((5, 5, w - 6, h - 6), outline=GOLD, width=2)
        d.polygon([(0, h // 2), (5, h // 2 - 4), (5, h // 2 + 4)], fill=CREAM)
        d.polygon([(w - 1, h // 2), (w - 6, h // 2 - 4), (w - 6, h // 2 + 4)], fill=CREAM)
    if state == "pressed":
        d.rectangle((5, 4, w - 6, 7), fill=GREEN_DARK)
        d.line((7, h - 4, w - 8, h - 4), fill=INK, width=2)
    return im


for prefix, size in (("button-large", (180, 50)), ("button-small", (120, 40))):
    for state in ("normal", "focused", "pressed"):
        save(button(size, state, prefix.endswith("small")), f"{prefix}-{state}")

# Nine-slice source textures; 8 px and 12 px corners remain fixed at runtime.
save(pixel_panel((32, 32), BROWN, accent=CREAM, corner=7, inner="#8B5A72"), "panel-nine-slice")
save(pixel_panel((48, 48), WARM, accent=GOLD, corner=9, inner="#17142A"), "modal-nine-slice")

for state, fill in (("normal", BROWN), ("focused", TEAL), ("pressed", GREEN_DARK)):
    save(pixel_panel((96, 32), fill, accent=GOLD if state == "focused" else CREAM, corner=5), f"tab-{state}")

def frame(state):
    im = canvas((80, 80))
    d = ImageDraw.Draw(im)
    color = GOLD if state in ("focused", "selected") else SHADOW
    width = 4 if state == "selected" else 3
    d.rectangle((2, 2, 77, 77), outline=INK, width=2)
    d.rectangle((5, 5, 74, 74), outline=color, width=width)
    if state == "focused":
        for x, y, sx, sy in ((0, 0, 1, 1), (79, 0, -1, 1), (0, 79, 1, -1), (79, 79, -1, -1)):
            d.line((x, y, x + sx * 12, y), fill=CREAM, width=3)
            d.line((x, y, x, y + sy * 12), fill=CREAM, width=3)
    if state == "selected":
        d.rectangle((9, 9, 70, 70), fill=(241, 196, 15, 34))
    return im

for state in ("normal", "focused", "selected"):
    save(frame(state), f"selection-frame-{state}")

def keycap(focused=False):
    return pixel_panel((32, 26), SHADOW if not focused else TEAL, accent=GOLD if focused else WHITE, corner=4)

save(keycap(False), "keycap-normal")
save(keycap(True), "keycap-focused")

def prompt(kind, focused=False):
    im = canvas((28, 28))
    d = ImageDraw.Draw(im)
    edge = GOLD if focused else INK
    if kind == "dpad":
        d.rectangle((9, 2, 18, 25), fill=edge)
        d.rectangle((2, 9, 25, 18), fill=edge)
        d.rectangle((11, 5, 16, 22), fill=WARM)
        d.rectangle((5, 11, 22, 16), fill=WARM)
    else:
        d.ellipse((2, 2, 25, 25), fill=edge)
        d.ellipse((5, 5, 22, 22), fill=GREEN if kind == "a" else RED)
    return im

for kind in ("a", "b", "dpad"):
    for state in ("normal", "focused"):
        save(prompt(kind, state == "focused"), f"gamepad-{kind}-{state}")

def toggle(on, focused=False):
    im = pixel_panel((48, 24), GREEN if on else WARM, accent=GOLD if focused else CREAM, corner=5)
    d = ImageDraw.Draw(im)
    x = 34 if on else 14
    d.rectangle((x - 6, 6, x + 6, 18), fill=INK)
    d.rectangle((x - 4, 5, x + 4, 16), fill=WHITE)
    return im

for state in ("off", "on", "off-focused", "on-focused"):
    save(toggle(state.startswith("on"), state.endswith("focused")), f"toggle-{state}")

track = canvas((96, 16)); td = ImageDraw.Draw(track)
td.rectangle((2, 5, 93, 11), fill=INK); td.rectangle((5, 7, 90, 9), fill=GREEN)
save(track, "slider-track")
knob = pixel_panel((20, 20), GOLD, accent=WHITE, corner=4); save(knob, "slider-knob")

for name, fill in (("gold", GOLD), ("silver", "#AAB4C8"), ("bronze", "#B8734B")):
    save(pixel_panel((48, 24), fill, accent=WHITE, corner=5), f"badge-{name}")

save(pixel_panel((144, 42), WARM, accent=GOLD, corner=7, inner="#17142A"), "score-plaque")

height = canvas((64, 24)); hd = ImageDraw.Draw(height)
hd.rectangle((0, 9, 51, 14), fill=INK); hd.rectangle((3, 11, 51, 12), fill=CREAM)
hd.polygon([(63, 12), (49, 3), (49, 21)], fill=GOLD)
save(height, "height-marker")

def pause(state):
    im = pixel_panel((36, 36), WARM if state == "pressed" else GREEN, accent=GOLD if state == "focused" else CREAM, corner=6)
    d = ImageDraw.Draw(im); off = 1 if state == "pressed" else 0
    d.rectangle((11, 9 + off, 15, 25 + off), fill=WHITE)
    d.rectangle((21, 9 + off, 25, 25 + off), fill=WHITE)
    return im

for state in ("normal", "focused", "pressed"):
    save(pause(state), f"pause-{state}")

def status(kind):
    im = canvas((20, 20)); d = ImageDraw.Draw(im)
    if kind == "shield":
        d.polygon([(10, 1), (18, 5), (16, 14), (10, 19), (4, 14), (2, 5)], fill=INK)
        d.polygon([(10, 4), (15, 6), (14, 13), (10, 16), (6, 13), (5, 6)], fill=BLUE)
    elif kind == "warning":
        d.polygon([(10, 1), (19, 18), (1, 18)], fill=INK)
        d.polygon([(10, 5), (16, 16), (4, 16)], fill=GOLD)
        d.rectangle((9, 8, 11, 12), fill=INK); d.point((10, 14), fill=INK)
    else:
        d.ellipse((1, 1, 18, 18), fill=INK); d.ellipse((4, 4, 15, 15), fill=GREEN)
        d.line((6, 10, 9, 13, 15, 6), fill=WHITE, width=2)
    return im

for kind in ("shield", "warning", "check"):
    save(status(kind), f"status-{kind}")

def touch(kind, pressed=False):
    im = canvas((64, 64)); d = ImageDraw.Draw(im)
    d.ellipse((2, 2, 61, 61), fill=INK)
    d.ellipse((6, 6, 57, 57), fill=(30, 107, 90, 220) if pressed else (46, 139, 122, 190))
    if kind == "left": pts = [(22, 32), (39, 19), (39, 45)]
    elif kind == "right": pts = [(42, 32), (25, 19), (25, 45)]
    else: pts = [(32, 17), (45, 36), (37, 36), (37, 47), (27, 47), (27, 36), (19, 36)]
    d.polygon(pts, fill=CREAM)
    return im

for kind in ("left", "right", "jump"):
    save(touch(kind, False), f"touch-{kind}-normal")
    save(touch(kind, True), f"touch-{kind}-pressed")

print(f"Generated {len(list(OUT.glob('*.png')))} UI assets in {OUT}")
