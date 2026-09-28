// Procedural WebAudio ambience. Every method is guarded try/catch: audio
// can NEVER throw to the page. attach() only creates the context on an
// explicit call (wire it to the first user gesture) and returns false when
// no AudioContext exists. Self-contained: no other src imports.

// Pure + test-covered: base bed gains for a zone hint + clock hour.
export function bedGains(bed, hour = 12) {
  let h = Number(hour);
  if (!Number.isFinite(h)) h = 12;
  h = ((h % 24) + 24) % 24;
  const day = h >= 6 && h < 20;
  const g = { wind: 0.3, murmur: 0, bell: 0, drone: 0, birds: 0, crickets: 0, rumble: 0 };
  switch (bed) {
    case 'market':
      g.murmur = 0.8;
      break;
    case 'temple':
      g.bell = 0.6;
      g.drone = 0.35;
      break;
    case 'residential':
      if (day) g.birds = 0.7;
      else g.crickets = 0.7;
      break;
    case 'arterial':
      g.rumble = 0.8;
      break;
    default:
      break;
  }
  return g;
}

const MASTER_START = 0.15;
const BELLS = [523.25, 392.0, 329.63, 261.63];

export function createAudio() {
  let ctx = null;
  let master = null;
  let muted = false;
  let bed = 'residential';
  let intensity = 1;
  let hour = 12;
  const N = {}; // live nodes: windGain, murmurGain, droneGain, rumbleGain
  let bellAt = 0;
  let chirpAt = 0;
  let bellStep = 0;

  function now() {
    try {
      return typeof ctx?.currentTime === 'number' ? ctx.currentTime : Date.now() / 1000;
    } catch {
      return Date.now() / 1000;
    }
  }

  function makeNoise(seconds = 2) {
    const sr = ctx.sampleRate || 44100;
    const len = Math.max(1, Math.floor(sr * seconds));
    const buf = ctx.createBuffer(1, len, sr);
    const ch = buf.getChannelData(0);
    for (let i = 0; i < len; i++) ch[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    return src;
  }

  function noiseThrough(type, freq, level) {
    const src = makeNoise();
    const filt = ctx.createBiquadFilter();
    filt.type = type;
    filt.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.value = 0;
    src.connect(filt);
    filt.connect(g);
    g.connect(master);
    src.start();
    return { src, filt, gain: g, base: level };
  }

  function toneThrough(type, freq, level) {
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.value = 0;
    osc.connect(g);
    g.connect(master);
    osc.start();
    return { osc, gain: g, base: level };
  }

  function blip(freq, dur, level, when = 0) {
    const t0 = now() + when;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.value = 0;
    osc.connect(g);
    g.connect(master);
    try {
      g.gain.setValueAtTime?.(0, t0);
      g.gain.linearRampToValueAtTime?.(level, t0 + 0.03);
      g.gain.exponentialRampToValueAtTime?.(0.0001, t0 + dur);
    } catch {
      g.gain.value = level;
    }
    osc.start(t0);
    try {
      osc.stop(t0 + dur + 0.1);
    } catch { /* ignore */ }
  }

  // Attach to a real or fake context. Returns true when live, false when
  // there is no AudioContext (page keeps running silently).
  function attach(external) {
    try {
      if (ctx) return true;
      let c = external;
      if (c && typeof c.createGain === 'function') {
        ctx = c; // instance passed directly (also how tests inject fakes)
      } else if (typeof c === 'function') {
        ctx = new c();
      } else {
        const AC = globalThis.AudioContext ?? globalThis.webkitAudioContext;
        if (typeof AC !== 'function') return false;
        try {
          ctx = new AC();
        } catch {
          return false;
        }
      }
      if (!ctx || typeof ctx.createGain !== 'function') {
        ctx = null;
        return false;
      }
      master = ctx.createGain();
      master.gain.value = muted ? 0 : MASTER_START;
      try {
        if (ctx.destination) master.connect(ctx.destination);
      } catch { /* headless fake */ }
      try {
        ctx.resume?.()?.catch?.(() => {});
      } catch { /* ignore */ }
      // Wind (filtered noise) always on.
      try {
        const w = noiseThrough('lowpass', 400, 0.25);
        N.wind = w.gain;
        N.windBase = w.base;
      } catch { /* ignore */ }
      // Bed layers, all starting silent; update() crossfades toward targets.
      try {
        N.murmur = noiseThrough('bandpass', 800, 0.5).gain;
      } catch { /* ignore */ }
      try {
        N.drone = toneThrough('sine', 110, 0.12).gain;
      } catch { /* ignore */ }
      try {
        N.rumble = toneThrough('sine', 45, 0.5).gain;
      } catch { /* ignore */ }
      bellAt = now() + 1;
      chirpAt = now() + 2;
      return true;
    } catch {
      return false;
    }
  }

  function setZone(nextBed, nextIntensity = 1) {
    try {
      if (typeof nextBed === 'string' && nextBed) bed = nextBed;
      const v = Number(nextIntensity);
      intensity = Number.isFinite(v) ? Math.min(Math.max(v, 0), 1.5) : 1;
    } catch { /* never throw */ }
  }

  function ramp(param, target) {
    try {
      if (!param) return;
      if (typeof param.setTargetAtTime === 'function') {
        param.setTargetAtTime(target, now(), 0.8);
      } else {
        param.value = target;
      }
    } catch { /* ignore */ }
  }

  // Crossfade continuous layers + schedule bell strikes / bird chirps /
  // cricket ticks. Optional hour overrides the wall clock (tests pass it).
  function update(_dt = 0, h = null) {
    try {
      if (!ctx || !master) return;
      let hh = Number(h);
      if (!Number.isFinite(hh)) {
        try {
          hh = new Date().getHours();
        } catch {
          hh = hour;
        }
      }
      hour = hh;
      const k = intensity;
      const t = bedGains(bed, hh);
      const windT = (N.windBase ?? 0.25) * (t.wind / 0.3 || 1) * (0.5 + 0.5 * k);
      ramp(N.wind?.gain ?? N.wind, windT);
      ramp(N.murmur, t.murmur * 0.5 * k);
      ramp(N.drone, t.drone * 0.35 * k);
      ramp(N.rumble, t.rumble * 0.5 * k);
      const tNow = now();
      if (t.bell > 0 && tNow >= bellAt) {
        try {
          blip(BELLS[bellStep % BELLS.length], 3.2, 0.22 * k);
          bellStep += 1;
        } catch { /* ignore */ }
        bellAt = tNow + 6 + Math.random() * 4;
      }
      if ((t.birds > 0 || t.crickets > 0) && tNow >= chirpAt) {
        try {
          if (t.birds > 0) {
            const f = 2400 + Math.random() * 1600;
            blip(f, 0.12, 0.1 * k);
            blip(f * 1.2, 0.1, 0.08 * k, 0.14);
          } else {
            blip(4200, 0.06, 0.05 * k);
            blip(4200, 0.06, 0.05 * k, 0.1);
            blip(4200, 0.06, 0.05 * k, 0.2);
          }
        } catch { /* ignore */ }
        chirpAt = tNow + 1.5 + Math.random() * 3;
      }
    } catch { /* never throw */ }
  }

  function toggle() {
    try {
      muted = !muted;
      if (master) {
        try {
          if (typeof master.gain.setTargetAtTime === 'function') {
            master.gain.setTargetAtTime(muted ? 0 : MASTER_START, now(), 0.1);
          } else {
            master.gain.value = muted ? 0 : MASTER_START;
          }
        } catch { /* ignore */ }
      }
      return muted;
    } catch {
      return muted;
    }
  }

  function dispose() {
    try {
      for (const n of Object.values(N)) {
        try {
          n?.src?.stop?.();
        } catch { /* ignore */ }
        try {
          n?.osc?.stop?.();
        } catch { /* ignore */ }
      }
      try {
        ctx?.close?.();
      } catch { /* ignore */ }
    } catch { /* ignore */ }
    ctx = null;
    master = null;
  }

  return {
    attach, setZone, toggle, update, dispose,
    get muted() {
      return muted;
    },
    get live() {
      return !!ctx;
    },
  };
}
