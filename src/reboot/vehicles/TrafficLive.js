/* Ambient traffic: pure logic, injected deps only. No three.js, no world imports.
 *
 * graph contract (all optional — defensive):
 *   graph.nearest(x, z) -> { x, z, dirX, dirZ, width, drive } (road snap) OR
 *   graph.nearest({x, z}, opts?) -> { point:{x,z}, tangent:{x,z}, width, drive }
 *     (RoadNetwork shape — normalized internally)
 *   graph.segments: [{ ax, az, bx, bz, width, drive }] (unused if nearest exists)
 *
 * If graph is null (or yields nothing) cars cruise straight lines and despawn.
 * Mesh sync is injected: sync(id, { x, z, heading }) each tick; pass null for headless.
 */

export const TRAFFIC_COUNT = 8;
export const DESPAWN_RADIUS = 280; // m from player
export const SPAWN_MIN = 40;
export const SPAWN_MAX = 220;
export const YIELD_DIST = 10; // slow if a car is ahead within this range
export const STOP_DIST = 3; // full stop below this gap

const TAU = Math.PI * 2;

function makeRand(seed) {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

/* Normalize any graph hit to { x, z, dirX, dirZ, width } or null. */
function normalizeHit(hit) {
  if (!hit) return null;
  if (hit.point) {
    const t = hit.tangent || hit.dir || { x: 0, z: 1 };
    const len = Math.hypot(t.x, t.z) || 1;
    return {
      x: hit.point.x,
      z: hit.point.z,
      dirX: t.x / len,
      dirZ: t.z / len,
      width: hit.width ?? 6,
      drive: hit.drive ?? hit.segment?.drive ?? true,
    };
  }
  if (typeof hit.x === "number" && typeof hit.z === "number") {
    const len = Math.hypot(hit.dirX ?? 0, hit.dirZ ?? 1) || 1;
    return {
      x: hit.x,
      z: hit.z,
      dirX: (hit.dirX ?? 0) / len,
      dirZ: (hit.dirZ ?? 1) / len,
      width: hit.width ?? 6,
      drive: hit.drive ?? true,
    };
  }
  return null;
}

function queryGraph(graph, x, z) {
  if (!graph || typeof graph.nearest !== "function") return null;
  // Try (x, z) shape first, then ({x,z}) shape.
  for (const attempt of [
    () => graph.nearest(x, z),
    () => graph.nearest({ x, z }),
    () => graph.nearest({ x, z }, { mode: "drive", maxDistance: 60 }),
  ]) {
    try {
      const n = normalizeHit(attempt());
      if (n && n.drive !== false) return n;
    } catch {
      /* try next shape */
    }
  }
  return null;
}

export class TrafficLive {
  constructor({ graph = null, count = TRAFFIC_COUNT, sync = null, rand = null } = {}) {
    this.graph = graph;
    this.count = count;
    this.sync = typeof sync === "function" ? sync : null;
    this.rand = typeof rand === "function" ? rand : Math.random;
    this.cars = [];
    this._nextId = 1;
    this._seeded = false;
  }

  list() {
    return this.cars;
  }

  /* Plain { id, x, z, heading, speed } snapshots for tests/telemetry. */
  states() {
    return this.cars.map((c) => ({ id: c.id, x: c.x, z: c.z, heading: c.heading, speed: c.speed }));
  }

  _cruise() {
    return 8 + this.rand() * 3; // 8..11 m/s
  }

  _spawnCar(player) {
    const px = player?.x ?? 0;
    const pz = player?.z ?? 0;
    const id = this._nextId++;
    // Random point in an annulus ahead-biased around the player.
    const baseAngle = player?.heading ?? this.rand() * TAU;
    for (let tries = 0; tries < 12; tries++) {
      const ang = baseAngle + (this.rand() - 0.5) * Math.PI * 1.5;
      const dist = SPAWN_MIN + this.rand() * (SPAWN_MAX - SPAWN_MIN);
      const cx = px + Math.sin(ang) * dist;
      const cz = pz + Math.cos(ang) * dist;
      const hit = queryGraph(this.graph, cx, cz);
      if (hit) {
        // Right-hand lane: offset width/4 to the right of travel.
        // Right of forward (dx,dz) with y-up is (-dz, dx).
        const off = (hit.width ?? 6) / 4;
        const heading = Math.atan2(hit.dirX, hit.dirZ);
        return {
          id,
          x: hit.x + -hit.dirZ * off,
          z: hit.z + hit.dirX * off,
          heading,
          speed: this._cruise() * 0.6,
          cruise: this._cruise(),
        };
      }
    }
    // Fallback: straight-line cruiser (null graph or no roads nearby).
    const ang = this.rand() * TAU;
    const dist = SPAWN_MIN + this.rand() * (SPAWN_MAX - SPAWN_MIN);
    const heading = this.rand() * TAU;
    void ang;
    return {
      id,
      x: px + Math.sin(heading) * 0 + (this.rand() - 0.5) * 2 * dist * 0.7,
      z: pz + (this.rand() - 0.5) * 2 * dist * 0.7,
      heading,
      speed: this._cruise() * 0.6,
      cruise: this._cruise(),
    };
  }

  _ensureSeeded(player) {
    while (this.cars.length < this.count) this.cars.push(this._spawnCar(player));
    this._seeded = true;
  }

  update(dt, playerPos = { x: 0, z: 0 }) {
    const h = Math.min(Math.max(dt, 0), 0.1);
    if (!this._seeded) this._ensureSeeded(playerPos);
    const px = playerPos?.x ?? 0;
    const pz = playerPos?.z ?? 0;

    // Despawn beyond radius -> respawn ahead of the player.
    for (let i = 0; i < this.cars.length; i++) {
      const c = this.cars[i];
      if (Math.hypot(c.x - px, c.z - pz) > DESPAWN_RADIUS) {
        this.cars[i] = this._spawnCar(playerPos);
      }
    }
    // Top up if count grew or cars were removed externally.
    while (this.cars.length < this.count) this.cars.push(this._spawnCar(playerPos));

    // Yield: slow when another car is ahead within YIELD_DIST.
    for (const c of this.cars) {
      const fx = Math.sin(c.heading);
      const fz = Math.cos(c.heading);
      let gap = Infinity;
      let aheadSpeed = c.cruise;
      for (const o of this.cars) {
        if (o === c) continue;
        const dx = o.x - c.x;
        const dz = o.z - c.z;
        const dist = Math.hypot(dx, dz);
        if (dist > YIELD_DIST || dist < 1e-6) continue;
        const along = (dx * fx + dz * fz) / dist; // 1 = dead ahead
        if (along > 0.7 && dist < gap) {
          gap = dist;
          aheadSpeed = o.speed;
        }
      }
      let target = c.cruise;
      if (gap <= STOP_DIST) target = 0;
      else if (gap <= YIELD_DIST) target = Math.min(c.cruise, aheadSpeed * ((gap - STOP_DIST) / (YIELD_DIST - STOP_DIST)));
      const rate = target < c.speed ? 6 : 3; // brake harder than accelerate
      const dv = rate * h;
      c.speed = Math.abs(target - c.speed) <= dv ? target : c.speed + Math.sign(target - c.speed) * dv;

      // Steer toward the road direction when a graph is present.
      const hit = queryGraph(this.graph, c.x, c.z);
      if (hit) {
        const roadHeading = Math.atan2(hit.dirX, hit.dirZ);
        let d = roadHeading - c.heading;
        while (d > Math.PI) d -= TAU;
        while (d < -Math.PI) d += TAU;
        // Follow the road only when roughly aligned (either flow direction);
        // oncoming-lane snaps would U-turn cars, so ignore large deltas.
        const aligned = Math.abs(d) < Math.PI / 2.5;
        if (aligned) {
          c.heading += d * Math.min(1, 2.5 * h);
          // Ease back toward the right-hand lane line.
          const off = (hit.width ?? 6) / 4;
          const lx = hit.x + -hit.dirZ * off;
          const lz = hit.z + hit.dirX * off;
          c.x += (lx - c.x) * Math.min(1, 1.5 * h);
          c.z += (lz - c.z) * Math.min(1, 1.5 * h);
        }
      }

      c.x += Math.sin(c.heading) * c.speed * h;
      c.z += Math.cos(c.heading) * c.speed * h;

      if (this.sync) {
        try {
          this.sync(c.id, { x: c.x, z: c.z, heading: c.heading });
        } catch {
          /* sync must never break simulation */
        }
      }
    }
    return this.cars;
  }

  setSync(fn) {
    this.sync = typeof fn === "function" ? fn : null;
  }

  static __testonly = { normalizeHit, queryGraph, makeRand };
}
