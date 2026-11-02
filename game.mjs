import { createGame, step, shoot, attack, setMoveTarget, chooseWeather, WEATHER_NAMES, MAX_HP, ENEMIES } from './model.mjs';

const musicSource = document.querySelector('#music-source');
const musicNote = document.querySelector('#music-note');
const musicTrack = new Audio(); musicTrack.loop = true; musicTrack.volume = 0.35;
const battleRecording = './assets/music/battle-theme.mp3';
let musicURL = '', musicPaused = false;
const originalRecordings = {
  preview: { id: '1595450868', title: '梦比优斯主题曲', artist: 'Project DMM & ウルトラ防衛隊' },
  crew: { id: '1595450869', title: 'Run through! · CREW GUYS 出击', artist: 'Project DMM & TMC' },
  heroes: { id: '1595450875', title: 'HEROES!', artist: 'Project DMM' }
};
function loadThemePreview() {
  const recording = originalRecordings[musicSource.value];
  if (!recording || !audio.enabled || document.hidden || !document.querySelector('.music-options').open || document.querySelector('#theme-player iframe')) return;
  const frame = document.createElement('iframe');
  frame.src = 'https://embed.music.apple.com/jp/album/1595450867?i=' + recording.id;
  frame.title = recording.title + ' · Apple Music 官方原声试听';
  frame.allow = 'autoplay; encrypted-media'; frame.height = '175';
  document.querySelector('#theme-player').append(frame);
}

// Original eight-bar loop: melody, bass, chords and a quiet synthesized beat.
const melody = [72,0,76,79,81,79,76,74,71,74,79,0,77,76,74,0,
  69,72,76,79,81,0,79,76,77,76,72,69,72,0,74,0,
  72,76,79,84,83,79,76,0,77,81,84,81,79,77,76,72,
  74,79,83,86,84,83,79,74,76,79,84,0,79,76,72,0];
const bass = [48,43,45,41,48,41,43,48];
// Original adventure tune, separate from both the legacy loop and licensed preview.
const bookMelody=[67,71,74,79,78,74,71,69,67,0,69,71,74,71,69,0,
  64,67,71,76,74,71,67,66,64,0,66,67,71,69,67,0,
  72,76,79,81,79,76,74,72,71,74,78,81,83,81,78,74,
  79,78,74,71,72,74,76,78,79,74,71,69,67,0,67,0];
const bookBass=[43,50,40,47,48,50,43,43];
const audio = {
  enabled: true, context: null, master: null, timer: null, voices: new Set(),
  beat: 0, next: 0, scheduled: 0, effects: 0, lastEffect: '', error: false,
  async resume() {
    if (!this.enabled || document.hidden) return;
    try {
      if (!this.context) {
        this.context = new (window.AudioContext || window.webkitAudioContext)();
        this.master = this.context.createGain(); this.master.gain.value = 0;
        this.master.connect(this.context.destination);
        this.context.onstatechange = () => {
          if (this.context.state !== 'running') this.stop();
          updateSoundButton();
        };
      }
      await this.context.resume();
      if (!this.enabled || document.hidden) { this.pause(); return; }
      this.error = false; this.master.gain.value = 0.2;
      if (!musicPaused && (musicSource.value === 'battle' || (musicSource.value === 'file' && musicURL))) {
        const source = musicSource.value === 'battle' ? battleRecording : musicURL;
        if (musicTrack.getAttribute('src') !== source) musicTrack.src = source;
        await musicTrack.play();
      }
      if (!this.enabled || document.hidden) { this.stop(); return; }
      if (this.context.state === 'running' && this.timer === null && ['original','book'].includes(musicSource.value)) {
        this.next = this.context.currentTime + 0.04; this.beat = 0;
        this.schedule(); this.timer = setInterval(() => this.schedule(), 100);
      }
    } catch { this.error = true; }
    updateSoundButton();
  },
  tone(frequency, time, duration, volume, type = 'triangle', end = frequency) {
    if (!this.enabled || this.context?.state !== 'running') return;
    const oscillator = this.context.createOscillator(), gain = this.context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, time);
    oscillator.frequency.exponentialRampToValueAtTime(end, time + duration);
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(volume, time + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    oscillator.connect(gain); gain.connect(this.master); this.voices.add(oscillator);
    oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); this.voices.delete(oscillator); };
    oscillator.start(time); oscillator.stop(time + duration + 0.02);
  },
  schedule() {
    if (!this.enabled || document.hidden || this.context.state !== 'running') return;
    const book=musicSource.value==='book', notes=book?bookMelody:melody, roots=book?bookBass:bass;
    const eighth = 60 / (book?144:132) / 2;
    if (this.next < this.context.currentTime) this.next = this.context.currentTime + 0.02;
    while (this.next < this.context.currentTime + 0.18) {
      const note = notes[this.beat], root = roots[Math.floor(this.beat / 8)], t = this.next;
      const hz = midi => 440 * 2 ** ((midi - 69) / 12);
      if (note) this.tone(hz(note), t, eighth * (book?0.65:0.85), 0.18,book?'sine':'triangle');
      if (this.beat % 2 === 0) {
        this.tone(hz(root), t, eighth * 1.7, 0.22, 'sine');
        this.tone(135, t, 0.12, 0.24, 'sine', 42);
      }
      if (this.beat % 8 === 0) {
        for (const offset of [12, (book?[40,47].includes(root):root===45) ? 15 : 16, 19]) this.tone(hz(root + offset), t, eighth * 3, 0.045);
      }
      this.tone(this.beat % 4 === 2 ? 1100 : book?2800:3600, t, 0.035, 0.035, 'triangle', 700);
      if(book&&this.beat%8===7)this.tone(hz(note||67)*2,t,eighth*0.45,0.035,'sine');
      this.scheduled++; this.beat = (this.beat + 1) % notes.length; this.next += eighth;
    }
  },
  effect(kind) {
    if (!this.enabled || document.hidden || this.context?.state !== 'running') return;
    const t = this.context.currentTime; this.effects++; this.lastEffect = kind;
    if (kind === 'fire') this.tone(1000, t, 0.13, 0.14, 'sawtooth', 220);
    if (kind === 'hit') this.tone(300, t, 0.09, 0.23, 'triangle', 85);
    if (kind === 'hurt') this.tone(180, t, 0.22, 0.18, 'sine', 60);
    if (kind === 'punch' || kind === 'kick') this.tone(420, t, kind === 'kick' ? 0.18 : 0.09, 0.18, 'triangle', 100);
    if (kind === 'weapon') this.tone(260, t, 0.3, 0.12, 'triangle', 1200);
    if (kind === 'warning') this.tone(660, t, 0.16, 0.13, 'sine', 440);
    if (kind === 'win' || kind === 'lose') {
      const notes = kind === 'win' ? [72,76,79,84] : [69,65,60];
      notes.forEach((note, index) => this.tone(440 * 2 ** ((note - 69) / 12), t + index * 0.16, 0.3, 0.24));
    }
  },
  stop() {
    clearInterval(this.timer); this.timer = null;
    musicTrack.pause();
    document.querySelector('#theme-player').replaceChildren();
    if (this.master) this.master.gain.value = 0;
    for (const voice of this.voices) voice.stop();
    this.voices.clear();
  },
  pause() {
    this.stop();
    this.context?.suspend().catch(() => { this.error = true; updateSoundButton(); });
    updateSoundButton();
  }
};
const soundButton = document.querySelector('#sound');
function updateSoundButton() {
  const playing = audio.enabled && audio.context?.state === 'running';
  soundButton.setAttribute('aria-pressed', String(playing));
  soundButton.setAttribute('aria-label', playing ? '关闭音乐和音效' : '开启音乐和音效');
  soundButton.querySelector('span').textContent = audio.error ? '♫ 点击重试声音' : playing ? '♫ 声音：开' : audio.enabled ? '♫ 开启声音' : '♫ 声音：关';
  soundButton.querySelector('small').textContent = musicSource.value === 'battle' ? '热血摇滚 · 循环' : musicSource.value === 'book' ? '书本穿越记 · 器乐' : musicSource.value === 'original' ? '原创备用配乐' : originalRecordings[musicSource.value] ? '音效 / 原声试听' : musicURL ? '本地原声 · 循环' : '音效 / 等待音频';
  const toggle = document.querySelector('#music-toggle');
  if (toggle) {
    toggle.hidden = !['battle','file'].includes(musicSource.value); toggle.disabled = musicSource.value === 'file' && !musicURL;
    toggle.textContent = musicTrack.paused ? '播放配乐' : '暂停配乐';
    toggle.setAttribute('aria-pressed', String(!musicTrack.paused));
  }
  const volume = document.querySelector('.music-volume');
  if (volume) volume.hidden = !['battle','file'].includes(musicSource.value);
  const credit = document.querySelector('#music-credit'), recording = originalRecordings[musicSource.value];
  if (credit) credit.textContent = musicSource.value === 'battle' ? 'JRPG Epic Rock Battle Theme #1 · HydroGene · 完整摇滚录音' : recording ? recording.title + ' · ' + recording.artist + ' · 官方原声' : musicSource.value === 'file' ? '导入你已有的原声音频，完整循环，文件仅留在本机。' : '原创合成器乐 · 非影视原声';
  document.querySelector('#preview-note').hidden = !recording;
  document.querySelector('#official-music-link').hidden = !recording;
  document.querySelector('#battle-credit-link').hidden = musicSource.value !== 'battle';
}
soundButton.addEventListener('click', () => {
  if (audio.enabled && audio.context?.state === 'running') {
    audio.enabled = false; audio.pause();
  } else { audio.enabled = true; void audio.resume(); loadThemePreview(); }
});
musicSource.addEventListener('change', () => { audio.stop(); musicPaused = false; void audio.resume(); loadThemePreview(); updateSoundButton(); });
document.querySelector('#music-settings').addEventListener('click', () => {
  const settings = document.querySelector('.music-options'); settings.open = true;
  audio.enabled = true; void audio.resume(); loadThemePreview();
  settings.scrollIntoView({ block: 'nearest' }); musicSource.focus({ preventScroll: true });
});
window.addEventListener('game-enter', () => { void audio.resume(); });
document.querySelector('#music-toggle')?.addEventListener('click', () => {
  if (musicSource.value === 'file' && !musicURL) return;
  musicPaused = !musicTrack.paused;
  if (musicPaused) musicTrack.pause();
  else { audio.enabled = true; void audio.resume(); }
  updateSoundButton();
});
document.querySelector('#music-volume')?.addEventListener('input', event => { musicTrack.volume = Number(event.target.value) / 100; });
document.querySelector('.music-options').addEventListener('toggle', event => {
  if (event.target.open) { if (audio.enabled) loadThemePreview(); }
});
document.querySelector('#music-file').addEventListener('change', event => {
  const file = event.target.files[0];
  if (!file) return;
  if (!file.type.startsWith('audio/') && !/\.(mp3|m4a|wav|ogg)$/i.test(file.name)) {
    musicNote.textContent = '请选择 MP3、M4A、WAV 或 OGG 音频文件。'; return;
  }
  audio.stop(); musicPaused = false; audio.enabled = true; if (musicURL) URL.revokeObjectURL(musicURL);
  musicURL = URL.createObjectURL(file); musicTrack.src = musicURL; musicSource.value = 'file';
  musicNote.textContent = '已选择：' + file.name + '（仅本机播放）'; void audio.resume();
});
musicTrack.addEventListener('error', () => {
  musicNote.textContent = '该音频无法解码，请换用可播放的 MP3、M4A、WAV 或 OGG 文件。';
  audio.error = true; updateSoundButton();
});
musicTrack.addEventListener('playing', updateSoundButton);
musicTrack.addEventListener('pause', updateSoundButton);
updateSoundButton();
document.addEventListener('visibilitychange', () => {
  if (document.hidden) audio.pause();
  else if (audio.context && audio.enabled) void audio.resume();
});

const canvas = document.querySelector('#game');
const ctx = canvas.getContext('2d');
export const background = document.createElement('canvas');
background.width = canvas.width; background.height = canvas.height;
let c = background.getContext('2d');
const ink = '#29493e';
function box(x, y, w, h, color, radius = 0, stroke = null) {
  c.beginPath(); c.roundRect(x, y, w, h, radius); c.fillStyle = color; c.fill();
  if (stroke) { c.strokeStyle = stroke; c.lineWidth = 3; c.stroke(); }
}
function oval(x, y, rx, ry, color, stroke = null) {
  c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); c.fillStyle = color; c.fill();
  if (stroke) { c.strokeStyle = stroke; c.lineWidth = 3; c.stroke(); }
}
function poly(points, color, stroke = null) {
  c.beginPath(); points.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.closePath(); c.fillStyle = color; c.fill();
  if (stroke) { c.strokeStyle = stroke; c.lineWidth = 3; c.lineJoin = 'round'; c.stroke(); }
}
function line(points, color, width = 3) {
  c.beginPath(); points.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.strokeStyle = color; c.lineWidth = width; c.lineCap = 'round'; c.lineJoin = 'round'; c.stroke();
}
function label(text, x, y, size, color = ink, weight = 700) {
  c.fillStyle = color; c.font = `${weight} ${size}px "Microsoft YaHei", sans-serif`; c.textAlign = 'center'; c.fillText(text, x, y);
}
function leafTree(x, y, scale = 1) {
  c.save(); c.translate(x, y); c.scale(scale, scale);
  box(-8, -15, 16, 180, '#927753', 5);
  line([[0, 85], [-29, 46]], '#927753', 10);
  oval(-34, 14, 50, 63, '#83a97e'); oval(32, 0, 54, 77, '#6b9875'); oval(0, -40, 53, 69, '#91b186');
  line([[-17, -58], [-17, 57]], '#74956e', 3); c.restore();
}
function packet(x, y, color, name) {
  poly([[x, y], [x + 32, y], [x + 29, y + 45], [x + 3, y + 45]], color, '#fff5dd');
  line([[x + 4, y + 5], [x + 28, y + 5]], '#ffffff77', 2);
  oval(x + 16, y + 20, 10, 8, '#f9dc87'); label(name, x + 16, y + 36, 8, '#fff9df');
}
function bottle(x, y, color) {
  box(x + 5, y, 11, 8, '#f0edc8', 2); box(x + 2, y + 8, 17, 37, color, 5);
  box(x + 2, y + 20, 17, 13, '#fff3d2', 2); line([[x + 7, y + 12], [x + 7, y + 18]], '#ffffffaa', 2);
}

// The shop is painted once; the moving characters reuse this canvas each frame.
box(0, 0, 1100, 590, '#e8edcf');
oval(922, 58, 40, 40, '#f7d77b');
for (const [x, y] of [[90, 55], [220, 28], [800, 35]]) {
  oval(x, y, 43, 12, '#fff8e7'); oval(x - 12, y - 8, 18, 14, '#fff8e7'); oval(x + 10, y - 7, 23, 17, '#fff8e7');
}
leafTree(62, 255, 1.1); leafTree(1042, 232, 1.25);
box(0, 393, 1100, 100, '#9da885');
for (let x = 15; x < 1100; x += 36) box(x, 366, 22, 112, '#c3c4a0', 7);
box(0, 405, 1100, 11, '#b2b68e');
box(143, 172, 814, 305, '#c8a476', 6);
box(132, 169, 807, 300, '#f7e5bb', 5, ink);
box(132, 445, 807, 24, '#d3a777');
for (let x = 155; x < 930; x += 85) line([[x, 449], [x, 467]], '#c19262', 2);
poly([[116, 151], [145, 108], [929, 108], [962, 151]], '#3e7962', ink);
for (let x = 160; x < 930; x += 65) line([[x, 115], [x - 11, 146]], '#73a085', 2);
box(115, 147, 848, 20, '#2f5b4a', 4, ink);
box(345, 46, 405, 95, '#365b48', 13, ink);
box(355, 40, 385, 90, '#f7edcd', 11, ink);
box(364, 49, 367, 72, '#d85d42', 7);
label('✦ 光之小卖部 ✦', 548, 92, 33, '#fff6d8', 900);
label('零 食 · 汽 水 · 快 乐', 548, 114, 11, '#fff0ce');
box(132, 168, 807, 47, '#fff1d1');
for (let i = 0; i < 18; i++) {
  const x = 132 + i * 44.8;
  box(x, 168, 44.8, 34, i % 2 ? '#fff1d1' : '#e88159');
  box(x, 193, 44.8, 25, i % 2 ? '#fff1d1' : '#e88159', [0, 0, 16, 16]);
}
line([[132, 167], [939, 167]], ink, 3);
box(170, 238, 282, 186, '#476b58', 5, ink);
box(699, 238, 207, 186, '#476b58', 5, ink);
for (const [left, width] of [[181, 260], [710, 185]]) {
  box(left, 247, width, 165, '#345545', 2);
  for (let row = 0; row < 3; row++) {
    const y = 257 + row * 52;
    if (left === 181) {
      for (let col = 0; col < 6; col++) packet(left + 5 + col * 43, y, ['#d97045', '#d9a848', '#619f90', '#b06d72', '#87a764', '#df8d54'][(col + row) % 6], row === 1 ? '饼干' : '薯片');
    } else {
      for (let col = 0; col < 6; col++) bottle(left + 7 + col * 29, y, ['#e2b052', '#9bc0a4', '#d87354'][(col + row) % 3]);
    }
    box(left - 4, y + 44, width + 8, 8, '#c39a62', 1);
  }
}
box(160, 421, 302, 14, '#a27b50', 3, ink);
box(689, 421, 227, 14, '#a27b50', 3, ink);
box(502, 230, 145, 239, '#3f6b59', 3, ink);
box(513, 241, 123, 211, '#b5d1b3', 3);
poly([[517, 245], [629, 245], [517, 385]], '#d7e4c6');
poly([[556, 452], [632, 318], [632, 363], [584, 452]], '#c8dec0');
line([[575, 243], [575, 451]], '#719883', 4);
box(565, 338, 6, 26, '#fff2cb', 3, ink);
line([[536, 276], [549, 289], [563, 276]], '#967d53', 2);
box(526, 288, 47, 31, '#fff4d4', 3, '#947d54');
label('营业中', 550, 309, 11, '#b05939');
box(488, 466, 174, 13, '#a88b63', 2, ink);
box(481, 479, 190, 13, '#cbb793', 2);
box(467, 247, 20, 69, '#f6cf79', 3); label('欢', 477, 267, 12, '#a14b35'); label('迎', 477, 286, 12, '#a14b35'); label('你', 477, 305, 12, '#a14b35');
box(659, 247, 22, 87, '#f6cf79', 3); ['快', '乐', '补', '给'].forEach((ch, i) => label(ch, 670, 265 + i * 19, 12, '#a14b35'));
box(768, 221, 76, 24, '#f8d78d', 5, '#967d53'); label('冰凉汽水', 806, 238, 11, '#7b5438');
box(254, 221, 108, 24, '#f8d78d', 5, '#967d53'); label('放学来点好吃的', 308, 238, 10, '#7b5438');
box(0, 492, 1100, 98, '#d9c49b');
box(0, 492, 1100, 13, '#eddcb5'); line([[0, 505], [1100, 505]], '#bca87f', 2);
for (let x = 0; x < 1100; x += 140) line([[x, 505], [x - 25, 590]], '#c9b58c', 2);
line([[0, 555], [1100, 555]], '#c9b58c', 2);
box(64, 412, 106, 89, '#6da5a0', 7, ink); box(60, 402, 114, 21, '#daebd4', 5, ink);
box(71, 407, 40, 9, '#91c6be', 3); box(120, 407, 43, 9, '#91c6be', 3);
label('冰 棒', 117, 461, 20, '#fff6d5'); label('清凉一下', 117, 482, 9, '#e5f0d8');
box(929, 457, 52, 45, '#c57e55', [5, 5, 15, 15], ink);
for (const [x, y, angle] of [[943, 430, -.6], [967, 427, .6], [956, 417, 0]]) {
  c.save(); c.translate(x, y); c.rotate(angle); oval(0, 0, 12, 34, '#5d8d66', ink); c.restore();
}
box(920, 450, 70, 12, '#de9b70', 4, ink);
label('小小街角 · 大大勇气', 542, 568, 12, '#927c57', 500);
c = ctx;

function metalSurface(x1, y1, x2, y2, dark, light, middle) {
  const material = c.createLinearGradient(x1, y1, x2, y2);
  material.addColorStop(0, dark); material.addColorStop(.26, middle);
  material.addColorStop(.46, light); material.addColorStop(.57, middle); material.addColorStop(1, dark);
  return material;
}
function heroSuitFinish(character, time) {
  const id = character.id, walking = character.moving ? Math.sin(time * 15) * 7 : 0;
  const rim = '#f4fcffbb', shade = '#13283d66';
  for (const side of [-1, 1]) {
    line([[side*21,-67],[side*17,-54],[side*14,-44]],shade,2);
    line([[side*16,-64],[side*12,-53]],rim,1);
    if (!(side === 1 && character.action === 'kick')) {
      line([[side*13,-39],[side*15+side*walking,-28]],'#ffffff66',2);
      line([[side*17+side*walking,-22],[side*18+side*walking,-12]],shade,2);
      line([[side*19+side*walking-8,-7],[side*19+side*walking+6,-7]],'#ffffff88',1);
    }
  }
  if (id === 'zero' || id === 'seven' || id === 'taro') {
    for (const side of [-1,1]) for (let row=0;row<2;row++) for(let j=0;j<3;j++) {
      box(side*(12+j*4)-1.5,-85+row*5,3,2,'#314453',.5);
      line([[side*(12+j*4)-1,-86+row*5],[side*(12+j*4)+1,-86+row*5]],rim,.7);
    }
  }
  if(id==='nexus')for(let y=-67;y<-59;y+=2)line([[-17,y],[-9,y+1]],'#d2e4ed',.8);
  if(id==='noa')for(const side of [-1,1])line([[side*36,-102],[side*43,-145],[side*45,-187]],'#f4ffff',1.5);
  const faceY = ['mebius','noa','taro','tregear','zhuqingqing','jiangshuyan','choumo'].includes(id) ? -113 : -101;
  line([[-11,faceY],[-6,faceY+5],[-4,faceY+8]],'#526c7a',1);
  line([[11,faceY],[6,faceY+5],[4,faceY+8]],'#f5ffffbb',1);
  if(id==='tregear')for(const side of [-1,1])line([[side*16,-90],[side*8,-82]],'#fff0c8',1.2);
}
function monsterSurfaceDetails(id) {
  const edge='#d2e0e6', dark='#192431', gold='#e9c78a';
  if(id==='empera') {
    for(const side of [-1,1]) {
      poly([[side*21,-111],[side*38,-119],[side*31,-99],[side*20,-91]],'#777b91',dark);
      for(let y=-94;y<-53;y+=10)poly([[side*3,y],[side*22,y-7],[side*19,y],[side*4,y+5]],'#3c4155','#70768c');
      poly([[side*11,-47],[side*23,-52],[side*21,-13],[side*12,-9]],'#4b5268',dark);
      line([[side*17,-43],[side*17,-18]],'#a1a5b4',1.5);
      line([[side*30,-91],[side*39,-70],[side*34,-53]],'#a6a5b6',1.5);
      for(let j=0;j<3;j++)line([[side*(30+j*4),-52],[side*(28+j*4),-43]],'#9c9ca9',1.5);
    }
    poly([[-18,-52],[0,-45],[18,-52],[16,-40],[0,-32],[-16,-40]],'#5d627a',dark);
    line([[-12,-137],[0,-148],[12,-137]],edge,1);
  } else if(id==='belial') {
    for(const side of [-1,1]) {
      line([[side*23,-99],[side*16,-85],[side*6,-77]],'#ff6b65',1.5);
      line([[side*23,-53],[side*22,-28]],'#7b303b',2);
      for(let j=0;j<3;j++)poly([[side*(30+j*5),-54],[side*(31+j*5),-47],[side*(28+j*5),-36],[side*(26+j*5),-46]],'#a7b6bb',dark);
    }
    poly([[-13,-118],[0,-115],[13,-118],[8,-111],[-8,-111]],'#09131c');
    for(let x=-8;x<=8;x+=4)poly([[x,-117],[x+3,-117],[x+1,-113]],'#c9d6da');
    for(let y=-155;y<-129;y+=7)for(let x=42;x<55;x+=6)box(x,y,3,4,'#b390a6',.5);
    line([[48,-125],[45,-54]],'#a6b8c6',1);
  } else if(id==='gomora'||id==='tyrant') {
    for(let y=-89;y<-24;y+=9)for(let x=-24;x<=23;x+=8) {
      if(Math.abs(x)>29-Math.abs(y+57)*.15)continue;
      poly([[x,y],[x+3,y-3],[x+6,y],[x+3,y+3]],id==='gomora'?'#a98759':'#758c8a');
      line([[x,y],[x+3,y-3]],id==='gomora'?'#e3c28d':'#b6c8bb',1);
    }
    oval(0,-108,16,10,id==='gomora'?'#99764e':'#687c79',dark);
    poly([[-14,-111],[0,-108],[14,-111],[10,-102],[-10,-102]],'#293133');
    for(let x=-10;x<=10;x+=5)poly([[x,-110],[x+3,-109],[x+1,-105]],'#f4e9c9');
    for(const side of [-1,1]) {
      line([[side*4,-124],[side*18,-127]],'#493d31',3);
      for(let j=0;j<3;j++)poly([[side*(10+j*6),-6],[side*(13+j*6),-12],[side*(16+j*6),-5]],'#e1d2ae',dark);
    }
    if(id==='gomora')for(const side of [-1,1]) {
      poly([[side*16,-136],[side*31,-143],[side*47,-157],[side*42,-136],[side*28,-124]],gold,dark);
      line([[side*25,-135],[side*39,-145]],'#fff1c4',1.5);
    }
  } else if(id==='baltan') {
    for(const side of [-1,1]) {
      for(let y=-44;y<-12;y+=6)line([[side*9,y],[side*24,y]],'#d4e4df',1.5);
      for(let y=-134;y<-120;y+=4)for(let x=7;x<=14;x+=3)oval(side*x,y,1,1,'#b26c39');
      poly([[side*39,-79],[side*55,-85],[side*65,-128],[side*51,-108],[side*44,-141],[side*35,-111]],'#a6c7ce',dark);
      line([[side*42,-102],[side*47,-89],[side*56,-114]],'#edf7ec',1.5);
    }
    for(let y=-103;y<-55;y+=6)line([[-9,y],[0,y+3],[9,y]],'#4b606f',1);
  } else if(id==='zetton') {
    for(const side of [-1,1]) {
      for(let y=-106;y<-67;y+=6)line([[side*26,y],[side*34,y+3]],'#c5d4d8',2);
      for(let y=-104;y<-77;y+=6)oval(side*14,y,3,2,'#ffe0a0');
      line([[side*19,-151],[side*25,-168]],'#f3e9d3',1.5);
    }
    for(let y=-145;y<-118;y+=6)oval(0,y,2.5,2,'#ffebaa');
  } else if(id==='kingjoe') {
    for(const side of [-1,1]) {
      for(const y of [-105,-57])oval(side*23,y,2,2,'#fff0b9',dark);
      oval(side*19,-39,10,8,'#8f875d',dark);oval(side*19,-39,5,5,gold);
      line([[side*15,-28],[side*15,-14]],'#fff0bd',2);
      line([[side*33,-115],[side*33,-103]],'#fff2c2',1.5);
    }
    poly([[-7,-65],[7,-65],[10,-55],[0,-49],[-10,-55]],'#77785a',dark);
    line([[-20,-138],[20,-138]],'#fff0c2',1.5);
  } else if(id==='bemstar') {
    for(const side of [-1,1]) {
      for(let j=0;j<4;j++)line([[side*(29+j*6),-87+j*11],[side*(35+j*6),-50+j*9]],'#a4b1a0',1.5);
      line([[side*4,-122],[side*19,-125]],dark,3);
      for(let j=0;j<3;j++)poly([[side*(8+j*7),-7],[side*(11+j*7),-15],[side*(15+j*7),-6]],gold,dark);
    }
    poly([[-10,-101],[0,-105],[11,-101],[0,-94]],'#ffe4a1',dark);
    for(let r=0;r<3;r++)line([[-17+r*4,-62],[0,-79+r*7],[17-r*4,-62]],'#87967c',1);
  }
}
export function hero(character, time, context = ctx) {
  const previousContext = c; c = context;
  const ink = '#24323e';
  c.save(); c.translate(character.x, 512); c.scale(character.dir, 1);
  const id = character.id || 'ruebe';
  const isRuebe = id === 'ruebe';
  if (id === 'seven') c.scale(0.94, 1.04);
  const red = metalSurface(-30,-90,35,-50,'#851f31','#f77e78','#cc334c');
  const suit = id === 'zero' ? metalSurface(-28,-90,32,-40,'#183d70','#4c9dc9','#27649b') : id === 'seven' ? red : '#202c39';
  const silver = metalSurface(-30,-80,32,-65,'#687e96','#f5fbff','#b6c9d8');
  const gold = metalSurface(-30,-145,35,-65,'#926020','#fff0b0','#d6a84e');
  const walking = character.moving ? Math.sin(time * 15) * 7 : 0;
  oval(0, 3, 38, 9, '#6d755b33');
  c.scale(.84,1.12);
  if (character.invincible > 0) { oval(0, -55, 43, 73, '#b9f6e555', '#97cebd'); }
  if(isRuebe&&character.action==='punch'){
    poly([[80,-68],[84,-104],[128,-157],[111,-93],[91,-63]],'#f2a04f',ink);
    line([[88,-78],[113,-128]],'#ffda8a',3);line([[73,-69],[95,-54]],'#5a9d56',8);
    poly([[73,-69],[63,-89],[82,-79],[94,-92],[90,-70]],'#83b862',ink);
  }
  if(isRuebe&&character.transformTime>0){
    poly([[-30,-112],[-35,-78],[-20,-35],[0,1],[21,-37],[35,-80],[28,-113]],'#ef974d',ink);
    for(const side of [-1,1])poly([[0,-111],[side*40,-147],[side*28,-154],[side*8,-137],[side*12,-168],[-side*3,-158]],'#6eae60',ink);
    for(let y=-93;y<-35;y+=22)line([[-16,y],[5,y+3]],'#c97137',3);
    oval(-12,-93,5,7,'#fff7c8',ink);oval(12,-93,5,7,'#fff7c8',ink);line([[-9,-77],[0,-72],[9,-77]],ink,2);
    c.restore();c=previousContext;return;
  }
  if(character.wingTime>0){
    for(const s of [-1,1])poly([[s*21,-91],[s*97,-176],[s*84,-103],[s*54,-68],[s*23,-51]],'#d7f5f4aa','#6baebd');
    oval(0,-82,64,102,'#d7f5f422','#87ccd1');
  }
  if(character.blinkTime>0){for(const x of [-60,-48,-36])line([[x,-144],[x-15,-32]],'#b5e7fa',4);}
  if((id==='noa'&&character.action==='weapon')||(isRuebe&&character.action==='kick'))oval(0,-170,15,10,'#dff5ff99','#78b7c4');
  if (id === 'noa' || id === 'taro') {
    const noa = id === 'noa', armor = noa ? silver : red;
    if (noa) for (const side of [-1,1]) {
      poly([[side*23,-83],[side*40,-199],[side*47,-204],[side*53,-105],[side*43,-73]],silver,ink);
      line([[side*43,-188],[side*45,-112],[side*35,-88]],'#8a9c9d',3);
    }
    for (const side of [-1,1]) {
      const kick = !noa && side === 1 && character.action === 'kick';
      const points = kick ? [[12,-47],[43,-41],[82,-58]] : [[side*12,-47],[side*17+side*walking,-24],[side*19+side*walking,-5]];
      line(points,ink,22);line(points,armor,18);line(points,noa?'#dbe4e0':silver,5);
      box(kick?73:side*19+side*walking-12,kick?-69:-14,26,18,noa?silver:red,6,ink);
    }
    poly([[-26,-91],[-13,-99],[13,-99],[26,-91],[21,-61],[16,-42],[-16,-42],[-21,-61]],armor,ink);
    if (noa) {
      for(const side of [-1,1]) {line([[side*21,-73],[side*10,-65],[side*3,-60]],'#8c9f9d',3);line([[side*20,-61],[side*12,-54],[side*3,-51]],'#8c9f9d',2);}
      poly([[-24,-91],[-12,-86],[0,-79],[12,-86],[24,-91],[20,-79],[7,-71],[0,-62],[-7,-71],[-20,-79]],red,ink);
    } else {
      poly([[-27,-93],[-15,-98],[0,-90],[15,-98],[27,-93],[23,-77],[13,-73],[0,-79],[-13,-73],[-23,-77]],silver,ink);
      for(const side of [-1,1])for(let i=0;i<3;i++)oval(side*(10+i*6),-87+i*2,2.4,2.4,'#768d88');
      oval(0,-76,5,7,'#64c6e2',ink);line([[-17,-63],[-10,-53],[-10,-43]],silver,4);line([[17,-63],[10,-53],[10,-43]],silver,4);
    }
    line([[-23,-88],[-33,-63],[-26,-48]],ink,18);line([[-23,-88],[-33,-63],[-26,-48]],armor,13);
    const arm=character.action==='punch'?[[23,-88],[57,-76],[92,-76]]:character.firing>0||character.action==='weapon'?[[23,-88],[34,-65],[49,-65]]:[[23,-88],[33,-65],[42,-76]];
    line(arm,ink,18);line(arm,armor,13);const fist=arm[2];oval(fist[0]+4,fist[1],9,8,silver,ink);
    if(!noa)box(-35,-59,13,7,'#d7c79c',2,ink);if(character.firing>0)oval(55,-65,11,9,'#c8faec');
    c.save();c.translate(0,-98);c.scale(.86,.87);c.translate(0,98);
    poly([[-23,-135],[-12,-149],[0,-153],[13,-149],[24,-135],[22,-117],[12,-102],[0,-97],[-12,-102],[-22,-117]],silver,ink);
    if(noa) {
      poly([[-5,-145],[0,-168],[7,-152],[5,-126],[-3,-126]],silver,ink);
      for(const side of [-1,1]) {poly([[side*20,-139],[side*27,-147],[side*21,-127],[side*16,-113]],'#829a9a');oval(side*12,-128,9,7,'#f8edb1','#899e96');line([[side*20,-119],[side*12,-111]],'#7b9391',3);}
    } else {
      for(const side of [-1,1])poly([[side*20,-133],[side*33,-141],[side*35,-160],[side*43,-147],[side*36,-127],[side*25,-120]],silver,ink);
      poly([[-5,-146],[0,-166],[5,-146],[3,-125],[-3,-125]],silver,ink);oval(0,-133,3,5,'#72c99e',ink);
      poly([[-20,-128],[-5,-125],[-7,-117],[-17,-117]],'#ffe8a6',ink);poly([[20,-128],[5,-125],[7,-117],[17,-117]],'#ffe8a6',ink);
      line([[-22,-116],[-14,-106]],red,3);line([[22,-116],[14,-106]],red,3);
    }
    poly([[-8,-108],[0,-106],[8,-108],[4,-101],[-4,-101]],'#8b9f9e');line([[-6,-106],[6,-106]],'#f2f5ea',2);
    c.restore();heroSuitFinish(character,time);
    c.restore();c=previousContext;return;
  }
  if (['tregear','zhuqingqing','jiangshuyan','choumo'].includes(id)) {
    const tregear = id === 'tregear', jiang = id === 'jiangshuyan', choumo = id === 'choumo';
    const base = tregear ? '#202c42' : jiang ? '#8b5aa7' : choumo ? '#26405f' : '#2d8264';
    const accent = tregear ? '#345e94' : jiang ? '#e9b5df' : choumo ? '#e4a452' : '#8fd8ae';
    const action = jiang ? {punch:'delay',kick:'slime',weapon:'skate'}[character.action] : choumo ? {punch:'cry',kick:'kick',weapon:'bug'}[character.action] : character.action;
    for (const side of [-1,1]) {
      const kick = side === 1 && action === 'kick';
      const points = kick ? [[12,-47],[43,-41],[82,-58]] : [[side*12,-47],[side*17+side*walking,-24],[side*19+side*walking,-5]];
      line(points,ink,22); line(points,base,18); line(points,tregear?accent:silver,7);
      box(kick?73:side*19+side*walking-12,kick?-69:-14,26,18,tregear?'#252c37':silver,6,ink);
    }
    poly([[-24,-91],[-12,-97],[12,-97],[24,-91],[21,-60],[16,-42],[-16,-42],[-21,-60]],base,ink);
    poly([[-23,-86],[-11,-76],[-8,-48],[-17,-44],[-21,-61]],accent);
    poly([[23,-86],[11,-76],[8,-48],[17,-44],[21,-61]],accent);
    if (tregear) {
      line([[-20,-93],[17,-65]],'#9b733f',12);line([[20,-93],[-17,-65]],'#9b733f',12);
      line([[-20,-93],[17,-65]],'#d5b27b',7);line([[20,-93],[-17,-65]],'#d5b27b',7);
      poly([[-8,-86],[8,-86],[12,-77],[0,-69],[-12,-77]],'#bd945d',ink);
      for (const side of [-1,1]) poly([[side*20,-93],[side*35,-107],[side*29,-86]],'#ae8a58',ink);
    } else {
      poly([[-23,-88],[0,-72],[23,-88],[19,-72],[0,-58],[-19,-72]],silver,ink);
      poly([[0,-82],[8,-74],[0,-65],[-8,-74]],jiang?'#f4c4ef':choumo?'#f3c66d':'#88ef9c',ink);box(-17,-49,34,7,silver,2);
    }
    line([[-22,-82],[-33,-61],[-25,-47]],ink,18);line([[-22,-82],[-33,-61],[-25,-47]],base,13);
    const arm = action==='punch' ? [[22,-82],[57,-74],[92,-74]] : action==='bug' ? [[22,-82],[35,-112],[20,-144]] : action==='delay' ? [[22,-82],[38,-96],[37,-117]] : character.firing>0||action==='weapon'||action==='slime' ? [[22,-82],[34,-65],[49,-65]] : [[22,-82],[32,-62],[41,-73]];
    line(arm,ink,18);line(arm,base,13);const fist=arm[2];oval(fist[0]+4,fist[1],9,8,tregear?'#2e3540':silver,ink);
    box(-36,-60,13,7,tregear?'#c4a16d':silver,2);if(character.firing>0)oval(55,-65,11,9,'#c8faec');
    c.save();c.translate(0,-94);c.scale(.86,.87);c.translate(0,94);
    poly([[-24,-132],[-13,-147],[0,-151],[14,-146],[24,-131],[23,-113],[12,-98],[0,-92],[-13,-99],[-23,-114]],silver,ink);
    if (tregear) {
      poly([[-5,-145],[0,-173],[6,-149],[4,-120],[-3,-120]],silver,ink);
      for(const side of [-1,1]) {
        poly([[side*4,-125],[side*14,-143],[side*24,-161],[side*27,-148],[side*18,-131],[side*25,-117],[side*12,-111]],'#27354f',ink);
        line([[side*7,-126],[side*17,-141],[side*22,-151]],'#5c7fae',3);
        poly([[side*7,-121],[side*21,-130],[side*17,-119],[side*10,-116]],'#df777e',ink);
        poly([[side*23,-127],[side*34,-140],[side*27,-118]],silver,ink);
      }
      poly([[-11,-114],[0,-120],[11,-114],[7,-105],[-7,-105]],'#26334a');
      poly([[-8,-104],[8,-104],[4,-98],[-4,-98]],'#8eaaa9');
    } else {
      poly([[-23,-130],[-13,-146],[0,-151],[14,-146],[23,-130],[14,-119],[-14,-119]],base,ink);
      poly([[-23,-128],[-10,-133],[0,-126],[10,-133],[23,-128],[19,-115],[5,-114],[0,-118],[-5,-114],[-19,-115]],jiang?'#503969':choumo?'#b87735':'#194f45',ink);
      poly([[-18,-125],[-5,-123],[-8,-118],[-17,-119]],'#f7f3cc');poly([[18,-125],[5,-123],[8,-118],[17,-119]],'#f7f3cc');
      poly([[0,-145],[5,-137],[0,-130],[-5,-137]],silver);line([[-7,-105],[7,-105]],'#668c7d',2);
      if(jiang){poly([[-22,-136],[-31,-148],[-27,-125]],'#c7dced',ink);poly([[22,-136],[31,-148],[27,-125]],'#c7dced',ink);line([[-5,-138],[5,-138]],'#fcdef1',2);}
      if(choumo)poly([[-13,-144],[-15,-158],[-5,-150],[0,-166],[6,-149],[17,-154],[12,-143]],base,ink);
    }
    c.restore();heroSuitFinish(character,time);
    if(action==='delay'){oval(43,-143,14,14,'#fff1bd',ink);line([[43,-152],[43,-143],[50,-140]],'#8b5aa7',3);}
    if(action==='slime')oval(58,-64,10,9,'#b5e7a4','#529b7b');
    if(jiang&&character.skateTime>0){line([[-29,8],[-8,8]],'#83c9df',4);line([[8,8],[32,8]],'#83c9df',4);line([[-65,3],[-40,3]],'#b9eaf2',4);line([[-53,-6],[-35,-6]],'#b9eaf2',3);}
    if(choumo&&action==='kick')for(const[x,y,r]of[[99,-62,13],[119,-76,16],[132,-55,12]])oval(x,y,r,r,'#d5df9c88','#b4c37c');
    if(action==='cry')for(const side of [-1,1]){oval(side*15,-109,3,6,'#99dceb');oval(side*17,-93,3,5,'#99dceb');}
    if(action==='bug'){oval(11,-178,8,6,'#e3ad63',ink);oval(8,-180,2,2,'#fff5d9');oval(14,-180,2,2,'#fff5d9');line([[6,-184],[3,-189]],ink,1.5);line([[16,-184],[19,-189]],ink,1.5);}
    c.restore(); c = previousContext; return;
  }
  if (id === 'mebius') {
    for (const side of [-1, 1]) {
      if (side === 1 && character.action === 'kick') {
        line([[11,-52],[42,-42],[82,-59]], ink, 20);
        line([[11,-52],[42,-42],[82,-59]], silver, 16);
        box(73,-70,27,18,red,7,ink); continue;
      }
      const offset = side * walking;
      line([[side * 11, -52], [side * 15 + offset, -27], [side * 17 + offset, -5]], ink, 20);
      line([[side * 11, -52], [side * 15 + offset, -27], [side * 17 + offset, -5]], silver, 16);
      line([[side * 18, -48], [side * 23 + offset, -26], [side * 20 + offset, -10]], red, 4);
      box(side * 17 + offset - 12, -13, 25, 17, red, 7, ink);
    }
    box(-8, -108, 16, 20, red, 4);
    poly([[-25, -94], [-13, -100], [0, -94], [13, -100], [25, -94], [22, -68], [16, -48], [-16, -48], [-22, -68]], silver, ink);
    for (const side of [-1, 1]) poly([[side * 25, -94], [side * 15, -96], [side * 11, -84], [side * 5, -76], [side * 11, -61], [side * 10, -48], [side * 16, -48], [side * 22, -68]], red);
    poly([[-15, -97], [0, -89], [15, -97], [12, -85], [0, -78], [-12, -85]], red);
    if (character.action === 'punch') {
      line([[-23,-90],[-32,-68],[-22,-60]], ink, 16); line([[-23,-90],[-32,-68],[-22,-60]], silver, 12);
      line([[23,-90],[56,-78],[91,-78]], ink, 16); line([[23,-90],[56,-78],[91,-78]], silver, 12);
      oval(96,-78,11,9,red,ink);
    } else if (character.firing > 0 || character.action === 'weapon') {
      line([[-22, -90], [-25, -66], [22, -66]], ink, 16);
      line([[-22, -90], [-25, -66], [22, -66]], silver, 12);
      line([[22, -90], [31, -65], [47, -65]], ink, 16);
      line([[22, -90], [31, -65], [47, -65]], silver, 12);
      line([[-22, -90], [-25, -78]], red, 9);
      line([[22, -90], [28, -77]], red, 9);
      oval(47, -65, 8, 7, red); oval(51, -65, 12, 10, '#c0f8eb'); oval(52, -65, 6, 5, '#ffffec');
    } else {
      line([[-23, -90], [-32, -68], [-28, -48]], ink, 16);
      line([[-23, -90], [-32, -68], [-28, -48]], silver, 12);
      line([[23, -90], [32, -72], [42, -81]], ink, 16);
      line([[23, -90], [32, -72], [42, -81]], silver, 12);
      line([[-23, -90], [-30, -74]], red, 9); line([[23, -90], [29, -78]], red, 9);
      oval(-28, -48, 7, 8, red); oval(42, -81, 7, 7, red);
      poly([[-37, -70], [-27, -73], [-23, -55], [-33, -52]], '#e4be6b', ink);
      poly([[-33, -66], [-29, -68], [-26, -57], [-31, -56]], '#c2443c');
    }
    poly([[-8, -88], [0, -92], [8, -88], [0, -83]], '#69c7e1', '#627f7c');
    line([[-3, -88], [0, -89]], '#e6ffff', 2);
    c.save();c.translate(0,-102);c.scale(.86,.87);c.translate(0,102);
    poly([[-25, -136], [-17, -150], [-5, -154], [5, -154], [17, -150], [25, -136], [24, -121], [13, -107], [0, -102], [-13, -107], [-24, -121]], silver, ink);
    poly([[-5, -149], [0, -169], [5, -149], [3, -132], [-3, -132]], silver);
    line([[-6, -151], [-12, -143], [-7, -133]], red, 2.5);
    line([[6, -151], [12, -143], [7, -133]], red, 2.5);
    for (const side of [-1, 1]) {
      c.beginPath(); c.moveTo(side * 21, -133); c.quadraticCurveTo(side * 12, -137, side * 4, -127);
      c.quadraticCurveTo(side * 14, -119, side * 21, -133); c.fillStyle = '#fff4bd'; c.fill();
      c.strokeStyle = '#84998d'; c.lineWidth = 1.2; c.stroke();
    }
    line([[0, -131], [0, -119]], '#93a9a2', 1.5);
    poly([[-9, -116], [0, -114], [9, -116], [5, -109], [-5, -109]], '#a1b4ad');
    line([[-7, -115], [7, -115]], '#f2f3e7', 2);
    c.restore();heroSuitFinish(character,time);
    c.restore(); c = previousContext; return;
  }
  line([[-12, -47], [-15 - walking, -24], [-16 - walking, -4]], id === 'zero' ? red : suit, 21);
  line(character.action === 'kick' ? [[12,-47],[43,-41],[82,-58]] : [[12, -47], [16 + walking, -24], [18 + walking, -4]], id === 'zero' ? red : suit, 21);
  if (id !== 'seven') {
  line([[-17, -43], [-20 - walking, -23], [-21 - walking, -6]], '#b9cecb', 8);
  line(character.action === 'kick' ? [[17,-43],[45,-38],[83,-54]] : [[17, -43], [22 + walking, -23], [23 + walking, -6]], '#e1e7df', 8);
  }
  if (isRuebe) {
  line([[-19, -44], [-23 - walking, -23]], '#dcb25c', 3);
  line(character.action === 'kick' ? [[19,-44],[45,-38]] : [[19, -44], [25 + walking, -23]], '#ebc676', 3);
  }
  const boots = ['seven', 'zero'].includes(id) ? red : silver;
  box(-28 - walking, -14, 24, 18, boots, 7, ink);
  if (character.action === 'kick') box(73,-69,27,18,boots,7,ink);
  else box(7 + walking, -14, 26, 18, boots, 7, ink);
  box(-22, -87, 44, 47, suit, 13, ink);
  if (isRuebe) {
  poly([[-20, -66], [-10, -56], [0, -50], [10, -56], [20, -66], [15, -47], [0, -41], [-15, -47]], silver);
  poly([[-22, -79], [-12, -74], [0, -57], [12, -74], [22, -79], [21, -66], [0, -52], [-21, -66]], gold);
  poly([[-22, -84], [-7, -80], [-2, -66], [-16, -68], [-24, -75]], silver, ink);
  poly([[22, -84], [7, -80], [2, -66], [16, -68], [24, -75]], silver, ink);
  poly([[-19, -76], [-12, -73], [-12, -68], [-19, -71]], '#c64440');
  poly([[19, -76], [12, -73], [12, -68], [19, -71]], '#d9584a');
  } else if (id === 'seven') {
    poly([[-25, -85], [-15, -91], [-7, -84], [7, -84], [15, -91], [25, -85], [22, -71], [9, -71], [0, -64], [-9, -71], [-22, -71]], silver);
    for (let x = -18; x <= 18; x += 9) { box(x, -82, 5, 3, '#819990', 1); box(x, -76, 5, 3, '#819990', 1); }
    line([[-15, -66], [-10, -56], [-11, -43]], '#d6e2d8', 4); line([[15, -66], [10, -56], [11, -43]], '#d6e2d8', 4);
  } else if (id === 'zero') {
    poly([[-25, -87], [-11, -89], [0, -80], [11, -89], [25, -87], [24, -66], [10, -66], [0, -57], [-10, -66], [-24, -66]], silver, ink);
    line([[-19, -80], [-11, -76], [-6, -69]], '#849b96', 3); line([[19, -80], [11, -76], [6, -69]], '#849b96', 3);
    poly([[-18, -60], [0, -49], [18, -60], [12, -43], [-12, -43]], red);
  } else if (id === 'geed') {
    poly([[-23, -84], [-14, -89], [0, -78], [14, -89], [23, -84], [17, -64], [0, -54], [-17, -64]], red, ink);
    poly([[-18, -83], [-6, -79], [0, -71], [6, -79], [18, -83], [13, -68], [0, -62], [-13, -68]], silver);
    poly([[-19, -59], [0, -50], [19, -59], [0, -39]], silver);
    line([[-20, -57], [-17, -44]], red, 5); line([[20, -57], [17, -44]], red, 5);
  } else {
    poly([[-23, -85], [-12, -91], [0, -83], [12, -91], [23, -85], [19, -66], [7, -63], [0, -72], [-7, -63], [-19, -66]], silver, ink);
    poly([[-16, -85], [0, -80], [16, -85], [13, -77], [0, -72], [-13, -77]], '#a94d43', ink);
    poly([[-19, -57], [-8, -62], [0, -50], [8, -62], [19, -57], [9, -41], [-9, -41]], silver);
    for (let y = -64; y < -57; y += 3) line([[-19, y], [-9, y + 1]], '#b8cfca', 1);
  }
  if (character.action === 'punch') {
    line([[-20,-76],[-31,-54],[-20,-57]], suit,17); line([[-31,-54],[-20,-57]],id==='seven'?red:silver,12);
    line([[20,-76],[57,-73],[92,-73]],suit,17); line([[57,-73],[92,-73]],id==='seven'?red:silver,12);
    oval(97,-73,11,9,id==='seven'?red:silver,ink);
  } else if (character.firing > 0 || character.action === 'weapon') {
    line([[-17, -76], [-24, -61], [21, -66]], ink, 16);
    line([[-24, -61], [21, -66]], silver, 11);
    line([[16, -77], [32, -65], [47, -65]], ink, 15);
    line([[32, -65], [47, -65]], silver, 11);
    line([[37, -71], [37, -59]], isRuebe ? '#e6bc69' : suit, 4);
    oval(48, -65, 14, 11, '#c0f8eb'); oval(49, -65, 8, 6, '#ffffec');
  } else {
    line([[-20, -76], [-31, -54], [-25, -43]], suit, 17); line([[-31, -56], [-25, -43]], id === 'seven' ? red : silver, 12);
    line([[20, -76], [30, -59], [40, -69]], suit, 17); line([[30, -59], [40, -69]], id === 'seven' ? red : silver, 12);
    if (isRuebe) { line([[-31, -49], [-23, -53]], '#e6bc69', 4); line([[31, -67], [39, -60]], '#e6bc69', 4); }
    if (id === 'nexus') { poly([[-36, -60], [-25, -52], [-21, -41], [-32, -44]], silver, ink); line([[-33, -54], [-27, -47]], red, 3); }
    if (id === 'seven') {
      line([[-22, -78], [-31, -58], [-25, -43]], '#973f38', 15); line([[-22, -78], [-31, -58], [-25, -43]], red, 11);
      line([[22, -78], [30, -61], [40, -69]], '#973f38', 15); line([[22, -78], [30, -61], [40, -69]], red, 11);
    }
  }
  if (isRuebe) {
  poly([[-19, -82], [-30, -75], [-37, -93], [-20, -87]], gold, ink);
  poly([[19, -82], [30, -75], [37, -93], [20, -87]], gold, ink);
  poly([[0, -89], [14, -80], [11, -67], [0, -58], [-11, -67], [-14, -80]], gold, ink);
  oval(0, -76, 9, 10, silver, '#ba9045'); oval(0, -76, 6, 7, '#59bed9', ink); oval(-2, -79, 2, 3, '#d9ffff');
  c.save();c.translate(0,-90);c.scale(.86,.87);c.translate(0,90);
  poly([[-22, -127], [-14, -139], [14, -139], [24, -125], [22, -106], [12, -91], [0, -87], [-13, -93], [-24, -109]], silver, ink);
  poly([[-26, -118], [-18, -111], [-16, -97], [-27, -106]], '#e0e8e1', ink);
  poly([[26, -118], [18, -111], [16, -97], [27, -106]], '#e0e8e1', ink);
  poly([[-20, -116], [-4, -110], [-7, -103], [-17, -104]], '#e9ffed', ink);
  poly([[4, -110], [20, -116], [17, -104], [7, -103]], '#e9ffed', ink);
  poly([[-30, -148], [-17, -135], [0, -117], [17, -135], [30, -148], [25, -126], [0, -106], [-25, -126]], gold, ink);
  poly([[-13, -138], [-8, -141], [-5, -123], [0, -115], [5, -123], [8, -141], [13, -138], [10, -124], [0, -112], [-10, -124]], '#303c3c');
  poly([[-4, -137], [0, -164], [5, -145], [5, -127], [0, -115], [-5, -127]], silver, ink);
  line([[0, -105], [0, -100]], '#839996', 2);
  poly([[-9, -98], [0, -96], [9, -98], [5, -92], [-5, -92]], '#91a7a3');
  line([[-6, -97], [6, -97]], '#f3f5e7', 2);
  } else {
    if (id !== 'seven' && id !== 'nexus') {
      const timer = [[-6, -78], [0, -82], [6, -78], [5, -68], [-5, -68]];
      poly(timer, '#68cbe3', ink); line([[-2, -78], [-2, -74]], '#e9ffef', 2);
    }
    c.save();c.translate(0,-90);c.scale(.86,.87);c.translate(0,90);
    const crown = -137;
    if (id === 'nexus') {
      poly([[-19, -124], [-12, crown], [0, crown - 4], [12, crown], [19, -124], [18, -107], [9, -94], [0, -90], [-9, -94], [-18, -107]], silver, ink);
    } else poly([[-23, -124], [-12, crown], [0, crown - 3], [13, crown], [24, -124], [22, -106], [11, -92], [0, -89], [-12, -94], [-23, -109]], silver, ink);
    if (id === 'seven') {
      oval(0, -117, 22, 27, silver, ink);
      box(-25, -119, 6, 19, silver, 3, ink); box(19, -119, 6, 19, silver, 3, ink);
      poly([[-4, -140], [-2, -159], [3, -157], [5, -137], [3, -126], [-3, -126]], silver, ink);
      oval(0, -123, 3, 4, '#79c99f', '#718c80');
      poly([[-19, -118], [-5, -116], [-5, -109], [-16, -108], [-20, -112]], '#ffeaa7');
      poly([[19, -118], [5, -116], [5, -109], [16, -108], [20, -112]], '#ffeaa7');
      line([[-19, -119], [-5, -117]], '#81958b', 1.5); line([[19, -119], [5, -117]], '#81958b', 1.5);
      line([[-10, -136], [-10, -130]], '#718b85', 2); line([[10, -136], [10, -130]], '#718b85', 2);
      line([[-8, -128], [-8, -125]], '#718b85', 1); line([[8, -128], [8, -125]], '#718b85', 1);
    } else if (id === 'zero') {
      poly([[-23, -125], [-29, -153], [-17, -142], [-10, -130], [-12, -119]], silver, ink);
      poly([[23, -125], [29, -153], [17, -142], [10, -130], [12, -119]], silver, ink);
      poly([[-22, -118], [-5, -114], [-7, -104], [-18, -105]], '#ffe8a0', ink);
      poly([[5, -114], [22, -118], [18, -105], [7, -104]], '#ffe8a0', ink);
      oval(0, -122, 3, 5, '#96e2c7', ink);
      line([[-14, -140], [-18, -133]], '#89a3a0', 2); line([[14, -140], [18, -133]], '#89a3a0', 2);
    } else if (id === 'geed') {
      poly([[-5, -135], [0, -159], [7, -139], [4, -110], [-4, -110]], silver, ink);
      poly([[-23, -129], [-17, -111], [-5, -104], [-7, -118]], '#84dcf1', ink);
      poly([[23, -129], [17, -111], [5, -104], [7, -118]], '#84dcf1', ink);
      line([[-24, -119], [-19, -104], [-14, -98]], '#758d8b', 3); line([[24, -119], [19, -104], [14, -98]], '#758d8b', 3);
    } else {
      poly([[-19, -127], [-24, -112], [-19, -104], [-17, -117]], '#303e3d');
      poly([[19, -127], [24, -112], [19, -104], [17, -117]], '#303e3d');
      poly([[-6, -134], [0, -155], [6, -134], [3, -115], [-3, -115]], silver);
      line([[0, -150], [0, -126]], '#f4f4e8', 2);
      poly([[-17, -119], [-4, -116], [-7, -110], [-15, -111]], '#fff2bd');
      poly([[17, -119], [4, -116], [7, -110], [15, -111]], '#fff2bd');
      line([[-17, -120], [-5, -117]], '#718b83', 1.5); line([[17, -120], [5, -117]], '#718b83', 1.5);
      for (const x of [-12, 12]) oval(x, -132, 1.6, 3, '#cba85e');
      line([[-7, -103], [0, -106], [7, -103]], '#768d87', 1.5);
    }
    poly([[-8, -100], [0, -98], [8, -100], [4, -93], [-4, -93]], '#91a7a3');
    line([[-6, -99], [6, -99]], '#f3f5e7', 2);
  }
  c.restore();heroSuitFinish(character,time);
  c.restore(); c = previousContext;
}
export function monster(enemy, time, playerX, context = ctx) {
  const previousContext = c; c = context;
  const ink = '#26313a';
  const id = enemy.id, info = ENEMIES[id];
  if (id === 'shumo') {
    c.save();c.translate(enemy.x,512);c.scale(playerX<enemy.x?-1:1,1);
    if(enemy.slipTime>0)c.rotate(-0.85);c.translate(0,-512);
    hero({id:'choumo',x:0,dir:1,moving:enemy.charge===0&&!(enemy.pauseTime>0),firing:0,invincible:enemy.hit>0?0.1:0,action:enemy.charge>0?'weapon':''},time,c);
    c.restore();c=previousContext;return;
  }
  const color = enemy.hit > 0 ? '#d3cfb6' : metalSurface(-39,-105,43,-50,'#626a70',info.color,info.color);
  const facingX=id==='wukong'&&enemy.spell==='staff'&&(enemy.charge>0||enemy.skillEffectTime>0)?enemy.targetX:playerX;
  c.save(); c.translate(enemy.x, 512); c.scale(facingX < enemy.x ? -1 : 1, 1);
  oval(0, 3, 43, 10, '#6d755b33');
  c.scale(id==='belial'?.86:1,id==='empera'||id==='belial'?1.12:1.04);
  if (enemy.slipTime > 0) { c.rotate(-0.85); }
  if (!reduceMotion) c.translate(0, Math.sin(time * 6) * 1.5);
  if(id==='wukong'){
    if(enemy.burrowTime>0){
      oval(0,3,45,10,'#a6895b',ink);for(const[x,y]of[[-35,-9],[-12,-14],[18,-10],[38,-5]])oval(x,y,9,6,'#c6aa7e');
      c.restore();c=previousContext;return;
    }
    if(enemy.flightTime>0){c.translate(0,-Math.sin(Math.PI*(1-enemy.flightTime/1.2))*150);for(const x of [-32,-15,5,24])oval(x,4,23,11,'#f1edd6','#aabdb2');}
    if(enemy.formTime>0&&enemy.form==='tiger'){
      oval(-15,-41,45,27,'#daa246',ink);for(const x of [-39,-12,15])box(x,-31,15,28,'#daa246',5,ink);
      line([[-49,-45],[-69,-66],[-78,-50]],'#daa246',9);oval(30,-66,27,26,'#daa246',ink);
      oval(13,-88,9,10,'#daa246',ink);oval(45,-88,9,10,'#daa246',ink);oval(36,-56,17,12,'#f4dfb8',ink);
      oval(24,-72,4,5,ink);oval(42,-72,4,5,ink);poly([[29,-59],[38,-59],[34,-54]],ink);
      for(const x of [-30,-10,10])line([[x,-64],[x+4,-45]],'#78583c',5);line([[22,-89],[31,-81],[40,-89]],'#78583c',4);
    }else if(enemy.formTime>0&&enemy.form==='eagle'){
      c.translate(0,-65);poly([[-11,-83],[-78,-125],[-56,-70],[-18,-44]],'#a97b47',ink);poly([[11,-83],[78,-125],[56,-70],[18,-44]],'#a97b47',ink);
      oval(0,-67,23,36,'#ddbd79',ink);oval(6,-106,20,19,'#eee1bb',ink);poly([[20,-109],[39,-99],[18,-96]],'#d8a13f',ink);
      oval(12,-111,4,5,ink);line([[-11,-37],[-15,-22]],'#d4a74e',5);line([[11,-37],[16,-22]],'#d4a74e',5);
    }else{
      if(enemy.formTime>0&&enemy.form==='ape')c.scale(1.32,1.16);
      poly([[-21,-104],[-48,-14],[-19,-24],[4,-13],[30,-23],[43,-18],[23,-104]],'#ba5241',ink);
      for(const s of [-1,1]){line([[s*13,-49],[s*18,-26],[s*22,-9]],'#856b46',20);box(s*22-14,-16,29,17,'#d6ab4d',5,ink);}
      box(-27,-100,54,59,'#d8ad50',13,ink);poly([[-24,-95],[0,-78],[24,-95],[18,-76],[0,-61],[-18,-76]],'#f2d68d',ink);box(-24,-49,48,11,'#9c3f35',4,ink);
      line([[-25,-91],[-39,-66],[-31,-48]],'#a7834c',17);line([[25,-91],[41,-72],[49,-67]],'#a7834c',17);
      oval(-27,-124,12,13,'#bc9257',ink);oval(27,-124,12,13,'#bc9257',ink);oval(0,-126,27,29,'#bc9257',ink);
      poly([[-21,-133],[-11,-142],[0,-134],[11,-142],[21,-133],[18,-111],[0,-101],[-18,-111]],'#f1d5a0',ink);
      line([[-18,-130],[-7,-126]],'#6b5137',4);line([[7,-126],[18,-130]],'#6b5137',4);oval(-10,-123,3,4,ink);oval(10,-123,3,4,ink);
      line([[-8,-111],[0,-107],[9,-112]],'#8f583a',2);line([[-25,-143],[0,-149],[25,-143]],'#e9c24f',7);
      for(const s of [-1,1]) {
        c.beginPath();c.moveTo(s*9,-149);c.bezierCurveTo(s*10,-193,s*40,-211,s*44,-178);c.strokeStyle='#a83938';c.lineWidth=3;c.stroke();
        for(let j=0;j<5;j++)line([[s*(20+j*4),-187-j*.6],[s*(27+j*3),-179-j*.3]],'#dfa660',1);
      }
      for(const s of [-1,1]) {
        poly([[s*3,-91],[s*19,-102],[s*29,-94],[s*22,-82],[s*10,-79]],metalSurface(-25,-100,29,-80,'#916221','#fff0b0','#d4a24a'),ink);
        line([[s*9,-89],[s*21,-94]],'#fff0ae',1.5);
        for(let y=-73;y<-55;y+=5)line([[s*3,y],[s*15,y-4],[s*20,y-8]],'#9b6c2f',1);
        poly([[s*15,-39],[s*25,-36],[s*28,-17],[s*15,-18]],'#8d322f',ink);
        line([[s*18,-34],[s*22,-21]],'#efc45f',2);
        for(let j=0;j<3;j++)line([[s*(20+j*2),-138],[s*(25+j*2),-130]],'#885936',1.2);
      }
      oval(0,-45,7,7,'#eccb6a',ink);poly([[0,-49],[4,-45],[0,-41],[-4,-45]],'#aa4940');
      line([[-5,-120],[0,-115],[5,-120]],'#a87a50',1.5);
      const striking=enemy.spell==='staff'&&enemy.skillEffectTime>0;
      const ends=striking?[[15,-65],[230,-65]]:[[48,-8],[48,-164]];
      line(ends,'#874437',9);for(const [x,y]of ends)oval(x,y,striking?15:6,striking?6:16,'#f1ce67',ink);
      line(ends,'#d18555',2);for(const [x,y]of ends) {
        if(striking)for(let j=-7;j<=7;j+=7)line([[x+j,y-4],[x+j,y+4]],'#96702b',1);
        else for(let j=-9;j<=9;j+=6)line([[x-4,y+j],[x+4,y+j]],'#96702b',1);
      }
    }
    c.restore();c=previousContext;return;
  }
  if(id==='buniu'){
    oval(-20,-7,18,10,'#776d62',ink);oval(20,-7,18,10,'#776d62',ink);oval(0,-58,37,50,color,ink);
    for(const[x,y]of[[-17,-76],[18,-51],[-11,-30]])oval(x,y,10,13,'#a59685');
    line([[-29,-87],[-43,-58]],color,18);line([[29,-87],[43,-58]],color,18);
    oval(-29,-131,17,10,color,ink);oval(29,-131,17,10,color,ink);
    for(const s of [-1,1])poly([[s*16,-139],[s*23,-161],[s*30,-151],[s*26,-133]],'#d8bc86',ink);
    oval(0,-117,31,30,color,ink);oval(0,-104,24,15,'#d5b49f',ink);
    oval(-11,-126,4,6,ink);oval(11,-126,4,6,ink);oval(-10,-104,3,3,ink);oval(10,-104,3,3,ink);
    c.setLineDash([4,4]);line([[0,-82],[0,-25]],'#9d8f7d',2);c.setLineDash([]);
    box(-11,-68,22,13,'#90b7a0',3,ink);line([[-10,-62],[10,-62]],'#e8ead6',2);
    for(const s of [-1,1]) {line([[s*13,-138],[s*18,-145]],'#fff1c9',1.5);oval(s*10,-128,1,1.5,'#fff');line([[s*19,-85],[s*25,-67]],'#f8ead0',1.5);}
    c.restore();c=previousContext;return;
  }
  if(id==='tangseng'){
    oval(-16,-7,16,9,'#70574a',ink);oval(16,-7,16,9,'#70574a',ink);
    poly([[-27,-100],[24,-100],[38,-12],[-35,-12]],'#e4b85f',ink);
    poly([[-27,-100],[8,-98],[32,-18],[-19,-18]],'#bc624b',ink);
    for(let y=-82;y<-20;y+=18)line([[-22,y],[22,y]],'#edbf78',2);
    line([[-7,-96],[13,-20]],'#edbf78',2);line([[-25,-84],[-42,-60]],'#e4b85f',16);line([[24,-85],[43,-62]],'#e4b85f',16);
    oval(0,-123,25,28,'#edd4aa',ink);box(-26,-151,52,13,'#d6ad4f',4,ink);
    for(const s of [-1,0,1])poly([[s*17-10,-150],[s*17,-173+(s===0?-5:0)],[s*17+10,-150]],'#e4c16c',ink);
    for(const s of [-1,0,1]) {oval(s*17,-157,4,6,'#b94e48',ink);line([[s*17-5,-151],[s*17,-168],[s*17+5,-151]],'#fff0bd',1);}
    for(let y=-82;y<-25;y+=18)for(let x=-17;x<20;x+=14)oval(x+(Math.floor(y/18)%2?5:0),y,1.5,1.5,'#f5dda1');
    line([[-20,-69],[-24,-25]],'#8f493d',2);line([[24,-62],[29,-23]],'#fff0b0',1.5);
    line([[-15,-126],[-7,-126]],ink,2);line([[7,-126],[15,-126]],ink,2);line([[-7,-111],[0,-108],[7,-111]],ink,2);
    line([[44,-8],[44,-154]],'#96713f',6);oval(44,-161,14,17,'#e6c96f',ink);oval(44,-161,7,10,'#f7edc4',ink);
    for(const s of [-1,1])for(let j=0;j<3;j++)oval(44+s*(10+j*2),-163+j*7,3,5,'#e6c96f','#946e32');
    if(enemy.shieldTime>0)oval(0,-83,61,102,'#f8e6a144','#daba60');
    c.restore();c=previousContext;return;
  }
  if (id === 'grandma') {
    poly([[-22,-23],[-61,-37],[-48,-9],[-22,-4]],color,ink);
    oval(-20,-7,19,10,'#758c9a',ink);oval(20,-7,19,10,'#758c9a',ink);
    oval(0,-58,38,51,color,ink);
    for(const [x,y] of [[-20,-53],[18,-67],[-11,-34],[19,-31]])oval(x,y,5,7,'#d0bbd7');
    line([[-28,-88],[-44,-67],[-34,-46]],color,18);line([[29,-87],[45,-70],[43,-43]],color,18);
    oval(0,-119,32,30,color,ink);oval(-31,-125,10,15,color,ink);oval(31,-125,10,15,color,ink);
    oval(0,-154,17,14,'#eee9dc',ink);
    for(const x of [-20,-10,0,10,20])oval(x,-143-Math.abs(x)*0.15,9,9,'#eee9dc');
    oval(-13,-121,12,11,'#f0f1d5','#4d6163');oval(13,-121,12,11,'#f0f1d5','#4d6163');
    line([[-2,-122],[2,-122]],'#4d6163',3);oval(-12,-121,3,4,'#43534e');oval(14,-121,3,4,'#43534e');
    line([[-8,-105],[0,-101],[9,-105]],'#765373',2);
    box(-31,-97,62,14,'#dd8e65',6,ink);box(14,-88,13,31,'#dd8e65',4,ink);
    for(let y=-82;y<-59;y+=7)line([[15,y],[26,y]],'#f2c795',2);
    box(33,-48,24,28,'#a77b54',6,ink);
    for(let y=-43;y<-23;y+=5)line([[36,y],[54,y]],'#d6ad79',1);
    for(let x=38;x<55;x+=5)line([[x,-45],[x,-23]],'#815f49',1);
    for(const s of [-1,1]) {line([[s*8,-108],[s*17,-107]],'#8e7899',1);line([[s*23,-115],[s*27,-113]],'#8e7899',1);}
    c.restore();c=previousContext;return;
  }
  if (id === 'empera') {
    poly([[-30, -109], [-61, -3], [-31, -14], [-15, 0], [15, 0], [35, -16], [59, -3], [31, -109]], '#30313b', ink);
    line([[-28, -94], [-43, -20]], '#686475', 4); line([[28, -94], [43, -20]], '#686475', 4);
  }
  if (['gomora', 'tyrant'].includes(id)) poly([[-21, -22], [-70, -36], [-55, -9], [-19, -1]], color, ink);
  oval(-18, -7, 18, 10, color, ink); oval(19, -7, 18, 10, color, ink);
  if (['empera', 'belial', 'baltan', 'kingjoe', 'zetton'].includes(id)) {
    box(-27, -57, 20, 49, color, 8, ink); box(8, -57, 20, 49, color, 8, ink);
    box(-31, -113, 62, 65, color, 19, ink);
  } else oval(0, -54, 36, 49, color, ink);
  if (id !== 'baltan' && id !== 'bemstar') {
    line([[-28, -93], [-41, -70], [-34, -48]], color, 19);
    line([[28, -93], [43, -74], [38, -51]], color, 19);
  }
  if (id === 'empera') {
    poly([[-32, -108], [-50, -131], [-38, -103], [-29, -90], [-18, -103]], '#565466', ink);
    poly([[32, -108], [50, -131], [38, -103], [29, -90], [18, -103]], '#565466', ink);
    for (let y = -101; y < -54; y += 12) line([[-23, y], [0, y + 9], [23, y]], '#85808c', 3);
    poly([[-20, -133], [-27, -154], [-10, -143], [0, -170], [10, -143], [27, -154], [20, -132], [26, -119], [15, -108], [-15, -108], [-26, -119]], color, ink);
    line([[0, -155], [-8, -132], [0, -111], [8, -132], [0, -155]], '#85808c', 3);
    line([[-19, -130], [-10, -127]], '#e8b85d', 3); line([[10, -127], [19, -130]], '#e8b85d', 3);
  } else if (id === 'belial') {
    poly([[-28, -108], [-9, -101], [0, -79], [9, -101], [28, -108], [21, -82], [0, -66], [-21, -82]], '#b54946');
    line([[-21, -60], [-17, -17]], '#c6504a', 6); line([[21, -60], [18, -17]], '#c6504a', 6);
    poly([[-23, -135], [-15, -148], [-3, -153], [0, -172], [12, -150], [25, -135], [21, -117], [0, -108], [-21, -117]], color, ink);
    poly([[-22, -144], [-15, -128], [-4, -124], [-6, -137]], '#f0a658', ink);
    poly([[22, -144], [15, -128], [4, -124], [6, -137]], '#f0a658', ink);
    line([[-13, -117], [0, -120], [13, -117]], '#c8524b', 3);
    oval(0, -94, 5, 8, '#b75b87', ink);
    line([[42, -33], [48, -143]], '#4c5158', 9);
    box(39, -159, 20, 34, '#434951', 4, ink); box(35, -46, 20, 32, '#434951', 4, ink);
    for (let y = -151; y < -127; y += 8) line([[43, y], [54, y]], '#8c8983', 3);
  } else if (id === 'kingjoe') {
    box(-27, -108, 54, 60, color, 12, ink);
    box(-23, -99, 19, 29, '#555747', 5); box(4, -99, 19, 29, '#555747', 5);
    for (let y = -95; y < -72; y += 7) for (let x = -19; x <= 15; x += 8) oval(x, y, 2, 2, '#f6cd77');
    box(-24, -141, 48, 32, color, 9, ink); box(-17, -133, 34, 12, '#f6e4ba', 4, ink);
    for (let x = -12; x < 15; x += 6) line([[x, -130], [x, -125]], '#89886a', 2);
    for (const sign of [-1, 1]) { oval(sign * 34, -109, 15, 17, color, ink); line([[sign * 36, -119], [sign * 48, -129]], '#8b947e', 5); }
    line([[-8, -142], [-10, -153]], '#8b947e', 3); line([[8, -142], [10, -153]], '#8b947e', 3);
  } else if (id === 'zetton') {
    oval(-14, -89, 10, 19, '#edb35e', ink); oval(14, -89, 10, 19, '#edb35e', ink);
    oval(0, -133, 22, 26, color, ink); box(-5, -151, 10, 36, '#edb35e', 5);
    poly([[-15, -149], [-24, -174], [-29, -164], [-33, -154], [-22, -158]], '#e1dec8', ink);
    poly([[15, -149], [24, -174], [29, -164], [33, -154], [22, -158]], '#e1dec8', ink);
    for (let y = -49; y < -13; y += 7) { line([[-25, y], [-8, y]], '#c5d0c3', 3); line([[8, y], [25, y]], '#c5d0c3', 3); }
    oval(-35, -103, 11, 13, '#d4d8c6', ink); oval(35, -103, 11, 13, '#d4d8c6', ink);
  } else if (id === 'baltan') {
    poly([[-21, -126], [-10, -153], [0, -141], [10, -153], [21, -126], [15, -110], [-15, -110]], color, ink);
    oval(-11, -127, 7, 10, '#eab471', ink); oval(11, -127, 7, 10, '#eab471', ink);
    line([[-8, -145], [-16, -169]], ink, 3); line([[8, -145], [16, -169]], ink, 3);
    for (let y = -100; y < -52; y += 10) line([[-19, y], [0, y + 7], [19, y]], '#b5cfcc', 3);
    for (const sign of [-1, 1]) {
      line([[sign * 27, -102], [sign * 42, -82]], color, 14);
      poly([[sign * 39, -78], [sign * 56, -77], [sign * 64, -111], [sign * 51, -97], [sign * 43, -123], [sign * 34, -103]], '#c4d7cf', ink);
    }
  } else if (id === 'bemstar') {
    poly([[-27, -100], [-57, -59], [-69, -13], [-39, -35], [-23, -63]], '#727c6e', ink);
    poly([[27, -100], [57, -59], [69, -13], [39, -35], [23, -63]], '#727c6e', ink);
    oval(0, -111, 28, 30, color, ink); poly([[-7, -137], [0, -160], [7, -137]], '#e1c57d', ink);
    oval(-11, -115, 7, 8, '#e7bc75', ink); oval(11, -115, 7, 8, '#e7bc75', ink);
    poly([[-11, -102], [0, -90], [11, -102]], '#e7bc75', ink);
    poly([[0, -83], [23, -65], [15, -38], [-15, -38], [-23, -65]], '#525f51', ink);
    line([[-11, -65], [0, -74], [11, -65], [6, -50], [-6, -50], [-11, -65]], '#c0b56e', 4);
  } else {
    const headY = -118;
    oval(0, headY, 28, 25, color, ink);
    if (id === 'gomora') {
      poly([[-19, -132], [-42, -154], [-39, -133], [-25, -119]], '#f4d9a1', ink);
      poly([[19, -132], [42, -154], [39, -133], [25, -119]], '#f4d9a1', ink);
      poly([[-4, -128], [0, -146], [7, -128]], '#f4d9a1', ink);
      for (let y = -89; y < -24; y += 12) for (let x = -19; x <= 19; x += 12) poly([[x, y], [x + 4, y - 6], [x + 8, y]], '#d8bd8b');
    } else {
      poly([[-22, -131], [-46, -147], [-39, -115], [-25, -109]], color, ink);
      poly([[22, -131], [46, -147], [39, -115], [25, -109]], color, ink);
      poly([[-12, -137], [-16, -161], [-2, -140], [14, -161], [12, -135]], '#e1d8ad', ink);
      for (let y = -99; y < -42; y += 17) poly([[-30, y], [-47, y - 11], [-38, y + 7]], '#d6d8b9', ink);
      poly([[-39, -61], [-58, -57], [-65, -35], [-51, -42], [-40, -45]], '#d9dfce', ink);
      oval(43, -52, 17, 18, color, ink);
      for (const [x, y] of [[43, -72], [61, -51], [42, -32]]) poly([[x - 6, y], [x, y - 12], [x + 6, y]], '#d9dfce', ink);
      poly([[0, -84], [20, -69], [13, -42], [-13, -42], [-20, -69]], '#6e7d70', ink);
    }
    {
      oval(-10, headY - 3, 6, 7, '#fff0c5', ink); oval(11, headY - 3, 6, 7, '#fff0c5', ink);
      oval(-8, headY - 2, 2, 3, ink); oval(13, headY - 2, 2, 3, ink);
      line([[-10, headY + 13], [0, headY + 16], [10, headY + 13]], ink, 2);
    }
  }
  monsterSurfaceDetails(id);
  c.restore();
  if (enemy.hp !== undefined) {
    label(info.name, enemy.x, 313, 15);
    box(enemy.x - 45, 323, 90, 9, '#fff3d0', 4, ink);
    box(enemy.x - 43, 325, 86 * enemy.hp / info.hp, 5, '#d56e4e', 2);
  }
  c = previousContext;
}

export const heroNames = { ruebe: '罗布', seven: '赛文', zero: '赛罗', geed: '捷德', mebius: '梦比优斯', nexus: '奈克瑟斯', tregear: '托雷吉亚', zhuqingqing: '朱青青', noa:'诺亚', jiangshuyan:'蒋书妍', taro:'泰罗', choumo:'臭墨' };
const heroTitle = id => heroNames[id] + (['zhuqingqing','jiangshuyan','choumo'].includes(id) ? '' : '奥特曼');
let selectedHero = 'ruebe';
let selectedEnemy = 'empera';
let game = createGame(selectedHero, selectedEnemy); game.status = 'ready';
const keys = new Set();
const pointers = new Map();
const keyActions = { ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right', Space: 'fire', KeyJ: 'fire', KeyZ: 'punch', KeyX: 'kick', KeyC: 'weapon' };
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const message = document.querySelector('#message');
const title = document.querySelector('#message-title');
const messageText = document.querySelector('#message-text');
const start = document.querySelector('#start');
const health = document.querySelector('#health');
const score = document.querySelector('#score');
const announcement = document.querySelector('#announcement');
let lastHp = -1, lastEnemyHp = -1, lastCooldown = 0, lastAction = 0, lastWarning = 0;
const weatherChoice = document.querySelector('#weather');
function applyWeather() {
  game.weather = chooseWeather(weatherChoice.value); game.weatherStartedAt = game.time;
  document.querySelector('#weather-current').textContent = '本局：'+WEATHER_NAMES[game.weather];
}
weatherChoice.addEventListener('change',applyWeather);

function clearInput() {
  keys.clear(); pointers.clear();
  game.hero.moveTarget = null;
  document.querySelectorAll('.held').forEach(button => button.classList.remove('held'));
}
function restart() {
  void audio.resume();
  lastHp = lastEnemyHp = -1; lastCooldown = 0;
  lastAction = lastWarning = 0;
  clearInput(); game = createGame(selectedHero, selectedEnemy); message.hidden = true;
  applyWeather();
  document.querySelector('.arcade').classList.remove('enemies-open');
  document.querySelector('#enemy-toggle').setAttribute('aria-expanded','false');
  announcement.textContent = `游戏开始。击退${ENEMIES[selectedEnemy].name}，守护小卖部！`;
  updateStatus();
}
function ready() {
  lastHp = lastEnemyHp = -1; lastCooldown = 0;
  lastAction = lastWarning = 0;
  clearInput(); game = createGame(selectedHero, selectedEnemy); game.status = 'ready';
  applyWeather();
  const name = heroTitle(selectedHero);
  document.querySelectorAll('[data-hero]').forEach(item => item.setAttribute('aria-pressed', String(item.dataset.hero === selectedHero)));
  document.querySelectorAll('[data-enemy]').forEach(item => item.setAttribute('aria-pressed', String(item.dataset.enemy === selectedEnemy)));
  document.querySelector('#hero-name').textContent = name;
  document.querySelector('#opponent-name').textContent = ENEMIES[selectedEnemy].name;
  document.title = name + ' · 小卖部保卫战';
  canvas.setAttribute('aria-label', `${name}在小卖部门口迎战${ENEMIES[selectedEnemy].name}。点击地面移动，点击下方按钮攻击。`);
  document.querySelector('#message-icon').textContent = '✦';
  title.textContent = heroNames[selectedHero] + '，出发吧！';
  messageText.textContent = '怪兽来捣乱啦！守护小卖部，让店铺安心营业。' + (selectedHero === 'jiangshuyan' ? '拖延作业暂停、黏液减速、滑冰躲避；点地面移动。' : selectedHero === 'choumo' ? '眼泪水花滑倒、臭脚丫击退、头顶发射小虫；点地面移动。' : '点地面移动，点按钮出招；红色预警时快躲开。');
  start.innerHTML = '开始守护 <span>→</span>'; message.hidden = false; updateStatus();
}
function updateStatus() {
  if (game.actionSerial > lastAction) audio.effect(game.hero.action);
  if (game.warnings > lastWarning) audio.effect('warning');
  lastAction = game.actionSerial; lastWarning = game.warnings;
  const special=game.hero.id==='noa'||game.hero.id==='ruebe';
  const skills = game.hero.id === 'noa'
    ? [['fire','','诺亚之翼','6秒冷却','展开光翼保护1.2秒，近身击退'],['punch','','闪现','3.5秒冷却','沿朝向瞬移210距离，保护0.35秒'],['kick','','雷电','2秒冷却','前方480距离落雷，伤害3'],['weapon','','头标','1秒冷却','头顶发射光标，伤害2']]
    : game.hero.id === 'ruebe'
    ? [['fire','','变身萝卜','7秒冷却','变成卡通萝卜并保护2.2秒，到时恢复'],['punch','','萝卜刀','0.9秒冷却','召唤萝卜刀当武器，前方165范围挥砍伤害3'],['kick','','头波','0.8秒冷却','头顶发射光标，伤害2'],['weapon','','定身','5秒冷却','前方发射定身光环，命中伤害1并暂停1.3秒']]
    : game.hero.id === 'jiangshuyan'
    ? [['punch','Z','拖延作业','7秒冷却','暂停怪兽行动和蓄力1.5秒；已发出的光弹继续飞行'],['kick','X','流鼻涕','1.4秒冷却','卡通黏液弹伤害1，命中后移速降至45%，持续2.5秒'],['weapon','C','滑冰','2.8秒冷却','面向的方向滑行0.32秒，约208距离，无无敌效果']]
    : game.hero.id === 'choumo'
    ? [['punch','Z','眼泪水花','5秒冷却','眼部向前喷射300距离，命中伤害1并滑倒0.9秒'],['kick','X','臭脚丫','1.1秒冷却','前方145范围伤害2并击退180'],['weapon','C','发射臭虫','2.4秒冷却','从头顶发射卡通小虫，直线前进，伤害2']]
    : [['punch','Z','快拳','近身','近身快拳'],['kick','X','踢腿','击退','踢腿击退'],['weapon','C','能量飞刃','2.4秒冷却','能量飞刃']];
  for (const [kind, key, name, hint, description] of skills) {
    const button = document.querySelector(`[data-action=${kind}]`), remaining = game.hero[kind==='fire'?'cooldown':kind + 'Cooldown'];
    button.firstChild.textContent = name; button.title = description;
    button.setAttribute('aria-label', special||['jiangshuyan','choumo'].includes(game.hero.id) ? name : description);
    button.classList.toggle('long-label', name.length >= 3 && (special||['jiangshuyan','choumo'].includes(game.hero.id)));
    button.classList.toggle('cooling', remaining > 0);
    button.querySelector('small').textContent = remaining > 0 ? `${remaining.toFixed(1)}秒` : hint;
  }
  if(!special){const fire=document.querySelector('[data-action=fire]');fire.firstChild.textContent='✦ 光线 ';fire.querySelector('small').textContent='按住连续发射';fire.title='发射光线';fire.setAttribute('aria-label','发射光线');fire.classList.remove('long-label','cooling');}
  if (!special && game.status === 'playing' && game.hero.cooldown > lastCooldown) audio.effect('fire');
  lastCooldown = game.hero.cooldown;
  if (game.hp !== lastHp) {
    if (game.hp < lastHp) audio.effect('hurt');
    health.textContent = '♥ '.repeat(game.hp) + '♡ '.repeat(MAX_HP - game.hp);
    health.setAttribute('aria-label', `生命 ${game.hp} / ${MAX_HP}`);
    if (lastHp >= 0 && game.hp < lastHp) announcement.textContent = `受到碰撞，剩余 ${game.hp} 点能量。`;
    lastHp = game.hp;
  }
  const enemyHp = game.monsters[0]?.hp || 0;
  if (enemyHp !== lastEnemyHp) {
    if (enemyHp < lastEnemyHp) audio.effect('hit');
    score.innerHTML = `${enemyHp} <small>/ ${ENEMIES[selectedEnemy].hp}</small>`;
    lastEnemyHp = enemyHp;
  }
}
start.addEventListener('click', restart);
document.querySelector('#enemy-toggle').addEventListener('click',()=>{
  const open=document.querySelector('.arcade').classList.toggle('enemies-open');
  document.querySelector('#enemy-toggle').setAttribute('aria-expanded',String(open));
});
new ResizeObserver(()=>document.querySelector('.arcade').style.setProperty('--controls-height',document.querySelector('.controls').getBoundingClientRect().height+'px')).observe(document.querySelector('.controls'));
for (const [id, name] of Object.entries(heroNames)) {
  const button = document.createElement('button');
  button.dataset.hero = id; button.setAttribute('aria-label', `选择${heroTitle(id)}`);
  button.setAttribute('aria-pressed', String(id === selectedHero));
  const portrait = document.createElement('canvas'); portrait.width = 140; portrait.height = 130;
  portrait.setAttribute('aria-hidden', 'true');
  const pc = portrait.getContext('2d'); pc.translate(68, 120); const portraitScale = id === 'noa' ? 0.51 : 0.63; pc.scale(portraitScale, portraitScale); pc.translate(0, -512);
  hero({ id, x: 0, dir: 1, moving: false, firing: 0, invincible: 0 }, 0, pc);
  const text = document.createElement('span'); text.textContent = name;
  button.append(portrait, text); document.querySelector('#hero-options').append(button);
  button.addEventListener('click', () => {
    selectedHero = id; ready();
  });
}
for (const [id, info] of Object.entries(ENEMIES)) {
  const button = document.createElement('button');
  button.dataset.enemy = id; button.setAttribute('aria-label', `选择对手${info.name}`);
  button.setAttribute('aria-pressed', String(id === selectedEnemy));
  const portrait = document.createElement('canvas'); portrait.width = 150; portrait.height = 150;
  portrait.setAttribute('aria-hidden', 'true');
  const pc = portrait.getContext('2d'); pc.translate(75, 138); const portraitScale = id === 'wukong' ? 0.63 : 0.7; pc.scale(portraitScale, portraitScale); pc.translate(0, -512);
  monster({ id, x: 0, hit: 0 }, 0, 1, pc);
  const text = document.createElement('span'); text.textContent = info.name;
  if (id === 'belial') { text.textContent += ' ★'; button.title = '远程强敌：24点能量，保持距离发射强化光弹；红色蓄力提示时移动躲避。'; }
  if (id === 'wukong') { text.textContent += ' ★'; button.title = '厚血强敌：40点能量；飞天、遁地、七十二变和金箍棒。看准预警移动，等待落地反击。'; }
  button.append(portrait, text); document.querySelector('#enemy-options').append(button);
  button.addEventListener('click', () => { selectedEnemy = id; ready();document.querySelector('.arcade').classList.remove('enemies-open');document.querySelector('#enemy-toggle').setAttribute('aria-expanded','false'); });
}
document.querySelector('#restart').addEventListener('click', restart);
function triggerAction(action) {
  if (action === 'fire') shoot(game);
  else attack(game, action);
  updateStatus();
}
window.addEventListener('keydown', event => {
  if (event.target.matches('input,select,textarea')) return;
  if (event.code === 'KeyR' && !event.repeat) restart();
  if (!keyActions[event.code] || game.status !== 'playing') return;
  event.preventDefault(); keys.add(event.code);
  if (!event.repeat && !['left','right'].includes(keyActions[event.code])) triggerAction(keyActions[event.code]);
});
window.addEventListener('keyup', event => keys.delete(event.code));
window.addEventListener('blur', clearInput);
window.addEventListener('pointerout', event => { if (!event.relatedTarget) clearInput(); });
document.addEventListener('visibilitychange', clearInput);
canvas.addEventListener('pointerdown', event => {
  if (event.button !== 0 || game.status !== 'playing') return;
  const rect=canvas.getBoundingClientRect(), scale=Math.min(rect.width/canvas.width,rect.height/canvas.height);
  const x=(event.clientX-rect.left-(rect.width-canvas.width*scale)/2)/scale;
  const y=(event.clientY-rect.top-(rect.height-canvas.height*scale)/2)/scale;
  if(x>=0&&x<=canvas.width&&y>=492&&y<=canvas.height){clearInput();setMoveTarget(game,x);}
});
document.querySelectorAll('[data-action]').forEach(button => {
  button.addEventListener('pointerdown', event => {
    if (game.status !== 'playing' || event.button !== 0) return;
    event.preventDefault(); button.setPointerCapture(event.pointerId);
    pointers.set(event.pointerId, button.dataset.action); button.classList.add('held');
    if (['left','right'].includes(button.dataset.action)) game.hero.moveTarget = null;
    if (!['left','right'].includes(button.dataset.action)) triggerAction(button.dataset.action);
  });
  const release = event => { pointers.delete(event.pointerId); button.classList.remove('held'); };
  button.addEventListener('pointerup', release);
  button.addEventListener('pointercancel', release);
  button.addEventListener('lostpointercapture', release);
  button.addEventListener('click', event => {
    if (event.detail === 0 && game.status === 'playing') {
      step(game, { [button.dataset.action]: true }, 0.05); updateStatus();
    }
  });
});

function drawBug(x,y,direction) {
  c.save();c.translate(x,y);c.scale(direction,1);oval(-6,-4,7,4,'#f2e6bb');oval(-6,4,7,4,'#f2e6bb');oval(1,0,10,7,'#c98e4e',ink);oval(7,-3,3,3,'#fff4cf',ink);line([[7,-7],[11,-12]],ink,2);c.restore();
}
function drawWeather() {
  const t=reduceMotion?0:game.time-game.weatherStartedAt, type=game.weather;
  c.save();
  if(type==='sun') {
    c.globalAlpha=0.22;oval(1030,75,63,63,'#ffe89a');
    for(let i=0;i<8;i++){const a=i*Math.PI/4;line([[1030+Math.cos(a)*44,75+Math.sin(a)*44],[1030+Math.cos(a)*64,75+Math.sin(a)*64]],'#f8d46e',4);}
  } else {
    c.globalAlpha=type==='storm'?0.5:0.3;
    for(let i=0;i<7;i++)oval(i*180+20,35+(i%2)*25,130,55,type==='storm'?'#738695':'#9babb0');
    if(type==='rain'||type==='storm'){
      c.globalAlpha=0.42;
      for(let i=0;i<55;i++){const x=(i*137)%1120,y=(i*71+t*(type==='storm'?210:150))%495;line([[x,y],[x-7,y+17]],'#77a8b9',1.6);}
      c.globalAlpha=0.25;oval(210,538,85,6,'#8ab8be');oval(810,552,110,5,'#8ab8be');
    }
    if(type==='storm'){
      c.globalAlpha=!reduceMotion&&t>1&&t%6<0.18?0.65:0.28;
      poly([[1015,74],[988,135],[1011,133],[982,194],[1047,113],[1025,115],[1044,74]],'#fbf0ad');
    }
    if(type==='tornado'){
      c.globalAlpha=0.45;
      for(let i=0;i<11;i++){
        const y=260+i*20,x=1028+Math.sin(t*3+i*0.6)*12,r=72-i*5;
        c.beginPath();c.ellipse(x,y,r,8+i*0.25,0,0,Math.PI*2);c.strokeStyle=i%2?'#89a1a5':'#b9c8c4';c.lineWidth=5;c.stroke();
      }
      for(let i=0;i<5;i++){const a=t*2+i*1.3;oval(1028+Math.cos(a)*82,285+i*36+Math.sin(a)*8,5,3,'#a6ba8d');}
    }
  }
  c.restore();
}
function draw() {
  c.drawImage(background, 0, 0);
  drawWeather();
  if(game.hero.moveTarget!==null){oval(game.hero.moveTarget,535,19,6,'#9edbd9aa','#497d76');line([[game.hero.moveTarget,521],[game.hero.moveTarget,532]],'#497d76',2);}
  for (const enemy of game.monsters) {
    if (enemy.pauseTime > 0) {label(enemy.slipTime > 0 ? '滑倒啦！' : game.hero.id==='ruebe'?'定住啦！':'等等嘛～',enemy.x,300,17,'#7958a1');if(game.hero.id==='ruebe')oval(enemy.x,435,48,65,'#c4dcad44','#6e9c7a');}
    if (enemy.slowTime > 0) { oval(enemy.x,510,43,8,'#b6e29d88','#70945f');label('黏住啦',enemy.x,330,15,'#537b4c'); }
    if (enemy.charge > 0) {
      if(enemy.id==='wukong'){
        const names={fly:'飞天 · 离开云影',burrow:'遁地 · 离开地裂',transform:'七十二变 · 保持距离',staff:'金箍棒 · 躲开横扫'};
        label(names[enemy.spell],enemy.x,280,16,'#9e5a29');
        if(enemy.spell==='staff'){
          const dir=Math.sign(enemy.targetX-enemy.x)||-1;line([[enemy.x,447],[enemy.x+dir*230,447]],'#d4a94c77',15);
        }else if(enemy.spell!=='transform'){c.save();c.setLineDash([7,5]);oval(enemy.targetX,510,enemy.spell==='fly'?85:75,13,'#eac16f33','#bc7946');c.restore();}
        continue;
      }
      if(enemy.id==='tangseng'){
        const names={chant:'紧箍咒 · 离开金圈',shield:'佛光护盾 · 等待空隙',wave:'禅杖震波 · 及时躲开',lotus:'莲花法阵 · 离开花阵'};
        label(names[enemy.spell],enemy.x,288,16,'#965b2c');
        if(enemy.spell==='shield')oval(enemy.x,425,56,85,'#f2d87822','#c89a4c');
        else {const radius=enemy.spell==='lotus'?95:65;c.save();c.setLineDash([7,5]);oval(enemy.targetX,510,radius,13,'#efcd7933','#b5794d');c.restore();
          if(enemy.spell==='lotus')for(let i=0;i<6;i++)oval(enemy.targetX-75+i*30,501,17,10,'#e0b4c577');
          if(enemy.spell==='wave')line([[enemy.x,490],[enemy.targetX,490]],'#d1a256',3);
        }
        continue;
      }
      const bug = ENEMIES[enemy.id].shotKind === 'bug', sourceY = bug ? 337 : 360;
      c.save(); c.setLineDash([10,8]); line([[enemy.x,sourceY],[enemy.targetX,447]], '#c73e40', 3); c.restore();
      oval(enemy.targetX, 505, 45, 10, '#e8595933', '#c73e40');
      label(bug ? '小虫蓄力 · 快躲开！' : '光弹蓄力 · 快躲开！', enemy.x, 315, 17, '#ae3039');
      if(!bug)oval(enemy.x,360,13+Math.sin(game.time*22)*4,13,'#f5c789','#bd4248');
    }
  }
  for (const enemy of game.monsters) monster(enemy, game.time, game.hero.x);
  for(const enemy of game.monsters)if(enemy.id==='wukong'){
    if(enemy.flightTime>0||enemy.burrowTime>0){oval(enemy.targetX,510,enemy.flightTime>0?85:75,13,'#e7b26344','#b57945');label(enemy.flightTime>0?'腾云驾雾':'遁地突袭',enemy.x,270,16,'#945a35');}
    if(enemy.formTime>0)label('七十二变 · '+{tiger:'灵虎',eagle:'雄鹰',ape:'巨猿'}[enemy.form],enemy.x,270,16,'#945a35');
  }
  hero(game.hero, game.time);
  if(game.hero.slowTime>0){oval(game.hero.x,370,38,8,'#e9ca7044','#b58a39');label('紧箍咒 · 减速',game.hero.x,322,16,'#9c6e33');}
  for (const shot of game.shots) {
    if(shot.kind==='headmark'||shot.kind==='headwave'){
      c.save();c.translate(shot.x,shot.y);c.scale(shot.dir,1);
      line([[-35,0],[-10,0]],shot.kind==='headmark'?'#c3ecfa':'#f4d98f',6);
      poly([[-13,-9],[9,-15],[22,0],[9,15],[-13,9],[2,0]],shot.kind==='headmark'?'#e2f7ff':'#ffecab','#649ca2');c.restore();continue;
    }
    if(shot.kind==='bind'){oval(shot.x,shot.y,13,25,'#cadf9e66','#78a476');line([[shot.x-22,shot.y],[shot.x-9,shot.y]],'#cadf9e',5);continue;}
    if (shot.kind === 'slime') { oval(shot.x,447,15,12,'#b5e7a4','#529b7b');oval(shot.x-4,443,4,3,'#f0ffda');continue; }
    if (shot.kind === 'tears') { line([[shot.x-shot.dir*30,shot.y],[shot.x,shot.y]],'#8bcee4',9);for(const[dx,dy]of[[8,0],[0,-10],[1,10]])oval(shot.x+shot.dir*dx,shot.y+dy,5,4,'#c5eef5','#74b5ce');continue; }
    if (shot.kind === 'bug') { drawBug(shot.x,shot.y,shot.dir);continue; }
    if (shot.kind === 'weapon') {
      c.save(); c.translate(shot.x,447); c.rotate(game.time*18);
      line([[-27,0],[0,-12],[27,0],[0,12],[-27,0]], '#fff4ad', 9);
      line([[-27,0],[0,-12],[27,0]], '#d1953d', 3); c.restore(); continue;
    }
    line([[shot.x - shot.dir * 47, 447], [shot.x + shot.dir * 10, 447]], '#63c5cb', 14);
    line([[shot.x - shot.dir * 44, 447], [shot.x + shot.dir * 12, 447]], '#ffffdb', 6);
  }
  for (const shot of game.enemyShots) {
    if(shot.kind==='cloudstrike'){line([[shot.x,250],[shot.x,490]],'#d8ae51',12);oval(shot.x,505,85,15,'#f1d17f77','#c18c45');continue;}
    if(shot.kind==='eruption'){for(const x of [-55,-25,10,45])poly([[shot.x+x,510],[shot.x+x+12,460+Math.abs(x)/2],[shot.x+x+27,510]],'#bd9a65',ink);continue;}
    if(shot.kind==='staff'){line([[shot.x-115,447],[shot.x+115,447]],'#efc764aa',13);continue;}
    if(shot.kind==='feather'){poly([[shot.x-17,shot.y-6],[shot.x+20,shot.y],[shot.x-17,shot.y+6]],'#dfbd72',ink);continue;}
    if(shot.kind==='chant'){oval(shot.x,370,65,12,'#e7cb6255','#b68939');oval(shot.x,505,65,12,'#e7cb6255','#b68939');continue;}
    if(shot.kind==='lotus'){for(let i=0;i<7;i++){const a=i*Math.PI/7;oval(shot.x+Math.cos(a)*70,500-Math.sin(a)*60,20,28,'#e5b9cb99','#ae7999');}continue;}
    if(shot.kind==='wave'){oval(shot.x,497,29,15,'#edc76c88','#b38446');line([[shot.x,465],[shot.x-8,491],[shot.x+13,482]],'#f5df98',4);continue;}
    if(shot.kind==='bug'){drawBug(shot.x,shot.y,shot.vx<0?-1:1);continue;}
    oval(shot.x,shot.y,14,14,'#d14d69','#7d2e4f'); oval(shot.x,shot.y,7,7,'#ffe5a1');
  }
  for (const spark of game.sparks) {
    if(spark.kind==='lightning'){line([[spark.x+13,200],[spark.x-16,298],[spark.x+12,290],[spark.x-12,390],[spark.x+10,381],[spark.x,485]],'#f9e6a3',12);line([[spark.x+13,200],[spark.x-16,298],[spark.x+12,290],[spark.x-12,390],[spark.x+10,381],[spark.x,485]],'#8ebed6',4);continue;}
    if(spark.kind==='blink'){oval(spark.x,435,29,75,'#b4deec44','#add9e5');continue;}
    const size = spark.defeated ? 32 : 18;
    c.save(); c.globalAlpha = Math.min(1, spark.life * 4);
    for (let i = 0; i < 6; i++) {
      const angle = i * Math.PI / 3;
      line([[spark.x + Math.cos(angle) * 12, 446 + Math.sin(angle) * 12],
        [spark.x + Math.cos(angle) * size, 446 + Math.sin(angle) * size]], '#fff9d7', 5);
    }
    if (spark.defeated) label('击退！', spark.x, 405 - (0.4 - spark.life) * 35, 19, '#fffbe7');
    c.restore();
  }
}
let previous = performance.now();
function frame(now) {
  const dt = Math.min((now - previous) / 1000, 0.05); previous = now;
  if (!document.hidden && game.status === 'playing') {
    const input = {};
    for (const key of keys) input[keyActions[key]] = true;
    for (const action of pointers.values()) input[action] = true;
    step(game, input, dt); updateStatus();
    if (game.status !== 'playing') {
      clearInput();
      const won = game.status === 'won';
      audio.effect(won ? 'win' : 'lose');
      document.querySelector('#message-icon').textContent = won ? '★' : '♡';
      title.textContent = won ? '小卖部守住啦！' : '休息一下，再来！';
      messageText.textContent = won ? `${ENEMIES[selectedEnemy].name}被击退了！小卖部又能安心营业啦。` : '试着保持距离，边移动边发射光线，再来一次！';
      start.innerHTML = '再玩一次 <span>→</span>'; message.hidden = false;
      start.focus({ preventScroll: true });
    }
  }
  draw(); requestAnimationFrame(frame);
}
applyWeather(); updateStatus(); draw(); requestAnimationFrame(frame);

// Read-only snapshots let the browser playtest verify real input without changing game state.
window.gameSnapshot = () => structuredClone(game);
window.audioSnapshot = () => ({ enabled: audio.enabled, state: audio.context?.state || 'not-started',
  loops: audio.timer === null ? 0 : 1, voices: audio.voices.size, scheduled: audio.scheduled, effects: audio.effects,
  source: musicSource.value, filePlaying: !musicTrack.paused, fileTime: musicTrack.currentTime,
  lastEffect: audio.lastEffect, error: audio.error });
