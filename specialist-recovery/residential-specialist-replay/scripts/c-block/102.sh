# Sunday, September 27, 2026, 2:41:53 PM IST
cd /home/sandbox/v77; python3 - <<'PY'
p='src/districts.js';s=open(p).read();s=s.replace("mesh.name='catalog:'+cell;mesh.userData.batchRegion='core';mesh.userData.dBlockFar=false;", "mesh.name='catalog:'+cell;mesh.userData.batchRegion='core';mesh.userData.dBlockFar=true;");open(p,'w').write(s)
PY
node /tmp/cblock-probe.mjs >/tmp/cblock-v84-corefar-probe.log 2>&1; head -3 /tmp/cblock-v84-corefar-probe.log; tail -2 /tmp/cblock-v84-corefar-probe.log; node /tmp/v80-ring.mjs >/tmp/cblock-v84-corefar-ring.json 2>&1; python3 - <<'PY'
import json
r=json.load(open('/tmp/cblock-v84-corefar-ring.json'));print([(x,z,v['calls'],v['triangles'],v['geometries']) for x,z,v in r])
PY
