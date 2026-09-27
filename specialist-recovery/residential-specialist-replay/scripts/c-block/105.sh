# Sunday, September 27, 2026, 2:45:36 PM IST
cd /home/sandbox/v77; python3 - <<'PY'
p='src/districts.js';s=open(p).read();s=s.replace(' // Wave R4 catalog v84 C-Block: frontage anchors',' // Wave R4 catalog v85 C-Block: frontage anchors').replace("mesh.name='catalog:'+cell;\n     mesh.castShadow=false;mesh.receiveShadow=true;cBlockVisuals.add(mesh);", "mesh.name='catalog:'+cell;\n     mesh.castShadow=false;mesh.receiveShadow=true;\n     // Per-cell LOD culls these meshes at D Block without merging C into\n     // the fixed draw-range batch or hiding them at C walking distance.\n     const lod=new THREE.LOD();lod.position.set(0,0,0);lod.addLevel(mesh,0);lod.addLevel(new THREE.Group(),300);\n     cBlockVisuals.add(lod);").replace("{source:'v84',ids:cBlockParcels.length", "{source:'v85',ids:cBlockParcels.length")
# local LOD position at geometry center; geometry itself is world-space, so group position
# must be offset with mesh translation to avoid moving geometry.
s=s.replace("const lod=new THREE.LOD();lod.position.set(0,0,0);lod.addLevel(mesh,0);lod.addLevel(new THREE.Group(),300);", "const lod=new THREE.LOD();const center=joined.boundingSphere.center;lod.position.set(center.x,0,center.z);\n     mesh.position.set(-center.x,0,-center.z);lod.addLevel(mesh,0);lod.addLevel(new THREE.Group(),300);")
open(p,'w').write(s)
PY
node /tmp/cblock-probe.mjs >/tmp/cblock-lod-probe.log 2>&1; head -3 /tmp/cblock-lod-probe.log; tail -2 /tmp/cblock-lod-probe.log; node /tmp/v80-ring.mjs >/tmp/cblock-lod-ring.json 2>&1; python3 - <<'PY'
import json
r=json.load(open('/tmp/cblock-lod-ring.json'));print([(x,z,v['calls'],v['triangles'],v['geometries']) for x,z,v in r])
PY
