# Sunday, September 27, 2026, 2:34:32 PM IST
cd /home/sandbox/v77; python3 - <<'PY'
p='src/districts.js';s=open(p).read();a=s.index('     let x=anchorX,z=anchorZ;',s.index('function buildCBlockResidential'));b=s.index('     const w=7.8',a)
s=s[:a]+'''     // Search the nearest defensible frontage displacement in the lotward
     // half-plane. Cross-street intersections can trap a gradient walk between
     // two parallel curbs; this grid search handles that case without oscillation.
     let chosenAnchor=null;
     for(let axial=0;axial<=10;axial+=.5)for(let lateral=-9;lateral<=9;lateral+=.5){
       const px=anchorX+sign*axial,pz=anchorZ+lateral,shift=Math.hypot(axial,lateral);
       if(shift>10)continue;
       if(gap(px,pz,.2,.2)>=2.3&&(!chosenAnchor||shift<chosenAnchor.shift))chosenAnchor={x:px,z:pz,shift};
     }
     if(!chosenAnchor){omitted.push([id,'anchor-road']);continue}
     let x=chosenAnchor.x,z=chosenAnchor.z;
     maxAnchorShift=Math.max(maxAnchorShift,chosenAnchor.shift);
''' +s[b:]
open(p,'w').write(s)
PY
node /tmp/v80-console.mjs 2>&1 | rg 'Catalog C Block|PAGEERROR|D Block generic'
