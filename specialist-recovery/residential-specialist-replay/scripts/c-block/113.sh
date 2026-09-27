# Sunday, September 27, 2026, 2:49:58 PM IST
cd /home/sandbox/v77; python3 - <<'PY'
p='src/districts.js';s=open(p).read().replace('maxMassShift=0;const omitted=[],placed=[];', 'maxMassShift=0;const omitted=[],placed=[];');s=s.replace('if(placed.some(v=>Math.abs(v.x-cx)<d&&Math.abs(v.z-cz)<w))continue;', 'if(placed.some(v=>Math.abs(v.x-cx)<d&&Math.abs(v.z-cz)<w))continue;');open(p,'w').write(s)
PY
node /tmp/cblock-probe.mjs >/tmp/cblock-v85-layout-probe.log 2>&1; head -3 /tmp/cblock-v85-layout-probe.log; tail -2 /tmp/cblock-v85-layout-probe.log; node /tmp/v80-ring.mjs >/tmp/cblock-v85-layout-ring.json 2>&1; python3 - <<'PY'
import json
r=json.load(open('/tmp/cblock-v85-layout-ring.json'));print([(x,z,v['calls'],v['triangles'],v['geometries']) for x,z,v in r])
PY
