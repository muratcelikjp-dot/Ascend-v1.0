function showAlreadyDoneScreen(){
  const main=document.getElementById('main-content');
  if(main) main.style.display='';

  const alreadyDone=document.getElementById('already-done-screen');
  if(alreadyDone) alreadyDone.style.display='none';

  const screen=document.getElementById('screen-wrap');
  if(screen) screen.classList.add('seal-complete');

  const shield=document.getElementById('shield-wrap');
  if(shield) shield.setAttribute('aria-disabled','true');

  const hint=document.getElementById('hint');
  if(hint){
    hint.classList.remove('blinking');
    hint.textContent='Seal complete - missions ready';
  }
}

function renderGreetingAndDate(state){
  const now=new Date();
  const days=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const months=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const h=now.getHours();
  document.getElementById('greeting').textContent=(h<12?'Good morning':h<17?'Good afternoon':'Good evening')+', Murat';
  document.getElementById('day-title').textContent=days[now.getDay()];
  document.getElementById('day-sub').textContent=months[now.getMonth()]+' '+now.getDate()+' / Day '+state.streak+' of streak';
  renderCommandCenter(state);
}

function updateHpBar(){
  const pct=Shield.getHpPercent(gs);
  const fill=document.getElementById('hp-fill');
  fill.style.width=pct+'%';
  fill.classList.toggle('healthy',pct>50);
  document.getElementById('hp-value').textContent=gs.shieldRitual.currentHp+' / '+gs.shieldRitual.maxHp;
  renderCommandCenter(gs);
}

function setText(id,value){
  const el=document.getElementById(id);
  if(el) el.textContent=value;
}

function renderCommandCenter(state){
  if(!state) return;

  const progress=Leveling.progressWithinLevel(state.xp);
  const pct=Math.round((progress.xpIntoLevel/Math.max(1,progress.xpNeededForLevel))*100);
  const xpFill=document.getElementById('core-xp-fill');
  if(xpFill) xpFill.style.width=pct+'%';

  setText('core-level','LVL '+String(state.level).padStart(2,'0'));
  setText('core-streak',state.streak+' day'+(state.streak===1?'':'s'));
  setText('core-xp-text',progress.xpIntoLevel+' / '+progress.xpNeededForLevel);

  const sealDone=Shield.isTodayAlreadyDone(state);
  setText('core-seal-status',sealDone?'Seal complete':'Seal active');
  if(sealDone){
    const screen=document.getElementById('screen-wrap');
    if(screen) screen.classList.add('seal-complete');
  }

  const quests=(state.quests&&state.quests.active)||[];
  const nextQuest=quests.find(q=>!q.done)||quests[0];
  setText('core-main-quest',nextQuest?nextQuest.title:(quests.length?'All missions complete':'No mission deployed'));

  renderGrowthSummary(state);
  renderBattleSummary(state);
}

function renderGrowthSummary(state){
  const attrs=Object.keys(state.attributes||{}).map(id=>({id,...state.attributes[id]}));
  const best=attrs.sort((a,b)=>(b.level-a.level)||(b.xp-a.xp))[0];
  const bestLabel=best?best.id.charAt(0).toUpperCase()+best.id.slice(1):'Attributes';
  const unlocked=Skills.getTotalUnlockedCount(state);

  setText('growth-summary-title',best?'Strongest: '+bestLabel+' Lv '+best.level:'Character build online');
  setText('growth-summary-sub',unlocked+' skill'+(unlocked===1?'':'s')+' unlocked / skill points planned for later');
}

function renderBattleSummary(state){
  const boss=Bosses.getBossProgress(state);
  if(!boss){
    setText('battle-summary-title','Campaign complete');
    setText('battle-summary-sub','All current bosses defeated / loot vault ready');
    return;
  }

  const bossDef=SEED_DATA.bosses[boss.id];
  const firstWeakness=bossDef&&bossDef.damageRules&&bossDef.damageRules[0];
  let weakness='Weakness preview locked';
  if(firstWeakness){
    weakness=firstWeakness.matchType==='attribute'
      ? firstWeakness.match+' quests'
      : 'quests mentioning "'+firstWeakness.match+'"';
  }

  setText('battle-summary-title',boss.name+' / '+boss.pct+'% HP');
  setText('battle-summary-sub','Weakness: '+weakness+' / Loot: '+boss.rewards.xp+' XP');
}

function showBrokenScreenShell(){
  document.getElementById('main-content').style.display='none';
  const bs=document.getElementById('broken-screen');bs.style.display='flex';
}

function showBrokenResultScreen(ritualResult){
  document.getElementById('b-streak-xp').textContent='+'+ritualResult.streakBonusXp+' XP';

  if(ritualResult.playerLeveledUp){
    document.getElementById('level-up-badge').innerHTML='<i class="ti ti-trophy" style="font-size:16px;color:var(--neon)"></i><span class="level-up-badge-text">Level '+ritualResult.newLevel+' reached</span>';
  }

  // Surface anything the ritual triggered beyond the base XP, without
  // changing the ritual mechanics themselves.
  const extraNotes=[];
  if(ritualResult.newSkills.length) extraNotes.push(ritualResult.newSkills.length+' new skill unlocked');
  if(ritualResult.bossDefeated) extraNotes.push('Boss defeated!');
  else if(ritualResult.bossDamageDealt>0) extraNotes.push('Dealt '+ritualResult.bossDamageDealt+' boss damage');
  if(ritualResult.newAchievements.length) extraNotes.push(ritualResult.newAchievements.length+' achievement unlocked');
  if(extraNotes.length){
    document.getElementById('b-sub').innerHTML='Your day has begun, warrior.<br>'+extraNotes.join(' / ');
  }

  setTimeout(()=>document.getElementById('b-icon').classList.add('show'),60);
  setTimeout(()=>document.getElementById('b-title').classList.add('show'),220);
  setTimeout(()=>document.getElementById('b-sub').classList.add('show'),340);
  if(ritualResult.playerLeveledUp) setTimeout(()=>document.getElementById('level-up-badge').classList.add('show'),440);
  setTimeout(()=>document.getElementById('b-xp').classList.add('show'),560);
  setTimeout(()=>document.getElementById('b-btn').classList.add('show'),720);
}

function enterQuestBoard(){
  window.location.href='quests.html';
}
