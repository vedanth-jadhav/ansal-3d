/* Reboot on-foot player: capsule approximated as a 2D circle.
 *
 * Coordinate system: x = east, z = south, meters, y-up.
 * Heading convention: forward = (sin h, cos h) in (x, z).
 *
 * Pure logic except avatar mesh sync via an injected
 * setAvatar(pos {x,z}, heading) callback — no three.js import here.
 */

export const WALK_SPEED = 4; // m/s
export const PLAYER_RADIUS = 0.4; // m
export const TURN_RATE = 2.6; // rad/s at full steer

const clamp1 = (v) => Math.max(-1, Math.min(1, Number(v) || 0));

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/* Normalize the collider shapes CityBuilder may hand us into an AABB.
 * Accepted: {minX,maxX,minZ,maxZ}, {x0,z0,x1,z1}, center + half extents
 * ({x,z} + hx|hw|halfX|halfW, hz|hd|halfZ|halfD), {x,z,w,d}. Returns null
 * for anything unrecognized (ignored = no collision). */
function toAABB(c) {
  if (!c || typeof c !== 'object') return null;
  let v = num(c.minX);
  if (v !== null) {
    const maxX = num(c.maxX);
    const minZ = num(c.minZ);
    const maxZ = num(c.maxZ);
    if (maxX === null || minZ === null || maxZ === null) return null;
    return { minX: v, maxX, minZ, maxZ };
  }
  if (num(c.x0) !== null) {
    const x1 = num(c.x1);
    const z0 = num(c.z0);
    const z1 = num(c.z1);
    if (x1 === null || z0 === null || z1 === null) return null;
    return { minX: Math.min(c.x0, x1), maxX: Math.max(c.x0, x1), minZ: Math.min(z0, z1), maxZ: Math.max(z0, z1) };
  }
  const cx = num(c.x);
  const cz = num(c.z);
  if (cx !== null && cz !== null) {
    const hx = num(c.hx) ?? num(c.hw) ?? num(c.halfX) ?? num(c.halfW)
      ?? (num(c.w) !== null ? num(c.w) / 2 : null) ?? (num(c.width) !== null ? num(c.width) / 2 : null);
    const hz = num(c.hz) ?? num(c.hd) ?? num(c.halfZ) ?? num(c.halfD)
      ?? (num(c.d) !== null ? num(c.d) / 2 : null) ?? (num(c.depth) !== null ? num(c.depth) / 2 : null);
    if (hx === null || hz === null) return null;
    return { minX: cx - hx, maxX: cx + hx, minZ: cz - hz, maxZ: cz + hz };
  }
  return null;
}

/* Circle-vs-colliders test. Supports AABB shapes (see toAABB) and plain
 * circle colliders {cx, cz, r}. Unknown shapes are ignored. */
export function collides(x, z, r, colliders) {
  if (!colliders || !(r > 0)) return false;
  for (const c of colliders) {
    if (!c || typeof c !== 'object') continue;
    const ccx = num(c.cx);
    if (ccx !== null) {
      const ccz = num(c.cz);
      const cr = num(c.r);
      if (ccz === null || cr === null) continue;
      const dx = x - ccx;
      const dz = z - ccz;
      if (dx * dx + dz * dz < (r + cr) * (r + cr)) return true;
      continue;
    }
    const b = toAABB(c);
    if (!b) continue;
    const qx = Math.max(b.minX, Math.min(x, b.maxX));
    const qz = Math.max(b.minZ, Math.min(z, b.maxZ));
    const dx = x - qx;
    const dz = z - qz;
    if (dx * dx + dz * dz < r * r) return true;
  }
  return false;
}

export class Player {
  constructor({ x = 0, z = 0, heading = 0, setAvatar = null } = {}) {
    this.pos = { x: Number(x) || 0, z: Number(z) || 0 };
    this.heading = Number(heading) || 0;
    this.speed = 0;
    this.radius = PLAYER_RADIUS;
    this.setAvatar = typeof setAvatar === 'function' ? setAvatar : null;
  }

  update(dt, input = {}, colliders = [], graph = null) { // eslint-disable-line no-unused-vars
    void graph; // on-foot movement is free-roam; graph reserved for future sidewalk snapping
    const step = Number(dt) || 0;
    const fwd = clamp1(input.forward);
    const steer = clamp1(input.steer);
    // Steering always applies so a blocked player can turn away (no sticking).
    this.heading += steer * TURN_RATE * step;
    const fx = Math.sin(this.heading);
    const fz = Math.cos(this.heading);
    this.speed = fwd * WALK_SPEED;
    if (step > 0 && this.speed !== 0) {
      const nx = this.pos.x + fx * this.speed * step;
      const nz = this.pos.z + fz * this.speed * step;
      // Attempt full move; on hit, project onto the wall tangent by
      // falling back to single-axis moves (slide, never stick).
      if (!collides(nx, nz, this.radius, colliders)) {
        this.pos.x = nx;
        this.pos.z = nz;
      } else if (!collides(nx, this.pos.z, this.radius, colliders)) {
        this.pos.x = nx;
      } else if (!collides(this.pos.x, nz, this.radius, colliders)) {
        this.pos.z = nz;
      }
      // else fully blocked: hold position, keep heading/speed for next frame
    } else {
      this.speed = 0;
    }
    if (this.setAvatar) {
      try {
        this.setAvatar({ x: this.pos.x, z: this.pos.z }, this.heading);
      } catch { /* avatar sync must never break simulation */ }
    }
    return this;
  }
}
