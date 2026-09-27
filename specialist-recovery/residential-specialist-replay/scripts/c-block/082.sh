# Sunday, September 27, 2026, 2:30:21 PM IST
cd /home/sandbox/v77; cp src/districts.js /tmp/v82-rc4-base.js; python3 - <<'PY'
import json,re
p='src/districts.js';s=open(p).read();rows=[]
for l in open('/downloads/catalog-39adc2a4.jsonl'):
 x=json.loads(l);id=x.get('parcel_id','')
 if id.startswith('ANS-CBLE-') and 10<=int(id[-3:])<=33 or id.startswith('ANS-CBLW-') and 15<=int(id[-3:])<=33:
  desc=x['facade'].lower();tone=4 if 'dark grey' in desc or 'dark-front' in desc else 2 if 'grey' in desc else 3 if 'red' in desc or 'brown' in desc else 5 if 'beige' in desc or 'cream' in desc else 0
  accent=1 if 'red' in desc or 'orange' in desc else 2 if 'wood' in desc else 3 if 'checkered' in desc or 'striped' in desc else 0
  green=1 if any(t in desc for t in ('hedge','lawn','garden','landscaped','potted','palm','trees')) else 0
  rows.append([id,x['game_x'],x['game_z'],int(x['floors'][-1])+1,tone,accent,green])
rows.sort(key=lambda r:r[0]);print(len(rows));insert='''
 // Wave R4 catalog v83 C-Block: frontage anchors, not measured footprints.
 // All 43 active CBLE-010..033 and CBLW-015..033 records describe houses;
 // the occupancy interpretation remains explicit rather than inventing vacancies.
 const cBlockParcels='''+json.dumps(rows,separators=(',',':'))+''';
 function buildCBlockResidential(){
   let built=0,clipped=0,maxAnchorShift=0,maxMassShift=0;const omitted=[];
   const cells=new Map();
   const roadMask=roads.flatMap(r=>{
     const cls=r.tags.highway,half=cls==='tertiary'?6:cls==='unclassified'?5:cls==='residential'?3.5:cls==='service'?2.5:3;
     return r.coordinates.slice(1).map((b,i)=>{const a=r.coordinates[i],dx=b[0]-a[0],dz=b[1]-a[1],len2=dx*dx+dz*dz;return {ax:a[0],az:a[1],dx,dz,len2,clearance:half+2}}).filter(r=>r.len2>1);
   });
   // Rectangle/segment distance, including crossings through the box interior.
   const gap=(x,z,w,d)=>{
     const loX=x-w/2,hiX=x+w/2,loZ=z-d/2,hiZ=z+d/2;let best=Infinity;
     for(const r of roadMask){
       if(Math.max(r.ax,r.ax+r.dx)<loX-r.clearance||Math.min(r.ax,r.ax+r.dx)>hiX+r.clearance||Math.max(r.az,r.az+r.dz)<loZ-r.clearance||Math.min(r.az,r.az+r.dz)>hiZ+r.clearance)continue;
       let t0=0,t1=1,hit=true;
       for(const [p,q] of [[-r.dx,r.ax-loX],[r.dx,hiX-r.ax],[-r.dz,r.az-loZ],[r.dz,hiZ-r.az]]){
         if(Math.abs(p)<1e-9){if(q<0){hit=false;break}}else{const t=q/p;if(p<0)t0=Math.max(t0,t);else t1=Math.min(t1,t)}
       }
       if(hit&&t0<=t1)return -r.clearance;
       const endpoint=(px,pz)=>Math.hypot(Math.max(loX-px,0,px-hiX),Math.max(loZ-pz,0,pz-hiZ));
       let dist=Math.min(endpoint(r.ax,r.az),endpoint(r.ax+r.dx,r.az+r.dz));
       for(const px of [loX,hiX])for(const pz of [loZ,hiZ]){
         const t=Math.max(0,Math.min(1,((px-r.ax)*r.dx+(pz-r.az)*r.dz)/r.len2));dist=Math.min(dist,Math.hypot(px-r.ax-t*r.dx,pz-r.az-t*r.dz));
       }
       best=Math.min(best,dist-r.clearance);
     }return best;
   };
   const box=(geos,x,y,z,w,h,d,color)=>{
     if(gap(x,z,w,d)<0){clipped++;return false}
     const g=new THREE.BoxGeometry(w,h,d);g.translate(x,y,z);g.computeVertexNormals();
     const c=new THREE.Color(color),a=new Float32Array(g.attributes.position.count*3);
     for(let k=0;k<a.length;k+=3){a[k]=c.r;a[k+1]=c.g;a[k+2]=c.b}
     g.setAttribute('color',new THREE.BufferAttribute(a,3));geos.push(g.toNonIndexed());g.dispose();return true;
   };
   const paints=[0xe1d9c8,0x9f7965,0xa4a5a1,0x9a635c,0x676c6c,0xd7c5a5];
   for(const [id,anchorX,anchorZ,levels,tone,accent,green] of cBlockParcels){
     const east=id.startsWith('ANS-CBLE-'),sign=east?1:-1;
     let x=anchorX,z=anchorZ;
     for(let n=0;n<12;n++){
       let worst=null,smallest=Infinity;
       for(const r of roadMask){const t=Math.max(0,Math.min(1,((x-r.ax)*r.dx+(z-r.az)*r.dz)/r.len2)),px=r.ax+t*r.dx,pz=r.az+t*r.dz,d=Math.hypot(x-px,z-pz)-r.clearance;
         if(d<smallest){smallest=d;worst={px,pz}}
       }
       if(smallest>=2.5)break;
       let vx=x-worst.px,vz=z-worst.pz,len=Math.hypot(vx,vz);if(len<.05){vx=sign;vz=0;len=1}
       const step=Math.min(2,2.5-smallest);x+=vx/len*step;z+=vz/len*step;
     }
     const anchorShift=Math.hypot(x-anchorX,z-anchorZ);maxAnchorShift=Math.max(maxAnchorShift,anchorShift);
     if(anchorShift>10||gap(x,z,.2,.2)<0){omitted.push([id,'anchor-road']);continue}
     const w=7.8,d=7.0,h=levels*2.8;
     let chosen=null;
     for(let step=0;step<=12;step++)for(const lateral of [0,-3,3,-6,6,-9,9]){
       const cx=x+sign*(5.2+step*1.1),cz=z+lateral,shift=Math.hypot(step*1.1,lateral);
       if(gap(cx,cz,d,w)>=0&&(!chosen||shift<chosen.shift))chosen={x:cx,z:cz,shift};
     }
     if(!chosen||chosen.shift>14){omitted.push([id,'mass-road']);continue}
     maxMassShift=Math.max(maxMassShift,chosen.shift);
     const cx=chosen.x,cz=chosen.z,face=cx-sign*3.5;
     const cell='cblock:'+(east?'east':'west')+':'+Math.floor(z/50);
     let geos=cells.get(cell);if(!geos){geos=[];cells.set(cell,geos)}
     const wall=paints[tone],trim=accent===1?0xa75849:accent===2?0x896b55:0xe5d6bc,metal=accent===2?0x735447:0x47545b;
     if(!box(geos,cx,h/2,cz,d,h,w,wall)){omitted.push([id,'mass-road']);continue}
     built++;
     if(within(cx,cz))colliders.push(new THREE.Box3(new THREE.Vector3(cx-d/2,0,cz-w/2),new THREE.Vector3(cx+d/2,h+1,cz+w/2)));
     for(let f=1;f<levels;f++){
       box(geos,cx,f*2.8,cz,d+.1,.13,w+.15,trim);
       if(f===1||accent===1){box(geos,face-sign*.52,f*2.8+.10,cz,1.0,.15,3.3,trim);
         box(geos,face-sign*1.00,f*2.8+.67,cz,.06,.06,3.2,metal);
         for(const e of [-1,0,1])box(geos,face-sign*1.00,f*2.8+.40,cz+e*1.32,.06,.54,.06,metal)}
     }
     box(geos,cx,h+.08,cz,d+.25,.17,w+.25,trim);
     box(geos,face+sign*.05,h+.46,cz,.18,.76,w,wall);
     box(geos,cx+sign*1.5,h+.95,cz+1.5,1.8,1.7,1.9,wall);
     box(geos,cx+sign*.5,h+.72,cz-2.5,.8,1.1,.8,0x282c2c);
     for(let f=0;f<levels;f++)for(const e of [-1,1]){
       box(geos,face-sign*.06,f*2.8+1.68,cz+e*2.15,.07,1.16,1.08,0x46545a);
       box(geos,face-sign*.21,f*2.8+2.31,cz+e*2.15,.30,.09,1.30,trim);
       box(geos,face-sign*.14,f*2.8+1.68,cz+e*2.15,.08,1.16,.05,trim);
     }
     // Boundary wall and gate use the same masked box primitive. Grass is
     // represented sparingly only when catalog text calls out planting.
     for(const e of [-1,1])box(geos,x+sign*.10,.72,z+e*2.75,.18,1.44,2.15,trim);
     box(geos,x+sign*.10,.9,z,.14,1.8,2.75,metal);
     box(geos,x+sign*.10,1.85,z,.3,.10,3.15,trim);
     if(accent===3)box(geos,x+sign*1.2,.07,z,2.1,.12,2.8,0xb0a291);
     if(green)for(const e of [-1,1])box(geos,x+sign*2.9,.35,z+e*2.9,.5,.7,.6,0x757d59);
   }
   for(const [cell,geos] of cells){if(!geos.length)continue;
     const joined=mergeGeometries(geos,false);geos.forEach(g=>g.dispose());if(!joined)continue;
     joined.computeBoundingSphere();const mesh=new THREE.Mesh(joined,marketColorMaterial);
     mesh.name='catalog:'+cell;mesh.userData.batchRegion='core';mesh.userData.dBlockFar=true;
     mesh.castShadow=false;mesh.receiveShadow=true;staticWorld.add(mesh);
   }
   console.log('Catalog C Block frontage counts',JSON.stringify({source:'v83',ids:cBlockParcels.length,built,cells:cells.size,omitted,clipped,maxAnchorShift,maxMassShift}));
 }
''' 
pos=s.index(' // Sampled northern visual audit');s=s[:pos]+insert+s[pos:];s=s.replace(' buildCatalogResidential();',' buildCatalogResidential();\n buildCBlockResidential();',1);open(p,'w').write(s)
PY
npm run build >/tmp/cblock-build.log 2>&1; tail -8 /tmp/cblock-build.log
