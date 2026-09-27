/* Pedestrian pool: pure logic, no rendering, no RAF, no camera/input.
 * Emits plain {id, x, z, heading, speed} states so the caller can instance
 * shared geometries however it likes. Sidewalk wandering uses
 * RoadNetwork.nearest(mode walk) with side offsets; vehicles are queried
 * through an injected getNearbyVehicles fn. No DOM/window at module top
 * level so this imports cleanly under node --test.
 */

const DEFAULT_SPEED = 1.2;
const STEP_BACK_RADIUS = 3;
const DESPAWN_RADIUS = 150;

export class StreetLife {
  constructor({
    roadNetwork,
    getNearbyVehicles = null,
    cap = 14,
    maxPeds = null,
    wanderRadius = 24,
    despawnRadius = DESPAWN_RADIUS,
  } = {}) {
    if (!roadNetwork) throw new Error('StreetLife requires roadNetwork');
    this.roadNetwork = roadNetwork;
    this.getNearbyVehicles = getNearbyVehicles;
    this.cap = maxPeds ?? cap ?? 14;
    this.wanderRadius = wanderRadius;
    this.despawnRadius = despawnRadius;
    this.peds = [];
    this.serial = 0;
  }

  states() {
    return this.peds.map((p) => ({
      id: p.id,
      x: p.x,
      z: p.z,
      heading: p.heading,
      speed: p.speed,
    }));
  }

  targetFor(hourOfDay = 12) {
    const h = ((hourOfDay % 24) + 24) % 24;
    if (h >= 0 && h < 5) return Math.min(this.cap, 4); // quiet nights
    if (h >= 22 || h < 6) return Math.min(this.cap, 6);
    return this.cap;
  }

  sidewalkPoint(near) {
    const hit = this.roadNetwork.nearest(near, { mode: 'walk' });
    if (!hit) return null;
    const side = Math.random() < 0.5 ? 1 : -1;
    const off = hit.width / 2 + 1 + Math.random();
    return {
      x: hit.point.x - hit.tangent.z * off * side,
      z: hit.point.z + hit.tangent.x * off * side,
    };
  }

  spawnNear(playerPosition) {
    const jitter = () => (Math.random() - 0.5) * 60;
    const near = { x: playerPosition.x + jitter(), z: playerPosition.z + jitter() };
    const spot = this.sidewalkPoint(near) ?? this.sidewalkPoint(playerPosition);
    if (!spot) return null;
    const ped = {
      id: `ped:${++this.serial}`,
      x: spot.x,
      z: spot.z,
      heading: Math.random() * Math.PI * 2,
      speed: 0,
      cruise: 0.9 + Math.random() * 0.6,
      tx: spot.x,
      tz: spot.z,
      hold: 0,
    };
    this.retarget(ped);
    this.peds.push(ped);
    return ped;
  }

  retarget(ped) {
    const hit = this.roadNetwork.nearest({ x: ped.x, z: ped.z }, { mode: 'walk' });
    if (!hit) {
      ped.tx = ped.x + (Math.random() - 0.5) * 20;
      ped.tz = ped.z + (Math.random() - 0.5) * 20;
      return;
    }
    const along = (Math.random() - 0.5) * 2 * this.wanderRadius;
    const side = (Math.random() < 0.5 ? 1 : -1) * (hit.width / 2 + 1 + Math.random() * 1.5);
    ped.tx = hit.point.x + hit.tangent.x * along - hit.tangent.z * side;
    ped.tz = hit.point.z + hit.tangent.z * along + hit.tangent.x * side;
  }

  queryVehicles(x, z, r) {
    const fn = this.getNearbyVehicles;
    if (typeof fn !== 'function') return [];
    try {
      const out = fn.length >= 3 ? fn(x, z, r) : fn({ x, z }, r);
      return out ?? [];
    } catch {
      try {
        return fn({ x, z }, r) ?? [];
      } catch {
        return [];
      }
    }
  }

  update(dt, playerPosition, hourOfDay = 12) {
    if (!playerPosition) return this.states();
    const step = Math.max(0, dt);
    const target = this.targetFor(hourOfDay);
    // Grow toward target (a few per tick to avoid bursts), never above cap.
    let budget = 4;
    while (this.peds.length < Math.min(target, this.cap) && budget-- > 0) {
      if (!this.spawnNear(playerPosition)) break;
    }
    for (let i = this.peds.length - 1; i >= 0; i--) {
      const ped = this.peds[i];
      if (Math.hypot(ped.x - playerPosition.x, ped.z - playerPosition.z) > this.despawnRadius) {
        this.peds.splice(i, 1);
        continue;
      }
      // Step-back reaction: freeze when a dynamic vehicle is within 3m.
      const near = this.queryVehicles(ped.x, ped.z, STEP_BACK_RADIUS);
      if (near.length > 0) {
        ped.speed = 0;
        ped.hold = 0.6;
        continue;
      }
      if (ped.hold > 0) {
        ped.hold -= step;
        ped.speed = 0;
        if (ped.hold > 0) continue;
      }
      const dx = ped.tx - ped.x;
      const dz = ped.tz - ped.z;
      const d = Math.hypot(dx, dz);
      if (d < 0.6) {
        this.retarget(ped);
        ped.speed = 0;
        continue;
      }
      ped.heading = Math.atan2(dx, dz);
      ped.speed = ped.cruise;
      const advance = Math.min(d, ped.cruise * step);
      ped.x += (dx / d) * advance;
      ped.z += (dz / d) * advance;
    }
    // Enforce hard cap (drop farthest first).
    while (this.peds.length > this.cap) {
      let worst = 0;
      let worstD = -1;
      for (let i = 0; i < this.peds.length; i++) {
        const d = Math.hypot(this.peds[i].x - playerPosition.x, this.peds[i].z - playerPosition.z);
        if (d > worstD) {
          worstD = d;
          worst = i;
        }
      }
      this.peds.splice(worst, 1);
    }
    return this.states();
  }

  destroy() {
    this.peds.length = 0;
  }
}
