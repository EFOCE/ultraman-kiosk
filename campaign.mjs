import { createGame, MAX_HP } from './model.mjs';

export const STAGES=['gomora','buniu','baltan','grandma','kingjoe','bemstar','tyrant','tangseng','shumo','empera','belial','xingxing','zetton','wukong'];
export function createRun(){return {stage:0,health:MAX_HP,cleared:false};}
export function campaignBattle(run,hero){
  if(!Number.isInteger(run.stage)||run.stage<0||run.stage>=STAGES.length||run.cleared)throw new Error('Invalid campaign stage');
  const game=createGame(hero,STAGES[run.stage]);
  game.hp=Math.max(1,Math.min(MAX_HP,run.health));
  return game;
}
export function completeStage(run,game){
  if(run.cleared||game.status!=='won'||game.enemyId!==STAGES[run.stage])return false;
  run.health=Math.min(MAX_HP,game.hp+2);
  if(run.stage===STAGES.length-1)run.cleared=true;
  else run.stage++;
  return true;
}
