# Sunday, September 27, 2026, 1:55:31 PM IST
cd /home/sandbox/v77; cat > /tmp/generate-catalog-patch.py <<'PY'
import json,re
p='src/districts.js';s=open(p).read()
rows=[json.loads(x) for x in open('/downloads/catalog-26756527.jsonl') if x.strip()]
rows=[r for r in rows if r['status']!='superseded' and (r['parcel_id'].startswith(('ANS-SN3N-','ANS-SN3S-')) or r['parcel_id'].startswith(('ANS-FBN-','ANS-FBS-')) and 145<r['game_x']<390)]
# Cutover is limited to sampled Street No. 3 and F-Block corridor frontages.
rows=[r for r in rows if r['parcel_id'] not in ('ANS-FBN-007',)] + [r for r in rows if r['parcel_id']=='ANS-FBN-007']
packed=[]
for r in rows:
 f=r['facade'].lower();floor=re.search(r'g\+(\d+)',r['floors'].lower());stories=min(4,1+int(floor.group(1))) if floor else 0
 vacant=r['status']=='vacant' or r['floors'].lower() in ('vacant','0') or 'mostly vacant' in f or 'overgrown vacant' in f
 kind='V' if vacant else 'W' if r['floors'].lower()=='wall' else 'U' if 'u/c' in r['floors'].lower() or any(t in f for t in ('under construction','unfinished rcc','green safety netting')) else 'H'
 if any(t in f for t in ('maroon','red-accent','brown/red','brown/cream','red/cream')): tone=3
 elif 'dark grey' in f or 'dark-clad' in f or 'dark brown' in f: tone=4
 elif 'grey' in f: tone=2
 elif 'brown' in f or 'brick' in f: tone=1
 elif 'white' in f: tone=0
 else: tone=5
 gate=2 if 'slat gate' in f or 'wooden gate' in f else 1 if 'metal gate' in f or 'dark gate' in f else 0
 flags=(1 if 'balcony' in f else 0)+(2 if 'corner' in f else 0)+(4 if 'hedge' in f or 'trees' in f or 'treed' in f else 0)+(8 if 'drive' in f or 'ramp' in f else 0)
 packed.append([r['parcel_id'],r['game_x'],r['game_z'],kind,stories,tone,gate,flags])
new='\n const residentialParcels='+json.dumps(packed,separators=(',',':'))+';\n'
pos=s.index(' // Corridor infill is a district-level depiction')
s=s[:pos]+new+s[pos:]
a=s.index(' auditedCorridor(\'258964282\'');b=s.index(' // The three-spire shrine',a)
replacement=""" // v78 catalog frontages replace only the old Sector 12 / F-Block proxy bays.
 // Positions are frontage anchors, not measured building footprints. Geometry
 // is grouped per 50m blockface cell in existing vertex-color material buckets.
 buildCatalogResidential();

"""
s=s[:a]+replacement+s[b:]
# Make source clear old function removed, not called. It may be left dead code but remove to avoid confusion and bundle.
a=s.index(' // Corridor infill is a district-level depiction');b=s.index(' // Sampled northern visual audit',a)
s=s[:a]+""" // Catalog v78 keeps one identifier per visible frontage, including vacant lots
 // and unfinished houses. Audit IDs/evidence remain in public/parcel-catalog-v78.jsonl.
 function buildCatalogResidential(){
   const cells=new Map(), catalogSeen=new Set();let built=0,vacant=0,unfinished=0,walls=0;
   const colors=[0xe1d9c8,0x9f7965,0xa4a5a1,0x9a635c,0x676c6c,0xd7c5a5];
   const addBox=(list,x,y,z,w,h,d,color,rotation=0)=>{
     const g=new THREE.BoxGeometry(w,h,d);g.translate(x,y,z);
     if(rotation)g.rotateY(rotation);
     // Object-space geometry is never non-uniformly scaled in the lit path.
     g.computeVertexNormals();const c=new THREE.Color(color),a=new Float32Array(g.attributes.position.count*3);
     for(let i=0;i<a.length;i+=3){a[i]=c.r;a[i+1]=c.g;a[i+2]=c.b}
     g.setAttribute('color',new THREE.BufferAttribute(a,3));list.push(g.toNonIndexed());g.dispose();
   };
   for(const [id,x,z,kind,levels,tone,gate,flags] of residentialParcels){
     if(catalogSeen.has(id))continue;catalogSeen.add(id);
     // Northern frontage faces +z, southern frontage -z. The v78 point
     // describes the road-edge frontage, so set the modeled mass behind it.
     const north=id.startsWith('ANS-SN3N-')||id.startsWith('ANS-FBN-');
     const sign=north?1:-1,sector=id.startsWith('ANS-SN3');
     // FBN-008 and FBS-008 are separate sides after v78's 12m correction.
     const cell=(sector?'sector12':'fblock')+':'+(north?'north':'south')+':'+Math.floor(x/50);
     let geos=cells.get(cell);if(!geos){geos=[];cells.set(cell,geos)}
     const wall=colors[tone],trim=tone===4?0xb2aaa0:0xe5d6bc,metal=gate===2?0x735447:0x47545b;
     const front=z+sign*.13;
     if(kind==='V'||kind==='W'){
       addBox(geos,x,.05,front-sign*3,9,.10,5.6,0xb9ab89);
       for(const e of [-1,1])addBox(geos,x+e*2.9,.65,front,3.1,1.3,.18,kind==='W'?0x898e8a:0xb9a581);
       if(kind==='W'){walls++;addBox(geos,x,1.05,front,2.5,2.1,.18,0x898e8a)}
       else{vacant++;if(flags&4)for(const e of [-1,1])addBox(geos,x+e*2.8,.4,front-sign*2,.5,.8,.5,0x757d59)}
     }else{
       const h=levels*2.8,depth=7.1,width=8.3;
       // Finished plots retain flat RCC roof, balcony shadow and steel gate.
       // Construction plots expose a brick/RCC frame instead of pretending to
       // be occupied or painted houses.
       const u=kind==='U'; if(u)unfinished++;else built++;
       const base=u?0xac8067:wall,back=front-sign*(depth/2+1.2);
       addBox(geos,x,h/2,back,width,h,depth,base);
       for(let f=1;f<levels;f++){
         const yy=f*2.8;
         addBox(geos,x,yy,back,width+.18,.12,depth+.18,u?0xc1b1a0:trim);
         if(!u && (flags&1 || f===1)){
           addBox(geos,x,yy+.08,front+sign*.50,3.25,.13,1.1,trim);
           addBox(geos,x,yy+.62,front+sign*1.02,3.2,.055,.055,metal);
           for(const e of [-1,0,1])addBox(geos,x+e*1.42,yy+.36,front+sign*1.02,.05,.52,.05,metal);
         }
       }
       addBox(geos,x,h+.08,back,width+.35,.17,depth+.35,trim);
       if(!u){
         addBox(geos,x,h+.50,front-sign*.14,width,.85,.18,wall);
         const mx=x+(id.charCodeAt(id.length-1)%2? -2:2);
         addBox(geos,mx,h+1.05,back-sign*2,2.3,2.1,2.1,wall);
         addBox(geos,x+2.9,h+.75,back-sign*1,.85,1.1,.85,0x282c2c);
       }else{
         // Exposed brick/RCC and open-frame side columns on u/c entries.
         for(const e of [-1,1])addBox(geos,x+e*3.75,h*.5,front-sign*1,.27,h,.27,0xbeb2a4);
       }
       for(let f=0;f<levels;f++)for(const e of [-1,1]){
         if(u&&f===0)continue;
         addBox(geos,x+e*2.25,f*2.8+1.72,front-sign*.10,1.1,1.18,.06,u?0x4b4440:0x46545a);
         if(!u)addBox(geos,x+e*2.25,f*2.8+2.38,front+sign*.02,1.32,.09,.3,trim);
       }
       if(!u){
         addBox(geos,x,.9,front+sign*.30,2.9,1.8,.12,metal);
         addBox(geos,x,1.85,front+sign*.33,3.3,.10,.32,trim);
         if(flags&8)addBox(geos,x,.07,front+sign*1.4,3.0,.12,2.2,0xb0a291);
       }
       for(const e of [-1,1])addBox(geos,x+e*2.75,.74,front+sign*1.35,2.8,1.48,.18,u?0xa28472:trim);
     }
   }
   // Each material/cell is a static drawable, no individual visibility switch.
   // D Block's far corridor range can skip these exactly like its old proxies.
   for(const [cell,geos] of cells){
     const joined=mergeGeometries(geos,false);geos.forEach(g=>g.dispose());
     if(!joined)continue;joined.computeBoundingSphere();
     const mesh=new THREE.Mesh(joined,marketColorMaterial);mesh.name='catalog:'+cell;
     mesh.userData.batchRegion='south';mesh.userData.dBlockFar=true;
     mesh.castShadow=false;mesh.receiveShadow=true;staticWorld.add(mesh);
   }
   console.log('Catalog residential frontage counts',JSON.stringify({source:'v78',ids:catalogSeen.size,built,vacant,unfinished,walls,cells:cells.size}));
 }

"""+s[b:]
# These anchor proxies overlap catalog frontages. Preserve other district anchors.
s=s.replace("for(let ai=0;ai<anchors.length;ai++){\n  let [id", "for(let ai=0;ai<anchors.length;ai++){\n  if(['f-block-east','street-no-5'].includes(anchors[ai][0]))continue;\n  let [id")
# Original side-F-Block shrubs still valid but no exact parcel grounding; avoid overlays for removed anchor strips.
# write
open(p,'w').write(s)
print('packed',len(packed),'source chars',len(s))
PY
python3 /tmp/generate-catalog-patch.py
cp /downloads/catalog-26756527.jsonl public/parcel-catalog-v78.jsonl
npm run build >/tmp/v78-build.log 2>&1; tail -9 /tmp/v78-build.log
