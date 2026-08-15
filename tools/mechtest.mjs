// Mechanic tests that need real physics running. smoke.mjs stubs Phaser, so it
// can never reach these — they only happen once Arcade actually steps a body.
// Drives a real browser like botrun.mjs does.
//
//   node tools/mechtest.mjs        (needs `npm start` in another shell)
//
// Exit code 0 only if every assertion holds.

import { openBrowser, requireServer, sleep } from './cdp.mjs';
import { SHIP, GROUND_Y } from '../src/constants.js';

// A ship respawn starts at rest, so its height above the floor is the whole
// reaction budget — the grace window only stops surfaces killing you, it does
// not stop you falling onto one.
const budgetMs = (h) => Math.sqrt(2 * Math.max(h, 0) / SHIP.GRAVITY) * 1000;

const ORIGIN = process.env.QDASH_ORIGIN || 'http://localhost:8080';
let failures = 0;
const fail = (msg) => { failures++; console.error('FAIL:', msg); };
const ok = (msg) => console.log(' ok :', msg);

await requireServer(ORIGIN).catch(e => { console.error(e.message); process.exit(2); });
const session = await openBrowser({ port: 9555 });
const { cdp } = session;

// Each case starts from a fresh load so no earlier state leaks in.
async function freshScene(level = 1) {
  await cdp.send('Page.navigate', { url: `${ORIGIN}/?level=${level}` });
  await cdp.waitFor(
    '!!(window.game && window.game.scene.getScene("Game") && window.game.scene.getScene("Game").built)',
    30000, 'the level to start'
  );
}

// `dead` flips back to false when the respawn timer fires at 700 ms, so asking
// "is it dead right now" is a race. The attempt counter only ever goes up.
const died = () => cdp.eval('window.game.scene.getScene("Game").attempt > 1');

try {
  // --- the ship must fly: roof contact kills ---
  await freshScene();
  await cdp.eval(`(() => {
    const s = window.game.scene.getScene('Game');
    s.player.setMode('ship');
    s.player.sprite.y = 20;                 // body.top lands above the playfield roof
    s.player.sprite.body.reset(s.player.sprite.x, 20);
    s.player.sprite.body.setVelocityY(-200);
    return true;
  })()`);
  await sleep(1000);
  if (await died()) ok('ship dies on roof contact');
  else fail('ship survived the roof — it should explode, not slide');

  // --- the ship must fly: floor contact kills ---
  await freshScene();
  await cdp.eval(`(() => {
    const s = window.game.scene.getScene('Game');
    s.player.setMode('ship');
    s.player.sprite.body.setVelocityY(600);   // drive it into the ground
    return true;
  })()`);
  await sleep(1000);
  if (await died()) ok('ship dies on floor contact');
  else fail('ship survived landing on the floor — it should explode');

  // --- but entering ship mode while grounded must not be instant death ---
  await freshScene();
  const entry = await cdp.eval(`(() => {
    const s = window.game.scene.getScene('Game');
    const b = s.player.sprite.body;
    const grounded = b.blocked.down || b.touching.down;
    s.player.setMode('ship');                  // the portal path: liftoff applies here
    return { grounded, vy: b.velocity.y };
  })()`);
  await sleep(1000);
  if (await died()) {
    fail(`entering ship mode from the ground killed the player (grounded=${entry.grounded}, vy=${entry.vy})`);
  } else if (entry.vy >= 0) {
    fail(`ship entry should launch upward, got vy=${entry.vy}`);
  } else ok('entering ship mode lifts off instead of exploding on the floor');

  // --- respawning inside a ship section must not death-loop ---
  // Level 4 has a checkpoint inside a 4-row corridor, so a respawn lands
  // anywhere between floor and roof. Both extremes have to recover, and an
  // unflown ship dies in any corridor, so the guarantee under test is "one
  // death, not a loop" — not survival.
  for (const [label, y] of [['roof-adjacent', 70], ['floor-adjacent', 600]]) {
    await freshScene();
    await cdp.eval(`(() => {
      const s = window.game.scene.getScene('Game');
      s.player.setMode('ship');
      s.player.sprite.body.reset(s.player.sprite.x, ${y});
      s.snapshot = s.player.snapshot();      // pretend a checkpoint was taken here
      s.die();
      return true;
    })()`);
    await sleep(760);                        // just past the 700 ms respawn
    await cdp.eval('window.game.scene.getScene("Game").ptrDown = true');   // player flies
    await sleep(600);
    const attempt = await cdp.eval('window.game.scene.getScene("Game").attempt');
    if (attempt > 2) fail(`${label} ship respawn death-looped: ${attempt} attempts`);
    else ok(`${label} ship respawn recovers instead of looping`);
  }

  // --- an overlap sensor is not ground ---
  // Arcade sets body.touching for overlaps as well as collisions, and the
  // checkpoint zone is a full-height overlap zone, so reading touching.down as
  // "landed" exploded the ship in mid-air at every flag it flew past.
  await freshScene(4);
  const flyby = await cdp.eval(`(() => {
    const s = window.game.scene.getScene('Game');
    const cp = s.built.checkpoints.find(c => c.x === 257);
    s.player.setMode('ship');
    s.player.sprite.body.reset(cp.zone.x - 60, 528);   // mid-corridor, clear of everything
    return { before: s.attempt, cpIndex: s.cpIndex };
  })()`);
  await sleep(300);                        // long enough to cross the 32 px zone
  const flyover = await cdp.eval(`(() => {
    const s = window.game.scene.getScene('Game');
    const b = s.player.sprite.body;
    return { attempt: s.attempt, cpIndex: s.cpIndex, blockedDown: b.blocked.down,
             aboveGround: Math.round(${GROUND_Y} - b.bottom) };
  })()`);
  if (flyover.cpIndex <= flyby.cpIndex) {
    fail(`flag flyby never reached the checkpoint (cpIndex ${flyover.cpIndex}) — test is not proving anything`);
  } else if (flyover.attempt > flyby.before) {
    fail('the ship died flying past a checkpoint flag in open air — a sensor is being read as ground');
  } else {
    ok(`ship flies through a checkpoint sensor unharmed (${flyover.aboveGround}px up, cp ${flyover.cpIndex} taken)`);
  }

  // --- a ship respawn must give at least the grace window to react ---
  // Flags sit a few cells past a dive under a roof-flush block, so they get
  // crossed near the deck. Restoring that altitude literally is what made the
  // ship "crash at the checkpoint": 194 ms to react, under human reaction time.
  for (const [level, cpCell] of [[2, 561], [4, 257], [8, 782]]) {
    await freshScene(level);
    await cdp.eval(`(() => {
      const s = window.game.scene.getScene('Game');
      const cp = s.built.checkpoints.find(c => c.x === ${cpCell});
      const oR = s.respawn.bind(s);
      s.respawn = () => { oR(); s.__respawnH = ${GROUND_Y} - s.player.sprite.body.bottom; };
      s.player.setMode('ship');
      s.player.sprite.body.reset(cp.zone.x, ${GROUND_Y} - 40);  // hugging the deck
      s.snapshot = s.player.snapshot();                         // as the flag would record it
      s.die('test');
      return true;
    })()`);
    await sleep(760);                        // just past the 700 ms respawn
    // Sampled at respawn, not now: by the time we ask, it has already fallen a
    // few px, and in a 4-row corridor the whole budget is only ~360 ms.
    const h = await cdp.eval('window.game.scene.getScene("Game").__respawnH');
    const ms = budgetMs(h);
    if (ms < SHIP.RESPAWN_GRACE_MS) {
      fail(`level ${level} cp ${cpCell}: respawn leaves ${ms.toFixed(0)} ms to react `
        + `(${Math.round(h)} px up), under the ${SHIP.RESPAWN_GRACE_MS} ms grace`);
    } else {
      ok(`level ${level} cp ${cpCell} respawn leaves ${ms.toFixed(0)} ms to react (${Math.round(h)} px up)`);
    }
  }

  // --- the cube is unaffected: it still rides the ground ---
  await freshScene();
  await sleep(1000);
  if (await died()) fail('the cube died just running along the ground');
  else ok('cube mode still rides the ground normally');
} finally {
  await session.close();
}

console.log(failures ? `\n${failures} FAILURE(S)` : '\nMECHANIC TESTS PASSED');
process.exit(failures ? 1 : 0);
