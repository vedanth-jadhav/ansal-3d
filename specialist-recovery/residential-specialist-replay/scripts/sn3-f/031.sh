# Sunday, September 27, 2026, 2:00:55 PM IST
cd /home/sandbox/v77; python3 - <<'PY'
p='src/districts.js';s=open(p).read();a=s.index('       const h=levels*2.8,depth=7.1,width=8.3;');b=s.index('\n     }\n   }\n   // Each material',a);s=s[:a]+'''       const h=levels*2.8,depth=7.1,width=7.8;
       // Shallow, evidence-led row: the catalog point is a frontage anchor.
       // A little frontage margin keeps a wide mapped street walkable.
       const u=kind==='U'; if(u)unfinished++;else built++;
       const massZ=front+sign*5.2,faceZ=front+sign*1.55;
       const base=u?0xa98470:wall;
       addBox(geos,x,h/2,massZ,width,h,7.0,base);
       for(let f=1;f<levels;f++){
         const yy=f*2.8;
         addBox(geos,x,yy,massZ,width+.18,.12,7.1,u?0xc1b1a0:trim);
         if(!u && ((flags&1)||f===1)){
           addBox(geos,x,yy+.08,faceZ-sign*.50,3.15,.13,1.0,trim);
           addBox(geos,x,yy+.64,faceZ-sign*.92,3.1,.055,.055,metal);
           for(const e of [-1,0,1])addBox(geos,x+e*1.30,yy+.36,faceZ-sign*.92,.05,.52,.05,metal);
         }
       }
       addBox(geos,x,h+.08,massZ,width+.35,.17,7.3,trim);
       if(!u){
         addBox(geos,x,h+.48,faceZ+sign*.07,width,.78,.18,wall);
         const mx=x+(id.charCodeAt(id.length-1)%2? -1.8:1.8);
         addBox(geos,mx,h+1.0,massZ+sign*1.7,2.2,2.0,2.1,wall);
         addBox(geos,x+2.7,h+.7,massZ+sign*.6,.85,1.05,.85,0x282c2c);
       }else{
         for(const e of [-1,1])addBox(geos,x+e*3.50,h*.50,faceZ+sign*.70,.27,h,.27,0xbeb2a4);
       }
       for(let f=0;f<levels;f++)for(const e of [-1,1]){
         if(u&&f===0)continue;
         addBox(geos,x+e*2.15,f*2.8+1.68,faceZ-sign*.03,1.08,1.16,.06,u?0x4b4440:0x46545a);
         if(!u){
           addBox(geos,x+e*2.15,f*2.8+2.31,faceZ-sign*.19,1.30,.09,.30,trim);
           addBox(geos,x+e*2.15,f*2.8+1.68,faceZ-sign*.11,.055,1.16,.08,trim);
         }
       }
       if(!u){
         addBox(geos,x,.9,front+sign*.10,2.75,1.8,.12,metal);
         addBox(geos,x,1.85,front+sign*.11,3.15,.10,.32,trim);
         if(flags&8)addBox(geos,x,.07,front-sign*.5,2.9,.12,1.1,0xb0a291);
       }
       for(const e of [-1,1])addBox(geos,x+e*2.65,.72,front+sign*.08,2.6,1.44,.18,u?0xa28472:trim);'''+s[b:]
s=s.replace("const front=z; \n", "const front=z;\n")
s=s.replace("front-sign*2,.5,.8,.5", "front+sign*2,.5,.8,.5")
s=s.replace("source:'v78'", "source:'v80'")
s=s.replace("Catalog v78", "Catalog v80").replace("The v78 point", "The v80 point").replace("after v78's", "after v80's").replace("v79 frontage", "v80 frontage")
open(p,'w').write(s)
PY
node /tmp/v77-qa.mjs v80-facades >/tmp/v80-facades.jsonl 2>&1; cat /tmp/v80-facades.jsonl | cut -c1-235
