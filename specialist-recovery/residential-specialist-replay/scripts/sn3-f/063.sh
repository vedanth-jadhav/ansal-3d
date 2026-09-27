# Sunday, September 27, 2026, 2:19:16 PM IST
cd /home/sandbox/v77; python3 - <<'PY'
p='src/districts.js';s=open(p).read();s=s.replace("     if(catalogSeen.has(id))continue;catalogSeen.add(id);", "     if(catalogSeen.has(id))continue;catalogSeen.add(id);")
s=s.replace("       const u=kind==='U'; if(u)unfinished++;else built++;", "       const u=kind==='U';")
s=s.replace("       if(best.gap<0||best.shift>14||!clearPlotBox(geos,massX,h/2,massZ,width,h,7.0,base)){omitted.push([id,'mass-road']);continue}", "       if(best.gap<0||best.shift>14||!clearPlotBox(geos,massX,h/2,massZ,width,h,7.0,base)){omitted.push([id,'mass-road']);continue}\n       if(u)unfinished++;else built++;")
s=s.replace("       if(kind==='W'){walls++;clearPlotBox(geos,x,1.05,front+sign*.5,2.5,2.1,.18,0x898e8a)}", "       if(kind==='W'){walls++;clearPlotBox(geos,x,1.05,front+sign*.5,2.5,2.1,.18,0x898e8a)}")
open(p,'w').write(s)
PY
node /tmp/v80-ring.mjs >/tmp/v82-ring.json 2>&1; cat /tmp/v82-ring.json | cut -c1-1500
npm run build >/tmp/v82-build.log 2>&1; tail -4 /tmp/v82-build.log; diff -u --label a/src/districts.js --label b/src/districts.js /tmp/v77-districts-base.js src/districts.js >/downloads/catalog-v82-residential-roadmask.patch || true; wc -l /downloads/catalog-v82-residential-roadmask.patch
