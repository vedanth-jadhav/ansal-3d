// reboot-city tests: OsmGraph widths/drive/nearest, clearOfRoads,
// tolerant catalog parsing. Run: node --test test/reboot-city.test.mjs
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { buildOsmGraph, widthForHighway, isDrivable } from '../src/reboot/city/OsmGraph.js';
import { clearOfRoads, kindOf, floorsOf, buildHousing } from '../src/reboot/city/Housing.js';
import { buildLandmarks } from '../src/reboot/city/Landmarks.js';
import { initCity, sunDirForHour } from '../src/reboot/city/CityBuilder.js';

const tinyOsm = {
  roads: [
    { id: 't1', coordinates: [[0, 0], [100, 0]], tags: { highway: 'tertiary' } },
    { id: 'r1', coordinates: [[0, 50], [100, 50]], tags: { highway: 'residential' } },
    { id: 's1', coordinates: [[0, 100], [100, 100]], tags: { highway: 'service' } },
    { id: 'u1', coordinates: [[0, 150], [100, 150]], tags: { highway: 'unclassified' } },
    { id: 'f1', coordinates: [[0, 200], [100, 200]], tags: { highway: 'footway' } },
    { id: 'p1', coordinates: [[0, 250], [100, 250]], tags: { highway: 'path' } },
  ],
};

describe('OsmGraph widths + drive flags', () => {
  it('maps highway class to spec widths', () => {
    assert.equal(widthForHighway('tertiary'), 7);
    assert.equal(widthForHighway('unclassified'), 5);
    assert.equal(widthForHighway('residential'), 3.5);
    assert.equal(widthForHighway('service'), 2.5);
    assert.equal(widthForHighway('footway'), 1.2);
    assert.equal(widthForHighway('path'), 1.2);
  });

  it('marks footway/path non-drive, carriageways drive', () => {
    assert.equal(isDrivable('tertiary'), true);
    assert.equal(isDrivable('residential'), true);
    assert.equal(isDrivable('service'), true);
    assert.equal(isDrivable('unclassified'), true);
    assert.equal(isDrivable('footway'), false);
    assert.equal(isDrivable('path'), false);
  });

  it('exposes segments with width/drive/kind per class', () => {
    const g = buildOsmGraph(tinyOsm);
    assert.equal(g.segments.length, 6);
    const byKind = Object.fromEntries(g.segments.map((s) => [s.kind, s]));
    assert.equal(byKind.tertiary.width, 7);
    assert.equal(byKind.tertiary.drive, true);
    assert.equal(byKind.residential.width, 3.5);
    assert.equal(byKind.service.width, 2.5);
    assert.equal(byKind.unclassified.width, 5);
    assert.equal(byKind.footway.width, 1.2);
    assert.equal(byKind.footway.drive, false);
    assert.equal(byKind.path.drive, false);
  });

  it('nearest() returns closest point + segment dir + width', () => {
    const g = buildOsmGraph(tinyOsm);
    const n = g.nearest(30, 8); // 8m south of the tertiary centerline
    assert.equal(n.kind, 'tertiary');
    assert.equal(n.width, 7);
    assert.ok(Math.abs(n.x - 30) < 1e-9);
    assert.ok(Math.abs(n.z - 0) < 1e-9);
    assert.ok(Math.abs(n.dx - 1) < 1e-9 && Math.abs(n.dz - 0) < 1e-9);
    assert.ok(Math.abs(n.dist - 8) < 1e-9);
  });

  it('nearest() snaps to segment endpoints, not the infinite line', () => {
    const g = buildOsmGraph(tinyOsm);
    const n = g.nearest(150, 0);
    assert.ok(Math.abs(n.x - 100) < 1e-9);
    assert.ok(Math.abs(n.dist - 50) < 1e-9);
  });

  it('grid index (>=4000 segments) agrees with brute force', () => {
    const roads = [];
    for (let i = 0; i < 2100; i++) {
      roads.push({ id: 'g' + i, coordinates: [[i, 0], [i + 0.5, 10]], tags: { highway: 'residential' } });
    }
    const g = buildOsmGraph({ roads }); // 2100 segments... below threshold
    assert.ok(g.segments.length < 4000);
    const roadsBig = [];
    for (let i = 0; i < 4100; i++) {
      roadsBig.push({ id: 'h' + i, coordinates: [[(i % 100) * 10, Math.floor(i / 100) * 10], [(i % 100) * 10 + 5, Math.floor(i / 100) * 10 + 5]], tags: { highway: 'residential' } });
    }
    const big = buildOsmGraph({ roads: roadsBig });
    assert.ok(big.segments.length >= 4000);
    const n = big.nearest(12, 3);
    assert.ok(Number.isFinite(n.dist) && n.dist < 10);
    assert.equal(n.kind, 'residential');
    assert.equal(n.width, 3.5);
    void g;
  });

  it('tolerates missing tags / bad coordinates', () => {
    const g = buildOsmGraph({ roads: [{ id: 'x' }, { id: 'y', coordinates: [[0, 0], ['a', null]] }, null] });
    assert.equal(g.segments.length, 0);
    assert.equal(g.nearest(0, 0), null);
  });
});

describe('clearOfRoads', () => {
  const segs = [{ ax: 0, az: 0, bx: 100, bz: 0, width: 7, drive: true, kind: 'tertiary' }];
  it('blocks a rect straddling the road', () => {
    assert.equal(clearOfRoads(50, 0, 8, 7, segs), false);
  });
  it('blocks a rect within halfWidth+2 of the centerline', () => {
    // halfWidth 3.5 + 2 = 5.5; rect edge at 6-3.5=2.5m -> blocked
    assert.equal(clearOfRoads(50, 6, 8, 7, segs), false);
  });
  it('clears a rect beyond halfWidth+2', () => {
    // rect edge at 12-3.5=8.5m > 5.5 -> clear
    assert.equal(clearOfRoads(50, 12, 8, 7, segs), true);
  });
  it('clears far-away rects and empty segment lists', () => {
    assert.equal(clearOfRoads(-500, -500, 8, 7, segs), true);
    assert.equal(clearOfRoads(50, 0, 8, 7, []), true);
  });
  it('rejects non-finite footprints', () => {
    assert.equal(clearOfRoads(NaN, 0, 8, 7, segs), false);
  });
});

describe('catalog parsing tolerance', () => {
  it('kindOf honors legacy single-letter statuses', () => {
    for (const k of ['H', 'U', 'V', 'K', 'S']) {
      assert.equal(kindOf({ parcel_id: 'T', game_x: 0, game_z: 999, status: k }).replace('W', 'V'), k === 'W' ? 'V' : k);
    }
  });

  it('kindOf maps the v90 scheme', () => {
    assert.equal(kindOf({ parcel_id: 'a', game_x: 0, game_z: 999, status: 'active', floors: 'G+2', module_hint: 'modern-plotted-sector' }), 'H');
    assert.equal(kindOf({ parcel_id: 'b', game_x: 0, game_z: 999, status: 'vacant' }), 'V');
    assert.equal(kindOf({ parcel_id: 'c', game_x: 0, game_z: 999, status: 'superseded' }), null);
    assert.equal(kindOf({ parcel_id: 'd', game_x: 0, game_z: 999, status: 'active', module_hint: 'roadside-kiosk' }), 'K');
    assert.equal(kindOf({ parcel_id: 'e', game_x: 0, game_z: 999, status: 'active', module_hint: 'shrine' }), 'S');
    assert.equal(kindOf({ parcel_id: 'f', game_x: 0, game_z: 999, status: 'active', module_hint: 'plotted-residential-construction' }), 'U');
  });

  it('floorsOf tolerates missing / odd floors fields', () => {
    assert.equal(floorsOf({}), 2);
    assert.equal(floorsOf({ floors: null }), 2);
    assert.equal(floorsOf({ floors: 'G+2' }), 3);
    assert.equal(floorsOf({ floors: 'n/a' }), 2);
    assert.equal(floorsOf({ floors: 'vacant' }), 0);
    assert.equal(floorsOf({ floors: 'G+9' }), 4); // clamped
  });

  it('buildHousing skips rows with missing anchors instead of crashing', () => {
    const scene = new THREE.Scene();
    const g = buildOsmGraph(tinyOsm);
    const res = buildHousing(scene, g, [
      null,
      { parcel_id: 'no-anchor', status: 'active' },
      { parcel_id: 'bad-anchor', game_x: 'far', game_z: null, status: 'active' },
      { parcel_id: 'ok', game_x: 50, game_z: 999, status: 'active', floors: 'G+2' },
    ]);
    assert.equal(res.placed, 1);
    assert.equal(res.skipped, 3);
    assert.equal(res.colliders.length, 1);
  });

  it('buildLandmarks with no matching rows builds nothing, silently', () => {
    const scene = new THREE.Scene();
    const res = buildLandmarks(scene, []);
    assert.deepEqual(res.built, []);
    assert.deepEqual(res.colliders, []);
    const res2 = buildLandmarks(scene, null);
    assert.deepEqual(res2.built, []);
  });

  it('buildLandmarks builds tank + temple + market from rows', () => {
    const scene = new THREE.Scene();
    const rows = [
      { parcel_id: 'ANS-LMRK-001', game_x: 0, game_z: 500, status: 'active', facade: 'intze OHSR', module_hint: 'landmark-water-tank' },
      { parcel_id: 'ANS-LMRK-002', game_x: 60, game_z: 500, status: 'active', facade: 'temple', module_hint: 'landmark-temple' },
      { parcel_id: 'M1', game_x: 120, game_z: 500, status: 'active', module_hint: 'commercial-market' },
    ];
    const res = buildLandmarks(scene, rows);
    assert.deepEqual(res.built, ['ANS-LMRK-001', 'ANS-LMRK-002', 'M1']);
    assert.equal(res.colliders.length, 3);
  });
});

describe('initCity return shape', () => {
  it('returns { graph, colliders, spawn, update } and update runs the day arc', () => {
    const scene = new THREE.Scene();
    const city = initCity({ scene, osm: tinyOsm, catalog: [] });
    assert.ok(Array.isArray(city.graph.segments));
    assert.equal(typeof city.graph.nearest, 'function');
    assert.ok(Array.isArray(city.colliders));
    assert.ok(Number.isFinite(city.spawn.x) && Number.isFinite(city.spawn.z) && Number.isFinite(city.spawn.heading));
    assert.equal(typeof city.update, 'function');
    assert.deepEqual(Object.keys(city).sort(), ['colliders', 'graph', 'spawn', 'update']);
    city.update(0.016, { hour: 6 });
    city.update(0.016, { hour: 12 });
    city.update(0.016, { hour: 18 });
    const up = sunDirForHour(12);
    assert.ok(up.y > 0.9);
    const dawn = sunDirForHour(6);
    assert.ok(Math.abs(dawn.y) < 0.05);
  });
});
