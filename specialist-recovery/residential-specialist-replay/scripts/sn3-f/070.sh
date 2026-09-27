# Sunday, September 27, 2026, 2:21:15 PM IST
cd /home/sandbox/v77; python3 - <<'PY'
p='src/districts.js';s=open(p).read().replace('v80 records','v82 records').replace('The v80 catalog','The v82 catalog').replace('v80 frontage points','v82 frontage points').replace("// FBN-008 and FBS-008 are separate sides after v80's 12m correction.","// FBN-008 and FBS-008 denote separate sides of the road.").replace('     // Clip the lane-facing depth against the road mask. Keep a box only\n     // when its center and all four footprint corners remain beyond the curb.','     // Keep the entire footprint, including edges and interior, outside the road corridor.').replace('       // Slide an entire parcel volume behind the frontage until every body\n       // corner clears all mapped roads, including perpendicular cross streets.','       // Slide an entire parcel volume behind the frontage until its footprint\n       // clears all mapped roads, including perpendicular cross streets.')
open(p,'w').write(s)
PY
node /tmp/v77-qa.mjs v82-roadmask >/tmp/v82-final-qa.jsonl 2>&1; node /tmp/v80-ring.mjs >/tmp/v82-final-ring.json 2>&1; tail -3 /tmp/v82-final-qa.jsonl | cut -c1-260; python3 - <<'PY'
import json
for l in open('/tmp/v82-final-qa.jsonl'):
 try:
  x=json.loads(l); v=x['results'];print(x['id'], [(z['calls'],z['triangles'],z['geometries']) for z in v],x['errors'])
 except:print(l[:300])
x=json.load(open('/tmp/v82-final-ring.json'));print('ring peak',max(row[2]['calls'] for row in x),max(row[2]['geometries'] for row in x),max(row[2]['triangles'] for row in x))
PY
