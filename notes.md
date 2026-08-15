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

## Visual pass plan — "it feels dull next to GD"

Three asks: obstacles coloured differently at some points so sections feel
different, a break-apart animation when the player crashes, and a trail behind
the moving player.

Decisions taken up front:
- **Tint, don't re-author.** `block` / `spike` / `ground` are redrawn in
  greyscale so a runtime `setTint` can produce any colour. Shapes, sizes and
  hitboxes are untouched, so no level data changes and physics is unaffected.
- **Colour follows the mode section.** Obstacles take the palette of the section
  they stand in (cube / ship / triangle), so the world changes colour at every
  portal. That is where "different feelings at some points" comes from, and it
  doubles as a read on the mode switch the player has to react to.
- **One accent per level per mode, everything else derived.** 30 authored
  colours instead of ~90: block = accent darkened, spike = accent lightened,
  ground = cube accent darkened hard. Keeps every section internally coherent.
- **Readability first.** Spikes stay light-bodied with a dark core in every
  palette — a hazard must never blend into the terrain it sits on.

### Data
- [x] `src/palette.js` — per-level accents + derived block/spike/ground colours
- [x] greyscale `block` / `spike` / `ground` textures, new `shard` texture
- [x] `LevelBuilder` tints each block/spike by the mode section it falls in
- [x] tunnel neon and backdrop ground/deco take the level palette

### Effects
- [x] death: the cube shatters into tumbling shards under gravity, plus an
      impact flash — replacing the flat square burst, keeping shake and timing
- [x] trail: per-mode emitter following the player (cube spray, ship thruster,
      triangle streak); stops on death, resumes on respawn

### Tests
- [x] every level resolves a palette; all mode keys present and valid 24-bit hex
- [x] derived colours stay in range and spikes stay lighter than their blocks
- [x] every texture key referenced by code exists in the generator
- [x] bot re-run: 9/10, and the one failure (level 3 cell 545) reproduces with
      the visual work stashed — so the effects cost nothing. Season 2 times came
      back within a second of their pre-visual-pass values (97/100/104/108/115 s)
- [x] screenshots captured and eyeballed for each season (`tools/shot.mjs`);
      the first attempt was *worse* — a too-light block body turned tinting into
      pastel mud — which is exactly why this step is not optional

## Level identity plan — "every level feels like the same journey"

User feedback (2026-08-14): the levels all read the same, and the only real
obstacle is the triple spike. True — every level was cube → tunnel → ship →
cube → tunnel → cube with near-identical spacing, so the *order* of forms was
the only structure and nothing else varied.

The fix is to give each level one **signature** that dominates its layout, the
way each GD level does, and to widen the difficulty vocabulary beyond "how many
spikes in a row".

### What GD does that we can copy with the primitives we already have

QDash has no mini/wave/UFO/orbs/speed portals, so the GD ideas get translated:

| GD level | What makes it distinct | QDash translation |
|---|---|---|
| Jumper | fast quick jumps, consistency across segments | long cube stretches, pad + platform chains, almost no ship |
| Clutterfunk | mini mode: tight spaces, small hit windows | **low ceilings over cube sections** — a 3-row roof forbids the full jump arc |
| Cycles | gravity discipline, repeated switches | triangle corridors that never stop flipping |
| Electrodynamix | tight ship passages under pressure | long ship corridors, narrow gaps, now with lethal edges |
| Hexagon Force | constant form switching | portals every ~40 cells, no section long enough to settle |
| Deadlocked | everything, at density | all mechanics, tightest spacing, no rest |
| Power Trip (SubZero) | longest, tighter corridors | the season finale profile |
| Airborne Robots (Meltdown) | hazards demanding careful jump timing | ceiling spikes over low roofs |

### The new capability this needs

- [x] **Low ceilings in cube sections.** `ceiling()` already existed but had only
      ever been used in ship sections. Over a cube run it caps the jump arc, so
      spacing that is trivial at full height becomes precise. The reachability
      invariant now recognises a ceiling (a block whose top reaches ROWS) as
      terrain rather than an unreachable platform, and a new headroom invariant
      requires ≥3 rows over whatever surface is underneath — below that the jump
      is impossible rather than tight.
      **Authoring rules under a 3-row roof: no platforms and no pads.** A jump
      from anything above the floor, or a pad launch, hits the roof. The headroom
      check enforces the platform half; pads are on you.

### Signatures

Season 1 keeps its role as the ramp; season 2 carries the harder identities.

- [ ] 1 Stereo Madness — **the teacher.** Unchanged: one hazard type at a time.
- [ ] 2 Finally Out — **jump rhythm.** Evenly spaced doubles and step-ups you
      can fall into a rhythm with; the first level that punishes late timing.
- [~] 3 Campin Outside — **platform chains.** Time spent off the ground: pads
      onto elevated runs, spikes below rather than in front. (Also move the
      cell-545 spike in from the step edge — see the known gap above.)
- [ ] 4 Out Lost — **first real ship test.** Longer corridor, pillars alternating
      floor/roof, lethal edges make it a flying test rather than a slide.
- [ ] 5 Back on Track — **tunnel discipline.** Two long corridors, flips every
      ~0.9 s, width 3 throughout.
- [x] 6 The Growl Loses Power — **underground.** The collapsing lair: most of the
      level runs under a 3-row roof with ceiling spikes, so jumps must be short
      and exact. Clutterfunk's pressure without a mini mode.
- [x] 7 The Darks Starts to Spread — **form churn.** Sections of ~40 cells, a
      portal at every seam; the dark spreading = you never stay one shape long.
- [x] 8 The Moons Turns Black — **ship gauntlet.** The flying level: three
      corridors, the last one narrow, all with lethal floor and roof.
- [x] 9 A Hero Arises — **jump-heavy ascent.** Pads and stair chains almost end
      to end, one short ship break; the level about airtime.
- [x] 10 The Twisted Warden Falls — **everything, dense.** Every signature above
      appears once, at the tightest spacing in the game.

### The 4-frame floor and why spike counts can't carry difficulty

`node tools/window.mjs --audit` measures, for every hazard, how many positions
you can jump from and live — in px, ms and frames, simulated the way the game
integrates (semi-implicit Euler, 60 fps, inner hitbox vs spike kill boxes).

Measured windows on flat ground:

| cluster | window | frames |
|---|---|---|
| single | 252 ms | 15.3 |
| double | 138 ms | 8.4 |
| triple | 23 ms | 1.6 |

That is the whole vocabulary, and it is **quantised by the 64 px grid**: there
is no cluster size that lands between 4 and 8.4 frames. It also explains the
user's "only the triples are hard, everything else is easy" — the curve was
bimodal with nothing in between.

**User decision (2026-08-14): no obstacle may leave under 4 frames**, and the
hardest obstacle should sit *near* that floor rather than far above it. Two
rounds got there:

1. First pass converted all 56 triples to doubles. That satisfied the floor but
   left the hardest hazard at 8.3 frames — "too easy", correctly.
2. Second pass retuned the jump instead. `CUBE.JUMP_VY` −1050 → **−1136**, which
   lifts a triple from 1.4 to **4.4 frames** and puts it right at the floor.
   Triples are back and are now the game's hard obstacle.

Windows at the current tuning (`node tools/window.mjs --audit`):

| cluster | −1050 (old) | −1136 (now) |
|---|---|---|
| single | 15.1 | 18.1 |
| double | 8.3 | 11.3 |
| triple | 1.4 (unfair) | **4.4** |
| quad | 0 (impossible) | 0 (still impossible) |

Consequences to keep in mind:
- **`tools/autoplay.js` hardcodes `CU.JUMP`.** It must be changed with
  `constants.js` or the bot mispredicts every jump in the game.
- The arc grew 3.67 → 3.98 cells and the peak 110 → 129 px (2.02 cells). The
  cube still cannot land on a +2 platform in practice — the peak exceeds 128 px
  by a pixel, for an instant — so pads remain the way up and the reachability
  invariant's premise holds. It is thinner than it was; re-check if the jump is
  ever raised further.
- Widening `SPIKE_HIT.W` was the other candidate and was rejected: the kill box
  is 22 px because the visible triangle is only ~13–43 px wide across the box's
  vertical span, so a wider box would kill in visibly empty air.
- Difficulty still should not come only from cluster size: density, approach
  position (a wide window entered late is a narrow window in practice),
  underground must-not-jump zones, ship precision and tunnel flips all count.

### Difficulty levers (beyond "more spikes in a row")

- [ ] tighten hazard spacing in later levels (currently 7–9 cells everywhere)
- [ ] spikes *on* platforms, forcing jump-land-jump chains
- [ ] ceiling spikes paired with low roofs
- [ ] narrower ship gaps now that edges kill
- [ ] longer unbroken tunnel runs with more 2-cell shifts

### Verification note

Every layout change has to survive `smoke.mjs` **and** `botrun.mjs`. The bot is
the only check that a shape is actually clearable, and it is conservative — it
jumps at the first safe frame, so anything needing a late jump will fail it even
when a human could do it (see the level 3 known gap).

## Requirements implemented (all confirmed with the user)

- 5 levels, designs mirroring the first five official GD levels, but named:
  1 Stereo Madness · 2 Finally Out · 3 Campin Outside · 4 Out Lost · 5 Back on Track
- **The ship must fly** (user request, 2026-08-14): roof or surface contact is
  death, replacing the old "soft ceiling: slide, never die" clamp. Two entry
  points had to be made safe, and they need *different* answers:
  * **Portal entry** happens from a grounded cube, so `setMode` applies
    `SHIP.LIFTOFF_VY` and the surface check exempts upward motion — otherwise
    the launch frame itself reads as a crash.
  * **Respawn** at a checkpoint inside a corridor can land you anywhere between
    floor and roof, so *no* launch velocity is safe: upward kills a
    roof-adjacent respawn (this is what made level 4 die 158× at cell 257).
    The player comes back at rest with `SHIP.RESPAWN_GRACE_MS` of harmless
    surfaces instead. Level 4's `checkpoint(257)` sits inside a 4-row corridor —
    keep that case in mind before touching this.
  Covered by `tools/mechtest.mjs`, which needs real physics. Two traps when
  writing tests there: assert on `attempt`, not `dead` (which clears at the
  700 ms respawn), and never assert that an unflown ship *survives* — it cannot,
  by design. Assert "one death, not a loop".
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
  ground surface y=656, scroll 560 px/s, cube jump −1136/gravity 5000 (arc ≈4.0
  cells long, climbs +1 cell; peak 129 px just grazes 2 cells but cannot land
  there), PAD.VY −1400 (reaches +2 cells). The jump value is chosen by the
  difficulty floor, not by feel — see the 4-frame floor section, and change
  `tools/autoplay.js`'s `CU.JUMP` with it.
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
- `palette.js` — one accent per level per mode; block/spike/backdrop/ground are
  derived from it. `block`, `spike` and `ground` textures are drawn in greyscale
  precisely so this can tint them, so never re-colour those textures directly —
  do it here. `GameScene.applyModeVisuals` rebuilds the trail and cross-fades the
  backdrop whenever the form changes.
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
- **End-to-end playthroughs (season 2): DONE (2026-08-14, `tools/botrun.mjs`).**
  All 5 levels completed by the bot on the first run with **zero deaths**, in
  97 / 101 / 104 / 108 / 115 s against design targets of 98 / 102 / 105 / 110 /
  117 s. Level 1 was replayed the same way as a harness control (69 s vs the
  70.8 s recorded in 2026-08-08's browser-automation run), so the runner
  measures the same game the earlier session did.
  Caveat: a bot clearing a level says it is **possible**, not that it is fairly
  tuned for a human — the bot has frame-perfect lookahead. Season 2's human
  difficulty is still unmeasured; the observations below apply to season 1 only.
- **RESOLVED — level 3 cell 545 (was a 9/10 blocker).** A full run on 2026-08-14
  came back 9/10 with level 3 stalling at 76 %. Four causes were ruled out one at
  a time, and the result is worth keeping because it corrects an old note:
  * **Not the visual pass** — stash it and the same run fails identically.
  * **Not the level** — `level3.js` untouched since the initial commit.
  * **Not the bot** — `autoplay.js` only ever touched by the initial commit and
    the QDash rename (an event prefix, no logic).
  * **Not frame rate** — `QDASH_HEADED=1` (visible, GPU-composited window) fails
    at the same cell with the same death count as headless software rendering.
    Deterministic, not a timing coin-flip.
  With all four excluded, the 2026-08-08 "all 5 levels, zero deaths" note
  **cannot be reproduced from committed code**; that run most likely used an
  in-page hand-tuned bot never written back to `tools/autoplay.js`. Treat the old
  claim as unverified rather than as a regression baseline.
  The real mechanism was **not** the spike but the step-up: landing on step one
  around cell 542, the cube had ~6 frames to be airborne before step two's face,
  and a wall face is death. 3- and 4-wide steps both left ~6 frames, which only a
  late jump clears; the autoplayer always jumps at the first safe frame. Fixed by
  `stairs(540, 5, 2)` (~13 frames) with the spike two cells in from the far edge.
  Level 2 has the same stairs-plus-spike shape and always passed — the difference
  was approach phase, not the pattern.
- **End-to-end playthroughs (season 1): DONE (2026-08-08, browser automation).** All 5
  levels completed by `tools/autoplay.js` (see below) with zero deaths on the
  final bot runs. (Level 3 no longer reproduces — see the known gap above;
  levels 1, 2, 4 and 5 still complete, in 68 / 75 / 101 / 95 s on 2026-08-14.) Completion times ≈ design targets: 70.8 / 77.3 / 83.9 / 90.7 /
  96.8 s. Verified along the way: all portals/mode switches, launch pads,
  checkpoint respawns (incl. mid-tunnel checkpoints), tunnel shift/spike kills,
  wall-face + corner-forgiveness deaths, completion screen (no "Next Level" on
  L5 — correct), storage records, leaderboard ranking + current-player
  highlight. A "Bot" player profile holds the reference times (#1 on each
  board); delete via Menu → Players & Colors if unwanted.

## Autoplayer (tools/autoplay.js) and the headless runner (tools/botrun.mjs)

Browser hygiene, learned the hard way: killing the launcher process leaves
Chromium's renderer/GPU children running on Windows, so every interrupted run
leaked a browser. 146 of them accumulated and starved the machine badly enough
that a whole verification run failed with "timed out waiting for level 1 to
start" — which looks exactly like a game bug and is not one. `cdp.mjs` now sends
`Browser.close` before killing, and sweeps leftovers carrying its own
`qdash-cdp-` profile prefix on startup (never a browser the user is using).
If a run ever fails to *start* levels, suspect this before suspecting the game.

`node tools/botrun.mjs [levels...]` is the automated way to answer "is this level
completable?". It launches headless Edge/Chrome, talks the DevTools Protocol over
Node's built-in WebSocket (no npm packages, matching the project's zero-dependency
rule), loads `?level=N`, injects the bot, and polls `__bot.summary()` until the
level finishes, stalls for 120 s, or hits a 300 s cap. Exit code 0 only if every
requested level completed. It needs `npm start` running in another shell. Rerun it
after editing any level layout — the static invariants in smoke.mjs cannot tell
you whether a jump is actually makeable.

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

Play season 2 by hand (or watch a bot run) to judge human difficulty — the bot
completing all five with zero deaths proves they are possible, not that they are
fun. Then tune difficulty per the observations above (user decides feel);
possible features: season 3 content, more pad types (GD blue/pink pads, orbs),
level-unlock progression, gamepad support, export/import of the save blob.
