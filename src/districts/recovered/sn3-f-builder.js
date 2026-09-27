import * as THREE from 'three';
import {residentialParcels} from './sn3-f-v90r.js';
import {createRoadMask} from '../road-mask.js';
import {createBoxBatch} from '../box-batch.js';
/* Scoped SN3/F geometry from specialist v82 renderer semantics and v90 status.
 * Anchors are frontage hints, not measured footprints. */
export function addSn3FResidential(scene,roads,within,colliders){
 const mask=createRoadMask(roads),batch=createBoxBatch({scene,roads:mask,groupName:'Catalog SN3 and F frontages'});
 const colors=[0xe1d9c8,0x9f7965,0xa4a5a1,0x9a635c,0x676c6c,0xd7c5a5];let built=0,vacant=0,unfinished=0,walls=0,maxAnchorShift=0,maxMassShift=0;const omitted=[],scopedColliders=[],placements=[];
 for(const [id,anchorX,anchorZ,kind,levels,tone,gate,flags] of residentialParcels){
  const north=id.startsWith('ANS-SN3N-')||id.startsWith('ANS-FBN-'),sign=north?-1:1,sector=id.startsWith('ANS-SN3');
  let x=anchorX,z=anchorZ;
  for(let n=0;n<12;n++){
   let worst=null,gap=Infinity;for(const r of mask.mask){const t=Math.max(0,Math.min(1,((x-r.ax)*r.dx+(z-r.az)*r.dz)/r.len2)),px=r.ax+t*r.dx,pz=r.az+t*r.dz,d=Math.hypot(x-px,z-pz)-r.clearance;if(d<gap){gap=d;worst={px,pz}}}
   if(gap>=2.5)break;let vx=x-worst.px,vz=z-worst.pz,len=Math.hypot(vx,vz);if(len<.05){vx=0;vz=sign;len=1}const step=Math.min(2,2.5-gap);x+=vx/len*step;z+=vz/len*step;
  }
  const anchorShift=Math.hypot(x-anchorX,z-anchorZ);maxAnchorShift=Math.max(maxAnchorShift,anchorShift);
  if(anchorShift>10||mask.pointGap(x,z)<0){omitted.push([id,'anchor-road']);continue}
  const cell=(sector?'sector12':'fblock')+':'+(north?'north':'south')+':'+Math.floor(x/50);
  const wall=colors[tone],trim=tone===4?0xb2aaa0:0xe5d6bc,metal=gate===2?0x735447:0x47545b,front=z+sign*.13;
  const box=(xx,yy,zz,w,h,d,color)=>batch.box(cell,xx,yy,zz,w,h,d,color);
  if(kind==='V'||kind==='W'){
   box(x,.05,front+sign*2.5,8,.10,3.2,0xb9ab89);
   for(const e of [-1,1])box(x+e*2.9,.65,front+sign*.5,2.6,1.3,.18,kind==='W'?0x898e8a:0xb9a581);
   if(kind==='W'){walls++;box(x,1.05,front+sign*.5,2.5,2.1,.18,0x898e8a)}
   else{vacant++;if(flags&4)for(const e of [-1,1])box(x+e*2.8,.4,front+sign*2,.5,.8,.5,0x757d59)}continue;
  }
  const h=levels*2.8,width=7.8,u=kind==='U',base=u?0xac8067:wall;
  let candidate=null;for(let step=0;step<=12;step++)for(const lateral of [0,-3,3,-6,6,-9,9]){
   const cx=x+lateral,cz=front+sign*(5.2+step*1.1),gap=mask.boxGap(cx,cz,width,7),shift=Math.hypot(lateral,step*1.1);
   if(gap>=0&&(!candidate||shift<candidate.shift))candidate={cx,cz,shift};
  }
  if(!candidate||candidate.shift>14){omitted.push([id,'mass-road']);continue}
  maxMassShift=Math.max(maxMassShift,candidate.shift);const massX=candidate.cx,massZ=candidate.cz,faceZ=massZ-sign*3.65;
  if(!box(massX,h/2,massZ,width,h,7,base)){omitted.push([id,'mass-road']);continue}
  if(u)unfinished++;else built++;
  placements.push({id,x:massX,z:massZ});if(within(massX,massZ)){const b=new THREE.Box3(new THREE.Vector3(massX-width/2,0,massZ-3.5),new THREE.Vector3(massX+width/2,h+1.1,massZ+3.5));colliders.push(b);scopedColliders.push(b)}
  for(let f=1;f<levels;f++){
   const yy=f*2.8;box(massX,yy,massZ,width+.18,.12,7.18,u?0xc1b1a0:trim);
   if(!u&&(flags&1||f===1)){box(massX,yy+.08,faceZ+sign*.5,3.25,.13,1.1,trim);box(massX,yy+.62,faceZ+sign*1.02,3.2,.055,.055,metal);for(const e of [-1,0,1])box(massX+e*1.42,yy+.36,faceZ+sign*1.02,.05,.52,.05,metal)}
  }
  box(massX,h+.08,massZ,width+.35,.17,7.35,trim);
  if(!u){box(massX,h+.50,faceZ-sign*.14,width,.85,.18,wall);const mx=massX+(id.charCodeAt(id.length-1)%2?-2:2);box(mx,h+1.05,massZ-sign*2,2.3,2.1,2.1,wall);box(massX+2.9,h+.75,massZ-sign*1,.85,1.1,.85,0x282c2c)}
  else for(const e of [-1,1])box(massX+e*3.75,h*.5,faceZ-sign*1,.27,h,.27,0xbeb2a4);
  for(let f=0;f<levels;f++)for(const e of [-1,1]){if(u&&f===0)continue;box(massX+e*2.25,f*2.8+1.72,faceZ-sign*.10,1.1,1.18,.06,u?0x4b4440:0x46545a);if(!u)box(massX+e*2.25,f*2.8+2.38,faceZ+sign*.02,1.32,.09,.3,trim)}
  if(!u){box(x,.9,front+sign*.30,2.9,1.8,.12,metal);box(x,1.85,front+sign*.33,3.3,.10,.32,trim);if(flags&8)box(x,.07,front+sign*1.4,3,.12,2.2,0xb0a291)}
  for(const e of [-1,1])box(x+e*2.75,.74,front+sign*1.35,2.8,1.48,.18,u?0xa28472:trim);
 }
 const rendered=batch.finish();const summary={source:'v90r-corrected-v82-renderer',ids:residentialParcels.length,built,vacant,unfinished,walls,cells:rendered.cells,omitted,clipped:rendered.clipped,maxAnchorShift,maxMassShift};
 scene.userData.sn3FResidential={visuals:rendered.group,summary,colliders:scopedColliders,placements};return {visuals:rendered.group,summary};
}
