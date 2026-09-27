/* Data-only contract, not a claim that the six-stop tour has been migrated. */
export class MissionRuntime {
 constructor({definitions=[],pois=new Map()}){this.definitions=new Map();this.pois=pois;this.active=null;this.completed=new Set();
  for(const d of definitions){if(!d.id||!Array.isArray(d.stages)||!d.stages.length||!d.stages.every(s=>s.type==='reachPOI'&&s.poiId&&pois.has(s.poiId)))continue;this.definitions.set(d.id,d)}
 }
 start(id){const def=this.definitions.get(id);if(!def)return {ok:false,reason:'missing mission or POI'};if(this.active)return {ok:false,reason:'mission already active'};this.active={id,stage:0,elapsed:0,seen:new Set()};return {ok:true}}
 update(dt,state,events=[]){if(!this.active)return [];const current=this.active,def=this.definitions.get(current.id);current.elapsed+=dt;const s=def.stages[current.stage];const fired=[];
  for(const e of events){const id=e.eventId??e.sequence;if(id===undefined||current.seen.has(id))continue;if(s?.type==='reachPOI'&&e.type==='enteredPOI'&&e.poiId===s.poiId&&(!s.mode||s.mode===e.mode)){current.seen.add(id);current.stage++;fired.push({type:'stageComplete',missionId:current.id,stage:current.stage});break}}
  if(current.stage>=def.stages.length){this.completed.add(current.id);fired.push({type:'missionFinished',missionId:current.id});this.active=null}return fired}
 abandon(){this.active=null}
 snapshot(){return {active:this.active&&{id:this.active.id,stage:this.active.stage,elapsed:this.active.elapsed,seen:[...this.active.seen]},completed:[...this.completed]}}
 destroy(){this.active=null;this.definitions.clear()}
}
