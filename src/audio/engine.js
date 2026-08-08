// Shared Web Audio plumbing: one context, music/sfx buses into a compressor.
// The context must be created/resumed from a user gesture (browser autoplay policy);
// every scene's first pointerdown calls unlock().

let ctx = null;
let musicBus = null;
let sfxBus = null;
let muted = false;

export function unlock() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.knee.value = 24;
    comp.ratio.value = 6;
    comp.connect(ctx.destination);

    musicBus = ctx.createGain();
    musicBus.gain.value = 0.25;
    musicBus.connect(comp);

    sfxBus = ctx.createGain();
    sfxBus.gain.value = 0.5;
    sfxBus.connect(comp);
  }
  if (ctx.state === 'suspended') ctx.resume();
}

export function audioCtx() { return ctx; }
export function musicOut() { return musicBus; }
export function sfxOut() { return sfxBus; }

export function suspend() { if (ctx && ctx.state === 'running') ctx.suspend(); }
export function resume() { if (ctx && ctx.state === 'suspended' && !muted) ctx.resume(); }

export function toggleMute() {
  muted = !muted;
  if (!ctx) return muted;
  if (muted) ctx.suspend(); else ctx.resume();
  return muted;
}
export function isMuted() { return muted; }

// White-noise buffer, generated once, shared by snare/hat/death sounds.
let noiseBuf = null;
export function noiseBuffer() {
  if (!ctx) return null;
  if (!noiseBuf) {
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  return noiseBuf;
}
