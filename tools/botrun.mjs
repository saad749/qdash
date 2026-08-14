// Headless bot verification. Drives the real game in a Chromium browser over the
// DevTools Protocol and lets tools/autoplay.js play each level, so "is this level
// completable?" gets answered by the same code a human plays.
//
//   node tools/botrun.mjs              # every level
//   node tools/botrun.mjs 6 7 8        # only these
//
// Needs a static server on http://localhost:8080 (`npm start`) and Edge or
// Chrome. Override with QDASH_BROWSER=<path> / QDASH_ORIGIN=<url>.
// Exit code is 0 only if every requested level was completed.

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { openBrowser, requireServer, sleep } from './cdp.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ORIGIN = process.env.QDASH_ORIGIN || 'http://localhost:8080';
const LEVEL_TIMEOUT_MS = 300000;   // a level is ~100-120 s; deaths cost replays
const STALL_MS = 120000;           // no new best % for this long = stuck

async function playLevel(cdp, botSrc, id) {
  await cdp.send('Page.navigate', { url: `${ORIGIN}/?level=${id}` });
  await cdp.waitFor(
    '!!(window.game && window.game.scene.getScene("Game") && window.game.scene.getScene("Game").built)',
    30000, `level ${id} to start`
  );
  await cdp.eval(botSrc);                       // the bot waits for the scene itself

  const started = Date.now();
  let best = -1, bestAt = Date.now(), last = null;
  for (;;) {
    await sleep(1000);
    const raw = await cdp.eval('window.__bot ? JSON.stringify(window.__bot.summary()) : null');
    if (raw) {
      last = JSON.parse(raw);
      if (last.finished || last.complete) break;
      if (last.bestPct > best) { best = last.bestPct; bestAt = Date.now(); }
      if (Date.now() - bestAt > STALL_MS) break;
    }
    if (Date.now() - started > LEVEL_TIMEOUT_MS) break;
  }

  await cdp.eval('window.__bot && window.__bot.detach()').catch(() => {});
  return {
    id,
    completed: !!(last && (last.finished || last.complete)),
    bestPct: last ? last.bestPct : 0,
    deaths: last ? last.deathCount : 0,
    cell: last ? last.cell : 0,
    seconds: Math.round((Date.now() - started) / 1000),
    recentDeaths: last ? last.recentDeaths : [],
  };
}

const wanted = process.argv.slice(2).map(Number).filter(n => Number.isInteger(n) && n > 0);
const levels = wanted.length
  ? wanted
  : (await import(new URL('../src/levels/index.js', import.meta.url).href)).LEVEL_IDS;

try {
  await requireServer(ORIGIN);
} catch (e) {
  console.error(e.message);
  process.exit(2);
}

let session;
try {
  session = await openBrowser();
} catch (e) {
  console.error(e.message);
  process.exit(2);
}

const results = [];
try {
  const botSrc = readFileSync(join(HERE, 'autoplay.js'), 'utf8');
  for (const id of levels) {
    process.stdout.write(`level ${id}: playing... `);
    const r = await playLevel(session.cdp, botSrc, id).catch(e => ({
      id, completed: false, bestPct: 0, deaths: 0, cell: 0, seconds: 0,
      error: e.message, recentDeaths: [],
    }));
    results.push(r);
    console.log(r.completed
      ? `COMPLETED in ${r.seconds}s, ${r.deaths} death(s)`
      : `FAILED at ${r.bestPct}% (cell ${r.cell}), ${r.deaths} death(s)${r.error ? ` — ${r.error}` : ''}`);
    for (const d of r.completed ? [] : r.recentDeaths.slice(-4)) {
      console.log(`    death: cell ${Math.round((d.x || 0) / 64)} in ${d.mode} mode`);
    }
  }
} finally {
  session.close();
}

const failed = results.filter(r => !r.completed);
console.log(`\n${results.length - failed.length}/${results.length} levels completed by the bot`);
process.exit(failed.length ? 1 : 0);
