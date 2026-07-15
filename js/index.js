GameLoop.bootstrapDay();
let gs=GameState.get();

let hitCount=0;
let broken=false;

initializeHomeGate(gs);

function hitShield(evt){
  if(broken) return;
  if(Shield.isTodayAlreadyDone(gs)) return;
  hitCount++;

  let hitResult;
  gs=GameState.set(state=>{ hitResult=Shield.applyHit(state,hitCount); });

  const impact=getShieldImpact(evt,hitCount);
  updateHpBar(gs);
  shakeShieldOnly(6+hitCount*2,impact);
  shakeScreen(Math.min(hitCount,6));
  fireImpactRing();
  spawnImpactBloom(impact);
  spawnSparks(4+Math.min(hitCount,6)*2,impact);
  vibrate(hitResult.broken?[0,40,30,40,30,80]:30);

  const damagePct=100-Shield.getHpPercent(gs);
  const crackCount=Math.min(2+Math.floor(hitCount/2),4);
  for(let i=0;i<crackCount;i++){
    spawnCrack(impact,16+damagePct*.38,i,crackCount);
  }
  tintShield(damagePct);

  if(hitResult.broken){
    broken=true;

    showBrokenScreenShell();
    flashScreen();
    shakeScreen(9);
    vibrate([0,50,40,50,40,120]);
    setTimeout(()=>{ spawnShards(30); spawnSparks(22); },80);
    setTimeout(()=>showBrokenResultScreen(),260);
  }
}

if(typeof window!=="undefined") window.hitShield=hitShield;
