# Sunday, September 27, 2026, 2:48:47 PM IST
cd /home/sandbox/v77; python3 - <<'PY'
p='src/districts.js';s=open(p).read().replace("     // Colliders for this LOD corridor are added by its visible close meshes\n     // in the integration pass; do not leave invisible walls at D Block.", "     if(within(cx,cz))colliders.push(new THREE.Box3(new THREE.Vector3(cx-d/2,0,cz-w/2),new THREE.Vector3(cx+d/2,h+1,cz+w/2)));")
open(p,'w').write(s)
PY
sed -n '1,15p' src/core/batch.js; rg -n 'lod.position|cBlockVisuals|cell=|built\+\+' src/districts.js | tail -20; diff -u --label a/src/districts.js --label b/src/districts.js /tmp/v82-rc4-base.js src/districts.js >/downloads/catalog-v85-cblock-districts.patch || true; wc -l /downloads/catalog-v85-cblock-districts.patch; mkdir -p /tmp/cblock-applycheck/src; cp /tmp/v82-rc4-base.js /tmp/cblock-applycheck/src/districts.js; patch --dry-run --batch -p1 -d /tmp/cblock-applycheck < /downloads/catalog-v85-cblock-districts.patch
