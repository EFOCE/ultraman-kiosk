const assert = require('node:assert/strict');
const path = require('node:path');
const { chromium } = require(path.join(process.env.APPDATA, 'npm/node_modules/@playwright/cli/node_modules/playwright'));
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1400, height: 1100 } });
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  try {
    if (process.argv[2] === 'before') {
      const original = require('node:child_process').execFileSync('git', ['show','HEAD:game.mjs'], {cwd: __dirname, encoding:'utf8'});
      await page.route('**/game.mjs', route => route.fulfill({contentType:'text/javascript',body:original}));
    }
    await page.goto('http://127.0.0.1:4186/');
    await page.screenshot({path:path.join(__dirname,'evidence','characters-landing-check.png')});
    const report = await page.evaluate(async () => {
      const { hero, monster, heroNames } = await import('./game.mjs');
      const { ENEMIES } = await import('./model.mjs');
      const portraitEdges = [...document.querySelectorAll('#hero-options canvas, #enemy-options canvas')].map(p => {
        const pixels=p.getContext('2d').getImageData(0,0,p.width,p.height).data;
        let top=0,bottom=0;
        for(let x=0;x<p.width;x++){if(pixels[x*4+3])top++;if(pixels[((p.height-1)*p.width+x)*4+3])bottom++;}
        return {name:p.parentElement.textContent.trim(),top,bottom};
      });
      const canvas = document.createElement('canvas'); canvas.width = 1400; canvas.height = 1100; canvas.id = 'roster-proof';
      const c = canvas.getContext('2d'); c.fillStyle = '#e9e6df'; c.fillRect(0, 0, 1400, 1100);
      const entries = [...Object.entries(heroNames).map(([id, name]) => ({id, name, kind: 'hero'})), ...Object.entries(ENEMIES).map(([id, e]) => ({id, name: e.name, kind: 'enemy'}))];
      entries.forEach((e, i) => {
        const x = (i % 7) * 200 + 100, y = Math.floor(i / 7) * 270 + 226;
        c.save(); c.translate(x, y - 512);
        if (e.kind === 'hero') hero({id: e.id, x: 0, dir: 1, moving: false, firing: 0, invincible: 0, action: ''}, 0, c);
        else monster({id: e.id, x: 0, charge: 0}, 0, 100, c);
        c.restore(); c.fillStyle = '#253b42'; c.font = 'bold 18px sans-serif'; c.textAlign = 'center'; c.fillText(e.name, x, y + 27);
      });
      const scratch = document.createElement('canvas'); scratch.width = 400; scratch.height = 400; const sc = scratch.getContext('2d');
      let poses = 0;
      for (const id of Object.keys(heroNames)) for (const action of ['', 'punch', 'kick', 'weapon']) for (const dir of [-1, 1]) {
        sc.save(); sc.translate(200, -190); hero({id, x: 0, dir, moving: true, firing: action === 'weapon' ? 1 : 0, invincible: .3, action, wingTime: id === 'noa' ? 1 : 0, transformTime: id === 'ruebe' ? 1 : 0}, .1, sc); sc.restore(); poses++;
      }
      for (const form of ['', 'tiger', 'eagle', 'ape']) {sc.save();sc.translate(200,-190);monster({id:'wukong',x:0,charge:0,formTime:form?2:0,form,flightTime:form?0:.6,spell:'staff',skillEffectTime:.3,targetX:100},.1,100,sc);sc.restore();poses++;}
      document.body.replaceChildren(canvas); document.body.style.cssText = 'margin:0;display:block;overflow:auto;background:#e9e6df;';
      return {heroes: Object.keys(heroNames).length, opponents: Object.keys(ENEMIES).length, poses, portraitEdges};
    });
    assert.equal(report.heroes, 12); assert.equal(report.opponents, 13); assert.equal(errors.length, 0);
    if(process.argv[2]!=='before')assert.deepEqual(report.portraitEdges.filter(p=>p.top||p.bottom),[],'Character portraits must fit inside the canvas');
    const suffix = process.argv[2] === 'before' ? 'before' : 'after';
    await page.locator('#roster-proof').screenshot({path: path.join(__dirname, 'evidence', `characters-${suffix}.png`)});
    console.log(JSON.stringify({...report, errors, screenshot: `characters-${suffix}.png`}));
  } finally { await browser.close(); }
})().catch(e => {console.error(e);process.exitCode = 1;});
