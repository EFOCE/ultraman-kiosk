// Run with the same isolated browser harness as verify-layout.js.
async page => {
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const assert=(ok,message)=>{if(!ok)throw Error(message);};
  await page.goto('http://127.0.0.1:4186/');
  await page.getByRole('button',{name:'开始游戏',exact:true}).press('Enter');
  await page.getByRole('button',{name:'选择Boss',exact:true}).press('Enter');
  await page.getByRole('button',{name:'选择对手哥莫拉',exact:true}).press('Enter');
  await page.getByRole('button',{name:'开始守护 →'}).press('Enter');
  await page.getByRole('button',{name:'轨道轰击',exact:true}).press('Enter');
  await page.getByText('4 / 12',{exact:true}).waitFor();
  await page.getByRole('button',{name:'黑洞牵引',exact:true}).press('Enter');
  await page.getByRole('heading',{name:'Boss WIN',exact:true}).waitFor();
  assert((await page.evaluate(()=>gameSnapshot())).status==='won','keyboard final hit settles');
  await page.getByRole('button',{name:'再玩一次 →'}).press('Enter');
  await page.getByRole('button',{name:'暂停',exact:true}).press('Enter');
  const before=await page.evaluate(()=>gameSnapshot());
  await page.getByRole('button',{name:'黑洞牵引',exact:true}).press('Enter');
  assert(JSON.stringify(await page.evaluate(()=>gameSnapshot()))===JSON.stringify(before),'paused inputs do not advance combat');
  assert(errors.length===0,errors.join('\n'));
  return {keyboardVictory:true,pause:true,errors};
}
