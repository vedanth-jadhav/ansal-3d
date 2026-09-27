# Sunday, September 27, 2026, 2:15:36 PM IST
cd /home/sandbox/v77; python3 - <<'PY'
p='src/districts.js';s=open(p).read();s=s.replace("   const cells=new Map(), catalogSeen=new Set();let built=0,vacant=0,unfinished=0,walls=0;", "   const cells=new Map(), catalogSeen=new Set();let built=0,vacant=0,unfinished=0,walls=0,omitted=[];")
s=s.replace("     if(Math.hypot(x-anchorX,z-anchorZ)>10||roadGap(x,z)<0){continue}", "     if(Math.hypot(x-anchorX,z-anchorZ)>10||roadGap(x,z)<0){omitted.push([id,'anchor-road']);continue}")
s=s.replace("       if(!clearPlotBox(geos,x,h/2,massZ,width,h,7.0,base))continue;", "       if(!clearPlotBox(geos,x,h/2,massZ,width,h,7.0,base)){omitted.push([id,'mass-road']);continue}")
s=s.replace("     const joined=mergeGeometries(geos,false);", "     const joined=mergeGeometries(geos,false);")
s=s.replace("walls,cells:cells.size", "walls,cells:cells.size,omitted")
open(p,'w').write(s)
PY
node /tmp/v80-console.mjs | grep -E 'Catalog residential|CONSOLE error|status' | head -10
