/* Transitional modular overlay on recovered RC2: not yet original editable scene source. */
import "../public/assets/index-DiQvZg7H.css";
import {addCatalogFurnitureDensity} from "./catalog-furniture-density.js";
import {addSector12Housing} from "./sector12-v90-housing.js";
import {WorldRuntime} from "./world/WorldRuntime.js";
// RC2's existing RAF is the ONLY scheduler while this transitional bundle runs.
// The world query facade is connected here without owning a second RAF or camera.
window.__ansalWorldReady=(scene,roads,colliders,legacyPoi)=>{
  const pois=legacyPoi.map(({id,name,x,z})=>({id,name,position:{x,z},radius:18}));
  const world=new WorldRuntime({scene,roads,colliders,pois});
  window.__ansalWorldContext=world.getSceneContext();
  window.__ansalWorldTick=dt=>world.update(dt);
};
window.__ansalFurnitureReady=(scene,roads)=>addCatalogFurnitureDensity(scene,roads);
window.__ansalHousingReady=(scene,roads,boundary,colliders,game)=>addSector12Housing(scene,roads,boundary,colliders,game);
import "./recovered/runtime-v65b-furniture-hook.min.js";
