/* Context gate for future keyboard/touch controls; never start with legacy UI. */
export class InputRouter {
 constructor({target=window}={}){this.target=target;this.context='menu';this.held=new Set();this.keyDown=e=>{if(!e.repeat)this.held.add(e.code)};this.keyUp=e=>this.held.delete(e.code);this.blur=()=>this.clear();
  target.addEventListener('keydown',this.keyDown);target.addEventListener('keyup',this.keyUp);target.addEventListener('blur',this.blur);
  this.visibility=()=>{if(document.hidden)this.clear()};document.addEventListener('visibilitychange',this.visibility);
 }
 setContext(context){if(!['walk','drive','menu'].includes(context))throw new Error('unknown input context');this.context=context;this.clear()}
 sample(context=this.context){if(context!==this.context)return {forward:0,turn:0,brake:false,interact:false,jump:false};const has=(...a)=>a.some(x=>this.held.has(x));
  if(context==='menu')return {forward:0,turn:0,brake:false,interact:false,jump:false};
  return {forward:Number(has('KeyW','ArrowUp'))-Number(has('KeyS','ArrowDown')),turn:Number(has('KeyD','ArrowRight'))-Number(has('KeyA','ArrowLeft')),brake:context==='drive'&&has('Space'),interact:has('KeyE','KeyF'),jump:context==='walk'&&has('Space')};
 }
 clear(){this.held.clear()}
 destroy(){this.target.removeEventListener('keydown',this.keyDown);this.target.removeEventListener('keyup',this.keyUp);this.target.removeEventListener('blur',this.blur);document.removeEventListener('visibilitychange',this.visibility);this.clear()}
}
