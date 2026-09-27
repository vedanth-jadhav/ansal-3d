// v87 catalog-backed fixtures only. Anchors approximate roadside observations,
// not surveyed positions. Catalog SHA-256: be841f3088c722f3df31367bc047aeab601f1c37c26511c1e04ff8eaf09a7495
import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
const FIXTURES={
 market:[
  {id:'ANS-AMRB-001',x:-337.8,z:-245.7,type:'to-rent'},
  {id:'ANS-MSRE-011',x:-359.3,z:-256.9,type:'corner-board'},
  {id:'ANS-MSRW-012',x:-375.1,z:-256.4,type:'shop-boards'},
  {id:'ANS-AMRN-005',x:-640.2,z:-286.2,type:'ad-boards'},
  {id:'ANS-AMRN-006',x:-549.2,z:-292,type:'corner-board'},
  {id:'ANS-AMRN-013',x:-471,z:-292,type:'sale-board'},
  {id:'ANS-AMRN-015',x:-423.8,z:-292,type:'shop-boards'},
 ],
 sn3:[
  {id:'ANS-SME-002',x:-218.4,z:-656.1,type:'transformer'},
  {id:'ANS-SN3N-011',x:-143.6,z:-680.3,type:'potted-plants'},
  {id:'ANS-APRE-002',x:-26.4,z:-652.7,type:'shop-boards'},
 ]
};
// Road-mask clearance follows districts.js. Fixtures also avoid nearby fixture boxes.
function roadClearance(roads,x,z,radius=1){let min=Infinity;
 for(const road of roads){const cls=road.tags.highway,half=cls==='tertiary'?6:cls==='unclassified'?5:cls==='residential'?3.5:cls==='service'?2.5:3;
  const p=road.coordinates;for(let i=1;i<p.length;i++){
   const a=p[i-1],b=p[i];if(Math.min(a[0],b[0])>x+25||Math.max(a[0],b[0])<x-25||Math.min(a[1],b[1])>z+25||Math.max(a[1],b[1])<z-25)continue;
   const dx=b[0]-a[0],dz=b[1]-a[1],l=dx*dx+dz*dz;if(l<1)continue;
   const t=Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/l));
   min=Math.min(min,Math.hypot(x-a[0]-t*dx,z-a[1]-t*dz)-half-2-radius);
  }
 }return min;
}
function parts(item,add){
 const [x,z]=[item.x,item.z];
 // A small number of boxes represents one catalog-noted object / cluster.
 const sign=(tone)=>{add(x,1.75,z,1.55,.65,.12,tone);add(x-.59,.75,z,.075,1.5,.08,0x52514a);add(x+.59,.75,z,.075,1.5,.08,0x52514a)};
 if(item.type==='transformer'){
  add(x,2.15,z,.16,4.3,.16,0x858b85);add(x,3.25,z+.28,.72,.8,.48,0x777e78);add(x,3.65,z+.28,.76,.09,.53,0x535e60);
 }else if(item.type==='potted-plants'){
  for(let i=0;i<3;i++){const xx=x+(i-1)*.63;add(xx,.24,z,.40,.48,.42,0x9a6652);add(xx,.65,z,.32,.42,.32,0x617e58)}
 }else if(item.type==='to-rent') sign(0xe3cfac);
 else if(item.type==='corner-board') {sign(0xe2e0d6);add(x,3.55,z,.21,1.5,.21,0xd9d6cf)}
 else if(item.type==='yellow-info')sign(0xd4b650);
 else if(item.type==='sale-board')sign(0x9c5141);
 else if(item.type==='shop-boards'||item.type==='ad-boards'){
  sign(0xc7b094); // single proxy for the catalog's cluster, no invented words
  add(x+.9,1.45,z+.08,.62,.45,.09,0x955d48);
 }
}
function build(items,roads,name){
 const geos=[],accepted=[],omitted=[];
 for(const item of items){
  const boxes=[];parts(item,(x,y,z,w,h,d,color)=>boxes.push({x,y,z,w,h,d,color}));
  if(boxes.some(b=>roadClearance(roads,b.x,b.z,Math.hypot(b.w,b.d)/2)<0)){
   omitted.push({id:item.id,reason:'road-mask'});continue;
  }
  accepted.push(item.id);
  for(const b of boxes){const g=new THREE.BoxGeometry(b.w,b.h,b.d);g.translate(b.x,b.y,b.z);g.computeVertexNormals();
   const rgb=new THREE.Color(b.color),v=new Float32Array(g.attributes.position.count*3);
   for(let k=0;k<v.length;k+=3){v[k]=rgb.r;v[k+1]=rgb.g;v[k+2]=rgb.b}
   g.setAttribute('color',new THREE.BufferAttribute(v,3));geos.push(g.toNonIndexed());g.dispose()}
 }
 const group=new THREE.Group();group.name=`Catalog furniture ${name}`;
 if(geos.length){const merged=mergeGeometries(geos,false);geos.forEach(g=>g.dispose());merged.computeVertexNormals();
  const mesh=new THREE.Mesh(merged,new THREE.MeshLambertMaterial({vertexColors:true}));mesh.name=`catalog-fixtures-${name}`;mesh.castShadow=false;mesh.receiveShadow=true;group.add(mesh)}
 group.userData={catalogIds:accepted,omitted,triangles:geos.length*12,calls:geos.length?1:0};return group;
}
export function addCatalogFurnitureDensity(scene,roads){const groups={};for(const key of Object.keys(FIXTURES)){const g=build(FIXTURES[key],roads,key);scene.add(g);groups[key]=g}return groups}
