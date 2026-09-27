/* Data-driven one-active-job engine; no geometry or independent scheduler. */
const STAGES=new Set(['reachPOI','visitOrdered','visitUnordered','collect','deliver','returnToStart']);
const VALID_MODE=new Set(['walk','drive','either']);
export class MissionRuntime {
 constructor({definitions=[],pois=new Map()}){
  this.definitions=new Map();this.invalid=new Map();this.pois=pois;this.active=null;this.completed=new Set();this.best=new Map();
  for(const d of definitions){let reason=this.validate(d);if(reason)this.invalid.set(d?.id||'unknown',reason);else this.definitions.set(d.id,d)}
 }
 validate(d){if(!d?.id||!Array.isArray(d.stages)||!d.stages.length)return 'missing mission or stages';
  if(d.timer!=null&&(!Number.isFinite(d.timer)||d.timer<=0))return 'invalid timer';
  for(const stage of d.stages){if(!STAGES.has(stage.type))return 'unsupported stage';if(stage.mode&&!VALID_MODE.has(stage.mode))return 'invalid mode';
   const targets=stage.poiIds??(stage.poiId?[stage.poiId]:[]);if(!targets.length||targets.some(id=>!this.pois.has(id)))return 'missing mission or POI';
  }return null}
 start(id){const def=this.definitions.get(id);if(!def)return {ok:false,reason:this.invalid.get(id)||'missing mission or POI'};if(this.active)return {ok:false,reason:'mission already active'};
  this.active={id,stage:0,elapsed:0,seen:new Set(),visited:new Set(),heat:0,collisions:0,score:0};return {ok:true}}
 update(dt,state,events=[]){if(!this.active)return [];const a=this.active,def=this.definitions.get(a.id),fired=[];a.elapsed+=Math.max(0,Math.min(.05,dt));
  if(def.timer&&a.elapsed>def.timer){fired.push({type:'missionFailed',missionId:a.id,reason:'time limit'});this.active=null;return fired}
  for(const e of events){const id=e.eventId??e.sequence;if(id===undefined||a.seen.has(id))continue;
   let stage=def.stages[a.stage];if(!stage)break;
   if(e.type==='collision'){a.collisions++;a.heat=Math.min(5,a.heat+.25);a.seen.add(id);continue}
   if(e.type!=='enteredPOI'||!e.poiId||!this.pois.has(e.poiId))continue;
   if(stage.mode&&stage.mode!=='either'&&stage.mode!==e.mode)continue;
   const targets=stage.poiIds??[stage.poiId];if(!targets.includes(e.poiId)||a.visited.has(e.poiId))continue;
   a.seen.add(id);a.visited.add(e.poiId);
   if(stage.type==='visitUnordered'&&a.visited.size<targets.length){fired.push({type:'visitRecorded',missionId:a.id,poiId:e.poiId,visited:a.visited.size,total:targets.length});continue}
   a.stage++;a.visited.clear();fired.push({type:'stageComplete',missionId:a.id,stage:a.stage,poiId:e.poiId});
   if(a.stage>=def.stages.length){a.score=Math.max(0,Math.round(1000-a.elapsed*2-a.collisions*100));this.completed.add(a.id);this.best.set(a.id,Math.max(this.best.get(a.id)||0,a.score));fired.push({type:'missionFinished',missionId:a.id,score:a.score,elapsed:a.elapsed});this.active=null;break}
  }
  if(this.active){a.heat=Math.max(0,a.heat-Math.max(0,dt)*.025)}return fired}
 abandon(){this.active=null}
 restore(saved){if(!saved||!Array.isArray(saved.completed))return {ok:false,reason:'invalid mission save'};this.completed=new Set(saved.completed.filter(id=>this.definitions.has(id)));this.best=new Map(Object.entries(saved.best||{}).filter(([id,score])=>this.definitions.has(id)&&Number.isFinite(score)&&score>=0));const a=saved.active;if(a&&this.definitions.has(a.id)&&Number.isInteger(a.stage)&&a.stage>=0&&a.stage<this.definitions.get(a.id).stages.length&&Number.isFinite(a.elapsed)&&a.elapsed>=0){this.active={id:a.id,stage:a.stage,elapsed:a.elapsed,seen:new Set((a.seen||[]).filter(x=>typeof x==='string'||Number.isInteger(x))),visited:new Set((a.visited||[]).filter(id=>this.pois.has(id))),heat:Math.min(5,Math.max(0,Number(a.heat)||0)),collisions:Math.max(0,Number(a.collisions)||0),score:0}}else this.active=null;return {ok:true,active:!!this.active}}
 snapshot(){return {active:this.active&&{id:this.active.id,stage:this.active.stage,elapsed:this.active.elapsed,seen:[...this.active.seen],visited:[...this.active.visited],heat:this.active.heat,collisions:this.active.collisions},completed:[...this.completed],best:Object.fromEntries(this.best)}}
 destroy(){this.active=null;this.definitions.clear()}
}
