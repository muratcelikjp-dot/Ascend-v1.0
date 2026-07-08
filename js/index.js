GameLoop.bootstrapDay();
let gs=GameState.get();

// If the ritual is already done today (e.g. user reloaded the page after
// breaking the seal), show a clear "already done" screen instead of
// leaving the shield visible and tappable — previously the shield stayed
// fully clickable even when already completed, which let a same-day
// re-tap instantly "break" it again (HP was already 0) and silently
// double-grant XP/skills/achievements/boss-damage a second time.
if(Shield.isTodayAlreadyDone(gs)){
  document.getElementById('main-content').style.display='none';
  document.getElementById('already-done-screen').style.display='flex';
}

const now=new Date();
const days=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const months=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const h=now.getHours();
document.getElementById('greeting').textContent=(h<12?'Good morning':h<17?'Good afternoon':'Good evening')+', Murat';
document.getElementById('day-title').textContent=days[now.getDay()];
document.getElementById('day-sub').textContent=months[now.getMonth()]+' '+now.getDate()+' · Day '+gs.streak+' of streak';

let hitCount=0;
let broken=false;

function updateHpBar(){
  const pct=Shield.getHpPercent(gs);
  const fill=document.getElementById('hp-fill');
  fill.style.width=pct+'%';
  fill.classList.toggle('healthy',pct>50);
  document.getElementById('hp-value').textContent=gs.shieldRitual.currentHp+' / '+gs.shieldRitual.maxHp;
}

function hitShield(evt){
  if(broken) return;
  if(Shield.isTodayAlreadyDone(gs)) return;
  hitCount++;

  let hitResult;
  gs=GameState.set(state=>{ hitResult=Shield.applyHit(state,hitCount); });

  updateHpBar();
  spawnDamagePopup(hitResult.damage,evt?evt.clientX:null,evt?evt.clientY:null);
  shakeShieldOnly(6+hitCount*2);
  shakeScreen(Math.min(hitCount,6));
  fireImpactRing();
  spawnSparks(4+Math.min(hitCount,6)*2);
  vibrate(hitResult.broken?[0,40,30,40,30,80]:30);

  const damagePct=100-Shield.getHpPercent(gs);
  const crackCount=Math.min(2+Math.floor(hitCount/1.5),5);
  const baseAngles=[-90,0,90,180,45,-45,135,-135];
  for(let i=0;i<crackCount;i++){
    spawnCrack(baseAngles[(hitCount*2+i)%baseAngles.length],14+damagePct*0.5);
  }
  tintShield(damagePct);

  if(hitResult.broken){
    broken=true;
    document.getElementById('hint').classList.remove('blinking');
    document.getElementById('hint').style.opacity='0';
    flashScreen();
    shakeScreen(9);
    vibrate([0,50,40,50,40,120]);
    setTimeout(()=>{ spawnShards(30); spawnSparks(22); },80);
    setTimeout(()=>{
      document.getElementById('main-content').style.display='none';
      const bs=document.getElementById('broken-screen');bs.style.display='flex';

      let ritualResult;
      gs=GameState.set(state=>{ ritualResult=Shield.completeRitual(state); });

      document.getElementById('b-streak-xp').textContent='+'+ritualResult.streakBonusXp+' XP';

      if(ritualResult.playerLeveledUp){
        document.getElementById('level-up-badge').innerHTML='<i class="ti ti-trophy" style="font-size:16px;color:var(--neon)"></i><span class="level-up-badge-text">Level '+ritualResult.newLevel+' reached</span>';
      }

      // Surface anything the ritual triggered beyond the base XP — this is
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
    },420);
  }
}

function enterQuestBoard(){
  window.location.href='quests.html';
}
