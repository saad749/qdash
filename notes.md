# QDash — Session Handoff Notes

Compressed history and state of the project, for resuming work in a fresh
Claude Code session. Last updated: 2026-08-14.

## What this is

A local Geometry Dash-style auto-runner. **Phaser 3.90.0 vendored** at
`lib/phaser.min.js` (global script) + plain ES modules — **no build step, no
dependencies, no backend**. All persistence in localStorage key `qdash.save.v1`
(blobs written before the QDash rename are read once from `qgd.save.v1`).
All art generated from Phaser Graphics at boot; all audio (per-level chiptune +
SFX) synthesized with Web Audio — zero asset files, nothing copyrighted.

Run: `python -m http.server 8080` in the project root → http://localhost:8080
(ES modules need http, not file://). Headless test: `node tools/smoke.mjs`.

## Season 2 rollout plan — "The Dark Awakens"

Levels are grouped into seasons. Season 1 "The Tumble Wvrumbles" (released
2026-08-08) keeps levels 1–5. Season 2 "The Dark Awakens" (released 2026-08-14)
adds levels 6–10. Season 3 is an unreleased placeholder.

Decisions taken up front:
- **Level ids stay globally sequential (6–10), not per-season.** Saved records
  are keyed by level id, so re-numbering would orphan every existing record;
  `?level=N` and the leaderboard keep working untouched.
- **Seasons are declared once** in `src/seasons.js`; `levels/index.js` stays the
  level registry. A test asserts the two agree, so adding a level without
  putting it in a season (or vice versa) fails the build.
- **Story arc drives the art**: ember → violet → black-blue → gold → blood-red,
  so the season reads as darkness rising and then being beaten back.
- **Difficulty resets slightly at level 6** (about level 4's tier) and ramps past
  level 5 by level 8, so season 2 opens playable but ends as the hardest content.

### Data model
- [x] `src/seasons.js`: SEASONS (id, name, status, releasedOn, levelIds),
      `seasonOf(levelId)`, `nextLevelId(levelId)` — next stays inside the season
- [x] `src/levels/index.js`: register levels 6–10, extend LEVEL_IDS
- [x] `src/audio/songs.js`: song6–song10, darker scales, 150–164 BPM

### Season 2 levels (ids 6–10)
- [x] 6 **The Growl Loses Power** — the beast weakens: crumbling stair descents,
      a dying-ember palette, ~level 4 difficulty as the season opener
- [x] 7 **The Darks Starts to Spread** — the dark creeps in: long triangle
      corridors that keep narrowing, spike clusters spreading outward
- [x] 8 **The Moons Turns Black** — night flight: the ship-heaviest level, two
      corridors under a black sky, tight ceilings
- [x] 9 **A Hero Arises** — the climb back: launch-pad ascents onto high
      platform chains, gold palette, upward momentum
- [x] 10 **The Twisted Warden Falls** — the boss: longest level, every mechanic,
      a final gauntlet of triples and rapid flips

### UI
- [x] `SeasonSelectScene` — one card per season, RELEASED + date tag, season 3
      shows COMING SOON and is not clickable
- [x] `LevelSelectScene` takes `{ seasonId }`, shows that season's five levels
- [x] `LeaderboardScene` — season-aware tabs (5 level tabs + season switcher)
- [x] `LevelCompleteScene` — "Next Level" stays inside the season (no button on
      a season finale, preserving the existing level-5 behaviour)
- [x] `MenuScene` Play → SeasonSelect; first-timer auto-create still enters L1
- [x] `main.js` registers SeasonSelectScene

### Tests (all in tools/smoke.mjs)
- [x] season↔level agreement: ids unique, all exist, LEVEL_IDS is the union
- [x] release metadata: released seasons have a real past date, coming-soon has
      no date and no levels
- [x] every level's `song` key exists in SONGS, and `id` matches its registry key
- [x] levels 6–10 pass the existing invariants (checkpoints, tunnels, portals,
      reachability) — the existing loop covers them once registered
- [x] season 2 level names match the spec exactly (guards typo regressions)
- [x] `nextLevelId` stops at a season boundary; `seasonOf` maps every level
- [x] routing: Play → SeasonSelect, season card → LevelSelect for that season
- [x] regression: levels 1–5 metadata unchanged (names, lengths, songs)

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
- **Play with no profiles yet** auto-creates `Player####` and starts level 1
  instantly (`MenuScene.startPlay` → `storage.createRandomPlayer`). If profiles exist
  but none is current, Play still opens the picker — otherwise every Play tap
  after deleting the current player would spawn another junk profile.
- Synthesized music: lookahead step-sequencer (`src/audio/music.js`), one
  4-bar spec per level in `songs.js` (126→166 BPM); music survives deaths.
- **Seasons** (`src/seasons.js`): season 1 "The Tumble Wvrumbles" = levels 1–5
  (released 2026-08-08), season 2 "The Dark Awakens" = levels 6–10 (released
  2026-08-14), season 3 = unreleased placeholder. Play → SeasonSelect →
  LevelSelect. Level ids stay global so records keyed by id survive releases.

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
- `levels/` — helpers.js (block/spike/portal/tunnel/pad/... builders), level1-10.js,
  test.js (sandbox), index.js. Grid coords: x cells from start, y rows above ground.
- `seasons.js` — season list + `seasonOf` / `nextLevelId` / `releaseLabel`. The
  only place a level id is tied to a season; smoke.mjs asserts it agrees with
  `levels/index.js` in both directions.
- `scenes/` — Boot, Menu, PlayerSelect, SeasonSelect, LevelSelect, Game (core
  loop), Hud (parallel overlay via game-events qdash:*), Pause, LevelComplete,
  Leaderboard. Leaderboard tabs are per season, not one row of ten.

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
  every corridor, all modes present, platform reachability, block overlap /
  buried spikes / sensors-on-spikes / uncovered spike runs >3), season↔level
  agreement and release metadata, song specs, scene routing (season picker,
  level cards, season-finale next-level, leaderboard tabs), storage/leaderboard
  logic. All passing. The invariants were mutation-checked: breaking a tunnel
  shift, a checkpoint percentage, a pad, a level name, `nextLevelId`, a season's
  status, or season 3's clickability each makes a named check fail.
- **Season 2 (levels 6–10) has NOT been bot-verified end to end.** They pass
  every static invariant, and their patterns are copied from shapes the bot
  already cleared in levels 1–5, but no run has confirmed them completable.
  Do that first if season 2 difficulty comes up: inject `tools/autoplay.js` on
  each of 6–10 and check `__bot.summary()`.
- **End-to-end playthroughs (season 1): DONE (2026-08-08, browser automation).** All 5
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

Bot-verify levels 6–10 end to end (see Verification state — the one gap in
season 2). Then tune difficulty per the observations above (user decides feel);
possible features: season 3 content, more pad types (GD blue/pink pads, orbs),
level-unlock progression, gamepad support, export/import of the save blob.
