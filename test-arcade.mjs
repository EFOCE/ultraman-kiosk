import assert from 'node:assert/strict';
import {createGame,step,shoot,ENEMIES,MAX_HP,WIDTH} from './model.mjs';
import {KEY_ACTIONS,ATTACK_KEYS} from './combat-kit.mjs';
import {STAGES,createRun,campaignBattle,completeStage} from './campaign.mjs';
const advance=(g,n,input={})=>{for(let t=0;t<n;t+=.01)step(g,input,.01);};
assert.equal(WIDTH,1500);
assert.deepEqual(['KeyU','KeyI','KeyJ','KeyK'].map(k=>KEY_ACTIONS[k]),['fire','punch','kick','weapon']);
assert.deepEqual(Object.values(ATTACK_KEYS),['U','I','J','K']);
assert.equal(KEY_ACTIONS.KeyZ,undefined);
for(const id of Object.keys(ENEMIES)){
  const g=createGame('seven',id),m=g.monsters[0];m.x=g.hero.x;m.pauseTime=100;m.attackCooldown=100;
  advance(g,3);assert.equal(g.hp,MAX_HP,`${id}: overlapping alone cannot damage`);
}
let g=createGame('seven','kingjoe');let m=g.monsters[0];m.x=g.hero.x+130;m.strikeCooldown=0;m.attackCooldown=3;
step(g,{},.01);assert(m.closeStrike&&m.charge>0);assert.equal(g.hp,MAX_HP,'counter has warning');
advance(g,.5);assert(g.hp<MAX_HP,'active counter deals damage');
g=createGame('seven','baltan');m=g.monsters[0];m.x=g.hero.x+150;m.dodgeCooldown=0;m.attackCooldown=100;
shoot(g);step(g,{},.01);assert(m.verticalSpeed>0,'monster jumps to evade a projectile');
const run=createRun();assert.equal(STAGES.length,14);assert.equal(new Set(STAGES).size,14);
for(let i=0;i<STAGES.length;i++){
  const battle=campaignBattle(run,'boss');assert.equal(battle.enemyId,STAGES[i]);
  const unchanged=JSON.stringify(run);assert.equal(completeStage(run,battle),false);assert.equal(JSON.stringify(run),unchanged);
  battle.status='lost';assert.equal(completeStage(run,battle),false,'loss cannot advance');
  battle.status='won';battle.hp=2;assert(completeStage(run,battle));assert.equal(run.health,4);
  assert.equal(completeStage(run,battle),false,'same result cannot advance twice');
}
assert(run.cleared);assert.throws(()=>campaignBattle(run,'boss'));
assert.throws(()=>campaignBattle({...createRun(),stage:-1},'boss'));
assert.equal(createRun().stage,0,'new run resets progression');
console.log('PASS: UIJK input map; no passive contact damage for all 14 opponents; telegraphed active counter; AI dodge; 14-stage progression, recovery, loss, duplicate guards and reset.');
