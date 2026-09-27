# Sunday, September 27, 2026, 2:49:37 PM IST
cd /home/sandbox/v77; python3 - <<'PY'
p='src/districts.js';s=open(p).read().replace('const cBlockVisuals=new THREE.Group();scene.add(cBlockVisuals);','const cBlockVisuals=new THREE.Group();scene.add(cBlockVisuals);')
s=s.replace('   let built=0,clipped=0,maxAnchorShift=0,maxMassShift=0;const omitted=[];', '   let built=0,clipped=0,maxAnchorShift=0,maxMassShift=0;const omitted=[],placed=[];')
a=s.index('     let chosen=null;',s.index('function buildCBlockResidential'));b=s.index('     maxMassShift=Math.max(maxMassShift,chosen.shift);',a)
s=s[:a]+'''     let chosen=null;
     for(let step=0;step<=12;step++)for(const lateral of [0,-.5,.5,-1,1,-1.5,1.5,-2,2,-2.5,2.5,-3,3,-4,4,-5,5,-6,6,-7,7,-8,8,-9,9]){
       const cx=x+sign*(5.2+step*1.1),cz=z+lateral,shift=Math.hypot(step*1.1,lateral);
       if(gap(cx,cz,d,w)<0)continue;
       if(placed.some(v=>Math.abs(v.x-cx)<d&&Math.abs(v.z-cz)<w))continue;
       if(!chosen||shift<chosen.shift)chosen={x:cx,z:cz,shift};
     }
     if(!chosen||chosen.shift>14){omitted.push([id,'mass-road-or-neighbor']);continue}
''' +s[b:]
s=s.replace('     const cx=chosen.x,cz=chosen.z,face=cx-sign*3.5;', '     const cx=chosen.x,cz=chosen.z,face=cx-sign*3.5;\n     placed.push({x:cx,z:cz});')
open(p,'w').write(s)
PY
node /tmp/v80-console.mjs 2>&1 | rg 'Catalog C Block|PAGEERROR'
