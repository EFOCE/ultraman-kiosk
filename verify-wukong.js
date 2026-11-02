async page=>{
 const context=await page.context().browser().newContext({viewport:{width:1365,height:900}}),q=await context.newPage(),report={layouts:[],skills:[]},errors=[];let phase='roster and layout';
 const assert=(ok,msg)=>{if(!ok)throw new Error(msg)};q.on('pageerror',e=>errors.push(e.message));
 const snap=()=>q.evaluate(()=>gameSnapshot());const action=k=>q.locator('[data-action='+k+']').click();
 const ground=async x=>{const p=await q.locator('#game').evaluate((e,x)=>{const r=e.getBoundingClientRect(),s=Math.min(r.width/1100,r.height/590);return{x:r.x+(r.width-1100*s)/2+x*s,y:r.y+(r.height-590*s)/2+540*s}},x);await q.mouse.click(p.x,p.y)};
 const hold=async k=>{const r=await q.locator('[data-action='+k+']').boundingBox();await q.mouse.move(r.x+r.width/2,r.y+r.height/2);await q.mouse.down()};
 const face=async k=>{await hold(k);await q.waitForTimeout(60);await q.mouse.up()};
 const clean=async()=>{const g=await snap();assert(g.enemyId==='wukong'&&g.monsters[0].hp===40&&!g.monsters[0].flightTime&&!g.monsters[0].burrowTime&&!g.monsters[0].formTime&&g.monsters[0].form===''&&!g.enemyShots.length&&g.hero.moveTarget===null,'new round resets boss and inputs')};
 try{
  await q.goto('http://127.0.0.1:4186/');await q.locator('#landing-start').click();assert(await q.locator('[data-enemy]').count()===13,'13 opponents');assert(await q.locator('[data-hero]').count()===12,'12 heroes');assert(await q.locator('[data-enemy=tangseng]').count()===1,'Tang Seng retained');
  for(const [width,height]of [[1365,900],[390,650],[320,568]]){
   await q.setViewportSize({width,height});if(width<1000)await q.locator('#enemy-toggle').click();await q.locator('[data-enemy=wukong]').click();
   assert((await snap()).monsters[0].hp===40&&await q.locator('#opponent-name').innerText()==='孙悟空','Wukong selectable');
   const good=await q.evaluate(()=>{const bar=document.querySelector('.controls').getBoundingClientRect(),stage=document.querySelector('.stage').getBoundingClientRect();return document.documentElement.scrollWidth<=innerWidth&&document.documentElement.scrollHeight<=innerHeight&&stage.bottom<=bar.top+1&&[...document.querySelectorAll('.controls button,#start')].every(e=>{const r=e.getBoundingClientRect(),h=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return r.bottom<=innerHeight&&r.right<=innerWidth&&(h===e||e.contains(h))})});assert(good,'layout '+width);
   await q.screenshot({path:'D:/Workspace/ultraman-kiosk/evidence/wukong-game-'+width+'.png'});report.layouts.push([width,height]);
  }
  await q.setViewportSize({width:1365,height:900});await q.locator('[data-hero=ruebe]').click();await q.locator('#start').click();phase='four skills';
  for(const [spell,target]of [['fly',100],['burrow',700],['transform',1056],['staff',800]]){
   await q.waitForFunction(s=>gameSnapshot().monsters[0]?.spell===s&&gameSnapshot().monsters[0].charge>0,spell,{timeout:10000});
   if(spell==='burrow'||spell==='staff')await action('fire');await ground(target);
   await q.waitForFunction(s=>{const g=gameSnapshot(),m=g.monsters[0];return s==='fly'?m?.flightTime>0:s==='burrow'?m?.burrowTime>0:s==='transform'?m?.formTime>0:g.enemyShots.some(x=>x.kind==='staff')},spell,{timeout:4000});
   if(spell==='fly')await q.waitForTimeout(350);
   await q.screenshot({path:'D:/Workspace/ultraman-kiosk/evidence/wukong-'+spell+'.png'});report.skills.push(spell);
  }
  assert((await snap()).status==='playing','survived all four skills by moving');await q.locator('#restart').click();await clean();
  phase='real mouse victory';await q.locator('[data-hero=seven]').click();await q.locator('#start').click();await hold('fire');
  await q.waitForFunction(()=>gameSnapshot().monsters[0]?.spell==='fly'&&gameSnapshot().monsters[0].charge>0);await q.mouse.up();await ground(100);await q.waitForFunction(()=>gameSnapshot().hero.moveTarget===null);await face('right');await hold('fire');
  await q.waitForFunction(()=>gameSnapshot().monsters[0]?.spell==='burrow'&&gameSnapshot().monsters[0].charge>0);await q.mouse.up();await ground(700);await hold('fire');
  await q.waitForFunction(()=>gameSnapshot().hero.moveTarget===null&&gameSnapshot().hero.x>650,{},{timeout:5000});await q.mouse.up();await face('left');await hold('fire');
  await q.waitForFunction(()=>gameSnapshot().status!=='playing',{},{timeout:15000});await q.mouse.up();let g=await snap();assert(g.status==='won','Wukong defeated using actual mouse movement and beams');report.victory={hp:g.hp,time:g.time};await q.screenshot({path:'D:/Workspace/ultraman-kiosk/evidence/wukong-victory.png'});
  phase='loss and restart';await q.locator('#start').click();await clean();await q.waitForFunction(()=>gameSnapshot().status==='lost',{},{timeout:20000});report.loss=true;await q.locator('#restart').click();await clean();report.restart=true;
  await q.locator('[data-hero=ruebe]').click();await q.locator('#weather').selectOption('sun');await q.screenshot({path:'D:/Workspace/ultraman-kiosk/evidence/wukong-final.png'});
  // Same drawing function, to inspect all three implemented forms without claiming extra matches.
  await q.evaluate(async()=>{const {monster}=await import('./game.mjs');const c=document.createElement('canvas');c.id='qa-forms';c.width=1000;c.height=320;c.style='position:fixed;left:0;top:0;z-index:99';document.body.append(c);const ctx=c.getContext('2d');ctx.fillStyle='#f7f1df';ctx.fillRect(0,0,1000,320);for(const[i,form]of ['','tiger','eagle','ape'].entries()){ctx.save();ctx.translate(i*250+125,270);ctx.translate(0,-512);monster({id:'wukong',x:0,hit:0,form,formTime:form?2:0},0,1,ctx);ctx.restore();ctx.fillStyle='#29493e';ctx.font='bold 18px Microsoft YaHei';ctx.textAlign='center';ctx.fillText(['孙悟空','七十二变 · 灵虎','七十二变 · 雄鹰','七十二变 · 巨猿'][i],i*250+125,305)}});
  await q.locator('#qa-forms').screenshot({path:'D:/Workspace/ultraman-kiosk/evidence/wukong-forms.png'});assert(!errors.length,errors.join(';'));report.errors=errors;return {status:'PASS',report};
 }catch(error){return{status:'FAIL',phase,error:error.message,game:await snap(),report,errors}}finally{await context.close()}
}
