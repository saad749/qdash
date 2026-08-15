// Dev tool: in-page autoplayer for playtesting. Not loaded by the game — inject
// it from the console (or browser automation) while a level is running:
//
//   const s = document.createElement('script');
//   s.src = '/tools/autoplay.js?' + Date.now();
//   document.head.appendChild(s);
//
// It drives GameScene through its normal input path (ptrDown/ptrJust) once per
// frame, so the game under test is exactly the game a human plays. State and a
// death/checkpoint/completion log live at window.__bot; call
// __bot.summary() for a compact status object, __bot.detach() to stop.
//
// Decision logic per mode:
//   cube — greedy lookahead: simulate "jump now" vs "wait" ballistically against
//          blocks/spikes/pads (up to 2 future jumps, ~0.8 s horizon), jump only
//          when it strictly outlives waiting.
//   ship — bang-bang thrust toward the vertical center of the corridor gap
//          probed at several x offsets ahead (spikes narrow the gap).
//   triangle — flip gravity ahead of tunnel events that require the other edge:
//          2-cell shifts (ride the receding edge) and edge spikes.

(function () {
  if (window.__bot) { try { window.__bot.detach(); } catch (e) { /* stale */ } }

  const CELL = 64, GROUND_Y = 656, VX = 560, DT = 1 / 60;
  const CU = { G: 5000, JUMP: -1136, MAX: 1450, HALF: 30, INNER: 16 };
  const SHIP_HALF_H = 18;
  const TRI_G = 4500, TRI_BODY = 46;
  const PAD_VY = -1400;
  const HORIZON = 48;        // sim frames (~0.8 s)
  const JUMP_GRAN = 2;       // branch a candidate jump every Nth sim frame
                             // (triple spikes leave a ~3-frame takeoff window;
                             //  granularity 3 can miss it entirely)
  const DEAD = null;

  const bootTimer = setInterval(() => {
    const game = window.game;
    if (!game) return;
    const sc = game.scene.getScene('Game');
    if (sc && sc.scene.isActive() && sc.built && sc.player && sc.player.sprite) {
      clearInterval(bootTimer);
      attach(game, sc);
    }
  }, 200);

  function attach(game, sc) {
    // ---- static world snapshot (world px rects) ----
    const solids = sc.built.blocks.getChildren().map(go => {
      const b = go.body; return { l: b.x, r: b.x + b.width, t: b.y, b: b.y + b.height };
    });
    // Hazard rects inflated a little: the sim treats near-misses as deaths, so
    // the bot keeps a real-world safety margin instead of playing frame-perfect.
    const spikes = sc.built.hazards.getChildren().map(go => {
      const b = go.body;
      return { l: b.x - 3, r: b.x + b.width + 3, t: b.y - 3, b: b.y + b.height + 2 };
    });
    // Pad zones shrunk: the sim only credits a pad hit with ~10 px of real
    // overlap, so plans that graze a mandatory pad's edge read as misses.
    const pads = sc.built.pads.map(p => {
      const b = p.zone.body;
      return { l: b.x + 10, r: b.x + b.width - 10, t: b.y, b: b.y + b.height };
    });
    const tunnels = sc.built.tunnels;
    // x positions where the sim stops caring (mode switch / corridor logic takes over)
    const truncXs = sc.built.portals.map(p => p.zone.body.x)
      .concat(tunnels.map(t => t.x0)).sort((a, b) => a - b);

    // Per-tunnel plan: events that demand a specific edge (encoded as required
    // gravityDir: 1 = ride floor, -1 = ride ceiling).
    const tunnelPlans = tunnels.map(t => {
      const ev = [];
      for (let i = 1; i < t.segs.length; i++) {
        const a = t.segs[i - 1], b = t.segs[i];
        if (b.floorY < a.floorY - 96) ev.push({ x: b.x0, side: -1, why: 'floor-rise' });
        if (b.ceilY > a.ceilY + 96) ev.push({ x: b.x0, side: 1, why: 'ceil-drop' });
      }
      for (const s of t.spikeRects) {
        ev.push({ x: s.cx, side: s.side === 'floor' ? -1 : 1, why: 'spike-' + s.side });
      }
      ev.sort((a, b) => a.x - b.x);
      return { t, ev };
    });

    const B = window.__bot = {
      events: [], jumps: [], lastHold: false, enabled: true,
      summary() {
        const p = sc.player.sprite;
        const deaths = B.events.filter(e => e.t === 'death');
        return {
          levelId: sc.levelId, attempt: sc.attempt, finished: sc.finished,
          mode: sc.player.mode, x: Math.round(p.x), cell: Math.round(p.x / CELL),
          pct: Math.min(100, Math.round(p.x / sc.built.finishX * 100)),
          bestPct: sc.bestPct, checkpoints: sc.cpIndex + 1,
          deathCount: deaths.length,
          recentDeaths: deaths.slice(-6),
          complete: B.events.find(e => e.t === 'complete') || null,
        };
      },
      detach() {
        B.enabled = false;
        sc.events.off('update', onFrame);
        game.events.off('qdash:checkpoint', onCp);
        if (origDie) sc.die = origDie;
        if (origComplete) sc.complete = origComplete;
      },
    };
    const log = (e) => { e.at = Date.now(); B.events.push(e); };

    // ---- outcome hooks ----
    const origDie = sc.die.bind(sc);
    sc.die = (cause) => {
      if (!sc.dead && !sc.finished) {
        const p = sc.player.sprite;
        const b = p.body;
        // Distance to the last flag passed: deaths that cluster on a checkpoint
        // are a respawn problem, not a level-design one.
        const cp = sc.built.checkpoints[sc.cpIndex];
        log({
          t: 'death', x: Math.round(p.x), y: Math.round(p.y),
          cell: Math.round(p.x / CELL), mode: sc.player.mode, cause: cause || 'unknown',
          aboveFloor: Math.round(GROUND_Y - b.bottom),
          cpCell: cp ? cp.x : null, cellsPastCp: cp ? Math.round(p.x / CELL) - cp.x : null,
          pct: Math.min(100, Math.round(p.x / sc.built.finishX * 100)),
          attempt: sc.attempt,
        });
      }
      origDie(cause);
    };
    const origComplete = sc.complete.bind(sc);
    sc.complete = () => {
      const was = sc.finished;
      origComplete();
      if (!was && sc.finished) log({ t: 'complete', attempts: sc.attempt });
    };
    const onCp = (n) => log({ t: 'checkpoint', n });
    game.events.on('qdash:checkpoint', onCp);

    // ---- cube lookahead sim ----
    const nextTrunc = (x) => {
      for (const tx of truncXs) if (tx > x + 10) return tx;
      return Infinity;
    };

    // One physics-ish step. st: {x, y, vy, g}. Returns new state or DEAD.
    function cubeStep(st, jump, trunc) {
      let { x, y, vy, g } = st;
      if (g && jump) { vy = CU.JUMP; g = false; }
      if (!g) vy = Math.min(vy + CU.G * DT, CU.MAX);
      const pr = x + CU.HALF, pb = y + CU.HALF;
      x += VX * DT;
      let ny = g ? y : y + vy * DT;
      if (x >= trunc) return { x, y: ny, vy, g, done: true };
      let l = x - CU.HALF, r = x + CU.HALF, b = ny + CU.HALF, t = ny - CU.HALF;

      for (const s of solids) {
        const horiz = r > s.l + 1 && l < s.r - 1;
        // wall face: leading edge crosses it this frame (no corner forgiveness
        // while ascending — the game only lifts when vy >= 0)
        if (pr <= s.l && r > s.l && t < s.b && b > s.t + (vy >= 0 ? 9 : 2)) return DEAD;
        if (vy >= 0 && horiz && pb <= s.t + 2 && b >= s.t) {
          ny = s.t - CU.HALF; vy = 0; g = true;                             // landed
          b = s.t; t = ny - CU.HALF;
        } else if (horiz && b > s.t + 14 && t < s.b) {
          return DEAD;              // embedded in a solid: treat as death, never tunnel through
        }
      }
      if (g) {
        const bb = ny + CU.HALF;
        const sup = solids.some(s => Math.abs(bb - s.t) < 3 && r > s.l + 1 && l < s.r - 1);
        if (!sup) g = false;                                                // ran off an edge
      }
      // Only credit a pad while rolling over or falling onto it with real
      // depth — the engine may not fire on a 1-frame ascending graze, and a
      // plan that depends on one dies when it doesn't.
      for (const p of pads) {
        if (r > p.l && l < p.r && b > p.t + 6 && t < p.b && vy >= 0) { vy = PAD_VY; g = false; }
      }
      const il = x - CU.INNER, ir = x + CU.INNER, it = ny - CU.INNER, ib = ny + CU.INNER;
      for (const s of spikes) {
        if (ir > s.l && il < s.r && ib > s.t && it < s.b) return DEAD;
      }
      return { x, y: ny, vy, g };
    }

    // Frames survivable from st with up to `jumps` future jumps. Walks the
    // no-jump path, branching a jump at every JUMP_GRANth grounded frame.
    function simFrames(st, framesLeft, jumps, trunc) {
      let cur = st, frames = 0, bestBranch = 0;
      while (frames < framesLeft) {
        if (cur.done) return framesLeft;
        if (cur.g && jumps > 0 && frames % JUMP_GRAN === 0) {
          const j = cubeStep(cur, true, trunc);
          if (j !== DEAD) {
            const rest = simFrames(j, framesLeft - frames - 1, jumps - 1, trunc);
            if (frames + 1 + rest >= framesLeft) return framesLeft;
            bestBranch = Math.max(bestBranch, frames + 1 + rest);
          }
        }
        const n = cubeStep(cur, false, trunc);
        if (n === DEAD) return Math.max(frames, bestBranch);
        cur = n; frames++;
      }
      return framesLeft;
    }

    function decideCube(body) {
      const grounded = body.blocked.down || body.touching.down;
      if (!grounded) return false;
      const st = { x: body.center.x, y: body.center.y, vy: body.velocity.y, g: true };
      const trunc = nextTrunc(st.x);
      const j = cubeStep(st, true, trunc);
      const jumpScore = j === DEAD ? -1 : 1 + simFrames(j, HORIZON - 1, 1, trunc);
      const w = cubeStep(st, false, trunc);
      const waitScore = w === DEAD ? -1 : 1 + simFrames(w, HORIZON - 1, 2, trunc);
      // Jump EARLY whenever a jump is fully safe — deferring to the last viable
      // frame leaves no margin for sim-vs-engine drift (frame-perfect play).
      if (jumpScore >= HORIZON && jumpScore >= waitScore) return true;
      return jumpScore > waitScore;
    }

    // ---- ship corridor controller ----
    function gapAt(px, refY) {
      let ceil = 16, floor = GROUND_Y;
      for (const s of solids) {
        if (px >= s.l && px <= s.r) {
          if (s.b <= refY) { if (s.b > ceil) ceil = s.b; }
          else if (s.t >= refY) { if (s.t < floor) floor = s.t; }
          else if (refY - s.t < s.b - refY) { if (s.t < floor) floor = s.t; }
          else if (s.b > ceil) ceil = s.b;
        }
      }
      for (const s of spikes) {
        if (px >= s.l - 30 && px <= s.r + 30) {
          const mid = (s.t + s.b) / 2;
          if (mid <= refY) { if (s.b + 8 > ceil) ceil = s.b + 8; }
          else if (s.t - 8 < floor) floor = s.t - 8;
        }
      }
      return { ceil, floor };
    }

    function decideShip(body) {
      const x = body.center.x, y = body.center.y, vy = body.velocity.y;
      let ceil = 16, floor = GROUND_Y;
      for (const d of [40, 140, 240, 340]) {
        const g = gapAt(x + d, y);
        if (g.floor - g.ceil > 2 * SHIP_HALF_H + 16) {   // ignore degenerate probes
          if (g.ceil > ceil) ceil = g.ceil;
          if (g.floor < floor) floor = g.floor;
        }
      }
      if (floor - ceil < 2 * SHIP_HALF_H + 12) {         // conflicting probes: trust the near one
        const g = gapAt(x + 100, y);
        ceil = g.ceil; floor = g.floor;
      }
      const target = (ceil + floor) / 2;
      const desired = Math.max(-430, Math.min(430, (target - y) * 3.2));
      if (vy > desired + 25) return true;
      if (vy < desired - 25) return false;
      return B.lastHold;
    }

    // ---- triangle tunnel controller ----
    function decideTri(body, gravityDir) {
      const x = body.center.x;
      const plan = tunnelPlans.find(p => p.t.contains(x));
      if (!plan) return false;
      const seg = plan.t.segmentAt(x);
      const h = seg ? seg.floorY - seg.ceilY : 4 * CELL;
      const crossPx = VX * Math.sqrt(2 * Math.max(60, h - TRI_BODY) / TRI_G);
      const react = crossPx + 120;
      const ev = plan.ev.find(e => e.x > x - 40 && e.x - x < react);
      return !!(ev && ev.side !== gravityDir);
    }

    // Console diagnostics: score a hypothetical grounded cube state, or trace
    // the jump-now path frame by frame ([x, y, vy, grounded]).
    B.debugCube = (x, y) => {
      const st = { x, y, vy: 0, g: true };
      const trunc = nextTrunc(x);
      const j = cubeStep(st, true, trunc);
      const w = cubeStep(st, false, trunc);
      return {
        trunc,
        jumpScore: j === DEAD ? -1 : 1 + simFrames(j, HORIZON - 1, 1, trunc),
        waitScore: w === DEAD ? -1 : 1 + simFrames(w, HORIZON - 1, 2, trunc),
      };
    };
    B.traceJump = (x, y) => {
      const trunc = nextTrunc(x);
      let cur = cubeStep({ x, y, vy: 0, g: true }, true, trunc);
      const path = [];
      for (let i = 0; i < 60 && cur !== DEAD && !cur.done; i++) {
        path.push([Math.round(cur.x), Math.round(cur.y), Math.round(cur.vy), cur.g ? 1 : 0]);
        cur = cubeStep(cur, false, trunc);
      }
      return { died: cur === DEAD, done: !!(cur && cur.done), path };
    };

    // ---- per-frame driver (runs just before GameScene.update reads inputs) ----
    function onFrame() {
      if (!B.enabled || sc.dead || sc.finished) { sc.ptrDown = false; return; }
      const pl = sc.player, body = pl.sprite.body;
      let hold = false, tap = false;
      if (pl.mode === 'cube') {
        hold = decideCube(body);
        if (hold) {   // takeoff trace for diagnosing mistimed jumps
          B.jumps.push({ x: Math.round(body.center.x), y: Math.round(body.center.y) });
          if (B.jumps.length > 12) B.jumps.shift();
        }
      }
      else if (pl.mode === 'ship') hold = decideShip(body);
      else tap = decideTri(body, pl.gravityDir);
      sc.ptrDown = hold;
      if (tap) sc.ptrJust = true;
      B.lastHold = hold;
    }
    sc.events.on('update', onFrame);

    log({ t: 'attached', levelId: sc.levelId });
    console.log('[autoplay] attached to level', sc.levelId);
  }
})();
