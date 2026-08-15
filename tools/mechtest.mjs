// Mechanic tests that need real physics running. smoke.mjs stubs Phaser, so it
// can never reach these — they only happen once Arcade actually steps a body.
// Drives a real browser like botrun.mjs does.
//
//   node tools/mechtest.mjs        (needs `npm start` in another shell)
//
// Exit code 0 only if every assertion holds.

import { openBrowser, requireServer, sleep } from './cdp.mjs';

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
