/* Horizontal swept circle against static boxes and dynamic circle blockers. */
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export class CollisionWorld {
 constructor({cellSize=25}={}){this.cellSize=cellSize;this.static=new Map();this.dynamic=new Map();this.grid=new Map();}
 setStatic(id,box){this.static.set(id,{min:{x:box.min.x,z:box.min.z},max:{x:box.max.x,z:box.max.z}});this.reindex();}
 addStaticBoxes(boxes,prefix='static'){for(let i=0;i<boxes.length;i++)this.static.set(`${prefix}:${i}`,{min:{x:boxes[i].min.x,z:boxes[i].min.z},max:{x:boxes[i].max.x,z:boxes[i].max.z}});this.reindex();}
 setDynamic(id,position,radius){this.dynamic.set(id,{position:{...position},radius});}
 removeDynamic(id){this.dynamic.delete(id);}
 reindex(){this.grid.clear();const c=this.cellSize;for(const [id,b] of this.static){for(let x=Math.floor(b.min.x/c);x<=Math.floor(b.max.x/c);x++)for(let z=Math.floor(b.min.z/c);z<=Math.floor(b.max.z/c);z++){
  const k=`${x},${z}`;if(!this.grid.has(k))this.grid.set(k,[]);this.grid.get(k).push(id);
 }}}
 candidates(from,to,radius){const out=new Set(),c=this.cellSize;for(let x=Math.floor((Math.min(from.x,to.x)-radius)/c);x<=Math.floor((Math.max(from.x,to.x)+radius)/c);x++)for(let z=Math.floor((Math.min(from.z,to.z)-radius)/c);z<=Math.floor((Math.max(from.z,to.z)+radius)/c);z++)for(const id of this.grid.get(`${x},${z}`)||[])out.add(id);return out;}
 isFree(position,radius,excludeId){for(const id of this.candidates(position,position,radius)){if(id===excludeId)continue;const b=this.static.get(id);if(Math.hypot(position.x-clamp(position.x,b.min.x,b.max.x),position.z-clamp(position.z,b.min.z,b.max.z))<radius)return false;}
  for(const [id,b] of this.dynamic)if(id!==excludeId&&Math.hypot(position.x-b.position.x,position.z-b.position.z)<radius+b.radius)return false;return true;
 }
 sweepCircle(from,to,radius,excludeId){const dx=to.x-from.x,dz=to.z-from.z,steps=Math.max(1,Math.ceil(Math.hypot(dx,dz)/Math.max(.2,radius*.5)));let p={...from};
  for(let i=1;i<=steps;i++){const next={x:from.x+dx*i/steps,z:from.z+dz*i/steps};if(!this.isFree(next,radius,excludeId)){
   const probe=.05,normal={x:Number(this.isFree({x:next.x+probe,z:next.z},radius,excludeId))-Number(this.isFree({x:next.x-probe,z:next.z},radius,excludeId)),z:Number(this.isFree({x:next.x,z:next.z+probe},radius,excludeId))-Number(this.isFree({x:next.x,z:next.z-probe},radius,excludeId))};let n=Math.hypot(normal.x,normal.z);if(!n){normal.x=-dx;normal.z=-dz;n=Math.hypot(dx,dz)||1}normal.x/=n;normal.z/=n;
   return {position:p,hit:{id:'blocker',normal,impulse:Math.hypot(dx,dz)}};
  }p=next;}return {position:{...to}};
 }
}
