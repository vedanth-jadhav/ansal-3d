/* Vehicle kinematics only. No meshes, listener or RAF owned here. */
export class DrivingController {
 constructor({collisionWorld,roadNetwork,registry,vehicle}){this.world=collisionWorld;this.roads=roadNetwork;this.registry=registry;this.vehicle=vehicle;this.speed=0;this.damage=0}
 update(dt,input){dt=Math.max(0,Math.min(dt,1/30));const h=this.vehicle;let speed=this.speed;
  if(input.brake)speed=Math.sign(speed)*Math.max(0,Math.abs(speed)-10*dt);
  else if(input.forward>0)speed=Math.min(14,speed+6*dt);
  else if(input.forward<0)speed=Math.max(-4,speed-6*dt);
  else speed=Math.sign(speed)*Math.max(0,Math.abs(speed)-2.7*dt);
  const road=this.roads.nearest(h.position,{mode:'drive',maxDistance:20});
  if(!road||road.distance>road.width/2+2)speed=Math.max(-3,Math.min(8,speed));
  const turn=(input.turn||0)*Math.min(Math.abs(speed)/6,1)*1.8*dt*Math.sign(speed);
  const yaw=h.heading+turn;
  const from=h.position,to={x:from.x+Math.sin(yaw)*speed*dt,z:from.z+Math.cos(yaw)*speed*dt};
  const hit=this.world.sweepCircle(from,to,h.radius,h.id);
  if(hit.hit){speed*=Math.max(0,.35-Math.min(hit.hit.impulse,5)*.05);if(Math.abs(speed)<.3)speed=0;this.damage=Math.min(100,this.damage+Math.min(3,hit.hit.impulse));}
  h.setPose(hit.position,yaw);this.speed=speed;
  return hit.hit?[{type:'collision',sourceId:h.id,targetId:hit.hit.id,impulse:hit.hit.impulse}]:[]
 }
}
