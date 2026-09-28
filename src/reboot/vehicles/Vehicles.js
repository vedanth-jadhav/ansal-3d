/* three.js glue + vehicle manager. ONLY file in this folder that imports three.
 * Pure rules live in ./CarPhysics.js, ./Damage.js, ./TrafficLive.js (no three).
 * Forbidden: imports from ../world, ../gameplay, ../recovered — self-contained.
 */
import * as THREE from "three";
import { step } from "./CarPhysics.js";
import { createDamage, addImpact, damageAmount, isSmoking } from "./Damage.js";
import { TrafficLive } from "./TrafficLive.js";

export const CAR_RADIUS = 1.2; // collision circle radius (m)
export const ENTER_RADIUS = 3; // default max enter distance (m)

const KINDS = {
  hatchback: { w: 1.7, h: 1.25, l: 3.6, color: 0x3a7bd5 },
  sedan: { w: 1.8, h: 1.3, l: 4.4, color: 0xb8bcc2 },
  van: { w: 1.95, h: 1.9, l: 4.7, color: 0xd97b2e },
  bike: { w: 0.55, h: 0.9, l: 2.0, color: 0x2a2d34 },
};

// Module-level caches: every car reuses these, so per-car cost is trivial.
// Each car uses exactly 3 shared materials: paint(kind, cached) + glass + tire.
const _geoCache = new Map();
const _paintCache = new Map();
let _glassMat = null;
let _tireMat = null;

function boxGeo(w, h, l) {
  const k = `${w}|${h}|${l}`;
  if (!_geoCache.has(k)) _geoCache.set(k, new THREE.BoxGeometry(w, h, l));
  return _geoCache.get(k);
}

function paintMat(kind) {
  if (!_paintCache.has(kind)) {
    const spec = KINDS[kind] ?? KINDS.sedan;
    _paintCache.set(kind, new THREE.MeshLambertMaterial({ color: spec.color }));
  }
  return _paintCache.get(kind);
}

function glassMat() {
  if (!_glassMat) _glassMat = new THREE.MeshLambertMaterial({ color: 0x10151c });
  return _glassMat;
}

function tireMat() {
  if (!_tireMat) _tireMat = new THREE.MeshLambertMaterial({ color: 0x0a0a0c });
  return _tireMat;
}

/* Stylized low-poly car from boxes. Local +z is forward (rotation.y = heading
 * maps +z to world (sin h, cos h), matching the physics convention). */
export function buildCarMesh(kind = "sedan") {
  const spec = KINDS[kind] ?? KINDS.sedan;
  const g = new THREE.Group();
  const paint = paintMat(KINDS[kind] ? kind : "sedan");
  const glass = glassMat();
  const tire = tireMat();

  const wheelR = kind === "bike" ? 0.32 : 0.34;
  const body = new THREE.Mesh(boxGeo(spec.w, spec.h * 0.55, spec.l), paint);
  body.position.y = wheelR + spec.h * 0.275;
  g.add(body);

  if (kind !== "bike") {
    const cab = new THREE.Mesh(boxGeo(spec.w * 0.82, spec.h * 0.45, spec.l * 0.45), glass);
    cab.position.set(0, wheelR + spec.h * 0.55 + spec.h * 0.225, -spec.l * 0.05);
    g.add(cab);
  } else {
    const rider = new THREE.Mesh(boxGeo(spec.w * 0.9, spec.h * 0.5, spec.l * 0.25), glass);
    rider.position.set(0, wheelR + spec.h * 0.55 + spec.h * 0.25, -spec.l * 0.1);
    g.add(rider);
  }

  const ww = kind === "bike" ? spec.w * 0.5 : 0.28;
  const wl = kind === "bike" ? 0.5 : 0.6;
  const wheelGeo = boxGeo(kind === "bike" ? ww : ww, wheelR * 2, wl);
  const xs = kind === "bike" ? [0] : [-spec.w / 2, spec.w / 2];
  const zs = kind === "bike" ? [-spec.l * 0.32, spec.l * 0.32] : [-spec.l * 0.32, spec.l * 0.32];
  for (const x of xs) {
    for (const z of zs) {
      const w = new THREE.Mesh(wheelGeo, tire);
      w.position.set(x, wheelR, z);
      g.add(w);
    }
  }
  g.userData.kind = kind;
  return g;
}

/* Adapt any road graph (RoadNetwork shape or TrafficLive shape or null)
 * to the { nearest(x,z) -> {x,z,dirX,dirZ,width,drive} } contract. */
function adaptGraph(graph) {
  if (!graph || typeof graph.nearest !== "function") return null;
  return {
    nearest(x, z) {
      let hit = null;
      try {
        hit = graph.nearest({ x, z }, { mode: "drive", maxDistance: 60 });
      } catch {
        hit = null;
      }
      if (!hit) {
        try {
          hit = graph.nearest(x, z);
        } catch {
          hit = null;
        }
      }
      if (!hit) return null;
      if (typeof hit.x === "number" && typeof hit.z === "number" && !hit.point) {
        return {
          x: hit.x,
          z: hit.z,
          dirX: hit.dirX ?? 0,
          dirZ: hit.dirZ ?? 1,
          width: hit.width ?? 6,
          drive: hit.drive ?? true,
        };
      }
      if (hit.point) {
        const t = hit.tangent || { x: 0, z: 1 };
        const len = Math.hypot(t.x, t.z) || 1;
        const drive = hit.drive ?? hit.segment?.drive ?? true;
        if (drive === false) return null;
        return {
          x: hit.point.x,
          z: hit.point.z,
          dirX: t.x / len,
          dirZ: t.z / len,
          width: hit.width ?? 6,
          drive: true,
        };
      }
      return null;
    },
  };
}

/* Normalize one collider to an AABB { minX, maxX, minZ, maxZ } or null.
 * Accepts {minX,maxX,minZ,maxZ}, {x,z,hx,hz}, {x,z,hw,hd}, {x,z,r}. */
function toBox(c) {
  if (!c) return null;
  if (typeof c.minX === "number") return c;
  if (typeof c.x === "number" && typeof c.z === "number") {
    if (typeof c.r === "number") return { minX: c.x - c.r, maxX: c.x + c.r, minZ: c.z - c.r, maxZ: c.z + c.r };
    const hx = c.hx ?? c.hw ?? c.half ?? 1;
    const hz = c.hz ?? c.hd ?? c.half ?? 1;
    return { minX: c.x - hx, maxX: c.x + hx, minZ: c.z - hz, maxZ: c.z + hz };
  }
  return null;
}

/* Circle (x,z,r) vs AABB. Returns push-out { nx, nz, depth } or null. */
function circleVsBox(x, z, r, b) {
  const cx = Math.min(Math.max(x, b.minX), b.maxX);
  const cz = Math.min(Math.max(z, b.minZ), b.maxZ);
  let dx = x - cx;
  let dz = z - cz;
  let d = Math.hypot(dx, dz);
  if (d >= r) return null;
  if (d < 1e-6) {
    // Center inside the box: push out along the smallest penetration axis.
    const pl = x - b.minX;
    const pr = b.maxX - x;
    const pt = z - b.minZ;
    const pb = b.maxZ - z;
    const m = Math.min(pl, pr, pt, pb);
    if (m === pl) return { nx: -1, nz: 0, depth: pl + r };
    if (m === pr) return { nx: 1, nz: 0, depth: pr + r };
    if (m === pt) return { nx: 0, nz: -1, depth: pt + r };
    return { nx: 0, nz: 1, depth: pb + r };
  }
  dx /= d;
  dz /= d;
  return { nx: dx, nz: dz, depth: r - d };
}

/* initVehicles({ scene, graph, colliders }) -> handle.
 * scene: THREE.Scene (or any { add, remove }). graph: road graph or null.
 * colliders: array of plain boxes/circles (see toBox). */
export function initVehicles({ scene = null, graph = null, colliders = [] } = {}) {
  const boxes = (Array.isArray(colliders) ? colliders : []).map(toBox).filter(Boolean);
  const cars = new Map(); // id -> { id, kind, mesh, state, damage, parked }
  const trafficMeshes = new Map(); // traffic id -> mesh
  let nextId = 1;
  let activeId = null;

  const traffic = new TrafficLive({
    graph: adaptGraph(graph),
    sync(id, pose) {
      let m = trafficMeshes.get(id);
      if (!m) {
        const kinds = ["sedan", "hatchback", "van"];
        m = buildCarMesh(kinds[id % kinds.length]);
        trafficMeshes.set(id, m);
        scene?.add?.(m);
      }
      m.position.set(pose.x, 0, pose.z);
      m.rotation.y = pose.heading;
    },
  });

  function placeMesh(rec) {
    rec.mesh.position.set(rec.state.x, 0, rec.state.z);
    rec.mesh.rotation.y = rec.state.heading;
  }

  function spawnParked(kind, x, z, heading = 0) {
    const k = KINDS[kind] ? kind : "sedan";
    const mesh = buildCarMesh(k);
    const rec = {
      id: nextId++,
      kind: k,
      mesh,
      state: { x, z, heading, speed: 0 },
      damage: createDamage(),
      parked: true,
    };
    placeMesh(rec);
    cars.set(rec.id, rec);
    scene?.add?.(mesh);
    return rec.id;
  }

  function nearestEnterable(x, z, maxD = ENTER_RADIUS) {
    let best = null;
    let bestD = maxD;
    for (const rec of cars.values()) {
      if (rec.id === activeId) continue;
      const d = Math.hypot(rec.state.x - x, rec.state.z - z);
      if (d <= bestD) {
        bestD = d;
        best = rec.id;
      }
    }
    return best;
  }

  function enter(id) {
    if (!cars.has(id)) return false;
    activeId = id;
    cars.get(id).parked = false;
    return true;
  }

  function exit() {
    if (activeId == null) return false;
    const rec = cars.get(activeId);
    if (rec) {
      rec.state.speed = 0;
      rec.parked = true;
    }
    activeId = null;
    return true;
  }

  function active() {
    return activeId == null ? null : (cars.get(activeId) ?? null);
  }

  function collideCar(rec) {
    const s = rec.state;
    for (const b of boxes) {
      const hit = circleVsBox(s.x, s.z, CAR_RADIUS, b);
      if (!hit) continue;
      const impact = Math.abs(s.speed);
      if (impact >= 3) addImpact(rec.damage, impact);
      s.x += hit.nx * (hit.depth + 0.01);
      s.z += hit.nz * (hit.depth + 0.01);
      s.speed = 0; // stop dead on impact
      return true;
    }
    return false;
  }

  function update(dt, input = {}, playerPos = null) {
    const h = Math.min(Math.max(dt, 0), 0.1);
    const rec = active();
    const anchor = rec ? rec.state : (playerPos ?? { x: 0, z: 0 });
    if (rec) {
      const next = step(rec.state, input, h, { damage: damageAmount(rec.damage) });
      rec.state.x = next.x;
      rec.state.z = next.z;
      rec.state.heading = next.heading;
      rec.state.speed = next.speed;
      collideCar(rec);
      placeMesh(rec);
      rec.mesh.userData.smoking = isSmoking(rec.damage);
    }
    traffic.update(h, { x: anchor.x ?? 0, z: anchor.z ?? 0, heading: anchor.heading ?? 0 });
    // Reconcile traffic meshes: drop meshes for despawned ids.
    const alive = new Set(traffic.list().map((c) => c.id));
    for (const [id, m] of trafficMeshes) {
      if (!alive.has(id)) {
        scene?.remove?.(m);
        trafficMeshes.delete(id);
      }
    }
  }

  function list() {
    return [...cars.values()];
  }

  function trafficStates() {
    return traffic.states();
  }

  function dispose() {
    for (const rec of cars.values()) scene?.remove?.(rec.mesh);
    for (const m of trafficMeshes.values()) scene?.remove?.(m);
    cars.clear();
    trafficMeshes.clear();
    activeId = null;
  }

  return {
    spawnParked,
    nearestEnterable,
    enter,
    exit,
    active,
    update,
    list,
    trafficStates,
    dispose,
    buildCarMesh,
    traffic,
  };
}
