// Synthesized sound effects. Each is a tiny oscillator/noise recipe on the sfx bus.

import { audioCtx, sfxOut, noiseBuffer } from './engine.js';

function env(gainNode, t, peak, dur) {
  const g = gainNode.gain;
  g.setValueAtTime(0.0001, t);
  g.linearRampToValueAtTime(peak, t + 0.008);
  g.exponentialRampToValueAtTime(0.0001, t + dur);
}

function tone(type, f0, f1, dur, peak = 0.5) {
  const ctx = audioCtx();
  if (!ctx) return;
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(f0, t);
  if (f1 !== f0) osc.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
  env(g, t, peak, dur);
  osc.connect(g).connect(sfxOut());
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

function noise(filterType, freq, dur, peak = 0.5) {
  const ctx = audioCtx();
  if (!ctx) return;
  const t = ctx.currentTime;
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer();
  const f = ctx.createBiquadFilter();
  f.type = filterType;
  f.frequency.value = freq;
  const g = ctx.createGain();
  env(g, t, peak, dur);
  src.connect(f).connect(g).connect(sfxOut());
  src.start(t);
  src.stop(t + dur + 0.02);
}

function notes(type, freqs, step, dur, peak = 0.4) {
  const ctx = audioCtx();
  if (!ctx) return;
  const t0 = ctx.currentTime;
  freqs.forEach((f, i) => {
    const t = t0 + i * step;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.value = f;
    env(g, t, peak, dur);
    osc.connect(g).connect(sfxOut());
    osc.start(t);
    osc.stop(t + dur + 0.02);
  });
}

export const sfx = {
  jump()       { tone('square', 300, 500, 0.08, 0.35); },
  pad()        { tone('square', 200, 950, 0.16, 0.45); },
  flip()       { tone('square', 200, 180, 0.05, 0.4); },
  portal()     { noise('bandpass', 900, 0.2, 0.5); tone('sine', 300, 900, 0.2, 0.25); },
  checkpoint() { notes('sine', [659.25, 880], 0.07, 0.15, 0.4); },
  death()      { noise('lowpass', 1200, 0.3, 0.6); tone('sawtooth', 400, 60, 0.3, 0.5); },
  complete()   { notes('square', [440, 554.37, 659.25, 880], 0.12, 0.25, 0.35); },
  uiClick()    { tone('sine', 800, 800, 0.03, 0.25); },
};
