let ctx = null;

function ac() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

export function unlockAudio() {
  ac();
}

function blip({ freq = 440, dur = 0.12, type = 'sine', gain = 0.06, slide = 0 }) {
  const c = ac();
  if (!c) return;
  const t = c.currentTime;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g).connect(c.destination);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

export const sfx = {
  jump: () => blip({ freq: 420, slide: 240, dur: 0.13, type: 'triangle', gain: 0.06 }),
  double: () => blip({ freq: 620, slide: 320, dur: 0.14, type: 'triangle', gain: 0.06 }),
  landing: () => blip({ freq: 190, slide: -70, dur: 0.1, type: 'sine', gain: 0.045 }),
  slide: () => blip({ freq: 280, slide: -160, dur: 0.2, type: 'sawtooth', gain: 0.035 }),
  coin: (combo = 1) => blip({ freq: 780 + Math.min(combo, 8) * 55, slide: 260, dur: 0.09, type: 'square', gain: 0.04 }),
  hit: () => blip({ freq: 150, slide: -110, dur: 0.4, type: 'sawtooth', gain: 0.09 }),
  ui: () => blip({ freq: 620, dur: 0.06, type: 'sine', gain: 0.045 }),
};
