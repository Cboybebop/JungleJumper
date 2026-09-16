# Visual QA and release gate

Art authority: [art-direction.md](art-direction.md). Current status: **automated checks pass; device and art-owner acceptance pending**.
Generated captures are candidate references, not approved golden images. Record reviewer, date,
commit, browser/GPU, renderer, viewport, DPR, input device, reduced-motion setting and issue links
when accepting a row. Never replace approved references merely to make a comparison pass.

## Reproduce

1. `npm run dev`, then open `/?gallery&renderer=canvas` or `/?gallery&renderer=webgl`.
2. PREV/NEXT visits every page; FREEZE pauses; STEP advances one animation frame. Tab/arrows,
   Enter/Space, pointer/touch and gamepad navigation use the production menu navigator.
   Crosshairs show the frame center, 32px grid and grounded contact row. Oversized world/UI
   assets get dedicated native-resolution pages; background pages show full layers.
3. Run `npm run build`, `npm run verify:characters`, `npm run verify:transitions`,
   `npm run verify:feedback`, and `python scripts/verify-visual-assets.py` (Pillow required).
4. `node scripts/visual-qa.mjs` uses Playwright against localhost:5173. Set `PLAYWRIGHT_MODULE`
   to a bundled Playwright `index.mjs` if it is not installed locally, and optionally
   `QA_CHROMIUM` to an installed Chromium executable. The runner saves PNGs, WebM recordings,
   and [report.json](visual-qa-evidence/report.json). It uses isolated browser storage.
5. Run `npm run verify:release` for multi-touch, controller guards, moving bodies, 20 scene
   cycles, 60-second stress profiles and 36,000 background updates per renderer. Then run
   `npm run verify:renderer-parity` to compare five palettes and four blend midpoints.
6. `?qa` exposes a development-only game handle for regression instrumentation. Neither this
   handle nor the gallery route is enabled in a production build.

## Complete asset checklist

Each checkbox is a visual approval gate, not a claim that an asset has been approved.

| Character | Idle | Anticipation | Ascent | Apex | Fall | Landing | Run | Double jump | Spring | Shield | Hit | Defeat | Celebration | Portrait |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Miko / monkey | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] |
| Pico / parrot | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] |
| Hoppy / frog | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] |
| Tuki / toucan | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] |
| Zippy / gecko | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] |

For every cell: review native 1x and integer 3x, both facings, silhouette, upper-left lighting,
outline continuity, mass, transparent-edge clipping and consistent registration. Freeze/step
between every state, including interruption by hit/defeat. Check feet against a stationary
platform and during moving-platform carry. Compare foot displacement with world velocity;
constant bounding-box bottoms alone do not establish no sliding. Test each character's abilities.

| Family | Exhaustive runtime inventory | Required review |
| --- | --- | --- |
| Platforms | normal, moving, crumbling, spring; all four frames each | [ ] Surface edge vs collision body; moving arrows; crumble cracks and collapse timing; spring arrow and compression/recovery; cue visible in grayscale |
| Enemies/hazards | snake, coconut, thorns, bat × idle, patrol, attack, hit, defeat | [ ] Both directions; warning before coconut drop; dangerous extremity; persistent exclamation cue; hit/defeat removes collision only as designed |
| Pickup | shield idle, pickup burst, player shield shell, break | [ ] Center registration, readable shape, pickup only once, shield loss readable without blue hue |
| Effects | warning, impact, damage flash; feedback dot/ring, burst, shards, trail, labels, squash, shake, hit-stop | [ ] Full and reduced motion; no missing information; overlap with HUD; exhaustion and recovery |
| World | trunks 0–3; curled/twisting vines; small/large leaves; pink/gold flowers; berries/orange fruit; moss; stones; left/right near/distant canopy; cloud; jungle silhouette | [ ] Tile seams, outline hierarchy, decoration never mistaken for pickup/platform |
| Background layers | sky gradient, distant canopy, mist, mid trees, trunk structures, foreground leaves, light shafts, landmarks | [ ] Isolation and composition; no seams after recycling; correct availability, tint, alpha and parallax |
| UI | bronze/silver/gold badges; large/small buttons normal/focused/pressed/disabled; A/B/D-pad normal/focused; keycaps normal/focused; panel/modal; pause normal/focused/pressed; score plaque; selection normal/focused/selected; slider knob/track; check/shield/warning; tabs normal/focused/pressed; toggles on/off and focused; touch left/right/jump normal/pressed; height marker | [ ] Every state at native scale; labeled controls as well as source textures; no clipped text or focus ambiguity |

The gallery derives animations from the runtime registry and textures from production manifests.
New assets must be added to those manifests and this checklist in the same change.

## Biomes and scenes

| Scene / biome | Still + recording | Visual / interaction approval |
| --- | --- | --- |
| Boot/loading | [ ] Cold load, slow font and missing-asset diagnostics | [ ] No missing texture flashes |
| Main menu | [ ] Fresh and saved best score | [ ] Play/Settings focus, decorations and title |
| Character selection | [ ] All five selected and focused | [ ] Portrait, name, ability and Start/Back |
| Lower Jungle (0m) | [ ] Gameplay | [ ] Actor/background hierarchy |
| Bright Canopy (120m) | [ ] Gameplay | [ ] Light shafts, contrast |
| Misty Heights (320m) | [ ] Gameplay | [ ] Mist/landmarks, silhouettes |
| Sunset Canopy (600m) | [ ] Gameplay | [ ] Warm foreground vs hazards |
| Night Storm (900m+) | [ ] Gameplay | [ ] Dark actor contours remain readable |
| Biome boundaries | [ ] 119/120, 319/320, 599/600, 899/900m | [ ] Smooth blend, no seams or threshold flicker |
| Game + GameUI | [ ] Movement, shield, damage, milestone, death | [ ] HUD and touch controls remain legible |
| Pause overlay | [ ] Resume and quit | [ ] Input isolated; no accidental resume/jump; focus restored |
| Settings | [ ] Bindings, listening state, mobile controls, reduced motion, reset/back | [ ] Capture/cancel rebinding; persistent values; return from pause |
| Results / GameOver | [ ] Zero, ordinary score, new best, all badges/biomes | [ ] Count-up, replay/menu, final information and focus |

## Input and viewport matrix

Run **each scene above**, including pause/settings return paths, with each method:

- [ ] Keyboard: WASD/arrows, Tab, Enter/Space, Escape/Backspace, remapped controls;
  hold confirm across transitions, release/repress, focus wrap, no duplicate activation.
- [ ] Pointer: hover, down/up, drag off/cancel, click focused vs unfocused item; correct cursor.
- [ ] Touch: tap, drag off, simultaneous move+jump, pause, browser interruption and release;
  touch targets remain aligned after resize/orientation. Test on physical phone/tablet.
- [ ] Gamepad: D-pad, stick threshold, A/B/Start, held input across transitions,
  connect/disconnect/reconnect and return from pause. Simulation does not approve hardware.
- [ ] Switch methods mid-scene; exactly one focus indication; disabled items cannot activate.

| CSS viewport | Purpose | DPR × renderer |
| --- | --- | --- |
| 320×480 | Minimum supported layout | 1, 2, 3 × Canvas/WebGL |
| 375×667 | Small portrait phone | 1, 2, 3 × Canvas/WebGL |
| 480×800 | Art-bible native reference | 1, 2, 3 × Canvas/WebGL |
| 800×480 | Minimum-height landscape | 1, 2, 3 × Canvas/WebGL |
| 1280×720 | Desktop | 1, 2, 3 × Canvas/WebGL |
| 1920×1080 | Large desktop | 1, 2, 3 × Canvas/WebGL |

- [ ] Repeat at browser zoom 80/100/125/200%, resize live, fullscreen and return.
- [ ] Below minimum (e.g. 280×400): document scaled fallback and readability limitations.
- [ ] Check canvas bounds, internal logical dimensions, sharp pixels, safe areas, text clipping,
  modal edges and hit targets. Canvas-fit assertions alone do not validate every layout.
- [ ] WebGL must actually initialize; record GPU/driver and context loss/recovery separately.

## Physics, memory and performance

- [ ] For every character, enemy and platform, traverse every frame in both directions;
  width/height/offset/origin must remain fixed. Player body is 18×26 at offset (7,4).
  Intentional collision enable/disable at crumble/defeat is a state change, not a frame-size change.
- [ ] Compare landing contact and carried foot position with body overlays; no visible teleport.
- [ ] Validate fixed 32×32 sheet cells independently of alpha bounds. Alpha padding and contacts
  are recorded in [asset-bounds.json](visual-qa-evidence/asset-bounds.json).
- [ ] Profile native and desktop gameplay for 60s and a 10-minute climb: FPS/p95 frame time,
  active/display objects, bodies, textures, particles, draw calls and texture switches.
- [ ] Stress 100 overlapping feedback events: pool stays at 96 sprites and 6 labels; exhausted
  decoration is dropped; shutdown frees scene objects and baked UI textures.
- [ ] Background pool: 18 raster-layer objects (two palette banks, including four landmarks), fixed trunk pool sized
  for logical viewport height, 18 accents. Counts stay constant through at least 10,000 updates.
- [ ] Compare counts after 20 menu/game/pause/results cycles; no persistent growth.

Gallery memory is **estimated uncompressed source RGBA bytes**, not measured GPU allocation:
it excludes render targets, driver overhead, duplicate CPU copies and mipmaps. Record those
limitations with the profile. Canvas has no WebGL draw-call batching benefit from an atlas.
For WebGL, measure draw calls before/after packing world/actor/UI families. Only retain an atlas
when repeated gameplay captures show a material reduction (target ≥20%) without higher memory
or broken nearest-neighbor edges. Keep individual source PNGs and a deterministic packing script;
never hand-maintain UV coordinates or trim actor cells. No unmeasured atlas optimization is approved.

## Accessibility and art comparison

- [ ] Moving platform arrows, spring up-arrow, crumble fracture symbol and hazard exclamation
  remain distinguishable with grayscale/protanopia/deuteranopia/tritanopia previews.
- [ ] Compare HUD, prompts, buttons, selection/focus, paused and results text against the actual
  adjacent panel colors: target ≥4.5:1 normal text, ≥3:1 large text and meaningful UI boundaries.
  [contrast.json](visual-qa-evidence/contrast.json) samples panel centers; also inspect edges,
  animated/disabled states and composited translucent backgrounds manually.
- [ ] Reduced motion preserves warning symbols and event labels without requiring animation.
- [ ] Compare candidate PNGs and recordings to art bible at native/integer zoom: palette,
  upper-left lighting in both facings, proportions, stepped contours, shading bands, silhouette,
  registration, transparent padding, collision edge and background detail hierarchy.
- [ ] Obtain explicit art-owner acceptance of unresolved deviations and approved golden captures.

## Resolved release findings - 2026-09-16

- All five character sheets have fixed 32x32 cells, a consistent transparent safety envelope,
  stable planted contact pixels and one run contact baseline. Tight alpha bounds may vary by
  pose; frames are never individually trimmed or recentered. Run cadence follows horizontal
  speed. The render foot aligns to the fixed physics body's bottom, including platform carry.
- Restored grass platforms use their original 80x24 source cells with the existing collision edge preserved. Moving platforms
  and enemies now preserve custom body dimensions and offsets during every movement update.
- Every viewport uses the art bible's 480x800 logical canvas. Integer sprite/UI scales replace
  fractional feedback scaling; authored poses supply squash and stretch.
- Original layered forest artwork is restored following the user visual review. Five baked biome palettes and
  bounded crossfade banks work in both renderers. Colored particles also use baked textures.
- Branches overlap visible bark and platform centers; decorations pivot inside the trunk with
  subtle sway. Snakes/thorns follow their support, stay within its surface and disappear on collapse.
  [Attachment regression report](visual-qa-evidence/attachments/report.json) exercises all four
  platform types through 120 movement samples in both renderers with stable enemy bodies.
- Touch tracks independent fingers, retains minimum 44 CSS-pixel hit targets, clears on
  interruption and disables during pause. Gamepad pause/confirm are release guarded across
  resume and reconnect. Connection listeners are removed on shutdown.
- Platform/hazard symbols supplement color. Actual label plates and shape-cue contrast pass
  numeric checks, including grayscale and three color-vision deficiency approximations.

## Executed evidence

- **362 browser smoke checks passed with zero page errors** across 36 viewport/DPR/renderer
  combinations, 51 gallery pages per renderer, scene input/focus checks, interactive bounds,
  and all character/enemy/platform frame body and origin invariants in both facings.
- Build, character geometry/transitions, scene-transition contracts, feedback-pool contracts,
  asset registration, platform dimensions and actual label-plate contrast checks pass.
  Vite retains its existing large main-bundle warning.
- [Extended release report](visual-qa-evidence/release/report.json): **32 checks passed, zero
  page errors**. Includes browser multi-touch dispatch, simulated controller guards,
  moving-body/contact checks and 20 complete scene cycles for each renderer.
- [Renderer comparison](visual-qa-evidence/release/renderer-parity.json): five endpoints remain below 2/255 mean RGB-channel
  error. Original translucent layers accumulate more rounding during crossfades: four midpoint
  comparisons remain below 3/255, within a documented 4/255 blend-only tolerance.
- Current stress timings, source-memory estimates, object/texture counts and draw calls are
  recorded in [the 60-second stress profile](visual-qa-evidence/release/stress-profile.json).
  The final functional rerun uses a one-second profile to recheck cache warm-up without repeating
  the completed stress workload. Original layered art
  uses more source texture memory than the rejected flat-color replacement. Interpret headless
  timings as regression diagnostics, not hardware certification. The background soak advances
  36,000 updates (10 simulated minutes), not ten real-time minutes of full gameplay.
- Refreshed screenshots and two WebM recordings are indexed in
  [the evidence directory](visual-qa-evidence/README.md). The main browser report records
  completed viewport/input/body checks; captures alone are not visual approval.

## Remaining acceptance

- Physical phone/tablet and controller checks: devices are available; results are pending.
  Check simultaneous movement/jump and independent release, rotation, app interruption,
  menu navigation, pause/resume, held confirmation and controller reconnection.
- Review candidate stills and recordings against [the art bible](art-direction.md), especially
  contact motion, minimum-viewport readability and hazard distinction. Numeric color simulations
  do not establish usability for every viewer. Record art-owner acceptance before promoting
  these candidates to golden references.
- Unchecked manual matrix items above (browser zoom/fullscreen, device safe areas, GPU context
  recovery and physical long-run performance) remain explicit release checks.

The identified implementation blockers are corrected. Production approval remains pending
manual acceptance; automated checks cannot supply it.
