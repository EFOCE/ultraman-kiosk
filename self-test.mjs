import assert from 'node:assert/strict';
import { createGame, step, shoot, attack, setMoveTarget, chooseWeather, WEATHER_NAMES, WIDTH, MAX_HP, ENEMIES } from './model.mjs';

const advance = (game, input, seconds) => {
  for (let i = 0; i < seconds * 60; i++) step(game, input, 1 / 60);
};
let game = createGame('seven');
advance(game, { right: true }, 0.5);
assert(game.hero.x > 400 && game.hero.dir === 1, 'right movement');
advance(game, { left: true }, 0.5);
assert(game.hero.x < 300 && game.hero.dir === -1, 'left movement and turning');
game.hero.x = 45;
advance(game, { left: true }, 0.1);
assert.equal(game.hero.x, 44, 'left boundary');
game.hero.x = WIDTH - 45;
advance(game, { right: true }, 0.1);
assert.equal(game.hero.x, WIDTH - 44, 'right boundary');

const results = [];
for (const [id, info] of Object.entries(ENEMIES).filter(([id])=>id!=='wukong')) {
  for (const heroId of ['tregear', 'seven', 'zero', 'geed', 'mebius', 'nexus']) {
    game = createGame(heroId, id);
    advance(game, { fire: true }, 12);
    assert.equal(game.status, 'won', `${heroId} vs ${id} can win`);
    assert.equal(game.hits, info.hp, 'each projectile deals one damage');
    assert.equal(game.kills, 1);
    const ended = JSON.stringify(game);
    advance(game, { fire: true, right: true }, 1);
    assert.equal(JSON.stringify(game), ended, 'victory freezes the round');
    game = createGame(heroId, id);
    assert.equal(game.hero.id, heroId);
    assert.equal(game.enemyId, id);
    assert.equal(game.hp, MAX_HP);
    assert.equal(game.monsters[0].hp, info.hp);
    assert.equal(game.hits, 0);
    assert.equal(game.shots.length, 0);
    assert.equal(game.sparks.length, 0);
    assert.equal(game.time, 0);
  }
  game.monsters[0].x = game.hero.x + 20;
  step(game, {}, 1 / 60);
  assert.equal(game.hp, MAX_HP - info.damage, `${id} contact damage`);
  game.monsters[0].x = game.hero.x;
  advance(game, {}, 0.5);
  assert.equal(game.hp, MAX_HP - info.damage, `${id} damage grace period`);
  advance(game, {}, 45);
  assert.equal(game.status, 'lost', `${id} can defeat the player`);
  assert.equal(game.hp, 0, 'health never goes negative');
  const lost = JSON.stringify(game);
  advance(game, { left: true }, 1);
  assert.equal(JSON.stringify(game), lost, 'loss freezes the round');
  results.push(`${info.name}: win, damage, loss, restart PASS`);
}
game = createGame('zero', 'belial');
game.hero.x = 700; game.hero.dir = -1; game.monsters[0].x = 180;
advance(game, { fire: true }, 12);
assert.equal(game.status, 'won', 'left-facing projectiles hit');
game = createGame('seven');
shoot(game);
assert.equal(game.shots.length, 1, 'a single button press fires immediately');
shoot(game);
assert.equal(game.shots.length, 1, 'rapid clicks respect the cooldown');
game.status = 'ready'; game.hero.cooldown = 0;
shoot(game);
assert.equal(game.shots.length, 1, 'ready state cannot fire');
game.status = 'playing';
for (const dt of [NaN, Infinity, -1, 0]) step(game, {}, dt);
assert.equal(game.time, 0);
assert.throws(() => createGame('ruebe', '__proto__'), /Unknown opponent/);
// Combat checks isolate range, facing, cooldowns and aimed projectiles.
game = createGame('seven'); game.monsters[0].x = game.hero.x + 90;
attack(game, 'punch');
assert.equal(game.monsters[0].hp, 16, 'punch deals two damage within reach');
attack(game, 'punch'); assert.equal(game.monsters[0].hp, 16, 'rapid punch respects cooldown');
advance(game, {}, 0.4); attack(game, 'punch');
assert.equal(game.monsters[0].hp, 14, 'punch is available after cooldown');
game = createGame('seven'); game.monsters[0].x = game.hero.x + 200;
attack(game, 'punch'); assert.equal(game.monsters[0].hp, 18, 'punch cannot hit at long range');
game = createGame('seven'); game.monsters[0].x = game.hero.x - 80;
attack(game, 'punch'); assert.equal(game.monsters[0].hp, 18, 'punch cannot hit behind hero');
game = createGame('seven'); game.hero.dir = -1; game.monsters[0].x = game.hero.x - 130;
const beforeKick = game.monsters[0].x;
attack(game, 'kick');
assert.equal(game.monsters[0].hp, 15, 'kick has longer reach and three damage');
assert.equal(game.monsters[0].x, beforeKick - 110, 'kick pushes away in facing direction');
assert.equal(game.hero.kickCooldown, 0.85);
game = createGame('seven'); attack(game, 'weapon'); attack(game, 'weapon');
assert.equal(game.shots.length, 1, 'weapon cannot stack while cooling down');
advance(game, {}, 0.95);
assert.equal(game.monsters[0].hp, 14, 'weapon projectile deals four damage');
assert(game.hero.weaponCooldown > 0, 'weapon cooldown outlasts animation');
const readyGame = createGame('seven'); readyGame.status = 'ready'; attack(readyGame, 'kick');
assert.equal(readyGame.actionSerial, 0, 'ready state cannot attack');
const invalid = JSON.stringify(readyGame); attack(readyGame, '__proto__');
assert.equal(JSON.stringify(readyGame), invalid, 'unknown attack is ignored');
for (const id of Object.keys(ENEMIES).filter(id=>!['tangseng','wukong'].includes(id))) {
  game = createGame('ruebe', id);
  advance(game, {}, (ENEMIES[id].initialAttackCooldown || 2.6) + 0.05);
  assert(game.monsters[0].charge > 0.7, `${id} warns before firing`);
  assert.equal(game.enemyShots.length, 0, 'no projectile during early warning');
  const target = game.monsters[0].targetX;
  advance(game, {left:true}, (ENEMIES[id].chargeTime || 0.85) + 0.05);
  assert.equal(game.monsters[0].targetX, target, 'aim stays fixed so movement can dodge');
  assert.equal(game.enemyShots.length, 1, `${id} emits visible projectile`);
  advance(game, {}, 1.1);
  assert.equal(game.hp, MAX_HP, 'moving away from the warning avoids damage');
}
game = createGame('seven'); advance(game, {}, 4.4);
assert.equal(game.hp, MAX_HP - 1, 'standing in aimed projectile path costs one health');
game = createGame('seven'); game.hero.invincible = 1;
game.enemyShots.push({x:game.hero.x,y:447,vx:390,vy:0,life:1});
step(game, {}, 0.01); assert.equal(game.hp, MAX_HP, 'projectiles respect damage grace');
game = createGame('seven'); attack(game, 'weapon'); game.enemyShots.push({x:300,y:400,vx:10,vy:10,life:2});
game = createGame(game.hero.id, game.enemyId);
assert.equal(game.enemyShots.length, 0, 'restart clears enemy projectiles');
assert.equal(game.shots.length, 0, 'restart clears hero projectiles');
assert.equal(game.hero.weaponCooldown, 0, 'restart clears attack cooldowns');
assert(ENEMIES.belial.hp > Math.max(...Object.entries(ENEMIES).filter(([id])=>!['belial','wukong'].includes(id)).map(([,info])=>info.hp)), 'Belial retains the highest health among the previous opponents');
game = createGame('tregear', 'belial'); game.monsters[0].x = game.hero.x + 200;
step(game, {}, 0.05); assert(game.monsters[0].x > game.hero.x + 200, 'Belial retreats from close range');
game = createGame('zhuqingqing', 'belial'); advance(game, {}, 4.3);
assert.equal(game.hp, MAX_HP-2, 'Belial ranged hit deals two damage after warning');
// Only the two custom heroes replace the existing three attack slots.
game=createGame('jiangshuyan'); const delayed=game.monsters[0];
delayed.charge=0.7; const delayedX=delayed.x;
attack(game,'punch'); attack(game,'punch');
assert.equal(game.actionSerial,1,'delay cooldown prevents retrigger');
advance(game,{},0.5);
assert.equal(delayed.x,delayedX);assert.equal(delayed.charge,0.7,'delay preserves the visible warning');
advance(game,{},1.1);assert.equal(delayed.pauseTime,0);assert(delayed.charge<0.7,'warning resumes after delay');
assert(game.hero.punchCooldown>5);
game=createGame('jiangshuyan');attack(game,'kick');attack(game,'kick');
assert.equal(game.shots.length,1,'slime cooldown');advance(game,{},1.2);
assert.equal(game.monsters[0].hp,17);assert(game.monsters[0].slowTime>2,'slime causes a timed slow');
const slowedX=game.monsters[0].x;advance(game,{},0.2);
assert(Math.abs(slowedX-game.monsters[0].x-95*0.45*0.2)<0.1,'slime actually reduces movement to 45%');
advance(game,{},3);assert.equal(game.monsters[0].slowTime,0,'slow expires');
game=createGame('jiangshuyan');game.hero.dir=-1;attack(game,'kick');advance(game,{},1.5);
assert.equal(game.monsters[0].hp,18,'slime misses in the wrong direction');assert.equal(game.monsters[0].slowTime,0);
game=createGame('jiangshuyan');game.hero.dir=-1;attack(game,'weapon');attack(game,'weapon');
assert.equal(game.actionSerial,1,'skate cooldown');advance(game,{},0.32);
assert(Math.abs(game.hero.x-72)<0.1,'skate travels 208 in its starting direction');
assert.equal(game.hero.skateTime,0);assert.equal(game.hero.invincible,0,'skating does not grant invincibility');
game=createGame('jiangshuyan');game.hero.x=50;game.hero.dir=-1;attack(game,'weapon');advance(game,{},0.4);
assert.equal(game.hero.x,44,'skate respects world edge');
game=createGame('choumo');game.monsters[0].x=500;attack(game,'punch');attack(game,'punch');
assert.equal(game.shots.length,1,'tears cooldown');assert.equal(game.shots[0].y,387,'tears start at eye level');
advance(game,{},0.5);assert.equal(game.monsters[0].hp,17);assert(game.monsters[0].slipTime>0,'tears hit causes a slip');
const slippedX=game.monsters[0].x, slippedCharge=game.monsters[0].charge;
advance(game,{},0.3);assert.equal(game.monsters[0].x,slippedX);assert.equal(game.monsters[0].charge,slippedCharge);
advance(game,{},0.8);assert.equal(game.monsters[0].slipTime,0);assert.equal(game.monsters[0].pauseTime,0,'slip recovers');
game=createGame('choumo');attack(game,'punch');advance(game,{},1);
assert.equal(game.shots.length,0,'water disappears after its finite range');assert.equal(game.monsters[0].hp,18);assert.equal(game.monsters[0].slipTime,0,'far targets unaffected');
game=createGame('choumo');game.hero.dir=-1;game.monsters[0].x=500;attack(game,'punch');advance(game,{},0.8);
assert.equal(game.monsters[0].hp,18,'water cannot hit behind the aim');
game=createGame('choumo');game.hero.x=600;game.hero.dir=-1;game.monsters[0].x=400;attack(game,'punch');advance(game,{},0.5);
assert.equal(game.monsters[0].hp,17,'water can hit left-facing targets');
game=createGame('choumo');game.monsters[0].x=400;attack(game,'kick');
assert.equal(game.monsters[0].hp,16);assert.equal(game.monsters[0].x,580,'stinky kick pushes farther');
assert.equal(game.monsters[0].slipTime,0,'stinky kick does not add an unrequested slip');
attack(game,'kick');assert.equal(game.actionSerial,1,'stinky kick cooldown');
for(const offset of [200,-100]){game=createGame('choumo');game.monsters[0].x=game.hero.x+offset;attack(game,'kick');assert.equal(game.monsters[0].hp,18,'stinky kick respects range and facing');}
game=createGame('choumo');attack(game,'weapon');attack(game,'weapon');
assert.equal(game.shots.length,1);assert.equal(game.shots[0].y,337,'bug starts above the hair');
game.hero.dir=-1;advance(game,{},1.3);assert.equal(game.monsters[0].hp,16,'bug keeps its original straight direction and deals two damage');
for(const id of ['jiangshuyan','choumo']){
  game=createGame(id);game.monsters[0].x=450;game.monsters[0].hp=1;attack(game,id==='jiangshuyan'?'kick':'punch');advance(game,{},0.6);
  assert.equal(game.status,'won',`${id} special projectile can end the round`);
  const ended=JSON.stringify(game);advance(game,{punch:true,weapon:true},1);assert.equal(JSON.stringify(game),ended,'special effects freeze at round end');
  for(const next of [id,'noa']){const fresh=createGame(next);assert.equal(fresh.shots.length,0);assert.equal(fresh.hero.skateTime,0);assert.equal(fresh.hero.action,'');assert.equal(fresh.monsters[0].pauseTime,0);assert.equal(fresh.monsters[0].slowTime,0);assert.equal(fresh.monsters[0].slipTime,0);}
}
for(const id of ['taro','seven','zero','geed','mebius','nexus','tregear','zhuqingqing']){
  game=createGame(id);game.monsters[0].x=370;attack(game,'punch');assert.equal(game.monsters[0].hp,16);assert.equal(game.monsters[0].pauseTime,0,`${id} keeps normal punch`);
  game=createGame(id);game.monsters[0].x=400;attack(game,'kick');assert.equal(game.monsters[0].hp,15);assert.equal(game.monsters[0].x,510,`${id} keeps normal kick`);
  game=createGame(id);attack(game,'weapon');assert.equal(game.shots[0].kind,'weapon');assert.equal(game.shots[0].damage,4,`${id} keeps normal weapon`);
}
// Destination movement leaves the mouse free to attack and stops without overshoot.
game=createGame('seven');setMoveTarget(game,420);advance(game,{},0.6);
assert.equal(game.hero.x,420);assert.equal(game.hero.moveTarget,null);assert.equal(game.hero.moving,false);
setMoveTarget(game,100);step(game,{},0.05);assert.equal(game.hero.dir,-1);
setMoveTarget(game,600);shoot(game);attack(game,'weapon');step(game,{},0.05);
assert.equal(game.hero.moveTarget,600,'attacking preserves destination');assert.equal(game.hero.dir,1);
step(game,{left:true},0.05);assert.equal(game.hero.moveTarget,null,'manual movement cancels destination');
const stoppedX=game.hero.x;step(game,{},0.05);assert.equal(game.hero.x,stoppedX,'manual release stops');
setMoveTarget(game,-1);assert.equal(game.hero.moveTarget,44);setMoveTarget(game,9999);assert.equal(game.hero.moveTarget,1056);
setMoveTarget(game,NaN);assert.equal(game.hero.moveTarget,1056,'invalid target ignored');
game.hp=0;step(game,{},0.01);assert.equal(game.hero.moveTarget,null);setMoveTarget(game,500);assert.equal(game.hero.moveTarget,null,'end screen cannot move');
game=createGame('seven');game.status='ready';setMoveTarget(game,500);assert.equal(game.hero.moveTarget,null);
assert.deepEqual([0,0.25,0.5,0.75,1].map(sample=>chooseWeather('random',sample)),['sun','rain','storm','tornado','tornado']);
for(const type of Object.keys(WEATHER_NAMES))assert.equal(chooseWeather(type,0),type,'manual weather remains chosen');
for(const sample of [-1,NaN,Infinity,1.2])assert(Object.hasOwn(WEATHER_NAMES,chooseWeather('invalid',sample)));
const sunny=createGame('seven'),rainy=createGame('seven');rainy.weather='rain';advance(sunny,{right:true,fire:true},1);advance(rainy,{right:true,fire:true},1);rainy.weather='sun';
assert.deepEqual(rainy,sunny,'weather does not change combat or movement');
game=createGame('choumo','shumo');advance(game,{},3.5);assert.equal(game.enemyShots[0].kind,'bug','Shumo launches the head bug');
console.log(results.join('\n'));
console.log(`PASS: ${(Object.keys(ENEMIES).length - 1) * 6} standard-hero/opponent combinations, all contact/loss paths, fresh restarts, movement, turning, boundaries, leftward hits and terminal freeze.`);
console.log('PASS: punch/kick range and facing, weapon damage/cooldowns, all enemy warnings/projectiles, dodging, grace, restart cleanup and ranged Belial.');
console.log('PASS: Jiang Shuyan delay/slime/skating; Choumo ranged tears/slip, stinky kick and head-launched bug; cooldowns, bounds, misses, recovery, wins and clean hero changes.');
console.log('PASS: mouse destination arrival/replacement/facing, attack while walking, manual cancellation, bounds and terminal cleanup; four random/manual weather types, unchanged combat, Shumo bug.');

// The new four-slot kits use actual effects; old standard attack checks above use Seven.
for(const id of ['ruebe','noa']){
  for(const kind of ['fire','punch','kick','weapon']){
    game=createGame(id);const use=()=>kind==='fire'?shoot(game):attack(game,kind);use();use();assert.equal(game.actionSerial,1,id+' '+kind+' cooldown');
    game.status='ready';game.hero.actionTime=0;game.hero.cooldown=0;game.hero[kind+'Cooldown']=0;use();assert.equal(game.actionSerial,1,'ready disallows new abilities');
  }
}
game=createGame('noa');game.monsters[0].x=400;shoot(game);assert.equal(game.monsters[0].hp,17);assert.equal(game.monsters[0].x,500);assert.equal(game.hero.wingTime,1.2);advance(game,{},1.3);assert.equal(game.hero.wingTime,0);assert.equal(game.hero.invincible,0);
for(const dir of [-1,1]){
  game=createGame('noa');game.hero.dir=dir;game.hero.x=dir===1?1000:100;setMoveTarget(game,600);attack(game,'punch');assert.equal(game.hero.x,dir===1?1056:44);assert.equal(game.hero.moveTarget,null);assert(game.hero.invincible>0);advance(game,{},0.4);assert.equal(game.hero.blinkTime,0);assert.equal(game.hero.invincible,0);
}
for(const offset of [300,-300,550]){
  game=createGame('noa');game.monsters[0].x=game.hero.x+offset;attack(game,'kick');assert.equal(game.monsters[0].hp,offset===300?15:18,'lightning range and facing');assert(game.sparks.some(s=>s.kind==='lightning'));
}
for(const [id,kind,shotKind]of [['noa','weapon','headmark'],['ruebe','kick','headwave']]){
  for(const dir of [-1,1]){game=createGame(id);game.hero.x=550;game.hero.dir=dir;game.monsters[0].x=550+dir*250;attack(game,kind);assert.equal(game.shots[0].y,340,'head origin');assert.equal(game.shots[0].kind,shotKind);advance(game,{},0.6);assert.equal(game.monsters[0].hp,16,'head shot damages in both directions');}
  game=createGame(id);game.hero.dir=-1;attack(game,kind);advance(game,{},2);assert.equal(game.shots.length,0);assert.equal(game.monsters[0].hp,18,'backwards shot misses');
}
game=createGame('ruebe');shoot(game);assert.equal(game.hero.transformTime,2.2);assert.equal(game.hero.invincible,2.2);advance(game,{},2.3);assert.equal(game.hero.transformTime,0);assert.equal(game.hero.invincible,0);assert(game.hero.cooldown>4,'transform has vulnerable cooldown window');
for(const offset of [150,200,-100]){game=createGame('ruebe');game.monsters[0].x=game.hero.x+offset;attack(game,'punch');assert.equal(game.monsters[0].hp,offset===150?15:18,'carrot blade range/facing');}
game=createGame('ruebe');attack(game,'weapon');advance(game,{},1.2);assert.equal(game.monsters[0].hp,17);assert(game.monsters[0].pauseTime>0);const boundX=game.monsters[0].x;advance(game,{},0.5);assert.equal(game.monsters[0].x,boundX);advance(game,{},1.1);assert.equal(game.monsters[0].pauseTime,0);assert(game.monsters[0].x<boundX,'binding expires');
game=createGame('ruebe');game.hero.dir=-1;attack(game,'weapon');advance(game,{},1.5);assert.equal(game.monsters[0].pauseTime,0,'miss cannot bind');
for(const [index,spell]of ['chant','shield','wave','lotus'].entries()){
  game=createGame('seven','tangseng');let m=game.monsters[0];m.spellIndex=index;m.attackCooldown=0;step(game,{},0.01);assert.equal(m.spell,spell);assert(m.charge>=1.1);assert.equal(game.enemyShots.length,0,'telegraph before spell');const aim=m.targetX;
  advance(game,{left:true},1.2);assert.equal(m.targetX,aim,'spell target does not track player');
  if(spell==='shield'){assert(m.shieldTime>0);const hp=m.hp;game.hero.x=m.x-90;game.hero.dir=1;attack(game,'punch');assert.equal(m.hp,hp,'shield blocks damage');advance(game,{},1.4);assert.equal(m.shieldTime,0);game.hero.x=m.x-90;game.hero.dir=1;attack(game,'punch');assert.equal(m.hp,hp-2,'shield leaves a vulnerable window');}
  else{assert(game.enemyShots.some(s=>s.kind===spell));advance(game,{},1.3);assert.equal(game.hp,MAX_HP,'moving out of warning dodges '+spell);}
}
for(const [index,damage]of [[0,1],[3,2]]){game=createGame('seven','tangseng');game.monsters[0].spellIndex=index;game.monsters[0].attackCooldown=0;advance(game,{},1.2);assert.equal(game.hp,MAX_HP-damage);if(index===0){assert(game.hero.slowTime>0);const x=game.hero.x;advance(game,{right:true},0.2);assert(Math.abs(game.hero.x-x-285*.3*.2)<.1);advance(game,{},1);assert.equal(game.hero.slowTime,0);}}
for(const id of ['ruebe','noa']){
  game=createGame(id,'tangseng');game.monsters[0].hp=2;game.monsters[0].x=500;attack(game,id==='noa'?'weapon':'kick');advance(game,{},1);assert.equal(game.status,'won','new head ability can defeat Tang Seng');
  const fresh=createGame(id,'tangseng');for(const field of ['transformTime','wingTime','blinkTime','slowTime'])assert.equal(fresh.hero[field],0);assert.equal(fresh.monsters[0].shieldTime,0);assert.equal(fresh.monsters[0].spell,'');assert.equal(fresh.enemyShots.length,0);assert.equal(fresh.shots.length,0);
}
assert.equal(Object.keys(ENEMIES).length,13);assert.equal(ENEMIES.buniu.name,'布牛');assert.equal(ENEMIES.tangseng.name,'唐僧');assert(!ENEMIES.redking&&!ENEMIES.eleking);
console.log('PASS: Noa and Ruebe four actual skills, damage/range/facing/cooldowns, head origins, transformation/binding recovery, bounded blink, Tang Seng four warned spells/shield/dodge/slow/recovery, wins and clean restart.');


// Wukong is the additional boss; the previous twelve opponents stay intact.
assert.equal(ENEMIES.wukong.hp,40);assert.equal(ENEMIES.tangseng.name,'唐僧');
for(const [index,spell]of ['fly','burrow','transform','staff'].entries()){
  game=createGame('seven','wukong');const m=game.monsters[0];m.spellIndex=index;m.attackCooldown=0;step(game,{},0.01);
  assert.equal(m.spell,spell);assert(m.charge>1);assert.equal(game.enemyShots.length,0,'Wukong warns before casting');const target=m.targetX;
  advance(game,{left:true},1.1);assert.equal(m.targetX,target,'boss locks the warned position');
  if(spell==='fly'||spell==='burrow'){
    assert(m[spell==='fly'?'flightTime':'burrowTime']>0);const hp=m.hp;game.hero.x=m.x-90;game.hero.dir=1;attack(game,'punch');assert.equal(m.hp,hp,'airborne/underground boss temporarily evades hits');
    game.hero.x=44;advance(game,{},Math.max(m.flightTime,m.burrowTime)+0.02);assert.equal(m.flightTime,0);assert.equal(m.burrowTime,0);assert.equal(game.hp,MAX_HP,'leaving the marker dodges the landing');assert(game.enemyShots.some(s=>s.kind===(spell==='fly'?'cloudstrike':'eruption')));
    if(spell==='burrow')assert(Math.abs(m.x-target)<20,'burrow emerges at its original target');
    game.hero.x=m.x-90;game.hero.dir=1;attack(game,'punch');assert.equal(m.hp,hp-2,'boss can be damaged after returning');
  }else if(spell==='transform'){assert.equal(m.form,'tiger');assert(m.formTime>0);advance(game,{},2.8);assert.equal(m.form,'');assert.equal(m.formTime,0,'transformation expires');}
  else {assert(game.enemyShots.some(s=>s.kind==='staff'));assert.equal(game.hp,MAX_HP,'staff has finite range');}
}
for(const [index,form]of ['tiger','eagle','ape'].entries()){
  game=createGame('seven','wukong');const m=game.monsters[0];m.spellIndex=2;m.formIndex=index;m.attackCooldown=0;advance(game,{},1.1);assert.equal(m.form,form);
  if(form==='tiger'){const x=m.x;step(game,{},0.05);assert(Math.abs(x-m.x-115*1.5*.05)<.01,'tiger is faster');}
  if(form==='eagle')assert(game.enemyShots.some(s=>s.kind==='feather'),'eagle shoots a feather');
  if(form==='ape'){game.hero.x=m.x-105;game.hero.dir=1;attack(game,'kick');assert.equal(m.hp,38,'ape reduces damage by one but is not invulnerable');}
}
for(const index of [0,1]){game=createGame('seven','wukong');game.monsters[0].spellIndex=index;game.monsters[0].attackCooldown=0;advance(game,{},2.4);assert.equal(game.hp,3,'staying at the landing costs two health');}
game=createGame('seven','wukong');game.monsters[0].x=450;game.monsters[0].spellIndex=3;game.monsters[0].attackCooldown=0;advance(game,{},1.1);assert.equal(game.hp,3,'golden staff actually damages within reach');
game=createGame('seven','wukong');game.monsters[0].x=1000;game.hero.x=1056;game.monsters[0].spellIndex=1;game.monsters[0].attackCooldown=0;advance(game,{},2.3);assert(game.monsters[0].x<=1070&&game.monsters[0].x>=30,'burrow stays within bounds');
game=createGame('ruebe','wukong');game.monsters[0].hp=2;game.monsters[0].x=500;attack(game,'kick');advance(game,{},1);assert.equal(game.status,'won','Wukong can be defeated');
const endedBoss=JSON.stringify(game);advance(game,{fire:true},2);assert.equal(JSON.stringify(game),endedBoss,'defeated boss cannot attack again');
game=createGame('seven','wukong');advance(game,{},40);assert.equal(game.status,'lost','Wukong can win');
const resetBoss=createGame('seven','wukong');for(const field of ['flightTime','burrowTime','formTime','skillEffectTime'])assert.equal(resetBoss.monsters[0][field],0);assert.equal(resetBoss.monsters[0].form,'');assert.equal(resetBoss.enemyShots.length,0);assert.equal(resetBoss.monsters[0].hp,40);
console.log('PASS: Wukong 40 HP, all four warned skills, three real forms, limited dodge states, damage/range, recovery, landing dodge, defeat, loss, terminal freeze and clean restart.');

