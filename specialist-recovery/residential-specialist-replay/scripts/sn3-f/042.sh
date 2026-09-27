# Sunday, September 27, 2026, 2:06:35 PM IST
cd /home/sandbox/v77; python3 - <<'PY'
p='src/districts.js';s=open(p).read();s=s.replace("       const base=u?0xa98470:wall;\n       addBox", "       const base=u?0xa98470:wall;\n       colliders.push(new THREE.Box3(new THREE.Vector3(x-width*.5,0,massZ-3.50),new THREE.Vector3(x+width*.5,h+1.1,massZ+3.50)));\n       addBox",1);s=s.replace("Audit IDs/evidence remain in public/parcel-catalog-v78.jsonl.","Audit IDs/evidence remain in public/parcel-catalog-v80.jsonl.");s=s.replace("// Northern frontage faces +z, southern frontage -z. The v80 point", "// Northern frontage faces -z, southern frontage +z. The v80 point");s=s.replace("       const h=levels*2.8,depth=7.1,width=7.8;", "       const h=levels*2.8,width=7.8;");open(p,'w').write(s)
PY
npm run build >/tmp/v80-final-build.log 2>&1; tail -6 /tmp/v80-final-build.log
node /tmp/v77-qa.mjs v80-collision >/tmp/v80-collision.jsonl 2>&1; cat /tmp/v80-collision.jsonl | cut -c1-225
