import * as THREE from 'three';
import {cBlockParcels} from './c-block-v85.js';import {createRoadMask} from '../road-mask.js';import {createBoxBatch} from '../box-batch.js';
/* Specialist v85 C-Block compact facades, rebuilt as scoped module. */
export function addCBlockResidential(scene,roads,within,colliders){
 const mask=createRoadMask(roads),batch=createBoxBatch({scene,roads:mask,groupName:'Catalog C Block frontages'});
 const paints=[0xe1d9c8,0x9f7965,0xa4a5a1,0x9a635c,0x676c6c,0xd7c5a5],placed=[];let built=0,maxAnchorShift=0,maxMassShift=0;const omitted=[],scopedColliders=[];
 for(const [id,anchorX,anchorZ,levels,tone,accent,green] of cBlockParcels){
  const east=id.startsWith('ANS-CBLE-'),sign=east?1:-1;let x=anchorX,z=anchorZ;
  for(let n=0;n<12;n++){
   let worst=null,smallest=Infinity;for(const r of mask.mask){const t=Math.max(0,Math.min(1,((x-r.ax)*r.dx+(z-r.az)*r.dz)/r.len2)),px=r.ax+t*r.dx,pz=r.az+t*r.dz,d=Math.hypot(x-px,z-pz)-r.clearance;if(d<smallest){smallest=d;worst={px,pz}}}
   if(smallest>=2.5)break;let vx=x-worst.px,vz=z-worst.pz,len=Math.hypot(vx,vz);if(len<.05){vx=sign;vz=0;len=1}const step=Math.min(2,2.5-smallest);x+=vx/len*step;z+=vz/len*step;
  }
  const anchorShift=Math.hypot(x-anchorX,z-anchorZ);maxAnchorShift=Math.max(maxAnchorShift,anchorShift);
  if(anchorShift>10||mask.boxGap(x,z,.2,.2)<0){omitted.push([id,'anchor-road']);continue}
  const w=7.8,d=7,h=levels*2.8;let candidate=null;
  for(let step=0;step<=12;step++)for(const lateral of [0,-.5,.5,-1,1,-1.5,1.5,-2,2,-2.5,2.5,-3,3,-4,4,-5,5,-6,6,-7,7,-8,8,-9,9]){
   const cx=x+sign*(5.2+step*1.1),cz=z+lateral,shift=Math.hypot(step*1.1,lateral);
   if(mask.boxGap(cx,cz,d,w)<0||placed.some(v=>Math.abs(v.x-cx)<d&&Math.abs(v.z-cz)<w))continue;
   if(!candidate||shift<candidate.shift)candidate={x:cx,z:cz,shift};
  }
  if(!candidate||candidate.shift>14){omitted.push([id,'mass-road-or-neighbor']);continue}
  const cx=candidate.x,cz=candidate.z,face=cx-sign*3.5;maxMassShift=Math.max(maxMassShift,candidate.shift);
  const cell='cblock:'+(east?'east':'west')+':'+Math.floor(z/50),wall=paints[tone],trim=accent===1?0xa75849:accent===2?0x896b55:0xe5d6bc,metal=accent===2?0x735447:0x47545b;
  const box=(xx,yy,zz,bw,bh,bd,color)=>batch.box(cell,xx,yy,zz,bw,bh,bd,color);
  if(!box(cx,h/2,cz,d,h,w,wall)){omitted.push([id,'mass-road']);continue}
  placed.push({x:cx,z:cz});built++;if(within(cx,cz)){const b=new THREE.Box3(new THREE.Vector3(cx-d/2,0,cz-w/2),new THREE.Vector3(cx+d/2,h+1,cz+w/2));colliders.push(b);scopedColliders.push(b)}
  for(let f=1;f<levels;f++){
   box(cx,f*2.8,cz,d+.1,.13,w+.15,trim);
   if(f===1||accent===1){box(face-sign*.52,f*2.8+.10,cz,1,.15,3.3,trim);box(face-sign*1,f*2.8+.67,cz,.06,.06,3.2,metal);for(const e of [-1,0,1])box(face-sign*1,f*2.8+.40,cz+e*1.32,.06,.54,.06,metal)}
  }
  box(cx,h+.08,cz,d+.25,.17,w+.25,trim);box(face+sign*.05,h+.46,cz,.18,.76,w,wall);box(cx+sign*1.5,h+.95,cz+1.5,1.8,1.7,1.9,wall);box(cx+sign*.5,h+.72,cz-2.5,.8,1.1,.8,0x282c2c);
  for(let f=0;f<levels;f++)for(const e of [-1,1]){box(face-sign*.06,f*2.8+1.68,cz+e*2.15,.07,1.16,1.08,0x46545a);box(face-sign*.21,f*2.8+2.31,cz+e*2.15,.30,.09,1.30,trim);box(face-sign*.14,f*2.8+1.68,cz+e*2.15,.08,1.16,.05,trim)}
  for(const e of [-1,1])box(x+sign*.10,.72,z+e*2.75,.18,1.44,2.15,trim);box(x+sign*.10,.9,z,.14,1.8,2.75,metal);box(x+sign*.10,1.85,z,.3,.10,3.15,trim);
  if(accent===3)box(x+sign*1.2,.07,z,2.1,.12,2.8,0xb0a291);if(green)for(const e of [-1,1])box(x+sign*2.9,.35,z+e*2.9,.5,.7,.6,0x757d59);
 }
 const rendered=batch.finish();const summary={source:'v85-specialist',ids:cBlockParcels.length,built,cells:rendered.cells,omitted,clipped:rendered.clipped,maxAnchorShift,maxMassShift};scene.userData.cBlockResidential={visuals:rendered.group,summary,colliders:scopedColliders};return {visuals:rendered.group,summary};
}
