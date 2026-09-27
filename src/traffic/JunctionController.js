/* Deterministic kinematic junction reservation for the existing ambient pool.
 * Only exact OSM shared vertices are intersections. Missing access/turn rules
 * stay unresolved; this is yield/priority behavior, not a legal routing map. */
const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const point=(x)=>Array.isArray(x)?{x:x[0],z:x[1]}:{x:x.x,z:x.z};
const key=(p)=>`${Math.round(p.x*100)/100},${Math.round(p.z*100)/100}`;
export class JunctionController {
 constructor({roads,collisionWorld,freezeZones=[{x:-322,z:61,radius:150}]}){
  this.roads=roads;this.world=collisionWorld;this.freezeZones=freezeZones;this.junctions=[];this.state=new Map();
  const vertices=new Map();for(const road of roads){if(!['residential','unclassified','tertiary','tertiary_link','service'].includes(road.tags?.highway))continue;
   for(const [i,p] of road.coordinates.entries()){const pos=point(p),k=key(pos);if(!vertices.has(k))vertices.set(k,{position:pos,roads:new Map()});vertices.get(k).roads.set(String(road.id),{road,index:i})}
  }
  for(const [k,v] of vertices){if(v.roads.size<2||freezeZones.some(f=>dist(v.position,f)<f.radius))continue;this.junctions.push({id:k,position:v.position,roads:[...v.roads.values()]})}
  this.junctions.sort((a,b)=>a.id.localeCompare(b.id));this.stats={junctions:this.junctions.length,waiting:0,reserved:0}
 }
 nearestJunction(position,maxDistance=12){let best=null;for(const j of this.junctions){const d=dist(position,j.position);if(d<=maxDistance&&(!best||d<best.distance))best={junction:j,distance:d}}return best}
 update(vehicles,dt,hero=null){let waiting=0,reserved=0;
  for(const [id,s] of this.state)if(s.time<=0||!vehicles.includes(s.vehicle))this.state.delete(id);
  for(const s of this.state.values())s.time-=Math.min(dt,.05);
  const approaches=[];for(const [i,v] of vehicles.entries()){
   const hit=this.nearestJunction(v.obj.position,13);if(!hit)continue;
   const dx=hit.junction.position.x-v.obj.position.x,dz=hit.junction.position.z-v.obj.position.z,angle=v.obj.rotation.y||0,heading={x:Math.sin(angle),z:Math.cos(angle)};
   // The vehicle must be approaching, not leaving. At low speed, reserve a
   // crossing only when the path's next sample heads toward this vertex.
   const headingDot=(dx*heading.x+dz*heading.z)/Math.max(hit.distance,.001);
   if(hit.distance>3&&headingDot<.15)continue;
   approaches.push({i,v,j:hit.junction,d:hit.distance})
  }
  approaches.sort((a,b)=>a.d-b.d||a.i-b.i);
  for(const a of approaches){const current=this.state.get(a.j.id);
   if(current&&current.vehicle!==a.v){a.v.stopTimer=Math.max(a.v.stopTimer,.15);a.v.speed=Math.min(a.v.speed,.3);waiting++;continue}
   if(hero&&dist(hero.position,a.j.position)<6){a.v.stopTimer=Math.max(a.v.stopTimer,.15);a.v.speed=Math.min(a.v.speed,.3);waiting++;continue}
   if(!current){this.state.set(a.j.id,{vehicle:a.v,time:1.5});reserved++}else current.time=Math.max(current.time,.2)
  }
  this.stats={junctions:this.junctions.length,waiting,reserved,active:this.state.size};return this.stats
 }
 snapshot(){return {...this.stats}}
 destroy(){this.state.clear()}
}
