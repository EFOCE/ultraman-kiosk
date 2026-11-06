import { HERO_SKILLS, ENEMY_SKILLS } from './combat-kit.mjs';
export const WIDTH = 1500;
export const MAX_HP = 5;
export const WEATHER_NAMES = { sun:'晴天', rain:'下雨', storm:'雷雨', tornado:'龙卷风' };
export function chooseWeather(choice, sample = Math.random()) {
  if (Object.hasOwn(WEATHER_NAMES,choice)) return choice;
  return Object.keys(WEATHER_NAMES)[Math.floor(Math.max(0,Math.min(0.999999,Number.isFinite(sample)?sample:0))*4)];
}
export const ENEMIES = {
  empera: { name: '安培拉星人', hp: 18, speed: 95, damage: 2, color: '#3c3e4a' },
  belial: { name: '贝利亚', hp: 24, speed: 110, damage: 2, color: '#393b43', ranged: true,
    initialAttackCooldown: 1.8, shotCooldown: 2.1, chargeTime: 1.05, shotSpeed: 430, shotDamage: 2 },
  gomora: { name: '哥莫拉', hp: 12, speed: 88, damage: 1, color: '#a98761' },
  tangseng: { name: '唐僧', hp: 18, speed: 76, damage: 1, color: '#d89657', chargeTime: 1.15 },
  baltan: { name: '巴尔坦星人', hp: 12, speed: 102, damage: 1, color: '#7b9aa5' },
  zetton: { name: '杰顿', hp: 16, speed: 80, damage: 2, color: '#354143' },
  buniu: { name: '布牛', hp: 12, speed: 88, damage: 1, color: '#eee4bf' },
  kingjoe: { name: '金古桥', hp: 16, speed: 70, damage: 2, color: '#c7b580' },
  bemstar: { name: '贝蒙斯坦', hp: 12, speed: 95, damage: 1, color: '#90937e' },
  tyrant: { name: '泰兰特', hp: 16, speed: 85, damage: 2, color: '#98a4a0' },
  grandma: { name: '奶奶怪兽', hp: 14, speed: 80, damage: 1, color: '#b497c1' },
  shumo: { name: '蒋书墨', hp: 16, speed: 92, damage: 1, color: '#26405f', shotKind: 'bug' },
  wukong: { name: '孙悟空', hp: 40, speed: 115, damage: 1, color: '#d6aa4e', chargeTime: 1.05, initialAttackCooldown: 1.8 },
  xingxing: { name: '星星', hp: 30, speed: 155, damage: 1, color: '#b72d59', chargeTime: 1.1, initialAttackCooldown: 2 }
};

export function createGame(heroId = 'ruebe', enemyId = 'empera') {
  if (!Object.hasOwn(HERO_SKILLS, heroId)) throw new Error('Unknown hero');
  if (!Object.hasOwn(ENEMIES, enemyId)) throw new Error('Unknown opponent');
  return { status: 'playing', time: 0, weather:'sun', weatherStartedAt:0, hp: MAX_HP, kills: 0, enemyId,
    hero: { id: heroId, x: 280, dir: 1, cooldown: 0, punchCooldown: 0, kickCooldown: 0, weaponCooldown: 0,
      action: '', actionTime: 0, invincible: 0, firing: 0, moving: false, moveVelocity: 0, poseCrouch: 0, landingTime: 0, skateTime: 0, skateDir: 1, moveTarget: null, transformTime: 0, wingTime: 0, blinkTime: 0, slowTime: 0, stoneTime: 0, mirrorTime: 0,
      jumpHeight: 0, verticalSpeed: 0, jumpHeld: false, crouching: false, domainTime: 0, skillName: '', skillColor: '#9ddcfa' },
    monsters: [{ x: 910, hp: ENEMIES[enemyId].hp, id: enemyId, hit: 0,
      attackCooldown: ENEMIES[enemyId].initialAttackCooldown || 2.6, charge: 0, targetX: 280, targetY:447, pauseTime: 0, slowTime: 0, slipTime: 0, shieldTime: 0, spellIndex: 0, spell: '', flightTime: 0, burrowTime: 0, formTime: 0, form: '', formIndex: 0, skillEffectTime: 0, originX: 910, moving: false, moveVelocity: 0, jumpHeight: 0, verticalSpeed: 0, crouching: false, poseCrouch: 0, dodgeCooldown: 2, strikeCooldown: 1.1, closeStrike: false }],
    shots: [], enemyShots: [], sparks: [], zones: [], defeated: null, hits: 0, actionSerial: 0, enemyActionSerial: 0, warnings: 0 };
}

function damageMonster(game, monster, damage, knockback, direction) {
  if (monster.shieldTime > 0 || monster.flightTime > 0 || monster.burrowTime > 0) return false;
  if(monster.formTime>0&&monster.form==='ape')damage=Math.max(1,damage-1);
  monster.hp = Math.max(0, monster.hp - damage); monster.hit = 0.16;
  monster.x = Math.max(30, Math.min(WIDTH - 30, monster.x + direction * knockback));
  game.hits++;
  game.sparks.push({ x: monster.x, life: 0.4, defeated: monster.hp === 0 });
  if (monster.hp === 0) { game.kills++; game.defeated = { ...monster }; }
  return true;
}

function catalogAttack(game,kind) {
  const h=game.hero, skill=HERO_SKILLS[h.id][kind], field=kind==='fire'?'cooldown':kind+'Cooldown';
  if(game.status!=='playing'||h.stoneTime>0||h[field]>0||h.actionTime>0)return;
  h[field]=skill.cooldown;h.action=kind;h.actionTime=.35;h.skillName=skill.name;h.skillColor=skill.color;game.actionSerial++;
  const y=(h.crouching?480:skill.head?345:415)-h.jumpHeight;
  game.sparks.push({x:h.x,y,kind:'cast',color:skill.color,life:.4,name:skill.name});
  if(['beam','blade','lightning'].includes(skill.type)){
    game.shots.push({x:h.x+h.dir*35,y,dir:h.dir,kind:skill.type,color:skill.color,damage:skill.damage,speed:skill.type==='blade'?630:1000,range:1100,double:skill.double,vortex:skill.vortex});
  }else if(skill.type==='melee'||skill.type==='burst'){
    for(const m of game.monsters){const d=(m.x-h.x)*h.dir;
      if(m.hp>0&&(skill.type==='burst'?Math.abs(d)<=skill.range:d>=-10&&d<=skill.range))damageMonster(game,m,skill.damage,kind==='kick'?100:35,h.dir);
    }
    if(skill.type==='burst')h.invincible=Math.max(h.invincible,.65);
    game.sparks.push({x:h.x+h.dir*(skill.type==='burst'?0:80),y:430-h.jumpHeight,kind:skill.type,color:skill.color,life:.4,radius:skill.range});
  }else if(skill.type==='shield'){h.invincible=Math.max(h.invincible,skill.duration);h.wingTime=skill.duration;}
  else if(skill.type==='blink'){
    game.sparks.push({x:h.x,kind:'blink',life:.4});if(h.id==='noa')h.wingTime=.5;h.x=Math.max(44,Math.min(WIDTH-44,h.x+h.dir*skill.range));h.moveTarget=null;h.invincible=Math.max(h.invincible,.4);h.blinkTime=.4;
  }else if(skill.type==='domain'){
    h.domainTime=skill.duration;game.monsters.forEach(m=>m.slowTime=Math.max(m.slowTime,skill.duration));
  }else if(skill.type==='heal'){game.hp=Math.min(MAX_HP,game.hp+2);game.sparks.push({x:h.x,y:420,kind:'heal',color:skill.color,life:1});}
}

function bossAttack(game, kind) {
  const h=game.hero, field=kind==='fire'?'cooldown':kind+'Cooldown';
  if(game.status!=='playing'||h.stoneTime>0||h[field]>0||h.actionTime>0)return;
  h[field]={fire:4,punch:8,kick:7,weapon:6}[kind];
  h.action=kind;h.actionTime=0.3;game.actionSerial++;
  if(kind==='fire'){
    for(const m of game.monsters)if(m.hp>0&&Math.abs(m.x-h.x)<=650){
      if(damageMonster(game,m,4,0,h.dir)) {m.x=Math.max(30,Math.min(WIDTH-30,h.x+(Math.sign(m.x-h.x)||h.dir)*165));m.pauseTime=Math.max(m.pauseTime,0.8);}
    }
    game.sparks.push({x:h.x,kind:'gravity',life:0.65});
  }else if(kind==='punch'){
    game.monsters.forEach(m=>m.pauseTime=Math.max(m.pauseTime,2));
    game.enemyShots=[];game.sparks.push({x:h.x,kind:'time',life:1});
  }else if(kind==='kick'){
    h.mirrorTime=2.2;h.invincible=Math.max(h.invincible,2.2);
  }else{
    const target=game.monsters.find(m=>m.hp>0);
    if(target)game.zones.push({x:target.x,delay:0.65,radius:145,damage:8});
  }
}

export function setMoveTarget(game, x) {
  if (game.status === 'playing' && Number.isFinite(x)) game.hero.moveTarget = Math.max(44,Math.min(WIDTH-44,x));
}
export function jump(game){
  const h=game.hero;
  if(game.status==='playing'&&h.stoneTime===0&&h.jumpHeight===0&&h.verticalSpeed===0){h.verticalSpeed=650;h.crouching=false;h.jumpHeld=true;}
}

export function attack(game, kind) {
  if (!['punch', 'kick', 'weapon'].includes(kind)) return;
  const hero = game.hero;
  if(hero.stoneTime>0)return;
  if(hero.id==='boss'){bossAttack(game,kind);return;}
  if(!['jiangshuyan','choumo'].includes(hero.id)){catalogAttack(game,kind);return;}
  if (game.status !== 'playing' || hero[kind + 'Cooldown'] > 0 || hero.actionTime > 0) return;
  if (hero.id === 'jiangshuyan') {
    hero[kind + 'Cooldown'] = kind === 'punch' ? 7 : kind === 'kick' ? 1.4 : 2.8;
    hero.action = kind; hero.actionTime = kind === 'weapon' ? 0.32 : 0.3; game.actionSerial++;
    if (kind === 'punch') game.monsters.forEach(monster => { if (monster.hp > 0) monster.pauseTime = 1.5; });
    else if (kind === 'kick') game.shots.push({x:hero.x+hero.dir*35, dir:hero.dir, kind:'slime', damage:1, speed:460});
    else { hero.skateTime = 0.32; hero.skateDir = hero.dir; hero.moveTarget = null; }
    return;
  }
  if (hero.id === 'choumo' && kind !== 'kick') {
    hero[kind + 'Cooldown'] = kind === 'punch' ? 5 : 2.4;
    hero.action = kind; hero.actionTime = 0.3; game.actionSerial++;
    if (kind === 'punch') game.shots.push({x:hero.x+hero.dir*14,y:387,dir:hero.dir,kind:'tears',damage:1,speed:560,range:300});
    else game.shots.push({x:hero.x+hero.dir*10,y:337,dir:hero.dir,kind:'bug',damage:2,speed:480});
    return;
  }
  hero[kind + 'Cooldown'] = kind === 'punch' ? 0.35 : kind === 'kick' ? 0.85 : 2.4;
  if (hero.id === 'choumo' && kind === 'kick') hero.kickCooldown = 1.1;
  hero.action = kind; hero.actionTime = kind === 'punch' ? 0.18 : 0.3; game.actionSerial++;
  if (kind === 'weapon') {
    game.shots.push({ x: hero.x + hero.dir * 35, dir: hero.dir, kind: 'weapon', damage: 4, speed: 540 });
    return;
  }
  const range = kind === 'punch' ? 105 : 145;
  for (const monster of game.monsters) {
    const distance = (monster.x - hero.x) * hero.dir;
    if (monster.hp > 0 && distance >= -10 && distance <= range) {
      const stinkyKick = hero.id === 'choumo' && kind === 'kick';
      damageMonster(game, monster, kind === 'punch' || stinkyKick ? 2 : 3, kind === 'punch' ? 16 : stinkyKick ? 180 : 110, hero.dir);
    }
  }
}

export function shoot(game) {
  const hero = game.hero;
  if(hero.stoneTime>0)return;
  if(hero.id==='boss'){bossAttack(game,'fire');return;}
  if(!['jiangshuyan','choumo'].includes(hero.id)){catalogAttack(game,'fire');return;}
  if (game.status !== 'playing' || hero.cooldown > 0) return;
  const skill=HERO_SKILLS[hero.id].fire;
  game.shots.push({ x: hero.x + hero.dir * 35, y:(hero.crouching?480:415)-hero.jumpHeight, dir: hero.dir,kind:'beam',color:skill.color });
  hero.cooldown = skill.cooldown;hero.skillName=skill.name;hero.skillColor=skill.color;
  hero.firing = 0.18;
}

export function step(game, input, dt) {
  if (game.status !== 'playing' || !Number.isFinite(dt) || dt <= 0) return;
  dt = Math.min(dt, 0.05);
  game.time += dt;
  const hero = game.hero;
  hero.crouching=!!input.crouch&&hero.jumpHeight===0&&hero.stoneTime===0;
  if(input.jump&&!hero.jumpHeld)jump(game);
  hero.jumpHeld=!!input.jump;
  if(hero.verticalSpeed!==0||hero.jumpHeight>0){
    hero.jumpHeight=Math.max(0,hero.jumpHeight+hero.verticalSpeed*dt-750*dt*dt);
    hero.verticalSpeed-=1500*dt;
    if(hero.jumpHeight===0){hero.verticalSpeed=0;hero.landingTime=.16;}
  }
  hero.poseCrouch+=(Number(hero.crouching)-hero.poseCrouch)*Math.min(1,dt*16);
  hero.landingTime=Math.max(0,hero.landingTime-dt);
  const heroCenterY=hero.crouching?482:447-hero.jumpHeight;
  const manual = !!input.right || !!input.left;
  if (manual) hero.moveTarget = null;
  const delta = hero.moveTarget === null ? 0 : hero.moveTarget-hero.x;
  const move = hero.stoneTime>0 ? 0 : manual ? Number(!!input.right)-Number(!!input.left) : Math.sign(delta);
  const skating = hero.skateTime > 0 && hero.stoneTime===0;
  hero.moving = move !== 0 || skating;
  const opponent=game.monsters.find(m=>m.hp>0);
  if(opponent&&Math.abs(opponent.x-hero.x)>5)hero.dir=Math.sign(opponent.x-hero.x);
  const skatingDt = Math.min(dt, hero.skateTime);
  const speed=285*(hero.slowTime>0?0.3:1)*(hero.crouching?0.35:1);
  const normalDistance = move * (hero.moveTarget === null ? speed*dt : Math.min(Math.abs(delta),speed*dt));
  const distance = skating ? hero.skateDir * 650 * skatingDt + move * 285 * (dt-skatingDt) : normalDistance;
  hero.moveVelocity=distance/dt;
  hero.x = Math.max(44, Math.min(WIDTH - 44, hero.x + distance));
  hero.skateTime = Math.max(0, hero.skateTime - dt);
  for(const status of ['transformTime','wingTime','blinkTime','slowTime','stoneTime','mirrorTime','domainTime'])hero[status]=Math.max(0,hero[status]-dt);
  if (hero.moveTarget !== null && Math.abs(hero.x-hero.moveTarget)<0.01) { hero.moveTarget=null;hero.moving=false; }
  hero.cooldown -= dt;
  hero.invincible = Math.max(0, hero.invincible - dt);
  hero.firing = Math.max(0, hero.firing - dt);
  hero.actionTime = Math.max(0, hero.actionTime - dt);
  if (hero.actionTime === 0) hero.action = '';
  for (const kind of ['punch', 'kick', 'weapon']) hero[kind + 'Cooldown'] = Math.max(0, hero[kind + 'Cooldown'] - dt);
  if (input.punch) attack(game, 'punch');
  else if (input.kick) attack(game, 'kick');
  else if (input.weapon) attack(game, 'weapon');
  if (input.fire) shoot(game);
  for(const zone of game.zones){
    zone.delay-=dt;
    if(zone.delay<=0){
      for(const m of game.monsters)if(m.hp>0&&Math.abs(m.x-zone.x)<=zone.radius)damageMonster(game,m,zone.damage,20,Math.sign(m.x-hero.x)||hero.dir);
      game.sparks.push({x:zone.x,kind:'orbital',life:0.65});
    }
  }
  game.zones=game.zones.filter(zone=>zone.delay>0);
  for (const monster of game.monsters) {
    if (monster.hp <= 0) continue;
    const info = ENEMIES[monster.id];
    monster.moving=false;monster.moveVelocity=0;
    monster.strikeCooldown=Math.max(0,monster.strikeCooldown-dt);
    monster.dodgeCooldown=Math.max(0,monster.dodgeCooldown-dt);
    monster.crouching=false;
    if(monster.jumpHeight>0||monster.verticalSpeed!==0){monster.jumpHeight=Math.max(0,monster.jumpHeight+monster.verticalSpeed*dt-750*dt*dt);monster.verticalSpeed-=1500*dt;if(!monster.jumpHeight)monster.verticalSpeed=0;}
    const incoming=game.shots.find(s=>!s.used&&Math.abs(s.x-monster.x)<230&&(monster.x-s.x)*s.dir>0);
    if(incoming&&!monster.charge&&!monster.pauseTime&&!monster.flightTime&&!monster.burrowTime){
      if(monster.dodgeCooldown===0&&monster.jumpHeight===0){monster.verticalSpeed=540;monster.dodgeCooldown=3.6;}
      else if(monster.jumpHeight===0&&monster.dodgeCooldown<2.8)monster.crouching=true;
    }
    monster.poseCrouch+=(Number(monster.crouching)-monster.poseCrouch)*Math.min(1,dt*16);
    monster.hit = Math.max(0, monster.hit - dt);
    monster.slowTime = Math.max(0, monster.slowTime - dt);
    monster.slipTime = Math.max(0, monster.slipTime - dt);
    monster.shieldTime = Math.max(0, monster.shieldTime - dt);
    monster.formTime=Math.max(0,monster.formTime-dt);
    monster.skillEffectTime=Math.max(0,monster.skillEffectTime-dt);
    if(monster.formTime===0)monster.form='';
    if (monster.pauseTime > 0) { monster.pauseTime = Math.max(0, monster.pauseTime - dt); continue; }
    if(monster.flightTime>0||monster.burrowTime>0){
      const flight=monster.flightTime>0, field=flight?'flightTime':'burrowTime';
      monster[field]=Math.max(0,monster[field]-dt);
      if(monster.id==='xingxing'&&flight)monster.x=Math.max(30,Math.min(WIDTH-30,monster.x+Math.sign(monster.targetX-monster.x)*260*dt));
      if(!flight)monster.x=monster.originX+(monster.targetX-monster.originX)*(1-monster.burrowTime/1.1);
      if(monster[field]===0){
        game.enemyShots.push({x:monster.targetX,y:500,vx:0,vy:0,kind:flight?'cloudstrike':'eruption',radius:flight?85:75,damage:2,life:0.45,spent:false});
        monster.skillEffectTime=0.45;
      }
      continue;
    }
    if (monster.charge > 0) {
      monster.charge = Math.max(0, monster.charge - dt);
      if (monster.charge === 0) {
        game.enemyActionSerial++;
        monster.skillEffectTime=.32;
        if(monster.closeStrike){
          const direction=Math.sign(monster.targetX-monster.x)||-1;
          game.enemyShots.push({x:monster.x+direction*75,y:447,vx:0,vy:0,kind:'swipe',radius:110,damage:info.damage,color:'#ffc486',life:.3,spent:false});
          monster.closeStrike=false;monster.strikeCooldown=1.5;continue;
        }
        if(monster.id==='xingxing'){
          if(monster.spell==='meteor'){
            for(const offset of [-110,0,110])game.enemyShots.push({x:Math.max(35,Math.min(WIDTH-35,monster.targetX+offset)),y:90,vx:0,vy:420,kind:'meteor',damage:1,life:1.3});
          }else if(monster.spell==='stone'){
            game.enemyShots.push({x:monster.targetX,y:447,vx:0,vy:0,kind:'stone',radius:65,damage:1,life:0.45,spent:false});
          }else if(monster.spell==='claw'){
            const dir=Math.sign(monster.targetX-monster.x)||-1;
            game.enemyShots.push({x:monster.x+dir*170,y:447,vx:0,vy:0,kind:'claw',radius:170,damage:2,life:0.45,spent:false});
          }else monster.flightTime=1.2;
          monster.spellIndex=(monster.spellIndex+1)%4;monster.attackCooldown=2.5*.74;continue;
        }
        if(monster.id==='wukong'){
          if(monster.spell==='fly')monster.flightTime=1.2;
          else if(monster.spell==='burrow'){monster.burrowTime=1.1;monster.originX=monster.x;}
          else if(monster.spell==='transform'){
            monster.form=['tiger','eagle','ape'][monster.formIndex];monster.formIndex=(monster.formIndex+1)%3;monster.formTime=2.6;
            if(monster.form==='eagle'){
              const dx=monster.targetX-monster.x,dy=95,distance=Math.hypot(dx,dy);
              game.enemyShots.push({x:monster.x,y:352,vx:dx/distance*440,vy:dy/distance*440,damage:1,kind:'feather',life:3});
            }
          }else{
            const dir=Math.sign(monster.targetX-monster.x)||-1;
            game.enemyShots.push({x:monster.x+dir*115,y:447,vx:0,vy:0,kind:'staff',radius:115,damage:2,life:0.4,spent:false});monster.skillEffectTime=0.4;
          }
          monster.spellIndex=(monster.spellIndex+1)%4;monster.attackCooldown=2.8*.74;continue;
        }
        if(monster.id==='tangseng'){
          if(monster.spell==='shield')monster.shieldTime=1.3;
          else if(monster.spell==='wave')game.enemyShots.push({x:monster.x,y:495,vx:Math.sign(monster.targetX-monster.x)*360,vy:0,damage:1,kind:'wave',life:3.3});
          else game.enemyShots.push({x:monster.targetX,y:monster.spell==='chant'?410:500,vx:0,vy:0,damage:monster.spell==='chant'?1:2,kind:monster.spell,life:0.45,radius:monster.spell==='chant'?65:95,spent:false});
          monster.spellIndex=(monster.spellIndex+1)%4;monster.attackCooldown=3.2*.74;
          continue;
        }
        const kit=ENEMY_SKILLS[monster.id], skill=kit[monster.spellIndex%kit.length];
        const dir=Math.sign(monster.targetX-monster.x)||-1;
        const common={color:skill.color,damage:skill.damage,life:3,kind:skill.type};
        if(['shield','absorb'].includes(skill.type)){monster.shieldTime=1.5;monster.absorbing=skill.type==='absorb';}
        else if(skill.type==='burrow'){monster.burrowTime=1.1;monster.originX=monster.x;}
        else if(skill.type==='teleport'){monster.x=Math.max(60,Math.min(WIDTH-60,monster.targetX-dir*210));monster.skillEffectTime=.6;}
        else if(['swipe','ground'].includes(skill.type)){
          const radius=skill.type==='swipe'?skill.range/2:90;
          game.enemyShots.push({...common,x:skill.type==='swipe'?monster.x+dir*radius:monster.targetX,y:skill.type==='swipe'?447:500,vx:0,vy:0,radius,life:.45,spent:false});
        }else if(skill.type==='dash'){
          monster.x=Math.max(30,Math.min(WIDTH-30,monster.x+dir*Math.min(260,Math.abs(monster.targetX-monster.x))));monster.skillEffectTime=.4;
          game.enemyShots.push({...common,x:monster.x,y:447,vx:0,vy:0,kind:'swipe',radius:85,life:.3,spent:false});
        }else{
          if(skill.type==='clone')monster.skillEffectTime=.9;
          const sourceY=skill.type==='wave'?495:skill.type==='bug'?337:monster.id==='bemstar'||monster.id==='kingjoe'?350:430;
          const targetY=skill.type==='wave'?495:monster.targetY;
          const dx=monster.targetX-monster.x,dy=targetY-sourceY,distance=Math.hypot(dx,dy)||1;
          for(const offset of skill.type==='clone'?[-50,0,50]:[0])game.enemyShots.push({...common,x:monster.x,y:sourceY+offset,vx:dx/distance*400,vy:dy/distance*400,slow:skill.type==='slow'});
        }
        monster.attackCooldown=skill.cooldown*.74;monster.spellIndex=(monster.spellIndex+1)%kit.length;
      }
    } else {
      const gap = Math.abs(hero.x - monster.x);
      const transformed=monster.formTime>0;
      const kit=ENEMY_SKILLS[monster.id],nextSkill=kit[monster.spellIndex%kit.length];
      const ranged=!['swipe','dash','staff','claw'].includes(nextSkill.type);
      const preferred=ranged?300:140;
      const move=gap<95?-1:gap>preferred?1:0;
      const speed=info.speed*1.35*(transformed&&monster.form==='tiger'?1.5:1)*(monster.crouching?.4:1);
      const velocity=Math.sign(hero.x-monster.x)*speed*move*(monster.slowTime>0?.45:1);
      monster.moving=move!==0;monster.moveVelocity=velocity;
      monster.x=Math.max(30,Math.min(WIDTH-30,monster.x+velocity*dt));
      if(gap<210&&monster.strikeCooldown===0&&monster.attackCooldown>.65){
        monster.charge=.48;monster.closeStrike=true;monster.targetX=hero.x;monster.targetY=heroCenterY;monster.skillName='近身反击';monster.spell='swipe';game.warnings++;continue;
      }
      monster.attackCooldown -= dt;
      if (monster.attackCooldown <= 0) { monster.charge = info.chargeTime || 0.85; monster.targetX = hero.x;monster.targetY=heroCenterY;
        const skill=ENEMY_SKILLS[monster.id][monster.spellIndex%ENEMY_SKILLS[monster.id].length];monster.spell=skill.type;monster.skillName=skill.name;monster.skillColor=skill.color;
        if(monster.id==='tangseng')monster.spell=['chant','shield','wave','lotus'][monster.spellIndex];
        if(monster.id==='wukong')monster.spell=['fly','burrow','transform','staff'][monster.spellIndex];
        if(monster.id==='xingxing')monster.spell=['meteor','stone','claw','fly'][monster.spellIndex];
        game.warnings++; }
    }
  }
  for (const shot of game.shots) {
    const oldX = shot.x;
    const travel = Math.min((shot.speed || 820) * dt, shot.range ?? Infinity);
    shot.x += shot.dir * travel;
    if (shot.range !== undefined) shot.range = Math.max(0,shot.range-travel);
    if (shot.kind === 'bug' || shot.kind === 'tears') shot.y = Math.min(447, shot.y + 150 * dt);
    if (shot.kind === 'headmark' || shot.kind === 'headwave') shot.y = Math.min(430,shot.y+100*dt);
    const targets = game.monsters.filter(monster => monster.hp > 0 &&
      !(monster.jumpHeight>70&&(!shot.y||shot.y>400-monster.jumpHeight)) && !(monster.crouching&&shot.y<460) &&
      Math.min(oldX, shot.x) <= monster.x + 35 && Math.max(oldX, shot.x) >= monster.x - 35);
    targets.sort((a, b) => shot.dir * (a.x - b.x));
    if (targets.length) {
      const monster = targets[0];
      if(monster.absorbing&&monster.shieldTime>0){monster.hp=Math.min(ENEMIES[monster.id].hp,monster.hp+1);shot.used=true;continue;}
      if(damageMonster(game, monster, shot.damage || 1, shot.kind === 'weapon' ? 45 : 7, shot.dir)){
        if (shot.kind === 'slime') monster.slowTime = 2.5;
        if (shot.kind === 'tears') { monster.pauseTime = Math.max(monster.pauseTime,0.9); monster.slipTime = 0.9; }
        if (shot.kind === 'bind') monster.pauseTime = Math.max(monster.pauseTime,1.3);
      }
      shot.used = true;
    }
  }
  game.shots = game.shots.filter(shot => !shot.used && shot.range !== 0 && shot.x > -40 && shot.x < WIDTH + 40);
  game.monsters = game.monsters.filter(monster => monster.hp > 0);
  for (const shot of game.enemyShots) {
    if(hero.mirrorTime>0&&!shot.spent&&Math.abs(hero.x-shot.x)<(shot.radius||60)){
      const target=game.monsters.find(m=>m.hp>0);
      if(target)damageMonster(game,target,2,15,Math.sign(target.x-hero.x)||hero.dir);
      shot.spent=true;shot.life=0;game.sparks.push({x:hero.x,kind:'reflect',life:0.4});continue;
    }
    if(['chant','lotus','cloudstrike','eruption','staff','stone','claw','swipe','ground'].includes(shot.kind)){
      if(!shot.spent&&Math.abs(hero.x-shot.x)<shot.radius&&hero.jumpHeight<80&&hero.invincible===0){game.hp=Math.max(0,game.hp-shot.damage);hero.invincible=1.2;if(shot.kind==='chant')hero.slowTime=0.9;if(shot.kind==='stone'){hero.stoneTime=1;hero.skateTime=0;hero.moveTarget=null;}}
      shot.spent=true;shot.life-=dt;continue;
    }
    const oldX = shot.x, oldY = shot.y;
    shot.x += shot.vx * dt; shot.y += shot.vy * dt; shot.life -= dt;
    const dx = shot.x - oldX, dy = shot.y - oldY;
    const projection = Math.max(0, Math.min(1, ((hero.x - oldX) * dx + (heroCenterY - oldY) * dy) / (dx * dx + dy * dy || 1)));
    if (shot.kind==='wave' ? hero.jumpHeight<55&&Math.min(oldX,shot.x)<=hero.x+30&&Math.max(oldX,shot.x)>=hero.x-30 : Math.hypot(oldX + dx * projection - hero.x, oldY + dy * projection - heroCenterY) < (hero.crouching?24:32)) {
      shot.life = 0;
      if (hero.invincible === 0) { game.hp = Math.max(0, game.hp - (shot.damage || 1)); hero.invincible = 1.2;if(shot.slow)hero.slowTime=1.5; }
    }
  }
  game.enemyShots = game.enemyShots.filter(shot => shot.life > 0 && shot.x > -40 && shot.x < WIDTH + 40 && shot.y < 560);
  game.sparks.forEach(spark => { spark.life -= dt; });
  game.sparks = game.sparks.filter(spark => spark.life > 0);
  game.monsters = game.monsters.filter(monster => monster.hp > 0);
  if (game.hp <= 0) game.status = 'lost';
  else if (game.monsters.length === 0) game.status = 'won';
  if (game.status !== 'playing') hero.moveTarget = null;
}
