/* Versioned local state only. Not mounted until state migrations are validated. */
export class SaveStore {
 constructor({storage=globalThis.localStorage,key='ansal.save.v2'}={}){this.storage=storage;this.key=key;this.revision=0;this.available=true}
 load(){try{const value=JSON.parse(this.storage.getItem(this.key));if(!value||value.schemaVersion!==2||!Number.isInteger(value.revision))return null;this.revision=value.revision;return value}catch{this.available=false;return null}}
 save(state){const value={schemaVersion:2,revision:++this.revision,updatedAt:new Date().toISOString(),...state};try{this.storage.setItem(this.key,JSON.stringify(value));return {ok:true,revision:this.revision}}catch{this.available=false;return {ok:false,reason:'storage unavailable'}}}
 destroy(){}
}
