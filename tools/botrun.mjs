// Headless bot verification. Drives the real game in a Chromium browser over the
// DevTools Protocol and lets tools/autoplay.js play each level, so "is this level
// completable?" gets answered by the same code a human plays. No npm packages:
// Node's global WebSocket speaks CDP directly.
//
//   node tools/botrun.mjs              # every level
//   node tools/botrun.mjs 6 7 8        # only these
//
// Needs a static server on http://localhost:8080 (`npm start`) and Edge or
// Chrome. Override with QDASH_BROWSER=<path> / QDASH_ORIGIN=<url>.
// Exit code is 0 only if every requested level was completed.

import { spawn } from 'node:child_process';
import { readFileSync, existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ORIGIN = process.env.QDASH_ORIGIN || 'http://localhost:8080';
const PORT = Number(process.env.QDASH_CDP_PORT || 9222);
const LEVEL_TIMEOUT_MS = 300000;   // a level is ~100-120 s; deaths cost replays
const STALL_MS = 120000;           // no new best % for this long = stuck

const CANDIDATES = [
  process.env.QDASH_BROWSER,
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
].filter(Boolean);

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

class CDP {
  constructor(ws) {
    this.ws = ws;
    this.seq = 0;
    this.pending = new Map();
    ws.addEventListener('message', (e) => {
      const msg = JSON.parse(e.data);
      const slot = msg.id && this.pending.get(msg.id);
      if (!slot) return;
      this.pending.delete(msg.id);
      if (msg.error) slot.reject(new Error(msg.error.message));
      else slot.resolve(msg.result);
    });
  }

  send(method, params = {}) {
    const id = ++this.seq;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async eval(expression) {
    const r = await this.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (r.exceptionDetails) {
      throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
    }
    return r.result.value;
  }
}

async function connect(url) {
  const ws = new WebSocket(url);
  await new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve, { once: true });
    ws.addEventListener('error', () => reject(new Error(`cannot connect to ${url}`)), { once: true });
  });
  return new CDP(ws);
}

async function pageTarget() {
  for (let i = 0; i < 100; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
      const page = list.find(t => t.type === 'page' && t.webSocketDebuggerUrl);
      if (page) return page;
    } catch { /* browser still starting */ }
    await sleep(200);
  }
  throw new Error('browser never exposed a page target');
}

async function playLevel(cdp, botSrc, id) {
  await cdp.send('Page.navigate', { url: `${ORIGIN}/?level=${id}` });

  const readyBy = Date.now() + 30000;
  for (;;) {
    const ready = await cdp.eval(
      '!!(window.game && window.game.scene.getScene("Game") && window.game.scene.getScene("Game").built)'
    ).catch(() => false);
    if (ready) break;
    if (Date.now() > readyBy) throw new Error(`level ${id} never started`);
    await sleep(250);
  }

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

const exe = CANDIDATES.find(p => existsSync(p));
if (!exe) {
  console.error('No Chromium browser found. Set QDASH_BROWSER to msedge.exe or chrome.exe.');
  process.exit(2);
}

try {
  await fetch(ORIGIN, { method: 'HEAD' });
} catch {
  console.error(`No server at ${ORIGIN}. Start one with: npm start`);
  process.exit(2);
}

const profileDir = mkdtempSync(join(tmpdir(), 'qdash-bot-'));
const browser = spawn(exe, [
  '--headless=new',
  `--remote-debugging-port=${PORT}`,
  `--user-data-dir=${profileDir}`,
  '--window-size=1280,720',
  '--mute-audio',
  '--no-first-run',
  '--no-default-browser-check',
  '--disable-extensions',
  // keep requestAnimationFrame running at full rate while offscreen
  '--disable-background-timer-throttling',
  '--disable-renderer-backgrounding',
  '--disable-backgrounding-occluded-windows',
  '--disable-features=CalculateNativeWinOcclusion',
  'about:blank',
], { stdio: 'ignore' });

const results = [];
try {
  const target = await pageTarget();
  const cdp = await connect(target.webSocketDebuggerUrl);
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  const botSrc = readFileSync(join(HERE, 'autoplay.js'), 'utf8');

  for (const id of levels) {
    process.stdout.write(`level ${id}: playing... `);
    const r = await playLevel(cdp, botSrc, id).catch(e => ({
      id, completed: false, bestPct: 0, deaths: 0, cell: 0, seconds: 0, error: e.message, recentDeaths: [],
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
  browser.kill();
  try { rmSync(profileDir, { recursive: true, force: true }); } catch { /* windows lock */ }
}

const failed = results.filter(r => !r.completed);
console.log(`\n${results.length - failed.length}/${results.length} levels completed by the bot`);
process.exit(failed.length ? 1 : 0);
