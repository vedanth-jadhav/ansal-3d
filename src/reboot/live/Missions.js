// Pure mission logic: no three.js, no DOM. Two starter missions with
// reach-the-stop stages. Self-contained: no ../world, ../gameplay, etc.

export const MISSION_DEFINITIONS = [
  {
    id: 'temple-run',
    name: 'Temple Run',
    stops: [
      { x: 120, z: 80, r: 6, label: 'Reach the temple gate' },
      { x: 180, z: 140, r: 6, label: 'Circle the shrine court' },
      { x: 240, z: 90, r: 6, label: 'Climb the ghat steps' },
    ],
  },
  {
    id: 'market-errand',
    name: 'Market Errand',
    stops: [
      { x: -60, z: 40, r: 5, label: 'Pick up the parcel' },
      { x: -140, z: -30, r: 5, label: 'Deliver it to the stall' },
    ],
  },
];

function readXZ(playerPos) {
  if (!playerPos) return null;
  const p = playerPos.position ? playerPos.position : playerPos;
  const x = Number(p.x);
  const z = Number(p.z ?? p.y);
  if (!Number.isFinite(x) || !Number.isFinite(z)) return null;
  return { x, z };
}

export function createMissions(defs = MISSION_DEFINITIONS) {
  const definitions = new Map();
  for (const d of defs ?? []) {
    if (!d || typeof d.id !== 'string') continue;
    if (!Array.isArray(d.stops) || d.stops.length === 0) continue;
    if (!d.stops.every((s) => Number.isFinite(Number(s.x)) && Number.isFinite(Number(s.z)))) continue;
    definitions.set(d.id, {
      id: d.id,
      name: d.name ?? d.id,
      stops: d.stops.map((s) => ({
        x: Number(s.x),
        z: Number(s.z),
        r: Number.isFinite(Number(s.r)) && Number(s.r) > 0 ? Number(s.r) : 5,
        label: s.label ?? '',
      })),
    });
  }

  let active = null; // {id, stage}
  const done = new Set();

  function start(id) {
    if (active) return { ok: false, reason: 'mission already active' };
    const def = definitions.get(id);
    if (!def) return { ok: false, reason: 'unknown mission' };
    active = { id, stage: 0 };
    return { ok: true, id };
  }

  // Advance at most one stop per call; returns events for the HUD.
  function update(_dt, playerPos) {
    if (!active) return [];
    const def = definitions.get(active.id);
    if (!def) {
      active = null;
      return [];
    }
    const pos = readXZ(playerPos);
    if (!pos) return [];
    const stop = def.stops[active.stage];
    if (!stop) {
      active = null;
      return [];
    }
    const d = Math.hypot(pos.x - stop.x, pos.z - stop.z);
    if (d > stop.r) return [];
    const reached = { ...stop };
    const stage = active.stage;
    const missionId = active.id;
    const name = def.name;
    active.stage += 1;
    if (active.stage >= def.stops.length) {
      done.add(missionId);
      active = null;
      return [
        { type: 'stage', missionId, stage, label: reached.label, x: reached.x, z: reached.z },
        { type: 'done', missionId, name },
      ];
    }
    const next = def.stops[active.stage];
    return [
      {
        type: 'stage', missionId, stage, label: reached.label,
        x: reached.x, z: reached.z,
        next: { ...next },
      },
    ];
  }

  function abandon() {
    active = null;
    return true;
  }

  // Active info for the HUD tracker + 3D beacon.
  function activeInfo() {
    if (!active) return null;
    const def = definitions.get(active.id);
    if (!def) return null;
    const stop = def.stops[active.stage];
    if (!stop) return null;
    return {
      id: active.id,
      name: def.name,
      stageIndex: active.stage,
      stagesTotal: def.stops.length,
      stageLabel: stop.label,
      beacon: { x: stop.x, z: stop.z, r: stop.r, label: stop.label },
    };
  }

  // Beacon position for the 3D marker, or null when no mission is active.
  function beacon() {
    const info = activeInfo();
    return info ? { ...info.beacon } : null;
  }

  function completed() {
    return [...done];
  }

  return {
    start, update, abandon,
    active: activeInfo, getActive: activeInfo,
    beacon, getBeacon: beacon,
    completed,
    definitions: [...definitions.values()],
  };
}

// One-line tracker text for the HUD: "Name — stop 2/3: label".
export function describeActive(info) {
  if (!info) return 'No mission — find work';
  return `${info.name} — stop ${info.stageIndex + 1}/${info.stagesTotal}: ${info.stageLabel}`;
}
