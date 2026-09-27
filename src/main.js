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
window.__ansalAmbient={TrafficDirector,StreetLife,DayNight,Soundscape,DiscoveryJournal};
// Ambient HUD: de-mission the RC2 quest counter into a place/time label.
// DOM-text only (1s interval + MutationObserver); owns no rendering, camera or input.
if (typeof document !== 'undefined') {
  const clock = new DayNight({ hour: 10 });
  let last = 0;
  const tickClock = () => {
    const now = performance.now();
    clock.update(Math.min(5, (now - last) / 1000) || 0);
    last = now;
  };
  tickClock();
  setInterval(tickClock, 1000);
  startChromeSync({
    doc: document,
    getLabel: () => ambientLabelFor({
      areaKey: document.querySelector?.('#travelSelect')?.value || 'regencia',
      hour: clock.hour,
    }),
  });
}
