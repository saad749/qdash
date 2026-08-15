# QDash

A local Geometry Dash-style auto-runner built with Phaser 3. No build step, no
backend, no accounts — everything (players, colors, leaderboards) is stored in
your browser's localStorage.

## Run

```
cd D:\projects\qdash
python -m http.server 8080        # or: npx serve -l 8080
```

Open http://localhost:8080 in Chrome/Edge/Firefox. (A server is required —
ES modules don't load from `file://`.)

## Play

- **Space / Up / W / Click** — jump (cube), thrust (ship), flip gravity (triangle)
- **Esc / P** — pause · **M** — mute · **R** — restart level
- Portals switch your form: **cube** jumps, **ship** flies while held — touching
  the roof or the floor destroys it, so it has to be flown, not parked — and the
  **triangle** rides the edges of neon zig-zag tunnels — tap to flip gravity to
  the opposite edge. Watch for 2-cell tunnel shifts: you must be riding the
  receding edge to survive them.
- **Gold launch pads** fire automatically when you drive over them, springing
  you about 3 cells high — the only way onto the taller floating platforms
  (levels 2–5).
- Each level has **5 checkpoints** (~15/33/50/67/85%). Dying respawns you at the
  last one reached with your form and gravity restored.

## Seasons

**Season 1 — The Tumble Wvrumbles** · released 8 Aug 2026

1. **Stereo Madness** — the classic opener
2. **Finally Out**
3. **Campin Outside**
4. **Out Lost**
5. **Back on Track**

**Season 2 — The Dark Awakens** · released 14 Aug 2026

6. **The Growl Loses Power** — underground: long stretches under a 3-row roof
   where floor spikes mean jump and ceiling spikes mean stay down
7. **The Darks Starts to Spread** — form churn: ten sections, so you change shape
   every few seconds and never settle
8. **The Moons Turns Black** — the ship gauntlet: three corridors, over half the
   level flying, roof and floor both lethal
9. **A Hero Arises** — jump-heavy: pad ascents and stair chains almost end to end
10. **The Twisted Warden Falls** — the boss: every signature above, once, at the
    tightest spacing in the game

**Season 3** — coming soon.

Every level has one signature that dominates its layout, rather than all of them
running the same cube → tunnel → ship sequence. Difficulty ramps inside each
season, and no obstacle anywhere leaves you less than 4 frames (67 ms) to react —
the tightest in the game is a triple spike at 4.4 frames.

## Players, colors, leaderboards

On a fresh install, **Play** creates a throwaway `Player####` profile and starts
level 1 immediately — no setup screen. Otherwise create any number of local
players (Menu → Players & Colors), pick who's playing, and choose a character
color: purple, **green** (default), blue, red, pink, orange, or yellow. The
per-level leaderboard ranks completed runs by best time first, then partial runs
by best progress.

## Project status

Feature-complete: 10 levels across 2 released seasons, 3 modes (cube / ship /
triangle), launch pads, checkpoints, player profiles with 7 colors, local
leaderboards, synthesized music. Two playtest bugs fixed: unreachable platforms
(solved with launch pads + an automated reachability check) and a ship→cube
portal clip-through (solved by preserving the hitbox's bottom edge across mode
switches + an under-ground failsafe). Full development history and architecture
notes: **notes.md**.

## Dev tools

- `?level=3` — jump straight into level 3 · `?level=test` — physics sandbox
- `?cp=4` — spawn at checkpoint 4
- **H** in-game — show physics hitboxes
- `node tools/smoke.mjs` — headless smoke test (module imports, level-data
  invariants, season/level agreement, scene routing, storage/leaderboard logic)
- `node tools/botrun.mjs [levels...]` — plays levels for real in headless Edge or
  Chrome (DevTools Protocol, no npm packages) and reports whether the autoplayer
  finished each one. Needs `npm start` running in another shell.
- `node tools/window.mjs <level> <cell>` — how many frames/ms a hazard leaves you
  to jump; `--audit` tables every hazard in every level. No obstacle in the game
  leaves under 4 frames, and the smoke test enforces that floor.
- `node tools/mechtest.mjs` — mechanic assertions that need real physics running
  (ship roof/floor death, portal lift-off), which the stubbed smoke test can't reach
- `node tools/shot.mjs <level> <seconds...> [--die]` — screenshots the running
  game at each timestamp (and mid-death with `--die`) into `tools/shots/`, for
  checking visual changes instead of guessing at them.
- `tools/autoplay.js` — the bot itself; also injectable from the console while a
  level runs (see notes.md) for interactive playtesting. All 10 levels are
  verified completable end-to-end by it.
- All physics tuning numbers live in `src/constants.js`; all level layouts in
  `src/levels/level*.js` (grid coordinates: x in cells, y in rows above ground).

## Look

Each level has its own colour, and each **mode section within a level** has its
own accent — the terrain, hazards, tunnel neon and background all shift when you
pass through a portal, so a level's ship stretch feels like a different place
from its cube stretch. Crashing shatters the cube into tumbling shards with a
shockwave ring, and the player leaves a trail that changes per form: a spray off
the cube, a thruster stream behind the ship, a streak behind the triangle.

All art is generated at boot from Phaser Graphics and every sound — including
each level's chiptune track — is synthesized live with the Web Audio API, so the
repo ships zero asset files and nothing copyrighted. The obstacle textures are
drawn in greyscale and tinted at runtime, which is what makes the per-section
palettes possible without a single extra image.
