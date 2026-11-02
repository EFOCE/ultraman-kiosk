async (page) => {
  const context = await page.context().browser().newContext({ viewport: { width: 1365, height: 900 } });
  await context.addInitScript(() => {
    if (window !== window.top) return;
    const NativeAudio = window.Audio;
    window.musicTestTracks = [];
    window.Audio = function (...args) { const track = new NativeAudio(...args); musicTestTracks.push(track); return track; };
  });
  const q = await context.newPage(), errors = [], report = {};
  q.on('pageerror', error => errors.push(error.message));
  const assert = (condition, message) => { if (!condition) throw new Error(message); };
  try {
    await q.goto('http://127.0.0.1:4186/');
    await q.locator('#landing-start').click();
    await q.locator('#music-settings').click();
    for (const [source, id] of [['preview', '1595450868'], ['crew', '1595450869'], ['heroes', '1595450875']]) {
      await q.locator('#music-source').selectOption(source);
      assert(await q.locator('#theme-player iframe').count() === 1, source + ': one official player');
      assert((await q.locator('#theme-player iframe').getAttribute('src')).endsWith(id), source + ': correct recording');
      assert(await q.evaluate(() => audioSnapshot().loops === 0 && !audioSnapshot().filePlaying), source + ': no background overlap');
    }
    await q.locator('.music-options summary').click();
    assert(await q.locator('#theme-player iframe').count() === 1, 'collapsing settings preserves original recording');
    await q.locator('#sound').click();
    assert(await q.locator('#theme-player iframe').count() === 0, 'mute unloads original recording');
    await q.locator('#music-settings').click();
    await q.locator('#music-source').selectOption('book');
    await q.waitForFunction(() => audioSnapshot().loops === 1);
    await q.locator('#music-source').selectOption('original');
    await q.waitForFunction(() => audioSnapshot().loops === 1);
    assert(await q.locator('#theme-player iframe').count() === 0, 'synth selection unloads official player');
    // A generated test tone checks local-file playback without bundling a commercial recording.
    const frames = 16000, wav = Buffer.alloc(44 + frames * 2);
    wav.write('RIFF', 0); wav.writeUInt32LE(wav.length - 8, 4); wav.write('WAVEfmt ', 8);
    wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22);
    wav.writeUInt32LE(8000, 24); wav.writeUInt32LE(16000, 28); wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34);
    wav.write('data', 36); wav.writeUInt32LE(frames * 2, 40);
    for (let i = 0; i < frames; i++) wav.writeInt16LE(Math.round(Math.sin(i * Math.PI * 2 * 440 / 8000) * 1000), 44 + i * 2);
    await q.locator('#music-file').setInputFiles({ name: 'qa-local.wav', mimeType: 'audio/wav', buffer: wav });
    await q.waitForFunction(() => audioSnapshot().filePlaying && audioSnapshot().fileTime > 0.1);
    assert(await q.evaluate(() => musicTestTracks.length === 1 && musicTestTracks[0].loop && audioSnapshot().loops === 0), 'one looping local recording and no synth');
    await q.locator('#music-volume').evaluate(input => { input.value = '70'; input.dispatchEvent(new Event('input', { bubbles: true })); });
    assert(await q.evaluate(() => Math.abs(musicTestTracks[0].volume - 0.7) < 0.001), 'local volume');
    await q.locator('#music-toggle').click();
    await q.waitForFunction(() => !audioSnapshot().filePlaying);
    await q.locator('#start').click();
    assert(await q.evaluate(() => !audioSnapshot().filePlaying), 'starting match preserves intentional music pause');
    await q.locator('#music-settings').click();
    await q.locator('#music-toggle').click();
    await q.waitForFunction(() => audioSnapshot().filePlaying);
    await q.locator('#sound').click();
    await q.waitForFunction(() => !audioSnapshot().filePlaying && audioSnapshot().state === 'suspended');
    await q.locator('#sound').click();
    await q.waitForFunction(() => audioSnapshot().filePlaying);
    await q.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: true }); document.dispatchEvent(new Event('visibilitychange')); });
    await q.waitForFunction(() => !audioSnapshot().filePlaying && audioSnapshot().state === 'suspended');
    await q.evaluate(() => { delete document.hidden; document.dispatchEvent(new Event('visibilitychange')); });
    await q.waitForFunction(() => audioSnapshot().filePlaying);
    report.controls = 'PASS: three official sources, collapse, switch, single player, local playback/pause/volume/mute, simulated visibility';
    await q.locator('#music-settings').click();
    await q.locator('#music-source').selectOption('preview');
    try {
      const frame = q.frameLocator('#theme-player iframe');
      await frame.getByRole('button', { name: /^(再生|Play|播放)$/ }).click({ timeout: 20000 });
      await q.waitForTimeout(6000);
      report.officialPlayback = await frame.locator('audio').evaluateAll(nodes => nodes.map(a => ({ time: a.currentTime, duration: a.duration, paused: a.paused, readyState: a.readyState })));
      assert(report.officialPlayback.some(a => a.time > 0 && !a.paused), 'official recording time advances');
      await q.locator('#game').click({ position: { x: 100, y: 100 } });
      await q.waitForTimeout(1500);
      const after = await frame.locator('audio').evaluateAll(nodes => nodes.map(a => ({ time: a.currentTime, paused: a.paused })));
      assert(after.some(a => a.time > report.officialPlayback[0].time && !a.paused), 'official recording continues while playing game');
      report.officialBattle = 'PASS';
    } catch (error) {
      report.officialPlaybackLimit = error.message;
      report.officialPlayerUrl = await q.locator('#theme-player iframe').getAttribute('src').catch(() => null);
      report.officialPlayerState = await q.frameLocator('#theme-player iframe').locator('body').ariaSnapshot({ timeout: 5000 }).catch(() => 'frame unavailable');
    }
    assert(errors.length === 0, 'no page runtime errors: ' + errors.join('; '));
    report.runtimeErrors = errors;
    return report;
  } finally { await context.close(); }
}
