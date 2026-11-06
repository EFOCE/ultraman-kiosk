async page => {
 const results=[],errors=[];page.on('pageerror',e=>errors.push(e.message));
 const assert=(ok,msg)=>{if(!ok)throw Error(msg)};
 for(const [width,height]of [[1365,900],[390,650],[320,568],[780,600],[700,400],[873,393],[640,360]]){
  await page.setViewportSize({width,height});await page.goto('http://127.0.0.1:4186/');
  await page.locator('#landing-start').waitFor();
  assert(await page.locator('#landing').isVisible(),'landing visible');
  assert(await page.locator('#game-shell').isHidden(),'game initially hidden');
  await page.keyboard.press('r');assert((await page.evaluate(()=>gameSnapshot())).status==='ready','hidden keyboard cannot start');
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'landing horizontal overflow '+width);
  const cta=await page.locator('#landing-start').boundingBox();assert(cta.y+cta.height<height,'CTA initially visible '+width);
  if([1365,390,320].includes(width))await page.screenshot({path:'evidence/upgrade-landing-'+width+'.png',fullPage:true});
  await page.locator('#landing-start').click();
  assert(await page.locator('#landing').isHidden()&&await page.locator('#game-shell').isVisible(),'enter game');
  assert(await page.locator('[data-hero]').count()===13&&await page.locator('[data-enemy]').count()===14,'roster retained');
  if(width<=1000)await page.locator('#enemy-toggle').click();
  await page.locator('[data-enemy=wukong]').click();
  if(width>height&&height<=600)await page.locator('#hero-toggle').click();
  await page.locator('[data-hero=noa]').click();
  if(await page.locator('#weather').isVisible())await page.locator('#weather').selectOption('sun');
  const layout=await page.evaluate(()=>{
   const bar=document.querySelector('.controls').getBoundingClientRect(),stage=document.querySelector('.stage').getBoundingClientRect();
   const bad=[...document.querySelectorAll('.controls button,#start')].filter(e=>{const r=e.getBoundingClientRect(),h=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return !(r.width>0&&r.height>0&&r.bottom<=innerHeight&&r.right<=innerWidth&&(h===e||e.contains(h)))}).map(e=>e.id||e.dataset.action);
   return {overflow:document.documentElement.scrollWidth>innerWidth||document.documentElement.scrollHeight>innerHeight,stageHeight:stage.height,bad,stageAbove:stage.bottom<=bar.top+1};
  });
  assert(!layout.overflow&&layout.stageAbove&&!layout.bad.length&&layout.stageHeight>80,'game layout '+width+' '+JSON.stringify(layout));
  if([1365,390,320].includes(width))await page.screenshot({path:'evidence/upgrade-game-'+width+'.png'});
  await page.locator('#music-settings').click();assert(await page.locator('.music-options').getAttribute('open')!==null,'music opens');
  const bar1=await page.locator('.controls').boundingBox();await page.keyboard.press('Escape');assert(await page.locator('.music-options').getAttribute('open')===null,'escape closes music');
  const bar2=await page.locator('.controls').boundingBox();assert(bar1.y===bar2.y,'settings does not shift controls');
  await page.locator('#start').click();await page.locator('[data-action=fire]').click();
  assert((await page.evaluate(()=>gameSnapshot())).status==='playing','real input starts battle');
  await page.locator('#restart').click();assert((await page.evaluate(()=>gameSnapshot())).hp===5,'restart');
  results.push({width,height,...layout,entered:true,music:true,battle:true});
 }
 assert(!errors.length,errors.join(';'));return {status:'PASS',results,errors};
}
