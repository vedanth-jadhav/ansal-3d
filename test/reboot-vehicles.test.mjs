import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { step } from "../src/reboot/vehicles/CarPhysics.js";
import { createDamage, addImpact, isSmoking, damageAmount } from "../src/reboot/vehicles/Damage.js";
import { TrafficLive } from "../src/reboot/vehicles/TrafficLive.js";

const S0 = () => ({ x: 0, z: 0, heading: 0, speed: 0 });
const run = (s, input, dt, n, opts) => {
  let c = { ...s };
  for (let i = 0; i < n; i++) c = step(c, input, dt, opts);
  return c;
};

describe("CarPhysics caps", () => {
  it("top speed ~= 22 m/s intact", () => {
    const c = run(S0(), { throttle: 1, steer: 0 }, 1 / 60, 60 * 12);
    assert.ok(c.speed <= 22.001, `speed ${c.speed}`);
    assert.ok(c.speed > 20, `speed ${c.speed}`);
  });

  it("reverse capped at 6 m/s", () => {
    const c = run(S0(), { throttle: -1, steer: 0 }, 1 / 60, 60 * 12);
    assert.ok(c.speed >= -6.001, `speed ${c.speed}`);
    assert.ok(c.speed < -4, `speed ${c.speed}`);
  });

  it("damage slows top speed by (1-0.45*damage)", () => {
    const fresh = run(S0(), { throttle: 1, steer: 0 }, 1 / 60, 60 * 15, { damage: 0 });
    const wrecked = run(S0(), { throttle: 1, steer: 0 }, 1 / 60, 60 * 15, { damage: 1 });
    const expect = 22 * (1 - 0.45);
    assert.ok(Math.abs(wrecked.speed - expect) < 1.2, `wrecked ${wrecked.speed} vs ${expect}`);
    assert.ok(wrecked.speed < fresh.speed - 5, `${wrecked.speed} vs fresh ${fresh.speed}`);
  });

  it("turn rate falls with speed", () => {
    const slow = step({ x: 0, z: 0, heading: 0, speed: 2 }, { throttle: 0, steer: 1 }, 0.5);
    const fast = step({ x: 0, z: 0, heading: 0, speed: 20 }, { throttle: 0, steer: 1 }, 0.5);
    assert.ok(slow.heading > 0 && fast.heading > 0);
    assert.ok(fast.heading < slow.heading * 0.6, `fast ${fast.heading} slow ${slow.heading}`);
  });

  it("no turn at standstill; brake stops the car", () => {
    const still = step(S0(), { throttle: 0, steer: 1 }, 1);
    assert.equal(still.heading, 0);
    const moving = run(S0(), { throttle: 1, steer: 0 }, 1 / 60, 60 * 3);
    assert.ok(moving.speed > 5);
    const stopped = run(moving, { throttle: 0, steer: 0, brake: true }, 1 / 60, 60 * 3);
    assert.equal(stopped.speed, 0);
  });

  it("step is pure (input untouched)", () => {
    const s = S0();
    const out = step(s, { throttle: 1 }, 1 / 60);
    assert.deepEqual(s, S0());
    assert.notEqual(out, s);
  });
});

describe("Damage bands", () => {
  it("scrapes <3 m/s do nothing; bands escalate", () => {
    const d = createDamage();
    addImpact(d, 2.9);
    assert.equal(d.body, 1);
    addImpact(d, 4);
    assert.equal(d.body, 0.95);
    addImpact(d, 8);
    assert.equal(d.body, 0.83);
    addImpact(d, 12);
    assert.equal(d.body, 0.61);
    addImpact(d, 20);
    assert.equal(d.body, 0.26);
  });

  it("smoke flag when body < 0.4; always drivable (clamped)", () => {
    const d = createDamage();
    assert.equal(isSmoking(d), false);
    addImpact(d, 20);
    addImpact(d, 20);
    assert.ok(d.body < 0.4);
    assert.equal(isSmoking(d), true);
    for (let i = 0; i < 10; i++) addImpact(d, 30);
    assert.equal(d.body, 0);
    assert.equal(damageAmount(d), 1);
    // Wrecked car still steps forward.
    const c = step(S0(), { throttle: 1 }, 1 / 60, { damage: damageAmount(d) });
    assert.ok(c.speed > 0);
  });
});

// Fake graph: one east-west road at z=0, width 8, driveable.
const fakeGraph = {
  nearest(x, z) {
    return { x, z: 0, dirX: 1, dirZ: 0, width: 8, drive: true };
  },
  segments: [{ ax: -500, az: 0, bx: 500, bz: 0, width: 8, drive: true }],
};

const seeded = (values) => {
  let i = 0;
  return () => values[i++ % values.length];
};

describe("TrafficLive", () => {
  it("spawns N=8 cars in right-hand lane and cruises 8-11 m/s", () => {
    const t = new TrafficLive({ graph: fakeGraph, rand: seeded([0.1, 0.5, 0.9, 0.3, 0.7, 0.2, 0.8, 0.4]) });
    t.update(1 / 60, { x: 0, z: 0, heading: 0 });
    assert.equal(t.list().length, 8);
    for (const c of t.list()) {
      assert.ok(c.cruise >= 8 && c.cruise <= 11, `cruise ${c.cruise}`);
    }
    // Right-hand lane for eastbound (+x) travel: right of (1,0) is (0,1) => z=+width/4=+2.
    for (const c of t.list()) {
      if (Math.abs(Math.sin(c.heading)) > 0.9) assert.ok(Math.abs(c.z - 2) < 3, `lane z=${c.z}`);
    }
  });

  it("yields: follower slows when a car is ahead within 10m", () => {
    const t = new TrafficLive({ graph: null, rand: seeded([0.5]) });
    t.update(1 / 60, { x: 0, z: 0 });
    t.cars.length = 0;
    t.cars.push(
      { id: 1, x: 0, z: 0, heading: 0, speed: 10, cruise: 10 },
      { id: 2, x: 0, z: -6, heading: 0, speed: 10, cruise: 10 },
    );
    t._nextId = 3;
    t.update(0.5, { x: -100, z: -100 }); // player far so no respawn churn
    const follower = t.cars.find((c) => c.id === 2);
    assert.ok(follower.speed < 10, `follower ${follower.speed}`);
  });

  it("stops dead when bumper-to-bumper; despawns beyond 280m", () => {
    const t = new TrafficLive({ graph: null, rand: seeded([0.5]) });
    t.update(1 / 60, { x: 0, z: 0 });
    t.cars.length = 0;
    t.cars.push(
      { id: 1, x: 0, z: 0, heading: 0, speed: 0, cruise: 0 },
      { id: 2, x: 0, z: -2, heading: 0, speed: 5, cruise: 10 },
    );
    t._nextId = 3;
    for (let i = 0; i < 20; i++) t.update(0.1, { x: 0, z: -50 });
    assert.equal(t.cars.find((c) => c.id === 2).speed, 0);

    const t2 = new TrafficLive({ graph: null, rand: seeded([0.5]) });
    t2.update(1 / 60, { x: 0, z: 0 });
    assert.equal(t2.list().length, 8);
    t2.update(1 / 60, { x: 1000, z: 1000 }); // player teleports away
    for (const c of t2.list()) {
      assert.ok(Math.hypot(c.x - 1000, c.z - 1000) < 280, `despawn ${c.x},${c.z}`);
    }
  });

  it("null graph: cars cruise straight lines without throwing", () => {
    const seen = [];
    const t = new TrafficLive({ graph: null, sync: (id, p) => seen.push([id, p]), rand: seeded([0.5]) });
    t.update(1 / 60, { x: 0, z: 0 });
    t.update(1, { x: 0, z: 0 });
    assert.equal(t.list().length, 8);
    assert.ok(seen.length > 0);
    for (const c of t.list()) assert.ok(Number.isFinite(c.x) && Number.isFinite(c.z));
  });
});
