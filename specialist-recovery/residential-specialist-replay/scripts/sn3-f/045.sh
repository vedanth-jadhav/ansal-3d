# Sunday, September 27, 2026, 2:08:27 PM IST
cd /home/sandbox/v77; python3 - <<'PY'
p='src/districts.js';s=open(p).read();s=s.replace(" const residentialParcels=", " // Compact tuples generated from the active, non-superseded SN3/FBN/FBS v80 records.\n // [parcel_id,frontage_x,frontage_z,kind,storeys,tone,gate,flags].\n const residentialParcels=")
s=s.replace(" // Catalog v80 keeps one identifier per visible frontage, including vacant lots", " // Catalog v80 keeps one identifier per visible frontage, including vacant lots")
s=s.replace(" // Northern frontage faces -z, southern frontage +z. The v80 point", " // Northern frontage faces -z, southern frontage +z. The v80 point")
s=s.replace("       // Shallow, evidence-led row: the catalog point is a frontage anchor.\n       // A little frontage margin keeps a wide mapped street walkable.", "       // Shallow interpreted row: the catalog point is a frontage anchor,\n       // not a measured building footprint. Leave the mapped road walkable.")
s=s.replace("       if(within(x,massZ))colliders.push(new THREE.Box3(new THREE.Vector3(x-width*.5,0,massZ-3.50),new THREE.Vector3(x+width*.5,h+1.1,massZ+3.50))); ", "       if(within(x,massZ))colliders.push(new THREE.Box3(new THREE.Vector3(x-width*.5,0,massZ-3.50),new THREE.Vector3(x+width*.5,h+1.1,massZ+3.50)));")
s=s.replace("const g=new THREE.BoxGeometry(w,h,d);g.translate(x,y,z);\n     if(rotation)g.rotateY(rotation);", "const g=new THREE.BoxGeometry(w,h,d);g.translate(x,y,z);")
s=s.replace("const addBox=(list,x,y,z,w,h,d,color,rotation=0)=>{", "const addBox=(list,x,y,z,w,h,d,color)=>{")
open(p,'w').write(s)
PY
npm run build >/tmp/v80-final-build2.log 2>&1; tail -3 /tmp/v80-final-build2.log; diff -u --label a/src/districts.js --label b/src/districts.js /tmp/v77-districts-base.js src/districts.js >/downloads/catalog-v80-residential-districts.patch || true
python3 - <<'PY'
import json
base={x['parcel_id']:x for x in map(json.loads,open('/downloads/catalog-33f0d429.jsonl'))}
for id in ('ANS-FBN-008','ANS-FBS-008','ANS-SN3N-016'):
 x=base[id]; print(id,x['status'],x.get('superseded_by'),x['floors'],x['game_x'],x['game_z'])
PY
