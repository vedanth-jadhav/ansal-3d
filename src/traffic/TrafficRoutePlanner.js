/* Exact-vertex OSM junction turns for existing kinematic vehicles. No new
 * vehicle meshes; path changes stay on mapped centerlines and inherit the
 * existing lane-offset treatment. Reject unknown one-way/access transitions. */
const key=p=>`${Math.round(p[0]*100)/100},${Math.round(p[1]*100)/100}`;
const dist=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
const makePath=(points)=>{const cum=[0];for(let i=1;i<points.length;i++)cum.push(cum[i-1]+dist(points[i-1],points[i]));return {points:points.map(([x,z])=>({x,y:0,z})),cum,length:cum.at(-1)}};
function sample(path,d){let points=path.points,cum=path.cum;if(!points?.length)return null;d=Math.max(0,Math.min(path.length,d));let i=0;while(i<cum.length-2&&cum[i+1]<d)i++;let f=(d-cum[i])/Math.max(.001,cum[i+1]-cum[i]);return {x:points[i].x+(points[i+1].x-points[i].x)*f,z:points[i].z+(points[i+1].z-points[i].z)*f}}
export class TrafficRoutePlanner {
 constructor({roads,freezeZones=[{x:-322,z:61,radius:150}]}){this.roads=roads;this.byId=new Map(roads.map(r=>[String(r.id),r]));this.junctions=new Map();this.freezeZones=freezeZones;this.stats={turns:0,blocked:0,unknown:0};
  let vertices=new Map();for(const r of roads){if(!['residential','unclassified','tertiary','tertiary_link','service'].includes(r.tags?.highway))continue;for(let i=0;i<r.coordinates.length;i++){let p=r.coordinates[i],k=key(p);if(!vertices.has(k))vertices.set(k,{point:p,roads:[]});vertices.get(k).roads.push({road:r,index:i})}}
  for(const [k,v] of vertices)if(new Set(v.roads.map(x=>x.road.id)).size>=2&&!freezeZones.some(f=>dist(v.point,[f.x,f.z])<f.radius))this.junctions.set(k,v)
 }
 candidates(roadId,atIndex){const road=this.byId.get(String(roadId));if(!road||atIndex<0||atIndex>=road.coordinates.length)return [];
  const j=this.junctions.get(key(road.coordinates[atIndex]));if(!j)return [];
  const options=[];for(const ref of j.roads){if(ref.road.id===road.id)continue;const target=ref.road,oneway=target.tags?.oneway==='yes';
   for(const direction of [1,-1]){if(direction<0&&oneway)continue;let next=ref.index+direction;if(next<0||next>=target.coordinates.length)continue;
    const p=target.coordinates[ref.index],q=target.coordinates[next];if(dist(p,q)<2)continue;
    options.push({road:target,index:ref.index,direction,next,point:p})
   }
  }return options}
 nextTurn(vehicle,seed=0){const road=this.byId.get(String(vehicle.road?.id));if(!road||vehicle.dir<0)return null;const total=road.coordinates.length;
  const current=vehicle.path?.points;if(!current?.length)return null;
  const end=current.at(-1),nearest=road.coordinates.reduce((best,p,i)=>{const d=Math.hypot(p[0]-end.x,p[1]-end.z);return d<best.d?{d,i}:best},{d:Infinity,i:-1});
  if(nearest.d>15)return null;
  if(nearest.i!==road.coordinates.length-1)return null;const choices=this.candidates(road.id,nearest.i);if(!choices.length)return null;
  choices.sort((a,b)=>String(a.road.id).localeCompare(String(b.road.id))||a.direction-b.direction);
  return choices[Math.abs(seed)%choices.length]
 }
 buildTurnPath(choice,{lookAhead=5,laneSide=-1}={}){let coords=choice.road.coordinates,points=[coords[choice.index]],i=choice.index;while(points.length<=lookAhead){i+=choice.direction;if(i<0||i>=coords.length)break;points.push(coords[i])}
  if(points.length<2)return null;const offset=choice.road.tags?.highway==='residential'?1.55:2.2;
  const shifted=points.map((p,k)=>{let a=points[Math.max(0,k-1)],b=points[Math.min(points.length-1,k+1)],dx=b[0]-a[0],dz=b[1]-a[1],n=Math.hypot(dx,dz)||1;return [p[0]-laneSide*dz/n*offset,p[1]+laneSide*dx/n*offset]});return makePath(shifted)
 }
 update(vehicles){for(const [index,v] of vehicles.entries()){
   if(!v.road?.id||!v.path?.length||!Number.isFinite(v.dist)||v.dir<0)continue;
   const remaining=v.path.length-v.dist;if(remaining>4)continue;
   const choice=this.nextTurn(v,index+this.stats.turns);if(!choice)continue;
   const path=this.buildTurnPath(choice);if(!path)continue;
   const start=sample(path,0),here=v.obj.position;if(Math.hypot(start.x-here.x,start.z-here.z)>14){this.stats.blocked++;continue}
   v.path=path;v.dist=0;v.dir=1;v.road={...v.road,id:choice.road.id,points:choice.road.coordinates};v.stops=[];v.stoppedAt=new Set();this.stats.turns++
  }return this.stats}
 snapshot(){return {...this.stats,junctions:this.junctions.size}}
}
