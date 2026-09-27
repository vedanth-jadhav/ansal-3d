// Landmarks.js — hero structures from true catalog anchor rows.
//   ANS-LMRK-001 (facade: "intze OHSR: cylindrical reservoir + conical cap,
//     roof railing, ... open RC multi-column frame (~10-12 ring columns,
//     4 ring-beam levels ...)"): cylindrical reservoir + conical cap + ring columns.
//   ANS-LMRK-002 (Banke Bihari temple row): white temple block + shikhar
//     cluster + gateway + red flags.
//   Market row: active 'commercial-market' rows -> shop blocks with hoarding band.
// Rows absent -> skipped silently. Export buildLandmarks(scene, catalogRows)
// -> { built: [ids], colliders: [...] }.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const WHITE = 0xf2efe8;
const GREY = 0xb9bcba;
const CONCRETE = 0x9d9a92;
const TANK_BLUE = 0x7d99a8;
const RED = 0xb03a2e;
const SHOP_GREY = 0x9a968c;
const SHOP_BEIGE = 0xc4b89a;
const HOARDING = 0x2e3138;

function paint(geo, color) {
  const c = new THREE.Color(color);
  const n = geo.attributes.position.count;
  const arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { arr[i * 3] = c.r; arr[i * 3 + 1] = c.g; arr[i * 3 + 2] = c.b; }
  geo.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  return geo;
}

function box(geos, x, y, z, w, h, d, color) {
  const g = new THREE.BoxGeometry(w, h, d);
  g.translate(x, y, z);
  geos.push(paint(g, color).toNonIndexed());
  g.dispose();
}

function cyl(geos, x, y, z, rTop, rBot, h, seg, color) {
  const g = new THREE.CylinderGeometry(rTop, rBot, h, seg);
  g.translate(x, y, z);
  geos.push(paint(g, color).toNonIndexed());
  g.dispose();
}

function cone(geos, x, y, z, r, h, seg, color) {
  const g = new THREE.ConeGeometry(r, h, seg);
  g.translate(x, y, z);
  geos.push(paint(g, color).toNonIndexed());
  g.dispose();
}

function byId(rows, id) {
  return rows.find((r) => r && r.parcel_id === id) ?? null;
}

function anchorOk(row) {
  return row && Number.isFinite(Number(row.game_x)) && Number.isFinite(Number(row.game_z));
}

function buildTank(row) {
  // Honors the ANS-LMRK-001 facade field: Intze OHSR — cylindrical
  // reservoir + conical cap, roof railing, open RC multi-column frame
  // (~10-12 ring columns, 4 ring-beam levels).
  const geos = [];
  const x = Number(row.game_x); const z = Number(row.game_z);
  const COLS = 10; const RING_R = 5.5; const SHAFT_H = 12;
  for (let i = 0; i < COLS; i++) {
    const a = (i / COLS) * Math.PI * 2;
    cyl(geos, x + Math.cos(a) * RING_R, SHAFT_H / 2, z + Math.sin(a) * RING_R, 0.4, 0.45, SHAFT_H, 8, CONCRETE);
  }
  for (let lvl = 1; lvl <= 4; lvl++) {
    const y = (SHAFT_H / 5) * lvl;
    const ring = new THREE.TorusGeometry(RING_R, 0.25, 6, 24);
    ring.rotateX(Math.PI / 2);
    ring.translate(x, y, z);
    geos.push(paint(ring, CONCRETE).toNonIndexed());
    ring.dispose();
  }
  cyl(geos, x, SHAFT_H + 2.5, z, 6.2, 5.4, 5, 24, WHITE); // reservoir
  cone(geos, x, SHAFT_H + 5 + 1.5, z, 6.4, 3, 24, TANK_BLUE); // conical cap
  const rail = new THREE.TorusGeometry(6.2, 0.08, 4, 24); // roof railing
  rail.rotateX(Math.PI / 2);
  rail.translate(x, SHAFT_H + 5.6, z);
  geos.push(paint(rail, GREY).toNonIndexed());
  rail.dispose();
  box(geos, x - 3, SHAFT_H + 5.15, z + 5.2, 3.2, 0.9, 0.25, RED); // lettering band ('SUSHANT')
  const merged = mergeGeometries(geos, false);
  geos.forEach((g) => g.dispose());
  const R = RING_R + 1.5;
  return { merged, collider: { minX: x - R, maxX: x + R, minZ: z - R, maxZ: z + R } };
}

function buildTemple(row) {
  // Honors the ANS-LMRK-002 facade field: white marble Nagara shikhar
  // cluster (tall central + subsidiary), white toran gateway, 2-storey
  // cusped-arch entrance mandapa, red flags, raised plinth.
  const geos = [];
  const x = Number(row.game_x); const z = Number(row.game_z);
  box(geos, x, 0.5, z, 16, 1, 12, WHITE); // raised plinth
  box(geos, x, 1 + 3, z, 9, 6, 8, WHITE); // entrance mandapa (2 storeys)
  box(geos, x, 1 + 6.5, z, 9.4, 1, 8.4, GREY); // mandapa cornice
  const shikhar = (sx, sz, base, tall) => {
    let w = base; let y = 1 + 7;
    const steps = tall ? 4 : 3;
    for (let i = 0; i < steps; i++) {
      box(geos, sx, y + 0.9, sz, w, 1.8, w, WHITE);
      y += 1.8; w *= 0.72;
    }
    cone(geos, sx, y + 0.7, sz, w * 0.9, 1.4, 8, WHITE);
    box(geos, sx, y + 1.6, sz, 0.5, 0.6, 0.5, RED); // finial
  };
  shikhar(x, z - 1, 5.2, true); // tall central shikhar
  shikhar(x - 4.5, z + 2, 3.2, false); // subsidiary
  shikhar(x + 4.5, z + 2, 3.2, false); // subsidiary
  // White toran gateway, west-facing (entrance onto Ansal Market Rd).
  box(geos, x - 9.5, 1 + 2, z, 0.8, 4, 0.8, WHITE);
  box(geos, x - 9.5, 1 + 2, z + 3, 0.8, 4, 0.8, WHITE);
  box(geos, x - 9.5, 1 + 4.4, z + 1.5, 0.9, 0.8, 4.6, WHITE);
  // Red flags on poles.
  for (const fz of [-2.5, 4]) {
    cyl(geos, x + 3, 1 + 9, z + fz, 0.06, 0.06, 4, 6, GREY);
    box(geos, x + 3.5, 1 + 10.4, z + fz, 1.0, 0.6, 0.08, RED);
  }
  const merged = mergeGeometries(geos, false);
  geos.forEach((g) => g.dispose());
  return { merged, collider: { minX: x - 10.5, maxX: x + 8, minZ: z - 6, maxZ: z + 6 } };
}

function buildMarketRow(rows) {
  // Active 'commercial-market' rows: 2-storey shop blocks with dark
  // hoarding band; grey/beige plaster per row.
  const geos = [];
  const colliders = [];
  const built = [];
  const actives = rows.filter((r) => r && r.module_hint === 'commercial-market' && r.status === 'active' && anchorOk(r));
  actives.forEach((row, i) => {
    const x = Number(row.game_x); const z = Number(row.game_z);
    const w = 10; const d = 8; const h = 7;
    const plaster = i % 2 === 0 ? SHOP_GREY : SHOP_BEIGE;
    box(geos, x, h / 2, z, w, h, d, plaster);
    box(geos, x, h + 0.15, z, w + 0.3, 0.3, d + 0.3, CONCRETE);
    box(geos, x, 4.6, z + d / 2 + 0.06, w * 0.94, 1.1, 0.12, HOARDING);
    colliders.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 });
    built.push(row.parcel_id);
  });
  if (geos.length === 0) return { merged: null, colliders, built };
  const merged = mergeGeometries(geos, false);
  geos.forEach((g) => g.dispose());
  return { merged, colliders, built };
}

// buildLandmarks(scene, catalogRows) -> { built: [ids], colliders: [...] }
export function buildLandmarks(scene, catalogRows) {
  const rows = Array.isArray(catalogRows) ? catalogRows : [];
  const built = [];
  const colliders = [];

  const addMesh = (merged, name) => {
    if (!merged) return;
    merged.computeBoundingSphere();
    const mesh = new THREE.Mesh(merged, new THREE.MeshLambertMaterial({ vertexColors: true }));
    mesh.name = name;
    mesh.receiveShadow = true;
    scene.add(mesh);
  };

  const tankRow = byId(rows, 'ANS-LMRK-001') ?? rows.find((r) => r?.module_hint === 'landmark-water-tank' && anchorOk(r));
  if (anchorOk(tankRow)) {
    const t = buildTank(tankRow);
    addMesh(t.merged, 'reboot:landmark-tank');
    colliders.push(t.collider);
    built.push(tankRow.parcel_id);
  }

  const templeRow = byId(rows, 'ANS-LMRK-002') ?? rows.find((r) => r?.module_hint === 'landmark-temple' && anchorOk(r));
  if (anchorOk(templeRow)) {
    const t = buildTemple(templeRow);
    addMesh(t.merged, 'reboot:landmark-temple');
    colliders.push(t.collider);
    built.push(templeRow.parcel_id);
  }

  const market = buildMarketRow(rows);
  addMesh(market.merged, 'reboot:landmark-market');
  colliders.push(...market.colliders);
  built.push(...market.built);

  return { built, colliders };
}
