# Sunday, September 27, 2026, 2:48:56 PM IST
cd /home/sandbox/v77; python3 - <<'PY'
p='src/districts.js';s=open(p).read();needle="     const cx=chosen.x,cz=chosen.z,face=cx-sign*3.5;";rep="""     const cx=chosen.x,cz=chosen.z,face=cx-sign*3.5;
     // Cell layout must stay inside its catalog plot spacing. Cross-street
     // displacements may consume a side gap; reject overlapping masses.
     const conflict=placed.some(v=>Math.abs(v.x-cx)<7.8&&Math.abs(v.z-cz)<7.8);
     if(conflict){omitted.push([id,'overlap-neighbor']);continue}
     placed.push({x:cx,z:cz});""";s=s.replace('   const cells=new Map();\n   const roadMask=', '   const cells=new Map(),placed=[];\n   const roadMask=',1);s=s.replace(needle,rep,1);open(p,'w').write(s)
PY
node /tmp/v80-console.mjs 2>&1 | rg 'Catalog C Block|PAGEERROR'
