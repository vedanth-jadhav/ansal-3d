/* OSM segment index. Coordinates are local x/z meters. Road names are not inferred. */
const WIDTH={motorway:12,trunk:10,primary:9,secondary:8,tertiary:6,unclassified:5,residential:3.5,service:2.5,footway:1.2,path:1.2};
const key=(x,z)=>`${Math.round(x*100)/100},${Math.round(z*100)/100}`;
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
export class RoadNetwork {
 constructor(roads,{cellSize=50}={}){
  this.cellSize=cellSize;this.grid=new Map();this.nodes=new Map();this.segments=[];this.bounds={minX:Infinity,maxX:-Infinity,minZ:Infinity,maxZ:-Infinity};
  for(const road of roads){const kind=road.tags?.highway,points=road.coordinates||[],width=WIDTH[kind]??3;
   for(let i=1;i<points.length;i++){
    const a={x:points[i-1][0],z:points[i-1][1]},b={x:points[i][0],z:points[i][1]},len=distance(a,b);if(len<.01)continue;
    const segment={id:`${road.id}:${i-1}`,wayId:String(road.id),a,b,len,width,kind,drive:!['footway','path','pedestrian','steps','cycleway'].includes(kind)};
    this.segments.push(segment);this.bounds.minX=Math.min(this.bounds.minX,a.x,b.x);this.bounds.maxX=Math.max(this.bounds.maxX,a.x,b.x);this.bounds.minZ=Math.min(this.bounds.minZ,a.z,b.z);this.bounds.maxZ=Math.max(this.bounds.maxZ,a.z,b.z);
    for(let x=Math.floor(Math.min(a.x,b.x)/cellSize);x<=Math.floor(Math.max(a.x,b.x)/cellSize);x++)for(let z=Math.floor(Math.min(a.z,b.z)/cellSize);z<=Math.floor(Math.max(a.z,b.z)/cellSize);z++){
     const k=`${x},${z}`;if(!this.grid.has(k))this.grid.set(k,[]);this.grid.get(k).push(segment);
    }
    const ka=key(a.x,a.z),kb=key(b.x,b.z);if(!this.nodes.has(ka))this.nodes.set(ka,{position:a,edges:[]});if(!this.nodes.has(kb))this.nodes.set(kb,{position:b,edges:[]});
    this.nodes.get(ka).edges.push({to:kb,len,segment});this.nodes.get(kb).edges.push({to:ka,len,segment});
   }
  }
 }
 nearest(position,{mode='walk',maxDistance=Infinity}={}){
  const size=this.cellSize,limit=Number.isFinite(maxDistance)?Math.max(1,Math.ceil(maxDistance/size)+2):Math.max(1,Math.ceil(Math.max(Math.abs(position.x-this.bounds.minX),Math.abs(position.x-this.bounds.maxX),Math.abs(position.z-this.bounds.minZ),Math.abs(position.z-this.bounds.maxZ))/size)+1);
  const cx=Math.floor(position.x/size),cz=Math.floor(position.z/size);let best=null;const seen=new Set();
  for(let radius=0;radius<=limit;radius++){
   for(let x=cx-radius;x<=cx+radius;x++)for(let z=cz-radius;z<=cz+radius;z++){
    if(radius&&Math.max(Math.abs(x-cx),Math.abs(z-cz))!==radius)continue;
    for(const seg of this.grid.get(`${x},${z}`)||[]){if(seen.has(seg)||mode==='drive'&&!seg.drive)continue;seen.add(seg);
     const dx=seg.b.x-seg.a.x,dz=seg.b.z-seg.a.z,t=Math.max(0,Math.min(1,((position.x-seg.a.x)*dx+(position.z-seg.a.z)*dz)/(seg.len*seg.len)));
     const point={x:seg.a.x+t*dx,z:seg.a.z+t*dz},d=distance(position,point);
     if(d<=maxDistance&&(!best||d<best.distance))best={point,tangent:{x:dx/seg.len,z:dz/seg.len},distance:d,width:seg.width,segmentId:seg.id,wayId:seg.wayId,kind:seg.kind,segment:seg};
    }
   }
   if(best&&radius*size>best.distance+size*2)break;
  }
  return best;
 }
 route(start,end,mode='walk'){
  const a=this.nearest(start,{mode,maxDistance:35}),b=this.nearest(end,{mode,maxDistance:35});if(!a||!b)return null;
  const endpoints=s=>[{k:key(s.segment.a.x,s.segment.a.z),p:s.segment.a},{k:key(s.segment.b.x,s.segment.b.z),p:s.segment.b}];
  if(a.segmentId===b.segmentId){const d=distance(a.point,b.point);return {points:[start,a.point,b.point,end],distance:distance(start,a.point)+d+distance(b.point,end),mode,wayIds:[a.wayId]}}
  // Endpoint selection must include the distance from the reached endpoint back
  // to the projected destination. Stopping at the first target endpoint can
  // choose the longer half of the destination segment.
  const goals=endpoints(b),goalByKey=new Map(goals.map(x=>[x.k,x]));
  const prev=new Map(),cost=new Map(),queue=[];
  for(const x of endpoints(a)){
   const d=distance(start,a.point)+distance(a.point,x.p);
   if(d<(cost.get(x.k)??Infinity)){cost.set(x.k,d);queue.push([d,x.k])}
  }
  let bestGoal=null,bestTotal=Infinity;
  while(queue.length){
   queue.sort((x,y)=>y[0]-x[0]);const [d,k]=queue.pop();
   if(d!==cost.get(k))continue;
   if(d>=bestTotal)break;
   const target=goalByKey.get(k);
   if(target){const total=d+distance(target.p,b.point)+distance(b.point,end);
    if(total<bestTotal){bestTotal=total;bestGoal=k}}
   for(const e of this.nodes.get(k)?.edges||[]){
    if(mode==='drive'&&!e.segment.drive)continue;
    const next=d+e.len;
    if(next<(cost.get(e.to)??Infinity)){cost.set(e.to,next);prev.set(e.to,{from:k,segment:e.segment});queue.push([next,e.to])}
   }
  }
  if(!bestGoal)return null;
  const nodes=[],ways=[];
  for(let k=bestGoal;k;){nodes.push(this.nodes.get(k).position);const step=prev.get(k);if(!step)break;ways.push(step.segment.wayId);k=step.from}
  nodes.reverse();ways.reverse();
  const points=[start,a.point,...nodes,b.point,end];
  const wayIds=[a.wayId,...ways,b.wayId].filter((id,i,all)=>i===0||id!==all[i-1]);
  return {points,distance:points.slice(1).reduce((n,p,i)=>n+distance(points[i],p),0),mode,wayIds};
 }
 sampleParkingNear(position,maxDistance=30){const hit=this.nearest(position,{mode:'drive',maxDistance});if(!hit)return null;const side=(hit.width/2+2);return {position:{x:hit.point.x-hit.tangent.z*side,z:hit.point.z+hit.tangent.x*side},heading:Math.atan2(hit.tangent.x,hit.tangent.z),roadId:hit.wayId};}
}
