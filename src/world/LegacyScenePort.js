/* Temporary adapter that inventories the recovered scene without relabeling
 * unknown mesh batches as verified parcels. This cannot reconstruct source. */
export function inventoryLegacyScene(scene){
 const counts={objects:0,meshes:0,groups:0,unknownMeshes:0};const byTop=[];
 for(const root of scene.children.filter(Boolean)){
  const item={name:root.name||'<unnamed>',type:root.type,objects:0,meshes:0,geometries:new Set()};
  root.traverse(o=>{counts.objects++;item.objects++;if(o.isGroup)counts.groups++;if(o.isMesh){counts.meshes++;item.meshes++;if(!o.name)counts.unknownMeshes++;if(o.geometry)item.geometries.add(o.geometry.uuid)}});
  byTop.push({...item,geometries:item.geometries.size})
 }
 return {counts,byTop};
}
