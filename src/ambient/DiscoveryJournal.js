/* Passive discovery journal: linger near a named place => journal entry.
 * Ambient bookmarks only: no counters, percentages, totals, progress or
 * scoring anywhere in this API. Persistence goes through an injected
 * storage interface compatible with SaveStore ({load(), save(state)}).
 * No DOM/window at module top level so this imports cleanly under node --test.
 */

function nowIso(clock) {
  try {
    if (typeof clock === 'function') {
      const v = clock();
      if (typeof v === 'string') return v;
      if (typeof v === 'number') return new Date(v).toISOString();
      if (v instanceof Date) return v.toISOString();
    }
  } catch {
    /* fall through to wall clock */
  }
  return new Date().toISOString();
}

export class DiscoveryJournal {
  constructor({
    places = [],
    storage = null,
    store = null,
    lingerRadius = 20,
    lingerSeconds = 8,
    clock = null,
  } = {}) {
    this.places = [...places];
    this.storage = storage ?? store;
    this.lingerRadius = lingerRadius;
    this.lingerSeconds = lingerSeconds;
    this.clock = clock;
    this.dwell = new Map(); // placeId -> seconds accumulated
    this.byId = new Map(); // placeId -> entry {placeId, arrivedAt, note}
    if (this.storage) this.restore();
  }

  restore() {
    if (!this.storage) return;
    let saved = null;
    try {
      saved = this.storage.load();
    } catch {
      return;
    }
    if (!saved) return;
    const list = Array.isArray(saved) ? saved : saved.journal?.entries ?? saved.entries ?? [];
    for (const e of list) {
      if (e && typeof e.placeId === 'string' && !this.byId.has(e.placeId)) {
        this.byId.set(e.placeId, {
          placeId: e.placeId,
          arrivedAt: e.arrivedAt ?? nowIso(this.clock),
          note: e.note ?? e.placeId,
        });
      }
    }
  }

  persist() {
    if (!this.storage) return null;
    try {
      return this.storage.save({ journal: { entries: this.entries } });
    } catch {
      return null;
    }
  }

  get entries() {
    return [...this.byId.values()].map((e) => ({ ...e }));
  }

  has(placeId) {
    return this.byId.has(placeId);
  }

  get(placeId) {
    const e = this.byId.get(placeId);
    return e ? { ...e } : null;
  }

  addPlace(place) {
    if (place && place.id && !this.places.some((p) => p.id === place.id)) {
      this.places.push(place);
    }
  }

  /* Returns newly recorded entries this tick (usually 0 or 1). */
  update(dt, playerPosition, timestamp = null) {
    if (!playerPosition) return [];
    const step = Math.max(0, dt);
    const fresh = [];
    for (const place of this.places) {
      if (!place || typeof place.id !== 'string') continue;
      if (this.byId.has(place.id)) continue;
      const pos = place.position ?? { x: place.x ?? 0, z: place.z ?? 0 };
      const radius = place.radius ?? this.lingerRadius;
      const need = place.lingerSeconds ?? this.lingerSeconds;
      const d = Math.hypot(pos.x - playerPosition.x, pos.z - playerPosition.z);
      if (d <= radius) {
        const acc = (this.dwell.get(place.id) ?? 0) + step;
        this.dwell.set(place.id, acc);
        if (acc >= need) {
          const entry = {
            placeId: place.id,
            arrivedAt: timestamp ?? nowIso(this.clock),
            note: place.note ?? place.name ?? place.id,
          };
          this.byId.set(place.id, entry);
          this.dwell.delete(place.id);
          fresh.push({ ...entry });
          this.persist();
        }
      } else {
        this.dwell.set(place.id, 0);
      }
    }
    return fresh;
  }

  clear() {
    this.byId.clear();
    this.dwell.clear();
    this.persist();
  }

  destroy() {
    this.dwell.clear();
  }
}
