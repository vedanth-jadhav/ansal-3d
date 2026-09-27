/* Transitional modular overlay on recovered RC2: not yet original editable scene source. */
import "../public/assets/index-DiQvZg7H.css";
import {addCatalogFurnitureDensity} from "./catalog-furniture-density.js";
import {addSector12Housing} from "./sector12-v90-housing.js";
import {WorldRuntime} from "./world/WorldRuntime.js";
// RC2's existing RAF is the ONLY scheduler while this transitional bundle runs.
// The world query facade is connected here without owning a second RAF or camera.
window.__ansalWorldReady=(scene,roads,colliders)=>{
  const world=new WorldRuntime({scene,roads,colliders});
  window.__ansalWorldContext=world.getSceneContext();
  window.__ansalWorldTick=dt=>world.update(dt);
};
window.__ansalFurnitureReady=(scene,roads)=>addCatalogFurnitureDensity(scene,roads);
window.__ansalHousingReady=(scene,roads,boundary,colliders,game)=>addSector12Housing(scene,roads,boundary,colliders,game);
import "./recovered/runtime-v65b-furniture-hook.min.js";
// --- Workstream B (ambient immersive life systems, transitional) ---
// Additive only: exposes pure-logic ambient brains without owning the RAF,
// camera or input. Instantiation happens in the modular rebuild; the RC2
// bundle remains the sole scheduler until then.
import {TrafficDirector} from "./ambient/TrafficDirector.js";
import {StreetLife} from "./ambient/StreetLife.js";
import {DayNight} from "./ambient/DayNight.js";
import {Soundscape} from "./ambient/Soundscape.js";
import {DiscoveryJournal} from "./ambient/DiscoveryJournal.js";
import {ambientLabelFor, startChromeSync} from "./ambient/AmbientChrome.js";
import {createDayNightApplier} from "./ambient/DayNightApplier.js";
// Shared ambient clock (pure logic). Advanced ONLY by the chrome interval below
// (single source); the scene applier reads it via the existing world tick.
const ambientClock = new DayNight({ hour: 10 });
let dayNightApplier = null;
const prevWorldReady = window.__ansalWorldReady;
let tickChained = false;
window.__ansalWorldReady = (scene, roads, colliders) => {
  prevWorldReady(scene, roads, colliders);
  try {
    dayNightApplier = createDayNightApplier({ scene, clock: ambientClock });
    window.__ansalAmbient.applier = dayNightApplier;
  } catch { /* scene not tintable; ambient HUD still works */ }
  // Chain the applier onto the existing tick (once). Throttled internally,
  // and every call is guarded so RC2's frame can never break.
  if (!tickChained) {
    tickChained = true;
    const prevTick = window.__ansalWorldTick;
    window.__ansalWorldTick = (dt) => {
      prevTick?.(dt);
      try { dayNightApplier?.update(); } catch { /* never break RC2's frame */ }
    };
  }
};
window.__ansalSetHour = (h) => { ambientClock.setHour(h); dayNightApplier?.setHour(h); };
window.__ansalAmbient={TrafficDirector,StreetLife,DayNight,Soundscape,DiscoveryJournal,clock:ambientClock};
// Ambient HUD: de-mission the RC2 quest counter into a place/time label.
// DOM-text only (1s interval + MutationObserver); owns no rendering, camera or input.
if (typeof document !== 'undefined') {
  let last = 0;
  const tickClock = () => {
    const now = performance.now();
    ambientClock.update(Math.min(5, (now - last) / 1000) || 0);
    last = now;
    // Fallback paint if RC2's tick never fires; throttled no-op otherwise.
    try { dayNightApplier?.update(); } catch { /* never break the page */ }
  };
  tickClock();
  setInterval(tickClock, 1000);
  startChromeSync({
    doc: document,
    getLabel: () => ambientLabelFor({
      areaKey: document.querySelector?.('#travelSelect')?.value || 'regencia',
      hour: ambientClock.hour,
    }),
  });
}
