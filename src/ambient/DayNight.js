/* Time-of-day model: pure math, zero three.js, no DOM/window anywhere.
 * Default scale: 1 game-hour per 5 real minutes (hoursPerSecond = 1/300).
 * Imports cleanly under node --test.
 */

const TAU = Math.PI * 2;

function hexToRgb(hex) {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function rgbToHex([r, g, b]) {
  const c = (v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`;
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function lerpColor(a, b, t) {
  const ca = hexToRgb(a);
  const cb = hexToRgb(b);
  return rgbToHex([lerp(ca[0], cb[0], t), lerp(ca[1], cb[1], t), lerp(ca[2], cb[2], t)]);
}

/* Keyframe palette stops: [hour, {sun, sunI, ambI, fog, fogD}] */
const STOPS = [
  { h: 0, sun: '#223355', sunI: 0.0, ambI: 0.12, fog: '#0b1020', fogD: 0.012 },
  { h: 5, sun: '#223355', sunI: 0.0, ambI: 0.12, fog: '#0b1020', fogD: 0.012 },
  { h: 6.5, sun: '#ff9a5c', sunI: 0.55, ambI: 0.3, fog: '#c9a189', fogD: 0.008 },
  { h: 9, sun: '#fff2dd', sunI: 1.0, ambI: 0.55, fog: '#cfd8e3', fogD: 0.004 },
  { h: 12, sun: '#ffffff', sunI: 1.15, ambI: 0.65, fog: '#cfd8e3', fogD: 0.0035 },
  { h: 15, sun: '#fff4e0', sunI: 1.05, ambI: 0.6, fog: '#cfd8e3', fogD: 0.004 },
  { h: 17.5, sun: '#ffb14e', sunI: 0.7, ambI: 0.4, fog: '#d9a06f', fogD: 0.007 },
  { h: 19, sun: '#ff7a4d', sunI: 0.25, ambI: 0.22, fog: '#5a4a63', fogD: 0.01 },
  { h: 20, sun: '#223355', sunI: 0.0, ambI: 0.14, fog: '#141a2e', fogD: 0.012 },
  { h: 24, sun: '#223355', sunI: 0.0, ambI: 0.12, fog: '#0b1020', fogD: 0.012 },
];

function paletteAt(hour) {
  const h = ((hour % 24) + 24) % 24;
  let prev = STOPS[0];
  for (let i = 1; i < STOPS.length; i++) {
    const next = STOPS[i];
    if (h <= next.h) {
      const span = next.h - prev.h || 1;
      const t = Math.max(0, Math.min(1, (h - prev.h) / span));
      return {
        sunColor: lerpColor(prev.sun, next.sun, t),
        sunIntensity: lerp(prev.sunI, next.sunI, t),
        ambientIntensity: lerp(prev.ambI, next.ambI, t),
        fogColor: lerpColor(prev.fog, next.fog, t),
        fogDensity: lerp(prev.fogD, next.fogD, t),
      };
    }
    prev = next;
  }
  const last = STOPS[STOPS.length - 1];
  return {
    sunColor: last.sun,
    sunIntensity: last.sunI,
    ambientIntensity: last.ambI,
    fogColor: last.fog,
    fogDensity: last.fogD,
  };
}

export class DayNight {
  constructor({ hour = 10, hoursPerSecond = 1 / 300 } = {}) {
    this.hour = ((hour % 24) + 24) % 24;
    this.hoursPerSecond = hoursPerSecond;
  }

  update(dt) {
    const step = Math.max(0, dt);
    this.hour = (this.hour + step * this.hoursPerSecond) % 24;
    return this.sample();
  }

  sample(atHour = this.hour) {
    const h = ((atHour % 24) + 24) % 24;
    // Sun elevation peaks at solar noon: sin curve, positive 6h..18h.
    const sunElevation = Math.sin(((h - 6) / 12) * Math.PI);
    const sunAzimuth = ((h - 6) / 12) * Math.PI; // east -> west arc
    const pal = paletteAt(h);
    const streetlightsOn = sunElevation < 0.08;
    const windowLightsOn = sunElevation < 0.15;
    return {
      hour: h,
      sunElevation,
      sunAzimuth: sunAzimuth % TAU,
      sunColor: pal.sunColor,
      sunIntensity: pal.sunIntensity,
      ambientIntensity: pal.ambientIntensity,
      streetlightsOn,
      windowLightsOn,
      fogColor: pal.fogColor,
      fogDensity: pal.fogDensity,
    };
  }

  setHour(h) {
    this.hour = ((h % 24) + 24) % 24;
  }
}
