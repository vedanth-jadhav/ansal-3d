// Housing.js — three.js house masses at true catalog anchors (game_x/game_z).
// Nothing positioned by invention: every mass derives from a catalog row;
// rows failing road clearance are skipped (and counted), never shifted.
//
// Kind model (tolerant of both catalog schemes):
//   legacy single-letter status H/U/V/K/S/W is honored verbatim;
//   v90 scheme maps: status 'vacant' -> V, 'superseded' -> skip (replaced
//   rows), module_hint/facade hints resolve K (kiosk/eatery), S (shrine),
//   U (construction) and V (vacant-*); anything else active -> H (built).
// Static geometry merges into <= 6 meshes sharing vertex-color materials.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// District palette (cream / grey / brown / wood + trims).
const PALETTE = [0xe1d9c8, 0xa4a5a1, 0x9f7965, 0xd7c5a5, 0x9a635c, 0x676c6c];
const TRIM = 0xe5d6bc;
const METAL = 0x47545b;
const WOOD = 0x735447;
const SHELL = 0xa98470; // unfinished concrete/brick
const CONCRETE = 0xbeb2a4;
const SLAB = 0xb9ab89;
const GLASS = 0x46545a;
const SHRINE_ORANGE = 0xe3b160;
const SHRINE_RED = 0xa03a2c;
const KIOSK_GREEN = 0x486a58;

// Rows owned by Landmarks.js (or non-building): never double-build here.
const HOUSING_SKIP_HINTS = new Set([
  'landmark-water-tank',
  'landmark-temple',
  'temple',
  'commercial-market', // market row blocks live in Landmarks.js
  'road-furniture', // roundabout island: no building mass
]);

function distPointSeg(px, pz, ax, az, bx, bz) {
  const dx = bx - ax; const dz = bz - az;
  const len2 = dx * dx + dz * dz;
  let t = 0;
  if (len2 > 1e-12) t = Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / len2));
  return Math.hypot(px - (ax + dx * t), pz - (az + dz * t));
}

function distPointRect(px, pz, minX, maxX, minZ, maxZ) {
  return Math.hypot(Math.max(minX - px, 0, px - maxX), Math.max(minZ - pz, 0, pz - maxZ));
}

function segSegIntersect(ax, az, bx, bz, cx, cz, dx, dz) {
  const d = (bx - ax) * (dz - cz) - (bz - az) * (dx - cx);
  if (Math.abs(d) < 1e-12) return false;
  const t = ((cx - ax) * (dz - cz) - (cz - az) * (dx - cx)) / d;
  const u = ((cx - ax) * (bz - az) - (cz - az) * (bx - ax)) / d;
  return t >= 0 && t <= 1 && u >= 0 && u <= 1;
}

// Pure helper: is the axis-aligned rect (x,z,w,d) clear of every segment?
// A rect counts as blocked when its separation from a segment is less than
// that segment's half width + 2m. Segments tolerate a missing width.
export function clearOfRoads(x, z, w, d, segments) {
  if (!Number.isFinite(x) || !Number.isFinite(z) || !Number.isFinite(w) || !Number.isFinite(d)) return false;
  const minX = x - w / 2; const maxX = x + w / 2;
  const minZ = z - d / 2; const maxZ = z + d / 2;
  for (const s of segments ?? []) {
    const half = (Number.isFinite(s?.width) ? s.width : 3.5) / 2;
    const clearance = half + 2;
    // A line through the rect interior (or an endpoint inside) means zero gap.
    const aIn = s.ax >= minX && s.ax <= maxX && s.az >= minZ && s.az <= maxZ;
    const bIn = s.bx >= minX && s.bx <= maxX && s.bz >= minZ && s.bz <= maxZ;
    if (aIn || bIn) return false;
    if (
      segSegIntersect(s.ax, s.az, s.bx, s.bz, minX, minZ, maxX, minZ) ||
      segSegIntersect(s.ax, s.az, s.bx, s.bz, maxX, minZ, maxX, maxZ) ||
      segSegIntersect(s.ax, s.az, s.bx, s.bz, maxX, maxZ, minX, maxZ) ||
      segSegIntersect(s.ax, s.az, s.bx, s.bz, minX, maxZ, minX, minZ)
    ) return false;
    let gap = Math.min(
      distPointRect(s.ax, s.az, minX, maxX, minZ, maxZ),
      distPointRect(s.bx, s.bz, minX, maxX, minZ, maxZ),
      distPointSeg(minX, minZ, s.ax, s.az, s.bx, s.bz),
      distPointSeg(maxX, minZ, s.ax, s.az, s.bx, s.bz),
      distPointSeg(maxX, maxZ, s.ax, s.az, s.bx, s.bz),
      distPointSeg(minX, maxZ, s.ax, s.az, s.bx, s.bz),
    );
    if (gap < clearance) return false;
  }
  return true;
}

// Parse "G+2", "G+1/G+2", "3", "G+2 (u/c)"... -> storey count, clamped 1..4.
export function floorsOf(row) {
  const f = String(row?.floors ?? '');
  if (/vacant/i.test(f) && !/\d/.test(f)) return 0;
  if (/^\s*n\/a\s*$/i.test(f)) return 2;
  const g = f.match(/G\s*\+\s*(\d+)/i);
  if (g) return Math.min(4, Math.max(1, 1 + parseInt(g[1], 10)));
  const nums = [...f.matchAll(/(\d+)/g)].map((m) => parseInt(m[1], 10));
  if (nums.length === 0) return 2;
  return Math.min(4, Math.max(1, Math.max(...nums)));
}

// Resolve a catalog row to a build kind ('H' | 'U' | 'V' | 'K' | 'S') or
// null when the row must be skipped (superseded / landmark-owned / bad anchor).
export function kindOf(row) {
  if (!row || typeof row !== 'object') return null;
  if (!Number.isFinite(Number(row.game_x)) || !Number.isFinite(Number(row.game_z))) return null;
  const s = String(row.status ?? '');
  if (s === 'H' || s === 'U' || s === 'V' || s === 'K' || s === 'S' || s === 'W') {
    return s === 'W' ? 'V' : s; // legacy wall-only -> vacant walled plot
  }
  if (s === 'vacant' || s === 'V') return 'V';
  if (s === 'superseded') return null;
  const hint = String(row.module_hint ?? '');
  if (HOUSING_SKIP_HINTS.has(hint)) return null;
  if (String(row.parcel_id ?? '').startsWith('ANS-LMRK-')) {
    // Landmark-namespace rows not owned by Landmarks.js still build here
    // as small masses (shrine / kiosk / gate shed ...), except the big
    // temple structures which Landmarks.js owns.
    if (hint === 'landmark-temple' || hint === 'temple') return null;
  }
  const text = hint + ' ' + String(row.facade ?? '');
  if (/kiosk|eatery|dhaba|vendor|fast.food|stall/i.test(text)) return 'K';
  if (/shrine/i.test(text)) return 'S';
  if (/vacant/i.test(hint) || /vacant/i.test(String(row.floors ?? ''))) return 'V';
  if (/construction|u\/c|under-construction|rebar|scaffold/i.test(text)) return 'U';
  return 'H';
}

function hashPick(id, n) {
  const s = String(id ?? '');
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h % n;
}

function boxAt(geos, x, y, z, w, h, d, color) {
  const g = new THREE.BoxGeometry(w, h, d);
  g.translate(x, y, z);
  const c = new THREE.Color(color);
  const n = g.attributes.position.count;
  const arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { arr[i * 3] = c.r; arr[i * 3 + 1] = c.g; arr[i * 3 + 2] = c.b; }
  g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  geos.push(g.toNonIndexed());
  g.dispose();
}

// buildHousing(scene, graph, catalogRows) -> { placed, skipped, colliders }
// colliders: [{ minX, maxX, minZ, maxZ }] for solid masses ONLY.
export function buildHousing(scene, graph, catalogRows) {
  const segments = graph?.segments ?? [];
  const rows = Array.isArray(catalogRows) ? catalogRows : [];
  const groups = { body: [], trim: [], metal: [], shell: [], ground: [], small: [] };
  const colliders = [];
  let placed = 0; let skipped = 0; let roadSkipped = 0;

  for (const row of rows) {
    const kind = kindOf(row);
    if (!kind) { skipped++; continue; }
    const x = Number(row.game_x); const z = Number(row.game_z);
    // Footprints by kind (axis-aligned; true orientation is unsurveyed).
    const dims = kind === 'H' ? { w: 8, d: 7 }
      : kind === 'U' ? { w: 8, d: 7 }
      : kind === 'V' ? { w: 9, d: 8 }
      : kind === 'K' ? { w: 4.4, d: 3.8 }
      : { w: 3, d: 3 }; // S
    if (!clearOfRoads(x, z, dims.w, dims.d, segments)) { skipped++; roadSkipped++; continue; }

    if (kind === 'V') {
      // Vacant slab + low boundary walls. Not solid: no collider.
      boxAt(groups.ground, x, 0.06, z, dims.w, 0.12, dims.d, SLAB);
      const t = 0.25; const h = 1.1;
      boxAt(groups.ground, x, h / 2, z - dims.d / 2, dims.w, h, t, CONCRETE);
      boxAt(groups.ground, x, h / 2, z + dims.d / 2, dims.w, h, t, CONCRETE);
      boxAt(groups.ground, x - dims.w / 2, h / 2, z, t, h, dims.d, CONCRETE);
      boxAt(groups.ground, x + dims.w / 2, h / 2, z, t, h, dims.d, CONCRETE);
      placed++;
      continue;
    }

    if (kind === 'K') {
      const h = 3.2;
      boxAt(groups.small, x, h / 2, z, dims.w, h, dims.d, KIOSK_GREEN);
      boxAt(groups.small, x, h + 0.25, z, dims.w + 0.2, 0.5, dims.d + 0.2, SHRINE_RED); // sign band
      colliders.push({ minX: x - dims.w / 2, maxX: x + dims.w / 2, minZ: z - dims.d / 2, maxZ: z + dims.d / 2 });
      placed++;
      continue;
    }

    if (kind === 'S') {
      const h = 3.5;
      boxAt(groups.small, x, h / 2, z, dims.w, h, dims.d, SHRINE_ORANGE);
      const cap = new THREE.ConeGeometry(Math.max(dims.w, dims.d) * 0.7, 1.6, 4);
      cap.rotateY(Math.PI / 4);
      cap.translate(x, h + 0.8, z);
      const c = new THREE.Color(SHRINE_RED);
      const n = cap.attributes.position.count;
      const arr = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) { arr[i * 3] = c.r; arr[i * 3 + 1] = c.g; arr[i * 3 + 2] = c.b; }
      cap.setAttribute('color', new THREE.BufferAttribute(arr, 3));
      groups.small.push(cap.toNonIndexed());
      cap.dispose();
      colliders.push({ minX: x - dims.w / 2, maxX: x + dims.w / 2, minZ: z - dims.d / 2, maxZ: z + dims.d / 2 });
      placed++;
      continue;
    }

    if (kind === 'U') {
      // Unfinished shell: bare mass + exposed corner columns, no trim.
      const levels = Math.max(1, floorsOf(row));
      const h = levels * 2.9;
      boxAt(groups.shell, x, h / 2, z, dims.w, h, dims.d, SHELL);
      for (const ex of [-1, 1]) for (const ez of [-1, 1]) {
        boxAt(groups.shell, x + ex * (dims.w / 2 - 0.2), (h + 1.2) / 2, z + ez * (dims.d / 2 - 0.2), 0.4, h + 1.2, 0.4, CONCRETE);
      }
      colliders.push({ minX: x - dims.w / 2, maxX: x + dims.w / 2, minZ: z - dims.d / 2, maxZ: z + dims.d / 2 });
      placed++;
      continue;
    }

    // kind H: 2-3 floor box + parapet + floor band + windows + gate boxes.
    const levels = Math.min(3, Math.max(2, floorsOf(row)));
    const h = levels * 2.9;
    const wall = PALETTE[hashPick(row.parcel_id, PALETTE.length)];
    boxAt(groups.body, x, h / 2, z, dims.w, h, dims.d, wall);
    boxAt(groups.trim, x, h + 0.08, z, dims.w + 0.25, 0.17, dims.d + 0.25, TRIM); // roof slab
    boxAt(groups.trim, x, h + 0.45, z - dims.d / 2, dims.w, 0.6, 0.18, wall); // parapet front
    boxAt(groups.trim, x, h + 0.45, z + dims.d / 2, dims.w, 0.6, 0.18, wall); // parapet back
    boxAt(groups.trim, x, 2.9, z, dims.w + 0.1, 0.13, dims.d + 0.1, TRIM); // floor band
    for (const ex of [-2.1, 2.1]) {
      boxAt(groups.metal, x + ex, 1.7, z - dims.d / 2 - 0.04, 1.1, 1.2, 0.08, GLASS); // windows
    }
    for (const ex of [-2.65, 2.65]) {
      boxAt(groups.trim, x + ex, 0.72, z + dims.d / 2 + 1.2, 2.5, 1.44, 0.18, TRIM); // boundary piers
    }
    boxAt(groups.metal, x, 0.9, z + dims.d / 2 + 1.2, 2.75, 1.8, 0.14, WOOD); // gate
    colliders.push({ minX: x - dims.w / 2, maxX: x + dims.w / 2, minZ: z - dims.d / 2, maxZ: z + dims.d / 2 });
    placed++;
  }

  const names = { body: 'reboot:houses', trim: 'reboot:house-trim', metal: 'reboot:house-metal', shell: 'reboot:unfinished', ground: 'reboot:vacant', small: 'reboot:kiosk-shrine' };
  for (const [k, geos] of Object.entries(groups)) {
    if (geos.length === 0) continue;
    const merged = mergeGeometries(geos, false);
    geos.forEach((g) => g.dispose());
    if (!merged) continue;
    merged.computeBoundingSphere();
    const mesh = new THREE.Mesh(merged, new THREE.MeshLambertMaterial({ vertexColors: true }));
    mesh.name = names[k];
    mesh.receiveShadow = true;
    scene.add(mesh);
  }

  console.log(`[reboot-city] housing placed=${placed} skipped=${skipped} (road-clearance=${roadSkipped})`);
  return { placed, skipped, colliders };
}
