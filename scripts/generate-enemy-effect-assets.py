"""Build native-grid enemy and effect sheets from the approved Jungle Jumper palette."""

from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
ENEMIES = ROOT / "public" / "assets" / "enemies"
EFFECTS = ROOT / "public" / "assets" / "effects"

C = {
    "outline": "#211936", "warm_outline": "#3D2440", "highlight": "#FFE6A3",
    "white": "#FFFFFF", "snake": "#27AE60", "snake_dark": "#1E8449",
    "vine": "#1E6B5A", "coconut": "#8B4513", "coconut_dark": "#5C3317",
    "thorn": "#C0392B", "bat": "#4A235A", "wing": "#6C3483",
    "shield": "#00BFFF", "shield_glow": "#87CEFA", "spring": "#F1C40F",
    "orange": "#F39C12",
}


def sheet(frame_size, frames):
    image = Image.new("RGBA", (frame_size * len(frames), frame_size), (0, 0, 0, 0))
    for index, render in enumerate(frames):
        frame = Image.new("RGBA", (frame_size, frame_size), (0, 0, 0, 0))
        render(ImageDraw.Draw(frame, "RGBA"), index)
        image.alpha_composite(frame, (index * frame_size, 0))
    return image


def px(draw, box, color):
    draw.rectangle(box, fill=color)


def snake(draw, i):
    if i >= 6:
        y = 25 + (i - 6)
        draw.ellipse((3, y - 5, 29, y + 2), fill=C["outline"])
        draw.ellipse((5, y - 4, 27, y), fill=C["snake_dark"])
        draw.rectangle((7, y - 4, 24, y - 2), fill=C["snake"])
        px(draw, (24, y - 3, 26, y - 2), C["highlight"] if i == 6 else C["outline"])
        return
    bob = (0, 1, 0, -2, -1, 1)[i]
    raised = i in (3, 4)
    recoil = i == 5
    body = [(3, 24), (6, 21), (10, 21 + bob), (14, 24), (18, 25), (23, 24), (28, 21)]
    draw.line(body, fill=C["outline"], width=7, joint="curve")
    draw.line(body, fill=C["snake_dark"], width=5, joint="curve")
    draw.line(body[:-1], fill=C["snake"], width=3, joint="curve")
    hx = 24 if not recoil else 20
    hy = (10 if raised else 16 + bob) + (2 if recoil else 0)
    draw.line((25, 22, hx, hy + 3), fill=C["outline"], width=7)
    draw.line((25, 22, hx, hy + 3), fill=C["snake_dark"], width=5)
    draw.ellipse((hx - 5, hy - 4, hx + 5, hy + 4), fill=C["outline"])
    draw.ellipse((hx - 4, hy - 3, hx + 4, hy + 3), fill=C["snake"])
    px(draw, (hx + 1, hy - 2, hx + 2, hy - 1), C["highlight"])
    px(draw, (hx + 2, hy - 1, hx + 3, hy), C["outline"])
    if i == 4:
        px(draw, (hx + 5, hy + 1, hx + 9, hy + 1), C["thorn"])
        px(draw, (hx + 8, hy, hx + 10, hy), C["thorn"])
        px(draw, (hx + 8, hy + 2, hx + 10, hy + 2), C["thorn"])
    if recoil:
        px(draw, (26, 8, 27, 10), C["thorn"])
        px(draw, (29, 12, 30, 13), C["thorn"])


def coconut(draw, i):
    if i == 7:
        draw.ellipse((3, 23, 14, 29), fill=C["outline"])
        draw.ellipse((18, 22, 29, 29), fill=C["outline"])
        draw.polygon([(5, 25), (12, 21), (14, 28)], fill=C["coconut"])
        draw.polygon([(19, 28), (20, 21), (28, 25)], fill=C["coconut"])
        return
    shake = (0, 1, -1, 0, 0, 1, 0)[i]
    y = 15 + (2 if i in (4, 5) else 0)
    draw.ellipse((5 + shake, y - 10, 27 + shake, y + 12), fill=C["outline"])
    draw.ellipse((7 + shake, y - 8, 25 + shake, y + 10), fill=C["coconut_dark"])
    draw.polygon([(9 + shake, y - 7), (18 + shake, y - 8), (23 + shake, y + 7), (13 + shake, y + 9)], fill=C["coconut"])
    px(draw, (10 + shake, y - 5, 12 + shake, y), C["highlight"])
    for x, yy in ((13, 3), (19, 3), (16, 7)):
        px(draw, (x + shake, y + yy - 1, x + shake + 1, y + yy), C["outline"])
    if i in (1, 2):
        px(draw, (2, 13, 3, 18), C["warm_outline"])
        px(draw, (29, 13, 30, 18), C["warm_outline"])
    if i in (3, 4):
        px(draw, (15, 1, 16, 4), C["warm_outline"])
        px(draw, (18, 3, 19, 5), C["warm_outline"])
    if i in (5, 6):
        draw.line((12 + shake, y - 5, 16 + shake, y, 13 + shake, y + 5, 19 + shake, y + 9), fill=C["highlight"], width=1)
        if i == 5:
            px(draw, (2, 26, 5, 28), C["orange"])
            px(draw, (27, 25, 30, 27), C["orange"])


def thorns(draw, i):
    if i >= 6:
        y = 27 + (i - 6)
        draw.line((2, y, 9, y - 3, 16, y, 23, y - 2, 30, y), fill=C["outline"], width=5)
        draw.line((3, y, 10, y - 2, 16, y, 23, y - 1, 29, y), fill=C["vine"], width=3)
        return
    lift = (0, 1, 0, -3, -5, 1)[i]
    y = 23 + lift
    draw.line((2, y, 8, y - 3, 15, y, 22, y - 2, 30, y), fill=C["outline"], width=7)
    draw.line((3, y, 8, y - 3, 15, y, 22, y - 2, 29, y), fill=C["vine"], width=4)
    thorn_h = 7 if i in (3, 4) else 5
    for x, direction in ((6, -1), (11, 1), (16, -1), (21, 1), (26, -1)):
        base_y = y - 2 if direction < 0 else y + 2
        tip_y = base_y + direction * thorn_h
        draw.polygon([(x - 2, base_y), (x + 2, base_y), (x, tip_y)], fill=C["outline"])
        draw.polygon([(x - 1, base_y), (x + 1, base_y), (x, tip_y + (-1 if direction < 0 else 1))], fill=C["thorn"])
    if i == 5:
        px(draw, (3, 7, 4, 9), C["thorn"])
        px(draw, (28, 10, 30, 11), C["thorn"])


def bat(draw, i):
    if i >= 6:
        y = 19 + (i - 6) * 5
        draw.polygon([(4, y), (13, y - 3), (16, y + 2), (19, y - 3), (28, y), (23, y + 5), (9, y + 5)], fill=C["outline"])
        draw.polygon([(6, y), (13, y - 1), (16, y + 3), (19, y - 1), (26, y), (22, y + 3), (10, y + 3)], fill=C["wing"])
        return
    up = i in (0, 2, 3)
    dive = i == 4
    recoil = i == 5
    cy = 14 + (5 if dive else 0) + (2 if recoil else 0)
    if up:
        left = [(14, cy), (8, 5), (2, 2), (5, 15), (1, 19), (12, 18)]
        right = [(18, cy), (24, 5), (30, 2), (27, 15), (31, 19), (20, 18)]
    else:
        left = [(14, cy), (7, 10), (1, 13), (5, 19), (11, 18)]
        right = [(18, cy), (25, 10), (31, 13), (27, 19), (21, 18)]
    draw.polygon(left, fill=C["outline"]); draw.polygon(right, fill=C["outline"])
    draw.polygon([(x + (1 if x < 16 else -1), y + 1) for x, y in left], fill=C["wing"])
    draw.polygon([(x + (1 if x < 16 else -1), y + 1) for x, y in right], fill=C["wing"])
    draw.ellipse((11, cy - 6, 21, cy + 7), fill=C["outline"])
    draw.ellipse((12, cy - 5, 20, cy + 6), fill=C["bat"])
    draw.polygon([(12, cy - 4), (13, cy - 10), (16, cy - 5)], fill=C["outline"])
    draw.polygon([(16, cy - 5), (19, cy - 10), (20, cy - 4)], fill=C["outline"])
    px(draw, (13, cy - 1, 14, cy), C["thorn"]); px(draw, (18, cy - 1, 19, cy), C["thorn"])
    px(draw, (15, cy + 3, 15, cy + 4), C["white"]); px(draw, (17, cy + 3, 17, cy + 4), C["white"])
    if recoil:
        px(draw, (4, 5, 5, 7), C["thorn"]); px(draw, (27, 7, 29, 8), C["thorn"])


def shield_idle(draw, i):
    pulse = (0, 1, 1, 0)[i]
    draw.ellipse((2 - pulse, 2 - pulse, 13 + pulse, 13 + pulse), fill=C["outline"])
    draw.ellipse((3 - pulse, 3 - pulse, 12 + pulse, 12 + pulse), fill=C["shield"])
    draw.polygon([(8, 3), (12, 8), (8, 13), (4, 8)], fill=C["shield_glow"])
    draw.polygon([(8, 5), (10, 8), (8, 11), (6, 8)], fill=C["white"])


def shield_burst(draw, i):
    radii = (2, 5, 9, 13, 15, 15)
    r = radii[i]
    alpha = (255, 255, 230, 190, 120, 45)[i]
    if i < 2:
        draw.ellipse((16-r, 16-r, 16+r, 16+r), fill=(*ImageColor(C["white"]), alpha))
    else:
        draw.ellipse((16-r, 16-r, 16+r, 16+r), outline=(*ImageColor(C["shield_glow"]), alpha), width=2)
        for dx, dy in ((0, -1), (1, 0), (0, 1), (-1, 0)):
            x, y = 16 + dx * r, 16 + dy * r
            px(draw, (x-1, y-1, x+1, y+1), (*ImageColor(C["white"]), alpha))


def shell(draw, i):
    alpha = 150
    draw.ellipse((5, 5, 58, 58), outline=(*ImageColor(C["outline"]), 190), width=2)
    draw.ellipse((7, 7, 56, 56), outline=(*ImageColor(C["shield"]), alpha), width=2)
    starts = (205, 250, 295, 340)
    draw.arc((4, 4, 59, 59), starts[i], starts[i] + 65, fill=(*ImageColor(C["white"]), 230), width=3)
    draw.arc((9, 9, 54, 54), starts[i] + 150, starts[i] + 210, fill=(*ImageColor(C["shield_glow"]), 130), width=2)


def warning(draw, i):
    lift = (1, 0, -1, 0)[i]
    draw.polygon([(8, 1 + lift), (15, 14 + lift), (1, 14 + lift)], fill=C["outline"])
    draw.polygon([(8, 3 + lift), (13, 13 + lift), (3, 13 + lift)], fill=C["thorn"])
    px(draw, (7, 6 + lift, 8, 10 + lift), C["white"]); px(draw, (7, 12 + lift, 8, 12 + lift), C["white"])
    if i in (1, 2):
        px(draw, (0, 3, 1, 4), C["spring"]); px(draw, (14, 2, 15, 3), C["spring"])


def impact(draw, i):
    sizes = (3, 7, 12, 15, 13, 8)
    r = sizes[i]; alpha = (255, 255, 255, 220, 150, 70)[i]
    points = []
    for n in range(16):
        import math
        rr = r if n % 2 == 0 else max(2, r // 3)
        a = -math.pi / 2 + n * math.pi / 8
        points.append((16 + int(math.cos(a) * rr), 16 + int(math.sin(a) * rr)))
    draw.polygon(points, fill=(*ImageColor(C["thorn"]), alpha), outline=(*ImageColor(C["outline"]), alpha))
    if i < 4:
        inner = max(1, r // 3)
        draw.ellipse((16-inner, 16-inner, 16+inner, 16+inner), fill=(*ImageColor(C["highlight"]), alpha))


def damage_flash(draw, i):
    alpha = (230, 170, 100, 35)[i]
    inset = i
    draw.arc((4-inset, 3-inset, 27+inset, 30+inset), 200, 330, fill=(*ImageColor(C["white"]), alpha), width=2)
    draw.arc((3-inset, 2-inset, 28+inset, 29+inset), 20, 145, fill=(*ImageColor(C["thorn"]), alpha), width=2)
    for x, y in ((3, 6), (28, 10), (6, 28), (25, 25)):
        px(draw, (x, y, x+1, y+1), (*ImageColor(C["highlight"]), alpha))


def ImageColor(value):
    value = value.lstrip("#")
    return tuple(int(value[n:n+2], 16) for n in (0, 2, 4))


def save_all():
    ENEMIES.mkdir(parents=True, exist_ok=True); EFFECTS.mkdir(parents=True, exist_ok=True)
    for name, renderer in (("snake-actions", snake), ("coconut-actions", coconut), ("thorn-vine-actions", thorns), ("bat-actions", bat)):
        sheet(32, [renderer] * 8).save(ENEMIES / f"{name}.png")
    specs = (
        ("shield-idle", 16, 4, shield_idle), ("shield-pickup-burst", 32, 6, shield_burst),
        ("shield-shell", 64, 4, shell), ("warning-indicator", 16, 4, warning),
        ("impact-burst", 32, 6, impact), ("damage-flash", 32, 4, damage_flash),
    )
    for name, size, count, renderer in specs:
        sheet(size, [renderer] * count).save(EFFECTS / f"{name}.png")


if __name__ == "__main__":
    save_all()
