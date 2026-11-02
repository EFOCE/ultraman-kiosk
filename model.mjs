export const WIDTH = 1100;
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
  wukong: { name: '孙悟空', hp: 40, speed: 115, damage: 1, color: '#d6aa4e', chargeTime: 1.05, initialAttackCooldown: 1.8 }
};

export function createGame(heroId = 'ruebe', enemyId = 'empera') {
  if (!Object.hasOwn(ENEMIES, enemyId)) throw new Error('Unknown opponent');
  return { status: 'playing', time: 0, weather:'sun', weatherStartedAt:0, hp: MAX_HP, kills: 0, enemyId,
    hero: { id: heroId, x: 280, dir: 1, cooldown: 0, punchCooldown: 0, kickCooldown: 0, weaponCooldown: 0,
      action: '', actionTime: 0, invincible: 0, firing: 0, moving: false, skateTime: 0, skateDir: 1, moveTarget: null, transformTime: 0, wingTime: 0, blinkTime: 0, slowTime: 0 },
    monsters: [{ x: 910, hp: ENEMIES[enemyId].hp, id: enemyId, hit: 0,
      attackCooldown: ENEMIES[enemyId].initialAttackCooldown || 2.6, charge: 0, targetX: 280, pauseTime: 0, slowTime: 0, slipTime: 0, shieldTime: 0, spellIndex: 0, spell: '', flightTime: 0, burrowTime: 0, formTime: 0, form: '', formIndex: 0, skillEffectTime: 0, originX: 910 }],
    shots: [], enemyShots: [], sparks: [], hits: 0, actionSerial: 0, warnings: 0 };
}

function damageMonster(game, monster, damage, knockback, direction) {
  if (monster.shieldTime > 0 || monster.flightTime > 0 || monster.burrowTime > 0) return false;
  if(monster.formTime>0&&monster.form==='ape')damage=Math.max(1,damage-1);
  monster.hp = Math.max(0, monster.hp - damage); monster.hit = 0.16;
  monster.x = Math.max(30, Math.min(WIDTH - 30, monster.x + direction * knockback));
  game.hits++;
  game.sparks.push({ x: monster.x, life: 0.4, defeated: monster.hp === 0 });
  if (monster.hp === 0) game.kills++;
  return true;
}

// These two heroes reuse the four existing mouse slots with their own abilities.
function specialAttack(game, kind) {
  const h=game.hero, noa=h.id==='noa', cooldown=kind==='fire'?'cooldown':kind+'Cooldown';
  if(game.status!=='playing'||h[cooldown]>0||h.actionTime>0)return;
  h[cooldown]=(noa?{fire:6,punch:3.5,kick:2,weapon:1}:{fire:7,punch:0.9,kick:0.8,weapon:5})[kind];
  h.action=kind;h.actionTime=0.3;game.actionSerial++;
  if(kind==='fire'){
    if(noa){h.wingTime=1.2;h.invincible=Math.max(h.invincible,1.2);
      for(const m of game.monsters)if(m.hp>0&&Math.abs(m.x-h.x)<=150)damageMonster(game,m,1,100,Math.sign(m.x-h.x)||h.dir);
    }else{h.transformTime=2.2;h.invincible=Math.max(h.invincible,2.2);}
  }else if(noa&&kind==='punch'){
    const oldX=h.x;h.x=Math.max(44,Math.min(WIDTH-44,h.x+h.dir*210));h.moveTarget=null;h.skateTime=0;
    h.blinkTime=0.35;h.invincible=Math.max(h.invincible,0.35);game.sparks.push({x:oldX,life:0.35,kind:'blink'});
  }else if(noa&&kind==='kick'){
    const targets=game.monsters.filter(m=>m.hp>0&&(m.x-h.x)*h.dir>=-10&&(m.x-h.x)*h.dir<=480);
    const target=targets.sort((a,b)=>h.dir*(a.x-b.x))[0];
    const x=target?.x??Math.max(30,Math.min(WIDTH-30,h.x+h.dir*400));game.sparks.push({x,life:0.4,kind:'lightning'});
    if(target)damageMonster(game,target,3,18,h.dir);
  }else if(!noa&&kind==='punch'){
    for(const m of game.monsters)if(m.hp>0&&(m.x-h.x)*h.dir>=-10&&(m.x-h.x)*h.dir<=165)damageMonster(game,m,3,70,h.dir);
  }else{
    const bind=!noa&&kind==='weapon';
    game.shots.push({x:h.x+h.dir*8,y:bind?425:340,dir:h.dir,kind:bind?'bind':noa?'headmark':'headwave',damage:bind?1:2,speed:bind?500:620,range:bind?650:800});
  }
}

export function setMoveTarget(game, x) {
  if (game.status === 'playing' && Number.isFinite(x)) game.hero.moveTarget = Math.max(44,Math.min(WIDTH-44,x));
}

export function attack(game, kind) {
  if (!['punch', 'kick', 'weapon'].includes(kind)) return;
  const hero = game.hero;
  if(['noa','ruebe'].includes(hero.id)){specialAttack(game,kind);return;}
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
  if(['noa','ruebe'].includes(hero.id)){specialAttack(game,'fire');return;}
  if (game.status !== 'playing' || hero.cooldown > 0) return;
  game.shots.push({ x: hero.x + hero.dir * 35, dir: hero.dir });
  hero.cooldown = 0.25;
  hero.firing = 0.18;
}

export function step(game, input, dt) {
  if (game.status !== 'playing' || !Number.isFinite(dt) || dt <= 0) return;
  dt = Math.min(dt, 0.05);
  game.time += dt;
  const hero = game.hero;
  const manual = !!input.right || !!input.left;
  if (manual) hero.moveTarget = null;
  const delta = hero.moveTarget === null ? 0 : hero.moveTarget-hero.x;
  const move = manual ? Number(!!input.right)-Number(!!input.left) : Math.sign(delta);
  const skating = hero.skateTime > 0;
  hero.moving = move !== 0 || skating;
  if (move && !skating) hero.dir = move;
  const skatingDt = Math.min(dt, hero.skateTime);
  const speed=285*(hero.slowTime>0?0.3:1);
  const normalDistance = move * (hero.moveTarget === null ? speed*dt : Math.min(Math.abs(delta),speed*dt));
  const distance = skating ? hero.skateDir * 650 * skatingDt + move * 285 * (dt-skatingDt) : normalDistance;
  hero.x = Math.max(44, Math.min(WIDTH - 44, hero.x + distance));
  hero.skateTime = Math.max(0, hero.skateTime - dt);
  for(const status of ['transformTime','wingTime','blinkTime','slowTime'])hero[status]=Math.max(0,hero[status]-dt);
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
  for (const monster of game.monsters) {
    if (monster.hp <= 0) continue;
    const info = ENEMIES[monster.id];
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
          monster.spellIndex=(monster.spellIndex+1)%4;monster.attackCooldown=2.8;continue;
        }
        if(monster.id==='tangseng'){
          if(monster.spell==='shield')monster.shieldTime=1.3;
          else if(monster.spell==='wave')game.enemyShots.push({x:monster.x,y:495,vx:Math.sign(monster.targetX-monster.x)*360,vy:0,damage:1,kind:'wave',life:3.3});
          else game.enemyShots.push({x:monster.targetX,y:monster.spell==='chant'?410:500,vx:0,vy:0,damage:monster.spell==='chant'?1:2,kind:monster.spell,life:0.45,radius:monster.spell==='chant'?65:95,spent:false});
          monster.spellIndex=(monster.spellIndex+1)%4;monster.attackCooldown=3.2;
          continue;
        }
        const originY = info.shotKind === 'bug' ? 337 : 360;
        const dx = monster.targetX - monster.x, dy = 447-originY, distance = Math.hypot(dx, dy);
        const speed = info.shotSpeed || 390;
        game.enemyShots.push({ x: monster.x, y: originY, vx: dx / distance * speed, vy: dy / distance * speed, damage: info.shotDamage || 1, kind: info.shotKind || 'orb', life: 3 });
        monster.attackCooldown = info.shotCooldown || 3.2;
      }
    } else {
      const gap = Math.abs(hero.x - monster.x);
      const transformed=monster.formTime>0;
      const move = monster.id==='wukong'&&!transformed&&gap<165?0:info.ranged && gap < 260 ? -1 : info.ranged && gap <= 380 ? 0 : 1;
      const speed=info.speed*(transformed&&monster.form==='tiger'?1.5:1);
      monster.x = Math.max(30, Math.min(WIDTH - 30, monster.x + Math.sign(hero.x - monster.x) * speed * move * dt * (monster.slowTime > 0 ? 0.45 : 1)));
      monster.attackCooldown -= dt;
      if (monster.attackCooldown <= 0) { monster.charge = info.chargeTime || 0.85; monster.targetX = hero.x;
        if(monster.id==='tangseng')monster.spell=['chant','shield','wave','lotus'][monster.spellIndex];
        if(monster.id==='wukong')monster.spell=['fly','burrow','transform','staff'][monster.spellIndex];
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
      Math.min(oldX, shot.x) <= monster.x + 35 && Math.max(oldX, shot.x) >= monster.x - 35);
    targets.sort((a, b) => shot.dir * (a.x - b.x));
    if (targets.length) {
      const monster = targets[0];
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
    if(['chant','lotus','cloudstrike','eruption','staff'].includes(shot.kind)){
      if(!shot.spent&&Math.abs(hero.x-shot.x)<shot.radius&&hero.invincible===0){game.hp=Math.max(0,game.hp-shot.damage);hero.invincible=1.2;if(shot.kind==='chant')hero.slowTime=0.9;}
      shot.spent=true;shot.life-=dt;continue;
    }
    const oldX = shot.x, oldY = shot.y;
    shot.x += shot.vx * dt; shot.y += shot.vy * dt; shot.life -= dt;
    const dx = shot.x - oldX, dy = shot.y - oldY;
    const projection = Math.max(0, Math.min(1, ((hero.x - oldX) * dx + (447 - oldY) * dy) / (dx * dx + dy * dy || 1)));
    if (shot.kind==='wave' ? Math.min(oldX,shot.x)<=hero.x+30&&Math.max(oldX,shot.x)>=hero.x-30 : Math.hypot(oldX + dx * projection - hero.x, oldY + dy * projection - 447) < 32) {
      shot.life = 0;
      if (hero.invincible === 0) { game.hp = Math.max(0, game.hp - (shot.damage || 1)); hero.invincible = 1.2; }
    }
  }
  game.enemyShots = game.enemyShots.filter(shot => shot.life > 0 && shot.x > -40 && shot.x < WIDTH + 40 && shot.y < 560);
  for (const monster of game.monsters) {
    if(monster.flightTime>0||monster.burrowTime>0)continue;
    const ape=monster.formTime>0&&monster.form==='ape', tiger=monster.formTime>0&&monster.form==='tiger';
    if (Math.abs(monster.x - hero.x) < (ape?100:49) && hero.invincible === 0) {
      game.hp = Math.max(0, game.hp - (ape||tiger?2:ENEMIES[monster.id].damage));
      hero.invincible = 1.2;
      const away = Math.sign(hero.x - monster.x) || -hero.dir;
      hero.x = Math.max(44, Math.min(WIDTH - 44, hero.x + away * 35));
      monster.x = Math.max(30, Math.min(WIDTH - 30, monster.x - away * 65));
    }
  }
  game.sparks.forEach(spark => { spark.life -= dt; });
  game.sparks = game.sparks.filter(spark => spark.life > 0);
  if (game.hp <= 0) game.status = 'lost';
  else if (game.monsters.length === 0) game.status = 'won';
  if (game.status !== 'playing') hero.moveTarget = null;
}
