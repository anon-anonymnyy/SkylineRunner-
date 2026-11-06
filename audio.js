import { get } from './store.js';

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

function blip({ freq = 440, dur = 0.12, type = 'sine', gain = 0.08, slide = 0 }) {
  if (!get().sound) return;
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
  jump: () => blip({ freq: 380, slide: 260, dur: 0.14, type: 'triangle', gain: 0.07 }),
  land: () => blip({ freq: 180, slide: -70, dur: 0.1, type: 'sine', gain: 0.05 }),
  coin: () => blip({ freq: 880, slide: 420, dur: 0.1, type: 'square', gain: 0.045 }),
  slide: () => blip({ freq: 300, slide: -180, dur: 0.22, type: 'sawtooth', gain: 0.04 }),
  grapple: () => blip({ freq: 240, slide: 700, dur: 0.28, type: 'sawtooth', gain: 0.05 }),
  hit: () => blip({ freq: 150, slide: -110, dur: 0.4, type: 'sawtooth', gain: 0.1 }),
  ui: () => blip({ freq: 620, dur: 0.06, type: 'sine', gain: 0.05 }),
  buy: () => {
    blip({ freq: 660, dur: 0.09, type: 'sine', gain: 0.06 });
    setTimeout(() => blip({ freq: 990, dur: 0.13, type: 'sine', gain: 0.06 }), 90);
  },
};
