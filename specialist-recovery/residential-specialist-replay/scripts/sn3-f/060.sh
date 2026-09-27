# Sunday, September 27, 2026, 2:16:46 PM IST
cd /home/sandbox/v77; python3 - <<'PY'
p='src/districts.js';s=open(p).read();s=s.replace("     if(Math.hypot(x-anchorX,z-anchorZ)>10||roadGap(x,z)<0){omitted.push([id,'anchor-road']);continue}", "     if(Math.hypot(x-anchorX,z-anchorZ)>10||roadGap(x,z)<0){omitted.push([id,'anchor-road']);continue}")
s=s.replace("       if(!clearPlotBox(geos,massX,h/2,massZ,width,h,7.0,base)){omitted.push([id,'mass-road']);continue}", "       if(best.gap<0||best.shift>14||!clearPlotBox(geos,massX,h/2,massZ,width,h,7.0,base)){omitted.push([id,'mass-road']);continue}")
open(p,'w').write(s)
PY
node /tmp/v80-console.mjs | grep -E 'Catalog residential|CONSOLE error|status' | head -10
node /tmp/v77-qa.mjs v82-road-final >/tmp/v82-road-final.jsonl 2>&1; cat /tmp/v82-road-final.jsonl | cut -c1-220
