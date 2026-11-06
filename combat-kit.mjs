// Names and signature techniques follow the sources in CHARACTER-SOURCES.md; numbers are game balance.
const s=(name,type,damage,cooldown,color,extra={})=>({name,type,damage,cooldown,color,...extra});
export const HERO_SKILLS={
  seven:{fire:s('艾梅利姆光线','beam',2,1.1,'#75e88e',{head:true}),punch:s('奥特手刀','melee',2,.55,'#e66656',{range:115}),kick:s('奥特飞踢','melee',3,1.3,'#ffb05e',{range:160}),weapon:s('头镖','blade',4,3,'#c7f3ff')},
  zero:{fire:s('集束赛罗射线','beam',4,2.8,'#66bdff'),punch:s('艾梅利姆切割','beam',2,1.2,'#9ef482',{head:true}),kick:s('赛罗飞踢','melee',4,2,'#ff6f59',{range:190}),weapon:s('赛罗双重头镖','blade',4,3.2,'#91e7ff',{double:true})},
  geed:{fire:s('毁灭爆裂','beam',5,3.4,'#d184ff'),punch:s('捷德拳击','melee',2,.55,'#c265dc',{range:115}),kick:s('捷德踢击','melee',3,1.4,'#a494fb',{range:160}),weapon:s('捷德屏障','shield',0,6,'#c5a5ff',{duration:1.6})},
  mebius:{fire:s('梦比姆射线','beam',4,2.8,'#ffca72'),punch:s('梦比姆光剑','melee',3,1.4,'#ffca72',{range:220}),kick:s('梦比优斯踢击','melee',3,1.2,'#ff785b',{range:160}),weapon:s('梦比姆切割','blade',2,1.1,'#ffeab0')},
  nexus:{fire:s('十字射线·风暴','beam',5,3.4,'#9ee4ff'),punch:s('奈克瑟斯武装','melee',3,1.3,'#b5e5ee',{range:180}),kick:s('奈克瑟斯踢击','melee',3,1.3,'#f08b77',{range:160}),weapon:s('美塔领域','domain',0,7,'#c699ef',{duration:3})},
  tregear:{fire:s('托雷拉·亚鲁帝加','lightning',4,3,'#a581f7'),punch:s('托雷吉亚爪击','melee',2,.65,'#c880ff',{range:135}),kick:s('托雷吉亚踢击','melee',3,1.4,'#73a9ee',{range:165}),weapon:s('托雷拉·苏拉','blink',0,4.5,'#a280f8',{range:260})},
  noa:{fire:s('闪电·诺亚','beam',6,4,'#fff0a6'),punch:s('诺亚地狱火','melee',5,2.4,'#ffab63',{range:190}),kick:s('诺亚踢击','melee',3,1.3,'#e4f8ff',{range:170}),weapon:s('诺亚之翼·穿梭','blink',0,5,'#b1eeff',{range:300})},
  ruebe:{fire:s('罗比姆光线','beam',4,2.8,'#f8ce70'),punch:s('罗布光轮斩','melee',3,1.4,'#f1c56b',{range:215}),kick:s('罗布踢击','melee',3,1.3,'#eaa27d',{range:165}),weapon:s('罗布漩涡爆裂','beam',6,4.5,'#efc76e',{vortex:true})},
  taro:{fire:s('斯特利姆光线','beam',5,3.2,'#a7f2b4'),punch:s('泰罗拳击','melee',2,.55,'#ed7466',{range:120}),kick:s('燕式飞踢','melee',4,2,'#ffab67',{range:185}),weapon:s('奥特炸弹','burst',6,7,'#ff9a46',{range:230})},
  zhuqingqing:{fire:s('青光星束','beam',3,1.8,'#82dbb3'),punch:s('守护光盾','shield',0,5,'#8ae8ce',{duration:1.5}),kick:s('青锋回旋','blade',3,2.2,'#69dbbf'),weapon:s('治愈星环','heal',0,9,'#89e6c3')},
  boss:{fire:s('黑洞牵引','gravity',4,4,'#879cff'),punch:s('时停领域','time',0,8,'#b6d2ff'),kick:s('反弹护盾','reflect',2,7,'#7febef'),weapon:s('轨道轰击','orbital',8,6,'#68c9ff')},
  jiangshuyan:{fire:s('星糖光波','beam',1,.65,'#ffb7d9'),punch:s('拖延作业','time',0,7,'#d9a8f4'),kick:s('黏液流星','slime',1,1.4,'#acd477'),weapon:s('冰晶滑步','skate',0,2.8,'#9ae1f3')},
  choumo:{fire:s('泡泡冲击','beam',1,.65,'#a2dced'),punch:s('眼泪水花','tears',1,5,'#8fd6ed'),kick:s('臭脚丫','melee',2,1.1,'#bad887',{range:145}),weapon:s('发射臭虫','bug',2,2.4,'#d2b16d')}
};
export const ENEMY_SKILLS={
  empera:[s('雷佐利姆光线','beam',2,3.6,'#a173c8'),s('重能量波','ground',2,3.8,'#8c81b6')],
  belial:[s('帝斯修姆光线','beam',2,3.2,'#ce588e'),s('终极战斗仪横扫','swipe',2,3.4,'#b783ef',{range:270})],
  gomora:[s('百万吨尾击','swipe',2,3,'#bda077',{range:260}),s('掘地突袭','burrow',2,3.6,'#c3a274')],
  baltan:[s('白色破坏光线','beam',1,2.8,'#9ed4ff'),s('分身幻影','clone',1,4,'#b7adf1')],
  zetton:[s('一兆度火球','orb',2,3.2,'#ffae50'),s('杰顿屏障','shield',0,3.8,'#93e0eb'),s('瞬间移动','teleport',0,3.4,'#af91df')],
  kingjoe:[s('破坏光线','beam',2,3.6,'#f5dc7c'),s('机械重拳','swipe',2,3.2,'#d9bd78',{range:170})],
  bemstar:[s('腹部吸收','absorb',0,4,'#a6d6b1'),s('角部光线','beam',1,3,'#a6dc95')],
  tyrant:[s('火焰喷射','beam',2,3.4,'#ffa36a'),s('铁锤锁链','swipe',2,3.4,'#b2c9d4',{range:310})],
  buniu:[s('牛角冲锋','dash',1,3.2,'#e6c798'),s('重蹄震波','wave',1,3,'#cda66a')],
  grandma:[s('飞拖鞋','blade',1,3,'#bb92d8'),s('热茶慢慢喝','slow',1,3.8,'#b8dca5')],
  shumo:[s('暗影臭虫','bug',1,2.8,'#ed6994'),s('红晶利爪','swipe',2,3.5,'#ef6787',{range:260}),s('暗影换位','teleport',0,3.5,'#b566c3')],
  xingxing:[s('流星雨','meteor',1,2.5,'#fb8f85'),s('石化凝视','stone',1,2.5,'#baa9d1'),s('伸长利爪','claw',2,2.5,'#eb6f9d'),s('飞行突袭','fly',2,2.5,'#e9a5e8')],
  wukong:[s('筋斗云','fly',2,2.8,'#f1ce80'),s('遁地','burrow',2,2.8,'#bf9d77'),s('七十二变','transform',0,2.8,'#d7b4e8'),s('金箍棒','staff',2,2.8,'#f2d27e')],
  tangseng:[s('紧箍咒','chant',1,3.2,'#edd094'),s('佛光护盾','shield',0,3.2,'#f5e5b3'),s('禅杖震波','wave',1,3.2,'#e1bd79'),s('莲花法阵','lotus',2,3.2,'#eac2d5')]
};
export const SKILL_KEYS=['fire','punch','kick','weapon'];
export function skillDescription(skill){
  const effects={swipe:'近身横扫，可跳跃躲开',ground:'锁定地面范围，可跳跃躲开',burrow:'遁地后从预警点突袭',clone:'幻影分身与三道光线',orb:'能量火球',teleport:'瞬移到对手附近',dash:'快速冲锋攻击',wave:'地面震波，可跳跃躲开',absorb:'吸收光线并恢复能量',slow:'命中减速',meteor:'三道流星雨',stone:'命中石化 1 秒',claw:'超远利爪横扫',fly:'飞行避开攻击，再俯冲落地',transform:'灵虎、雄鹰、巨猿轮流变身',staff:'金箍棒范围横扫',chant:'经文范围攻击与减速',lotus:'莲花法阵范围攻击',beam:'远程光线',lightning:'电弧穿击',blade:'回旋飞刃',melee:'近身攻击',shield:'限时防护',domain:'领域压制，减缓对手',blink:'向前穿梭，短暂保护',burst:'近身范围爆发',heal:'恢复 2 点能量',gravity:'拉近并定身',time:'暂停对手行动',reflect:'保护并反弹攻击',orbital:'延时范围轰击',slime:'减速 2.5 秒',tears:'水花使对手滑倒',bug:'召唤飞虫',skate:'快速滑行躲避'};
  return `${effects[skill.type]||'预警后释放的专属招式'}${skill.damage?' · 伤害 '+skill.damage:''} · 冷却 ${skill.cooldown} 秒`;
}

export const ATTACK_KEYS={fire:'U',punch:'I',kick:'J',weapon:'K'};
export const KEY_ACTIONS={ArrowLeft:'left',KeyA:'left',ArrowRight:'right',KeyD:'right',ArrowUp:'jump',KeyW:'jump',ArrowDown:'crouch',KeyS:'crouch',KeyU:'fire',KeyI:'punch',KeyJ:'kick',KeyK:'weapon'};
