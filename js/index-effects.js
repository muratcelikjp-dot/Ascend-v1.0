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

function spawnCrack(seedAngleBase,length){
  const svg=document.querySelector('#shield-body svg');
  const cx=100,cy=104;
  const baseAngle=seedAngleBase+(Math.random()-0.5)*40;
  const rad=baseAngle*Math.PI/180;
  const startR=8+Math.random()*22;
  const sx=cx+Math.cos(rad)*startR,sy=cy+Math.sin(rad)*startR;
  const segments=3+Math.floor(Math.random()*2);
  let path='M '+sx.toFixed(1)+' '+sy.toFixed(1);
  let curR=startR,curAngle=baseAngle;
  for(let i=0;i<segments;i++){
    curR+=length/segments;
    curAngle+=(Math.random()-0.5)*30;
    const r2=curAngle*Math.PI/180;
    const nx=cx+Math.cos(r2)*curR,ny=cy+Math.sin(r2)*curR;
    path+=' L '+nx.toFixed(1)+' '+ny.toFixed(1);
  }
  const g=document.createElementNS('http://www.w3.org/2000/svg','g');
  const glow=document.createElementNS('http://www.w3.org/2000/svg','path');
  glow.setAttribute('d',path);glow.setAttribute('fill','none');
  glow.setAttribute('stroke','rgba(0,229,255,0.35)');glow.setAttribute('stroke-width','4');
  glow.setAttribute('stroke-linecap','round');glow.setAttribute('opacity','0');
  const line=document.createElementNS('http://www.w3.org/2000/svg','path');
  line.setAttribute('d',path);line.setAttribute('fill','none');
  line.setAttribute('stroke','#CFF6FF');line.setAttribute('stroke-width','1.4');
  line.setAttribute('stroke-linecap','round');line.setAttribute('opacity','0');
  g.appendChild(glow);g.appendChild(line);
  document.getElementById('crack-layer').appendChild(g);
  requestAnimationFrame(()=>requestAnimationFrame(()=>{
    glow.style.transition='opacity .25s';line.style.transition='opacity .2s';
    glow.setAttribute('opacity','1');line.setAttribute('opacity','1');
  }));
}

function tintShield(damagePct){
  const inner=document.getElementById('shield-inner');
  const outer=document.getElementById('shield-outer');
  const t=Math.min(1,damagePct/100);
  const r=Math.round(2+t*40),g=Math.round(13+t*20),b=Math.round(24+t*50);
  inner.setAttribute('fill','rgb('+r+','+g+','+b+')');
  outer.setAttribute('stroke','rgba(0,229,255,'+(0.55+t*0.4).toFixed(2)+')');
}

function shakeShieldOnly(power){
  const sb=document.getElementById('shield-body');
  sb.style.transition='transform .06s';
  sb.style.transform='translate('+Math.round((Math.random()-.5)*power)+'px,'+Math.round((Math.random()-.5)*power*0.6)+'px) scale('+(1-power*0.004)+')';
  setTimeout(()=>{
    sb.style.transform='translate(0,0) scale(1)';
    setTimeout(()=>{sb.style.transition='transform .08s ease'},60);
  },70);
}

function spawnShards(count){
  const wrap=document.getElementById('screen-wrap');
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
    s.style.left='50%';s.style.top='44%';s.style.opacity='1';
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

function spawnSparks(count){
  const wrap=document.getElementById('screen-wrap');
  for(let i=0;i<count;i++){
    const sp=document.createElement('div');sp.className='spark';
    const size=2+Math.random()*3;
    sp.style.width=size+'px';sp.style.height=size+'px';sp.style.background='#fff';
    sp.style.left='50%';sp.style.top='44%';sp.style.opacity='1';
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
