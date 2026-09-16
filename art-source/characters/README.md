# Character source and registration

`miko-actions-source.png` is the preserved source strip, not an exported runtime file.
The other four characters are authored in `scripts/generate-character-assets.mjs`.
Run that script to regenerate all five runtime strips and portraits deterministically.

The export uses a common 32×32 coordinate system, transparent edge columns 0/31,
transparent rows 0/30/31, and grounded contact row 29 (lower edge y=30).
Extreme poses are confined to this common envelope, not trimmed and recentered.
Idle, anticipation and landing keep their contact pixels planted. Zippy's foot height
is independent of its secondary tail motion. `verify-visual-assets.py` enforces these
properties and rejects any regression; tight alpha bounds are allowed to change with pose.
