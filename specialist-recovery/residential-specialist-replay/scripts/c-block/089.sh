# Sunday, September 27, 2026, 2:32:21 PM IST
cd /home/sandbox/v77; python3 - <<'PY'
p='src/districts.js';s=open(p).read().replace("mesh.name='catalog:'+cell;mesh.userData.batchRegion='core';mesh.userData.dBlockFar=true;", "mesh.name='catalog:'+cell;mesh.userData.batchRegion='core';mesh.userData.dBlockFar=false;")
open(p,'w').write(s)
PY
node /tmp/v80-ring.mjs >/tmp/cblock-ring.json 2>&1; python3 - <<'PY'
import json
r=json.load(open('/tmp/cblock-ring.json'));print([(x,z,v['calls'],v['triangles'],v['geometries']) for x,z,v in r])
PY
node /tmp/cblock-probe.mjs >/tmp/cblock-probe2.log 2>&1; tail -10 /tmp/cblock-probe2.log
