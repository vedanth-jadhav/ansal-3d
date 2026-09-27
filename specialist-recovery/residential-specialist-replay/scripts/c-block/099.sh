# Sunday, September 27, 2026, 2:38:11 PM IST
cd /home/sandbox/v77; cp src/districts.js /tmp/cblock-before-fix.js; python3 - <<'PY'
p='src/districts.js';s=open(p).read();s=s.replace('Wave R4 catalog v83 C-Block: frontage anchors','Wave R4 catalog v84 C-Block: frontage anchors').replace(' // All 43 active CBLE-010..033 and CBLW-015..033 records describe houses;\n // the occupancy interpretation remains explicit rather than inventing vacancies.',' // 43 active CBLE-010..033 and CBLW-015..033 records describe houses;\n // CBLE-019 is omitted as an ambiguous junction-mouth view of CBLE-020.\n // Do not invent vacant or unfinished lots where this scope cites only houses.')
s=s.replace("     const east=id.startsWith('ANS-CBLE-'),sign=east?1:-1;", "     if(id==='ANS-CBLE-019'){omitted.push([id,'ambiguous-junction-duplicate-of-020']);continue}\n     const east=id.startsWith('ANS-CBLE-'),sign=east?1:-1;")
s=s.replace("mesh.name='catalog:'+cell;mesh.userData.batchRegion='south';mesh.userData.dBlockFar=false;", "mesh.name='catalog:'+cell;mesh.userData.batchRegion='south';mesh.userData.dBlockFar=true;")
s=s.replace("{source:'v83',ids:cBlockParcels.length", "{source:'v84',ids:cBlockParcels.length")
open(p,'w').write(s)
PY
node /tmp/v80-console.mjs 2>&1 | rg 'Catalog C Block|PAGEERROR'; node /tmp/v80-ring.mjs >/tmp/cblock-v84-ring.json 2>&1; python3 - <<'PY'
import json
r=json.load(open('/tmp/cblock-v84-ring.json'));print([(x,z,v['calls'],v['triangles'],v['geometries']) for x,z,v in r])
PY
