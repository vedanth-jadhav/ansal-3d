import {MissionRuntime} from './MissionRuntime.js';
import {missionDefinitions} from './mission-definitions.js';
export class MissionBoard {
 constructor({world,player,gameEvents=()=>[]}){this.world=world;this.player=player;this.gameEvents=gameEvents;this.runtime=new MissionRuntime({definitions:missionDefinitions,pois:world.poiById});this.inside=new Set();this.enabled=false;this.sequence=0;this.elapsed=0;this.timer=0;
  this.root=document.createElement('aside');this.root.id='newMissions';this.root.innerHTML='<button id="jobToggle" aria-expanded="false">JOBS</button><div id="jobPanel" hidden><h2>Jobs</h2><div id="jobList"></div><button id="jobAbandon" hidden>Abandon job</button></div><div id="jobStrip" aria-live="polite"></div>';document.body.append(this.root);this.root.hidden=true;
  const list=this.root.querySelector('#jobList');for(const d of missionDefinitions){let btn=document.createElement('button');btn.textContent=d.title;btn.dataset.id=d.id;btn.onclick=()=>this.start(d.id);list.append(btn)}
  this.root.querySelector('#jobToggle').onclick=()=>{let panel=this.root.querySelector('#jobPanel');panel.hidden=!panel.hidden;this.root.querySelector('#jobToggle').setAttribute('aria-expanded',String(!panel.hidden))};this.root.querySelector('#jobAbandon').onclick=()=>{this.runtime.abandon();this.onChange?.();this.render()};this.render();
 }
 start(id){if(globalThis.window?.__ansalLegacyMission?.engine?.snapshot?.().active){this.root.querySelector('#jobStrip').textContent='Finish or leave the current mission first';return}const r=this.runtime.start(id);if(!r.ok){this.root.querySelector('#jobStrip').textContent=r.reason;return}this.inside.clear();this.elapsed=0;this.onChange?.();this.root.querySelector('#jobPanel').hidden=true;this.root.querySelector('#jobToggle').setAttribute('aria-expanded','false');this.render()}
 update(dt){if(!this.enabled||document.hidden||this.paused)return;this.timer+=dt;let a=this.runtime.active;if(a){const p=this.player(),events=this.gameEvents();if(p){for(const [id,poi] of this.world.poiById){const d=Math.hypot(p.x-poi.position.x,p.z-poi.position.z),inside=d<(poi.radius||18);if(inside&&!this.inside.has(id))events.push({type:'enteredPOI',poiId:id,mode:p.mode,eventId:++this.sequence});if(inside)this.inside.add(id);else if(d>(poi.radius||18)+3)this.inside.delete(id)}}
   const result=this.runtime.update(dt,p,events);if(events.length)this.onChange?.();if(result.some(e=>e.type==='missionFinished'||e.type==='missionFailed')){this.result=result.at(-1);this.elapsed=5;this.onChange?.()}
  }
  if(this.elapsed>0)this.elapsed-=dt;if(this.timer>.18){this.timer=0;this.render()}
 }
 render(){const a=this.runtime.active;document.body.classList.toggle('new-job-active',!!a);const strip=this.root.querySelector('#jobStrip');this.root.querySelector('#jobAbandon').hidden=!a;for(const b of this.root.querySelectorAll('#jobList button'))b.disabled=!!a;
  if(!a){strip.textContent=this.elapsed>0&&this.result?(this.result.type==='missionFinished'?`Job complete · ${this.result.score} points`:'Job failed · time ran out'):'';return}
  const d=this.runtime.definitions.get(a.id),s=d.stages[a.stage],target=s.poiIds?s.poiIds.filter(id=>!a.visited.has(id)).map(id=>this.world.poiById.get(id).name).join(' / '):this.world.poiById.get(s.poiId).name;
  const remaining=d.timer?` · ${Math.ceil(Math.max(0,d.timer-a.elapsed))}s`:'';strip.textContent=`${d.title} · ${a.stage+1}/${d.stages.length}: ${target}${remaining}`
 }
 restore(saved){const r=this.runtime.restore(saved);this.sequence=Math.max(this.sequence,...[...(this.runtime.active?.seen||[])].filter(Number.isInteger),0);this.inside.clear();this.render();return r}
 setEnabled(value){this.enabled=!!value;this.root.hidden=!this.enabled;if(!this.enabled)this.root.querySelector('#jobPanel').hidden=true}
 setPaused(value){this.paused=!!value}
 destroy(){document.body.classList.remove('new-job-active');this.root.remove();this.runtime.destroy()}
}
