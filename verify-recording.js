async page => {
  const context = await page.context().browser().newContext({viewport:{width:1365,height:900}});
  await context.addInitScript(() => {
    const NativeAudio = window.Audio, NativeContext = window.AudioContext;
    window.recordingProbe = {tracks:[], contexts:[]};
    window.Audio = function(...args) {const track = new NativeAudio(...args); recordingProbe.tracks.push(track); return track;};
    window.AudioContext = class extends NativeContext {constructor(...args) {super(...args); recordingProbe.contexts.push(this);}};
  });
  const q = await context.newPage(), errors = [], report = {};
  q.on('pageerror', error => errors.push(error.message));
  const assert = (value, message) => {if (!value) throw new Error(message);};
  try {
    await q.goto('http://127.0.0.1:4186/');
    assert(await q.locator('#music-source').inputValue() === 'battle', 'complete recording is default');
    assert(await q.evaluate(() => !audioSnapshot().filePlaying), 'landing is silent before user gesture');
    await q.locator('#landing-start').click();
    await q.waitForFunction(() => audioSnapshot().filePlaying && audioSnapshot().fileTime > .2);
    report.playback = await q.evaluate(() => {
      const track = recordingProbe.tracks[0];
      return {duration:track.duration,time:track.currentTime,loop:track.loop,volume:track.volume,source:track.currentSrc};
    });
    assert(report.playback.duration > 110 && report.playback.duration < 120 && report.playback.loop, 'full 115-second recording loops');
    assert(report.playback.volume === .35, 'default volume is moderate');
    await q.evaluate(() => {
      const ctx=recordingProbe.contexts[0], analyser=ctx.createAnalyser();
      ctx.createMediaElementSource(recordingProbe.tracks[0]).connect(analyser);analyser.connect(ctx.destination);
      window.recordingAnalyser=analyser;
    });
    await q.waitForTimeout(500);
    report.outputEnergy = await q.evaluate(() => {const samples=new Float32Array(recordingAnalyser.fftSize);recordingAnalyser.getFloatTimeDomainData(samples);return samples.reduce((sum,x)=>sum+x*x,0)/samples.length;});
    assert(report.outputEnergy>0,'actual recorded audio output is nonzero');
    await q.locator('#music-settings').click();
    await q.locator('#music-volume').fill('20');
    assert(await q.evaluate(() => recordingProbe.tracks[0].volume === .2), 'volume control');
    await q.locator('#music-toggle').click();
    assert(await q.evaluate(() => !audioSnapshot().filePlaying), 'manual pause');
    await q.locator('#start').click();
    assert(await q.evaluate(() => !audioSnapshot().filePlaying), 'battle does not override pause');
    await q.locator('#music-settings').click();await q.locator('#music-toggle').click();
    await q.waitForFunction(() => audioSnapshot().filePlaying);
    const before=await q.evaluate(()=>audioSnapshot().fileTime);
    await q.keyboard.press('Escape');await q.locator('[data-action=fire]').click();await q.waitForTimeout(500);
    assert(await q.evaluate(t=>audioSnapshot().filePlaying&&audioSnapshot().fileTime>t,before),'recording continues while attacking with settings closed');
    await q.locator('#sound').click();await q.waitForFunction(()=>!audioSnapshot().filePlaying);
    await q.locator('#sound').click();await q.waitForFunction(()=>audioSnapshot().filePlaying);
    await q.locator('#restart').click();
    assert(await q.evaluate(()=>recordingProbe.tracks.length===1&&recordingProbe.contexts.length===1&&audioSnapshot().loops===0),'one track and context, no synth overlap');
    await q.locator('#music-settings').click();await q.locator('#music-source').selectOption('book');
    await q.waitForFunction(()=>audioSnapshot().loops===1&&!audioSnapshot().filePlaying);
    await q.locator('#music-source').selectOption('battle');await q.waitForFunction(()=>audioSnapshot().filePlaying&&audioSnapshot().loops===0);
    // Seek only the test media to exercise the real loop boundary without a two-minute wait.
    await q.evaluate(()=>{const track=recordingProbe.tracks[0];track.currentTime=track.duration-.2;});
    await q.waitForFunction(()=>recordingProbe.tracks[0].currentTime<2&&!recordingProbe.tracks[0].paused);
    report.loopBoundary=true;
    await q.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});
    await q.waitForFunction(()=>!audioSnapshot().filePlaying&&audioSnapshot().state==='suspended');
    await q.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));});
    await q.waitForFunction(()=>audioSnapshot().filePlaying);
    report.visibility='simulated hidden/resume passed';
    assert(!errors.length,errors.join(';'));return {status:'PASS',...report,errors};
  } finally {await context.close();}
}
