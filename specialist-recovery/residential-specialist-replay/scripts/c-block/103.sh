# Sunday, September 27, 2026, 2:43:38 PM IST
cd /home/sandbox/v77; python3 - <<'PY'
p='src/districts.js';s=open(p).read();s=s.replace(' function buildCBlockResidential(){\n   let built', ' function buildCBlockResidential(){\n   const cBlockVisuals=new THREE.Group();scene.add(cBlockVisuals);\n   let built');s=s.replace("mesh.name='catalog:'+cell;mesh.userData.batchRegion='core';mesh.userData.dBlockFar=true;\n     mesh.castShadow=false;mesh.receiveShadow=true;staticWorld.add(mesh);", "mesh.name='catalog:'+cell;\n     mesh.castShadow=false;mesh.receiveShadow=true;cBlockVisuals.add(mesh);");open(p,'w').write(s)
PY
node /tmp/cblock-probe.mjs >/tmp/cblock-separate-probe.log 2>&1; head -3 /tmp/cblock-separate-probe.log; tail -2 /tmp/cblock-separate-probe.log; node /tmp/v80-ring.mjs >/tmp/cblock-separate-ring.json 2>&1; python3 - <<'PY'
import json
r=json.load(open('/tmp/cblock-separate-ring.json'));print([(x,z,v['calls'],v['triangles'],v['geometries']) for x,z,v in r])
PY
