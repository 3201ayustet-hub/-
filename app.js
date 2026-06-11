const $ = id => document.getElementById(id);
const canvas = $("canvas");
const ctx = canvas.getContext("2d");

let currentTab = "telop";
let hudImage = null;

const ranks = ["A","K","Q","J","T","9","8","7","6","5","4","3","2"];
const suits = ["♠","♥","♦","♣"];

function init(){
  fillCards("hud");
  fillCards("enemy");
  $("hudRank1").value="J"; $("hudSuit1").value="♦"; $("hudRank2").value="J"; $("hudSuit2").value="♣";
  $("enemyRank1").value="A"; $("enemySuit1").value="♥"; $("enemyRank2").value="K"; $("enemySuit2").value="♠";

  document.querySelectorAll(".tab").forEach(b=>{
    b.onclick=()=>{
      currentTab=b.dataset.tab;
      document.querySelectorAll(".tab").forEach(x=>x.classList.toggle("active",x===b));
      document.querySelectorAll(".tab-page").forEach(x=>x.classList.remove("active"));
      $(`page-${currentTab}`).classList.add("active");
      render();
    };
  });

  document.querySelectorAll("input,select,textarea").forEach(el=>el.addEventListener("input",()=>{smartTelopStyle(el.id); render();}));
  document.querySelectorAll(".quick button").forEach(b=>b.onclick=()=>quickFill(b.dataset.fill));
  $("hudPhoto").addEventListener("change", loadHudImage);
  $("saveCurrentBtn").onclick=downloadCurrent;
  $("saveAllBtn").onclick=saveAll;
  render();
}

function fillCards(prefix){
  for(const id of [`${prefix}Rank1`,`${prefix}Rank2`]){
    ranks.forEach(r=>{ const o=document.createElement("option"); o.textContent=r; $(id).appendChild(o); });
  }
  for(const id of [`${prefix}Suit1`,`${prefix}Suit2`]){
    suits.forEach(s=>{ const o=document.createElement("option"); o.textContent=s; $(id).appendChild(o); });
  }
}

function smartTelopStyle(id){
  if(id !== "telopAction" && id !== "telopResult") return;
  const a=$("telopAction").value, r=$("telopResult").value;
  if(a==="オールイン") $("telopStyle").value="fire";
  else if(a.includes("レイズ") || a.includes("ベット")) $("telopStyle").value="raise";
  else if(r.includes("完成") || a.includes("勝率")) $("telopStyle").value="gold";
  else if(r.includes("負け") || a.includes("敗北")) $("telopStyle").value="danger";
  else if(a==="コール" || a==="チェック") $("telopStyle").value="cool";
}

function formatAmount(v){
  const raw=String(v||"").replace(/[^\d]/g,"");
  if(!raw) return "";
  return Number(raw).toLocaleString("en-US");
}

function makeTelopText(){
  if($("telopPattern").value==="custom") return $("telopCustom").value.trim();
  const actor=$("telopActor").value;
  const amount=formatAmount($("telopAmount").value);
  const action=$("telopAction").value;
  const result=$("telopResult").value;
  const prefix=actor ? actor : "";
  const withActor=actor ? actor+"、" : "";
  const needsAmount=["ベット","レイズ","3ベット","4ベット","オールイン"].includes(action);

  if($("telopPattern").value==="shock"){
    if(needsAmount && amount) return `${withActor}${amount}点${action}！？`;
    if(result) return `${withActor}${result}！？`;
    return `${prefix}${action}！？`;
  }
  if($("telopPattern").value==="short"){
    if(result) return `${result}！`;
    if(needsAmount && amount) return `${amount}点${action}！`;
    return `${action}！`;
  }
  if($("telopPattern").value==="result"){
    if(result) return `${withActor}${result}`;
    return `${withActor}${action}`;
  }
  if($("telopPattern").value==="normal"){
    if(needsAmount && amount) return `${withActor}${amount}点の${action}`;
    return actor ? `${actor}が${action}` : action;
  }

  if(actor==="お互い" && action==="チェック") return "お互いチェックしリバーへ";
  if(result && (result.includes("完成") || result.includes("負け"))) return `${withActor}${result}`;
  if(action==="オールイン") return amount ? `${withActor}${amount}点オールイン` : `${withActor}オールイン`;
  if(needsAmount && amount) return `${withActor}${amount}点${action}`;
  return actor ? `${actor}が${action}` : action;
}

function render(){
  if(currentTab==="telop") renderTelop();
  if(currentTab==="hud") renderHud(false);
  if(currentTab==="enemy") renderEnemy();
}

function renderTelop(){
  $("previewTitle").textContent="テロッププレビュー";
  canvas.width=1600; canvas.height=520;
  ctx.clearRect(0,0,canvas.width,canvas.height);

  const style=$("telopStyle").value;
  const h=Number($("telopHue").value);
  const power=Number($("telopPower").value)/100;
  const pal={
    main:`hsl(${h},100%,55%)`,
    accent:`hsl(${(h+38)%360},100%,68%)`,
    dark:`hsl(${h},95%,28%)`,
    glow:`hsl(${h},100%,55%)`
  };
  const text=makeTelopText();
  drawTelopEffects(1600,520,style,pal,power);
  const tilt={fire:-4,raise:-2,cool:-2,gold:-3,shock:-7,danger:-5,simple:0}[style] || 0;
  const font={
    fire:'900 142px "Arial Black","Hiragino Sans","Yu Gothic",sans-serif',
    raise:'900 136px Impact,"Arial Black","Hiragino Sans",sans-serif',
    cool:'900 132px "Trebuchet MS","Hiragino Sans",sans-serif',
    gold:'900 140px Georgia,"Hiragino Mincho ProN","Yu Mincho",serif',
    shock:'900 136px "Arial Black","Yu Gothic",sans-serif',
    danger:'900 136px "Arial Black","Hiragino Sans",sans-serif',
    simple:'900 124px "Hiragino Sans","Yu Gothic",sans-serif'
  }[style];

  ctx.save();
  ctx.translate(800,260); ctx.rotate(tilt*Math.PI/180); ctx.translate(-800,-260);
  drawBigText(text,800,260,font,pal);
  ctx.restore();
}

function drawTelopEffects(w,h,style,p,power){
  if(style==="simple") return;
  const cx=w/2,cy=h/2;
  const g=ctx.createRadialGradient(cx,cy,10,cx,cy,620);
  g.addColorStop(0,hsla(p.accent,.24*power)); g.addColorStop(.4,hsla(p.main,.12*power)); g.addColorStop(1,"rgba(0,0,0,0)");
  ctx.fillStyle=g; ctx.fillRect(0,0,w,h);
  const count=Math.floor(24+68*power);
  for(let i=0;i<count;i++){
    const a=Math.random()*Math.PI*2, len=120+Math.random()*340*power;
    ctx.globalAlpha=.12+.18*power;
    ctx.strokeStyle=i%2?p.accent:p.main;
    ctx.lineWidth=2+10*power*Math.random();
    ctx.beginPath();
    ctx.moveTo(cx+Math.cos(a)*90,cy+Math.sin(a)*28);
    ctx.lineTo(cx+Math.cos(a)*len,cy+Math.sin(a)*len*.45);
    ctx.stroke();
  }
  ctx.globalAlpha=1;
}

function drawBigText(text,x,y,font,p){
  ctx.font=font; ctx.textAlign="center"; ctx.textBaseline="middle"; ctx.lineJoin="round";
  ctx.shadowColor=p.glow; ctx.shadowBlur=34;
  ctx.strokeStyle="#070707"; ctx.lineWidth=28; ctx.strokeText(text,x,y);
  ctx.strokeStyle="#fff4c2"; ctx.lineWidth=13; ctx.strokeText(text,x,y);
  ctx.strokeStyle=p.main; ctx.lineWidth=5; ctx.strokeText(text,x,y);
  const g=ctx.createLinearGradient(0,y-140,0,y+140);
  g.addColorStop(0,p.accent); g.addColorStop(.48,p.main); g.addColorStop(1,p.dark);
  ctx.fillStyle=g; ctx.fillText(text,x,y);
  ctx.save(); ctx.globalAlpha=.32; ctx.fillStyle="#fff"; ctx.fillText(text,x,y-26); ctx.restore();
}

function renderHud(forDownload){
  $("previewTitle").textContent="プレイヤーHUDプレビュー";
  canvas.width=1400; canvas.height=460;
  ctx.clearRect(0,0,canvas.width,canvas.height);
  const theme=$("hudTheme").value;
  const colors={
    red:["#2a0703","#8e180d","#ff3a1f"],
    blue:["#02101f","#073f73","#42c9ff"],
    gold:["#201300","#8d5b00","#ffd34b"],
    gray:["#101015","#33343c","#dfe6f3"]
  }[theme];

  drawHudBase(80,70,1210,300,colors,true);
  drawAvatar(90,45,340,340,colors[2],hudImage);
  drawCards(520,36,$("hudRank1").value,$("hudSuit1").value,$("hudRank2").value,$("hudSuit2").value,true);
  drawHudText($("hudName").value || "PLAYER",$("hudPosition").value,$("hudAction").value,formatAmount($("hudAmount").value),colors,true);
}

function drawHudBase(x,y,w,h,colors,glow){
  ctx.save();
  ctx.shadowColor=colors[2]; ctx.shadowBlur=glow?20:0;
  roundRect(x,y,w,h,22);
  const g=ctx.createLinearGradient(x,y,x+w,y+h);
  g.addColorStop(0,colors[0]); g.addColorStop(.55,colors[1]); g.addColorStop(1,"#050506");
  ctx.fillStyle=g; ctx.fill();
  ctx.lineWidth=4; ctx.strokeStyle=colors[2]; ctx.stroke();
  ctx.restore();
  ctx.save();
  ctx.globalAlpha=.28;
  for(let i=0;i<12;i++){
    ctx.strokeStyle=colors[2]; ctx.lineWidth=2;
    ctx.beginPath(); ctx.moveTo(x+w*.45+i*25,y+20); ctx.lineTo(x+w-30,y+h-30-i*6); ctx.stroke();
  }
  ctx.restore();
}

function drawAvatar(cx,cy,size,color,img){
  ctx.save();
  ctx.shadowColor=color; ctx.shadowBlur=28;
  ctx.beginPath(); ctx.arc(cx+size/2,cy+size/2,size/2,0,Math.PI*2); ctx.fillStyle="#050507"; ctx.fill();
  ctx.lineWidth=12; ctx.strokeStyle=color; ctx.stroke();
  ctx.lineWidth=4; ctx.strokeStyle="#fff4"; ctx.stroke();
  ctx.clip();
  if(img){
    const scale=Math.max(size/img.width,size/img.height);
    const iw=img.width*scale, ih=img.height*scale;
    ctx.drawImage(img,cx+size/2-iw/2,cy+size/2-ih/2,iw,ih);
  }else{
    ctx.fillStyle="#111"; ctx.fillRect(cx,cy,size,size);
    ctx.fillStyle="#aaa";
    ctx.beginPath(); ctx.arc(cx+size/2,cy+size*.40,size*.15,0,Math.PI*2); ctx.fill();
    roundRect(ctx,cx+size*.28,cy+size*.56,size*.44,size*.26,20); ctx.fill();
  }
  ctx.restore();
}

function drawCards(x,y,r1,s1,r2,s2,face=true){
  if(face){
    drawCard(x,y,r1,s1); drawCard(x+130,y,r2,s2);
  }else{
    drawCardBack(x,y); drawCardBack(x+130,y);
  }
}

function drawCard(x,y,r,s){
  const red=s==="♥"||s==="♦";
  ctx.save();
  roundRect(x,y,112,150,10); ctx.fillStyle="#fffdf5"; ctx.fill(); ctx.lineWidth=4; ctx.strokeStyle="#3a241d"; ctx.stroke();
  ctx.fillStyle=red?"#d90e12":"#090909";
  ctx.font='900 48px "Arial Black",sans-serif'; ctx.textAlign="left"; ctx.textBaseline="top";
  ctx.fillText(r,x+14,y+10);
  ctx.font='900 42px serif'; ctx.fillText(s,x+16,y+58);
  ctx.font='900 64px Georgia,serif'; ctx.textAlign="center"; ctx.fillText(r,x+56,y+72);
  ctx.restore();
}

function drawCardBack(x,y){
  ctx.save();
  roundRect(x,y,112,150,10);
  const g=ctx.createLinearGradient(x,y,x+112,y+150); g.addColorStop(0,"#333"); g.addColorStop(1,"#060606");
  ctx.fillStyle=g; ctx.fill(); ctx.lineWidth=4; ctx.strokeStyle="#777"; ctx.stroke();
  ctx.globalAlpha=.25; ctx.beginPath(); ctx.arc(x+56,y+75,36,0,Math.PI*2); ctx.strokeStyle="#aaa"; ctx.lineWidth=5; ctx.stroke();
  ctx.restore();
}

function drawHudText(name,pos,action,amount,colors,isHero){
  ctx.textAlign="left"; ctx.textBaseline="middle"; ctx.lineJoin="round";
  ctx.font='900 72px "Hiragino Sans","Yu Gothic",sans-serif';
  strokeFillText(name,520,214,"#fff","#111",10);
  ctx.strokeStyle="#ffffff33"; ctx.lineWidth=3; ctx.beginPath(); ctx.moveTo(520,265); ctx.lineTo(1240,265); ctx.stroke();
  ctx.font='900 60px "Arial Black","Hiragino Sans",sans-serif';
  strokeFillText(`${action} ${amount}`.trim(),520,330,"#fff6ca","#111",10);
  ctx.font='900 78px "Arial Black",sans-serif'; ctx.textAlign="right";
  strokeFillText(pos,1245,180,"#fff","#111",10);
}

function renderEnemy(){
  $("previewTitle").textContent="相手HUDプレビュー";
  canvas.width=1400; canvas.height=410;
  ctx.clearRect(0,0,canvas.width,canvas.height);
  const colors=["#08090d","#23242b","#dfe6f3"];
  drawHudBase(80,75,1210,250,colors,false);
  drawAvatar(90,35,290,290,"#dfe6f3",null);
  const mode=$("enemyCardsMode").value;
  if(mode==="back") drawCards(520,28,"A","♠","K","♠",false);
  if(mode==="select") drawCards(520,28,$("enemyRank1").value,$("enemySuit1").value,$("enemyRank2").value,$("enemySuit2").value,true);
  ctx.font='900 64px "Hiragino Sans","Yu Gothic",sans-serif';
  ctx.textAlign="left"; ctx.textBaseline="middle";
  strokeFillText($("enemyName").value||"プレイヤー",520,185,"#fff","#111",9);
  ctx.strokeStyle="#ffffff33"; ctx.lineWidth=3; ctx.beginPath(); ctx.moveTo(520,235); ctx.lineTo(1240,235); ctx.stroke();
  ctx.font='900 56px "Arial Black","Hiragino Sans",sans-serif';
  strokeFillText(`${$("enemyAction").value} ${formatAmount($("enemyAmount").value)}`.trim(),520,295,"#fff","#111",9);
  ctx.font='900 78px "Arial Black",sans-serif'; ctx.textAlign="right";
  strokeFillText($("enemyPosition").value,1245,165,"#fff","#111",9);
}

function strokeFillText(text,x,y,fill,stroke,width){
  ctx.strokeStyle=stroke; ctx.lineWidth=width; ctx.strokeText(text,x,y);
  ctx.fillStyle=fill; ctx.fillText(text,x,y);
}

function roundRect(x,y,w,h,r){
  if(typeof x==="object"){
    const c=x; x=y; y=w; w=h; h=r; r=arguments[5]||10;
    c.beginPath(); c.moveTo(x+r,y); c.arcTo(x+w,y,x+w,y+h,r); c.arcTo(x+w,y+h,x,y+h,r); c.arcTo(x,y+h,x,y,r); c.arcTo(x,y,x+w,y,r); c.closePath(); return;
  }
  ctx.beginPath(); ctx.moveTo(x+r,y); ctx.arcTo(x+w,y,x+w,y+h,r); ctx.arcTo(x+w,y+h,x,y+h,r); ctx.arcTo(x,y+h,x,y,r); ctx.arcTo(x,y,x+w,y,r); ctx.closePath();
}

function loadHudImage(e){
  const file=e.target.files[0]; if(!file) return;
  const img=new Image();
  img.onload=()=>{ hudImage=img; render(); };
  img.src=URL.createObjectURL(file);
}

function quickFill(kind){
  const data={
    raise:["ロクヤマ","2,400","レイズ","","auto","raise",20],
    call:["相手","","コール","","auto","cool",190],
    set:["ロクヤマ","","チェック","Jのセットが完成","result","gold",42],
    river:["お互い","","チェック","","auto","simple",0],
    bigbet:["相手","76,000","ベット","","shock","shock",345],
    allin:["ロクヤマ","193,000","オールイン","","auto","fire",14],
    lose:["相手","","敗北","フラッシュで負け","result","danger",305],
  }[kind];
  if(!data) return;
  [$("telopActor").value,$("telopAmount").value,$("telopAction").value,$("telopResult").value,$("telopPattern").value,$("telopStyle").value,$("telopHue").value]=data;
  render();
}

function downloadCurrent(){
  render();
  const a=document.createElement("a");
  const name=currentTab==="telop" ? makeTelopText() : currentTab==="hud" ? `${$("hudName").value}_HUD` : `${$("enemyName").value}_HUD`;
  a.download=name.replace(/[\\/:*?"<>|\s]/g,"_").slice(0,50)+".png";
  a.href=canvas.toDataURL("image/png");
  a.click();
}

function saveAll(){
  const old=currentTab;
  currentTab="telop"; render(); triggerDownload("telop.png");
  setTimeout(()=>{ currentTab="hud"; render(); triggerDownload("player_hud.png"); },250);
  setTimeout(()=>{ currentTab="enemy"; render(); triggerDownload("enemy_hud.png"); currentTab=old; render();},500);
}

function triggerDownload(name){
  const a=document.createElement("a");
  a.download=name; a.href=canvas.toDataURL("image/png"); a.click();
}

function hsla(hsl,a){ return hsl.replace("hsl","hsla").replace(")",`, ${a})`); }

init();
