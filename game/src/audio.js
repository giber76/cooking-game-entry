// Sizzle & Serve — audio: every sound is synthesised with WebAudio, no files.
// The kitchen hums, the grill sizzles, the bell rings when a plate is served.
let context = null;
let sizzleNodes = null;

export function ensureAudio() {
  if (context) {
    if (context.state === 'suspended') context.resume();
    return context;
  }
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;
  context = new AudioContextClass();
  return context;
}

function tone(freq, dur, type, gainValue, when) {
  const ctx = ensureAudio();
  if (!ctx) return;
  const t0 = when ?? ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(gainValue, t0 + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain).connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

function noiseBurst(dur, gainValue, filterFreq) {
  const ctx = ensureAudio();
  if (!ctx) return;
  const len = Math.floor(ctx.sampleRate * dur);
  const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = filterFreq;
  const gain = ctx.createGain();
  gain.gain.value = gainValue;
  src.connect(filter).connect(gain).connect(ctx.destination);
  src.start();
}

/** Play the sound for a world event name (see World.events). */
export function playEvent(name) {
  if (name === 'pickup') tone(520, 0.09, 'triangle', 0.12);
  else if (name === 'placeChop' || name === 'placeGrill') tone(340, 0.08, 'square', 0.07);
  else if (name === 'chopped') { noiseBurst(0.12, 0.25, 1800); tone(700, 0.08, 'triangle', 0.1); }
  else if (name === 'grillDone') { tone(880, 0.12, 'sine', 0.14); tone(1320, 0.16, 'sine', 0.1, (ensureAudio() || { currentTime: 0 }).currentTime + 0.1); }
  else if (name === 'burnt') tone(140, 0.4, 'sawtooth', 0.1);
  else if (name === 'served') { tone(1046, 0.12, 'sine', 0.16); tone(1318, 0.14, 'sine', 0.16); tone(1568, 0.22, 'sine', 0.16); }
  else if (name === 'wrongServe') tone(180, 0.25, 'square', 0.1);
  else if (name === 'orderLost') { tone(220, 0.3, 'sawtooth', 0.09); tone(165, 0.35, 'sawtooth', 0.09); }
  else if (name === 'levelUp') { [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.14, 'triangle', 0.13, (ensureAudio() || { currentTime: 0 }).currentTime + i * 0.09)); }
  else if (name === 'trash') noiseBurst(0.15, 0.15, 500);
  else if (name === 'addToPlate') tone(440, 0.07, 'triangle', 0.1);
}

/** A soft looping sizzle while anything is on the grill. */
export function setSizzle(on) {
  const ctx = ensureAudio();
  if (!ctx) return;
  if (on && !sizzleNodes) {
    const len = ctx.sampleRate;
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 4000;
    const gain = ctx.createGain();
    gain.gain.value = 0.015;
    src.connect(filter).connect(gain).connect(ctx.destination);
    src.start();
    sizzleNodes = { src, gain };
  } else if (!on && sizzleNodes) {
    try { sizzleNodes.src.stop(); } catch { /* already stopped */ }
    sizzleNodes = null;
  }
}
