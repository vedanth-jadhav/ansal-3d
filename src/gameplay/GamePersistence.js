import {SaveStore} from './SaveStore.js';
export class GamePersistence {
 constructor({drive,mission,world,storage=globalThis.localStorage}){this.drive=drive;this.mission=mission;this.world=world;this.store=new SaveStore({storage});this.last=0;this.load();
  mission.onChange=()=>this.save();this.leave=()=>this.save();window.addEventListener('pagehide',this.leave);document.addEventListener('visibilitychange',this.leave);
 }
 load(){const saved=this.store.load();if(!saved)return;this.mission.restore(saved.missions);
  const v=saved.vehicle,p=v?.position;
  if(v&&p&&Number.isFinite(p.x)&&Number.isFinite(p.z)&&Number.isFinite(v.heading)&&this.world.collisionWorld.isFree(p,2.3,this.drive.vehicle?.id)&&this.world.roadNetwork.nearest(p,{mode:'drive',maxDistance:8})&&this.drive.vehicle){this.drive.vehicle.setPose(p,v.heading);this.drive.savedVehicleDamage=Math.max(0,Math.min(100,Number(v.damage)||0))}
  const foot=saved.player?.position;if(foot&&Number.isFinite(foot.x)&&Number.isFinite(foot.z)&&Number.isFinite(saved.player.heading)&&this.world.collisionWorld.isFree(foot,.4))this.savedFoot={position:foot,heading:saved.player.heading};
 }
 restoreFoot(){if(!this.savedFoot)return;const p=this.savedFoot;this.drive.foot.warp(p.position.x,p.position.z,p.heading);this.savedFoot=null}
 save(){if(!this.drive?.vehicle)return;const v=this.drive.vehicle,f=this.drive.foot.getPosition(),p=this.drive.mode==='drive'?v.position:{x:f.x,z:f.z};let state={player:{position:p,heading:this.drive.mode==='drive'?v.heading:this.drive.scene.getObjectByName('Sakura pedestrian')?.rotation.y??v.heading,mode:'onFoot'},vehicle:{position:v.position,heading:v.heading,damage:this.drive.driver?.damage??this.drive.savedVehicleDamage??0},missions:this.mission.runtime.snapshot()};const result=this.store.save(state);if(!result.ok)this.mission.root.querySelector('#jobStrip').textContent="Progress won't save on this device"}
 destroy(){this.save();window.removeEventListener('pagehide',this.leave);document.removeEventListener('visibilitychange',this.leave)}
}
