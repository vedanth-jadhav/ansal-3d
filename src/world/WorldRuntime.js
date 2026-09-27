import {RoadNetwork} from './RoadNetwork.js';
import {CollisionWorld} from './CollisionWorld.js';

/* Transitional world facade. District geometry and animation are still in
 * the recovered RC2 runtime. This class does not pretend to own its render loop.
 * A fully modular rebuild will transfer scene/LOD ownership here. */
export class WorldRuntime {
 constructor({scene,roads,colliders=[],pois=[],vehicleRegistry=null}){
  this.scene=scene;this.roads=roads;this.sourceColliders=colliders;this.roadNetwork=new RoadNetwork(roads);
  this.collisionWorld=new CollisionWorld();this.poiById=new Map(pois.map(p=>[p.id,p]));this.vehicleRegistry=vehicleRegistry;
  this.knownColliders=-1;this.syncColliders();
 }
 syncColliders(){if(this.knownColliders!==this.sourceColliders.length){this.collisionWorld.addStaticBoxes(this.sourceColliders,'legacy');this.knownColliders=this.sourceColliders.length}}
 getSceneContext(){this.syncColliders();return {scene:this.scene,roadNetwork:this.roadNetwork,collisionWorld:this.collisionWorld,pois:this.poiById,vehicleRegistry:this.vehicleRegistry}}
 update(_dt){this.syncColliders()} // no second scheduler
 destroy(){this.collisionWorld.dynamic.clear();this.poiById.clear()}
}
