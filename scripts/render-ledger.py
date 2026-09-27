#!/usr/bin/env python3
"""Render the tracked parcel/checkpoint table from catalog plus merge-log history."""
import json,pathlib,hashlib,datetime
root=pathlib.Path(__file__).resolve().parents[1]
cat=root/'public/parcel-catalog-v90.jsonl';rows=[json.loads(x) for x in cat.read_text().splitlines() if x.strip()]
log=root/'public/docs/ledger/merge-log.jsonl';events=[json.loads(x) for x in log.read_text().splitlines() if x.strip()]
state={r['parcel_id']:{'status':'generic','owner':'unassigned','patch':'none','build':'none','delta':'n/m','remaining':'No parcel-specific geometry has been linked or compared against the cited reference.'} for r in rows}
for e in events:
 for item in e.get('parcels',[]):
  i=item['parcel_id']
  if i in state: state[i].update({k:v for k,v in item.items() if k!='parcel_id'})
 def esc(x):return str(x).replace('|','/').replace('\n',' ')
lines=['# Ansal Sushant City 3D - detail ledger','',f'Catalog: `public/parcel-catalog-v90.jsonl` ({len(rows)} entries, sha256 `{hashlib.sha256(cat.read_bytes()).hexdigest()}`). Game source is a WIP; evidence coverage is not visual implementation.','', '## Catalog entries','', '| Parcel ID | Anchor x,z | Evidence refs | Catalog status | Detail status | Owning agent | Patch / merge build | Budget delta at merge | Remaining work |','|---|---:|---|---|---|---|---|---|---|']
for r in rows:
 s=state[r['parcel_id']];lines.append('| '+' | '.join(map(esc,[r['parcel_id'],f"{r['game_x']},{r['game_z']}",'; '.join(r['evidence']),r['status'],s['status'],s['owner'],s['patch']+' / '+s['build'],s['delta'],s['remaining']]))+' |')
lines+=['','## Checkpoints and turns','','| Checkpoint / turn | Current scene status | Evidence refs | Owning agent | Patch / merge build | Budget at merge | Remaining work |','|---|---|---|---|---|---|---|']
for e in events:
 for c in e.get('checkpoints',[]):
  lines.append('| '+' | '.join(map(esc,[c['name'],c['status'],c['evidence'],c['owner'],c['patch']+' / '+e['build'],c['budget'],c['remaining']]))+' |')
lines+=['','## Merge history','','| Build ID | Patch IDs | Budget observation | Notes |','|---|---|---|---|']
for e in events:lines.append('| '+' | '.join(map(esc,[e['build'],', '.join(e['patches']),e['budget'],e['note']]))+' |')
(root/'public/LEDGER.md').write_text('\n'.join(lines)+'\n')
print('rendered',len(rows),'catalog entries,',len(events),'merge events')