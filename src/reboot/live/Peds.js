import * as THREE from 'three';

// Pedestrian pool (cap 12). Brain is pure {id,x,z,heading,speed}; three.js
// capsule meshes are synced from the brain in update(). Self-contained:
// no imports from ../world, ../gameplay, ../ambient or ../recovered.

export const PED_CAP = 12;
export const PED_NIGHT_COUNT = 4;
const WALK_MIN = 0.9;
const WALK_MAX = 1.6;
const SIDE_OFFSET = 2.6; // sidewalk offset from road centre, metres
const REACH_R = 1.6;
const STEP_BACK_R = 3; // freeze radius around vehicles
const STEP_BACK_SPEED = 0.6; // slower than walk so tests can tell them apart
const RESPAWN_R = 130; // teleport wanderers that fall this far behind player

function rand(a, b) {
  return a + Math.random() * (b - a);
}

export function readHour(clock) {
  try {
    if (clock == null) return 12;
    if (typeof clock === 'number' && Number.isFinite(clock)) return clock;
    if (typeof clock === 'function') {
      const v = Number(clock());
      return Number.isFinite(v) ? v : 12;
    }
    if (typeof clock === 'object') {
      if (typeof clock.hour === 'number' && Number.isFinite(clock.hour)) return clock.hour;
      if (typeof clock.hours === 'number' && Number.isFinite(clock.hours)) return clock.hours;
      if (typeof clock.getHour === 'function') {
        const v = Number(clock.getHour());
        return Number.isFinite(v) ? v : 12;
      }
    }
  } catch { /* fall through to default */ }
  return 12;
}

// Density by clock hour: quiet streets 0-5h, full pool otherwise.
export function densityForHour(h) {
  const hh = ((Number(h) || 0) % 24 + 24) % 24;
  return hh >= 0 && hh < 6 ? PED_NIGHT_COUNT : PED_CAP;
}

// Normalise the injected vehicles argument into [{x,z,d}] within r of (x,z).
// Accepts: fn(x,z,r)->arr | arr of {x,z} | {getVehicles(x,z,r)} | anything->[].
function listNear(vehicles, x, z, r) {
  try {
    let arr = [];
    if (typeof vehicles === 'function') arr = vehicles(x, z, r) ?? [];
    else if (Array.isArray(vehicles)) arr = vehicles;
    else if (vehicles && typeof vehicles.getVehicles === 'function') {
      arr = vehicles.getVehicles(x, z, r) ?? [];
    } else return [];
    const out = [];
    for (const v of arr) {
      const p = v && v.position ? v.position : v;
      if (!p) continue;
      const vx = Number(p.x);
      const vz = Number(p.z ?? p.y); // tolerate {x,y} fakes
      if (!Number.isFinite(vx) || !Number.isFinite(vz)) continue;
      const d = Math.hypot(vx - x, vz - z);
      if (d <= r) out.push({ x: vx, z: vz, d });
    }
    out.sort((a, b) => a.d - b.d);
    return out;
  } catch {
    return [];
  }
}

export function initPeds({ scene = null, graph = null, clock = null } = {}) {
  const hasGraph = graph && typeof graph.nearest === 'function';

  // Shared three.js assets: one capsule geometry, 3 shared materials.
  const geo = new THREE.CapsuleGeometry(0.28, 1.0, 3, 10);
  const mats = [
    new THREE.MeshLambertMaterial({ color: 0x3f6fb5 }),
    new THREE.MeshLambertMaterial({ color: 0xb5533c }),
    new THREE.MeshLambertMaterial({ color: 0x4da06a }),
  ];

  function pickTarget(px, pz, side) {
    if (hasGraph) {
      try {
        const qx = px + rand(-45, 45);
        const qz = pz + rand(-45, 45);
        const n = graph.nearest(qx, qz);
        if (n && Number.isFinite(Number(n.x)) && Number.isFinite(Number(n.z))) {
          let ox = 0;
          let oz = 0;
          const dx = Number(n.dirX) || 0;
          const dz = Number(n.dirZ) || 0;
          const len = Math.hypot(dx, dz);
          if (len > 1e-6) {
            ox = (-dz / len) * SIDE_OFFSET * side; // perpendicular = sidewalk
            oz = (dx / len) * SIDE_OFFSET * side;
          }
          return { x: Number(n.x) + ox, z: Number(n.z) + oz };
        }
      } catch { /* fall through to fallback wander */ }
    }
    // Defensive fallback: wander around the given point (graph null-safe).
    const a = rand(0, Math.PI * 2);
    const r = rand(8, 30);
    return { x: px + Math.cos(a) * r, z: pz + Math.sin(a) * r };
  }

  const peds = [];
  for (let i = 0; i < PED_CAP; i++) {
    const side = i % 2 === 0 ? 1 : -1;
    const a = (i / PED_CAP) * Math.PI * 2;
    const x = Math.cos(a) * rand(5, 25);
    const z = Math.sin(a) * rand(5, 25);
    const target = pickTarget(x, z, side);
    const speed = rand(WALK_MIN, WALK_MAX);
    const mesh = new THREE.Mesh(geo, mats[i % mats.length]);
    mesh.position.set(x, 1.0, z);
    const heading = Math.atan2(target.x - x, target.z - z);
    mesh.rotation.y = heading;
    try {
      scene?.add?.(mesh);
    } catch { /* scene is optional */ }
    peds.push({
      id: i, x, z, heading, speed, side, target,
      frozen: false, active: true, mesh,
    });
  }

  function playerXZ(playerPos) {
    try {
      const p = playerPos && playerPos.position ? playerPos.position : playerPos;
      if (!p) return null;
      const x = Number(p.x);
      const z = Number(p.z ?? p.y);
      if (!Number.isFinite(x) || !Number.isFinite(z)) return null;
      return { x, z };
    } catch {
      return null;
    }
  }

  function update(dt, playerPos = null, vehicles = null) {
    const step = Math.min(Math.max(Number(dt) || 0, 0), 1);
    if (step <= 0) return;
    const want = densityForHour(readHour(clock));
    const pp = playerXZ(playerPos);
    for (let i = 0; i < peds.length; i++) {
      const p = peds[i];
      p.active = i < want;
      try {
        if (p.mesh) p.mesh.visible = p.active;
      } catch { /* ignore */ }
      if (!p.active) continue;
      // Respawns: keep the crowd near the player.
      if (pp) {
        const far = Math.hypot(p.x - pp.x, p.z - pp.z);
        if (far > RESPAWN_R) {
          const t = pickTarget(pp.x + rand(-30, 30), pp.z + rand(-30, 30), p.side);
          p.x = t.x;
          p.z = t.z;
          p.target = pickTarget(p.x, p.z, p.side);
          p.frozen = false;
        }
      }
      // Step-back freeze near vehicles.
      const near = listNear(vehicles, p.x, p.z, STEP_BACK_R);
      if (near.length > 0) {
        p.frozen = true;
        const v = near[0];
        let ax = p.x - v.x;
        let az = p.z - v.z;
        const len = Math.hypot(ax, az);
        if (len > 1e-6) {
          ax /= len;
          az /= len;
        } else {
          ax = Math.cos(p.heading + Math.PI);
          az = Math.sin(p.heading + Math.PI);
        }
        p.x += ax * STEP_BACK_SPEED * step;
        p.z += az * STEP_BACK_SPEED * step;
        p.heading = Math.atan2(ax, az);
      } else {
        p.frozen = false;
        let dx = p.target.x - p.x;
        let dz = p.target.z - p.z;
        const dist = Math.hypot(dx, dz);
        if (dist <= REACH_R) {
          p.target = pickTarget(p.x, p.z, p.side);
          dx = p.target.x - p.x;
          dz = p.target.z - p.z;
        }
        const len = Math.hypot(dx, dz);
        if (len > 1e-6) {
          p.heading = Math.atan2(dx / len, dz / len);
          p.x += (dx / len) * p.speed * step;
          p.z += (dz / len) * p.speed * step;
        }
      }
      try {
        if (p.mesh) {
          p.mesh.position.set(p.x, 1.0, p.z);
          p.mesh.rotation.y = p.heading;
        }
      } catch { /* ignore mesh sync failures */ }
    }
  }

  // Pure brain snapshot of active peds (meshes excluded).
  function states() {
    return peds
      .filter((p) => p.active)
      .map((p) => ({
        id: p.id, x: p.x, z: p.z, heading: p.heading, speed: p.speed,
        frozen: p.frozen,
      }));
  }

  return { update, states };
}
