/* Shared OSM segment-to-AABB clearance. Anchors are frontage hints, not lots. */
export function createRoadMask(roads){const mask=roads.flatMap(r=>{const cls=r.tags?.highway,half=cls==='tertiary'?6:cls==='unclassified'?5:cls==='residential'?3.5:cls==='service'?2.5:3;
 return r.coordinates.slice(1).map((b,i)=>{const a=r.coordinates[i],dx=b[0]-a[0],dz=b[1]-a[1],len2=dx*dx+dz*dz;return {ax:a[0],az:a[1],dx,dz,len2,clearance:half+2}}).filter(r=>r.len2>1)});
 const pointGap=(x,z)=>{let best=Infinity;for(const r of mask){const t=Math.max(0,Math.min(1,((x-r.ax)*r.dx+(z-r.az)*r.dz)/r.len2));best=Math.min(best,Math.hypot(x-r.ax-t*r.dx,z-r.az-t*r.dz)-r.clearance)}return best};
 const boxGap=(x,z,w,d)=>{const loX=x-w/2,hiX=x+w/2,loZ=z-d/2,hiZ=z+d/2;let best=Infinity;
  for(const r of mask){if(Math.max(r.ax,r.ax+r.dx)<loX-r.clearance||Math.min(r.ax,r.ax+r.dx)>hiX+r.clearance||Math.max(r.az,r.az+r.dz)<loZ-r.clearance||Math.min(r.az,r.az+r.dz)>hiZ+r.clearance)continue;
   let t0=0,t1=1,hit=true;for(const [p,q] of [[-r.dx,r.ax-loX],[r.dx,hiX-r.ax],[-r.dz,r.az-loZ],[r.dz,hiZ-r.az]]){if(Math.abs(p)<1e-9){if(q<0){hit=false;break}}else{const t=q/p;if(p<0)t0=Math.max(t0,t);else t1=Math.min(t1,t)}}
   if(hit&&t0<=t1)return -r.clearance;
   const end=(px,pz)=>Math.hypot(Math.max(loX-px,0,px-hiX),Math.max(loZ-pz,0,pz-hiZ));let dist=Math.min(end(r.ax,r.az),end(r.ax+r.dx,r.az+r.dz));
   for(const px of [loX,hiX])for(const pz of [loZ,hiZ]){const t=Math.max(0,Math.min(1,((px-r.ax)*r.dx+(pz-r.az)*r.dz)/r.len2));dist=Math.min(dist,Math.hypot(px-r.ax-t*r.dx,pz-r.az-t*r.dz))}best=Math.min(best,dist-r.clearance)
  }return best};
 return {mask,pointGap,boxGap};
}
