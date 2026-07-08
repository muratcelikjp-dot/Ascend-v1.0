function showAlreadyDoneScreen(){
  document.getElementById('main-content').style.display='none';
  document.getElementById('already-done-screen').style.display='flex';
}

function renderGreetingAndDate(state){
  const now=new Date();
  const days=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const months=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const h=now.getHours();
  document.getElementById('greeting').textContent=(h<12?'Good morning':h<17?'Good afternoon':'Good evening')+', Murat';
  document.getElementById('day-title').textContent=days[now.getDay()];
  document.getElementById('day-sub').textContent=months[now.getMonth()]+' '+now.getDate()+' · Day '+state.streak+' of streak';
}

function updateHpBar(){
  const pct=Shield.getHpPercent(gs);
  const fill=document.getElementById('hp-fill');
  fill.style.width=pct+'%';
  fill.classList.toggle('healthy',pct>50);
  document.getElementById('hp-value').textContent=gs.shieldRitual.currentHp+' / '+gs.shieldRitual.maxHp;
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

  // Surface anything the ritual triggered beyond the base XP - this is
  // the part that was previously missing: breaking the seal could
  // silently unlock a skill or damage the boss with zero feedback.
  const extraNotes=[];
  if(ritualResult.newSkills.length) extraNotes.push(ritualResult.newSkills.length+' new skill unlocked');
  if(ritualResult.bossDefeated) extraNotes.push('Boss defeated!');
  else if(ritualResult.bossDamageDealt>0) extraNotes.push('Dealt '+ritualResult.bossDamageDealt+' boss damage');
  if(ritualResult.newAchievements.length) extraNotes.push(ritualResult.newAchievements.length+' achievement unlocked');
  if(extraNotes.length){
    document.getElementById('b-sub').innerHTML='Your day has begun, warrior.<br>'+extraNotes.join(' · ');
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
