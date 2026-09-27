/* Adapter seam for the vehicle squad. No fabricated ambient behavior. */
export class TrafficSystem {
 constructor({implementation,registry}){this.implementation=implementation;this.registry=registry}
 update(dt,playerPosition){this.implementation?.update?.(dt,playerPosition)}
 getNearbyVehicles(x,z,r){return this.implementation?.getNearbyVehicles?.(x,z,r)||this.registry.queryNearby({x,z},r).map(v=>({object:v.object,x:v.position.x,z:v.position.z,yaw:v.heading,radius:v.radius,speed:0}))}
 destroy(){this.implementation?.destroy?.()}
}
