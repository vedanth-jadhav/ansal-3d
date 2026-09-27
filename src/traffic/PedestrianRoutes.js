import {SidewalkRouter} from './SidewalkRouter.js';
/* Reuses the existing rig/mixer. Scoped path routing adds no geometry or RAF. */
export class PedestrianRoutes {
 constructor({layer,world}){
  this.layer=layer;this.world=world;this.router=new SidewalkRouter({roads:world.roads||[],roadNetwork:world.roadNetwork,collisionWorld:world.collisionWorld});this.assigned=new Map();this.stats={routed:0,waiting:0,unroutable:0};
  if(!layer?.npcs?.npcs)return;
  for(const [i,n] of layer.npcs.npcs.entries()){
   if(n.mode!=='walk'&&n.mode!=='jog')continue;
   let route=this.router.itinerary(n.obj.position,i);if(!route){route=this.router.itinerary(n.obj.position,i,{allowRelocate:true})||this.router.fallbackItinerary(n.obj.position,i);if(route){n.obj.position.x=route.points[0].x;n.obj.position.z=route.points[0].z;this.stats.relocated=(this.stats.relocated||0)+1}}if(!route){n.mode='safeIdle';n.idleTimer=1e9;this.stats.unroutable++;continue}
   this.assigned.set(n,{route,index:0,wait:0,blocked:0,seed:i});n.mode='routeWalk';n.routeMoveSpeed=n.speed;this.stats.routed++;
  }
 }
 update(dt,playerPosition,traffic){if(!this.layer||!this.assigned.size)return;const active=[...(traffic?.vehicles||[])];let waiting=0;
  for(const [n,s] of this.assigned){if(!n.obj.visible)continue;let points=s.route.points,target=points[s.index+1];if(!target){const next=this.router.itinerary(n.obj.position,s.seed+1);if(next){s.route=next;s.index=0;s.seed++;points=next.points;target=points[1]}else{waiting++;continue}}
   if(s.wait>0){s.wait=Math.max(0,s.wait-dt);waiting++;continue}
   const pos=n.obj.position,dx=target.x-pos.x,dz=target.z-pos.z,dist=Math.hypot(dx,dz);if(dist<.3){s.index++;continue}
   const danger=active.some(v=>Math.hypot(v.obj.position.x-pos.x,v.obj.position.z-pos.z)<5.5);
   if(danger){s.wait=.45;waiting++;continue}
   const step=Math.min(dist,Math.min(.05,dt)*n.routeMoveSpeed),next={x:pos.x+dx/dist*step,z:pos.z+dz/dist*step};
   const nearRoad=this.world.roadNetwork.nearest(next,{maxDistance:10}),half={residential:3.5,service:2.5,unclassified:5,tertiary:6,tertiary_link:4.5}[nearRoad?.kind]??3.5;if((nearRoad&&nearRoad.distance<half+.3)||!this.world.collisionWorld.isFree(next,.4)){s.blocked++;s.wait=.6;waiting++;if(s.blocked>5){this.assigned.delete(n);n.mode='safeIdle';n.idleTimer=1e9;this.stats.unroutable++}continue}
   s.blocked=0;pos.x=next.x;pos.z=next.z;const desired=Math.atan2(dx,dz);let diff=(desired-n.obj.rotation.y+Math.PI*3)%(Math.PI*2)-Math.PI;n.obj.rotation.y+=Math.max(-.13,Math.min(.13,diff));
  }
  this.stats.waiting=waiting;
 }
 snapshot(){return {...this.stats,paths:this.router.paths.length}}
 destroy(){this.assigned.clear()}
}
