/* Future modular player seam. This does not replace the RC2 sM controller yet. */
export class PlayerController {
 constructor({avatar,collisionWorld,spawn={x:0,z:0},heading=0,radius=.32}){this.avatar=avatar;this.collisionWorld=collisionWorld;this.radius=radius;this.state={position:{...spawn},heading,mode:'onFoot',vehicleId:null,speed:0};this.sync()}
 snapshot(){return structuredClone(this.state)}
 sync(){if(this.avatar){this.avatar.position.x=this.state.position.x;this.avatar.position.z=this.state.position.z;this.avatar.rotation.y=this.state.heading}}
 setAvatarVisible(value){if(this.avatar)this.avatar.visible=!!value}
 warp(position,heading){if(!this.collisionWorld.isFree(position,this.radius))return false;this.state.position={...position};this.state.heading=heading;this.sync();return true}
 update(dt,input){if(this.state.mode!=='onFoot')return [];const s=this.state;s.heading+=input.turn*dt*2.2;const speed=(input.forward||0)*4;const destination={x:s.position.x+Math.sin(s.heading)*speed*dt,z:s.position.z+Math.cos(s.heading)*speed*dt};const result=this.collisionWorld.sweepCircle(s.position,destination,this.radius);s.position=result.position;s.speed=result.hit?0:Math.abs(speed);this.sync();return result.hit?[{type:'collision',...result.hit}]:[]}
 destroy(){this.avatar=null}
}
