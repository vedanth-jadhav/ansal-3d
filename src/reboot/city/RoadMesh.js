// RoadMesh.js — three.js ribbons over the OsmGraph drivable segments.
// Static geometry merges into <= 3 meshes: asphalt, ground, curbs.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const ASPHALT = new THREE.Color(0x6b6560); // dusty asphalt
const GROUND = new THREE.Color(0xa79b72); // muted dry-grass / dirt
const CURB_YELLOW = new THREE.Color(0xc9a227);
const CURB_DARK = new THREE.Color(0x2b2b2b);

function paint(geo, color, jitter = 0) {
  const c = color.clone();
  if (jitter > 0) {
    const j = (Math.random() * 2 - 1) * jitter;
    c.offsetHSL(0, 0, j);
  }
  const n = geo.attributes.position.count;
  const arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { arr[i * 3] = c.r; arr[i * 3 + 1] = c.g; arr[i * 3 + 2] = c.b; }
  geo.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  return geo;
}

// Flat ribbon quad for segment (ax,az)->(bx,bz) at lateral offset range [o0, o1].
function ribbon(ax, az, bx, bz, o0, o1, y) {
  const dx = bx - ax; const dz = bz - az;
  const len = Math.hypot(dx, dz) || 1;
  const nx = -dz / len; const nz = dx / len;
  const ax0 = ax + nx * o0; const az0 = az + nz * o0;
  const ax1 = ax + nx * o1; const az1 = az + nz * o1;
  const bx0 = bx + nx * o0; const bz0 = bz + nz * o0;
  const bx1 = bx + nx * o1; const bz1 = bz + nz * o1;
  const geo = new THREE.BufferGeometry();
  const v = new Float32Array([
    ax0, y, az0, bx0, y, bz0, bx1, y, bz1,
    ax0, y, az0, bx1, y, bz1, ax1, y, az1,
  ]);
  geo.setAttribute('position', new THREE.BufferAttribute(v, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(new Float32Array([0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0]), 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array([0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1]), 2));
  return geo;
}

function mergeInto(geos) {
  if (geos.length === 0) return null;
  const merged = mergeGeometries(geos, false);
  geos.forEach((g) => g.dispose());
  if (!merged) return null;
  merged.computeVertexNormals();
  return merged;
}

function addMesh(scene, merged, name) {
  const mat = new THREE.MeshLambertMaterial({ vertexColors: true });
  const mesh = new THREE.Mesh(merged, mat);
  mesh.name = name;
  mesh.receiveShadow = true;
  scene.add(mesh);
  return mesh;
}

// buildRoads(scene, graph) -> { meshCount }
export function buildRoads(scene, graph) {
  const segments = graph?.segments ?? [];
  let meshCount = 0;

  // --- ground plane sized to the graph bounds + margin ---
  let minX = Infinity; let maxX = -Infinity; let minZ = Infinity; let maxZ = -Infinity;
  for (const s of segments) {
    minX = Math.min(minX, s.ax, s.bx); maxX = Math.max(maxX, s.ax, s.bx);
    minZ = Math.min(minZ, s.az, s.bz); maxZ = Math.max(maxZ, s.az, s.bz);
  }
  if (!Number.isFinite(minX)) { minX = -100; maxX = 100; minZ = -100; maxZ = 100; }
  const MARGIN = 60;
  minX -= MARGIN; maxX += MARGIN; minZ -= MARGIN; maxZ += MARGIN;
  const gw = maxX - minX; const gd = maxZ - minZ;

  const ground = new THREE.PlaneGeometry(gw, gd, 24, 24);
  ground.rotateX(-Math.PI / 2);
  ground.translate(minX + gw / 2, 0, minZ + gd / 2);
  {
    // subtle per-vertex value jitter so the dirt does not read as flat
    const n = ground.attributes.position.count;
    const arr = new Float32Array(n * 3);
    const c = new THREE.Color();
    for (let i = 0; i < n; i++) {
      c.copy(GROUND);
      c.offsetHSL((Math.random() * 2 - 1) * 0.01, 0, (Math.random() * 2 - 1) * 0.03);
      arr[i * 3] = c.r; arr[i * 3 + 1] = c.g; arr[i * 3 + 2] = c.b;
    }
    ground.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  }
  addMesh(scene, ground.toNonIndexed(), 'reboot:ground');
  meshCount++;

  // --- asphalt ribbons on drivable segments ---
  const roadGeos = [];
  const curbGeos = [];
  let curbIndex = 0;
  for (const s of segments) {
    if (!s.drive) continue;
    const half = s.width / 2;
    roadGeos.push(paint(ribbon(s.ax, s.az, s.bx, s.bz, -half, half, 0.05), ASPHALT, 0.035));
    if (s.kind === 'tertiary' || s.kind === 'tertiary_link') {
      const curbColor = (curbIndex++ % 2 === 0) ? CURB_YELLOW : CURB_DARK;
      curbGeos.push(paint(ribbon(s.ax, s.az, s.bx, s.bz, -half - 0.45, -half - 0.15, 0.09), curbColor, 0.02));
      curbGeos.push(paint(ribbon(s.ax, s.az, s.bx, s.bz, half + 0.15, half + 0.45, 0.09), curbColor, 0.02));
    }
  }
  const roadsMerged = mergeInto(roadGeos);
  if (roadsMerged) { addMesh(scene, roadsMerged, 'reboot:roads'); meshCount++; }
  const curbsMerged = mergeInto(curbGeos);
  if (curbsMerged) { addMesh(scene, curbsMerged, 'reboot:curbs'); meshCount++; }

  return { meshCount };
}
