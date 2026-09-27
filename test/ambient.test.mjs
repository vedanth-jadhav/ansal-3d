import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RoadNetwork } from '../src/world/RoadNetwork.js';
import { TrafficDirector, densityForHour, laneOffsetFor } from '../src/ambient/TrafficDirector.js';
import { StreetLife } from '../src/ambient/StreetLife.js';
import { DayNight } from '../src/ambient/DayNight.js';
import { Soundscape, footstepSurface } from '../src/ambient/Soundscape.js';
import { DiscoveryJournal } from '../src/ambient/DiscoveryJournal.js';

const roads = [
  { id: 'a', tags: { highway: 'residential' }, coordinates: [[0, 0], [50, 0], [100, 0], [150, 0]] },
  { id: 'b', tags: { highway: 'primary' }, coordinates: [[0, 40], [150, 40]] },
  { id: 'c', tags: { highway: 'footway' }, coordinates: [[10, 0], [10, 30]] },
];

function makeVehicleStore() {
  const handles = new Map();
  return {
    handles,
    spawnParked({ kind, position, heading = 0, id }) {
      handles.set(id, { id, kind, position: { ...position }, heading });
      return handles.get(id);
    },
    remove(id) {
      handles.delete(id);
    },
    queryNearby(pos, r) {
      return [...handles.values()]
        .filter((h) => Math.hypot(h.position.x - pos.x, h.position.z - pos.z) <= r)
        .map((h) => ({ id: h.id, x: h.position.x, z: h.position.z }));
    },
    get(id) {
      return handles.get(id) ?? null;
    },
  };
}

/* ---------- TrafficDirector ---------- */

test('traffic: rush hour spawns, quiet hours stay sparse', () => {
  const rn = new RoadNetwork(roads, { cellSize: 10 });
  const store = makeVehicleStore();
  const td = new TrafficDirector({ roadNetwork: rn, vehicles: store, maxVehicles: 12 });
  assert.ok(densityForHour(9) > densityForHour(3), 'morning rush denser than night');
  assert.ok(densityForHour(18) > densityForHour(3), 'evening rush denser than night');
  assert.ok(densityForHour(9) >= densityForHour(13), 'rush at least midday');
  assert.ok(td.targetCountFor(9) > td.targetCountFor(3));
  for (let i = 0; i < 10; i++) td.update(0.5, { x: 50, z: 0 }, 9);
  assert.ok(td.managed.size > 0, 'vehicles spawn at rush hour');
  assert.ok(td.managed.size <= 12, 'never above maxVehicles');
  for (const s of td.getStates()) {
    assert.ok(Number.isFinite(s.x) && Number.isFinite(s.z) && Number.isFinite(s.heading));
  }
});

test('traffic: 260m visibility cull respects excludeIds', () => {
  const rn = new RoadNetwork(roads, { cellSize: 10 });
  const store = makeVehicleStore();
  const td = new TrafficDirector({ roadNetwork: rn, vehicles: store, maxVehicles: 8 });
  for (let i = 0; i < 10; i++) td.update(0.5, { x: 50, z: 0 }, 9);
  assert.ok(td.managed.size > 0);
  // Drive far away: everything unprotected is culled.
  td.update(0.1, { x: 5000, z: 5000 }, 9);
  assert.equal(td.managed.size, 0);
  assert.equal(store.handles.size, 0);
  // Respawn, then protect one vehicle (the occupied player vehicle case).
  for (let i = 0; i < 10; i++) td.update(0.5, { x: 50, z: 0 }, 9);
  const ids = [...td.managed.keys()];
  assert.ok(ids.length > 0);
  td.excludeIds.add(ids[0]);
  td.update(0.1, { x: 5000, z: 5000 }, 9);
  assert.ok(td.managed.has(ids[0]), 'excluded vehicle survives the cull');
  assert.ok(store.handles.has(ids[0]));
});

test('traffic: junction yield holds on blocked gap, lane offset by kind', () => {
  const rn = new RoadNetwork(roads, { cellSize: 10 });
  const store = makeVehicleStore();
  // Gap always reported blocked by an unknown vehicle.
  store.queryNearby = () => [{ id: 'blocker' }];
  const td = new TrafficDirector({ roadNetwork: rn, vehicles: store, maxVehicles: 4 });
  for (let i = 0; i < 6; i++) td.update(0.2, { x: 50, z: 0 }, 9);
  const before = [...td.managed.values()].map((v) => v.t);
  assert.ok(before.length > 0);
  td.update(1.0, { x: 50, z: 0 }, 9);
  const after = [...td.managed.values()].map((v) => v.t);
  assert.deepEqual(after, before, 'blocked vehicles hold position (yield)');
  assert.ok(laneOffsetFor('motorway') > laneOffsetFor('residential'), 'wider roads get wider lane offsets');
});

/* ---------- StreetLife ---------- */

test('streetlife: fixed cap enforced, plain states emitted', () => {
  const rn = new RoadNetwork(roads, { cellSize: 10 });
  const sl = new StreetLife({ roadNetwork: rn, getNearbyVehicles: () => [] });
  for (let i = 0; i < 30; i++) sl.update(0.5, { x: 10, z: 5 }, 12);
  const states = sl.states();
  assert.ok(states.length > 0, 'peds spawn near the player');
  assert.ok(states.length <= 14, 'default cap 14 respected');
  for (const s of states) {
    assert.deepEqual(Object.keys(s).sort(), ['heading', 'id', 'speed', 'x', 'z']);
  }
  const small = new StreetLife({ roadNetwork: rn, cap: 4, getNearbyVehicles: () => [] });
  for (let i = 0; i < 30; i++) small.update(0.5, { x: 10, z: 5 }, 12);
  assert.ok(small.states().length <= 4, 'custom cap respected');
});

test('streetlife: step-back freeze when a vehicle is within 3m', () => {
  const rn = new RoadNetwork(roads, { cellSize: 10 });
  let blocked = false;
  const sl = new StreetLife({
    roadNetwork: rn,
    getNearbyVehicles: (x, z, r) => (blocked ? [{ id: 'car', x, z, radius: 1 }] : []),
  });
  for (let i = 0; i < 20; i++) sl.update(0.5, { x: 10, z: 5 }, 12);
  assert.ok(sl.states().length > 0);
  blocked = true;
  sl.update(0.5, { x: 10, z: 5 }, 12);
  assert.ok(sl.states().length > 0);
  for (const s of sl.states()) assert.equal(s.speed, 0, 'ped freezes near vehicle');
});

/* ---------- DayNight ---------- */

test('daynight: keyframes differ noon vs night, hour wraps', () => {
  const dn = new DayNight({ hour: 12 });
  const noon = dn.sample(12);
  const night = dn.sample(0);
  assert.ok(noon.sunIntensity > 0.8, 'noon sun strong');
  assert.equal(noon.streetlightsOn, false);
  assert.equal(night.sunIntensity, 0);
  assert.equal(night.streetlightsOn, true);
  assert.equal(night.windowLightsOn, true);
  assert.ok(noon.ambientIntensity > night.ambientIntensity);
  assert.ok(noon.sunElevation > 0 && night.sunElevation < 0);
  for (const s of [noon, night]) {
    assert.ok(/^#[0-9a-f]{6}$/.test(s.sunColor));
    assert.ok(/^#[0-9a-f]{6}$/.test(s.fogColor));
    assert.ok(s.fogDensity > 0);
  }
  // Wrap: 23.9h + 0.2 game-hour rolls past midnight.
  dn.setHour(23.9);
  dn.update(0.2 * 300);
  assert.ok(dn.hour < 1, `hour wraps, got ${dn.hour}`);
  // Default scale: 300 real seconds advance exactly one game hour.
  const paced = new DayNight({ hour: 10 });
  paced.update(300);
  assert.ok(Math.abs(paced.hour - 11) < 1e-9);
});

/* ---------- Soundscape ---------- */

test('soundscape: zone beds selected by POI and road kind', () => {
  const s = new Soundscape({});
  assert.equal(s.selectBed({ x: 0, z: 0 }, { poi: { id: 'm', kind: 'market' } }).bed, 'market');
  assert.equal(s.selectBed({ x: 0, z: 0 }, { poi: { id: 't', kind: 'temple' } }).bed, 'temple');
  assert.equal(s.selectBed({ x: 0, z: 0 }, { roadKind: 'primary' }).bed, 'arterial');
  assert.equal(s.selectBed({ x: 0, z: 0 }, { roadKind: 'residential' }).bed, 'residential');
  assert.equal(s.selectBed({ x: 0, z: 0 }, {}).bed, 'quiet');
  const arterial = s.selectBed({ x: 0, z: 0 }, { roadKind: 'motorway' });
  const quiet = s.selectBed({ x: 0, z: 0 }, { roadKind: 'residential' });
  assert.ok(arterial.trafficLevel > quiet.trafficLevel);
  for (const r of [arterial, quiet]) {
    assert.ok(r.intensity >= 0 && r.intensity <= 1);
    assert.ok(r.trafficLevel >= 0 && r.trafficLevel <= 1);
  }
  // Injected lookups are honoured.
  const withLookup = new Soundscape({
    lookupPOI: () => ({ id: 'bazaar', kind: 'bazaar', distance: 10 }),
    lookupRoad: () => ({ kind: 'footway' }),
  });
  assert.equal(withLookup.selectBed({ x: 1, z: 1 }).bed, 'market');
});

test('soundscape: footstep surfaces and audio stub', () => {
  assert.equal(footstepSurface('primary'), 'asphalt');
  assert.equal(footstepSurface('residential'), 'asphalt');
  assert.equal(footstepSurface('footway'), 'pavers');
  assert.equal(footstepSurface('path'), 'pavers');
  assert.equal(footstepSurface('track'), 'dirt');
  assert.equal(footstepSurface('unknown-kind'), 'dirt');
  const s = new Soundscape({});
  assert.equal(s.audio, null);
  const ctx = { fake: true };
  assert.equal(s.attachAudio(ctx), ctx);
});

/* ---------- DiscoveryJournal ---------- */

function makeStorage() {
  let blob = null;
  return {
    saved: [],
    load() {
      return blob ? JSON.parse(blob) : null;
    },
    save(state) {
      blob = JSON.stringify({ schemaVersion: 2, revision: 1, ...state });
      return { ok: true, revision: 1 };
    },
  };
}

test('journal: linger records an entry, leaving early does not', () => {
  const storage = makeStorage();
  const j = new DiscoveryJournal({
    places: [{ id: 'ghat', name: 'Old Ghat', position: { x: 0, z: 0 }, radius: 20 }],
    storage,
    lingerSeconds: 3,
    clock: () => '2026-09-27T00:00:00.000Z',
  });
  assert.deepEqual(j.update(1, { x: 0, z: 0 }), []);
  const fresh = j.update(2.5, { x: 0, z: 0 });
  assert.equal(fresh.length, 1);
  assert.equal(fresh[0].placeId, 'ghat');
  assert.equal(fresh[0].arrivedAt, '2026-09-27T00:00:00.000Z');
  assert.ok(fresh[0].note);
  assert.ok(j.has('ghat'));
  // No duplicate on further lingering.
  assert.deepEqual(j.update(5, { x: 0, z: 0 }), []);

  const j2 = new DiscoveryJournal({
    places: [{ id: 'park', position: { x: 100, z: 100 }, radius: 10 }],
    lingerSeconds: 5,
  });
  j2.update(2, { x: 100, z: 100 });
  j2.update(2, { x: 999, z: 999 }); // walks away: dwell resets
  j2.update(2, { x: 100, z: 100 });
  assert.equal(j2.has('park'), false);
  assert.deepEqual(j2.entries, []);
});

test('journal: persistence round-trip through SaveStore-compatible storage', () => {
  const storage = makeStorage();
  const j = new DiscoveryJournal({
    places: [{ id: 'temple', note: 'Quiet courtyard', position: { x: 5, z: 5 } }],
    storage,
    lingerSeconds: 2,
  });
  j.update(2.5, { x: 5, z: 5 });
  assert.ok(j.has('temple'));
  const restored = new DiscoveryJournal({ places: [], storage });
  assert.ok(restored.has('temple'), 'entry survives reload');
  assert.equal(restored.get('temple').note, 'Quiet courtyard');
});

test('journal: no counting API exists', () => {
  const j = new DiscoveryJournal({ places: [] });
  for (const key of [
    'count',
    'total',
    'totals',
    'percentage',
    'percent',
    'progress',
    'stats',
    'getCount',
    'getTotal',
    'countEntries',
    'totalVisited',
    'completion',
  ]) {
    assert.equal(j[key], undefined, `journal.${key} must not exist`);
  }
  for (const e of j.entries) {
    for (const k of Object.keys(e)) {
      assert.ok(!/count|total|percent|progress|score/i.test(k), `entry key ${k} looks like a counter`);
    }
  }
});
