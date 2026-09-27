/* Recovered v90 Sector 12 scoped builder from integrator transcript + housing patch.
 * This is illustrative street geometry, not surveyed footprints.
 */
import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {makeSector12Builder} from './sector12-v90-builder.js';
export function addSector12Housing(scene,roads,osmboundary,colliders,game){
 const candidates=[osmboundary?.coordinates,osmboundary?.geometry?.coordinates,osmboundary];
 const polygon=candidates.find(x=>Array.isArray(x)&&x.length>2&&Array.isArray(x[0]));
 const within=(x,z)=>{
  if(!polygon)return true;
  const poly=Array.isArray(polygon[0][0])?polygon[0]:polygon;
  let inside=false;
  for(let i=0,j=poly.length-1;i<poly.length;j=i++){
   const a=poly[i],b=poly[j];if((a[1]>z)!==(b[1]>z)&&x<(b[0]-a[0])*(z-a[1])/(b[1]-a[1])+a[0])inside=!inside;
  }return inside;
 };
 const material=new THREE.MeshLambertMaterial({vertexColors:true,side:THREE.DoubleSide});
 const start=colliders.length;
 const result=makeSector12Builder({THREE,mergeGeometries,scene,roads,within,colliders,marketColorMaterial:material})();
 game?.addColliders(colliders.slice(start));
 return result;
}
