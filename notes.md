# QGeometry Dash — Session Handoff Notes

Compressed history and state of the project, for resuming work in a fresh
Claude Code session. Last updated: 2026-08-08.

## What this is

A local Geometry Dash-style auto-runner. **Phaser 3.90.0 vendored** at
`lib/phaser.min.js` (global script) + plain ES modules — **no build step, no
dependencies, no backend**. All persistence in localStorage key `qgd.save.v1`.
All art generated from Phaser Graphics at boot; all audio (per-level chiptune +
SFX) synthesized with Web Audio — zero asset files, nothing copyrighted.

Run: `python -m http.server 8080` in the project root → http://localhost:8080
(ES modules need http, not file://). Headless test: `node tools/smoke.mjs`.

## Requirements implemented (all confirmed with the user)

- 5 levels, designs mirroring the first five official GD levels, but named:
  1 Stereo Madness · 2 Finally Out · 3 Campin Outside · 4 Out Lost · 5 Back on Track
- 3 modes via portals: **cube** (tap jump), **ship** (hold to fly),
  **triangle** — user-invented mode: rides the edges of neon zig-zag tunnels,
  tap flips gravity to the opposite edge. Every level has ≥1 tunnel section.
- **Gold launch pads** (auto-fire, spring animation, ~3-cell launch) — added
  after user playtest; required for platforms 2 cells up.
- 5 predefined checkpoints per level at ~15/33/50/67/85%; death respawns at the
  last one with mode/gravity restored (live snapshot at touch time).
- 7 character colors (green default), per-player, applied by tinting white textures.
- Local player profiles (create/select/delete) + per-level leaderboards:
  completed runs by best time, then partials by best %, ties by attempts.
- Synthesized music: lookahead step-sequencer (`src/audio/music.js`), one
  4-bar spec per level in `songs.js` (126→148 BPM); music survives deaths.

## Architecture map (src/)

- `constants.js` — ALL physics tuning + colors + grid helpers (gx/gy). 64 px grid,
  ground surface y=656, scroll 560 px/s, cube jump −1050/gravity 5000 (arc ≈3.7
  cells long, climbs max +1 cell), PAD.VY −1400 (reaches +2 cells).
- `storage.js` — save blob, player CRUD, records, leaderboard sort. `ui.js` — button/text/panel factory.
- `audio/` — engine.js (context+buses, unlock on first gesture), sfx.js, music.js, songs.js.
- `game/` — textures.js (all generated), Player.js (mode state machine, dual
  hitboxes: outer vs blocks, inner vs hazards), Tunnel.js (manual corridor
  collision; 1-cell zigs ride up ≤88 px, 2-cell shifts kill unless riding the
  receding edge), LevelBuilder.js (level module → groups/zones/tunnels).
- `levels/` — helpers.js (block/spike/portal/tunnel/pad/... builders), level1-5.js,
  test.js (sandbox), index.js. Grid coords: x cells from start, y rows above ground.
- `scenes/` — Boot, Menu, PlayerSelect, LevelSelect, Game (core loop), Hud
  (parallel overlay via game-events qgd:*), Pause, LevelComplete, Leaderboard.

Physics: Arcade, `fixedStep:true, fps:60`, world gravity 0, per-body gravity.
Camera: manual `scrollX = player.x − 384`. Wall-face contact (`blocked.right`)
= death with 13 px corner-forgiveness lift (`cornerForgive`).

## Bugs found by user playtests, and their fixes (both are cautionary patterns)

1. **Impossible jumps** (L2–L5): floating chains started 2 cells up but the cube
   climbs max +1. Fixed with launch pads placed before each chain (+ intro pad in
   L2 at x=87). Guard: smoke.mjs *reachability check* — any cube-section platform
   ≥2 cells up must have a support block (≤3 cells before, ≤1 lower) or a pad
   (≤4 cells before) or the test fails. Keep it passing when editing levels.
2. **Ghost-ship clip-through**: switching to a taller body while resting on a
   surface (ship hugging floor → cube exit portal) embedded the new body 12 px
   into the ground — beyond Arcade's per-frame separation cap (deltaAbs+4 px) →
   marked "embedded", fell through the world, invisible invincible run.
   Fix: `Player.setMode` preserves the body's **bottom edge** across resizes,
   plus failsafe in GameScene.update: `body.bottom > GROUND_Y+24` → die().
   Remember this for ANY future body-resize feature.

## Verification state

- `tools/smoke.mjs`: module imports (stubbed Phaser/localStorage), level
  invariants (5 checkpoints at ±3% of targets, tunnel contiguity/width/shift
  limits, tri portals inside corridors with entry floor ≤1, exit portal inside
  every corridor, all modes present, platform reachability), storage/leaderboard
  logic. All passing.
- **End-to-end playthroughs: DONE (2026-08-08, browser automation).** All 5
  levels completed by `tools/autoplay.js` (see below) with zero deaths on the
  final bot runs. Completion times ≈ design targets: 70.8 / 77.3 / 83.9 / 90.7 /
  96.8 s. Verified along the way: all portals/mode switches, launch pads,
  checkpoint respawns (incl. mid-tunnel checkpoints), tunnel shift/spike kills,
  wall-face + corner-forgiveness deaths, completion screen (no "Next Level" on
  L5 — correct), storage records, leaderboard ranking + current-player
  highlight. A "Bot" player profile holds the reference times (#1 on each
  board); delete via Menu → Players & Colors if unwanted.

## Autoplayer (tools/autoplay.js)

In-page playtest bot. Inject while a level is running (needs `window.game`,
exposed in main.js):
`const s=document.createElement('script'); s.src='/tools/autoplay.js?'+Date.now(); document.head.appendChild(s);`
It reads GameScene state each frame and drives the normal input path
(`ptrDown`/`ptrJust`). Cube: greedy ballistic lookahead (jump-vs-wait, 2 future
jumps, ~0.8 s horizon) against block/spike/pad rects. Ship: bang-bang thrust
toward corridor-gap centers probed ahead. Triangle: flips ahead of 2-cell shifts
and edge spikes. `__bot.summary()` = live status/deaths; `__bot.detach()` stops
it; `__bot.debugCube(x,y)`/`__bot.traceJump(x,y)` inspect cube decisions.
Hard-won calibration lessons (keep if rewriting): jump at the FIRST fully-safe
frame, never the last viable one; never let plans depend on 1-frame pad grazes
(sim credits pads only when descending with ≥6 px depth, zones shrunk 10 px);
inflate spike rects ~3 px so near-misses read as deaths.

## Difficulty observations from bot playtesting (user judgment needed)

- Triple spikes (L4 c54/130/280/330..., L5 several) have a ~31 px takeoff
  window ≈ 3 frames at 60 fps — near-frame-perfect, expert tier. If casual
  players are the target: JUMP_VY −1050 → ~−1100, or narrow SPIKE_HIT.W, or
  space triples into 2+1.
- Spikes sitting ON elevated blocks (L2 c257, L3 c545) force a
  jump-land-jump-immediately chain — tight but fair.
- Mandatory-pad approaches (L4 c309, L5 c53): hopping over the pad = guaranteed
  death at the +2 face behind it. Human players who jump the preceding spikes
  late will graze or miss the pad. Consider widening pads or adding a spike
  right before each pad to force grounded approach.

## Likely next steps

Tune difficulty per the observations above (user decides feel); possible
features: more pad types (GD blue/pink pads, orbs), level-unlock progression,
gamepad support, export/import of the save blob.
