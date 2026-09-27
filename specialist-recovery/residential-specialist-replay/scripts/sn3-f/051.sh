# Sunday, September 27, 2026, 2:12:41 PM IST
cd /home/sandbox/v77; python3 - <<'PY'
p='src/districts.js';s=open(p).read();s=s.replace("  const cells=new Map(), catalogSeen=new Set();let built=0,vacant=0,unfinished=0,walls=0;", """  const cells=new Map(), catalogSeen=new Set();let built=0,vacant=0,unfinished=0,walls=0;
   // Precompute the playable road mask from OSM centerlines. The v80 catalog
   // positions are frontage anchors, some on mapped road centerlines; no lot
   // surface or building volume may be drawn over the carriageway.
   const roadMask=roads.flatMap(r=>{
     const cls=r.tags.highway, half=cls==='tertiary'?6:cls==='unclassified'?5:cls==='residential'?3.5:cls==='service'?2.5:3;
     return r.coordinates.slice(1).map((b,i)=>{const a=r.coordinates[i],dx=b[0]-a[0],dz=b[1]-a[1],len2=dx*dx+dz*dz;return {ax:a[0],az:a[1],dx,dz,len2,clearance:half+2}}).filter(seg=>seg.len2>1);
   });
   const roadGap=(x,z)=>{let gap=Infinity;for(const r of roadMask){
     if(Math.abs(x-r.ax)>100+Math.abs(r.dx)||Math.abs(z-r.az)>100+Math.abs(r.dz))continue;
     const t=Math.max(0,Math.min(1,((x-r.ax)*r.dx+(z-r.az)*r.dz)/r.len2));
     gap=Math.min(gap,Math.hypot(x-r.ax-t*r.dx,z-r.az-t*r.dz)-r.clearance);
   }return gap};
   const clearPlotBox=(list,x,y,z,w,h,d,color)=>{
     // Clip the lane-facing depth against the road mask. Keep a box only
     // when its center and all four footprint corners remain beyond the curb.
     if(roadGap(x,z)<0||roadGap(x-w/2,z-d/2)<0||roadGap(x+w/2,z-d/2)<0||roadGap(x-w/2,z+d/2)<0||roadGap(x+w/2,z+d/2)<0)return false;
     addBox(list,x,y,z,w,h,d,color);return true;
   };""")
# Need avoid hard invalidly skipping everything; displacement by normal away from nearest road. Will evaluate count logs.
s=s.replace("   for(const [id,x,z,kind,levels,tone,gate,flags] of residentialParcels){", "   for(const [id,anchorX,anchorZ,kind,levels,tone,gate,flags] of residentialParcels){")
s=s.replace("     const sign=north?-1:1,sector=id.startsWith('ANS-SN3');", """     const sign=north?-1:1,sector=id.startsWith('ANS-SN3');
     // Push an estimated frontage uniformly away from every nearby road.
     // A longitudinal cross street can also move x. Bound corrections to
     // one plot width; unresolved anchors stay open rather than on asphalt.
     let x=anchorX,z=anchorZ;
     for(let n=0;n<12;n++){
       let worst=null,gap=Infinity;
       for(const r of roadMask){const t=Math.max(0,Math.min(1,((x-r.ax)*r.dx+(z-r.az)*r.dz)/r.len2));
         const px=r.ax+t*r.dx,pz=r.az+t*r.dz,d=Math.hypot(x-px,z-pz)-r.clearance;
         if(d<gap){gap=d;worst={px,pz,r}}}
       if(gap>=2.5)break;
       let vx=x-worst.px,vz=z-worst.pz,vlen=Math.hypot(vx,vz);
       if(vlen<.05){vx=0;vz=sign;vlen=1}
       const step=Math.min(2.0,2.5-gap);x+=vx/vlen*step;z+=vz/vlen*step;
     }
     if(Math.hypot(x-anchorX,z-anchorZ)>10||roadGap(x,z)<0){continue}
""")
s=s.replace("     if(kind==='V'||kind==='W'){", "     if(kind==='V'||kind==='W'){")
s=s.replace("       addBox(geos,x,.05,front+sign*2.5,9,.10,5.6,0xb9ab89);", "       clearPlotBox(geos,x,.05,front+sign*2.5,8,.10,3.2,0xb9ab89);")
s=s.replace("       for(const e of [-1,1])addBox(geos,x+e*2.9,.65,front,3.1,1.3,.18,kind==='W'?0x898e8a:0xb9a581);", "       for(const e of [-1,1])clearPlotBox(geos,x+e*2.9,.65,front+sign*.5,2.6,1.3,.18,kind==='W'?0x898e8a:0xb9a581);")
s=s.replace("       if(kind==='W'){walls++;addBox(geos,x,1.05,front,2.5,2.1,.18,0x898e8a)}", "       if(kind==='W'){walls++;clearPlotBox(geos,x,1.05,front+sign*.5,2.5,2.1,.18,0x898e8a)}")
s=s.replace("else{vacant++;if(flags&4)for(const e of [-1,1])addBox(geos,x+e*2.8,.4,front+sign*2,.5,.8,.5,0x757d59)}", "else{vacant++;if(flags&4)for(const e of [-1,1])clearPlotBox(geos,x+e*2.8,.4,front+sign*2,.5,.8,.5,0x757d59)}")
s=s.replace("       const h=levels*2.8,width=7.8;", "       const h=levels*2.8,width=7.8;")
s=s.replace("       if(within(x,massZ))colliders.push(new THREE.Box3(new THREE.Vector3(x-width*.5,0,massZ-3.50),new THREE.Vector3(x+width*.5,h+1.1,massZ+3.50)));", "       if(within(x,massZ)&&roadGap(x,massZ)>=4.5)colliders.push(new THREE.Box3(new THREE.Vector3(x-width*.5,0,massZ-3.50),new THREE.Vector3(x+width*.5,h+1.1,massZ+3.50)));")
s=s.replace("       addBox(geos,x,h/2,massZ,width,h,7.0,base);", "       if(!clearPlotBox(geos,x,h/2,massZ,width,h,7.0,base))continue;")
# clearPlotBox for every remaining structure in catalogue function; avoid false projection into road.
a=s.index(' function buildCatalogResidential(){');b=s.index(' // Sampled northern visual audit',a);sub=s[a:b];idx=sub.index('       if(!clearPlotBox(geos,x,h/2,massZ');pre=sub[:idx];post=sub[idx:];post=post.replace('addBox(geos,','clearPlotBox(geos,');sub=pre+post;s=s[:a]+sub+s[b:];open(p,'w').write(s)
PY
npm run build >/tmp/v80-road-build.log 2>&1; tail -8 /tmp/v80-road-build.log; node /tmp/v77-qa.mjs v80-road >/tmp/v80-road.jsonl 2>&1; cat /tmp/v80-road.jsonl | cut -c1-200
