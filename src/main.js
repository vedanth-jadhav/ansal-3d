/* Transitional modular overlay on recovered RC2: not yet original editable scene source. */
import "../public/assets/index-DiQvZg7H.css";
import {addCatalogFurnitureDensity} from "./catalog-furniture-density.js";
import {addSector12Housing} from "./sector12-v90-housing.js";
import './gameplay/drive.css';
import {DriveExperience} from './gameplay/DriveExperience.js';
import {AmbientBridge} from './traffic/AmbientBridge.js';
import {MissionBoard} from './gameplay/MissionBoard.js';
import {GamePersistence} from './gameplay/GamePersistence.js';
import {WorldRuntime} from "./world/WorldRuntime.js";
import {addSn3FResidential} from "./districts/recovered/sn3-f-builder.js";
import {addCBlockResidential} from "./districts/recovered/c-block-builder.js";
// RC2's existing RAF is the ONLY scheduler while this transitional bundle runs.
// The world query facade is connected here without owning a second RAF or camera.
window.__ansalWorldReady=(scene,roads,colliders,legacyPoi)=>{
  const pois=legacyPoi.map(({id,name,x,z})=>({id,name,position:{x,z},radius:18}));
  const world=new WorldRuntime({scene,roads,colliders,pois});
  window.__ansalWorldContext=world.getSceneContext();
  window.__ansalWorldInventory=()=>world.inventory();
  window.__ansalWorldTick=dt=>world.update(dt);
  window.__ansalGameplayReady=(camera,foot)=>{window.__ansalPersistence?.destroy();window.__ansalAmbient?.destroy();window.__ansalDrive?.destroy();window.__ansalDrive=new DriveExperience({scene,camera,foot,world});window.__ansalAmbient=new AmbientBridge({experience:window.__ansalDrive});window.__ansalMission?.destroy();window.__ansalMission=new MissionBoard({world,gameEvents:()=>window.__ansalDrive?.drainEvents()||[],player:()=>{const d=window.__ansalDrive;if(!d)return null;const p=d.mode==='drive'?d.vehicle.position:d.foot.getPosition();return {x:p.x,z:p.z,mode:d.mode==='drive'?'drive':'walk'}}});window.__ansalPersistence=new GamePersistence({drive:window.__ansalDrive,mission:window.__ansalMission,world});window.__ansalDrive.onChange=()=>window.__ansalPersistence?.save();};
  window.__ansalGameplayTick=dt=>{window.__ansalDrive?.tick(dt);window.__ansalMission?.update(dt)};
  window.__ansalGameplayExit=()=>{window.__ansalDrive?.onExitOverview();window.__ansalMission?.setEnabled(false);window.__ansalPersistence?.save()};
  window.__ansalGameplayEnter=()=>{window.__ansalDrive?.setEnabled(true);window.__ansalMission?.setEnabled(true);window.__ansalPersistence?.restoreFoot()};
  window.__ansalGameplayPause=value=>{window.__ansalDrive?.setPaused(value);window.__ansalMission?.setPaused(value)};
  window.__ansalAmbientTick=(layer,dt)=>window.__ansalAmbient?.update(layer,dt);
};
window.__ansalFurnitureReady=(scene,roads)=>addCatalogFurnitureDensity(scene,roads);
window.__ansalHousingReady=(scene,roads,boundary,colliders,game)=>{
  // This method is called inside the existing district mount; all three
  // scoped builders share its OSM boundary and road-mask semantics.
  const v90=addSector12Housing(scene,roads,boundary,colliders,game);
  const within=(x,z)=>{
    const p=boundary?.coordinates||boundary?.geometry?.coordinates||boundary;
    const poly=Array.isArray(p?.[0]?.[0])?p[0]:p;if(!Array.isArray(poly))return true;
    let inside=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){
      const a=poly[i],b=poly[j];if((a[1]>z)!==(b[1]>z)&&x<(b[0]-a[0])*(z-a[1])/(b[1]-a[1])+a[0])inside=!inside;
    }return inside;
  };
  const startScoped=colliders.length;
  const sn3=addSn3FResidential(scene,roads,within,colliders);
  const cb=addCBlockResidential(scene,roads,within,colliders);
  game?.addColliders(colliders.slice(startScoped));
  return {v90,sn3,cb};
};
import "./recovered/runtime-v65b-furniture-hook.min.js";
