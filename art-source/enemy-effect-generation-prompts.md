# Enemy and effect concept prompts

Built-in image generation was used for motion/silhouette reference. The shipped PNGs
were then redrawn on the native grid with `scripts/generate-enemy-effect-assets.py`.
All prompts requested genuinely transparent backgrounds and prohibited text, guides,
frame boxes, scenery, logos, watermarks, antialiasing, and gradients.

## Enemies

- **Snake:** Original jungle snake enemy reference sheet with patrol slither, attack
  anticipation/lunge, hit recoil, and defeated flatten/exit poses. Single horizontal
  row of eight consistent bottom-center poses; chunky 32 px modern-handheld pixel art;
  deep-purple outline, hazard green body, dark-green pattern, red tongue/damage cues.
- **Coconut:** Original falling coconut hazard reference sheet with hanging idle,
  shaking anticipation, spinning fall, impact, crack, defeat, and exit poses. Single
  row of eight centered 32 px poses; brown shell, dark fibers, warm highlight, red
  impact cue.
- **Thorn vine:** Original low horizontal jungle thorn-vine reference sheet with idle
  sway, bristling anticipation, hit interaction, and wilt poses. Single row of eight
  bottom-centered 32 px poses; green vine, unmistakable outward red thorns, deep outline.
- **Bat:** Original jungle bat reference sheet with aerial patrol flap, dive
  anticipation, hit recoil, and defeated/exit poses. Single row of eight centered
  32 px poses; broad angular purple wings, pointed ears, red eyes, tiny fangs.

## Pickups and effects

- **Shield idle:** Four-frame hovering 16 px cyan pickup with a diamond core and a
  clean silhouette clearly distinct from plants and hazards.
- **Shield pickup burst:** Six-frame 32 px cyan effect expanding from a spark into a
  ring and fading; celebratory rather than damaging.
- **Shield shell:** Four-frame 64 px hollow cyan force-field shell with moving highlight,
  segmented arcs, centered registration, and a transparent player area.
- **Warning indicator:** Four-frame 16 px red triangular falling-hazard warning with a
  white exclamation and yellow pulse sparks.
- **Impact burst:** Six-frame 32 px angular harmful burst moving from contact star to
  separated red-purple shards and disappearance.
- **Damage flash:** Four-frame 32 px hollow overlay of white/red edge arcs and outward
  pixels that communicates a hit without obscuring the player.

Shared palette: `#211936`, `#FFE6A3`, `#27AE60`, `#1E8449`, `#8B4513`,
`#5C3317`, `#C0392B`, `#4A235A`, `#6C3483`, `#00BFFF`, `#87CEFA`, and `#FFFFFF`.
