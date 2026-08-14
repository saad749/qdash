// Minimal Chrome DevTools Protocol client shared by botrun.mjs and shot.mjs.
// Node's global WebSocket speaks CDP directly, so driving a real browser needs
// no npm packages — which keeps the project's zero-dependency rule intact.

import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const CANDIDATES = [
  process.env.QDASH_BROWSER,
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
].filter(Boolean);

export const sleep = (ms) => new Promise(r => setTimeout(r, ms));

export class CDP {
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
    const r = await this.send('Runtime.evaluate', {
      expression, returnByValue: true, awaitPromise: true,
    });
    if (r.exceptionDetails) {
      throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
    }
    return r.result.value;
  }

  // Poll a JS predicate until it is truthy.
  async waitFor(expression, timeoutMs, label = expression) {
    const deadline = Date.now() + timeoutMs;
    for (;;) {
      if (await this.eval(expression).catch(() => false)) return;
      if (Date.now() > deadline) throw new Error(`timed out waiting for ${label}`);
      await sleep(200);
    }
  }
}

// Launches a headless browser and attaches to its first page. Returns the client
// plus a close() that kills the browser and removes its throwaway profile.
export async function openBrowser({ port = 9222 } = {}) {
  const exe = CANDIDATES.find(p => existsSync(p));
  if (!exe) {
    throw new Error('No Chromium browser found. Set QDASH_BROWSER to msedge.exe or chrome.exe.');
  }
  const profileDir = mkdtempSync(join(tmpdir(), 'qdash-cdp-'));
  const proc = spawn(exe, [
    '--headless=new',
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${profileDir}`,
    '--window-size=1280,720',
    '--mute-audio',
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-extensions',
    // keep requestAnimationFrame at full rate while the window is offscreen
    '--disable-background-timer-throttling',
    '--disable-renderer-backgrounding',
    '--disable-backgrounding-occluded-windows',
    '--disable-features=CalculateNativeWinOcclusion',
    'about:blank',
  ], { stdio: 'ignore' });

  let target = null;
  for (let i = 0; i < 100 && !target; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
      target = list.find(t => t.type === 'page' && t.webSocketDebuggerUrl);
    } catch { /* still starting */ }
    if (!target) await sleep(200);
  }
  if (!target) {
    proc.kill();
    throw new Error('browser never exposed a page target');
  }

  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve, { once: true });
    ws.addEventListener('error', () => reject(new Error('CDP socket failed')), { once: true });
  });

  const cdp = new CDP(ws);
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');

  return {
    cdp,
    close() {
      // The open socket keeps Node's event loop alive, so closing it is what
      // lets a caller exit normally rather than hanging after its last capture.
      try { ws.close(); } catch { /* already gone */ }
      proc.kill();
      try { rmSync(profileDir, { recursive: true, force: true }); } catch { /* windows lock */ }
    },
  };
}

// Fails early with a clear message rather than a wall of navigation errors.
export async function requireServer(origin) {
  try {
    await fetch(origin, { method: 'HEAD' });
  } catch {
    throw new Error(`No server at ${origin}. Start one with: npm start`);
  }
}
