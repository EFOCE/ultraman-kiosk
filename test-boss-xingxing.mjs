import assert from 'node:assert/strict';
import {createGame,step,shoot,attack,MAX_HP,WIDTH} from './model.mjs';
const advance=(g,seconds,input={})=>{for(let t=0;t<seconds;t+=.01)step(g,input,.01);};
const fresh=()=>{const g=createGame('boss','xingxing');g.monsters[0].attackCooldown=100;return g;};
let g=fresh();assert.equal(g.monsters[0].hp,30);
shoot(g);shoot(g);assert.equal(g.monsters[0].hp,26);assert.equal(g.actionSerial,1);
assert.equal(g.monsters[0].x,g.hero.x+165);assert(g.monsters[0].pauseTime>0);
g=fresh();g.monsters[0].x=1000;shoot(g);assert.equal(g.monsters[0].hp,30,'gravity range matters');
g=fresh();g.hero.x=WIDTH-44;g.monsters[0].x=WIDTH-30;shoot(g);assert(g.monsters[0].x<=WIDTH-30,'gravity remains inside arena');
g=fresh();g.monsters[0].charge=.8;g.enemyShots=[{x:100,y:447,vx:1,vy:0,life:1}];
attack(g,'punch');assert.equal(g.enemyShots.length,0);
advance(g,1);assert.equal(g.monsters[0].charge,.8,'time stop freezes warning');
advance(g,1.3);assert(g.monsters[0].charge<.8,'time resumes');
g=fresh();attack(g,'kick');g.enemyShots=[{x:g.hero.x+20,y:447,vx:-100,vy:0,damage:2,life:1}];
step(g,{},.01);assert.equal(g.hp,MAX_HP);assert.equal(g.monsters[0].hp,28);assert.equal(g.enemyShots.length,0);
advance(g,2.3);assert.equal(g.hero.mirrorTime,0,'shield expires');
g=fresh();attack(g,'weapon');assert.equal(g.monsters[0].hp,30);advance(g,.7);assert.equal(g.monsters[0].hp,22);
g=fresh();attack(g,'weapon');g.monsters[0].x=200;advance(g,.7);assert.equal(g.monsters[0].hp,30,'orbital locks position');
g=fresh();g.monsters[0].flightTime=1.2;attack(g,'weapon');advance(g,.7);assert.equal(g.monsters[0].hp,30,'airborne monster dodges orbital');
for(const [spell,kind,count] of [['meteor','meteor',3],['stone','stone',1],['claw','claw',1],['fly',null,0]]){
  g=fresh();const m=g.monsters[0];m.spell=spell;m.charge=.2;m.targetX=g.hero.x;
  advance(g,.1);assert.equal(g.enemyShots.length,0,'warning before '+spell);
  advance(g,.12);
  if(kind){assert.equal(g.enemyShots.length,count);assert(g.enemyShots.every(s=>s.kind===kind));}
  else {assert(m.flightTime>0);const x=m.x;advance(g,.2);assert(m.x<x,'fast airborne movement');advance(g,1.1);assert.equal(m.flightTime,0);}
}
g=fresh();g.monsters[0].spell='stone';g.monsters[0].charge=.01;g.monsters[0].targetX=g.hero.x;
step(g,{},.01);assert.equal(g.hero.stoneTime,1);const x=g.hero.x;
shoot(g);attack(g,'punch');advance(g,.5,{right:true});assert.equal(g.hero.x,x);assert.equal(g.actionSerial,0);
advance(g,.6,{right:true});assert(g.hero.x>x,'petrification ends');
g=fresh();g.monsters[0].spell='stone';g.monsters[0].charge=.01;g.monsters[0].targetX=100;
step(g,{},.01);assert.equal(g.hero.stoneTime,0,'can dodge stone zone');
g=fresh();g.monsters[0].spell='meteor';g.monsters[0].charge=.01;g.monsters[0].targetX=g.hero.x;
advance(g,1);assert(g.hp<MAX_HP,'meteor rain actually damages');
g=fresh();g.monsters[0].x=g.hero.x+300;g.monsters[0].spell='claw';g.monsters[0].charge=.01;g.monsters[0].targetX=g.hero.x;
step(g,{},.01);assert.equal(g.hp,MAX_HP-2,'extended claw reaches 300');
g=fresh();g.monsters[0].hp=1;shoot(g);step(g,{},.01);assert.equal(g.status,'won');assert.equal(g.defeated.id,'xingxing');
let frozen=JSON.stringify(g);advance(g,2,{fire:true});assert.equal(JSON.stringify(g),frozen,'combat frozen during ending');
g=fresh();g.hp=1;g.enemyShots=[{x:g.hero.x,y:447,vx:0,vy:0,life:1,damage:1}];step(g,{},.01);assert.equal(g.status,'lost');
g=createGame('boss','xingxing');assert.equal(g.defeated,null);assert.equal(g.zones.length,0);assert.equal(g.hero.stoneTime,0);assert.equal(g.hero.mirrorTime,0);
for(const kind of ['fire','punch','kick','weapon']){g=fresh();g.status='ready';kind==='fire'?shoot(g):attack(g,kind);assert.equal(g.actionSerial,0);}
console.log('PASS: Boss four skills/ranges/cooldowns, Xingxing four warnings/damage/dodges/flight, stone recovery, terminal snapshots and clean restart.');
