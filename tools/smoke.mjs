// Headless smoke test: stubs browser globals, imports every module (catching
// bad import paths / import-time errors), validates level-data invariants and
// exercises the storage logic. Run: node tools/smoke.mjs

let failures = 0;
const fail = (msg) => { failures++; console.error('FAIL:', msg); };
const ok = (msg) => console.log(' ok :', msg);

// --- browser global stubs (import-time needs only) ---
class StubScene { constructor() {} }
globalThis.Phaser = {
  AUTO: 0,
  Scene: StubScene,
  Game: class { constructor() { this.registry = new Map(); } },
  Scale: { FIT: 1, CENTER_BOTH: 1 },
  Math: { Clamp: (v, a, b) => Math.min(b, Math.max(a, v)), Snap: { To: (v) => v } },
  Geom: { Rectangle: class { constructor(x, y, w, h) { Object.assign(this, { x, y, w, h }); } } },
  Input: { Keyboard: { KeyCodes: {}, JustDown: () => false } },
  Core: { Events: { BLUR: 'blur' } },
};
const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, v),
  removeItem: (k) => store.delete(k),
};
globalThis.window = globalThis;
globalThis.location = { search: '' };

// --- import every module ---
const modules = [
  '../src/constants.js', '../src/storage.js', '../src/ui.js',
  '../src/audio/engine.js', '../src/audio/sfx.js', '../src/audio/music.js', '../src/audio/songs.js',
  '../src/game/textures.js', '../src/game/Player.js', '../src/game/Tunnel.js', '../src/game/LevelBuilder.js',
  '../src/levels/helpers.js', '../src/levels/index.js',
  '../src/seasons.js', '../src/palette.js',
  '../src/scenes/BootScene.js', '../src/scenes/MenuScene.js', '../src/scenes/PlayerScene.js',
  '../src/scenes/SeasonSelectScene.js',
  '../src/scenes/LevelSelectScene.js', '../src/scenes/GameScene.js', '../src/scenes/HudScene.js',
  '../src/scenes/PauseScene.js', '../src/scenes/LevelCompleteScene.js', '../src/scenes/LeaderboardScene.js',
  '../src/main.js',
];
for (const m of modules) {
  try {
    await import(new URL(m, import.meta.url));
  } catch (e) {
    fail(`import ${m}: ${e.message}`);
  }
}
if (!failures) ok(`all ${modules.length} modules import cleanly`);

// --- level data invariants ---
const { LEVELS, LEVEL_IDS } = await import(new URL('../src/levels/index.js', import.meta.url));
const { CHECKPOINT_PCTS } = await import(new URL('../src/constants.js', import.meta.url));

for (const id of [...LEVEL_IDS, 'test']) {
  const lv = LEVELS[id];
  const name = `level ${id} (${lv.name})`;
  const objs = lv.objects;

  // finish inside the level
  const fin = objs.find(o => o.t === 'finish');
  if (!fin || fin.x > lv.lengthCells) fail(`${name}: bad finish`);

  // checkpoints: 5 (except sandbox), near required percentages
  const cps = objs.filter(o => o.t === 'checkpoint').sort((a, b) => a.x - b.x);
  if (id !== 'test') {
    if (cps.length !== 5) fail(`${name}: ${cps.length} checkpoints, want 5`);
    cps.forEach((c, i) => {
      const pct = (c.x / lv.lengthCells) * 100;
      if (Math.abs(pct - CHECKPOINT_PCTS[i]) > 3) {
        fail(`${name}: checkpoint ${i + 1} at ${pct.toFixed(1)}%, want ~${CHECKPOINT_PCTS[i]}%`);
      }
    });
  }

  // tunnel corridors: contiguous runs, sane widths/shifts
  const segs = objs.filter(o => o.t === 'tunnel').sort((a, b) => a.x - b.x);
  const corridors = [];
  let run = [];
  for (const s of segs) {
    if (s.ceil - s.floor < 3) fail(`${name}: tunnel at ${s.x} width ${s.ceil - s.floor} < 3`);
    if (run.length) {
      const p = run[run.length - 1];
      if (s.x !== p.x + p.len) { corridors.push(run); run = []; }
      else {
        if (Math.abs(s.floor - p.floor) > 2) fail(`${name}: tunnel shift >2 at ${s.x}`);
        if ((s.ceil - s.floor) !== (p.ceil - p.floor) && Math.abs(s.ceil - p.ceil) > 2) {
          fail(`${name}: tunnel ceiling jump >2 at ${s.x}`);
        }
      }
    }
    run.push(s);
  }
  if (run.length) corridors.push(run);

  const inCorridor = (x) => corridors.find(c => x >= c[0].x && x < c[c.length - 1].x + c[c.length - 1].len);

  // triangle portals must sit inside a corridor whose entry floor is ≤1;
  // exit portals (mode!=triangle following a corridor) must be inside it too
  for (const o of objs.filter(o => o.t === 'portal')) {
    if (o.mode === 'triangle') {
      const c = inCorridor(o.x);
      if (!c) fail(`${name}: triangle portal at ${o.x} not inside a corridor`);
      else if (c[0].floor > 1) fail(`${name}: corridor at ${c[0].x} entry floor ${c[0].floor} > 1 (cube can't enter)`);
    }
  }
  for (const c of corridors) {
    const end = c[c.length - 1].x + c[c.length - 1].len;
    const exit = objs.find(o => o.t === 'portal' && o.mode !== 'triangle' && o.x >= c[0].x && o.x < end);
    if (!exit) fail(`${name}: corridor ${c[0].x}-${end} has no exit portal inside it`);
  }

  // tspikes must be inside a corridor
  for (const o of objs.filter(o => o.t === 'tspike')) {
    if (!inCorridor(o.x)) fail(`${name}: tspike at ${o.x} outside corridors`);
  }

  // every level needs all three modes
  if (id !== 'test') {
    for (const mode of ['ship', 'triangle']) {
      if (!objs.some(o => o.t === 'portal' && o.mode === mode)) fail(`${name}: missing ${mode} section`);
    }
  }

  // platform reachability in cube sections: the jump arc climbs at most +1 cell,
  // so any surface ≥2 cells up needs either a supporting block one cell lower
  // ending within 3 cells before it, or a launch pad within 4 cells (pads reach +2)
  const portalsSorted = objs.filter(o => o.t === 'portal').sort((a, b) => a.x - b.x);
  const modeAt = (x) => {
    let m = 'cube';
    for (const p of portalsSorted) if (p.x <= x) m = p.mode;
    return m;
  };
  const blocksArr = objs.filter(o => o.t === 'block');
  const padsArr = objs.filter(o => o.t === 'pad');
  for (const b of blocksArr) {
    if (modeAt(b.x) !== 'cube') continue;              // ship ceilings/pillars, etc.
    const topRow = b.y + (b.h || 1);
    if (topRow < 2) continue;                          // +1 is reachable from flat ground
    const gap = (a) => b.x - (a.x + (a.w || 1));
    const supported =
      blocksArr.some(a => a !== b && modeAt(a.x) === 'cube' &&
        (a.y + (a.h || 1)) >= topRow - 1 && gap(a) >= -1 && gap(a) <= 3) ||
      (topRow <= 2 && padsArr.some(p => b.x - p.x > 0 && b.x - p.x <= 4));
    if (!supported) {
      fail(`${name}: block at x=${b.x} (top ${topRow} cells up) is unreachable — needs a lower block or launch pad before it`);
    }
  }

  // geometry sanity: authoring slips that produce unfair or invisible terrain
  const cellsOf = (b) => [b.x, b.x + (b.w || 1) - 1, b.y, b.y + (b.h || 1) - 1];
  for (let i = 0; i < blocksArr.length; i++) {
    for (let j = i + 1; j < blocksArr.length; j++) {
      const [ax0, ax1, ay0, ay1] = cellsOf(blocksArr[i]);
      const [bx0, bx1, by0, by1] = cellsOf(blocksArr[j]);
      if (ax0 <= bx1 && bx0 <= ax1 && ay0 <= by1 && by0 <= ay1) {
        fail(`${name}: blocks overlap at x=${blocksArr[i].x} and x=${blocksArr[j].x}`);
      }
    }
  }
  const groundSpikes = new Set();
  for (const s of objs.filter(o => o.t === 'spike')) {
    const sy = s.y || 0;
    if (sy === 0) groundSpikes.add(s.x);
    const buried = blocksArr.some(b => {
      const [x0, x1, y0, y1] = cellsOf(b);
      return s.x >= x0 && s.x <= x1 && sy >= y0 && sy <= y1;
    });
    if (buried) fail(`${name}: spike buried inside a block at x=${s.x}`);
  }
  // a checkpoint you respawn onto — or a finish line — must not sit on a spike
  for (const o of objs.filter(o => o.t === 'checkpoint' || o.t === 'finish')) {
    for (let d = -1; d <= 1; d++) {
      if (groundSpikes.has(o.x + d)) fail(`${name}: ${o.t} at x=${o.x} sits on a spike`);
    }
  }
  // runs longer than 3 can't be cleared from flat ground, so a platform must carry you
  const runs = [];
  for (const x of [...groundSpikes].filter(x => modeAt(x) === 'cube').sort((a, b) => a - b)) {
    const r = runs[runs.length - 1];
    if (r && x === r.end + 1) r.end = x;
    else runs.push({ start: x, end: x });
  }
  for (const r of runs) {
    const width = r.end - r.start + 1;
    if (width <= 3) continue;
    const covered = blocksArr.some(b => {
      const [x0, x1, , y1] = cellsOf(b);
      return y1 >= 1 && x0 <= r.end && r.start <= x1 + 3;
    });
    if (!covered) fail(`${name}: ${width}-wide spike run at x=${r.start} with no platform over it`);
  }
}
ok(`level invariants checked for ${LEVEL_IDS.join(',')} + test (reachability, geometry, spike runs)`);

// --- seasons ---
const seasons = await import(new URL('../src/seasons.js', import.meta.url));
const { SEASONS, seasonOf, seasonById, nextLevelId, releaseLabel } = seasons;
const { SONGS } = await import(new URL('../src/audio/songs.js', import.meta.url));

const seasonLevelIds = SEASONS.flatMap(s => s.levelIds);
const sorted = (a) => [...a].sort((x, y) => x - y).join(',');
if (new Set(seasonLevelIds).size !== seasonLevelIds.length) {
  fail('a level id appears in more than one season');
} else if (sorted(seasonLevelIds) !== sorted(LEVEL_IDS)) {
  fail(`seasons cover [${sorted(seasonLevelIds)}] but LEVEL_IDS is [${sorted(LEVEL_IDS)}]`);
} else ok('every level belongs to exactly one season, and every season level exists');

for (const s of SEASONS) {
  if (s.status === 'released') {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s.releasedOn || '')) fail(`season ${s.id}: bad release date ${s.releasedOn}`);
    if (!s.levelIds.length) fail(`season ${s.id} is released with no levels`);
    if (!releaseLabel(s).startsWith('RELEASED ')) fail(`season ${s.id}: label should start with RELEASED`);
  } else {
    if (s.releasedOn) fail(`season ${s.id} is unreleased but carries a release date`);
    if (s.levelIds.length) fail(`season ${s.id} is unreleased but has levels`);
    if (releaseLabel(s) !== 'COMING SOON') fail(`season ${s.id}: unreleased label should read COMING SOON`);
  }
}
ok('season release metadata is consistent');

if (releaseLabel(seasonById(1)) !== 'RELEASED 8 Aug 2026') {
  fail(`season 1 tag reads "${releaseLabel(seasonById(1))}"`);
} else if (releaseLabel(seasonById(2)) !== 'RELEASED 14 Aug 2026') {
  fail(`season 2 tag reads "${releaseLabel(seasonById(2))}"`);
} else if (seasonById(1).name !== 'The Tumble Wvrumbles' || seasonById(2).name !== 'The Dark Awakens') {
  fail('season names changed');
} else ok('season names and release tags are correct');

if (nextLevelId(4) !== 5) fail('next after level 4 should be 5');
else if (nextLevelId(5) !== null) fail('level 5 ends season 1 — there should be no next level');
else if (nextLevelId(6) !== 7) fail('next after level 6 should be 7');
else if (nextLevelId(10) !== null) fail('level 10 ends season 2 — there should be no next level');
else ok('next level stops at each season finale instead of crossing seasons');

for (const id of LEVEL_IDS) {
  const lv = LEVELS[id];
  if (lv.id !== id) fail(`level registered under key ${id} reports id ${lv.id}`);
  if (!SONGS[lv.song]) fail(`level ${id} references missing song "${lv.song}"`);
  if (!seasonOf(id)) fail(`level ${id} belongs to no season`);
}
ok('each level has a matching id, an existing song, and a season');

const S2_NAMES = [
  'The Growl Loses Power', 'The Darks Starts to Spread', 'The Moons Turns Black',
  'A Hero Arises', 'The Twisted Warden Falls',
];
const s2Names = seasonById(2).levelIds.map(id => LEVELS[id].name);
if (s2Names.join(' | ') !== S2_NAMES.join(' | ')) fail(`season 2 names: ${s2Names.join(' | ')}`);
else ok('season 2 level names match the spec exactly');

// regression guard: season 1 must come through the season work untouched
const S1_META = [
  ['Stereo Madness', 600, 'song1'], ['Finally Out', 660, 'song2'], ['Campin Outside', 720, 'song3'],
  ['Out Lost', 780, 'song4'], ['Back on Track', 840, 'song5'],
];
const s1Bad = seasonById(1).levelIds.find((id, i) => {
  const lv = LEVELS[id];
  return lv.name !== S1_META[i][0] || lv.lengthCells !== S1_META[i][1] || lv.song !== S1_META[i][2];
});
if (s1Bad) fail(`season 1 level ${s1Bad} metadata changed`);
else ok('season 1 levels unchanged (names, lengths, songs)');

for (const [key, s] of Object.entries(SONGS)) {
  for (const field of ['kick', 'snare', 'hat']) {
    if (!Array.isArray(s[field]) || s[field].length !== 16) fail(`${key}: ${field} must be 16 steps`);
  }
  for (const part of ['lead', 'bass']) {
    for (const bar of ['A', 'B']) {
      const pat = (s[part] || {})[bar];
      if (!Array.isArray(pat) || pat.length !== 16) fail(`${key}: ${part}.${bar} must be 16 steps`);
      else if (pat.some(v => v !== null && (!Number.isInteger(v) || v < 0))) fail(`${key}: ${part}.${bar} has a bad degree`);
    }
  }
  if (!(s.bpm > 60 && s.bpm < 220)) fail(`${key}: bpm ${s.bpm} out of range`);
  if (!Array.isArray(s.scale) || !s.scale.length) fail(`${key}: bad scale`);
}
ok('every song spec is 16 steps per pattern with a sane bpm');

// --- palette + textures ---
const { paletteFor, MODE_KEYS, lighten, darken } = await import(new URL('../src/palette.js', import.meta.url));
const hex24 = (v) => Number.isInteger(v) && v >= 0 && v <= 0xffffff;
const luma = (c) => 0.299 * ((c >> 16) & 0xff) + 0.587 * ((c >> 8) & 0xff) + 0.114 * (c & 0xff);

for (const id of [...LEVEL_IDS, 'test']) {
  const pal = paletteFor(id);
  for (const key of ['ground', 'deco', 'neon']) {
    if (!hex24(pal[key])) fail(`palette ${id}: ${key} is not a 24-bit colour (${pal[key]})`);
  }
  for (const mode of MODE_KEYS) {
    const m = pal.modes[mode];
    if (!m) { fail(`palette ${id}: missing mode ${mode}`); continue; }
    for (const key of ['accent', 'block', 'spike', 'backdrop']) {
      if (!hex24(m[key])) fail(`palette ${id}.${mode}: ${key} is not a 24-bit colour (${m[key]})`);
    }
    // A hazard must never be darker than the terrain it sits on, in any palette.
    if (luma(m.spike) <= luma(m.block)) {
      fail(`palette ${id}.${mode}: spike is not lighter than block`);
    }
    if (luma(m.backdrop) >= luma(m.accent)) {
      fail(`palette ${id}.${mode}: backdrop should be darker than the accent`);
    }
  }
}
// distinct sections are the whole point — a level whose three modes look the same fails
for (const id of LEVEL_IDS) {
  const accents = MODE_KEYS.map(m => paletteFor(id).modes[m].accent);
  if (new Set(accents).size !== accents.length) fail(`palette ${id}: modes share an accent`);
}
ok('every level palette is well formed, readable, and distinct per mode');

if (lighten(0x000000, 1) !== 0xffffff || darken(0xffffff, 1) !== 0x000000) {
  fail('lighten/darken endpoints are wrong');
} else if (lighten(0x808080, 0) !== 0x808080) {
  fail('lighten with t=0 should be a no-op');
} else ok('colour helpers clamp to their endpoints');

// Texture keys used by the game must exist in the generator — a typo here is an
// invisible sprite at runtime, which no other check would catch.
const { readFileSync: readSrc, readdirSync } = await import('node:fs');
const srcDir = new URL('../src/', import.meta.url);
const walk = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap(e =>
  e.isDirectory() ? walk(new URL(`${e.name}/`, dir)) : [new URL(e.name, dir)]);
const srcFiles = walk(srcDir).filter(u => u.pathname.endsWith('.js'));
const texSrc = readSrc(new URL('../src/game/textures.js', import.meta.url), 'utf8');
const generated = new Set([...texSrc.matchAll(/generateTexture\('([\w-]+)'/g)].map(m => m[1]));
if (generated.size < 10) fail(`only found ${generated.size} generated textures — regex out of date?`);
const TEX_CALL = /(?:add\.(?:image|sprite|tileSprite|particles)\([^'"]*|setTexture\()['"]([\w-]+)['"]/g;
const used = new Set();
for (const file of srcFiles) {
  for (const m of readSrc(file, 'utf8').matchAll(TEX_CALL)) used.add(m[1]);
}
const missing = [...used].filter(k => !generated.has(k));
if (missing.length) fail(`textures used but never generated: ${missing.join(', ')}`);
else ok(`all ${used.size} texture keys used in src/ are generated at boot`);

// --- storage logic ---
const { storage } = await import(new URL('../src/storage.js', import.meta.url));
const a = storage.createPlayer('Alice');
const b = storage.createPlayer('Bob');
const c = storage.createPlayer('Cara');
storage.setColor(a, 'purple');
storage.recordDeath(a, 1);
storage.recordProgress(a, 1, 40);
storage.recordComplete(a, 1, 95000, 12);      // Alice: slow completion
storage.recordComplete(b, 1, 61000, 30);      // Bob: fast completion
storage.recordProgress(c, 1, 55);             // Cara: partial
const lb = storage.leaderboard(1);
if (lb.map(r => r.name).join(',') !== 'Bob,Alice,Cara') {
  fail(`leaderboard order wrong: ${lb.map(r => r.name).join(',')}`);
} else ok('leaderboard ranks completed-fast > completed-slow > partial');
if (storage.current().name !== 'Cara') fail('current player should be most recently created');
storage.deletePlayer(c);
if (storage.current() !== null) fail('deleting current player should clear selection');
else ok('player delete cascades and clears current');
const raw = JSON.parse(store.get('qdash.save.v1'));
if (raw.players[c] || raw.records[c]) fail('deleted player left data behind');

// Play with no profile auto-creates one: it must end up selected, and its name
// must survive the 12-char cap createPlayer applies.
const autoId = storage.createRandomPlayer();
const auto = storage.current();
if (!autoId || !auto || auto.id !== autoId) {
  fail('createRandomPlayer should create the player and select it');
} else if (!/^Player\d{4}$/.test(auto.name) || auto.name.length > 12) {
  fail(`createRandomPlayer produced an unusable name: ${auto.name}`);
} else ok('createRandomPlayer creates a selected, well-named profile');

// Play routing: the three states MenuScene.startPlay has to tell apart. create()
// needs a real Phaser display list, but startPlay only needs scene.start.
const { MenuScene } = await import(new URL('../src/scenes/MenuScene.js', import.meta.url));
const menu = new MenuScene();
let started = null;
menu.scene = { start: (key, data) => { started = { key, data }; } };

for (const p of storage.playerList()) storage.deletePlayer(p.id);
started = null;
menu.startPlay();
if (started?.key !== 'Game' || started.data.levelId !== 1) {
  fail(`Play with no profiles should start level 1, got ${JSON.stringify(started)}`);
} else if (!storage.current()) {
  fail('Play with no profiles should leave the auto-created player selected');
} else ok('Play with no profiles auto-creates a player and starts level 1');

started = null;
menu.startPlay();                                  // the auto-created player is now current
if (started?.key !== 'SeasonSelect') {
  fail(`Play with a current player should open the season picker, got ${started?.key}`);
} else ok('Play with a current player opens the season picker');

storage.deletePlayer(storage.createPlayer('Keeper'));   // profiles remain, none selected
started = null;
menu.startPlay();
if (started?.key !== 'PlayerSelect') {
  fail(`Play with profiles but none selected should open the picker, got ${started?.key}`);
} else if (storage.playerList().length !== 1) {
  fail('Play with profiles but none selected should not create another profile');
} else ok('Play with profiles but none selected opens the picker');

// --- menu scene routing (season picker, level cards, completion) ---
// These scenes build a real display list in create(), so stand in a chainable
// stub that records the interactive handlers and the scene transitions.
function stubNode(sink) {
  const node = new Proxy({}, {
    get(_, prop) {
      if (prop === 'on') return (evt, fn) => { sink.push({ evt, fn }); return node; };
      return () => node;
    },
  });
  return node;
}

function runScene(SceneClass, data) {
  const handlers = [], started = [];
  const scene = new SceneClass();
  scene.add = new Proxy({}, { get: () => () => stubNode(handlers) });
  scene.input = { once: () => {}, keyboard: { on: () => {}, once: () => {} } };
  scene.tweens = { add: () => {} };
  scene.scale = { width: 1280, height: 720 };
  scene.scene = {
    start: (key, d) => started.push({ key, data: d }),
    restart: (d) => started.push({ key: '<restart>', data: d }),
    stop: () => {},
    resume: () => {},
    get: () => ({ saveProgress: () => {}, scene: { restart: () => {} } }),
  };
  if (scene.init) scene.init(data || {});
  scene.create();
  return { started, clicks: handlers.filter(h => h.evt === 'pointerdown') };
}

storage.setCurrent(storage.playerList()[0].id);    // the scenes below need a current player

const { SeasonSelectScene } = await import(new URL('../src/scenes/SeasonSelectScene.js', import.meta.url));
const { LevelSelectScene } = await import(new URL('../src/scenes/LevelSelectScene.js', import.meta.url));
const { LevelCompleteScene } = await import(new URL('../src/scenes/LevelCompleteScene.js', import.meta.url));
const { LeaderboardScene } = await import(new URL('../src/scenes/LeaderboardScene.js', import.meta.url));

const ss = runScene(SeasonSelectScene, {});
ss.clicks.forEach(h => h.fn());
const openedSeasons = ss.started.filter(s => s.key === 'LevelSelect').map(s => s.data.seasonId);
if (openedSeasons.join(',') !== '1,2') {
  fail(`season cards open seasons [${openedSeasons}], want [1,2] — season 3 must not be clickable`);
} else if (!ss.started.some(s => s.key === 'Menu')) {
  fail('season picker has no way back to the menu');
} else ok('season picker opens seasons 1 and 2, and the unreleased season is not clickable');

const ls2 = runScene(LevelSelectScene, { seasonId: 2 });
ls2.clicks.forEach(h => h.fn());
const s2Levels = ls2.started.filter(s => s.key === 'Game').map(s => s.data.levelId);
if (s2Levels.join(',') !== '6,7,8,9,10') {
  fail(`season 2 level select opens levels [${s2Levels}], want [6..10]`);
} else if (!ls2.started.some(s => s.key === 'SeasonSelect')) {
  fail('level select should lead back to the season picker');
} else ok('season 2 level select opens levels 6-10 and returns to the season picker');

const ls1 = runScene(LevelSelectScene, {});
ls1.clicks.forEach(h => h.fn());
const s1Levels = ls1.started.filter(s => s.key === 'Game').map(s => s.data.levelId);
if (s1Levels.join(',') !== '1,2,3,4,5') fail(`level select with no season opens [${s1Levels}], want season 1`);
else ok('level select falls back to season 1 when opened without a season');

const finale = runScene(LevelCompleteScene, { levelId: 5, timeMs: 1000, attempts: 1, newBest: false });
finale.clicks.forEach(h => h.fn());
const finaleGames = finale.started.filter(s => s.key === 'Game').map(s => s.data.levelId);
if (finaleGames.includes(6)) fail('finishing level 5 must not offer level 6 — different season');
else if (finaleGames.join(',') !== '5') fail(`level 5 complete starts games [${finaleGames}], want replay only`);
else ok('completing a season finale offers a replay but no next level');

const mid = runScene(LevelCompleteScene, { levelId: 6, timeMs: 1000, attempts: 1, newBest: true });
mid.clicks.forEach(h => h.fn());
const midGames = mid.started.filter(s => s.key === 'Game').map(s => s.data.levelId);
if (midGames.join(',') !== '7,6') fail(`level 6 complete starts games [${midGames}], want next 7 then replay 6`);
else ok('completing a mid-season level offers the next one');

const board = runScene(LeaderboardScene, { levelId: 8 });
board.clicks.forEach(h => h.fn());
const lbTabs = board.started.filter(s => s.key === '<restart>').map(s => s.data.levelId);
if (lbTabs.join(',') !== '1,6,6,7,8,9,10') {
  fail(`leaderboard for level 8 offers [${lbTabs}], want season chips 1,6 then tabs 6-10`);
} else ok('leaderboard shows season 2 tabs when viewing a season 2 level');

const { PauseScene } = await import(new URL('../src/scenes/PauseScene.js', import.meta.url));
const paused = runScene(PauseScene, { levelId: 8 });
paused.clicks.forEach(h => h.fn());
const quit = paused.started.find(s => s.key === 'LevelSelect');
if (!quit) fail('pause menu has no quit route');
else if (quit.data?.seasonId !== 2) {
  fail(`quitting level 8 opens season ${quit.data?.seasonId}, want the season you were playing (2)`);
} else ok('quitting mid-level returns to the season you were playing');

// Saves written before the QDash rename must survive: fresh Storage falls back
// to the legacy key, then re-saves under the new one. Query string forces a
// second module instance so the constructor runs again.
store.clear();
store.set('qgd.save.v1', JSON.stringify({
  version: 1,
  currentPlayerId: 'p_old',
  players: { p_old: { name: 'Legacy', color: 'blue', createdAt: 1 } },
  records: { p_old: { 1: { bestPercent: 100, completed: true, bestTimeMs: 70000, bestRunAttempts: 3, attemptsTotal: 9, lastPlayed: 1 } } },
}));
const { storage: migrated } = await import(new URL('../src/storage.js?rename', import.meta.url));
const legacyPlayer = migrated.current();
if (!legacyPlayer || legacyPlayer.name !== 'Legacy') {
  fail('pre-rename save under qgd.save.v1 was not loaded');
} else if (!store.has('qdash.save.v1')) {
  fail('pre-rename save was loaded but not re-saved under qdash.save.v1');
} else if (migrated.leaderboard(1)[0].bestTimeMs !== 70000) {
  fail('pre-rename records lost in migration');
} else ok('pre-rename save migrates from qgd.save.v1 to qdash.save.v1');

console.log(failures ? `\n${failures} FAILURE(S)` : '\nSMOKE TEST PASSED');
process.exit(failures ? 1 : 0);
