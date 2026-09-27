/* Handles specialist-owned meshes; registry never constructs a vehicle model. */
export class VehicleRegistry {
 constructor({scene,factory,collisionWorld}){this.scene=scene;this.factory=factory;this.collisionWorld=collisionWorld;this.handles=new Map();this.serial=0}
 spawnParked({kind,position,heading=0,id=`parked:${++this.serial}`}){const h=this.factory.spawnVehicle({scene:this.scene,x:position.x,z:position.z,yaw:heading,kind});if(!h||!h.object||!h.radius||typeof h.setPose!=='function')throw new Error('invalid specialist vehicle handle');
  const handle={id,object:h.object,radius:h.radius,kind,position:{...position},heading,occupied:false,raw:h,setPose:(p,yaw)=>{h.setPose(p.x,p.z,yaw);handle.position={...p};handle.heading=yaw;this.collisionWorld.setDynamic(id,p,h.radius)},setOccupied:(seat,occupied)=>{handle.occupied=occupied;handle.seat=occupied?seat:null;handle.object.visible=true}};
  this.handles.set(id,handle);this.collisionWorld.setDynamic(id,position,h.radius);return handle}
 get(id){return this.handles.get(id)||null}
 queryNearby(position,radius){return [...this.handles.values()].filter(h=>Math.hypot(h.position.x-position.x,h.position.z-position.z)<=radius+h.radius)}
 nearestEnterable(position,maxDistance){return this.queryNearby(position,maxDistance).filter(h=>!h.occupied).sort((a,b)=>Math.hypot(a.position.x-position.x,a.position.z-position.z)-Math.hypot(b.position.x-position.x,b.position.z-position.z))[0]||null}
 remove(id){const h=this.handles.get(id);if(!h)return;this.collisionWorld.removeDynamic(id);h.raw.dispose?.();this.handles.delete(id)}
 destroy(){for(const id of [...this.handles.keys()])this.remove(id)}
}
