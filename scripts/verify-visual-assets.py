"""Reproducible alpha bounds and UI contrast audit; findings are not approval."""
from pathlib import Path
from PIL import Image
import json

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'docs/visual-qa-evidence'
OUT.mkdir(parents=True, exist_ok=True)
bounds = {}
for name in ['miko', 'pico', 'hoppy', 'tuki', 'zippy']:
    image = Image.open(ROOT / f'public/assets/characters/{name}/{name}-actions.png')
    boxes = [image.crop((i * 32, 0, (i + 1) * 32, 32)).getchannel('A').getbbox() for i in range(24)]
    bounds[name] = dict(bounds=boxes, identicalPadding=len(set(boxes)) == 1,
                        idleBottoms=[boxes[i][3] for i in [0, 1]],
                        runBottoms=[boxes[i][3] for i in [10, 11, 12, 13]],
                        touchesFrameEdge=any(b[0] == 0 or b[1] == 0 or b[2] == 32 or b[3] == 32 for b in boxes))
(OUT / 'asset-bounds.json').write_text(json.dumps(bounds, indent=2))

def luminance(rgb):
    c = [v / 255 for v in rgb]
    c = [v / 12.92 if v <= .04045 else ((v + .055) / 1.055) ** 2.4 for v in c]
    return sum(a * b for a, b in zip(c, [.2126, .7152, .0722]))

def contrast(a, b):
    x, y = sorted([luminance(a), luminance(b)])
    return round((y + .05) / (x + .05), 2)

results = []
for asset in ['button-large-normal', 'button-large-focused', 'button-large-pressed', 'panel-nine-slice', 'modal-nine-slice', 'tab-focused', 'tab-pressed', 'score-plaque']:
    image = Image.open(ROOT / f'public/assets/ui/{asset}.png').convert('RGB')
    rgb = image.getpixel((image.width // 2, image.height // 2))
    for label, foreground in [('white', (255, 255, 255)), ('warm', (255, 230, 163)), ('sky', (135, 206, 235))]:
        ratio = contrast(foreground, rgb)
        results.append(dict(asset=asset, foreground=label, background=rgb, ratio=ratio, normalTextPass=ratio >= 4.5))
for label, fg, bg in [('game-over title', (231, 76, 60), (26, 26, 46)), ('state cue', (255, 230, 163), (33, 25, 54)), ('HUD biome', (135, 206, 235), (33, 25, 54))]:
    target = 3 if label == 'game-over title' else 4.5
    results.append(dict(asset=label, ratio=contrast(fg, bg), target=target, actualUsagePass=contrast(fg, bg) >= target))
for label, fg in [('button label plate', (255, 255, 255)), ('row value plate', (255, 230, 163)), ('HUD biome plate', (135, 206, 235))]:
    results.append(dict(asset=label, ratio=contrast(fg, (33, 25, 54)), actualUsagePass=contrast(fg, (33, 25, 54)) >= 4.5))
(OUT / 'contrast.json').write_text(json.dumps(results, indent=2))
print(json.dumps({'paddingExceptions': list(bounds), 'actualUsageFailures': [r for r in results if r.get('actualUsagePass') is False], 'note': 'Raw panel pairs are diagnostics; production label plates are audited separately.'}, indent=2))
