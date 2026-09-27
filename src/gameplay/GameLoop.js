/* Sole frame scheduler for the future modular runtime. The transitional RC2
 * bundle still has its own RAF; do not start this alongside that bundle. */
export class GameLoop {
 constructor({update,render,onError=console.error,fixedStep=1/60,maxSteps=4}){
  this.update=update;this.render=render;this.onError=onError;this.fixedStep=fixedStep;this.maxSteps=maxSteps;
  this.running=false;this.last=null;this.accumulator=0;this.boundTick=this.tick.bind(this);
 }
 tick(time){if(!this.running)return;this.frame=requestAnimationFrame(this.boundTick);if(this.last===null){this.last=time;return}
  const delta=Math.min(.05,Math.max(0,(time-this.last)/1000));this.last=time;this.accumulator=Math.min(this.accumulator+delta,this.fixedStep*this.maxSteps);
  try{let steps=0;while(this.accumulator>=this.fixedStep&&steps<this.maxSteps){this.update(this.fixedStep);this.accumulator-=this.fixedStep;steps++}this.render(this.accumulator/this.fixedStep)}catch(error){this.stop();this.onError(error)}
 }
 start(){if(this.running)return;this.running=true;this.last=null;this.frame=requestAnimationFrame(this.boundTick)}
 stop(){this.running=false;if(this.frame)cancelAnimationFrame(this.frame);this.frame=null;this.last=null;this.accumulator=0}
 destroy(){this.stop()}
}
