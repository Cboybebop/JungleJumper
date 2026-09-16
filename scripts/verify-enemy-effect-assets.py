"""Verify native sheet geometry/palette rules and render the gameplay contrast board."""

from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
ENEMIES = ROOT / "public" / "assets" / "enemies"
EFFECTS = ROOT / "public" / "assets" / "effects"
WORLD = ROOT / "public" / "assets" / "world"
OUT = ROOT / "screenshots" / "enemy-effect-visibility.png"

SPECS = {
    ENEMIES / "snake-actions.png": (32, 8),
    ENEMIES / "coconut-actions.png": (32, 8),
    ENEMIES / "thorn-vine-actions.png": (32, 8),
    ENEMIES / "bat-actions.png": (32, 8),
    EFFECTS / "shield-idle.png": (16, 4),
    EFFECTS / "shield-pickup-burst.png": (32, 6),
    EFFECTS / "shield-shell.png": (64, 4),
    EFFECTS / "warning-indicator.png": (16, 4),
    EFFECTS / "impact-burst.png": (32, 6),
    EFFECTS / "damage-flash.png": (32, 4),
}


def frame(path, size):
    image = Image.open(path).convert("RGBA")
    return image.crop((0, 0, size, size))


def verify():
    for path, (size, count) in SPECS.items():
        image = Image.open(path).convert("RGBA")
        assert image.size == (size * count, size), f"{path.name}: expected {size * count}x{size}, got {image.size}"
        assert image.getbbox(), f"{path.name}: empty sheet"
        if path.parent == ENEMIES:
            assert set(image.getchannel("A").getdata()).issubset({0, 255}), f"{path.name}: opaque actor has partial alpha"

    hazard_colors = set()
    for path in ENEMIES.glob("*.png"):
        hazard_colors.update(Image.open(path).convert("RGBA").getdata())
    pickup_colors = set(Image.open(EFFECTS / "shield-idle.png").convert("RGBA").getdata())
    assert (0, 191, 255, 255) in pickup_colors, "shield pickup lost its cyan identity color"
    assert (0, 191, 255, 255) not in hazard_colors, "hazard/pickup color separation regressed"


def build_board():
    layers = sorted(WORLD.glob("*.png"))
    cell_w, cell_h, cols = 192, 116, 5
    rows = (len(layers) + cols - 1) // cols
    board = Image.new("RGBA", (cell_w * cols, cell_h * rows), (135, 206, 235, 255))
    actors = [
        frame(ENEMIES / "snake-actions.png", 32),
        frame(ENEMIES / "coconut-actions.png", 32),
        frame(ENEMIES / "thorn-vine-actions.png", 32),
        frame(ENEMIES / "bat-actions.png", 32),
        frame(EFFECTS / "shield-idle.png", 16),
    ]

    for index, layer_path in enumerate(layers):
        x0 = (index % cols) * cell_w
        y0 = (index // cols) * cell_h
        cell = Image.new("RGBA", (cell_w, cell_h), (135, 206, 235, 255))
        layer = Image.open(layer_path).convert("RGBA")
        if layer.width > cell_w or layer.height > cell_h:
            layer.thumbnail((cell_w, cell_h), Image.Resampling.NEAREST)
        for y in range(0, cell_h, max(1, layer.height)):
            for x in range(0, cell_w, max(1, layer.width)):
                cell.alpha_composite(layer, (x, y))
        draw = ImageDraw.Draw(cell)
        draw.rectangle((0, 0, cell_w - 1, cell_h - 1), outline=(33, 25, 54, 255))
        draw.rectangle((0, 0, cell_w, 13), fill=(33, 25, 54, 230))
        draw.text((4, 2), layer_path.stem, fill=(255, 230, 163, 255))
        positions = ((4, 65), (42, 65), (80, 65), (118, 65), (164, 73))
        for actor, pos in zip(actors, positions):
            cell.alpha_composite(actor, pos)
        board.alpha_composite(cell, (x0, y0))

    OUT.parent.mkdir(parents=True, exist_ok=True)
    board.save(OUT)


if __name__ == "__main__":
    verify()
    build_board()
    print(f"verified {len(SPECS)} sheets across {len(list(WORLD.glob('*.png')))} world/platform layers")
    print(OUT)
