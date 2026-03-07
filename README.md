# Jungle Jumper

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