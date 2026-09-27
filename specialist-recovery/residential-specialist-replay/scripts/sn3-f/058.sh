# Sunday, September 27, 2026, 2:15:59 PM IST
cd /home/sandbox/v77; python3 - <<'PY'
p='src/districts.js';s=open(p).read();s=s.replace("       const massZ=front+sign*5.2,faceZ=front+sign*1.55;", """       // Slide an entire parcel volume behind the frontage until every body
       // corner clears all mapped roads, including perpendicular cross streets.
       // This is one systematic correction for frontage-anchor uncertainty.
       let massZ=front+sign*5.2,faceZ=front+sign*1.55;
       for(let pass=0;pass<16;pass++){
         const half=width*.5, corners=[[x-half,massZ-3.5],[x+half,massZ-3.5],[x-half,massZ+3.5],[x+half,massZ+3.5]];
         const min=Math.min(...corners.map(([xx,zz])=>roadGap(xx,zz)));
         if(min>=0)break;
         const push=Math.min(1.4,-min+.15);
         massZ+=sign*push;faceZ+=sign*push;
       }""")
s=s.replace("       if(within(x,massZ)&&roadGap(x,massZ)>=4.5)colliders.push(new THREE.Box3(new THREE.Vector3(x-width*.5,0,massZ-3.50),new THREE.Vector3(x+width*.5,h+1.1,massZ+3.50)));\n       if(!clearPlotBox(geos,x,h/2,massZ,width,h,7.0,base)){omitted.push([id,'mass-road']);continue}", "       if(!clearPlotBox(geos,x,h/2,massZ,width,h,7.0,base)){omitted.push([id,'mass-road']);continue}\n       if(within(x,massZ))colliders.push(new THREE.Box3(new THREE.Vector3(x-width*.5,0,massZ-3.50),new THREE.Vector3(x+width*.5,h+1.1,massZ+3.50)));")
open(p,'w').write(s)
PY
node /tmp/v80-console.mjs | grep -E 'Catalog residential|CONSOLE error|status' | head -10
