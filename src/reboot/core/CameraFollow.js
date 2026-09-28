/* Reboot third-person follow camera.
 *
 * Coordinate system: x = east, z = south, meters, y-up.
 * Heading convention (shared with Player): forward = (sin h, cos h) in
 * (x, z), i.e. h = 0 faces south (+z), h = PI/2 faces east (+x).
 *
 * desiredPose() is pure math with NO three.js dependency so unit tests
 * stay dependency-free. The CameraFollow class only duck-types the
 * camera ({ position.set, lookAt }), never imports three.
 */

export const WALK_DIST = 5.0;
export const WALK_HEIGHT = 2.6;
export const DRIVE_DIST = 8.5;
export const DRIVE_HEIGHT = 3.6;
export const MIN_HEIGHT = 1.6;

export function desiredPose(target, mode = 'walk') {
  const drive = mode === 'drive';
  const dist = drive ? DRIVE_DIST : WALK_DIST;
  const height = drive ? DRIVE_HEIGHT : WALK_HEIGHT;
  const x = Number(target.x) || 0;
  const z = Number(target.z) || 0;
  const h = Number(target.heading) || 0;
  const fx = Math.sin(h);
  const fz = Math.cos(h);
  return {
    pos: {
      x: x - fx * dist,
      y: Math.max(height, MIN_HEIGHT),
      z: z - fz * dist,
    },
    look: {
      x: x + fx * 2.0,
      y: drive ? 1.4 : 1.2,
      z: z + fz * 2.0,
    },
  };
}

// Pull the desired camera position in toward the target until it sits
// outside every collider box (2D XZ + margin). Prevents the camera from
// spawning inside roadside houses. Pure math — no three.js.
export function pullInCamera(target, desired, colliders, margin = 0.4) {
  const tx = Number(target.x) || 0;
  const tz = Number(target.z) || 0;
  const inside = (x, z) => {
    if (!Array.isArray(colliders)) return false;
    for (const c of colliders) {
      if (!c || typeof c !== 'object') continue;
      const minX = c.minX ?? c.x0 ?? (Number.isFinite(c.x) && Number.isFinite(c.hx) ? c.x - c.hx : null);
      if (minX === null || minX === undefined) continue;
      const maxX = c.maxX ?? c.x1 ?? (Number.isFinite(c.x) && Number.isFinite(c.hx) ? c.x + c.hx : minX);
      const minZ = c.minZ ?? c.z0 ?? (Number.isFinite(c.z) && Number.isFinite(c.hz) ? c.z - c.hz : null);
      if (minZ === null || minZ === undefined) continue;
      const maxZ = c.maxZ ?? c.z1 ?? (Number.isFinite(c.z) && Number.isFinite(c.hz) ? c.z + c.hz : minZ);
      if (x > minX - margin && x < maxX + margin && z > minZ - margin && z < maxZ + margin) return true;
    }
    return false;
  };
  // Walk from the target head out to the desired position; keep the
  // farthest collision-free sample (target head itself always wins ties).
  let best = { x: tx, y: desired.y, z: tz };
  const STEPS = 8;
  for (let i = 1; i <= STEPS; i++) {
    const t = i / STEPS;
    const x = tx + (desired.x - tx) * t;
    const z = tz + (desired.z - tz) * t;
    if (inside(x, z)) break;
    best = { x, y: desired.y, z };
  }
  return best;
}

export class CameraFollow {
  constructor(camera, { walkK = 6, driveK = 4 } = {}) {
    this.camera = camera || null;
    this.walkK = walkK;
    this.driveK = driveK;
    this._pos = null;
    this._look = null;
  }

  snap(target, mode = 'walk', colliders = null) {
    const d = desiredPose(target, mode);
    const pos = colliders ? pullInCamera(target, d.pos, colliders) : d.pos;
    this._pos = { ...pos };
    this._look = { ...d.look };
    this._apply();
    return this;
  }

  update(dt, { target, mode = 'walk', colliders = null } = {}) {
    if (!target) return this;
    const d = desiredPose(target, mode);
    // Keep the smoothed position out of walls when colliders are provided.
    if (colliders) d.pos = pullInCamera(target, d.pos, colliders);
    const step = Number.isFinite(dt) && dt > 0 ? dt : 0;
    if (!this._pos || !this._look || step === 0) {
      return this.snap(target, mode);
    }
    const k = 1 - Math.exp(-step * (mode === 'drive' ? this.driveK : this.walkK));
    for (const ax of ['x', 'y', 'z']) {
      this._pos[ax] += (d.pos[ax] - this._pos[ax]) * k;
      this._look[ax] += (d.look[ax] - this._look[ax]) * k;
    }
    if (this._pos.y < MIN_HEIGHT) this._pos.y = MIN_HEIGHT;
    this._apply();
    return this;
  }

  _apply() {
    if (!this.camera || !this._pos || !this._look) return;
    if (this.camera.position && typeof this.camera.position.set === 'function') {
      this.camera.position.set(this._pos.x, this._pos.y, this._pos.z);
    }
    if (typeof this.camera.lookAt === 'function') {
      this.camera.lookAt(this._look.x, this._look.y, this._look.z);
    }
  }
}
