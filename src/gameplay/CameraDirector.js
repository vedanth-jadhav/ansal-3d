/* Camera authority for modular runtime only; not mounted beside legacy game.update. */
export class CameraDirector {
 constructor({camera,collisionWorld=null}){this.camera=camera;this.collisionWorld=collisionWorld;this.mode='overview';this.target=null;this.heading=0}
 setMode(mode,target,heading=0){if(!['walk','driving','transition','overview'].includes(mode))throw new Error('unknown camera mode');this.mode=mode;this.target=target;this.heading=heading}
 update(dt){if(!this.target||this.mode==='overview')return;const d=this.mode==='driving'?7:4.5,eye=this.mode==='driving'?3.8:2.6;const x=this.target.x-Math.sin(this.heading)*d,z=this.target.z-Math.cos(this.heading)*d;
  const alpha=1-Math.exp(-Math.min(.05,dt)*8);this.camera.position.x+=(x-this.camera.position.x)*alpha;this.camera.position.y+=(eye-this.camera.position.y)*alpha;this.camera.position.z+=(z-this.camera.position.z)*alpha;this.camera.lookAt(this.target.x,1.4,this.target.z)
 }
 destroy(){this.target=null}
}
