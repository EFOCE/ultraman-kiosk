import assert from 'node:assert/strict';
import {createGame,step,shoot,attack,jump,setMoveTarget,chooseWeather,ENEMIES,MAX_HP,WIDTH} from './model.mjs';
import {HERO_SKILLS,ENEMY_SKILLS,SKILL_KEYS} from './combat-kit.mjs';
const advance=(g,seconds,input={})=>{for(let t=0;t<seconds-1e-8;t+=.01)step(g,input,.01);};
const use=(g,key)=>key==='fire'?shoot(g):attack(g,key);
const quiet=(id='seven',enemy='empera')=>{const g=createGame(id,enemy);g.monsters[0].attackCooldown=100;g.monsters[0].pauseTime=100;return g;};
assert.equal(Object.keys(HERO_SKILLS).length,13);assert.equal(Object.keys(ENEMIES).length,14);
assert.throws(()=>createGame('__proto__'));assert.throws(()=>createGame('seven','__proto__'));
let checks=0;
for(const id of Object.keys(HERO_SKILLS))for(const kind of SKILL_KEYS){
  const g=quiet(id);g.hp=2;g.monsters[0].x=g.hero.x+85;
  use(g,kind);const first=JSON.stringify(g);use(g,kind);assert.equal(JSON.stringify(g),first,`${id} ${kind}: no cooldown bypass`);
  advance(g,.8);assert(Number.isFinite(g.hp)&&g.hp>=0&&g.hp<=MAX_HP);
  for(const status of ['ready','won','lost']){const frozen=quiet(id);frozen.status=status;const before=JSON.stringify(frozen);use(frozen,kind);step(frozen,{fire:true,jump:true},.01);assert.equal(JSON.stringify(frozen),before,`${id}: no action in ${status}`);}
  checks++;
}
for(const hero of Object.keys(HERO_SKILLS))for(const enemy of Object.keys(ENEMIES)){
  const g=quiet(hero,enemy);g.monsters[0].x=g.hero.x+180;
  advance(g,120,{fire:true});assert.equal(g.status,'won',`${hero} can defeat ${enemy}`);assert.equal(g.defeated.id,enemy);
  const ended=JSON.stringify(g);advance(g,2,{right:true,jump:true});assert.equal(JSON.stringify(g),ended);
  const reset=createGame(hero,enemy);assert.equal(reset.shots.length,0);assert.equal(reset.hero.jumpHeight,0);assert.equal(reset.defeated,null);
}
for(const [id,kit] of Object.entries(HERO_SKILLS))for(const [kind,skill] of Object.entries(kit)){
  if(!['melee','beam','blade','lightning','burst'].includes(skill.type)||['choumo','jiangshuyan'].includes(id))continue;
  let g=quiet(id);g.monsters[0].x=g.hero.x+70;use(g,kind);advance(g,.6);assert.equal(g.monsters[0].hp,18-skill.damage,`${id}/${kind}: damage`);
  if(skill.type!=='burst'){g=quiet(id);g.monsters[0].x=g.hero.x-150;use(g,kind);advance(g,1);assert.equal(g.monsters[0].hp,18,`${id}/${kind}: facing matters`);}
}
for(const [id,kit] of Object.entries(ENEMY_SKILLS))for(let index=0;index<kit.length;index++){
  const g=createGame('seven',id),m=g.monsters[0];m.spellIndex=index;m.attackCooldown=0;step(g,{},.01);
  assert(m.charge>0,`${id} warns ${kit[index].name}`);assert.equal(g.enemyShots.length,0);
  const aim=m.targetX;advance(g,.2,{left:true});assert.equal(m.targetX,aim,'locked warning stays dodgeable');
  advance(g,1.15);assert(m.charge===0,`${id} resolves warning`);
  assert(g.enemyShots.every(s=>Number.isFinite(s.x)&&Number.isFinite(s.y)),`${id}: finite projectiles`);
}
let g=quiet();setMoveTarget(g,420);advance(g,1);assert.equal(g.hero.x,420);assert.equal(g.hero.moveTarget,null);
setMoveTarget(g,900);step(g,{left:true},.02);assert.equal(g.hero.moveTarget,null);assert.equal(g.hero.dir,1,'retreat keeps facing the opponent');
setMoveTarget(g,NaN);assert.equal(g.hero.moveTarget,null);setMoveTarget(g,99999);assert.equal(g.hero.moveTarget,WIDTH-44);
g=quiet();advance(g,.25,{jump:true,right:true});assert(g.hero.jumpHeight>100);assert(g.hero.x>280);
advance(g,1,{jump:true});assert.equal(g.hero.jumpHeight,0,'holding jump cannot hover or auto-bounce');
step(g,{},.01);step(g,{jump:true},.01);assert(g.hero.jumpHeight>0,'release rearms jump');
g=quiet();advance(g,.5,{crouch:true,right:true});assert(g.hero.crouching);assert(Math.abs(g.hero.x-329.875)<.1,'crouch slows movement');
step(g,{},.01);assert(!g.hero.crouching,'release stands up');
for(const crouch of [false,true]){g=quiet();g.enemyShots.push({x:g.hero.x-20,y:447,vx:400,vy:0,life:1,damage:1});advance(g,.1,{crouch});assert.equal(g.hp,crouch?5:4,'crouch dodges chest shot');}
for(const jump of [false,true]){g=quiet();if(jump)advance(g,.25,{jump:true});g.enemyShots.push({x:g.hero.x,y:500,vx:0,vy:0,kind:'ground',radius:90,damage:2,spent:false,life:.2});step(g,{},.01);assert.equal(g.hp,jump?5:3,'jump dodges ground burst');}
g=quiet();g.hero.stoneTime=1;step(g,{jump:true,crouch:true,right:true},.05);assert.equal(g.hero.jumpHeight,0);assert.equal(g.hero.x,280);
g=quiet();jump(g);assert.equal(g.hero.verticalSpeed,650,'short taps start a jump immediately');jump(g);step(g,{},.05);assert(g.hero.jumpHeight>0);const airborne=g.hero.verticalSpeed;jump(g);assert.equal(g.hero.verticalSpeed,airborne,'no double jump');
for(const [id,kind,field] of [['jiangshuyan','kick','slowTime'],['choumo','punch','slipTime']]){g=createGame(id);g.monsters[0].x=480;g.monsters[0].attackCooldown=100;g.monsters[0].dodgeCooldown=100;attack(g,kind);advance(g,.5);assert(g.monsters[0][field]>0);advance(g,3);assert.equal(g.monsters[0][field],0);}
g=createGame('jiangshuyan');g.monsters[0].charge=.7;attack(g,'punch');advance(g,.6);assert.equal(g.monsters[0].charge,.7);advance(g,1.4);assert(g.monsters[0].charge<.7);
g=quiet('jiangshuyan');g.hero.x=60;g.hero.dir=-1;attack(g,'weapon');advance(g,.4);assert.equal(g.hero.x,44,'skate cannot leave stage');
for(const [index,form] of ['tiger','eagle','ape'].entries()){g=createGame('seven','wukong');const m=g.monsters[0];m.spellIndex=2;m.formIndex=index;m.attackCooldown=0;advance(g,1.1);assert.equal(m.form,form);advance(g,2.8);assert.equal(m.formTime,0);}
g=quiet('zhuqingqing');g.hp=4;attack(g,'weapon');assert.equal(g.hp,5,'heal capped at max');
g=quiet('tregear');g.hero.x=WIDTH-80;attack(g,'weapon');assert.equal(g.hero.x,WIDTH-44);assert(g.hero.invincible>0);
g=quiet('nexus');attack(g,'weapon');assert(g.hero.domainTime>0);assert(g.monsters[0].slowTime>0);advance(g,3.2);assert.equal(g.hero.domainTime,0);
g=quiet('seven','bemstar');g.monsters[0].shieldTime=1;g.monsters[0].absorbing=true;g.monsters[0].hp=5;g.monsters[0].x=400;shoot(g);advance(g,.2);assert.equal(g.monsters[0].hp,6,'Bemstar absorbs energy');
for(const enemy of Object.keys(ENEMIES)){g=createGame('seven',enemy);advance(g,150);assert.equal(g.status,'lost',`${enemy} can win`);const frozen=JSON.stringify(g);step(g,{},.1);assert.equal(JSON.stringify(g),frozen);}
assert.deepEqual([0,.25,.5,.75,1].map(n=>chooseWeather('random',n)),['sun','rain','storm','tornado','tornado']);
console.log(`PASS: ${checks} skills; 182 roster wins/restarts; all enemy skill warnings; damage/facing/cooldown; 14 loss paths; terminal freeze; jump/crouch collisions; stone/heal/blink/domain/absorption; weather.`);
