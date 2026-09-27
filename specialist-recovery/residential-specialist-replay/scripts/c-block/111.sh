# Sunday, September 27, 2026, 2:49:15 PM IST
cd /home/sandbox/v77; python3 - <<'PY'
p='src/districts.js';s=open(p).read();s=s.replace('   const cells=new Map(),placed=[];\n   const roadMask=', '   const cells=new Map();\n   const roadMask=',1);a=s.index('     // Cell layout must stay inside its catalog plot spacing.');b=s.index('     const cell=',a);s=s[:a]+s[b:];open(p,'w').write(s)
PY
node /tmp/v80-console.mjs 2>&1 | rg 'Catalog C Block|PAGEERROR'
