/* Conservative 2D circle sweep vs static box projections and dynamic circles.
 * Objects without explicit y limits are assumed ground-level blockers. This is
 * a query seam, not a vehicle physics engine or elevation-aware collision. */
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const norm=(x,z)=>{const n=Math.hypot(x,z)||1;return {x:x/n,z:z/n}};
export class CollisionWorld {
 constructor({cellSize=25}={}){this.cellSize=cellSize;this.static=new Map();this.dynamic=new Map();this.grid=new Map()}
 setStatic(id,box){this.static.set(id,{min:{x:box.min.x,z:box.min.z},max:{x:box.max.x,z:box.max.z}});this.reindex()}
 addStaticBoxes(boxes,prefix='static'){for(let i=0;i<boxes.length;i++)this.static.set(`${prefix}:${i}`,{min:{x:boxes[i].min.x,z:boxes[i].min.z},max:{x:boxes[i].max.x,z:boxes[i].max.z}});this.reindex()}
 setDynamic(id,position,radius){this.dynamic.set(id,{position:{...position},radius})}
 removeDynamic(id){this.dynamic.delete(id)}
 reindex(){this.grid.clear();const c=this.cellSize;for(const [id,b] of this.static)for(let x=Math.floor(b.min.x/c);x<=Math.floor(b.max.x/c);x++)for(let z=Math.floor(b.min.z/c);z<=Math.floor(b.max.z/c);z++){
  const k=`${x},${z}`;if(!this.grid.has(k))this.grid.set(k,[]);this.grid.get(k).push(id)
 }}
 candidates(from,to,radius){const out=new Set(),c=this.cellSize;for(let x=Math.floor((Math.min(from.x,to.x)-radius)/c);x<=Math.floor((Math.max(from.x,to.x)+radius)/c);x++)for(let z=Math.floor((Math.min(from.z,to.z)-radius)/c);z<=Math.floor((Math.max(from.z,to.z)+radius)/c);z++)for(const id of this.grid.get(`${x},${z}`)||[])out.add(id);return out}
 isFree(position,radius,excludeId){for(const id of this.candidates(position,position,radius)){if(id===excludeId)continue;const b=this.static.get(id);if(Math.hypot(position.x-clamp(position.x,b.min.x,b.max.x),position.z-clamp(position.z,b.min.z,b.max.z))<radius)return false}
  for(const [id,b] of this.dynamic)if(id!==excludeId&&Math.hypot(position.x-b.position.x,position.z-b.position.z)<radius+b.radius)return false;return true
 }
 sweepCircle(from,to,radius,excludeId){const dx=to.x-from.x,dz=to.z-from.z,total=Math.hypot(dx,dz);if(!total)return {position:{...from}};
  // Swept expanded AABB is a conservative broad collision test. Corner
  // contacts can stop early and need a refined narrow phase before driving.
  let first={t:1,id:null,normal:null};
  for(const id of this.candidates(from,to,radius)){
   if(id===excludeId)continue;const box=this.static.get(id),loX=box.min.x-radius,hiX=box.max.x+radius,loZ=box.min.z-radius,hiZ=box.max.z+radius;
   let entry=-Infinity,exit=Infinity,axis=null,sign=0,miss=false;
   for(const [origin,delta,lo,hi,coordinate] of [[from.x,dx,loX,hiX,'x'],[from.z,dz,loZ,hiZ,'z']]){
    if(Math.abs(delta)<1e-12){if(origin<lo||origin>hi){miss=true;break}continue}
    const t0=(lo-origin)/delta,t1=(hi-origin)/delta,enter=Math.min(t0,t1),leave=Math.max(t0,t1);
    if(enter>entry){entry=enter;axis=coordinate;sign=delta>0?-1:1}exit=Math.min(exit,leave)
   }
   if(!miss&&entry<=exit&&exit>=0&&entry<=1&&entry<first.t){const t=Math.max(0,entry);first={t,id,normal:axis==='x'?{x:sign,z:0}:{x:0,z:sign}}}
  }
  for(const [id,b] of this.dynamic){if(id===excludeId)continue;const x=from.x-b.position.x,z=from.z-b.position.z,r=radius+b.radius,q=dx*dx+dz*dz;
   const discriminant=(x*dx+z*dz)**2-q*(x*x+z*z-r*r);if(discriminant<0)continue;
   const t=Math.max(0,(-(x*dx+z*dz)-Math.sqrt(discriminant))/q);if(t>first.t||t>1)continue;
   first={t,id,normal:norm(x+dx*t,z+dz*t)}
  }
  if(!first.id)return {position:{...to}};
  const t=Math.max(0,first.t-.002/total);return {position:{x:from.x+dx*t,z:from.z+dz*t},hit:{id:first.id,normal:first.normal,impulse:total*(1-first.t)}}
 }
}
