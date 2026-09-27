# Sunday, September 27, 2026, 1:59:06 PM IST
cd /home/sandbox/v77; cp src/districts.js /tmp/v79-candidate.js; python3 - <<'PY'
p='src/districts.js';s=open(p).read();s=s.replace("const sign=north?-1:1,sector=id.startsWith('ANS-SN3');", "const sign=north?-1:1,sector=id.startsWith('ANS-SN3');")
s=s.replace("const front=z+sign*.13;", "const front=z; const halfWidth=sector?4.15:4.0;\n     // v79 frontage points sit near each road edge; keep mass and forecourt\n     // behind the frontage. As-built width is illustrative, not cadastral.")
s=s.replace("const base=u?0xac8067:wall,back=front-sign*(depth/2+1.2);", "const base=u?0xac8067:wall,back=front+sign*(depth/2+1.8);")
s=s.replace("front-sign*.14", "front+sign*1.55")
s=s.replace("back-sign*2", "back+sign*2")
s=s.replace("back-sign*1", "back+sign*1")
s=s.replace("front-sign*.10", "front-sign*2.15")
s=s.replace("front+sign*.02", "front-sign*2.03")
s=s.replace("front-sign*1", "front+sign*1")
s=s.replace("front+sign*.30", "front-sign*1.85")
s=s.replace("front+sign*.33", "front-sign*1.82")
s=s.replace("front+sign*1.4", "front-sign*.68")
s=s.replace("front+sign*1.35", "front-sign*.55")
s=s.replace("front-sign*3", "front+sign*2.5")
# Correct front orientation overall based road coordinate direction: North side mass extends to more-negative z, south to more-positive z.
# Bound by no user-playable centerline overlap; adjust walls from overlapping positions.
s=s.replace("const front=z; const halfWidth=sector?4.15:4.0;", "const front=z; ")
open(p,'w').write(s)
PY
node /tmp/v77-qa.mjs v79-setback >/tmp/v79-setback.jsonl 2>&1; cat /tmp/v79-setback.jsonl | cut -c1-240
