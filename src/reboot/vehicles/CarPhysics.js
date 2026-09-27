/* Pure arcade car model. No three.js. Coordinates: x=east, z=south, meters, y-up.
// heading radians: forward = (sin(heading), cos(heading)) in xz. Matches OSM slice
// convention where heading = atan2(tangent.x, tangent.z).
// state: { x, z, heading, speed } (speed m/s, +forward / -reverse) */

export const ACCEL = 8; // m/s^2 at full throttle
export const REVERSE_ACCEL = 6; // m/s^2 at full reverse throttle
export const TOP_SPEED = 22; // m/s intact
export const REVERSE_CAP = 6; // m/s
export const BASE_TURN = 2.2; // rad/s at full steer, near standstill
export const TURN_FALLOFF = 0.12; // turn *= 1/(1+|speed|*FALLOFF)
export const BRAKE_DECEL = 20; // m/s^2
export const DRAG_K = ACCEL / (TOP_SPEED * TOP_SPEED); // quadratic drag balances accel at top speed
export const ROLLING = 0.4; // m/s^2 rolling resistance

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

function damage01(opts) {
  const d = opts?.damage ?? 0;
  return clamp(d, 0, 1);
}

/* Pure step: returns a NEW state object, never mutates the input.
 * input: { throttle -1..1, steer -1..1, brake bool }
 * opts: { damage 0..1 } — top speed scaled by (1 - 0.45*damage). */
export function step(state, input = {}, dt = 1 / 60, opts = {}) {
  const s = {
    x: state.x ?? 0,
    z: state.z ?? 0,
    heading: state.heading ?? 0,
    speed: state.speed ?? 0,
  };
  const h = clamp(dt, 0, 0.1);
  if (h === 0) return s;

  const throttle = clamp(input.throttle ?? 0, -1, 1);
  const steer = clamp(input.steer ?? 0, -1, 1);
  const brake = !!input.brake;
  const dmg = damage01(opts);
  const topSpeed = TOP_SPEED * (1 - 0.45 * dmg);

  let v = s.speed;

  if (brake) {
    // Strong decel toward zero, never reverses through the brake pedal.
    const dv = BRAKE_DECEL * h;
    v = Math.abs(v) <= dv ? 0 : v - Math.sign(v) * dv;
  } else if (throttle >= 0) {
    // Forward drive: constant engine force vs quadratic drag + rolling
    // resistance. Drag balances the engine exactly at intact top speed, so
    // the hard clamp below only binds when damage lowers the cap.
    const traction = throttle * ACCEL;
    const resist = DRAG_K * v * Math.abs(v) + Math.sign(v) * Math.min(Math.abs(v) / h, ROLLING);
    v += (traction - resist) * h;
    // Rolling resistance must not flip the sign when coasting to a stop.
    if (throttle === 0 && Math.sign(v) !== Math.sign(s.speed)) v = 0;
    if (v < 0 && s.speed >= 0 && throttle > 0) v = Math.max(0, v);
  } else {
    // Reverse throttle: weak engine pull, capped hard at REVERSE_CAP.
    const resist = DRAG_K * v * Math.abs(v) + Math.sign(v) * Math.min(Math.abs(v) / h, ROLLING);
    v += (throttle * REVERSE_ACCEL - resist) * h;
    if (throttle === 0 && Math.sign(v) !== Math.sign(s.speed)) v = 0;
  }

  v = clamp(v, -REVERSE_CAP, topSpeed);
  if (!brake && throttle === 0 && Math.abs(v) < 0.05) v = 0; // settle at rest

  // Steering: no turn at standstill, rate falls with speed, flips in reverse.
  let heading = s.heading;
  if (Math.abs(v) > 0.3 && steer !== 0) {
    const rate = (steer * BASE_TURN) / (1 + Math.abs(v) * TURN_FALLOFF);
    heading += rate * Math.sign(v) * h;
  }

  return {
    x: s.x + Math.sin(heading) * v * h,
    z: s.z + Math.cos(heading) * v * h,
    heading,
    speed: v,
  };
}

/* Mutating convenience wrapper: advances `state` in place, returns it. */
export function update(state, dt, input, opts) {
  const next = step(state, input, dt, opts);
  state.x = next.x;
  state.z = next.z;
  state.heading = next.heading;
  state.speed = next.speed;
  return state;
}
