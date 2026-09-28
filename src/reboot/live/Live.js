import * as THREE from 'three';
import { initPeds, readHour } from './Peds.js';
import { createMissions, describeActive } from './Missions.js';
import { initHud } from './Hud.js';
import { createAudio } from './Audio.js';

// Wires peds + missions + hud + audio and owns the waypoint beacon mesh.
// Self-contained: no imports from ../world, ../gameplay, ../ambient, ../recovered.
//
// initLive({scene, clock, graph, vehicles, ui}) where:
//   scene     THREE.Scene (optional; beacon/peds skip adding without one)
//   clock     {hour} | {getHour()} | fn | null  (hour 0-23, default 12)
//   graph     wander graph {nearest(x,z)->{x,z,dirX,dirZ}} (optional, null-safe)
//   vehicles  arr | fn(x,z,r)->arr | {getVehicles}      (passed to peds)
//   ui        { getArea(playerPos)->string, getBed(playerPos)->zoneHint,
//               graph } — callbacks injected by main; all defaulted.
// state per update: {playerPos:{x,z}, driving:bool, speed:number m/s}.
//
// Returns {update(dt, state), peds, missions, hud, audio, beacon}.

const DEFAULT_AREA = 'Sector 12';
const DEFAULT_BED = 'residential';

function pad2(n) {
  const v = ((Math.floor(Number(n)) || 0) % 24 + 24) % 24;
  return String(v).padStart(2, '0');
}

export function initLive({ scene = null, clock = null, graph = null, vehicles = null, ui = {} } = {}) {
  const safeUi = ui && typeof ui === 'object' ? ui : {};
  const getArea = typeof safeUi.getArea === 'function' ? safeUi.getArea : () => DEFAULT_AREA;
  const getBed = typeof safeUi.getBed === 'function' ? safeUi.getBed : () => DEFAULT_BED;
  const resolvedGraph = graph ?? safeUi.graph ?? null;

  const peds = initPeds({ scene, graph: resolvedGraph, clock });
  const missions = createMissions();
  const hud = initHud();
  const audio = createAudio();

  // Waypoint beacon: floating pulsing octahedron, emissive gold.
  const beacon = new THREE.Mesh(
    new THREE.OctahedronGeometry(1.1, 0),
    new THREE.MeshStandardMaterial({
      color: 0xffc94d,
      emissive: 0xff9d00,
      emissiveIntensity: 1.2,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
    }),
  );
  beacon.visible = false;
  try {
    scene?.add?.(beacon);
  } catch { /* scene optional */ }

  // Attach audio on first user gesture only; safe no-op without a page.
  try {
    if (typeof globalThis.window !== 'undefined' && typeof globalThis.window.addEventListener === 'function') {
      globalThis.window.addEventListener('pointerdown', () => audio.attach(), { once: true });
      globalThis.window.addEventListener('keydown', () => audio.attach(), { once: true });
    }
  } catch { /* ignore */ }
  try {
    hud.onMuteToggle(() => audio.toggle());
  } catch { /* ignore */ }

  let t = 0;
  let lastTracker = '';

  function safeGetArea(playerPos) {
    try {
      const a = getArea(playerPos);
      return typeof a === 'string' && a ? a : DEFAULT_AREA;
    } catch {
      return DEFAULT_AREA;
    }
  }

  function safeGetBed(playerPos) {
    try {
      const b = getBed(playerPos);
      return typeof b === 'string' && b ? b : DEFAULT_BED;
    } catch {
      return DEFAULT_BED;
    }
  }

  function refreshTracker() {
    try {
      const text = describeActive(missions.active());
      if (text !== lastTracker) {
        lastTracker = text;
        hud.setMission(text);
      }
    } catch { /* ignore */ }
  }

  refreshTracker();

  function update(dt, state = {}) {
    const step = Math.min(Math.max(Number(dt) || 0, 0), 1);
    t += step;
    let playerPos = null;
    let driving = false;
    let speed = 0;
    try {
      playerPos = state?.playerPos ?? state?.position ?? null;
      driving = !!state?.driving;
      const s = Number(state?.speed);
      speed = Number.isFinite(s) && s > 0 ? s : 0;
    } catch { /* keep defaults */ }

    const hr = readHour(clock);
    const area = safeGetArea(playerPos);
    const bed = safeGetBed(playerPos);

    try {
      peds.update(step, playerPos, vehicles);
    } catch { /* peds must not break the frame */ }

    try {
      const events = missions.update(step, playerPos) ?? [];
      for (const e of events) {
        if (!e) continue;
        if (e.type === 'stage') hud.toast(`✔ ${e.label ?? 'stage reached'}`);
        else if (e.type === 'done') hud.toast(`★ Mission complete: ${e.name ?? e.missionId ?? ''}`);
        else hud.toast(String(e.type ?? 'event'));
      }
      if (events.length > 0) {
        lastTracker = '';
        refreshTracker();
      }
    } catch { /* ignore */ }
    refreshTracker();

    try {
      hud.setPlace(`${area} · ${pad2(hr)}:00`);
      hud.setSpeed(speed * 3.6, driving);
    } catch { /* ignore */ }

    try {
      audio.setZone(bed, 1);
      audio.update(step, hr);
    } catch { /* audio never breaks the frame */ }

    // Beacon follows the active mission stop; pulse + hover when visible.
    try {
      const b = missions.beacon();
      if (b && playerPos) {
        beacon.visible = true;
        const hover = 6 + Math.sin(t * 2.2) * 0.5;
        beacon.position.set(b.x, hover, b.z);
        beacon.rotation.y += step * 2;
        const s = 1 + Math.sin(t * 3.5) * 0.12;
        beacon.scale.set(s, s, s);
      } else if (b) {
        beacon.visible = true;
        beacon.position.set(b.x, 6, b.z);
        beacon.rotation.y += step * 2;
      } else {
        beacon.visible = false;
      }
    } catch { /* ignore */ }
  }

  return { update, peds, missions, hud, audio, beacon };
}
