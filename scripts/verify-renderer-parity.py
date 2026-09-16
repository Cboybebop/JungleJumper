"""Compare isolated, deterministic biome endpoints and transition midpoint captures."""
from pathlib import Path
from PIL import Image, ImageChops, ImageStat
import json

root = Path(__file__).resolve().parents[1] / 'docs/visual-qa-evidence/release'
results = []
for i, altitude in enumerate([0,60,120,220,320,460,600,750,900]):
    canvas = Image.open(root / f'canvas-palette-{i}.png').convert('RGB')
    webgl = Image.open(root / f'webgl-palette-{i}.png').convert('RGB')
    means = ImageStat.Stat(ImageChops.difference(canvas, webgl)).mean
    # Original art has partial alpha on eight layers; dual-bank blends accumulate
    # more Canvas/WebGL alpha rounding than opaque endpoint palettes. Keep the
    # strict endpoint budget and allow 4/255 (<1.6%) only at blend midpoints.
    tolerance = 2 if altitude in [0,120,320,600,900] else 4
    results.append(dict(altitude=altitude, meanChannelError=means, tolerance=tolerance, passed=max(means) < tolerance))
(root / 'renderer-parity.json').write_text(json.dumps(results, indent=2))
assert all(r['passed'] for r in results), results
print('PASS: five endpoints below 2/255 and four layered blends below 4/255 mean channel error.')
