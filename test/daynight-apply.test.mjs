import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  hexToRgb, rgbToHex, lerpHex, daylightFactor, computeTargets,
  sunPositionFor, attachBases, applyTargets, createDayNightApplier,
} from '../src/ambient/DayNightApplier.js';
import { DayNight } from '../src/ambient/DayNight.js';

function fakeColor(hex) {
  return { hex, getHex() { return this.hex; }, setHex(h) { this.hex = h; } };
}
function fakeScene() {
  const sun = { isDirectionalLight: true, intensity: 2.85, color: fakeColor(0xfff2df), position: { x: -705, y: 850, z: -816, set(x, y, z) { this.x = x; this.y = y; this.z = z; } } };
  const fill = { isDirectionalLight: true, intensity: 1.08, color: fakeColor(0xc6d5e1) };
  const hemi = { isHemisphereLight: true, intensity: 1.3 };
  const amb = { isAmbientLight: true, intensity: 0.23 };
  const skyMat = { isMeshBasicMaterial: true, color: fakeColor(0x92c5e6) };
  const sky = { name: 'Panipat sky', material: skyMat };
  return {
    __all: [sun, fill, hemi, amb, sky],
    traverse(fn) { for (const o of this.__all) fn(o); },
    background: fakeColor(0x92c5e6),
    fog: { color: fakeColor(0xb1d3e3), density: 0.00042 },
    __refs: { sun, fill, hemi, amb, skyMat },
  };
}

test('hex helpers round-trip', () => {
  assert.equal(rgbToHex(hexToRgb(0xff7f00)), 0xff7f00);
  assert.equal(lerpHex(0x000000, 0xffffff, 0.5), 0x808080);
});

test('daylight factor is 1 at noon, 0 at midnight', () => {
  const clock = new DayNight({ hour: 10 });
  const noon = clock.sample(12);
  assert.equal(daylightFactor(noon, noon), 1);
  assert.equal(daylightFactor(clock.sample(0), noon), 0);
});

test('computeTargets floors night light (never pitch black)', () => {
  const clock = new DayNight({ hour: 10 });
  const bases = { sun: { intensity: 2.85, color: 0xfff2df }, fill: { intensity: 1.08 }, hemi: { intensity: 1.3 }, ambient: { intensity: 0.23 }, background: 0x92c5e6, fog: { color: 0xb1d3e3, density: 0.00042 }, skyColor: 0x92c5e6 };
  const t = computeTargets(clock.sample(0), bases, clock.sample(12));
  assert.ok(t.sunIntensity >= 0.12);
  assert.ok(t.hemiIntensity >= 1.3 * 0.35 - 1e-9);
  assert.equal(t.streetlightsOn, true);
  const day = computeTargets(clock.sample(12), bases, clock.sample(12));
  assert.ok(Math.abs(day.sunIntensity - 2.85) < 1e-9);
  assert.equal(day.streetlightsOn, false);
});

test('sunPositionFor stays on orbit radius with clamped elevation', () => {
  const p = sunPositionFor(1.2, 0.06, 900);
  assert.ok(Math.abs(Math.hypot(p.x, p.y, p.z) - 900) < 1e-6);
  assert.ok(p.y > 0);
});

test('attach finds sun as brightest directional + sky + fog + bg', () => {
  const scene = fakeScene();
  const bases = attachBases(scene);
  assert.equal(bases.sun.intensity, 2.85);
  assert.equal(bases.fill.intensity, 1.08);
  assert.equal(bases.skyColor, 0x92c5e6);
  assert.equal(bases.fog.density, 0.00042);
});

test('attach skips shader sky materials', () => {
  const scene = fakeScene();
  scene.__all.push({ name: 'Panipat sky fx', material: { isShaderMaterial: true, color: fakeColor(0xffffff) } });
  const bases = attachBases(scene);
  assert.equal(bases.skyMats.length, 1);
});

test('applier writes scene + throttles + setHour forces', () => {
  const scene = fakeScene();
  const clock = new DayNight({ hour: 10 });
  const ap = createDayNightApplier({ scene, clock, now: () => 0 });
  assert.ok(ap);
  assert.ok(ap.update(0) > 0);
  const first = scene.__refs.sun.intensity;
  assert.equal(ap.update(100), 0); // throttled
  ap.setHour(0); // forces re-apply at midnight
  assert.ok(scene.__refs.sun.intensity < first);
  assert.equal(scene.__refs.sun.intensity >= 0.12, true);
});

test('applier returns null with no directional sun', () => {
  const scene = { traverse: (fn) => fn({ isAmbientLight: true, intensity: 1 }), background: null, fog: null };
  assert.equal(createDayNightApplier({ scene, clock: new DayNight(), now: () => 0 }), null);
});

function fakeSkyShader() {
  const uniform = (hex) => ({ value: { isColor: true, hex, getHex() { return this.hex; }, setHex(h) { this.hex = h; } } });
  return {
    isShaderMaterial: true,
    uniforms: { uTop: uniform(0x2b6cb0), uMid: uniform(0x63b3ed), uHorizon: uniform(0xfbd38d), uSun: uniform(0xfffbeb), uSunDir: { value: { x: 0, y: 1, z: 0, set(x, y, z) { this.x = x; this.y = y; this.z = z; return this; }, normalize() { return this; } } } },
  };
}

test('sky shader uniforms captured and painted, sun disc tracks', () => {
  const scene = fakeScene();
  const shader = fakeSkyShader();
  scene.__all.push({ name: 'Panipat sky', material: shader });
  const bases = attachBases(scene);
  assert.ok(bases.skyShader);
  assert.equal(bases.skyShader.top, 0x2b6cb0);
  const clock = new DayNight({ hour: 10 });
  const night = computeTargets(clock.sample(0), bases, clock.sample(12));
  assert.ok(night.skyShader);
  assert.notEqual(night.skyShader.top, 0x2b6cb0); // night-darkened
  const n = applyTargets(scene, bases, night);
  assert.ok(n > 0);
  assert.equal(shader.uniforms.uTop.value.hex, night.skyShader.top);
  assert.ok(shader.uniforms.uSunDir.value.y > 0);
});

test('non-sky shaders are ignored', () => {
  const scene = fakeScene();
  scene.__all.push({ name: 'Panipat sky', material: { isShaderMaterial: true, uniforms: { uFoo: { value: 1 } } } });
  const bases = attachBases(scene);
  assert.equal(bases.skyShader, null);
});
