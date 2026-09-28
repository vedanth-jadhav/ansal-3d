// DayNightApplier: paints the DayNight clock onto the LIVE RC2 scene.
// Additive overlay — stores base light/fog/sky values on attach and lerps them
// toward the clock sample. Owns no RAF, camera or input; update() is driven by
// the existing world tick / chrome interval. Everything reverses on detach().
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
// hex <-> rgb helpers (no three.js dependency; applied via setHex-style fns)
export function hexToRgb(hex) {
  return { r: (hex >> 16) & 255, g: (hex >> 8) & 255, b: hex & 255 };
}
export function rgbToHex({ r, g, b }) {
  const c = (v) => clamp(Math.round(v), 0, 255);
  return (c(r) << 16) | (c(g) << 8) | c(b);
}
export function lerpHex(a, b, t) {
  const ca = hexToRgb(a), cb = hexToRgb(b);
  return rgbToHex({ r: lerp(ca.r, cb.r, t), g: lerp(ca.g, cb.g, t), b: lerp(ca.b, cb.b, t) });
}

const NIGHT_SKY = 0x0b1026;

// Daylight factor 0..1 from a clock sample (1 = full noon sun).
export function daylightFactor(sample, noonSample) {
  if (!noonSample || !noonSample.sunIntensity) return 1;
  return clamp(sample.sunIntensity / noonSample.sunIntensity, 0, 1);
}

// Pure: targets from a sample + captured bases. Floors keep the scene readable.
export function computeTargets(sample, bases, noonSample) {
  const f = daylightFactor(sample, noonSample);
  const duskW = clamp(1 - f, 0, 0.7); // how far toward palette tint
  const nightW = clamp(-sample.sunElevation * 3, 0, 0.85);
  const tint = (base, pal) => {
    let hex = lerpHex(base, pal, duskW);
    if (nightW > 0) hex = lerpHex(hex, NIGHT_SKY, nightW);
    return hex;
  };
  return {
    sunIntensity: Math.max(0.12, bases.sun.intensity * clamp(f, 0.08, 1.1)),
    sunColor: tint(bases.sun.color, sample.sunColor),
    fillIntensity: bases.fill ? bases.fill.intensity * clamp(0.45 + 0.55 * f, 0.45, 1) : 0,
    hemiIntensity: bases.hemi ? bases.hemi.intensity * clamp(0.35 + 0.65 * f, 0.35, 1) : 0,
    ambIntensity: bases.ambient ? bases.ambient.intensity * clamp(0.5 + 0.5 * f, 0.5, 1) : 0,
    bg: bases.background != null ? tint(bases.background, sample.fogColor) : null,
    fogColor: bases.fog ? tint(bases.fog.color, sample.fogColor) : null,
    fogDensity: bases.fog ? bases.fog.density * (1 + 0.5 * (1 - f)) : null,
    skyColor: bases.skyColor != null ? tint(bases.skyColor, sample.fogColor) : null,
    skyShader: bases.skyShader
      ? {
          top: tint(bases.skyShader.top, sample.fogColor),
          mid: tint(bases.skyShader.mid, sample.fogColor),
          horizon: tint(bases.skyShader.horizon, sample.fogColor),
          sun: tint(bases.skyShader.sun, sample.sunColor),
        }
      : null,
    azimuth: sample.sunAzimuth,
    elevation: Math.max(sample.sunElevation, 0.06),
    streetlightsOn: sample.streetlightsOn,
  };
}

// Sun position on its base orbit radius from hour arc. Pure.
export function sunPositionFor(azimuth, elevation, radius) {
  const ce = Math.cos(elevation);
  return {
    x: radius * Math.cos(azimuth) * ce,
    y: radius * Math.sin(elevation),
    z: radius * Math.sin(azimuth) * ce,
  };
}

// Gradient-sky shader uniforms, by observed convention:
// uTop/uMid/uHorizon/uSun colors + uSunDir vector (Panipat sky dome).
// Only captured when ALL are present; never touches other uniforms.
const SKY_UNIFORMS = ['uTop', 'uMid', 'uHorizon', 'uSun'];
function isSkyShader(material) {
  const u = material?.uniforms;
  if (!u) return false;
  return SKY_UNIFORMS.every((k) => u[k]?.value?.isColor && typeof u[k].value.getHex === 'function');
}

function isTintable(material) {
  return !!material && !material.isShaderMaterial && !!material.color && typeof material.color.getHex === 'function';
}

// Impure boundary: one traversal, captures bases. Skips anything unexpected.
export function attachBases(scene) {
  const bases = { sun: null, fill: null, hemi: null, ambient: null, fog: null, background: null, skyColor: null, skyMats: [], skyShader: null };
  const directionals = [];
  scene.traverse?.((o) => {
    if (o?.isDirectionalLight) directionals.push(o);
    else if (o?.isHemisphereLight && !bases.hemi) bases.hemi = { ref: o, intensity: o.intensity };
    else if (o?.isAmbientLight && !bases.ambient) bases.ambient = { ref: o, intensity: o.intensity };
    if (typeof o?.name === 'string' && /panipat sky/i.test(o.name)) {
      const mats = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
      for (const m of mats) {
        if (isTintable(m) && !bases.skyMats.includes(m)) bases.skyMats.push(m);
        if (!bases.skyShader && isSkyShader(m)) {
          bases.skyShader = {
            uniforms: m.uniforms,
            top: m.uniforms.uTop.value.getHex(),
            mid: m.uniforms.uMid.value.getHex(),
            horizon: m.uniforms.uHorizon.value.getHex(),
            sun: m.uniforms.uSun.value.getHex(),
          };
        }
      }
    }
  });
  directionals.sort((a, b) => b.intensity - a.intensity);
  if (directionals[0]) {
    const s = directionals[0];
    bases.sun = { ref: s, intensity: s.intensity, color: s.color.getHex(), orbit: Math.hypot(s.position.x, s.position.y, s.position.z) || 900 };
  }
  if (directionals[1]) {
    const f = directionals[1];
    bases.fill = { ref: f, intensity: f.intensity };
  }
  if (scene.fog && scene.fog.color && typeof scene.fog.color.getHex === 'function') {
    bases.fog = { ref: scene.fog, color: scene.fog.color.getHex(), density: scene.fog.density ?? 0.0004 };
  }
  if (scene.background && typeof scene.background.getHex === 'function') {
    bases.background = scene.background.getHex();
  }
  if (bases.skyMats.length) bases.skyColor = bases.skyMats[0].color.getHex();
  return bases;
}

export function applyTargets(scene, bases, t) {
  let n = 0;
  if (bases.sun) {
    bases.sun.ref.intensity = t.sunIntensity; n++;
    bases.sun.ref.color.setHex(t.sunColor); n++;
    const p = sunPositionFor(t.azimuth, t.elevation, bases.sun.orbit);
    bases.sun.ref.position.set(p.x, p.y, p.z); n++;
  }
  if (bases.fill) { bases.fill.ref.intensity = t.fillIntensity; n++; }
  if (bases.hemi) { bases.hemi.ref.intensity = t.hemiIntensity; n++; }
  if (bases.ambient) { bases.ambient.ref.intensity = t.ambIntensity; n++; }
  if (bases.fog) {
    if (t.fogColor != null) { bases.fog.ref.color.setHex(t.fogColor); n++; }
    if (t.fogDensity != null && typeof bases.fog.ref.density === 'number') { bases.fog.ref.density = t.fogDensity; n++; }
  }
  if (bases.background != null && t.bg != null && scene.background?.setHex) {
    scene.background.setHex(t.bg); n++;
  }
  if (t.skyColor != null) for (const m of bases.skyMats) { m.color.setHex(t.skyColor); n++; }
  if (t.skyShader && bases.skyShader) {
    const u = bases.skyShader.uniforms;
    u.uTop.value.setHex(t.skyShader.top); n++;
    u.uMid.value.setHex(t.skyShader.mid); n++;
    u.uHorizon.value.setHex(t.skyShader.horizon); n++;
    u.uSun.value.setHex(t.skyShader.sun); n++;
    // Sun disc tracks the light: rebuild direction on the sun's orbit.
    if (u.uSunDir?.value && bases.sun) {
      const p = sunPositionFor(t.azimuth, t.elevation, bases.sun.orbit);
      if (typeof u.uSunDir.value.set === 'function') { u.uSunDir.value.set(p.x, p.y, p.z).normalize(); n++; }
    }
  }
  return n;
}

export function createDayNightApplier({ scene, clock, minIntervalMs = 500, now = () => performance.now() }) {
  const bases = attachBases(scene);
  const noon = clock.sample(12);
  const applier = {
    bases,
    clock,
    lastApply: -Infinity,
    applies: 0,
    update(nowMs) {
      const t = nowMs ?? now();
      if (t - this.lastApply < minIntervalMs) return 0;
      this.lastApply = t;
      const targets = computeTargets(clock.sample(), bases, noon);
      this.applies += applyTargets(scene, bases, targets);
      this.lastTargets = targets;
      return this.applies;
    },
    setHour(h) { clock.setHour(h); this.lastApply = -Infinity; this.update(); },
    detach() { /* bases retained for a future restore pass */ },
  };
  return bases.sun ? applier : null;
}
