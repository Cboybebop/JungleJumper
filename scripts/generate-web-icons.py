"""Generate code-native pixel-vector branding and raster exports. Requires Pillow."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / 'public'
ICONS = PUBLIC / 'icons'
ICONS.mkdir(exist_ok=True)

# A compact monkey emblem, drawn on a 32-unit grid using the game's palette.
# Keep its silhouette inside the central safe circle for Android maskable icons.
SHAPES = [
    (0, 0, 32, 32, '#211936'),
    (6, 23, 20, 3, '#2E8B7A'),
    (8, 22, 16, 2, '#BADB49'),
    (6, 12, 5, 7, '#8B6914'), (21, 12, 5, 7, '#8B6914'),
    (7, 14, 3, 3, '#D4A854'), (22, 14, 3, 3, '#D4A854'),
    (10, 8, 12, 14, '#8B6914'), (12, 6, 8, 3, '#8B6914'),
    (11, 11, 10, 9, '#D4A854'), (12, 18, 8, 4, '#D4A854'),
    (12, 12, 3, 4, '#FFE6A3'), (17, 12, 3, 4, '#FFE6A3'),
    (13, 13, 2, 3, '#211936'), (17, 13, 2, 3, '#211936'),
    (14, 18, 4, 1, '#211936'), (15, 19, 2, 1, '#211936'),
]

svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" shape-rendering="crispEdges"><title>Jungle Jumper monkey icon</title>'
svg += ''.join(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="{c}"/>' for x, y, w, h, c in SHAPES)
svg += '</svg>\n'
(ICONS / 'icon.svg').write_text(svg, encoding='utf-8')

def emblem(size):
    im = Image.new('RGB', (size, size), '#211936')
    draw = ImageDraw.Draw(im)
    for x, y, w, h, color in SHAPES:
        draw.rectangle((round(x * size / 32), round(y * size / 32), round((x+w) * size / 32)-1, round((y+h) * size / 32)-1), fill=color)
    return im

for size in (192, 512):
    emblem(size).save(ICONS / f'icon-{size}.png')
emblem(512).save(ICONS / 'icon-maskable-512.png')
emblem(180).save(PUBLIC / 'apple-touch-icon.png')
emblem(48).save(PUBLIC / 'favicon.ico', sizes=[(16, 16), (32, 32), (48, 48)])

card = Image.new('RGB', (1200, 630), '#211936')
draw = ImageDraw.Draw(card)
draw.rectangle((0, 590, 1199, 629), fill='#2E8B7A')
draw.rectangle((0, 582, 1199, 590), fill='#BADB49')
card.paste(emblem(384), (50, 105))
font_path = str(PUBLIC / 'assets/fonts/silkscreen-regular.ttf')
title_font = ImageFont.truetype(font_path, 70)
body_font = ImageFont.truetype(font_path, 22)
draw.text((465, 170), 'JUNGLE', font=title_font, fill='#BADB49')
draw.text((465, 250), 'JUMPER', font=title_font, fill='#FFE6A3')
draw.text((470, 365), 'CLIMB HIGHER.\nONE JUMP AT A TIME.', font=body_font, fill='#FFE6A3', spacing=14)
card.save(PUBLIC / 'social-card.png')
print('Generated favicon, Apple/Android icons, SVG source, and social card.')
