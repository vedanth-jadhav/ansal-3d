// OsmGraph.js — pure logic, no three.js.
// Parses OSM road json into flat drivable/walkable segments.
// This graph is ALSO the traffic/ped path source: consumers use
// `segments` for routing and `nearest(x, z)` for snapping.
//
// Coordinate system: x = east, z = south, meters, y-up.
// OSM input shape: { roads: [{ id, coordinates: [[x, z], ...], tags: { highway } }] }

export const HIGHWAY_WIDTHS = {
  motorway: 9,
  trunk: 8,
  primary: 8,
  secondary: 7.5,
  tertiary: 7,
  tertiary_link: 7,
  unclassified: 5,
  residential: 3.5,
  service: 2.5,
  living_street: 3.5,
  track: 3,
  pedestrian: 2,
  footway: 1.2,
  path: 1.2,
  cycleway: 1.2,
  steps: 1.2,
  construction: 3,
};

// Highway classes that carry no vehicle traffic.
const NON_DRIVE = new Set(['footway', 'path', 'cycleway', 'steps', 'pedestrian', 'construction']);

export function widthForHighway(highway) {
  const hw = String(highway ?? '').toLowerCase();
  if (hw in HIGHWAY_WIDTHS) return HIGHWAY_WIDTHS[hw];
  // Unknown drivable class: fall back to a residential lane; unknown
  // non-drive class falls back to a footpath.
  return NON_DRIVE.has(hw) ? 1.2 : 3.5;
}

export function isDrivable(highway) {
  return !NON_DRIVE.has(String(highway ?? '').toLowerCase());
}

// Grid index cell size (meters) used when the segment count is large.
export const GRID_CELL = 50;
export const GRID_THRESHOLD = 4000;

function closestOnSegment(px, pz, s) {
  const dx = s.bx - s.ax;
  const dz = s.bz - s.az;
  const len2 = dx * dx + dz * dz;
  let t = 0;
  if (len2 > 1e-12) t = Math.max(0, Math.min(1, ((px - s.ax) * dx + (pz - s.az) * dz) / len2));
  const cx = s.ax + dx * t;
  const cz = s.az + dz * t;
  const dist = Math.hypot(px - cx, pz - cz);
  const len = Math.sqrt(len2);
  return { x: cx, z: cz, dx: len > 1e-12 ? dx / len : 1, dz: len > 1e-12 ? dz / len : 0, dist };
}

function buildGridIndex(segments) {
  const map = new Map();
  const key = (cx, cz) => cx + ',' + cz;
  segments.forEach((s, i) => {
    const minCx = Math.floor(Math.min(s.ax, s.bx) / GRID_CELL);
    const maxCx = Math.floor(Math.max(s.ax, s.bx) / GRID_CELL);
    const minCz = Math.floor(Math.min(s.az, s.bz) / GRID_CELL);
    const maxCz = Math.floor(Math.max(s.az, s.bz) / GRID_CELL);
    for (let cx = minCx; cx <= maxCx; cx++) {
      for (let cz = minCz; cz <= maxCz; cz++) {
        const k = key(cx, cz);
        let arr = map.get(k);
        if (!arr) { arr = []; map.set(k, arr); }
        arr.push(i);
      }
    }
  });
  return map;
}

// nearest(x, z) -> closest point on the graph plus segment direction/width:
//   { x, z, dx, dz, width, drive, kind, dist }
// dx/dz is the normalized segment direction, width the road width in meters.
function makeNearest(segments) {
  const useGrid = segments.length >= GRID_THRESHOLD;
  const grid = useGrid ? buildGridIndex(segments) : null;

  function scan(x, z, indices) {
    let best = null;
    if (indices) {
      const seen = new Set();
      for (const i of indices) {
        if (seen.has(i)) continue;
        seen.add(i);
        const c = closestOnSegment(x, z, segments[i]);
        if (!best || c.dist < best.dist) best = { ...c, seg: segments[i] };
      }
      return best;
    }
    for (const s of segments) {
      const c = closestOnSegment(x, z, s);
      if (!best || c.dist < best.dist) best = { ...c, seg: s };
    }
    return best;
  }

  return function nearest(x, z) {
    if (segments.length === 0) return null;
    if (!useGrid) {
      const b = scan(x, z, null);
      return { x: b.x, z: b.z, dx: b.dx, dz: b.dz, width: b.seg.width, drive: b.seg.drive, kind: b.seg.kind, dist: b.dist };
    }
    // Expanding-ring search: keep widening until the best distance found
    // is closer than the next unsearched ring.
    const qcx = Math.floor(x / GRID_CELL);
    const qcz = Math.floor(z / GRID_CELL);
    let best = null;
    for (let ring = 0; ring < 64; ring++) {
      const indices = [];
      for (let cx = qcx - ring; cx <= qcx + ring; cx++) {
        for (let cz = qcz - ring; cz <= qcz + ring; cz++) {
          if (Math.max(Math.abs(cx - qcx), Math.abs(cz - qcz)) !== ring) continue;
          const arr = grid.get(cx + ',' + cz);
          if (arr) indices.push(...arr);
        }
      }
      const b = scan(x, z, indices);
      if (b && (!best || b.dist < best.dist)) best = b;
      if (best && best.dist <= ring * GRID_CELL) break;
    }
    if (!best) best = scan(x, z, null);
    return { x: best.x, z: best.z, dx: best.dx, dz: best.dz, width: best.seg.width, drive: best.seg.drive, kind: best.seg.kind, dist: best.dist };
  };
}

// Parse OSM json ({ roads: [{ id, coordinates: [[x,z]...], tags: { highway } }] })
// into { segments, nearest }. segments[] = { ax, az, bx, bz, width, drive, kind }.
export function buildOsmGraph(osm) {
  const roads = Array.isArray(osm) ? osm : (osm?.roads ?? []);
  const segments = [];
  for (const road of roads) {
    const coords = road?.coordinates ?? [];
    const kind = String(road?.tags?.highway ?? 'unknown').toLowerCase();
    const width = widthForHighway(kind);
    const drive = isDrivable(kind);
    for (let i = 1; i < coords.length; i++) {
      const a = coords[i - 1];
      const b = coords[i];
      if (!Array.isArray(a) || !Array.isArray(b)) continue;
      const ax = Number(a[0]); const az = Number(a[1]);
      const bx = Number(b[0]); const bz = Number(b[1]);
      if (!Number.isFinite(ax) || !Number.isFinite(az) || !Number.isFinite(bx) || !Number.isFinite(bz)) continue;
      const dx = bx - ax; const dz = bz - az;
      if (dx * dx + dz * dz < 1e-9) continue;
      segments.push({ ax, az, bx, bz, width, drive, kind });
    }
  }
  return { segments, nearest: makeNearest(segments) };
}
