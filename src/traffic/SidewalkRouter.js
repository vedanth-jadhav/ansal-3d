/* Route the existing pedestrian pool along offset OSM road edges. These are
 * inferred walkable corridors, not surveyed pavements. No unsurveyed crossing
 * edges are created: a path stays on one side of its mapped road. */
const length=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const lerp=(a,b,t)=>({x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t});
const key=(x,z)=>`${Math.round(x*10)/10},${Math.round(z*10)/10}`;
export class SidewalkRouter {
 constructor({roads,collisionWorld,roadNetwork=null,freezeZones=[{x:-322,z:61,radius:150}],clearance=.45}){
  this.world=collisionWorld;this.roadNetwork=roadNetwork;this.clearance=clearance;this.freezeZones=freezeZones;this.paths=[];
  for(const road of roads){if(!['residential','service','unclassified','tertiary','tertiary_link'].includes(road.tags?.highway)||road.coordinates.length<2)continue;
   const width={residential:7,service:5,unclassified:10,tertiary:12,tertiary_link:9}[road.tags.highway],center=road.coordinates.map(([x,z])=>({x,z}));
   for(const side of [-1,1]){
    const points=center.map((p,i)=>{let a=center[Math.max(0,i-1)],b=center[Math.min(i+1,center.length-1)],dx=b.x-a.x,dz=b.z-a.z,n=Math.hypot(dx,dz)||1,offset=width/2+1.35;return {x:p.x-side*dz/n*offset,z:p.z+side*dx/n*offset}});
    const safe=(p)=>{if(this.freezeZones.some(f=>length(p,f)<f.radius)||!this.world.isFree(p,this.clearance))return false;
     if(this.roadNetwork){const hit=this.roadNetwork.nearest(p,{maxDistance:9}),roadHalf={residential:3.5,service:2.5,unclassified:5,tertiary:6,tertiary_link:4.5}[hit?.kind]??3.5;if(hit&&hit.distance<roadHalf+.55)return false}return true};
    const graph=new Map();for(let i=0;i<points.length-1;i++){let a=points[i],b=points[i+1],dist=length(a,b);if(dist<.1)continue;
     const sampled=Array.from({length:Math.max(2,Math.ceil(dist/2))+1},(_,j)=>lerp(a,b,j/Math.max(2,Math.ceil(dist/2))));
     if(!sampled.every(safe))continue;const ka=key(a.x,a.z),kb=key(b.x,b.z);for(const [from,to] of [[ka,kb],[kb,ka]]){if(!graph.has(from))graph.set(from,[]);graph.get(from).push({to,cost:dist})}
    }
    if(graph.size>=2)this.paths.push({id:`${road.id}:${side}`,wayId:String(road.id),side,points,graph});
   }
  }
 }
 routeOn(path,fromIndex,toIndex){const points=path.points,n=points.length;if(fromIndex<0||fromIndex>=n||toIndex<0||toIndex>=n)return null;
  const start=key(points[fromIndex].x,points[fromIndex].z),goal=key(points[toIndex].x,points[toIndex].z);if(!path.graph.has(start)||!path.graph.has(goal))return null;
  let queue=[[0,start]],cost=new Map([[start,0]]),prev=new Map();while(queue.length){queue.sort((a,b)=>b[0]-a[0]);let [d,k]=queue.pop();if(k===goal)break;if(d!==cost.get(k))continue;for(const e of path.graph.get(k)||[])if(d+e.cost<(cost.get(e.to)??Infinity)){cost.set(e.to,d+e.cost);prev.set(e.to,k);queue.push([d+e.cost,e.to])}}
  if(!cost.has(goal))return null;const lookup=new Map(points.map(p=>[key(p.x,p.z),p]));let route=[];for(let k=goal;k;k=prev.get(k))route.push(lookup.get(k));route.reverse();return {points:route,distance:cost.get(goal),wayId:path.wayId,side:path.side}
 }
 nearest(position,maxDistance=8){let best=null;for(const path of this.paths)for(let i=0;i<path.points.length-1;i++){
  const a=path.points[i],b=path.points[i+1],dx=b.x-a.x,dz=b.z-a.z,den=dx*dx+dz*dz;if(den<.01)continue;
  const t=Math.max(0,Math.min(1,((position.x-a.x)*dx+(position.z-a.z)*dz)/den)),p=lerp(a,b,t),d=length(position,p);
  if(d<=maxDistance&&(!best||d<best.distance))best={path,index:i,point:p,distance:d,t}
 }return best}
 itinerary(from,seed=0,{allowRelocate=false}={}){let hit=this.nearest(from,allowRelocate?50:6);if(!hit)return null;
  const {path,index,point}=hit;if(!this.world.isFree(point,this.clearance))return null;
  const approach=length(from,point),n=Math.max(1,Math.ceil(approach));for(let j=1;!allowRelocate&&j<=n;j++){
   const p=lerp(from,point,j/n);if(!this.world.isFree(p,this.clearance))return null;
   if(this.roadNetwork){const road=this.roadNetwork.nearest(p,{maxDistance:8}),half={residential:3.5,service:2.5,unclassified:5,tertiary:6,tertiary_link:4.5}[road?.kind]??3.5;if(road&&road.distance<half+.3)return null}
  }
  let candidates=[];for(let i=0;i<path.points.length;i++){const d=length(path.points[i],point);if(d<25||d>160)continue;
   const a=key(path.points[index].x,path.points[index].z),b=key(path.points[index+1].x,path.points[index+1].z),routeA=this.routeOn(path,index,i),routeB=this.routeOn(path,index+1,i),routes=[routeA,routeB].filter(Boolean);
   for(const r of routes){const entry=r.points[0],link=(key(entry.x,entry.z)===a||key(entry.x,entry.z)===b)&&path.graph.get(a)?.some(e=>e.to===b);
    if(!link)continue;const points=allowRelocate?[point,...r.points]:[from,point,...r.points];const distance=points.slice(1).reduce((sum,p,j)=>sum+length(points[j],p),0);if(distance>=25&&distance<200)candidates.push({...r,points,distance})
   }
  }
  if(!candidates.length)return null;return candidates[Math.abs(seed)%candidates.length]
 }
 fallbackItinerary(from,seed=0,maxDistance=70){const choices=[];for(const path of this.paths){for(let i=0;i<path.points.length;i++){const point=path.points[i],d=length(from,point);if(d>maxDistance||!path.graph.has(key(point.x,point.z)))continue;for(const j of [i-4,i+4,i-8,i+8,i-12,i+12]){const r=this.routeOn(path,i,j);if(r&&r.distance>=25&&r.distance<=180)choices.push({r,d})}}}if(!choices.length)return null;choices.sort((a,b)=>a.d-b.d);return choices[Math.abs(seed)%Math.min(choices.length,8)].r}
 probe(position,radius=.4){if(!this.world.isFree(position,radius))return false;
  const hit=this.roadNetwork?.nearest(position,{maxDistance:10});if(hit){const half={residential:3.5,service:2.5,unclassified:5,tertiary:6,tertiary_link:4.5}[hit.kind]??3.5;if(hit.distance<half+.3)return false}return !this.freezeZones.some(f=>length(position,f)<f.radius)
 }
}
