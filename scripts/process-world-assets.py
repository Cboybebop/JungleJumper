"""Extract cleaned, game-scale world sprites from the generated source atlases."""

from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
WORLD = ROOT / "public" / "assets" / "world"
SOURCE = ROOT / "art-source" / "world"


def grid_cell(image: Image.Image, columns: int, rows: int, column: int, row: int) -> Image.Image:
    left = round(image.width * column / columns)
    top = round(image.height * row / rows)
    right = round(image.width * (column + 1) / columns)
    bottom = round(image.height * (row + 1) / rows)
    return image.crop((left, top, right, bottom))


def clean_crop(image: Image.Image) -> Image.Image:
    rgba = image.convert("RGBA")
    alpha = rgba.getchannel("A").point(lambda value: 255 if value >= 32 else 0)
    rgba.putalpha(alpha)
    bounds = alpha.getbbox()
    if bounds is None:
        raise ValueError("Atlas cell contains no visible pixels")
    return rgba.crop(bounds)


def fit_sprite(image: Image.Image, size: tuple[int, int], padding: int = 1) -> Image.Image:
    image = clean_crop(image)
    max_width = size[0] - padding * 2
    max_height = size[1] - padding * 2
    scale = min(max_width / image.width, max_height / image.height)
    target = (
        max(1, round(image.width * scale)),
        max(1, round(image.height * scale)),
    )
    resized = image.resize(target, Image.Resampling.NEAREST)
    canvas = Image.new("RGBA", size, (0, 0, 0, 0))
    x = (size[0] - resized.width) // 2
    y = (size[1] - resized.height) // 2
    canvas.alpha_composite(resized, (x, y))
    return canvas


def save_strip(frames: list[Image.Image], path: Path) -> None:
    frame_width, frame_height = frames[0].size
    strip = Image.new("RGBA", (frame_width * len(frames), frame_height), (0, 0, 0, 0))
    for index, frame in enumerate(frames):
        strip.alpha_composite(frame, (index * frame_width, 0))
    strip.save(path, optimize=True)


def extract_platforms() -> None:
    atlas = Image.open(SOURCE / "platform-atlas.png")
    names = ["normal", "moving", "crumbling", "spring"]
    for row, name in enumerate(names):
        frames = [
            fit_sprite(grid_cell(atlas, 4, 4, column, row), (80, 24))
            for column in range(4)
        ]
        save_strip(frames, WORLD / f"platform-{name}.png")


def extract_decorations() -> None:
    atlas = Image.open(SOURCE / "decor-atlas.png")
    assets = [
        ("vine-curled", 0, 0, (24, 48)),
        ("vine-twisting", 1, 0, (24, 48)),
        ("leaves-small", 2, 0, (32, 24)),
        ("leaves-large", 3, 0, (40, 32)),
        ("flower-pink", 0, 1, (20, 20)),
        ("flower-gold", 1, 1, (20, 20)),
        ("fruit-berries", 2, 1, (20, 24)),
        ("fruit-orange", 3, 1, (20, 24)),
        ("moss", 0, 2, (32, 16)),
        ("stones", 1, 2, (32, 20)),
        ("canopy-left", 2, 2, (96, 48)),
        ("canopy-right", 3, 2, (96, 48)),
    ]
    for name, column, row, size in assets:
        fit_sprite(grid_cell(atlas, 4, 3, column, row), size).save(
            WORLD / f"{name}.png", optimize=True
        )


def extract_environment() -> None:
    atlas = Image.open(SOURCE / "environment-atlas.png")
    for column in range(4):
        fit_sprite(grid_cell(atlas, 4, 2, column, 0), (40, 96), padding=0).save(
            WORLD / f"trunk-{column}.png", optimize=True
        )

    background_assets = [
        ("jungle-silhouette", 0, (120, 96)),
        ("cloud", 1, (96, 48)),
        ("canopy-distant-left", 2, (160, 64)),
        ("canopy-distant-right", 3, (160, 64)),
    ]
    for name, column, size in background_assets:
        fit_sprite(grid_cell(atlas, 4, 2, column, 1), size).save(
            WORLD / f"{name}.png", optimize=True
        )


def main() -> None:
    WORLD.mkdir(parents=True, exist_ok=True)
    extract_platforms()
    extract_decorations()
    extract_environment()


if __name__ == "__main__":
    main()
