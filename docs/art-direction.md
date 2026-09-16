# Jungle Jumper Art Direction

This document is the source of truth for production art. The runtime color tokens in
`src/constants.ts` must stay synchronized with the values below.

## Target aesthetic

Jungle Jumper should look like a modern handheld game: compact, cheerful pixel art
with the immediate readability of a classic portable platformer, but with a broader
color range and cleaner animation than hardware-era work. Shapes are chunky and
graphic, corners are deliberately stepped, and important faces and poses read at
native size. Avoid noisy single-pixel texture, photorealism, vector-smooth edges,
faux scanline or LCD filters. The user-selected layered forest background is an explicit
exception to simplified actor shading: preserve its atmospheric detail. See
[the preferred visual reference](../art-source/references/preferred-layered-style.png).

The native gameplay canvas is **480 × 800 px**. Judge gameplay art at 100% and at an
integer zoom before approving it; zoomed-in inspection alone can hide readability
problems.

## Master palette

Use the named tokens rather than introducing near-duplicate colors. The numeric
value is the Phaser integer form; the hex value is the art-tool form.

| Group | Token | Hex | Phaser integer | Use |
| --- | --- | --- | --- | --- |
| Contrast | `OUTLINE_DEEP` | `#211936` | `0x211936` | Universal outer contour and deepest occlusion |
| Contrast | `OUTLINE_WARM` | `#3D2440` | `0x3D2440` | Warm character/interior contour |
| Contrast | `SHADOW_COOL` | `#334B68` | `0x334B68` | Cool environmental shadow |
| Contrast | `HIGHLIGHT_WARM` | `#FFE6A3` | `0xFFE6A3` | Selective lit rim and sparkle |
| World | `SKY` / `SKY_HEX` | `#87CEEB` | `0x87CEEB` | Clear-sky field |
| World | `TRUNK` | `#5B3A6B` | `0x5B3A6B` | Tree trunks |
| World | `BRANCH` | `#6B4A7B` | `0x6B4A7B` | Platform branch midtone |
| World | `BRANCH_DARK` | `#4A2A5A` | `0x4A2A5A` | Branch shadow |
| World | `JUNGLE_TREE` | `#2E8B7A` | `0x2E8B7A` | Distant foliage |
| World | `JUNGLE_TREE_DARK` | `#1E6B5A` | `0x1E6B5A` | Distant foliage shadow |
| Accent | `PINK_DOT` | `#FF69B4` | `0xFF69B4` | Small vegetation accent |
| Accent | `CLOUD` | `#FFFFFF` | `0xFFFFFF` | Clouds and maximum-value glints |
| Accent | `FLOWER` | `#FF85C8` | `0xFF85C8` | Flowers |
| Character | `MONKEY_BODY` | `#8B6914` | `0x8B6914` | Monkey body |
| Character | `MONKEY_FACE` | `#D4A854` | `0xD4A854` | Monkey face/accent |
| Character | `PARROT_BODY` | `#4A90D9` | `0x4A90D9` | Parrot body |
| Character | `PARROT_WING` | `#2ECC71` | `0x2ECC71` | Parrot wing/accent |
| Character | `FROG_BODY` | `#27AE60` | `0x27AE60` | Frog body |
| Character | `FROG_BELLY` | `#82E0AA` | `0x82E0AA` | Frog belly/accent |
| Character | `TOUCAN_BODY` | `#2C3E50` | `0x2C3E50` | Toucan body |
| Character | `TOUCAN_BEAK` | `#F39C12` | `0xF39C12` | Toucan beak/accent |
| Character | `GECKO_BODY` | `#1ABC9C` | `0x1ABC9C` | Gecko body |
| Character | `GECKO_SPOTS` | `#16A085` | `0x16A085` | Gecko spots/accent |
| Hazard | `SNAKE_BODY` | `#27AE60` | `0x27AE60` | Snake body |
| Hazard | `SNAKE_PATTERN` | `#1E8449` | `0x1E8449` | Snake shadow/pattern |
| Hazard | `COCONUT` | `#8B4513` | `0x8B4513` | Coconut shell |
| Hazard | `COCONUT_HAIR` | `#5C3317` | `0x5C3317` | Coconut shadow/fibers |
| Hazard | `THORN` | `#C0392B` | `0xC0392B` | Damage cue |
| Hazard | `BAT_BODY` | `#4A235A` | `0x4A235A` | Bat body |
| Hazard | `BAT_WING` | `#6C3483` | `0x6C3483` | Bat wing |
| UI | `BUTTON` | `#2ECC71` | `0x2ECC71` | Primary action |
| UI | `BUTTON_HOVER` | `#27AE60` | `0x27AE60` | Primary action hover/pressed |
| UI | `BUTTON_TEXT` | `#FFFFFF` | `0xFFFFFF` | Button text |
| UI | `SHIELD` | `#00BFFF` | `0x00BFFF` | Shield energy |
| UI | `SHIELD_GLOW` | `#87CEFA` | `0x87CEFA` | Shield highlight |
| Platform | `SPRING` | `#F1C40F` | `0xF1C40F` | Spring body |
| Platform | `SPRING_COIL` | `#D4AC0D` | `0xD4AC0D` | Spring shadow/coil |

Alpha is not a palette token. Reserve it for effects, clouds, shield energy, and UI
transitions; opaque sprites should use exact palette colors.

## Lighting, contrast, and shading

The global key light comes from the **upper left**. Place highlights on top and left
planes, midtones on front-facing planes, and shadows on bottom and right planes.
Cast shadows fall down-right. Do not flip the lighting when a sprite faces left; only
flip pose-dependent details.

Use a strict contrast hierarchy:

1. **Player, hazards, and pickup cores:** strongest light/dark separation and a closed
   outer contour; these must remain readable over both sky and foliage.
2. **Playable platforms and interactive effects:** strong top-edge contrast and clear
   contact surfaces, but slightly less internal contrast than actors.
3. **UI:** maximum text/icon contrast inside its own panels; never rely on the world
   behind it for legibility.
4. **Foreground decoration:** reduced saturation or value range and no actor-strength
   outline near gameplay lanes.
5. **Backgrounds:** lowest contrast and detail frequency; distant layers become cooler,
   lighter, and simpler.

Use `OUTLINE_DEEP` for exterior silhouettes. `OUTLINE_WARM` may soften interior lines
and warm actors; `SHADOW_COOL` may replace it on distant/environmental forms. Never
use pure black for routine outlines. A one-pixel native outline is standard; use two
pixels only at the base/contact edge of a 48 px or larger boss or menu subject.

Build opaque sprites in **three main shading bands**: shadow, local midtone, and light.
An optional `HIGHLIGHT_WARM` or `CLOUD` specular cluster may cover only a small focal
area. Bands must form intentional pixel clusters—no gradients, airbrush, dithering,
or pillow shading. Keep the upper-left light band narrower than the midtone and use
the deepest shade for contact points and overlap, not around every interior feature.

## Sprite proportions and readable silhouettes

- Characters are roughly two heads tall, with the head taking 40–50% of total height.
  Hands, feet, beaks, and tails may be exaggerated by one or two pixels for animation.
- Standard enemies occupy a similar visual mass to the player but may be wider;
  mini-bosses may fill the 48 × 48 class. Keep dangerous extremities visibly outside
  the body mass.
- Pickups have one dominant symbol and a bright center; no essential feature should
  be only one isolated pixel.
- The platform's top collision edge is a continuous, high-contrast horizontal run.
  Decorative leaves and chips must not imply a different landing surface.
- Test every actor as a flat `OUTLINE_DEEP` silhouette at native size. Identity,
  facing direction, pose/action, and dangerous side must still be recognizable.
- Separate limbs and props with negative-space notches. Avoid tangencies between
  hands, feet, tails, weapons, and the torso. Keep at least one transparent pixel
  between unrelated silhouette lobes where the pose permits.
- Motion frames must retain comparable mass and foot placement; do not let outlines
  flicker because a static edge moves without contributing to the action.

## Native asset sizes and Phaser scaling

All dimensions below are integer source pixels. Runtime display sizes must also be
integers. Phaser loads each image or sheet at its native size; gameplay code scales
only by the listed **integer factor** using `setScale(n)` (or equivalent integer
dimensions). Never use fractional scale, and never scale one axis independently.

| Category | Native size | Sheet frame | Phaser display rule |
| --- | ---: | ---: | --- |
| Player characters | 32 × 32 | 32 × 32 | 1× gameplay; 3× character-select preview |
| Standard enemies | 32 × 32 | 32 × 32 | 1× gameplay |
| Large enemies / mini-bosses | 48 × 48 | 48 × 48 | 1× gameplay |
| Pickups | 16 × 16 | 16 × 16 | 1× gameplay; 2× reward callout |
| Standard platforms | 80 × 24 | 80 × 24 | 1×; original grass-topped artwork |
| Narrow platforms | 80 × 24 cell | 42px collision surface | 1×; preserve transparent registration |
| Effects, small | 32 × 32 | 32 × 32 | 1× gameplay |
| Effects, large | 64 × 64 | 64 × 64 | 1× gameplay |
| Portraits | 64 × 64 | 64 × 64 | 1× HUD/menu; 2× only in dedicated results layout |
| UI icons | 16 × 16 | 16 × 16 | 1× compact HUD; 2× menus |
| Menu illustrations | 160 × 144 | 160 × 144 | 2× (320 × 288 display) |
| Background layer | 480 × 800 | 480 × 800 | 1×; original atmospheric layers |
| Full background | 480 × 800 | 480 × 800 | 1× |

Camera/Scale Manager fitting may resize the entire 480 × 800 canvas to the browser.
That outer fit is separate from asset scaling. Keep `pixelArt`, `roundPixels`, and
disabled antialiasing in `src/config.ts`; do not override a texture's filter mode.

## Files, sheets, and export

Store assets under `public/assets/<category>/`:

- `characters/` — playable actors and portraits specific to them
- `enemies/` — hazards and enemy actors
- `world/` — platforms, props, pickups, and tiles
- `effects/` — impact, jump, shield, and ambient effect sheets
- `ui/` — shared icons, panels, portraits, and menu art
- `backgrounds/` — tileable layers and full scenes

Use lowercase kebab case: **`<subject>-<animation>.png`**, for example
`monkey-idle.png`, `snake-slither.png`, and `shield-burst.png`. Use a descriptive
role in place of animation for static art (`branch-standard.png`, `heart-icon.png`,
`jungle-canopy-far.png`). Variant suffixes follow the role: `branch-standard-02.png`.

Every runtime sprite sheet must meet all of these requirements:

- Export an RGBA **transparent PNG** at native size. Do not bake a matte/background.
- Lay frames left-to-right in a single row unless a loader definition explicitly
  documents a grid. Every frame has the fixed integer dimensions from the size table.
- Use the same registration point in every frame: bottom-center for grounded actors
  and effects, center for flying actors, pickups, icons, and radial effects. Keep feet
  or the intended origin on that point; do not auto-trim individual frames.
- Include no spacing, margin, or padding between sheet frames. Transparent padding
  **inside each fixed frame** uses a fixed safety envelope, never per-frame trimming or
  recentering. For the 32×32 player sheets, column 0, column 31, row 0 and rows 30–31
  remain transparent in every pose; the grounded contact edge is y=30. Tight alpha bounds
  may change as limbs move within that envelope. Planted contact pixels at rows 28–29
  must remain identical through idle, anticipation and landing. Loose standalone art
  may have a one-pixel transparent safety border.
- Use nearest-neighbor/no interpolation when drawing, resizing, exporting, loading,
  and displaying. Palette-indexed authoring is welcome, but export RGBA consistently.
- Opaque pixel-art assets contain only alpha 0 or 255. Partially transparent pixels
  are forbidden except in explicitly translucent effects (glow, smoke, shield),
  clouds, and UI transitions; even there, use a small set of deliberate alpha bands.

Generated raster images are **concept references, not runtime-ready sprites**. Inspect
every generated concept at native size. When useful, manually redraw/reduce it onto
the approved pixel grid, restrict it to the master palette, clean clusters and alpha,
restore the registration point, and verify silhouette and sheet rules. Never ship an
unedited, downscaled illustration output as gameplay pixel art.

## Reproducible production sources

- `scripts/generate-character-assets.mjs` is the native pixel authoring source for Pico,
  Hoppy, Tuki and Zippy; Miko's source strip is preserved in
  `art-source/characters/miko-actions-source.png`. One export registration pass reserves
  the guard band and closes extreme-pose contours. Never normalize each pose by its bbox.
- User visual correction (2026-09-16) supersedes the earlier simplified background/platform
  experiment: retain the original layered forest PNGs and grass-topped 80×24 platform strips.
  Do not replace these with three flat color bands or rectangular metallic-looking platforms.
- `scripts/process-world-assets.py` extracts grass platforms from the preserved source atlas.
  The sprite origin is centered, with an 8px-high body at local row 2; collision top stays y−10.
- `src/graphics/PixelBackgrounds.ts` now bakes biome color multiplication into the original
  480×800 layered images. Both renderers display the same baked textures and bounded crossfades.
  Preserve canopy, mist, tree silhouettes, shafts and landmark depth from the reference artwork.
- Branches overlap visible bark and the platform center behind the grass art. Grounded hazards
  own a supporting-platform reference, patrol within its surface, and disappear with that support.
- Vines, flowers, leaves and fruit pivot inside the visible trunk. Gentle rotational sway is an
  intentional decoration exception; reduced motion keeps their attachment points stationary.
- Focus and pressed UI states use texture changes and a two-pixel offset. Actor squash remains
  authored in poses. Outer canvas FIT scales the native 480×800 view to the browser.
