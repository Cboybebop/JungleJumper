# Jungle Jumper
![Jungle Jumper screenshot](https://raw.githubusercontent.com/Cboybebop/JungleJumper/1c7d4d7fb0e1320707c72c16e41f5f0b513b6fc8/screenshots/gameplay-1.png)
<img width="3771" height="1916" alt="image" src="https://github.com/user-attachments/assets/7c3f7f68-bb48-40ac-b2ba-63f3410c3fa3" />

A jungle-themed vertical platformer built with Phaser 3, TypeScript, and Vite.

## Features

- Infinite upward platform generation
- Multiple platform types (normal, moving, crumbling, spring)
- Obstacles and shield pickups
- Character selection
- Key rebinding in settings
- Mobile touch overlay toggle in settings
- Keyboard and gamepad UI navigation

## Tech Stack

- Phaser 3
- TypeScript
- Vite

## Requirements

- Node.js 20+
- npm

## Getting Started

```bash
npm install
npm run dev
```

Open the local URL shown by Vite (usually `http://localhost:5173`).

## Available Scripts

```bash
npm run dev      # Start development server
npm run build    # Type-check and production build
npm run preview  # Preview production build
```

## Controls

### In-Game

- Move left: `A` or `Left Arrow`
- Move right: `D` or `Right Arrow`
- Jump: `Space` or `Up Arrow`
- Pause: `Esc`

Gamepad:

- Move: D-pad or left stick
- Jump: `A`
- Pause: `Start`

### Menu / UI Navigation

Keyboard:

- Navigate: `Arrow Keys`, `WASD`, or `Tab`
- Confirm: `Enter` or `Space`
- Back: `Esc` (where available)

Gamepad:

- Navigate: D-pad or left stick
- Confirm: `A`
- Back: `B` (where available)

## Settings

From the Settings screen you can:

- Rebind keyboard controls
- Reset key bindings
- Toggle mobile touch overlay (`Touch Overlay` ON/OFF)

## Build Output

Production files are emitted to `dist/`.

### Website metadata and icons

Set `VITE_SITE_URL` to the deployed game's full public URL (including any subdirectory)
in your build environment or `.env.production.local` before running `npm run build`.
The build then adds a canonical URL, absolute social preview image URLs, a sitemap,
and a sitemap reference in `robots.txt`. Without it, the build omits domain-specific
metadata so local previews do not advertise an incorrect production address.

Browser favicons, iOS home-screen icons, Android icons (including maskable), and
the web manifest are included in `public/`. Regenerate the code-drawn pixel monkey
icons and social preview card with `python scripts/generate-web-icons.py` (Pillow required).
The manifest enables standalone home-screen presentation; offline play is not provided.
