/* Reboot entry point — async boot + fixed-step loop.
 *
 * Coordinate system: x = east, z = south, meters, y-up. Phone browser is
 * the target (touch controls mandatory — see core/Input.js).
 *
 * Boot order: loading overlay -> fetch data (osm.json + parcel catalog
 * jsonl) -> init city / vehicles / live through their INTERFACES, each in
 * its own try/catch so the game runs degraded if one fails.
 *
 * The other agents provide:
 *   initCity({scene, osm, catalog})       from './city/CityBuilder.js'
 *   initVehicles({scene, graph, colliders}) from './vehicles/Vehicles.js'
 *   initLive({scene, clock, vehicles, ui})  from './live/Live.js'
 * They are dynamic-imported defensively: missing modules or missing
 * exports degrade to fallbacks instead of breaking boot.
 */

import * as THREE from 'three';
import { Clock } from './core/Clock.js';
import { Input } from './core/Input.js';
import { CameraFollow } from './core/CameraFollow.js';
import { Player } from './core/Player.js';

const STEP = 1 / 60;
const MAX_STEPS = 4;
const ENTER_RADIUS = 4;

function el(id) {
  return typeof document !== 'undefined' ? document.getElementById(id) : null;
}

function setLoading(text) {
  const n = el('rb-loading');
  if (n) n.textContent = text;
}

function hud(html) {
  // Status line has its own element: Live Hud owns #rb-hud — never stomp it.
  const n = el('rb-status');
  if (n) n.innerHTML = html;
}

// Adapter: city graph speaks {dx,dz}; traffic/peds speak {dirX,dirZ}.
// One wrap here fixes both consumers without touching their files.
function adaptGraph(g) {
  if (!g || typeof g.nearest !== 'function') return null;
  return {
    segments: g.segments,
    nearest(x, z) {
      let n = null;
      try {
        n = g.nearest(x, z);
      } catch { return null; }
      if (!n) return n;
      const dx = n.dirX ?? n.dx ?? 0;
      const dz = Number.isFinite(n.dirZ ?? n.dz) ? (n.dirZ ?? n.dz) : 1;
      return { ...n, dirX: dx, dirZ: dz, dx, dz };
    },
  };
}

function fmtClock(hour) {
  const h = Math.floor(hour) % 24;
  const m = Math.floor((hour - Math.floor(hour)) * 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

async function loadData() {
  let osm = null;
  let catalog = [];
  try {
    const res = await fetch('/osm.json');
    if (res.ok) osm = await res.json();
  } catch { /* degraded: city builds fallback */ }
  try {
    const res = await fetch('/parcel-catalog-v90.jsonl');
    if (res.ok) {
      const text = await res.text();
      catalog = text.split('\n').map((l) => l.trim()).filter(Boolean).map((l) => JSON.parse(l));
    }
  } catch { /* degraded: empty catalog */ }
  return { osm, catalog };
}

function makeFallbackGround(scene) {
  const geo = new THREE.PlaneGeometry(400, 400);
  const mat = new THREE.MeshLambertMaterial({ color: 0x1d2b1d });
  const ground = new THREE.Mesh(geo, mat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = 0;
  scene.add(ground);
  const grid = new THREE.GridHelper(400, 40, 0x3a5a3a, 0x2a3f2a);
  scene.add(grid);
}

function makeAvatar(scene) {
  const geo = new THREE.CapsuleGeometry(0.35, 1.0, 4, 12);
  const mat = new THREE.MeshLambertMaterial({ color: 0x4da3ff });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.y = 1.0;
  scene.add(mesh);
  return mesh;
}

async function boot() {
  setLoading('loading map…');

  const canvasHost = el('rb-canvas') || el('rb-app') || document.body;
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  if (canvasHost) canvasHost.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0b1220);
  scene.fog = new THREE.Fog(0x0b1220, 60, 260);

  const camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 3000);

  const hemi = new THREE.HemisphereLight(0xbfd9ff, 0x2a2118, 0.9);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff2d9, 1.6);
  sun.position.set(40, 60, 20);
  scene.add(sun);

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  const clock = new Clock(8);
  const input = new Input().init();
  const cam = new CameraFollow(camera);

  setLoading('loading data…');
  const { osm, catalog } = await loadData();

  // ---- city (degraded: fallback ground + default spawn) ----
  let city = null;
  let colliders = [];
  let graph = null;
  let spawn = { x: 0, z: 0, heading: 0 };
  try {
    const mod = await import('./city/CityBuilder.js');
    if (mod && typeof mod.initCity === 'function') {
      setLoading('building city…');
      city = await mod.initCity({ scene, osm, catalog });
      if (city) {
        if (Array.isArray(city.colliders)) colliders = city.colliders;
        if (city.graph) graph = adaptGraph(city.graph);
        if (city.spawn && Number.isFinite(city.spawn.x) && Number.isFinite(city.spawn.z)) {
          spawn = {
            x: city.spawn.x,
            z: city.spawn.z,
            heading: Number(city.spawn.heading) || 0,
          };
        }
      }
    }
  } catch (err) {
    console.warn('[reboot] city failed, running degraded:', err);
  }
  if (!city) makeFallbackGround(scene);

  // ---- player avatar ----
  const avatar = makeAvatar(scene);
  avatar.visible = true;
  const player = new Player({
    x: spawn.x,
    z: spawn.z,
    heading: spawn.heading,
    setAvatar: (pos, heading) => {
      avatar.position.set(pos.x, 1.0, pos.z);
      avatar.rotation.y = heading;
    },
  });
  avatar.position.set(player.pos.x, 1.0, player.pos.z);
  avatar.rotation.y = player.heading;
  cam.snap({ x: player.pos.x, z: player.pos.z, heading: player.heading }, 'walk', colliders);

  // ---- vehicles (degraded: on-foot only) ----
  let vehicles = null;
  try {
    const mod = await import('./vehicles/Vehicles.js');
    if (mod && typeof mod.initVehicles === 'function') {
      setLoading('spawning traffic…');
      vehicles = await mod.initVehicles({ scene, graph, colliders });
      // Park starter cars roadside (lateral offset, road-aligned) so E has
      // something to find and the spawn view stays clear.
      try {
        if (vehicles && typeof vehicles.spawnParked === 'function') {
          let dx = Math.sin(spawn.heading), dz = Math.cos(spawn.heading), half = 4;
          try {
            const n = graph?.nearest?.(spawn.x, spawn.z);
            if (n && Number.isFinite(n.x)) {
              const len = Math.hypot(n.dirX ?? 0, n.dirZ ?? 0) || 1;
              dx = (n.dirX ?? 0) / len; dz = (n.dirZ ?? 1) / len;
              half = (n.width ?? 7) / 2 + 1.6;
            }
          } catch { /* keep heading fallback */ }
          const px = -dz, pz = dx; // right-hand side vector
          const h = Math.atan2(dx, dz);
          // Near car stays within ENTER_RADIUS of the spawn point.
          vehicles.spawnParked('hatchback', spawn.x + px * half + dx * 1.5, spawn.z + pz * half + dz * 1.5, h);
          // Far car sits ahead-left down the road: visible depth, out of face.
          vehicles.spawnParked('sedan', spawn.x - px * half + dx * 9, spawn.z - pz * half + dz * 9, h);
        }
      } catch { /* starter cars optional */ }
    }
  } catch (err) {
    console.warn('[reboot] vehicles failed, on-foot only:', err);
    vehicles = null;
  }

  // ---- live layer (degraded: static city) ----
  let live = null;
  const ui = {
    say(msg) {
      // Prefer the live HUD toast when available; fall back to shell toast.
      try {
        if (live && live.hud && typeof live.hud.toast === 'function') {
          live.hud.toast(msg);
          return;
        }
      } catch { /* fall through */ }
      const n = el('rb-toast');
      if (n) {
        n.textContent = String(msg);
        n.style.opacity = '1';
        clearTimeout(ui._t);
        ui._t = setTimeout(() => { n.style.opacity = '0'; }, 2200);
      }
    },
  };
  try {
    const mod = await import('./live/Live.js');
    if (mod && typeof mod.initLive === 'function') {
      live = await mod.initLive({ scene, clock, graph, vehicles, ui });
      // Auto-start the opening mission so the beacon/HUD mean something.
      try {
        const r = live.missions && live.missions.start('temple-run');
        if (r && r.ok) ui.say('Mission: Temple run — follow the beacon');
      } catch { /* missions optional */ }
    }
  } catch (err) {
    console.warn('[reboot] live layer failed, static city:', err);
    live = null;
  }

  let muted = false;
  let driving = false;
  let speed = 0; // m/s, for HUD + audio (car speed while driving)

  function step(dt) {
    clock.update(dt);
    const inp = input.sample();

    if (inp.mutePressed) {
      // Route through the audio module when live; fall back to local flag.
      try {
        muted = live && live.audio && typeof live.audio.toggle === 'function'
          ? !!live.audio.toggle()
          : !muted;
      } catch { muted = !muted; }
      ui.say(muted ? 'muted' : 'sound on');
    }

    // Enter / exit vehicle on rising edge.
    if (inp.enterPressed && vehicles) {
      try {
        if (driving) {
          const out = vehicles.exit();
          if (out && Number.isFinite(out.x) && Number.isFinite(out.z)) {
            player.pos.x = out.x;
            player.pos.z = out.z;
            if (Number.isFinite(out.heading)) player.heading = out.heading;
          }
          driving = false;
          avatar.visible = true;
        } else if (typeof vehicles.nearestEnterable === 'function') {
          const cand = vehicles.nearestEnterable(player.pos.x, player.pos.z, ENTER_RADIUS);
          if (cand) {
            vehicles.enter(cand.id !== undefined ? cand.id : cand);
            driving = true;
            avatar.visible = false;
          } else {
            ui.say('no vehicle nearby');
          }
        }
      } catch (err) {
        console.warn('[reboot] enter/exit failed:', err);
      }
    }
    // Reconcile driving flag with provider state (defensive).
    // NOTE: active() returns the car record with nested .state.
    try {
      if (vehicles && typeof vehicles.active === 'function') {
        const a = vehicles.active();
        const nowDriving = !!a;
        driving = nowDriving;
        avatar.visible = !nowDriving;
        const st = a && typeof a === 'object' ? (a.state ?? a) : null;
        if (st && Number.isFinite(st.x) && Number.isFinite(st.z)) {
          player.pos.x = st.x;
          player.pos.z = st.z;
          if (Number.isFinite(st.heading)) player.heading = st.heading;
          if (Number.isFinite(st.speed)) speed = Math.abs(st.speed);
        }
      }
    } catch { /* keep last known driving flag */ }

    const mode = driving ? 'drive' : 'walk';
    if (driving && vehicles && typeof vehicles.update === 'function') {
      try {
        // CarPhysics reads `throttle`; Input provides `forward` — map here.
        vehicles.update(dt, { ...inp, throttle: inp.forward }, { x: player.pos.x, z: player.pos.z });
      } catch (err) {
        console.warn('[reboot] vehicles.update failed:', err);
      }
    } else {
      player.update(dt, inp, colliders, graph);
      speed = Math.abs(player.speed);
    }

    try {
      if (city && typeof city.update === 'function') city.update(dt, clock);
    } catch (err) {
      console.warn('[reboot] city.update failed:', err);
    }
    try {
      if (live && typeof live.update === 'function') {
        live.update(dt, {
          clock,
          playerPos: { x: player.pos.x, z: player.pos.z },
          heading: player.heading,
          mode,
          driving,
          speed,
          muted,
        });
      }
    } catch (err) {
      console.warn('[reboot] live.update failed:', err);
    }

    cam.update(dt, {
      target: { x: player.pos.x, z: player.pos.z, heading: player.heading, speed },
      mode,
      colliders,
    });

    // Status line (own #rb-status element; live HUD owns mission/speed/hint).
    // No duplicate IDs: spans here use rb2- prefix.
    hud(
      `<span id="rb2-clock">${fmtClock(clock.hour)}</span>` +
      (muted ? `<span id="rb2-muted">muted (M)</span>` : '') +
      (!city ? `<span id="rb2-degraded">map offline</span>` : '') +
      (!vehicles ? `<span id="rb2-degraded">on foot only</span>` : '') +
      (!live ? `<span id="rb2-degraded">static city</span>` : ''),
    );
  }

  // Fixed-step loop: 60 Hz accumulator, max 4 steps, render each RAF.
  let acc = 0;
  let last = performance.now();
  function frame(now) {
    requestAnimationFrame(frame);
    let dt = (now - last) / 1000;
    last = now;
    if (!(dt >= 0)) dt = 0;
    if (dt > 0.25) dt = 0.25;
    acc = Math.min(acc + dt, STEP * MAX_STEPS);
    let n = 0;
    while (acc >= STEP && n < MAX_STEPS) {
      try {
        step(STEP);
      } catch (err) {
        console.error('[reboot] step failed:', err);
      }
      acc -= STEP;
      n += 1;
    }
    renderer.render(scene, camera);
  }

  window.__reboot = { clock, input, player, vehicles, city, live, scene, camera, colliders };
  window.__rebootStats = () => ({
    calls: renderer.info.render.calls,
    triangles: renderer.info.render.triangles,
    geometries: renderer.info.memory.geometries,
    driving,
    speed,
    hour: clock.hour,
  });

  setLoading('');
  const loading = el('rb-loading');
  if (loading) loading.style.display = 'none';
  requestAnimationFrame(frame);
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => boot().catch((e) => {
      console.error('[reboot] boot failed:', e);
      setLoading('failed to start — see console');
    }));
  } else {
    boot().catch((e) => {
      console.error('[reboot] boot failed:', e);
      setLoading('failed to start — see console');
    });
  }
}
