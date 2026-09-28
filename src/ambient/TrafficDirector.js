/* Ambient traffic brain: pure logic, no rendering, no RAF, no camera/input.
 * Consumes a VehicleRegistry-like handle {spawnParked, remove, queryNearby}
 * injected as a constructor dependency (never imported directly).
 * All DOM/window access (none needed) would live in init/update only, so this
 * module imports cleanly under node --test.
 */

const LANE_OFFSET = {
  motorway: 2.2,
  trunk: 2.0,
  primary: 1.8,
  secondary: 1.6,
  tertiary: 1.2,
  residential: 0.9,
  unclassified: 0.8,
  service: 0.8,
};

const CRUISE_SPEED = {
  motorway: 16,
  trunk: 14,
  primary: 12,
  secondary: 10,
  tertiary: 8,
  residential: 6,
  unclassified: 5,
  service: 4,
};

export function laneOffsetFor(kind) {
  return LANE_OFFSET[kind] ?? 0.9;
}

export function cruiseSpeedFor(kind) {
  return CRUISE_SPEED[kind] ?? 7;
}

/* Density curve 0..1 by hour of day. Rush peaks ~8-10 and ~17-20, quiet 0-5. */
export function densityForHour(hour) {
  const h = ((hour % 24) + 24) % 24;
  if (h < 5) return 0.15;
  if (h < 6) return 0.25;
  if (h < 8) return 0.4 + ((h - 6) / 2) * 0.35; // 0.40 -> 0.75 ramp into morning rush
  if (h < 10) return 1.0;
  if (h < 11) return 0.8;
  if (h < 16) return 0.6;
  if (h < 17) return 0.8;
  if (h < 20) return 1.0 - ((h - 17) / 3) * 0.05; // 1.00 -> 0.95 evening rush
  if (h < 22) return 0.5;
  if (h < 24) return 0.3;
  return 0.15;
}

const dist2d = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

export class TrafficDirector {
  constructor({
    roadNetwork,
    vehicles = null,
    registry = null,
    maxVehicles = 12,
    cullDistance = 260,
    spawnRadius = 260,
    yieldGap = 6,
    junctionGap = 12,
    excludeIds = null,
  } = {}) {
    if (!roadNetwork) throw new Error('TrafficDirector requires roadNetwork');
    const store = vehicles ?? registry;
    if (!store) throw new Error('TrafficDirector requires a vehicles handle {spawnParked, remove, queryNearby}');
    this.roadNetwork = roadNetwork;
    this.vehicles = store;
    this.maxVehicles = maxVehicles;
    this.cullDistance = cullDistance;
    this.spawnRadius = spawnRadius;
    this.yieldGap = yieldGap;
    this.junctionGap = junctionGap;
    this.excludeIds = excludeIds instanceof Set ? excludeIds : new Set(excludeIds ?? []);
    this.managed = new Map(); // id -> {segmentId, t, dir, speed, kind}
    this.serial = 0;
  }

  targetCountFor(hourOfDay) {
    return Math.max(0, Math.round(this.maxVehicles * densityForHour(hourOfDay)));
  }

  densityFor(hourOfDay) {
    return densityForHour(hourOfDay);
  }

  getStates() {
    const out = [];
    for (const [id, v] of this.managed) {
      const pos = this.poseFor(v);
      if (pos) out.push({ id, x: pos.x, z: pos.z, heading: pos.heading, speed: v.speed, kind: v.kind });
    }
    return out;
  }

  poseFor(v) {
    const seg = this.roadNetwork.segments.find((s) => s.id === v.segmentId);
    if (!seg) return null;
    const dx = seg.b.x - seg.a.x;
    const dz = seg.b.z - seg.a.z;
    const len = seg.len || 1;
    const nx = -dz / len;
    const nz = dx / len;
    const off = laneOffsetFor(seg.kind) * v.dir;
    const x = seg.a.x + dx * v.t + nx * off;
    const z = seg.a.z + dz * v.t + nz * off;
    const heading = Math.atan2(dx * v.dir, dz * v.dir);
    return { x, z, heading };
  }

  pickSegmentNear(playerPosition) {
    const cands = this.roadNetwork.segments.filter((s) => s.drive !== false);
    if (!cands.length) return null;
    const inRange = cands.filter((s) => {
      const mid = { x: (s.a.x + s.b.x) / 2, z: (s.a.z + s.b.z) / 2 };
      return dist2d(mid, playerPosition) <= this.spawnRadius;
    });
    const pool = inRange.length ? inRange : cands;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  spawnOne(playerPosition) {
    const seg = this.pickSegmentNear(playerPosition);
    if (!seg) return null;
    const dir = Math.random() < 0.5 ? 1 : -1;
    const record = {
      segmentId: seg.id,
      t: Math.random(),
      dir,
      speed: cruiseSpeedFor(seg.kind),
      kind: seg.kind,
    };
    const pose = this.poseFor(record);
    if (!pose) return null;
    const id = `traffic:${++this.serial}`;
    try {
      this.vehicles.spawnParked({
        kind: 'sedan',
        position: { x: pose.x, z: pose.z },
        heading: pose.heading,
        id,
      });
    } catch {
      return null;
    }
    this.managed.set(id, record);
    return id;
  }

  advanceVehicle(id, record, dt) {
    const seg = this.roadNetwork.segments.find((s) => s.id === record.segmentId);
    if (!seg) {
      this.removeVehicle(id);
      return;
    }
    // Junction yield: gap check ahead; larger gap near segment ends.
    const nearEnd = record.t < 0.12 || record.t > 0.88;
    const gap = nearEnd ? this.junctionGap : this.yieldGap;
    const pose = this.poseFor(record);
    if (pose) {
      const ahead = {
        x: pose.x + Math.sin(pose.heading) * gap,
        z: pose.z + Math.cos(pose.heading) * gap,
      };
      let blockers = [];
      try {
        blockers = this.vehicles.queryNearby(ahead, 3) ?? [];
      } catch {
        blockers = [];
      }
      if (blockers.some((b) => (b?.id ?? b?.object) !== id && b?.id !== id)) {
        // Yield: hold position this tick (gap occupied).
        return;
      }
    }
    const len = seg.len || 1;
    record.t += (record.dir * record.speed * dt) / len;
    if (record.t >= 1 || record.t <= 0) {
      const next = this.nextSegment(seg, record.dir);
      if (next) {
        record.segmentId = next.id;
        record.t = record.dir > 0 ? 0 : 1;
        record.speed = cruiseSpeedFor(next.kind);
        record.kind = next.kind;
      } else {
        // Dead end: turn around.
        record.dir *= -1;
        record.t = Math.min(1, Math.max(0, record.t));
      }
    }
    const p = this.poseFor(record);
    if (p) {
      const handle =
        typeof this.vehicles.get === 'function' ? this.vehicles.get(id) : null;
      if (handle?.setPose) {
        try {
          handle.setPose({ x: p.x, z: p.z }, p.heading);
        } catch {
          /* pose sync is best-effort */
        }
      }
    }
  }

  nextSegment(seg, dir) {
    const end = dir > 0 ? seg.b : seg.a;
    const cands = this.roadNetwork.segments.filter(
      (s) => s.id !== seg.id && s.drive !== false &&
        (Math.hypot(s.a.x - end.x, s.a.z - end.z) < 0.05 ||
          Math.hypot(s.b.x - end.x, s.b.z - end.z) < 0.05),
    );
    if (!cands.length) return null;
    return cands[Math.floor(Math.random() * cands.length)];
  }

  removeVehicle(id) {
    this.managed.delete(id);
    try {
      this.vehicles.remove(id);
    } catch {
      /* removal is best-effort */
    }
  }

  cullFar(playerPosition, extraExclude = null) {
    const excluded = new Set(this.excludeIds);
    if (extraExclude) for (const id of extraExclude) excluded.add(id);
    for (const [id, record] of [...this.managed]) {
      if (excluded.has(id)) continue;
      const pose = this.poseFor(record);
      if (!pose) {
        this.removeVehicle(id);
        continue;
      }
      if (dist2d(pose, playerPosition) > this.cullDistance) this.removeVehicle(id);
    }
  }

  update(dt, playerPosition, hourOfDay = 12, excludeIds = null) {
    if (!playerPosition) return;
    const step = Math.max(0, dt);
    const target = this.targetCountFor(hourOfDay);
    // Grow toward density target (bounded per tick to avoid bursts).
    let budget = 3;
    while (this.managed.size < target && budget-- > 0) {
      if (!this.spawnOne(playerPosition)) break;
    }
    // Advance + cull.
    for (const [id, record] of [...this.managed]) this.advanceVehicle(id, record, step);
    this.cullFar(playerPosition, excludeIds);
    // Hard cap: drop farthest beyond maxVehicles.
    if (this.managed.size > this.maxVehicles) {
      const ranked = [...this.managed.entries()]
        .map(([id, record]) => ({ id, d: dist2d(this.poseFor(record) ?? playerPosition, playerPosition) }))
        .sort((a, b) => b.d - a.d);
      for (const { id } of ranked.slice(0, this.managed.size - this.maxVehicles)) {
        if (this.excludeIds.has(id) || excludeIds?.has?.(id)) continue;
        this.removeVehicle(id);
      }
    }
  }

  destroy() {
    for (const id of [...this.managed.keys()]) this.removeVehicle(id);
  }
}
