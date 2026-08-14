// Screenshot capture for eyeballing the visuals. Plays a level with the bot and
// grabs a PNG at each requested second, so shots land in whichever section of
// the level you asked for.
//
//   node tools/shot.mjs 6 8 22 52              # level 6 at t=8s, 22s, 52s
//   node tools/shot.mjs 6 8 --die              # ...and one mid-death shatter
//
// Files land in tools/shots/ (gitignored). Needs `npm start` running.

import { mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import { openBrowser, requireServer, sleep } from './cdp.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, 'shots');
const ORIGIN = process.env.QDASH_ORIGIN || 'http://localhost:8080';

const args = process.argv.slice(2);
const die = args.includes('--die');
const nums = args.filter(a => a !== '--die').map(Number).filter(n => Number.isFinite(n));
const level = nums[0] || 1;
const marks = nums.slice(1);
if (!marks.length) marks.push(10);

await requireServer(ORIGIN).catch(e => { console.error(e.message); process.exit(2); });
const session = await openBrowser({ port: 9333 });
mkdirSync(OUT, { recursive: true });

async function shoot(cdp, name) {
  const { data } = await cdp.send('Page.captureScreenshot', { format: 'png' });
  const file = join(OUT, `${name}.png`);
  writeFileSync(file, Buffer.from(data, 'base64'));
  console.log(`  wrote ${file}`);
}

try {
  const { cdp } = session;
  // Pin the viewport: the headless window size is not reliable across launches,
  // and shots have to be comparable between runs.
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: 1280, height: 720, deviceScaleFactor: 1, mobile: false,
  });
  await cdp.send('Page.navigate', { url: `${ORIGIN}/?level=${level}` });
  await cdp.waitFor(
    '!!(window.game && window.game.scene.getScene("Game") && window.game.scene.getScene("Game").built)',
    30000, 'the level to start'
  );
  await cdp.eval(readFileSync(join(HERE, 'autoplay.js'), 'utf8'));

  let elapsed = 0;
  for (const at of marks) {
    await sleep(Math.max(0, at - elapsed) * 1000);
    elapsed = at;
    const mode = await cdp.eval('window.game.scene.getScene("Game").player.mode');
    console.log(`level ${level} @ ${at}s (${mode})`);
    await shoot(cdp, `l${level}-t${at}-${mode}`);
  }

  if (die) {
    // Force a death and catch the shards mid-flight rather than waiting for one.
    await cdp.eval('window.__bot && window.__bot.detach()');
    await cdp.eval('window.game.scene.getScene("Game").die()');
    await sleep(140);
    console.log(`level ${level} death frame`);
    await shoot(cdp, `l${level}-death`);
  }
} finally {
  session.close();
}
