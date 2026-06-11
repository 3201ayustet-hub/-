const $ = id => document.getElementById(id);
const canvas = $("canvas");
const ctx = canvas.getContext("2d");

let currentTab = "telop";
let hudImage = null;
let queue = JSON.parse(localStorage.getItem("v5_queue") || "[]");
let players = JSON.parse(localStorage.getItem("v5_players") || "[]");

const ranks = ["A","K","Q","J","T","9","8","7","6","5","4","3","2"];
const suits = ["♠","♥","♦","♣"];

function init(){
  fillCardSelects("h");
  fillCardSelects("e");
  $("hRank1").value="J"; $("hSuit1").value="♦"; $("hRank2").value="J"; $("hSuit2").value="♣";
  $("eRank1").value="A"; $("eSuit1").value="♥"; $("eRank2").value="K"; $("eSuit2").value="♠";

  document.querySelectorAll(".tab").forEach(btn => btn.onclick = () => switchTab(btn.dataset.tab));

  ["tAction","tSide","selfName","tAmount","tResult"].forEach(id=>{
    $(id).addEventListener("input", ()=>{ updateTelopText(); render(); });
  });
  ["tText","colorShift","fontShift"].forEach(id => $(id).addEventListener("input", render));

  document.querySelectorAll("input,select,textarea").forEach(el=>{
    if(!["tAction","tSide","selfName","tAmount","tResult","tText","colorShift","fontShift"].includes(el.id)){
      el.addEventListener("input", render);
    }
  });

  document.querySelectorAll(".quick button").forEach(btn => btn.onclick = () => quick(btn.dataset.preset));
  $("hudPhoto").addEventListener("change", loadHudImage);
  $("savePlayerTemplate").onclick = savePlayerTemplate;
  $("hudTemplate").onchange = applyPlayerTemplate;
  $("downloadCurrent").onclick = downloadCurrent;
  $("addQueue").onclick = addToQueue;
  $("downloadZip").onclick = downloadQueueZip;

  updateTemplateSelect();
  updateTelopText();
  renderQueue();
  renderPlayerList();
  render();
}

function fillCardSelects(prefix){
  [`${prefix}Rank1`,`${prefix}Rank2`].forEach(id=>{
    ranks.forEach(v=>{const o=document.createElement("option"); o.textContent=v; $(id).appendChild(o);});
  });
  [`${prefix}Suit1`,`${prefix}Suit2`].forEach(id=>{
    suits.forEach(v=>{const o=document.createElement("option"); o.textContent=v; $(id).appendChild(o);});
  });
}

function switchTab(tab){
  currentTab = tab;
  document.querySelectorAll(".tab").forEach(b => b.classList.toggle("active", b.dataset.tab===tab));
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  $(`page-${tab}`).classList.add("active");
  render();
}

function formatAmount(v){
  const raw=String(v||"").replace(/[^\d]/g,"");
  return raw ? Number(raw).toLocaleString("en-US") : "";
}

function actorLabel(){
  const side=$("tSide").value;
  if(side==="self") return $("selfName").value || "ロクヤマ";
  if(side==="opponent") return "相手";
  if(side==="both") return "お互い";
  return "";
}

function updateTelopText(){
  const action=$("tAction").value;
  const side=$("tSide").value;
  const actor=actorLabel();
  const amount=formatAmount($("tAmount").value);
  const result=$("tResult").value;
  const p = actor ? actor+"、" : "";
  const needsAmount=["ベット","レイズ","3ベット","4ベット","オールイン"].includes(action);

  let text = "";

  if(action === "なし"){
    if(result) {
      if(actor) text = `${actor}が${result}`;
      else text = result;
    } else {
      text = actor || "";
    }
  } else if(side==="both" && action==="チェック"){
    text = "お互いにチェック";
  } else if(result && ["セット完成","フラッシュ完成","フルハウス完成"].includes(action)){
    text = `${p}${result}が完成`;
  } else if(["セット完成","フラッシュ完成","フルハウス完成"].includes(action)){
    text = `${p}${action}`;
  } else if(result && (action==="勝利" || action==="敗北")){
    text = `${p}${result}`;
  } else if(result && result.includes("負け")){
    text = `${p}${result}`;
  } else if(action==="オールイン"){
    text = amount ? `${p}${amount}点オールイン` : `${p}オールイン`;
  } else if(needsAmount && amount){
    text = `${p}${amount}点${action}`;
  } else {
    text = actor ? `${actor}が${action}` : action;
  }

  $("tText").value = text;
}

function styleForTelop(){
  const side=$("tSide").value, action=$("tAction").value, result=$("tResult").value;
  let base = {key:"normal", hue:22, tilt:-2};

  if(action==="なし" && result) base = side==="opponent" ? {key:"fear", hue:270, tilt:-3} : {key:"gold", hue:42, tilt:-2};
  else if(action==="チェック") base = {key:"light", hue:0, tilt:0};
  else if(side==="opponent" && ["ベット","レイズ","3ベット","4ベット"].includes(action)) base = {key:"fear", hue:285, tilt:-5};
  else if(side==="opponent" && action==="オールイン") base = {key:"alarm", hue:350, tilt:-6};
  else if(side==="self" && ["ベット","レイズ","3ベット","4ベット"].includes(action)) base = {key:"fight", hue:18, tilt:-3};
  else if(side==="self" && action==="オールイン") base = {key:"allin", hue:12, tilt:-4};
  else if(action.includes("完成") || result.includes("セット") || result.includes("フルハウス") || action==="勝利") base = {key:"gold", hue:42, tilt:-3};
  else if(action==="敗北" || result.includes("負け") || result.includes("敗北")) base = {key:"lose", hue:310, tilt:-5};
  else if(action==="コール") base = {key:"cool", hue:195, tilt:-1};

  base.hue = (base.hue + Number($("colorShift").value) + 360) % 360;
  base.font = fontBySlider(Number($("fontShift").value));
  return base;
}

function fontBySlider(n){
  const fonts = [
    '900 {size}px "Hiragino Sans","Yu Gothic",sans-serif',
    '900 {size}px Impact,"Arial Black","Hiragino Sans",sans-serif',
    '900 {size}px "Arial Black","Yu Gothic",sans-serif',
    '900 {size}px Georgia,"Hiragino Mincho ProN","Yu Mincho",serif',
    '900 {size}px "Trebuchet MS","Hiragino Sans",sans-serif',
    '900 {size}px "Comic Sans MS","Arial Black","Yu Gothic",sans-serif'
  ];
  return fonts[Math.max(0, Math.min(fonts.length-1, n))];
}

function render(){
  if(currentTab==="telop") renderTelop();
  if(currentTab==="hud") renderHud();
  if(currentTab==="enemy") renderEnemy();
  if(currentTab==="players" || currentTab==="queue") renderTelop();
}

function renderTelop(){
  $("previewTitle").textContent = "テロッププレビュー";
  $("previewWrap").className = "previewWrap telopPreview";
  canvas.width=1500; canvas.height=210;
  ctx.clearRect(0,0,canvas.width,canvas.height);

  const st=styleForTelop();
  const pal=palette(st.hue);
  drawTelopFx(canvas.width,canvas.height,st.key,pal);

  const text=$("tText").value || "";
  const fontSize=fitFontSize(text, st.font, 128, canvas.width-110);
  ctx.save();
  ctx.translate(canvas.width/2,canvas.height/2);
  ctx.rotate(st.tilt*Math.PI/180);
  ctx.translate(-canvas.width/2,-canvas.height/2);
  drawTelopText(text, canvas.width/2, canvas.height/2, st.font.replace("{size}", fontSize), pal);
  ctx.restore();
}

function fitFontSize(text, fontTpl, maxSize, maxWidth){
  let size=maxSize;
  while(size>42){
    ctx.font=fontTpl.replace("{size}", size);
    if(ctx.measureText(text).width <= maxWidth) return size;
    size-=4;
  }
  return size;
}

function palette(h){
  return {main:`hsl(${h},100%,55%)`,accent:`hsl(${(h+38)%360},100%,68%)`,dark:`hsl(${h},95%,25%)`,glow:`hsl(${h},100%,55%)`};
}

function drawTelopFx(w,h,key,p){
  if(key==="light") return;
  const cx=w/2, cy=h/2;
  const g=ctx.createRadialGradient(cx,cy,5,cx,cy,500);
  g.addColorStop(0,hsla(p.accent,.20)); g.addColorStop(.42,hsla(p.main,.10)); g.addColorStop(1,"rgba(0,0,0,0)");
  ctx.fillStyle=g; ctx.fillRect(0,0,w,h);

  const count = key==="allin" || key==="alarm" ? 58 : key==="fear" ? 38 : 26;
  for(let i=0;i<count;i++){
    const a=Math.random()*Math.PI*2, len=70+Math.random()*220;
    ctx.globalAlpha=.16;
    ctx.strokeStyle=i%2?p.accent:p.main;
    ctx.lineWidth=2+Math.random()*7;
    ctx.beginPath();
    ctx.moveTo(cx+Math.cos(a)*60, cy+Math.sin(a)*16);
    ctx.lineTo(cx+Math.cos(a)*len, cy+Math.sin(a)*len*.28);
    ctx.stroke();
  }
  ctx.globalAlpha=1;
}

function drawTelopText(text,x,y,font,p){
  ctx.font=font; ctx.textAlign="center"; ctx.textBaseline="middle"; ctx.lineJoin="round";
  ctx.shadowColor=p.glow; ctx.shadowBlur=24;
  ctx.strokeStyle="#070707"; ctx.lineWidth=22; ctx.strokeText(text,x,y);
  ctx.strokeStyle="#fff3c8"; ctx.lineWidth=10; ctx.strokeText(text,x,y);
  ctx.strokeStyle=p.main; ctx.lineWidth=4; ctx.strokeText(text,x,y);
  const g=ctx.createLinearGradient(0,y-100,0,y+100);
  g.addColorStop(0,p.accent); g.addColorStop(.48,p.main); g.addColorStop(1,p.dark);
  ctx.fillStyle=g; ctx.fillText(text,x,y);
  ctx.save(); ctx.globalAlpha=.3; ctx.fillStyle="#fff"; ctx.fillText(text,x,y-20); ctx.restore();
}

function renderHud(){
  $("previewTitle").textContent = "プレイヤーHUDプレビュー";
  $("previewWrap").className = "previewWrap hudPreview";
  canvas.width=1200; canvas.height=285;
  ctx.clearRect(0,0,canvas.width,canvas.height);
  drawHudBase(40,45,1110,190,["#260603","#821509","#ff3b1f"]);
  drawAvatar(58,24,230,"#ff3b1f",hudImage);
  drawCards(342,18,$("hRank1").value,$("hSuit1").value,$("hRank2").value,$("hSuit2").value,true);
  drawHudLabels($("hudName").value || "PLAYER",$("hudPos").value,$("hudAct").value,formatAmount($("hudAmount").value),"#fff6ca");
}

function renderEnemy(){
  $("previewTitle").textContent = "相手HUDプレビュー";
  $("previewWrap").className = "previewWrap hudPreview";
  canvas.width=1200; canvas.height=270;
  ctx.clearRect(0,0,canvas.width,canvas.height);
  drawHudBase(40,45,1110,175,["#08090d","#25262d","#dfe6f3"]);
  drawAvatar(62,28,200,"#dfe6f3",null);
  const mode=$("enemyCardMode").value;
  if(mode==="back") drawCards(330,16,"A","♠","K","♠",false);
  if(mode==="select") drawCards(330,16,$("eRank1").value,$("eSuit1").value,$("eRank2").value,$("eSuit2").value,true);
  drawHudLabels($("enemyName").value || "プレイヤー",$("enemyPos").value,$("enemyAct").value,formatAmount($("enemyAmount").value),"#ffffff");
}

function drawHudBase(x,y,w,h,colors){
  ctx.save();
  ctx.shadowColor=colors[2]; ctx.shadowBlur=16;
  roundRect(ctx,x,y,w,h,20);
  const g=ctx.createLinearGradient(x,y,x+w,y+h);
  g.addColorStop(0,colors[0]); g.addColorStop(.58,colors[1]); g.addColorStop(1,"#030304");
  ctx.fillStyle=g; ctx.fill();
  ctx.lineWidth=4; ctx.strokeStyle=colors[2]; ctx.stroke();
  ctx.restore();
  ctx.save(); ctx.globalAlpha=.20;
  for(let i=0;i<8;i++){
    ctx.strokeStyle=colors[2]; ctx.lineWidth=2;
    ctx.beginPath(); ctx.moveTo(x+w*.48+i*28,y+12); ctx.lineTo(x+w-25,y+h-18-i*4); ctx.stroke();
  }
  ctx.restore();
}

function drawAvatar(x,y,size,color,img){
  ctx.save();
  ctx.shadowColor=color; ctx.shadowBlur=22;
  ctx.beginPath(); ctx.arc(x+size/2,y+size/2,size/2,0,Math.PI*2);
  ctx.fillStyle="#050507"; ctx.fill();
  ctx.lineWidth=9; ctx.strokeStyle=color; ctx.stroke();
  ctx.clip();
  if(img){
    const scale=Math.max(size/img.width,size/img.height);
    const iw=img.width*scale, ih=img.height*scale;
    ctx.drawImage(img,x+size/2-iw/2,y+size/2-ih/2,iw,ih);
  }else{
    ctx.fillStyle="#15151b"; ctx.fillRect(x,y,size,size);
    ctx.fillStyle="#aaa";
    ctx.beginPath(); ctx.arc(x+size/2,y+size*.42,size*.15,0,Math.PI*2); ctx.fill();
    roundRect(ctx,x+size*.28,y+size*.57,size*.44,size*.25,18); ctx.fill();
  }
  ctx.restore();
}

function drawCards(x,y,r1,s1,r2,s2,face){
  if(face){ drawCard(x,y,r1,s1); drawCard(x+96,y,r2,s2); }
  else { drawBack(x,y); drawBack(x+96,y); }
}

function drawCard(x,y,r,s){
  const red=s==="♥"||s==="♦";
  ctx.save();
  roundRect(ctx,x,y,82,112,8); ctx.fillStyle="#fffdf6"; ctx.fill(); ctx.lineWidth=4; ctx.strokeStyle="#2d1a14"; ctx.stroke();
  ctx.fillStyle=red?"#d80e12":"#080808";
  ctx.font='900 34px "Arial Black",sans-serif'; ctx.textAlign="left"; ctx.textBaseline="top";
  ctx.fillText(r,x+9,y+6);
  ctx.font='900 30px serif'; ctx.fillText(s,x+10,y+43);
  ctx.font='900 46px Georgia,serif'; ctx.textAlign="center"; ctx.fillText(r,x+41,y+57);
  ctx.restore();
}

function drawBack(x,y){
  ctx.save();
  roundRect(ctx,x,y,82,112,8);
  const g=ctx.createLinearGradient(x,y,x+82,y+112); g.addColorStop(0,"#3b3b42"); g.addColorStop(1,"#070707");
  ctx.fillStyle=g; ctx.fill(); ctx.lineWidth=4; ctx.strokeStyle="#aaa"; ctx.stroke();
  ctx.globalAlpha=.28; ctx.beginPath(); ctx.arc(x+41,y+56,24,0,Math.PI*2); ctx.strokeStyle="#eee"; ctx.lineWidth=5; ctx.stroke();
  ctx.restore();
}

function drawHudLabels(name,pos,act,amount,accent){
  ctx.textBaseline="middle"; ctx.lineJoin="round";
  ctx.textAlign="left";
  ctx.font='900 52px "Hiragino Sans","Yu Gothic",sans-serif';
  outlined(name,570,112,"#fff");
  ctx.font='900 46px "Arial Black","Hiragino Sans",sans-serif';
  outlined(`${act} ${amount}`.trim(),570,178,accent);
  ctx.textAlign="right";
  ctx.font='900 62px "Arial Black",sans-serif';
  outlined(pos,1090,106,"#fff");
}

function outlined(text,x,y,fill){
  ctx.strokeStyle="#050505"; ctx.lineWidth=9; ctx.strokeText(text,x,y);
  ctx.fillStyle=fill; ctx.fillText(text,x,y);
}

function roundRect(c,x,y,w,h,r){
  c.beginPath(); c.moveTo(x+r,y); c.arcTo(x+w,y,x+w,y+h,r); c.arcTo(x+w,y+h,x,y+h,r);
  c.arcTo(x,y+h,x,y,r); c.arcTo(x,y,x+w,y,r); c.closePath();
}

function loadHudImage(e){
  const file=e.target.files[0]; if(!file) return;
  const reader=new FileReader();
  reader.onload=()=>{
    const img=new Image();
    img.onload=()=>{ hudImage=img; render(); };
    img.src=reader.result;
  };
  reader.readAsDataURL(file);
}

function savePlayerTemplate(){
  const name=$("hudName").value.trim();
  if(!name) return alert("名前を入力してください");
  players = players.filter(p=>p.name!==name);
  players.push({name, image: hudImage ? hudImage.src : "", savedAt: Date.now()});
  localStorage.setItem("v5_players", JSON.stringify(players));
  updateTemplateSelect();
  renderPlayerList();
  alert("テンプレ保存しました");
}

function updateTemplateSelect(){
  const sel=$("hudTemplate");
  sel.innerHTML='<option value="">テンプレを選択</option>';
  players.forEach((p,i)=>{ const o=document.createElement("option"); o.value=i; o.textContent=p.name; sel.appendChild(o); });
}

function applyPlayerTemplate(){
  const idx=$("hudTemplate").value;
  if(idx==="") return;
  const p=players[Number(idx)];
  $("hudName").value=p.name;
  if(p.image){
    const img=new Image();
    img.onload=()=>{ hudImage=img; render(); };
    img.src=p.image;
  }
  render();
}

function renderPlayerList(){
  const root=$("playerList"); root.innerHTML="";
  if(!players.length){ root.innerHTML='<p class="hint">登録済みプレイヤーはありません。</p>'; return; }
  players.forEach((p,i)=>{
    const div=document.createElement("div"); div.className="item";
    div.innerHTML=`<div style="display:flex;align-items:center;gap:10px">${p.image?`<img class="thumb" src="${p.image}">`:''}<div><b>${p.name}</b><br><small>テンプレ</small></div></div>
      <div class="itemBtns"><button data-use="${i}">使用</button><button data-del="${i}">削除</button></div>`;
    root.appendChild(div);
  });
  root.querySelectorAll("[data-use]").forEach(b=>b.onclick=()=>{ switchTab("hud"); $("hudTemplate").value=b.dataset.use; applyPlayerTemplate(); });
  root.querySelectorAll("[data-del]").forEach(b=>b.onclick=()=>{ players.splice(Number(b.dataset.del),1); localStorage.setItem("v5_players",JSON.stringify(players)); updateTemplateSelect(); renderPlayerList(); });
}

function getCurrentItem(){
  if(currentTab==="telop") return {type:"telop", title:$("tText").value, state:{
    tText:$("tText").value, tAction:$("tAction").value, tSide:$("tSide").value, selfName:$("selfName").value,
    tAmount:$("tAmount").value, tResult:$("tResult").value, colorShift:$("colorShift").value, fontShift:$("fontShift").value
  }};
  if(currentTab==="hud") return {type:"hud", title:`${$("hudName").value}_HUD`, state:collectHudState()};
  if(currentTab==="enemy") return {type:"enemy", title:`${$("enemyName").value}_HUD`, state:collectEnemyState()};
  return null;
}

function collectHudState(){
  return {name:$("hudName").value,pos:$("hudPos").value,act:$("hudAct").value,amount:$("hudAmount").value,
    r1:$("hRank1").value,s1:$("hSuit1").value,r2:$("hRank2").value,s2:$("hSuit2").value,image: hudImage ? hudImage.src : ""};
}
function collectEnemyState(){
  return {name:$("enemyName").value,pos:$("enemyPos").value,act:$("enemyAct").value,amount:$("enemyAmount").value,
    mode:$("enemyCardMode").value,r1:$("eRank1").value,s1:$("eSuit1").value,r2:$("eRank2").value,s2:$("eSuit2").value};
}

function addToQueue(){
  const item=getCurrentItem();
  if(!item) return alert("テロップ/HUD/相手HUDタブで追加してください");
  queue.push(item);
  localStorage.setItem("v5_queue",JSON.stringify(queue));
  renderQueue();
  alert("キューに追加しました");
}

function renderQueue(){
  const root=$("queueList"); root.innerHTML="";
  if(!queue.length){ root.innerHTML='<p class="hint">キューは空です。</p>'; return; }
  queue.forEach((q,i)=>{
    const div=document.createElement("div"); div.className="item";
    div.innerHTML=`<div><b>${String(i+1).padStart(3,"0")}. ${q.title}</b><br><small>${q.type}</small></div>
      <div class="itemBtns"><button data-up="${i}">↑</button><button data-down="${i}">↓</button><button data-load="${i}">編集</button><button data-del="${i}">削除</button></div>`;
    root.appendChild(div);
  });
  root.querySelectorAll("[data-del]").forEach(b=>b.onclick=()=>{ queue.splice(Number(b.dataset.del),1); saveQueue(); });
  root.querySelectorAll("[data-up]").forEach(b=>b.onclick=()=>{ const i=Number(b.dataset.up); if(i>0){ [queue[i-1],queue[i]]=[queue[i],queue[i-1]]; saveQueue(); }});
  root.querySelectorAll("[data-down]").forEach(b=>b.onclick=()=>{ const i=Number(b.dataset.down); if(i<queue.length-1){ [queue[i+1],queue[i]]=[queue[i],queue[i+1]]; saveQueue(); }});
  root.querySelectorAll("[data-load]").forEach(b=>b.onclick=()=>loadQueueItem(Number(b.dataset.load)));
}
function saveQueue(){ localStorage.setItem("v5_queue",JSON.stringify(queue)); renderQueue(); }

function loadQueueItem(i){
  const q=queue[i];
  if(q.type==="telop"){
    switchTab("telop");
    Object.entries(q.state).forEach(([k,v])=>$(k).value=v);
  } else if(q.type==="hud"){
    switchTab("hud"); applyHudState(q.state);
  } else {
    switchTab("enemy"); applyEnemyState(q.state);
  }
  render();
}

function applyHudState(s){
  $("hudName").value=s.name; $("hudPos").value=s.pos; $("hudAct").value=s.act; $("hudAmount").value=s.amount;
  $("hRank1").value=s.r1; $("hSuit1").value=s.s1; $("hRank2").value=s.r2; $("hSuit2").value=s.s2;
  if(s.image){ const img=new Image(); img.onload=()=>{hudImage=img;render();}; img.src=s.image; }
}
function applyEnemyState(s){
  $("enemyName").value=s.name; $("enemyPos").value=s.pos; $("enemyAct").value=s.act; $("enemyAmount").value=s.amount;
  $("enemyCardMode").value=s.mode; $("eRank1").value=s.r1; $("eSuit1").value=s.s1; $("eRank2").value=s.r2; $("eSuit2").value=s.s2;
}

function quick(k){
  const p={
    selfCheck:["self","ロクヤマ","","チェック",""],
    oppCheck:["opponent","ロクヤマ","","チェック",""],
    bothCheck:["both","ロクヤマ","","チェック",""],
    selfCall:["self","ロクヤマ","","コール",""],
    oppCall:["opponent","ロクヤマ","","コール",""]
  }[k];
  $("tSide").value=p[0]; $("selfName").value=p[1]; $("tAmount").value=p[2]; $("tAction").value=p[3]; $("tResult").value=p[4];
  updateTelopText(); render();
}

function downloadCurrent(){
  render();
  const a=document.createElement("a");
  const title = currentTab==="telop" ? $("tText").value : currentTab==="hud" ? `${$("hudName").value}_HUD` : currentTab==="enemy" ? `${$("enemyName").value}_HUD` : "material";
  a.download=safeName(title)+".png";
  a.href=canvas.toDataURL("image/png");
  a.click();
}

async function downloadQueueZip(){
  if(!queue.length) return alert("キューが空です");
  const zip = new JSZip();
  const oldTab=currentTab;
  for(let i=0;i<queue.length;i++){
    const q=queue[i];
    await renderQueueToCanvas(q);
    const blob=await new Promise(resolve=>canvas.toBlob(resolve,"image/png"));
    zip.file(`${String(i+1).padStart(3,"0")}_${safeName(q.title)}.png`, blob);
  }
  const content=await zip.generateAsync({type:"blob"});
  const a=document.createElement("a");
  a.download="poker_materials.zip";
  a.href=URL.createObjectURL(content);
  a.click();
  switchTab(oldTab);
}

function renderQueueToCanvas(q){
  return new Promise(resolve=>{
    if(q.type==="telop"){
      switchTab("telop"); Object.entries(q.state).forEach(([k,v])=>$(k).value=v); render(); resolve();
    } else if(q.type==="hud"){
      switchTab("hud"); applyHudState(q.state); setTimeout(()=>{render();resolve();}, q.state.image?80:0);
    } else {
      switchTab("enemy"); applyEnemyState(q.state); render(); resolve();
    }
  });
}

function safeName(s){ return String(s||"material").replace(/[\\/:*?"<>|\s]/g,"_").slice(0,45); }
function hsla(hsl,a){ return hsl.replace("hsl","hsla").replace(")",`, ${a})`); }

init();
