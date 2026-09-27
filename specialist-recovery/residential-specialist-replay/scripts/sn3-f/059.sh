# Sunday, September 27, 2026, 2:16:25 PM IST
cd /home/sandbox/v77; python3 - <<'PY'
p='src/districts.js';s=open(p).read();s=s.replace("       let massZ=front+sign*5.2,faceZ=front+sign*1.55;", "       let massX=x,massZ=front+sign*5.2,faceZ=front+sign*1.55;")
a=s.index("       for(let pass=0;pass<16;pass++){",s.index('function buildCatalogResidential'));b=s.index("       const base=u?",a)
s=s[:a]+"""       const bodyClear=(bx,bz)=>{
         const h=width*.5;return Math.min(roadGap(bx-h,bz-3.5),roadGap(bx+h,bz-3.5),roadGap(bx-h,bz+3.5),roadGap(bx+h,bz+3.5));
       };
       // Search a small set of whole-plot displacements behind the frontage;
       // do not place a house on an adjacent road just to use an uncertain ID.
       let best={x:massX,z:massZ,gap:bodyClear(massX,massZ),shift:0};
       for(let step=0;step<=12;step++)for(const lateral of [0,-3,3,-6,6,-9,9]){
         const cx=x+lateral,cz=front+sign*(5.2+step*1.1),gap=bodyClear(cx,cz);
         const shift=Math.hypot(lateral,step*1.1);
         if(gap>=0&&(best.gap<0||shift<best.shift))best={x:cx,z:cz,gap,shift};
         else if(best.gap<0&&gap>best.gap)best={x:cx,z:cz,gap,shift};
       }
       massX=best.x;massZ=best.z;faceZ=massZ-sign*3.65;
"""+s[b:]
s=s.replace("clearPlotBox(geos,x,h/2,massZ,width,h,7.0,base)", "clearPlotBox(geos,massX,h/2,massZ,width,h,7.0,base)")
s=s.replace("new THREE.Vector3(x-width*.5,0,massZ-3.50),new THREE.Vector3(x+width*.5,h+1.1,massZ+3.50)", "new THREE.Vector3(massX-width*.5,0,massZ-3.50),new THREE.Vector3(massX+width*.5,h+1.1,massZ+3.50)")
s=s.replace("if(within(x,massZ))", "if(within(massX,massZ))")
# Retain all parcel detail in aligned body space, preserving the street-side gate only if clear.
a=s.index("       for(let f=1;f<levels;f++){",s.index('function buildCatalogResidential'));b=s.index("       if(!u){\n         clearPlotBox(geos,x,.9",a)
sub=s[a:b].replace('clearPlotBox(geos,x,','clearPlotBox(geos,massX,').replace('clearPlotBox(geos,x+','clearPlotBox(geos,massX+').replace("const mx=x+", "const mx=massX+")
s=s[:a]+sub+s[b:]
open(p,'w').write(s)
PY
node /tmp/v80-console.mjs | grep -E 'Catalog residential|CONSOLE error|status' | head -10
