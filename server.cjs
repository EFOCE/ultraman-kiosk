const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const port = process.argv.includes('--review') ? 4186 : 4185;
const url = 'http://127.0.0.1:' + port;
const openBrowser = () => require('node:child_process').execFile('cmd.exe', ['/d', '/c', 'start', '', url], { windowsHide: true }, error => {
  if (error) console.error('Open this URL in your browser: ' + url);
});
const files = { '/': ['index.html', 'text/html'], '/index.html': ['index.html', 'text/html'],
  '/style.css': ['style.css', 'text/css'], '/game.mjs': ['game.mjs', 'text/javascript'],
  '/fighter-art.mjs':['fighter-art.mjs','text/javascript'],
  '/campaign.mjs':['campaign.mjs','text/javascript'],
  '/assets/music/peaceful-ville.mp3':['assets/music/peaceful-ville.mp3','audio/mpeg'],
  '/combat-kit.mjs':['combat-kit.mjs','text/javascript'],
  '/model.mjs': ['model.mjs', 'text/javascript'],
  '/assets/music/battle-theme.mp3': ['assets/music/battle-theme.mp3', 'audio/mpeg'] };
for (const id of ['boss','xingxing','zhuqingqing','jiangshuyan','choumo','shumo']) {
  const file = `assets/portraits/${id}.png`; files['/'+file] = [file,'image/png'];
}
for(const filename of fs.readdirSync(path.join(__dirname,'assets/fighters')).filter(name=>/^[a-z]+\.png$/.test(name))){const file='assets/fighters/'+filename;files['/'+file]=[file,'image/png'];}
for(const filename of fs.readdirSync(path.join(__dirname,'assets/voices')).filter(name=>/^[a-z]+\.wav$/.test(name))){const file='assets/voices/'+filename;files['/'+file]=[file,'audio/wav'];}

const server = http.createServer((request, response) => {
  const file = files[request.url.split('?')[0]];
  if (!file || !['GET', 'HEAD'].includes(request.method)) {
    response.writeHead(404); response.end('Not found'); return;
  }
  fs.readFile(path.join(__dirname, file[0]), (error, data) => {
    if (error) { response.writeHead(500); response.end('Unable to read game file'); return; }
    response.writeHead(200, { 'Content-Type': file[1] + (file[1].startsWith('text/') ? '; charset=utf-8' : ''), 'Content-Length': data.length, 'Cache-Control': 'no-store' });
    response.end(request.method === 'HEAD' ? undefined : data);
  });
});
server.on('error', error => {
  if (error.code === 'EADDRINUSE' && process.argv.includes('--open')) {
    const request = http.get(url, response => {
      let html = '';
      response.on('data', chunk => { html += chunk; });
      response.on('end', () => {
        if (response.statusCode === 200 && html.includes('小卖部保卫战')) openBrowser();
        else { console.error('Port ' + port + ' is occupied by another app.'); process.exitCode = 1; }
      });
    });
    request.setTimeout(3000, () => request.destroy(new Error('Local server did not respond.')));
    request.on('error', failure => { console.error(failure.message); process.exitCode = 1; });
    return;
  }
  console.error(error.code === 'EADDRINUSE' ? 'Port ' + port + ' is in use. If this game is already running, open ' + url : error.message);
  process.exitCode = 1;
});
server.listen(port, '127.0.0.1', () => {
  console.log('Game ready: ' + url);
  if (process.argv.includes('--open')) openBrowser();
});
