GameLoop.bootstrapDay();
let gs=GameState.get();

// If the ritual is already done today (e.g. user reloaded the page after
// breaking the seal), show a clear "already done" screen instead of
// leaving the shield visible and tappable - previously the shield stayed
// fully clickable even when already completed, which let a same-day
// re-tap instantly "break" it again (HP was already 0) and silently
// double-grant XP/skills/achievements/boss-damage a second time.
if(Shield.isTodayAlreadyDone(gs)){
  showAlreadyDoneScreen();
}

renderGreetingAndDate(gs);

let hitCount=0;
let broken=false;

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
      showBrokenScreenShell();

      let ritualResult;
      gs=GameState.set(state=>{ ritualResult=Shield.completeRitual(state); });
      showBrokenResultScreen(ritualResult);
    },420);
  }
}
