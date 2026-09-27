import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';

import { initPeds } from '../src/reboot/live/Peds.js';
import { createMissions } from '../src/reboot/live/Missions.js';
import { formatSpeed } from '../src/reboot/live/Hud.js';
import { bedGains, createAudio } from '../src/reboot/live/Audio.js';
import { initLive } from '../src/reboot/live/Live.js';

const graph = {
  nearest(x, z) {
    return { x: x + 20, z, dirX: 1, dirZ: 0, drive: false };
  },
};

function makePeds(hour = 12) {
  const scene = new THREE.Scene();
  return initPeds({ scene, graph, clock: { hour } });
}

// ---- missions: full flow + abandon ----

describe('missions', () => {
  it('temple-run full flow emits stage then done', () => {
    const m = createMissions();
    assert.equal(m.start('temple-run').ok, true);
    assert.equal(m.start('market-errand').ok, false); // busy
    const stops = m.definitions.find((d) => d.id === 'temple-run').stops;
    assert.equal(m.update(0.1, { x: -999, z: -999 }).length, 0); // far: nothing
    for (let i = 0; i < stops.length - 1; i++) {
      const ev = m.update(0.1, { x: stops[i].x, z: stops[i].z });
      assert.equal(ev.length, 1);
      assert.equal(ev[0].type, 'stage');
      assert.equal(ev[0].missionId, 'temple-run');
    }
    const last = stops[stops.length - 1];
    const doneEv = m.update(0.1, { x: last.x, z: last.z });
    assert.deepEqual(doneEv.map((e) => e.type), ['stage', 'done']);
    assert.equal(m.active(), null);
    assert.equal(m.beacon(), null);
    assert.deepEqual(m.completed(), ['temple-run']);
  });

  it('market-errand pickup then drop', () => {
    const m = createMissions();
    assert.equal(m.start('nope').ok, false);
    assert.equal(m.start('market-errand').ok, true);
    const stops = m.definitions.find((d) => d.id === 'market-errand').stops;
    assert.equal(stops.length, 2);
    const e1 = m.update(0.1, { x: stops[0].x, z: stops[0].z });
    assert.equal(e1[0].type, 'stage');
    const info = m.active();
    assert.equal(info.stageIndex, 1);
    assert.deepEqual(m.beacon(), { x: stops[1].x, z: stops[1].z, r: stops[1].r, label: stops[1].label });
    const e2 = m.update(0.1, { x: stops[1].x, z: stops[1].z });
    assert.equal(e2[e2.length - 1].type, 'done');
    assert.equal(m.active(), null);
  });

  it('abandon clears the mission', () => {
    const m = createMissions();
    m.start('temple-run');
    assert.notEqual(m.active(), null);
    m.abandon();
    assert.equal(m.active(), null);
    assert.equal(m.beacon(), null);
    assert.deepEqual(m.update(0.1, { x: 120, z: 80 }), []);
    assert.equal(m.start('market-errand').ok, true); // reusable after abandon
  });
});

// ---- audio beds ----

describe('bedGains', () => {
  it('residential: birds by day, crickets by night', () => {
    const day = bedGains('residential', 12);
    assert.ok(day.birds > 0 && day.crickets === 0);
    const night = bedGains('residential', 2);
    assert.ok(night.crickets > 0 && night.birds === 0);
  });

  it('market / temple / arterial beds', () => {
    assert.ok(bedGains('market', 12).murmur > 0);
    const t = bedGains('temple', 12);
    assert.ok(t.bell > 0 && t.drone > 0);
    assert.ok(bedGains('arterial', 12).rumble > 0);
  });

  it('wind always present', () => {
    for (const [bed, h] of [['market', 0], ['temple', 23], ['residential', 3], ['arterial', 15], ['???', 12]]) {
      assert.ok(bedGains(bed, h).wind > 0);
    }
  });

  it('wiring works with a fake AudioContext and never throws', () => {
    const gain = () => ({ value: 0, setTargetAtTime() {}, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} });
    const fake = {
      destination: {},
      currentTime: 0,
      sampleRate: 44100,
      createGain: () => ({ gain: gain(), connect() {} }),
      createBuffer: (_ch, n) => ({ getChannelData: () => new Float32Array(n) }),
      createBufferSource: () => ({ buffer: null, loop: false, connect() {}, start() {} }),
      createBiquadFilter: () => ({ type: '', frequency: { value: 0 }, connect() {} }),
      createOscillator: () => ({ type: '', frequency: { value: 0 }, connect() {}, start() {}, stop() {} }),
    };
    const a = createAudio();
    assert.equal(a.attach(fake), true);
    a.setZone('market', 1);
    a.update(0.1, 12);
    a.setZone('residential', 1);
    a.update(0.1, 2);
    assert.equal(a.toggle(), true);
    assert.equal(a.toggle(), false);
  });

  it('attach returns false safely with no AudioContext', () => {
    assert.equal(createAudio().attach(), false);
  });
});

// ---- hud format ----

describe('formatSpeed', () => {
  it('walk/drive formatting', () => {
    assert.equal(formatSpeed(0, false), '0 km/h WALK');
    assert.equal(formatSpeed(10, false), '36 km/h WALK');
    assert.equal(formatSpeed(10, true), '36 km/h DRIVE');
  });
});

// ---- peds ----

describe('peds', () => {
  it('caps at 12 by day, fewer at night', () => {
    const day = makePeds(12);
    day.update(0.1, { x: 0, z: 0 }, []);
    assert.equal(day.states().length, 12);
    const night = makePeds(2);
    night.update(0.1, { x: 0, z: 0 }, []);
    assert.ok(night.states().length < 12);
    assert.equal(night.states().length, 4);
  });

  it('step-back freeze near vehicles, free walk otherwise', () => {
    const free = makePeds(12);
    free.update(0.016, { x: 0, z: 0 }, []);
    const p0 = free.states()[0];
    free.update(1, { x: 0, z: 0 }, []);
    const p1 = free.states()[0];
    const walked = Math.hypot(p1.x - p0.x, p1.z - p0.z);
    assert.ok(walked > 0.8, `expected a full stride, got ${walked}`);

    const held = makePeds(12);
    held.update(0.016, { x: 0, z: 0 }, []);
    const h0 = held.states()[0];
    held.update(1, { x: 0, z: 0 }, [{ x: h0.x + 1, z: h0.z }]);
    const h1 = held.states()[0];
    assert.equal(h1.frozen, true);
    const crept = Math.hypot(h1.x - h0.x, h1.z - h0.z);
    assert.ok(crept < 0.8, `frozen ped should barely move, moved ${crept}`);
  });

  it('graph null wanders around spawn without throwing', () => {
    const scene = new THREE.Scene();
    const p = initPeds({ scene, graph: null, clock: { hour: 12 } });
    p.update(1, { x: 0, z: 0 }, []);
    assert.equal(p.states().length, 12);
  });
});

// ---- live wiring smoke ----

describe('live', () => {
  it('initLive wires subsystems and updates without throwing', () => {
    const scene = new THREE.Scene();
    const live = initLive({ scene, clock: { hour: 12 }, vehicles: [], ui: {} });
    assert.equal(typeof live.update, 'function');
    assert.ok(live.peds && live.missions && live.hud && live.audio && live.beacon);
    live.missions.start('temple-run');
    live.update(0.016, { playerPos: { x: 0, z: 0 }, driving: false, speed: 1.4 });
    assert.equal(live.beacon.visible, true);
    live.missions.abandon();
    live.update(0.016, { playerPos: { x: 0, z: 0 }, driving: true, speed: 10 });
    assert.equal(live.beacon.visible, false);
  });
});
