# Sunday, September 27, 2026, 2:19:59 PM IST
cd /home/sandbox/v77 && python3 - <<'PY'
p='src/districts.js';s=open(p).read();start=s.index('   const clearPlotBox=(list,x,y,z,w,h,d,color)=>{');end=s.index('   const colors=',start)
s=s[:start]+'''   // Exact segment-to-axis-aligned-footprint clearance. Corner-only tests
   // miss roads crossing the middle of a wide plot or running along an edge.
   const roadBoxGap=(x,z,w,d)=>{
     const loX=x-w/2,hiX=x+w/2,loZ=z-d/2,hiZ=z+d/2;
     let min=Infinity;
     for(const r of roadMask){
       const segLoX=Math.min(r.ax,r.ax+r.dx),segHiX=Math.max(r.ax,r.ax+r.dx);
       const segLoZ=Math.min(r.az,r.az+r.dz),segHiZ=Math.max(r.az,r.az+r.dz);
       if(segHiX<loX-r.clearance||segLoX>hiX+r.clearance||segHiZ<loZ-r.clearance||segLoZ>hiZ+r.clearance)continue;
       // Liang-Barsky clipping detects segment penetration through any part.
       let t0=0,t1=1,intersects=true;
       for(const [p,q] of [[-r.dx,r.ax-loX],[r.dx,hiX-r.ax],[-r.dz,r.az-loZ],[r.dz,hiZ-r.az]]){
         if(Math.abs(p)<1e-9){if(q<0){intersects=false;break}}else{
           const t=q/p;if(p<0)t0=Math.max(t0,t);else t1=Math.min(t1,t);
         }
       }
       if(intersects&&t0<=t1)return -r.clearance;
       const endpoint=(px,pz)=>Math.hypot(Math.max(loX-px,0,px-hiX),Math.max(loZ-pz,0,pz-hiZ));
       let distance=Math.min(endpoint(r.ax,r.az),endpoint(r.ax+r.dx,r.az+r.dz));
       for(const px of [loX,hiX])for(const pz of [loZ,hiZ]){
         const t=Math.max(0,Math.min(1,((px-r.ax)*r.dx+(pz-r.az)*r.dz)/r.len2));
         distance=Math.min(distance,Math.hypot(px-r.ax-t*r.dx,pz-r.az-t*r.dz));
       }
       min=Math.min(min,distance-r.clearance);
     }
     return min;
   };
   const clearPlotBox=(list,x,y,z,w,h,d,color)=>{
     if(roadBoxGap(x,z,w,d)<0)return false;
     addBox(list,x,y,z,w,h,d,color);return true;
   };
''' +s[end:]
start=s.index('       const bodyClear=(bx,bz)=>{');end=s.index('       // Search a small set',start)
s=s[:start]+'''       const bodyClear=(bx,bz)=>roadBoxGap(bx,bz,width,7.0);
'''+s[end:]
s=s.replace('let built=0,vacant=0,unfinished=0,walls=0,omitted=[];', 'let built=0,vacant=0,unfinished=0,walls=0,omitted=[],maxAnchorShift=0,maxMassShift=0,clippedBoxes=0;')
s=s.replace('if(roadBoxGap(x,z,w,d)<0)return false;', 'if(roadBoxGap(x,z,w,d)<0){clippedBoxes++;return false}')
s=s.replace('     if(Math.hypot(x-anchorX,z-anchorZ)>10||roadGap(x,z)<0)', '     maxAnchorShift=Math.max(maxAnchorShift,Math.hypot(x-anchorX,z-anchorZ));\n     if(Math.hypot(x-anchorX,z-anchorZ)>10||roadGap(x,z)<0)')
s=s.replace('       massX=best.x;massZ=best.z;faceZ=', '       maxMassShift=Math.max(maxMassShift,best.shift);\n       massX=best.x;massZ=best.z;faceZ=')
s=s.replace('cells:cells.size,omitted}', 'cells:cells.size,omitted,maxAnchorShift,maxMassShift,clippedBoxes}')
open(p,'w').write(s)
PY
npm run build >/tmp/v82-build.log 2>&1; tail -5 /tmp/v82-build.log; rg 'Catalog residential' /tmp/v82-probe.log | tail -2; head -30 /tmp/v80-probe.mjs
