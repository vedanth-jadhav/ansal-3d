import {VehicleRegistry} from '../vehicles/VehicleRegistry.js';
import {VehicleFactory} from '../vehicles/VehicleFactory.js';
import {DrivingController} from './DrivingController.js';
/* Bridged to RC2's existing scheduler and foot controller until scene ownership moves. */
export class DriveExperience {
 constructor({scene,camera,foot,world}){
  this.scene=scene;this.camera=camera;this.foot=foot;this.world=world;this.registry=new VehicleRegistry({scene,factory:VehicleFactory,collisionWorld:world.collisionWorld});
  this.mode='walk';this.input=new Set();this.paused=false;this.enabled=false;this.pending=false;this.elapsed=0;this.accumulator=0;this.eventCount=0;this.events=[];
  this.mountUI();this.ui.style.display='none';this.spawn();
  this.down=e=>{if(!this.enabled)return;if(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code)&&this.mode==='drive'){this.input.add(e.code);e.preventDefault()}if(e.code==='KeyE'&&!e.repeat)this.toggle()};
  this.up=e=>this.input.delete(e.code);this.blur=()=>this.input.clear();this.visibility=()=>{if(document.hidden)this.blur()};
  window.addEventListener('keydown',this.down);window.addEventListener('keyup',this.up);window.addEventListener('blur',this.blur);document.addEventListener('visibilitychange',this.visibility);
 }
 mountUI(){const root=document.createElement('div');root.id='driveHud';root.innerHTML='<button id="driveAction" type="button" aria-label="Enter car">ENTER CAR · E</button><div id="driveSpeed" aria-live="off"></div><div id="drivePedals"><button data-drive="left" aria-label="Steer left">◀</button><button data-drive="right" aria-label="Steer right">▶</button><button data-drive="brake" aria-label="Brake">BRAKE</button><button data-drive="gas" aria-label="Accelerate">GO</button></div><div id="driveNotice" aria-live="polite"></div>';
  document.body.appendChild(root);this.ui=root;root.querySelector('#driveAction').onclick=()=>this.toggle();
  for(const btn of root.querySelectorAll('[data-drive]')){const key=btn.dataset.drive;btn.addEventListener('pointerdown',e=>{btn.setPointerCapture(e.pointerId);this.input.add(key);e.preventDefault()});for(const t of ['pointerup','pointercancel','lostpointercapture'])btn.addEventListener(t,()=>this.input.delete(key))}
 }
 spawn(){const p=this.foot.getPosition(),road=this.world.roadNetwork,collision=this.world.collisionWorld;
  // Try nearby road-side points without substituting unverified properties.
  for(let d=6;d<=30;d+=3)for(let a=0;a<12;a++){const pos={x:p.x+Math.cos(a*Math.PI/6)*d,z:p.z+Math.sin(a*Math.PI/6)*d};const spot=road.sampleParkingNear(pos,7);
   if(!spot||Math.hypot(spot.position.x-p.x,spot.position.z-p.z)>32||!collision.isFree(spot.position,2.3))continue;
   const handle=this.registry.spawnParked({id:'player:hatchback',kind:'hatchback',position:spot.position,heading:spot.heading});this.vehicle=handle;return;
  }
  this.notice('No clear parking space nearby');
 }
 notice(text){this.ui.querySelector('#driveNotice').textContent=text;clearTimeout(this.noticeTimer);this.noticeTimer=setTimeout(()=>this.ui.querySelector('#driveNotice').textContent='',2500)}
 toggle(){if(!this.enabled||!this.vehicle||this.mode==='transition')return;const p=this.foot.getPosition(),h=this.vehicle;
  if(this.mode==='walk'){
   if(Math.hypot(p.x-h.position.x,p.z-h.position.z)>7){this.notice('Get closer to the car');return}
   this.mode='transition';this.elapsed=.4;this.pending='enter';this.foot.setEnabled(false);
  }else if(this.mode==='drive'){
   if(Math.abs(this.driver.speed)>=1.5){this.notice('Stop before getting out');return}
   const sides=[-1,1].map(side=>({x:h.position.x+Math.cos(h.heading)*side*(h.radius+1),z:h.position.z-Math.sin(h.heading)*side*(h.radius+1)}));
   const clear=sides.find(v=>this.world.collisionWorld.isFree(v,.4,h.id));if(!clear){this.notice('Stop somewhere clear');return}
   this.mode='transition';this.elapsed=.35;this.pending={exit:clear};this.input.clear();
  }
 }
 finish(){const h=this.vehicle;if(this.pending==='enter'){
   h.setOccupied(0,true);this.avatar=this.scene.getObjectByName('Sakura pedestrian');if(this.avatar)this.avatar.visible=false;this.foot.setEnabled(false);
   this.driver=new DrivingController({collisionWorld:this.world.collisionWorld,roadNetwork:this.world.roadNetwork,registry:this.registry,vehicle:h});this.driver.damage=this.savedVehicleDamage||0;this.mode='drive';
  }else if(this.pending?.exit){const p=this.pending.exit;h.setOccupied(0,false);this.foot.warp(p.x,p.z,h.heading);if(this.avatar)this.avatar.visible=true;this.foot.setEnabled(true);this.mode='walk'}
  this.pending=false;this.onChange?.();
 }
 sample(){const has=(...keys)=>keys.some(k=>this.input.has(k));return {forward:+has('KeyW','ArrowUp','gas')-+has('KeyS','ArrowDown'),turn:+has('KeyD','ArrowRight','right')-+has('KeyA','ArrowLeft','left'),brake:has('Space','brake')}}
 tick(dt){if(!this.enabled||this.paused||document.hidden)return;if(this.mode==='transition'){this.elapsed-=Math.min(dt,.05);if(this.elapsed<=0)this.finish()}
  if(this.mode==='drive'&&!document.hidden){this.accumulator=Math.min(this.accumulator+Math.min(dt,.05),4/60);let steps=0;while(this.accumulator>=1/60&&steps++<4){const impact=this.driver.update(1/60,this.sample());for(const e of impact)this.events.push({...e,eventId:`drive:${++this.eventCount}`});this.accumulator-=1/60}
   const h=this.vehicle,dist=7+Math.min(3,Math.abs(this.driver.speed)*.15),eye={x:h.position.x-Math.sin(h.heading)*dist,y:4,z:h.position.z-Math.cos(h.heading)*dist};const a=1-Math.exp(-Math.min(dt,.05)*7);this.camera.position.x+=(eye.x-this.camera.position.x)*a;this.camera.position.y+=(eye.y-this.camera.position.y)*a;this.camera.position.z+=(eye.z-this.camera.position.z)*a;this.camera.lookAt(h.position.x+Math.sin(h.heading)*2,1.1,h.position.z+Math.cos(h.heading)*2);
  }
  const p=this.mode==='drive'?this.vehicle.position:this.foot.getPosition();const near=this.vehicle&&Math.hypot(p.x-this.vehicle.position.x,p.z-this.vehicle.position.z)<8;
  this.ui.classList.toggle('active',this.mode==='drive');this.ui.classList.toggle('near',this.mode==='walk'&&near);this.ui.querySelector('#driveAction').textContent=this.mode==='drive'?'EXIT CAR · E':'ENTER CAR · E';this.ui.querySelector('#driveSpeed').textContent=this.mode==='drive'?`${Math.round(Math.abs(this.driver.speed)*3.6)} km/h · ${this.driver.damage?'Damage '+Math.round(this.driver.damage):'Drive carefully'}`:'';
 }
 onExitOverview(){this.enabled=false;this.ui.style.display='none';this.input.clear();if(this.mode==='drive'){this.driver.speed=0;this.vehicle.setOccupied(0,false);this.foot.warp(this.vehicle.position.x,this.vehicle.position.z,this.vehicle.heading);if(this.avatar)this.avatar.visible=true;this.foot.setEnabled(false);this.mode='walk';this.onChange?.()}else if(this.mode==='transition'){this.pending=false;this.mode='walk';this.foot.setEnabled(false);if(this.avatar)this.avatar.visible=true}}
 drainEvents(){return this.events.splice(0)}
 setEnabled(value){this.enabled=!!value;this.ui.style.display=this.enabled?'':'none';if(!this.enabled)this.input.clear()}
 setPaused(value){this.paused=!!value;if(this.paused)this.input.clear()}
 destroy(){clearTimeout(this.noticeTimer);window.removeEventListener('keydown',this.down);window.removeEventListener('keyup',this.up);window.removeEventListener('blur',this.blur);document.removeEventListener('visibilitychange',this.visibility);this.ui.remove();if(this.avatar)this.avatar.visible=true;this.registry.destroy()}
}
