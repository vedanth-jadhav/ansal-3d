# Sunday, September 27, 2026, 2:07:56 PM IST
cd /home/sandbox/v77; python3 - <<'PY'
p='src/districts.js';s=open(p).read();s=s.replace("       colliders.push(new THREE.Box3(new THREE.Vector3(x-width*.5,0,massZ-3.50),new THREE.Vector3(x+width*.5,h+1.1,massZ+3.50)));", "       if(within(x,massZ))colliders.push(new THREE.Box3(new THREE.Vector3(x-width*.5,0,massZ-3.50),new THREE.Vector3(x+width*.5,h+1.1,massZ+3.50))); ")
open(p,'w').write(s)
PY
cat > /tmp/v80-ring.mjs <<'EOF'
import puppeteer from '/home/sandbox/v77/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js';const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader']});const p=await b.newPage();await p.setViewport({width:844,height:390,isMobile:true,hasTouch:true});p.on('pageerror',e=>console.error(e.message));await p.goto('http://127.0.0.1:5194/');await p.waitForSelector('#status',{hidden:true,timeout:25000}).catch(()=>{});await p.click('#playBtn');let out=[];for(const [x,z,h] of [[-322,61,2.2],[-322+200,61,0],[-322-200,61,3.14],[-322,61+315,0],[-322,61-315,0],[-322+335,61,0],[-322-335,61,3.14]]){await p.evaluate(([x,z,h])=>window.__ansalDebugWarp(x,z,h),[x,z,h]);await new Promise(r=>setTimeout(r,750));out.push([x,z,await p.evaluate(()=>window.__ansalStats())])}console.log(JSON.stringify(out));await b.close();
EOF
node /tmp/v80-ring.mjs >/tmp/v80-ring.json 2>&1; cat /tmp/v80-ring.json | cut -c1-1300
