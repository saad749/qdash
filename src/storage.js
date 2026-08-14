// All persistence: one localStorage key, one JSON blob, mutated through this singleton.

import { DEFAULT_COLOR, COLORS } from './constants.js';

const KEY = 'qdash.save.v1';
// Saves written before the QDash rename. Read once, then re-saved under KEY; never written.
const LEGACY_KEY = 'qgd.save.v1';

function freshSave() {
  return { version: 1, currentPlayerId: null, players: {}, records: {} };
}

function freshRecord() {
  return {
    bestPercent: 0, completed: false, bestTimeMs: null,
    bestRunAttempts: null, attemptsTotal: 0, lastPlayed: 0,
  };
}

class Storage {
  constructor() {
    this.data = freshSave();
    try {
      let raw = localStorage.getItem(KEY);
      const legacy = raw === null;
      if (legacy) raw = localStorage.getItem(LEGACY_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.version === 1 && parsed.players && parsed.records) {
          this.data = parsed;
          if (legacy) this.save();
        }
      }
    } catch (e) {
      this.data = freshSave();
    }
  }

  save() {
    try { localStorage.setItem(KEY, JSON.stringify(this.data)); } catch (e) { /* storage full/blocked */ }
  }

  // --- players ---

  playerList() {
    return Object.entries(this.data.players)
      .map(([id, p]) => ({ id, ...p }))
      .sort((a, b) => a.createdAt - b.createdAt);
  }

  createPlayer(name) {
    const clean = String(name).trim().slice(0, 12);
    if (!clean) return null;
    const id = 'p_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    this.data.players[id] = { name: clean, color: DEFAULT_COLOR, createdAt: Date.now() };
    this.data.records[id] = {};
    this.data.currentPlayerId = id;
    this.save();
    return id;
  }

  deletePlayer(id) {
    delete this.data.players[id];
    delete this.data.records[id];
    if (this.data.currentPlayerId === id) this.data.currentPlayerId = null;
    this.save();
  }

  setCurrent(id) {
    if (this.data.players[id]) {
      this.data.currentPlayerId = id;
      this.save();
    }
  }

  current() {
    const id = this.data.currentPlayerId;
    return id && this.data.players[id] ? { id, ...this.data.players[id] } : null;
  }

  setColor(id, colorName) {
    if (this.data.players[id] && COLORS[colorName] !== undefined) {
      this.data.players[id].color = colorName;
      this.save();
    }
  }

  colorOf(id) {
    const p = this.data.players[id];
    return COLORS[(p && p.color) || DEFAULT_COLOR];
  }

  // --- records ---

  record(playerId, levelId) {
    const recs = this.data.records[playerId] || (this.data.records[playerId] = {});
    return recs[levelId] || (recs[levelId] = freshRecord());
  }

  // Called on death/quit/complete with the best % reached this session.
  recordProgress(playerId, levelId, percent) {
    const r = this.record(playerId, levelId);
    r.bestPercent = Math.max(r.bestPercent, Math.min(100, Math.floor(percent)));
    r.lastPlayed = Date.now();
    this.save();
  }

  recordDeath(playerId, levelId) {
    const r = this.record(playerId, levelId);
    r.attemptsTotal += 1;
    r.lastPlayed = Date.now();
    this.save();
  }

  recordComplete(playerId, levelId, timeMs, runAttempts) {
    const r = this.record(playerId, levelId);
    const newBest = !r.completed || timeMs < r.bestTimeMs;
    r.completed = true;
    r.bestPercent = 100;
    if (newBest) {
      r.bestTimeMs = timeMs;
      r.bestRunAttempts = runAttempts;
    }
    r.attemptsTotal += 1;                  // the finishing run counts as an attempt
    r.lastPlayed = Date.now();
    this.save();
    return newBest;
  }

  // Ranked rows for one level: completed (fastest first), then partial (highest % first).
  leaderboard(levelId) {
    const rows = [];
    for (const [pid, player] of Object.entries(this.data.players)) {
      const r = (this.data.records[pid] || {})[levelId];
      if (!r || (r.bestPercent <= 0 && !r.completed)) continue;
      rows.push({ id: pid, name: player.name, color: player.color, ...r });
    }
    rows.sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? -1 : 1;
      if (a.completed) {
        if (a.bestTimeMs !== b.bestTimeMs) return a.bestTimeMs - b.bestTimeMs;
      } else if (a.bestPercent !== b.bestPercent) {
        return b.bestPercent - a.bestPercent;
      }
      const ra = a.bestRunAttempts ?? Infinity, rb = b.bestRunAttempts ?? Infinity;
      if (ra !== rb) return ra - rb;
      if (a.attemptsTotal !== b.attemptsTotal) return a.attemptsTotal - b.attemptsTotal;
      return a.name.localeCompare(b.name);
    });
    return rows;
  }
}

export const storage = new Storage();

export function fmtTime(ms) {
  if (ms == null) return '--:--.-';
  const t = Math.max(0, Math.floor(ms));
  const m = Math.floor(t / 60000);
  const s = Math.floor((t % 60000) / 1000);
  const d = Math.floor((t % 1000) / 100);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${d}`;
}
