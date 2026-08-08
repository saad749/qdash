# QGeometry Dash

A local Geometry Dash-style auto-runner built with Phaser 3. No build step, no
backend, no accounts — everything (players, colors, leaderboards) is stored in
your browser's localStorage.

## Run

```
cd D:\projects\Qgeometry_dash
python -m http.server 8080        # or: npx serve -l 8080
```

Open http://localhost:8080 in Chrome/Edge/Firefox. (A server is required —
ES modules don't load from `file://`.)

## Play

- **Space / Up / W / Click** — jump (cube), thrust (ship), flip gravity (triangle)
- **Esc / P** — pause · **M** — mute · **R** — restart level
- Portals switch your form: **cube** jumps, **ship** flies while held, and the
  **triangle** rides the edges of neon zig-zag tunnels — tap to flip gravity to
  the opposite edge. Watch for 2-cell tunnel shifts: you must be riding the
  receding edge to survive them.
- **Gold launch pads** fire automatically when you drive over them, springing
  you about 3 cells high — the only way onto the taller floating platforms
  (levels 2–5).
- Each level has **5 checkpoints** (~15/33/50/67/85%). Dying respawns you at the
  last one reached with your form and gravity restored.

## Levels

1. **Stereo Madness** — the classic opener
2. **Finally Out**
3. **Campin Outside**
4. **Out Lost**
5. **Back on Track**

Difficulty ramps up: later levels bring triple spikes, tighter ship corridors,
and narrow tunnels with rapid forced flips.

## Players, colors, leaderboards

Create any number of local players (Menu → Players & Colors), pick who's
playing, and choose a character color: purple, **green** (default), blue, red,
pink, orange, or yellow. The per-level leaderboard ranks completed runs by best
time first, then partial runs by best progress.

## Project status

Feature-complete: 5 levels, 3 modes (cube / ship / triangle), launch pads,
checkpoints, player profiles with 7 colors, local leaderboards, synthesized
music. Two playtest bugs fixed: unreachable platforms (solved with launch pads +
an automated reachability check) and a ship→cube portal clip-through (solved by
preserving the hitbox's bottom edge across mode switches + an under-ground
failsafe). Full development history and architecture notes: **notes.md**.

## Dev tools

- `?level=3` — jump straight into level 3 · `?level=test` — physics sandbox
- `?cp=4` — spawn at checkpoint 4
- **H** in-game — show physics hitboxes
- `node tools/smoke.mjs` — headless smoke test (module imports, level-data
  invariants, storage/leaderboard logic)
- `tools/autoplay.js` — in-page autoplayer bot for playtesting; inject from the
  console while a level runs (see notes.md). All 5 levels are verified
  completable end-to-end by it.
- All physics tuning numbers live in `src/constants.js`; all level layouts in
  `src/levels/level*.js` (grid coordinates: x in cells, y in rows above ground).

All art is generated at boot from Phaser Graphics and every sound — including
each level's chiptune track — is synthesized live with the Web Audio API, so the
repo ships zero asset files and nothing copyrighted.
