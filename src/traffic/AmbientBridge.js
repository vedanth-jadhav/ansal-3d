import {PedestrianRoutes} from './PedestrianRoutes.js';
import {JunctionController} from './JunctionController.js';
import {TrafficRoutePlanner} from './TrafficRoutePlanner.js';
/* Adapt the already-shipped RC2 ambient pools to the player vehicle and
 * pedestrian proximity. No duplicate rigs, meshes, or animation scheduler. */
export class AmbientBridge {
 constructor({experience}){this.experience=experience;this.pedRoutes=null;this.junctions=null;this.turns=null;this.stats={moving:0,parked:0,pedestrians:0,yielding:0,greeting:0}}
 update(layer,dt){if(!layer||!this.experience)return;const car=this.experience.mode==='drive'?this.experience.vehicle:null;
  const p=car?.position||this.experience.foot.getPosition();const traffic=layer.traffic,people=layer.npcs;if(people&&!this.pedRoutes)this.pedRoutes=new PedestrianRoutes({layer,world:this.experience.world});
  if(traffic){if(!this.junctions&&this.experience.world.roads)this.junctions=new JunctionController({roads:this.experience.world.roads,collisionWorld:this.experience.world.collisionWorld});if(!this.turns&&this.experience.world.roads)this.turns=new TrafficRoutePlanner({roads:this.experience.world.roads});const junctionStats=this.junctions?.update(traffic.vehicles,dt,car);const turnStats=this.turns?.update(traffic.vehicles);let yieldCount=0;for(const v of traffic.vehicles){const d=Math.hypot(v.obj.position.x-p.x,v.obj.position.z-p.z);
    if(car&&d<10){v.speed=Math.min(v.speed,.4);v.stopTimer=Math.max(v.stopTimer,Math.min(.2,dt*2));yieldCount++}
  }
  this.stats.moving=traffic.vehicles.length;this.stats.parked=traffic.parked.length;this.stats.yielding=yieldCount;this.stats.junctions=junctionStats;this.stats.turns=turnStats;
  // Ambient positions are read-only; driving uses the existing dynamic-circle query.
  const world=this.experience.world.collisionWorld;
  for(let i=0;i<traffic.vehicles.length;i++){const v=traffic.vehicles[i];world.setDynamic(`ambient:${i}`,v.obj.position,v.kind==='motorcycle'?1:1.8)}
  for(let i=traffic.vehicles.length;i<(this.previousTrafficCount||0);i++)world.removeDynamic(`ambient:${i}`);this.previousTrafficCount=traffic.vehicles.length;
  }
  this.pedRoutes?.update(dt,p,traffic);if(people){let visible=0,greetings=0;for(const n of people.npcs){if(!n.obj.visible)continue;visible++;const d=Math.hypot(n.obj.position.x-p.x,n.obj.position.z-p.z);
    if(!car&&d<2.5&&n.mode!=='loiter'&&(!n.greetUntil||n.greetUntil<this.clock)){const action=Object.keys(n.actions).find(k=>/wave/i.test(k));if(action&&typeof people._play==='function'){people._play(n,action);n.greetUntil=this.clock+20;greetings++}}
   }this.stats.pedestrians=visible;this.stats.greeting=greetings}
  this.clock=(this.clock||0)+Math.min(.05,dt)
 }
 snapshot(){return {...this.stats,sidewalk:this.pedRoutes?.snapshot(),junctions:this.junctions?.snapshot(),turns:this.turns?.snapshot()}}
 destroy(){this.pedRoutes?.destroy();this.junctions?.destroy();const world=this.experience.world.collisionWorld;for(let i=0;i<(this.previousTrafficCount||0);i++)world.removeDynamic(`ambient:${i}`)}
}
