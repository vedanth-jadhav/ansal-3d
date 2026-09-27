import * as THREE from 'three';
/* Stylized hatchback with shared geometry, three materials and no geometry per spawn. */
const body=new THREE.BoxGeometry(3.45,.75,1.65);
const cabin=new THREE.BoxGeometry(1.6,.6,1.45);
const wheel=new THREE.CylinderGeometry(.31,.31,.18,10);
const paint=new THREE.MeshLambertMaterial({color:0xbc704b});
const glass=new THREE.MeshLambertMaterial({color:0x435b66});
const rubber=new THREE.MeshLambertMaterial({color:0x252b30});
export const VehicleFactory={
 spawnVehicle({scene,x,z,yaw=0,kind='hatchback'}){
  if(kind!=='hatchback')throw new Error('unsupported vehicle kind');
  const object=new THREE.Group();object.name='Drivable hatchback';
  const hull=new THREE.Mesh(body,paint);hull.position.y=.67;object.add(hull);
  const roof=new THREE.Mesh(cabin,glass);roof.position.set(-.27,1.27,0);object.add(roof);
  for(const xx of [-1.1,1.05])for(const zz of [-.82,.82]){const w=new THREE.Mesh(wheel,rubber);w.rotation.x=Math.PI/2;w.position.set(xx,.33,zz);object.add(w)}
  object.position.set(x,0,z);object.rotation.y=yaw-Math.PI/2;scene.add(object);
  return {object,radius:1.9,seats:4,setPose(px,pz,heading){object.position.set(px,0,pz);object.rotation.y=heading-Math.PI/2},dispose(){scene.remove(object)}};
 }
};
