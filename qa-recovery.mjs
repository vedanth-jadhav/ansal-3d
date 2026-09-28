import {spawn} from 'node:child_process';
import path from 'node:path';
import puppeteer from 'puppeteer-core';
import {setTimeout as delay} from 'node:timers/promises';
const CHROME_PATH = process.env.CHROME_PATH || '/usr/bin/google-chrome';
const SCREENSHOT_DIR = (process.env.SCREENSHOT_DIR || '/downloads').replace(/\/+$/, '') || '/';
const server=spawn('./node_modules/.bin/vite',['--host','127.0.0.1','--port','5188','--strictPort'],{stdio:'ignore'});
try{
  for(let i=0;i<45;i++){try{const r=await fetch('http://127.0.0.1:5188');if(r.ok)break}catch{}await delay(200)}
  const browser=await puppeteer.launch({executablePath:CHROME_PATH,headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader']});
  try{
    const page=await browser.newPage();await page.setViewport({width:844,height:390,deviceScaleFactor:1,isMobile:true,hasTouch:true});const failed=[],bad=[],errors=[];
    page.on('requestfailed',r=>failed.push({url:r.url(),error:r.failure()?.errorText}));page.on('response',r=>{if(r.status()>=400||r.url().includes('gate_steel_grey'))bad.push({url:r.url(),status:r.status(),mime:r.headers()['content-type']})});page.on('pageerror',e=>errors.push(e.message));page.on('console',e=>{if(e.type()==='error')errors.push(e.text())});
    await page.goto('http://127.0.0.1:5188/',{waitUntil:'domcontentloaded'});await delay(8500);
    await page.screenshot({path:path.join(SCREENSHOT_DIR, 'ansal-recovery-landing.png')});
    await page.click('#playBtn');await delay(4000);await page.screenshot({path:path.join(SCREENSHOT_DIR, 'ansal-recovery-landscape.png')});
    const state=await page.evaluate(()=>({playing:document.body.classList.contains('playing'),status:document.querySelector('#statusText')?.textContent,canvas:[document.querySelector('canvas')?.width,document.querySelector('canvas')?.height],quest:document.querySelector('#questCount')?.textContent}));
    console.log(JSON.stringify({state,failed,bad,errors},null,2));
  }finally{await browser.close()}
}finally{server.kill('SIGTERM')}
