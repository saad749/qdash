// Chiptune step-sequencer using the standard lookahead pattern: a coarse JS timer
// schedules notes a short window ahead at exact AudioContext times, so playback is
// sample-accurate and immune to frame drops. Songs are 4 bars (A A B A) x 16 steps.

import { audioCtx, musicOut, noiseBuffer } from './engine.js';

const TICK_MS = 25;
const LOOKAHEAD_S = 0.12;
const BAR_ORDER = ['A', 'A', 'B', 'A'];

function degreeToFreq(root, scale, deg) {
  const n = scale.length;
  const oct = Math.floor(deg / n);
  const semi = scale[((deg % n) + n) % n];
  return root * Math.pow(2, oct + semi / 12);
}

class Music {
  constructor() {
    this.timer = null;
    this.spec = null;
    this.step = 0;
    this.nextTime = 0;
  }

  play(spec) {
    this.stop();
    const ctx = audioCtx();
    if (!ctx || !spec) return;
    this.spec = spec;
    this.step = 0;
    this.nextTime = ctx.currentTime + 0.06;
    this.timer = setInterval(() => this.tick(), TICK_MS);
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.spec = null;
  }

  // play() is a no-op until the AudioContext exists (first user gesture);
  // call this from input handlers to start the song late in that case.
  ensure(spec) {
    if (!this.timer && spec) this.play(spec);
  }

  tick() {
    const ctx = audioCtx();
    if (!ctx || !this.spec) return;
    const stepDur = 60 / this.spec.bpm / 4;             // 16th notes
    while (this.nextTime < ctx.currentTime + LOOKAHEAD_S) {
      this.scheduleStep(this.step, this.nextTime, stepDur);
      this.nextTime += stepDur;
      this.step = (this.step + 1) % 64;                 // 4 bars x 16 steps
    }
  }

  scheduleStep(step, t, stepDur) {
    const s = this.spec;
    const bar = BAR_ORDER[Math.floor(step / 16)];
    const i = step % 16;

    const leadPat = s.lead[bar] || s.lead.A;
    if (leadPat[i] != null) {
      this.osc('square', degreeToFreq(s.root * 2, s.scale, leadPat[i]), t, stepDur * 0.9, 0.16);
    }
    const bassPat = (s.bass && (s.bass[bar] || s.bass.A)) || null;
    if (bassPat && bassPat[i] != null) {
      this.osc('triangle', degreeToFreq(s.root / 2, s.scale, bassPat[i]), t, stepDur * 0.95, 0.3);
    }
    if (s.kick[i]) this.kick(t);
    if (s.snare[i]) this.noiseHit(t, 'bandpass', 1800, 0.12, 0.25);
    if (s.hat[i]) this.noiseHit(t, 'highpass', 7000, 0.04, 0.12);
  }

  osc(type, freq, t, dur, peak) {
    const ctx = audioCtx();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(musicOut());
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  kick(t) {
    const ctx = audioCtx();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(150, t);
    o.frequency.exponentialRampToValueAtTime(50, t + 0.1);
    g.gain.setValueAtTime(0.5, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
    o.connect(g).connect(musicOut());
    o.start(t);
    o.stop(t + 0.14);
  }

  noiseHit(t, type, freq, dur, peak) {
    const ctx = audioCtx();
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer();
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(peak, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(musicOut());
    src.start(t);
    src.stop(t + dur + 0.02);
  }
}

export const music = new Music();
