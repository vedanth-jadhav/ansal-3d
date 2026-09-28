/* Reboot core unit tests: mapKeys, desiredPose, slide collision, clock wrap. */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Clock } from '../src/reboot/core/Clock.js';
import { mapKeys, Input } from '../src/reboot/core/Input.js';
import { desiredPose, CameraFollow, pullInCamera } from '../src/reboot/core/CameraFollow.js';
import { Player, collides, WALK_SPEED } from '../src/reboot/core/Player.js';

const keys = (...codes) => new Set(codes);

describe('mapKeys', () => {
  it('W / ArrowUp give full forward', () => {
    assert.equal(mapKeys(keys('KeyW')).forward, 1);
    assert.equal(mapKeys(keys('ArrowUp')).forward, 1);
  });
  it('S / ArrowDown give full reverse', () => {
    assert.equal(mapKeys(keys('KeyS')).forward, -1);
    assert.equal(mapKeys(keys('ArrowDown')).forward, -1);
  });
  it('opposing keys cancel', () => {
    assert.equal(mapKeys(keys('KeyW', 'KeyS')).forward, 0);
    assert.equal(mapKeys(keys('KeyA', 'KeyD')).steer, 0);
  });
  it('A/D and arrows steer', () => {
    assert.equal(mapKeys(keys('KeyD')).steer, 1);
    assert.equal(mapKeys(keys('KeyA')).steer, -1);
    assert.equal(mapKeys(keys('ArrowRight')).steer, 1);
    assert.equal(mapKeys(keys('ArrowLeft')).steer, -1);
  });
  it('Space brakes, E enters, M mutes', () => {
    const m = mapKeys(keys('Space', 'KeyE', 'KeyM'));
    assert.equal(m.brake, true);
    assert.equal(m.enter, true);
    assert.equal(m.mute, true);
  });
  it('empty set is neutral', () => {
    assert.deepEqual(mapKeys(new Set()), { forward: 0, steer: 0, brake: false, enter: false, mute: false });
  });
});

describe('Input.sample edges', () => {
  it('enterPressed/mutePressed fire once per press (edge)', () => {
    const inp = new Input(); // no DOM in node: keyboard-state only
    inp.held.add('KeyE');
    inp.held.add('KeyM');
    let s = inp.sample();
    assert.equal(s.enterPressed, true);
    assert.equal(s.mutePressed, true);
    s = inp.sample(); // still held -> no repeat edge
    assert.equal(s.enterPressed, false);
    assert.equal(s.mutePressed, false);
    inp.held.delete('KeyE');
    inp.sample();
    inp.held.add('KeyE');
    assert.equal(inp.sample().enterPressed, true);
  });
  it('merges touch joystick state', () => {
    const inp = new Input();
    inp.touchForward = 0.5;
    inp.touchSteer = -0.5;
    inp.touchBrake = true;
    const s = inp.sample();
    assert.equal(s.forward, 0.5);
    assert.equal(s.steer, -0.5);
    assert.equal(s.brake, true);
  });
});

describe('desiredPose', () => {
  it('walk camera sits behind the target at walk height', () => {
    const d = desiredPose({ x: 0, z: 0, heading: 0 }, 'walk');
    // heading 0 -> forward (0,+1); camera must be behind: z = -5, height 2.6
    assert.equal(d.pos.z, -5);
    assert.equal(d.pos.y, 2.6);
    assert.ok(d.look.z > 0); // looking ahead of the target
  });
  it('drive camera is farther and higher than walk', () => {
    const w = desiredPose({ x: 10, z: -4, heading: 1.2 }, 'walk');
    const d = desiredPose({ x: 10, z: -4, heading: 1.2 }, 'drive');
    const dw = Math.hypot(w.pos.x - 10, w.pos.z + 4);
    const dd = Math.hypot(d.pos.x - 10, d.pos.z + 4);
    assert.ok(dd > dw);
    assert.ok(d.pos.y > w.pos.y);
  });
  it('never drops below min height', () => {
    for (const mode of ['walk', 'drive']) {
      const d = desiredPose({ x: 0, z: 0, heading: 3 }, mode);
      assert.ok(d.pos.y >= 1.6);
    }
  });
  it('CameraFollow smooths toward the pose without three.js', () => {
    const fake = { position: { set() {} }, lookAt() {} };
    const cam = new CameraFollow(fake);
    const t = { x: 0, z: 0, heading: 0 };
    cam.snap(t, 'walk');
    assert.deepEqual({ ...cam._pos }, desiredPose(t, 'walk').pos);
    const far = { x: 100, z: 100, heading: 2 };
    cam.update(0.016, { target: far, mode: 'walk' });
    // one small step must move only partway (smoothing), staying above min height
    assert.ok(cam._pos.x > desiredPose(t, 'walk').pos.x);
    assert.ok(cam._pos.x < desiredPose(far, 'walk').pos.x);
    assert.ok(cam._pos.y >= 1.6);
  });
});

describe('slide collision', () => {
  const wall = [{ minX: 5, maxX: 6, minZ: -10, maxZ: 10 }]; // wall east of origin

  it('collides detects circle-vs-box overlap', () => {
    assert.equal(collides(4.5, 0, 0.4, wall), false);
    assert.equal(collides(4.8, 0, 0.4, wall), true);
    assert.equal(collides(0, 0, 0.4, wall), false);
    assert.equal(collides(0, 0, 0.4, []), false);
  });
  it('head-on movement stops at the wall without penetration', () => {
    const p = new Player({ x: 0, z: 0, heading: Math.PI / 2 }); // facing +x (east)
    for (let i = 0; i < 200; i++) p.update(1 / 60, { forward: 1, steer: 0 }, wall);
    assert.ok(p.pos.x + p.radius <= 5 + 1e-9, `penetrated: x=${p.pos.x}`);
    assert.ok(p.pos.x > 3, `never reached wall: x=${p.pos.x}`);
  });
  it('angled movement slides along the wall instead of sticking', () => {
    const p = new Player({ x: 4.2, z: 0, heading: Math.PI / 2 - 0.25 });
    let z0 = p.pos.z;
    for (let i = 0; i < 120; i++) p.update(1 / 60, { forward: 1, steer: 0 }, wall);
    // progressed along the wall (z grew) while x never penetrated
    assert.ok(p.pos.z > z0 + 1, `stuck: z ${z0} -> ${p.pos.z}`);
    assert.ok(p.pos.x + p.radius <= 5 + 1e-9, `penetrated: x=${p.pos.x}`);
  });
  it('walk speed is 4 m/s in open space', () => {
    const p = new Player({ x: 0, z: 0, heading: 0 });
    p.update(1, { forward: 1, steer: 0 }, []);
    assert.ok(Math.abs(p.pos.z - WALK_SPEED) < 1e-9);
    assert.equal(p.speed, WALK_SPEED);
  });
  it('avatar callback receives pos + heading', () => {
    let got = null;
    const p = new Player({ x: 1, z: 2, heading: 0.5, setAvatar: (pos, h) => { got = { pos, h }; } });
    p.update(0.016, { forward: 0, steer: 0 }, []);
    assert.deepEqual(got.pos, { x: 1, z: 2 });
    assert.equal(got.h, 0.5);
  });
});

describe('Clock', () => {
  it('advances 1 game-hour per 300 s', () => {
    const c = new Clock(8);
    c.update(300);
    assert.ok(Math.abs(c.hour - 9) < 1e-9);
    c.update(150);
    assert.ok(Math.abs(c.hour - 9.5) < 1e-9);
  });
  it('wraps past midnight', () => {
    const c = new Clock(23.9);
    c.update(60); // +0.2 h -> 24.1 -> 0.1
    assert.ok(Math.abs(c.hour - 0.1) < 1e-9);
  });
  it('setHour wraps arbitrary values into [0,24)', () => {
    const c = new Clock(0);
    c.setHour(25.5);
    assert.equal(c.hour, 1.5);
    c.setHour(-1);
    assert.equal(c.hour, 23);
  });
});

describe('pullInCamera', () => {
  const boxes = [{ minX: -6, maxX: -2, minZ: -6, maxZ: -2 }];
  it('keeps the desired position when the path is clear', () => {
    const p = pullInCamera({ x: 0, z: 0 }, { x: 0, y: 3, z: -5 }, boxes);
    assert.equal(p.z, -5);
  });
  it('pulls in before entering a house box', () => {
    const p = pullInCamera({ x: 0, z: 0 }, { x: -8, y: 3, z: -8 }, boxes);
    assert.ok(p.x > -6 && p.z > -6, `pulled to ${p.x},${p.z}`);
  });
  it('falls back to the target head when fully blocked', () => {
    const p = pullInCamera({ x: 0, z: 0 }, { x: -4, y: 3, z: -4 }, [{ minX: -10, maxX: 10, minZ: -10, maxZ: 10 }]);
    assert.equal(p.x, 0);
    assert.equal(p.z, 0);
  });
});
