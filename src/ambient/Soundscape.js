/* Zone bed selector: pure logic, no AudioContext at module top level.
 * POI/road-kind lookups are injected so this imports cleanly under node --test.
 * An attachAudio(ctx) stub lets the caller bind a real context later.
 */

const ARTERIAL = new Set(['motorway', 'trunk', 'primary']);
const MID = new Set(['secondary', 'tertiary']);
const QUIET_ROAD = new Set(['footway', 'path', 'pedestrian', 'steps', 'cycleway']);
const RESIDENTIAL_ROAD = new Set(['residential', 'service', 'unclassified']);

const TRAFFIC_BY_KIND = {
  motorway: 1.0,
  trunk: 0.85,
  primary: 0.7,
  secondary: 0.5,
  tertiary: 0.35,
  residential: 0.2,
  unclassified: 0.2,
  service: 0.15,
  footway: 0.05,
  path: 0.05,
  pedestrian: 0.05,
  cycleway: 0.05,
  steps: 0.0,
};

function poiBed(poi) {
  if (!poi) return null;
  const text = `${poi.kind ?? ''} ${poi.category ?? ''} ${poi.name ?? ''} ${poi.id ?? ''}`.toLowerCase();
  if (/temple|shrine|mosque|church|gurudwara|relig|prayer/.test(text)) return 'temple';
  if (/market|bazaar|souk|shop|mall|mandi/.test(text)) return 'market';
  return null;
}

export function footstepSurface(kind) {
  if (kind == null) return 'dirt';
  const k = String(kind).toLowerCase();
  if (ARTERIAL.has(k) || MID.has(k) || RESIDENTIAL_ROAD.has(k)) return 'asphalt';
  if (QUIET_ROAD.has(k)) return 'pavers';
  if (k === 'track' || k === 'bridleway') return 'dirt';
  return 'dirt';
}

export class Soundscape {
  constructor({ lookupPOI = null, lookupRoad = null, findPOI = null, findRoad = null } = {}) {
    // Accept either naming for the injected lookups.
    this.lookupPOI = lookupPOI ?? findPOI;
    this.lookupRoad = lookupRoad ?? findRoad;
    this.audio = null;
  }

  /* Stub: bind a real AudioContext from an init/update function, never here. */
  attachAudio(ctx) {
    this.audio = ctx ?? null;
    return this.audio;
  }

  selectBed(playerPosition, hint = {}) {
    let poi = hint.poi ?? null;
    if (!poi && typeof this.lookupPOI === 'function') {
      try {
        poi = this.lookupPOI(playerPosition) ?? null;
      } catch {
        poi = null;
      }
    }
    let roadKind = hint.roadKind ?? hint.road ?? null;
    if (!roadKind && typeof this.lookupRoad === 'function') {
      try {
        const hit = this.lookupRoad(playerPosition);
        roadKind = typeof hit === 'string' ? hit : hit?.kind ?? null;
      } catch {
        roadKind = null;
      }
    }

    const fromPoi = poiBed(poi);
    let bed;
    if (fromPoi) {
      bed = fromPoi;
    } else if (roadKind && ARTERIAL.has(String(roadKind).toLowerCase())) {
      bed = 'arterial';
    } else if (roadKind && RESIDENTIAL_ROAD.has(String(roadKind).toLowerCase())) {
      bed = 'residential';
    } else if (roadKind && MID.has(String(roadKind).toLowerCase())) {
      bed = 'arterial';
    } else if (poi) {
      bed = 'residential';
    } else {
      bed = 'quiet';
    }

    const distance = Number.isFinite(poi?.distance) ? poi.distance : null;
    const intensity = distance == null ? 0.5 : Math.max(0, Math.min(1, 1 - distance / 120));
    const trafficLevel = roadKind
      ? (TRAFFIC_BY_KIND[String(roadKind).toLowerCase()] ?? 0.1)
      : 0.1;

    return { bed, intensity, trafficLevel };
  }

  destroy() {
    this.audio = null;
  }
}
