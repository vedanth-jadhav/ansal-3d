# Sunday, September 27, 2026, 2:14:01 PM IST
cd /home/sandbox/v77; python3 - <<'PY'
p='src/districts.js';s=open(p).read();s=s.replace("   for(const [cell,geos] of cells){\n     const joined=", "   for(const [cell,geos] of cells){\n     if(!geos.length)continue;\n     const joined=");open(p,'w').write(s)
PY
node /tmp/v77-qa.mjs v80-road2 >/tmp/v80-road2.jsonl 2>&1; cat /tmp/v80-road2.jsonl | cut -c1-220; tail -4 /tmp/v80-road2.jsonl | cut -c1-220
