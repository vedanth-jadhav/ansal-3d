# Sunday, September 27, 2026, 2:48:41 PM IST
cd /home/sandbox/v77; sed -n '12,60p' src/core/batch.js; python3 - <<'PY'
p='src/districts.js';s=open(p).read();s=s.replace("   const cBlockVisuals=new THREE.Group();scene.add(cBlockVisuals);", "   const cBlockVisuals=new THREE.Group();scene.add(cBlockVisuals);")
s=s.replace("     if(within(cx,cz))colliders.push(new THREE.Box3(new THREE.Vector3(cx-d/2,0,cz-w/2),new THREE.Vector3(cx+d/2,h+1,cz+w/2)));", "     // Colliders for this LOD corridor are added by its visible close meshes\n     // in the integration pass; do not leave invisible walls at D Block.")
open(p,'w').write(s)
PY
