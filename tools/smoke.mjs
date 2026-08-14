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
  '../src/scenes/BootScene.js', '../src/scenes/MenuScene.js', '../src/scenes/PlayerScene.js',
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
}
ok('level invariants checked for 1-5 + test (incl. platform reachability)');

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
if (started?.key !== 'LevelSelect') {
  fail(`Play with a current player should open level select, got ${started?.key}`);
} else ok('Play with a current player opens level select');

storage.deletePlayer(storage.createPlayer('Keeper'));   // profiles remain, none selected
started = null;
menu.startPlay();
if (started?.key !== 'PlayerSelect') {
  fail(`Play with profiles but none selected should open the picker, got ${started?.key}`);
} else if (storage.playerList().length !== 1) {
  fail('Play with profiles but none selected should not create another profile');
} else ok('Play with profiles but none selected opens the picker');

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
