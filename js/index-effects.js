function vibrate(pattern){
  if(navigator.vibrate){
    try{ navigator.vibrate(pattern); }catch(e){ /* unsupported on this device, fail silently */ }
  }
}

function flashScreen(){
  const f=document.getElementById('flash');
  f.classList.remove('fire');void f.offsetWidth;f.classList.add('fire');
}

function shakeScreen(intensity){
  const wrap=document.getElementById('screen-wrap');
  wrap.classList.remove('shaking');void wrap.offsetWidth;
  wrap.style.animationDuration=(0.25+intensity*0.05)+'s';
  wrap.classList.add('shaking');
}

function fireImpactRing(){
  const ring=document.getElementById('impact-ring');
  ring.classList.remove('fire');void ring.offsetWidth;ring.classList.add('fire');
}

function fireConstellationRipple(){
  const gate=document.getElementById('screen-wrap');
  const stage=document.getElementById('constellation-stage');
  if(!gate||!stage) return;
  gate.classList.remove('wave-fired');
  void stage.offsetWidth;
  gate.classList.add('wave-fired');
}

let energyCoreWakeTimer=null;
let energyCoreReactionTimer=null;
let homeFeedTimer=null;
let homeFeedMotionTimers=[];

const HOME_FEED_SOURCES={
  quest:{node:'quests',motion:'M99 196 C119 220 145 247 177 265',path:'#d9f2f7',bright:'#ffffff',mid:'#d9f2f7',deep:'#4f9db8',rgb:'125,227,255',angle:'32deg',pullX:'-2.7px',pullY:'-1.8px',halfX:'-1.8px',halfY:'-1.2px',coreFilter:'brightness(1.56) drop-shadow(0 0 10px rgba(230,253,255,.82))'},
  rewards:{node:'rewards',motion:'M104 375 C121 349 145 317 178 296',path:'#f7c948',bright:'#fffbed',mid:'#f7c948',deep:'#a96f0c',rgb:'247,201,72',angle:'-36deg',pullX:'-2.7px',pullY:'2px',halfX:'-1.8px',halfY:'1.3px',coreFilter:'brightness(1.14) sepia(.92) saturate(3.2) hue-rotate(350deg) drop-shadow(0 0 11px rgba(247,201,72,.82))'},
  hero:{node:'hero',motion:'M195 140 C204 176 188 219 195 257',path:'#7cc8ff',bright:'#f5fbff',mid:'#9bd5ff',deep:'#397eb6',rgb:'124,200,255',angle:'90deg',pullX:'0px',pullY:'-2.8px',halfX:'0px',halfY:'-1.8px',coreFilter:'brightness(1.38) saturate(1.35) drop-shadow(0 0 11px rgba(124,200,255,.8))'},
  skill:{node:'skill',motion:'M291 196 C271 220 245 247 213 265',path:'#9aa7ff',bright:'#f7f3ff',mid:'#b8abff',deep:'#6558ba',rgb:'154,167,255',angle:'148deg',pullX:'2.7px',pullY:'-1.8px',halfX:'1.8px',halfY:'-1.2px',coreFilter:'brightness(1.3) saturate(1.6) hue-rotate(32deg) drop-shadow(0 0 11px rgba(154,167,255,.82))'},
  boss:{node:'boss',motion:'M195 414 C202 385 188 344 195 303',path:'#ff6f9a',bright:'#fff4f7',mid:'#ff8bab',deep:'#b8325e',rgb:'255,111,154',angle:'-90deg',pullX:'0px',pullY:'2.8px',halfX:'0px',halfY:'1.8px',coreFilter:'brightness(1.24) sepia(.25) saturate(2.3) hue-rotate(292deg) drop-shadow(0 0 11px rgba(255,111,154,.82))'},
  stats:{node:'stats',motion:'M286 375 C269 349 245 317 212 296',path:'#41e6c4',bright:'#effffb',mid:'#75f0d4',deep:'#168b75',rgb:'65,230,196',angle:'-144deg',pullX:'2.7px',pullY:'2px',halfX:'1.8px',halfY:'1.3px',coreFilter:'brightness(1.3) saturate(1.55) hue-rotate(92deg) drop-shadow(0 0 11px rgba(65,230,196,.8))'}
};

function wakeEnergyCore(){
  const gate=document.getElementById('screen-wrap');
  if(!gate) return;
  gate.classList.remove('is-core-waking');
  void gate.offsetWidth;
  gate.classList.add('is-core-waking');
  clearTimeout(energyCoreWakeTimer);
  energyCoreWakeTimer=setTimeout(()=>gate.classList.remove('is-core-waking'),1450);
}

function pulseEnergyCore(){
  const core=document.getElementById('energy-core');
  if(!core||core.getAttribute('aria-disabled')==='true') return;
  core.classList.remove('is-core-reacting');
  void core.offsetWidth;
  core.classList.add('is-core-reacting');
  clearTimeout(energyCoreReactionTimer);
  energyCoreReactionTimer=setTimeout(()=>core.classList.remove('is-core-reacting'),680);
}

function clearHomeFeedState(gate){
  homeFeedMotionTimers.forEach(timer=>clearTimeout(timer));
  homeFeedMotionTimers=[];
  gate.classList.remove('home-feed-active','home-feed-reduced','home-feed-fallback');
  Object.values(HOME_FEED_SOURCES).forEach(config=>gate.classList.remove('feed-source-'+config.node));
  const packet=document.getElementById('home-energy-packet');
  if(packet) packet.setAttribute('opacity','0');
}

function playHomeFeedEvent(event,reducedMotion){
  const gate=document.getElementById('screen-wrap');
  const config=event&&HOME_FEED_SOURCES[event.source];
  if(!gate||!config) return 0;
  const isStrong=Number(event.strength)>=2||Number(event.count)>=2||Number(event.waves)>=3;
  const pulseCount=Math.max(1,Math.min(6,Number(event.count)||1));
  clearHomeFeedState(gate);
  gate.style.setProperty('--home-feed-color',config.path);
  gate.style.setProperty('--home-feed-bright',config.bright);
  gate.style.setProperty('--home-feed-mid',config.mid);
  gate.style.setProperty('--home-feed-deep',config.deep);
  gate.style.setProperty('--home-feed-rgb',config.rgb);
  gate.style.setProperty('--home-feed-reach-angle',config.angle);
  gate.style.setProperty('--home-feed-pull-x',config.pullX);
  gate.style.setProperty('--home-feed-pull-y',config.pullY);
  gate.style.setProperty('--home-feed-half-x',config.halfX);
  gate.style.setProperty('--home-feed-half-y',config.halfY);
  gate.style.setProperty('--home-feed-core-filter',config.coreFilter);
  gate.style.setProperty('--home-feed-packet-glow',isStrong?'1':'.82');
  const motion=document.getElementById('home-energy-motion');
  const radius=document.getElementById('home-energy-radius');
  const opacity=document.getElementById('home-energy-opacity');
  const brightStop=document.getElementById('home-energy-stop-bright');
  const midStop=document.getElementById('home-energy-stop-mid');
  const deepStop=document.getElementById('home-energy-stop-deep');
  if(motion) motion.setAttribute('path',config.motion);
  if(radius) radius.setAttribute('values',isStrong?'4;8;9;6.8;1':'3;7;7.8;5.8;1');
  if(brightStop) brightStop.setAttribute('stop-color',config.bright);
  if(midStop) midStop.setAttribute('stop-color',config.mid);
  if(deepStop) deepStop.setAttribute('stop-color',config.deep);
  void gate.offsetWidth;
  gate.classList.add('feed-source-'+config.node,reducedMotion?'home-feed-reduced':'home-feed-active');
  if(!reducedMotion){
    const pulseInterval=2050;
    for(let pulseIndex=0;pulseIndex<pulseCount;pulseIndex++){
      const pulseDelay=800+(pulseIndex*pulseInterval);
      const motionTimer=setTimeout(()=>{
        let started=false;
        [motion,radius,opacity].forEach(animation=>{
          if(animation&&typeof animation.beginElement==='function'){
            animation.beginElement();
            started=true;
          }
        });
        if(!started){
          gate.classList.remove('home-feed-fallback');
          void gate.offsetWidth;
          gate.classList.add('home-feed-fallback');
        }
      },pulseDelay);
      const arrivalTimer=setTimeout(()=>pulseEnergyCore(),pulseDelay+1850);
      homeFeedMotionTimers.push(motionTimer,arrivalTimer);
    }
  }
  const duration=reducedMotion?900:Math.max(5200,3400+((pulseCount-1)*2050));
  clearTimeout(homeFeedTimer);
  homeFeedTimer=setTimeout(()=>clearHomeFeedState(gate),duration);
  return duration;
}

function playQuestFeedWaves(waves){
  return playHomeFeedEvent({source:'quest',strength:Number(waves)>=3?2:1},false);
}

function spawnDamagePopup(damage,tapX,tapY){
  const wrap=document.getElementById('shield-wrap');
  const p=document.createElement('div');
  p.className='dmg-popup';
  p.textContent='-'+damage;
  const rect=wrap.getBoundingClientRect();
  const localX=tapX!=null?tapX-rect.left:rect.width/2;
  const localY=tapY!=null?tapY-rect.top:rect.height/2;
  p.style.left=localX+'px';p.style.top=localY+'px';
  p.style.setProperty('--dx',(Math.random()*40-20).toFixed(0)+'px');
  wrap.appendChild(p);
  requestAnimationFrame(()=>p.classList.add('fire'));
  setTimeout(()=>p.remove(),750);
}

function getShieldImpact(event,sequence){
  const shield=document.getElementById('shield-body');
  const rect=shield.getBoundingClientRect();
  const hasPointer=event&&Number.isFinite(event.clientX)&&Number.isFinite(event.clientY)&&
    event.clientX>=rect.left&&event.clientX<=rect.right&&event.clientY>=rect.top&&event.clientY<=rect.bottom;
  let dx,dy,rawX,rawY;

  if(hasPointer){
    rawX=(event.clientX-rect.left)/rect.width*200;
    rawY=(event.clientY-rect.top)/rect.height*200;
    dx=Math.max(-1,Math.min(1,(rawX-100)/100));
    dy=Math.max(-1,Math.min(1,(rawY-100)/100));
  }else{
    const fallbackAngles=[-35,35,145,-145,-90,90];
    const angle=fallbackAngles[(Math.max(1,sequence)-1)%fallbackAngles.length]*Math.PI/180;
    dx=Math.cos(angle)*.56;
    dy=Math.sin(angle)*.56;
    rawX=100+dx*74;
    rawY=100+dy*78;
  }

  const y=Math.max(18,Math.min(180,rawY));
  let halfWidth;
  if(y<44) halfWidth=20+Math.max(0,(y-14)/30)*54;
  else if(y<=104) halfWidth=74;
  else halfWidth=Math.max(8,74-((y-104)/82)*66);
  const x=Math.max(100-halfWidth+4,Math.min(100+halfWidth-4,rawX));

  return {x,y,dx,dy,magnitude:Math.min(1,Math.hypot(dx,dy))};
}

function createFracturePath(startX,startY,angle,length,segments){
  const points=[{x:startX,y:startY}];
  let x=startX,y=startY,currentAngle=angle;
  for(let index=0;index<segments;index++){
    const step=length/segments*(.68+Math.random()*.58);
    const jaggedTurn=(index%2===0?1:-1)*(8+Math.random()*14);
    currentAngle=angle+jaggedTurn+(Math.random()-.5)*6;
    const radians=currentAngle*Math.PI/180;
    x+=Math.cos(radians)*step;
    y+=Math.sin(radians)*step;
    points.push({x,y});
  }
  return {
    d:points.map((point,index)=>(index?'L ':'M ')+point.x.toFixed(1)+' '+point.y.toFixed(1)).join(' '),
    points,
    angle:currentAngle
  };
}

function appendFracturePath(group,path,className,delay){
  const line=document.createElementNS('http://www.w3.org/2000/svg','path');
  line.setAttribute('d',path);
  line.setAttribute('pathLength','1');
  line.setAttribute('class',className);
  line.style.setProperty('--fracture-delay',delay+'ms');
  group.appendChild(line);
}

function spawnImpactBloom(impact){
  const layer=document.getElementById('crack-layer');
  if(!layer||!impact) return;
  const group=document.createElementNS('http://www.w3.org/2000/svg','g');
  group.setAttribute('class','shield-impact-bloom');
  const ring=document.createElementNS('http://www.w3.org/2000/svg','circle');
  ring.setAttribute('class','impact-bloom-ring');
  ring.setAttribute('cx',impact.x.toFixed(1));ring.setAttribute('cy',impact.y.toFixed(1));ring.setAttribute('r','3');
  const core=document.createElementNS('http://www.w3.org/2000/svg','circle');
  core.setAttribute('class','impact-bloom-core');
  core.setAttribute('cx',impact.x.toFixed(1));core.setAttribute('cy',impact.y.toFixed(1));core.setAttribute('r','2.2');
  group.appendChild(ring);group.appendChild(core);layer.appendChild(group);
  setTimeout(()=>group.remove(),720);
}

function spawnCrack(impact,length,branchIndex,totalBranches){
  const layer=document.getElementById('crack-layer');
  if(!layer||!impact) return;
  const branches=Math.max(1,totalBranches||1);
  const towardCenter=Math.atan2(104-impact.y,100-impact.x)*180/Math.PI;
  const fanOffset=(branchIndex-(branches-1)/2)*30+(Math.random()-.5)*8;
  const fracture=createFracturePath(impact.x,impact.y,towardCenter+fanOffset,length,5);
  const group=document.createElementNS('http://www.w3.org/2000/svg','g');
  group.setAttribute('class','shield-fracture');
  const delay=branchIndex*34;

  appendFracturePath(group,fracture.d,'fracture-path fracture-rift',delay);
  appendFracturePath(group,fracture.d,'fracture-path fracture-glow',delay+8);
  appendFracturePath(group,fracture.d,'fracture-path fracture-core',delay+16);
  appendFracturePath(group,fracture.d,'fracture-path fracture-hairline',delay+22);

  const joint=fracture.points[Math.min(2,fracture.points.length-1)];
  const branchDirection=fracture.angle+(branchIndex%2===0?52:-52)+(Math.random()-.5)*14;
  const offshoot=createFracturePath(joint.x,joint.y,branchDirection,length*.36,2);
  appendFracturePath(group,offshoot.d,'fracture-path fracture-rift fracture-offshoot',delay+80);
  appendFracturePath(group,offshoot.d,'fracture-path fracture-glow fracture-offshoot',delay+88);
  appendFracturePath(group,offshoot.d,'fracture-path fracture-core fracture-offshoot',delay+98);

  layer.appendChild(group);
}

function tintShield(damagePct){
  const inner=document.getElementById('shield-inner');
  const outer=document.getElementById('shield-outer');
  const t=Math.min(1,damagePct/100);
  const r=Math.round(2+t*40),g=Math.round(13+t*20),b=Math.round(24+t*50);
  inner.setAttribute('fill','rgb('+r+','+g+','+b+')');
  outer.setAttribute('stroke','rgba(0,229,255,'+(0.55+t*0.4).toFixed(2)+')');
}

let shieldRecoilTimer=null;
function shakeShieldOnly(power,impact){
  const sb=document.getElementById('shield-body');
  const direction=impact||{dx:0,dy:0};
  const cappedPower=Math.min(16,power);
  const travel=3+cappedPower*.22;
  const depth=24+cappedPower*1.35;
  const hitX=direction.dx*travel;
  const hitY=direction.dy*travel*.72;
  const rotateX=-direction.dy*(8+cappedPower*.42);
  const rotateY=direction.dx*(9+cappedPower*.48);
  sb.style.setProperty('--hit-x',hitX.toFixed(2)+'px');
  sb.style.setProperty('--hit-y',hitY.toFixed(2)+'px');
  sb.style.setProperty('--hit-z',(-depth).toFixed(2)+'px');
  sb.style.setProperty('--hit-rx',rotateX.toFixed(2)+'deg');
  sb.style.setProperty('--hit-ry',rotateY.toFixed(2)+'deg');
  sb.style.setProperty('--lead-x',(hitX*.35).toFixed(2)+'px');
  sb.style.setProperty('--lead-y',(hitY*.35).toFixed(2)+'px');
  sb.style.setProperty('--lead-z',(-depth*.32).toFixed(2)+'px');
  sb.style.setProperty('--lead-rx',(rotateX*.36).toFixed(2)+'deg');
  sb.style.setProperty('--lead-ry',(rotateY*.36).toFixed(2)+'deg');
  sb.style.setProperty('--settle-x',(hitX*.28).toFixed(2)+'px');
  sb.style.setProperty('--settle-y',(hitY*.28).toFixed(2)+'px');
  sb.style.setProperty('--settle-rx',(rotateX*.34).toFixed(2)+'deg');
  sb.style.setProperty('--settle-ry',(rotateY*.34).toFixed(2)+'deg');
  sb.style.setProperty('--tail-rx',(rotateX*.05).toFixed(2)+'deg');
  sb.style.setProperty('--tail-ry',(rotateY*.05).toFixed(2)+'deg');
  sb.style.setProperty('--shadow-x',(-hitX*.7).toFixed(2)+'px');
  sb.style.setProperty('--shadow-y',(14-hitY*.35).toFixed(2)+'px');
  sb.style.setProperty('--rebound-x',(-hitX*.18).toFixed(2)+'px');
  sb.style.setProperty('--rebound-y',(-hitY*.18).toFixed(2)+'px');
  sb.style.setProperty('--rebound-z',(3.5+cappedPower*.16).toFixed(2)+'px');
  sb.style.setProperty('--rebound-rx',(-rotateX*.14).toFixed(2)+'deg');
  sb.style.setProperty('--rebound-ry',(-rotateY*.14).toFixed(2)+'deg');
  sb.classList.remove('directional-hit');
  void sb.offsetWidth;
  sb.classList.add('directional-hit');
  clearTimeout(shieldRecoilTimer);
  shieldRecoilTimer=setTimeout(()=>sb.classList.remove('directional-hit'),560);
}

function spawnShards(count){
  const wrap=document.getElementById('screen-wrap');
  const shield=document.getElementById('shield-wrap');
  const wrapRect=wrap.getBoundingClientRect();
  const shieldRect=shield.getBoundingClientRect();
  const originX=shieldRect.left-wrapRect.left+shieldRect.width/2;
  const originY=shieldRect.top-wrapRect.top+shieldRect.height/2;
  const cols=['rgba(0,229,255,0.85)','rgba(0,180,216,0.65)','rgba(0,100,140,0.5)','rgba(210,240,250,0.55)'];
  for(let i=0;i<count;i++){
    const s=document.createElement('div');s.className='shard';
    const size=6+Math.random()*16;
    if(Math.random()>0.5){
      s.style.width='0';s.style.height='0';
      const bw=size*0.6,bh=size;
      s.style.borderLeft=bw+'px solid transparent';
      s.style.borderRight=bw+'px solid transparent';
      s.style.borderBottom=bh+'px solid '+cols[Math.floor(Math.random()*cols.length)];
    }else{
      s.style.width=Math.round(size)+'px';
      s.style.height=Math.round(size*0.45+2)+'px';
      s.style.background=cols[Math.floor(Math.random()*cols.length)];
      s.style.borderRadius='1px';
    }
    s.style.left=originX+'px';s.style.top=originY+'px';s.style.opacity='1';
    s.style.transform='translate(-50%,-50%) rotate(0deg)';
    s.style.transition='transform '+(0.5+Math.random()*0.6).toFixed(2)+'s cubic-bezier(.15,.6,.4,1),opacity .45s '+(0.25+Math.random()*0.2).toFixed(2)+'s';
    wrap.appendChild(s);
    const angle=Math.random()*360,dist=90+Math.random()*150;
    const tx=Math.round(Math.cos(angle*Math.PI/180)*dist),ty=Math.round(Math.sin(angle*Math.PI/180)*dist)-20;
    const rot=Math.round((Math.random()-0.5)*720);
    requestAnimationFrame(()=>requestAnimationFrame(()=>{
      s.style.transform='translate(calc(-50% + '+tx+'px),calc(-50% + '+ty+'px)) rotate('+rot+'deg)';
      s.style.opacity='0';
    }));
    setTimeout(()=>s.remove(),1100);
  }
}

function spawnSparks(count,impact){
  const wrap=document.getElementById('screen-wrap');
  const shield=document.getElementById('shield-wrap');
  const wrapRect=wrap.getBoundingClientRect();
  const shieldRect=shield.getBoundingClientRect();
  const originX=shieldRect.left-wrapRect.left+shieldRect.width*(impact?impact.x/200:.5);
  const originY=shieldRect.top-wrapRect.top+shieldRect.height*(impact?impact.y/200:.5);
  for(let i=0;i<count;i++){
    const sp=document.createElement('div');sp.className='spark';
    const size=2+Math.random()*3;
    sp.style.width=size+'px';sp.style.height=size+'px';sp.style.background='#fff';
    sp.style.left=originX+'px';sp.style.top=originY+'px';sp.style.opacity='1';
    sp.style.transform='translate(-50%,-50%)';
    sp.style.transition='transform .4s ease-out,opacity .4s ease-out';
    wrap.appendChild(sp);
    const angle=Math.random()*360,dist=30+Math.random()*60;
    const tx=Math.cos(angle*Math.PI/180)*dist,ty=Math.sin(angle*Math.PI/180)*dist;
    requestAnimationFrame(()=>requestAnimationFrame(()=>{
      sp.style.transform='translate(calc(-50% + '+tx.toFixed(0)+'px),calc(-50% + '+ty.toFixed(0)+'px))';
      sp.style.opacity='0';
    }));
    setTimeout(()=>sp.remove(),450);
  }
}
