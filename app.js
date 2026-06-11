const $ = id => document.getElementById(id);
const canvas = $("canvas");
const ctx = canvas.getContext("2d");

let currentTab = "telop";
let hudImage = null;
let queue = JSON.parse(localStorage.getItem("v6_queue") || "[]");
let players = JSON.parse(localStorage.getItem("v6_players") || "[]");
let colorIndex = 0;
let fontIndex = 0;

const ranks = ["A","K","Q","J","T","9","8","7","6","5","4","3","2"];
const suits = ["♠","♥","♦","♣"];

const colorThemes = [
  {name:"標準", shift:0, black:false},
  {name:"赤金", shift:0, black:false},
  {name:"青白", shift:175, black:false},
  {name:"紫恐怖", shift:270, black:false},
  {name:"金色", shift:28, black:false},
  {name:"緑", shift:115, black:false},
  {name:"ピンク", shift:320, black:false},
  {name:"黒枠強め", shift:0, black:true},
  {name:"黒×赤", shift:350, black:true},
  {name:"黒×金", shift:35, black:true},
  {name:"黒×青", shift:205, black:true}
];

const fontThemes = [
  {name:"標準ゴシック", font:'900 {size}px "Hiragino Sans","Yu Gothic",sans-serif'},
  {name:"インパクト", font:'900 {size}px Impact,"Arial Black","Hiragino Sans",sans-serif'},
  {name:"極太", font:'900 {size}px "Arial Black","Yu Gothic",sans-serif'},
  {name:"明朝ゴールド", font:'900 {size}px Georgia,"Hiragino Mincho ProN","Yu Mincho",serif'},
  {name:"クール", font:'900 {size}px "Trebuchet MS","Hiragino Sans",sans-serif'},
  {name:"バラエティ", font:'900 {size}px "Comic Sans MS","Arial Black","Yu Gothic",sans-serif'},
  {name:"丸ゴシック風", font:'900 {size}px "Arial Rounded MT Bold","Hiragino Sans","Yu Gothic",sans-serif'},
  {name:"鋭角", font:'900 {size}px Impact,"Arial Narrow","Arial Black",sans-serif'},
  {name:"字幕風", font:'900 {size}px Meiryo,"Yu Gothic",sans-serif'},
  {name:"ホラー風", font:'900 {size}px fantasy,"Arial Black","Yu Gothic",sans-serif'},
  {name:"高級感", font:'900 {size}px "Times New Roman","Yu Mincho",serif'},
  {name:"スポーツ風", font:'900 {size}px Verdana,"Arial Black",sans-serif'}
];

function init(){
  fillCardSelects("h");
  fillCardSelects("e");
  $("hRank1").value="J"; $("hSuit1").value="♦"; $("hRank2").value="J"; $("hSuit2").value="♣";
  $("eRank1").value="A"; $("eSuit1").value="♥"; $("eRank2").value="K"; $("eSuit2").value="♠";

  document.querySelectorAll(".tab").forEach(btn => btn.onclick = () => switchTab(btn.dataset.tab));

  ["tAction","tSide","selfName","tAmount","tResult"].forEach(id=>{
    $(id).addEventListener("input", ()=>{ updateTelopText(); autoThemeForTelop(); render(); });
  });
  $("tText").addEventListener("input", render);

  $("colorPrev").onclick=()=>{ colorIndex=(colorIndex-1+colorThemes.length)%colorThemes.length; updateThemeLabels(); render(); };
  $("colorNext").onclick=()=>{ colorIndex=(colorIndex+1)%colorThemes.length; updateThemeLabels(); render(); };
  $("fontPrev").onclick=()=>{ fontIndex=(fontIndex-1+fontThemes.length)%fontThemes.length; updateThemeLabels(); render(); };
  $("fontNext").onclick=()=>{ fontIndex=(fontIndex+1)%fontThemes.length; updateThemeLabels(); render(); };

  document.querySelectorAll("input,select,textarea").forEach(el=>{
    if(!["tAction","tSide","selfName","tAmount","tResult","tText"].includes(el.id)){
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
  autoThemeForTelop();
  updateThemeLabels();
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

function updateThemeLabels(){
  $("colorLabel").textContent = colorThemes[colorIndex].name;
  $("fontLabel").textContent = fontThemes[fontIndex].name;
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
    if(result) text = actor ? `${actor}が${result}` : result;
    else text = actor || "";
  } else if(side==="both" && action==="チェック"){
    text = "お互いにチェック";
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

function autoThemeForTelop(){
  const side=$("tSide").value, action=$("tAction").value, result=$("tResult").value;

  if(action==="チェック") { colorIndex=0; fontIndex=8; }
  else if(action==="長考") { colorIndex=7; fontIndex=8; }
  else if(side==="opponent" && ["ベット","レイズ","3ベット","4ベット"].includes(action)) { colorIndex=3; fontIndex=2; }
  else if(side==="opponent" && action==="オールイン") { colorIndex=8; fontIndex=7; }
  else if(side==="self" && ["ベット","レイズ","3ベット","4ベット"].includes(action)) { colorIndex=1; fontIndex=1; }
  else if(side==="self" && action==="オールイン") { colorIndex=1; fontIndex=2; }
  else if(result.includes("セット") || result.includes("フルハウス") || result.includes("勝率")) { colorIndex=4; fontIndex=3; }
  else if(result.includes("負け") || result.includes("敗北")) { colorIndex=3; fontIndex=9; }
  else if(action==="コール") { colorIndex=2; fontIndex=4; }
  updateThemeLabels();
}

function styleForTelop(){
  const side=$("tSide").value, action=$("tAction").value, result=$("tResult").value;
  let base = {key:"normal", hue:22, tilt:-2};

  if(action==="なし" && result) base = side==="opponent" ? {key:"fear", hue:270, tilt:-3} : {key:"gold", hue:42, tilt:-2};
  else if(action==="チェック") base = {key:"light", hue:0, tilt:0};
  else if(action==="長考") base = {key:"think", hue:0, tilt:-1};
  else if(side==="opponent" && ["ベット","レイズ","3ベット","4ベット"].includes(action)) base = {key:"fear", hue:285, tilt:-5};
  else if(side==="opponent" && action==="オールイン") base = {key:"alarm", hue:350, tilt:-6};
  else if(side==="self" && ["ベット","レイズ","3ベット","4ベット"].includes(action)) base = {key:"fight", hue:18, tilt:-3};
  else if(side==="self" && action==="オールイン") base = {key:"allin", hue:12, tilt:-4};
  else if(result.includes("セット") || result.includes("フルハウス") || result.includes("勝率")) base = {key:"gold", hue:42, tilt:-3};
  else if(result.includes("負け") || result.includes("敗北")) base = {key:"lose", hue:310, tilt:-5};
  else if(action==="コール") base = {key:"cool", hue:195, tilt:-1};

  const c = colorThemes[colorIndex];
  if(c.name !== "標準") base.hue = c.shift;
  base.black = c.black;
  base.font = fontThemes[fontIndex].font;
  return base;
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
  canvas.width=1500; canvas.height=190;
  ctx.clearRect(0,0,canvas.width,canvas.height);

  const st=styleForTelop();
  const pal=palette(st.hue, st.black);
  drawTelopFx(canvas.width,canvas.height,st.key,pal,st.black);

  const text=$("tText").value || "";
  const fontSize=fitFontSize(text, st.font, 118, canvas.width-110);
  ctx.save();
  ctx.translate(canvas.width/2,canvas.height/2);
  ctx.rotate(st.tilt*Math.PI/180);
  ctx.translate(-canvas.width/2,-canvas.height/2);
  drawTelopText(text, canvas.width/2, canvas.height/2, st.font.replace("{size}", fontSize), pal, st.black);
  ctx.restore();
}

function fitFontSize(text, fontTpl, maxSize, maxWidth){
  let size=maxSize;
  while(size>40){
    ctx.font=fontTpl.replace("{size}", size);
    if(ctx.measureText(text).width <= maxWidth) return size;
    size-=4;
  }
  return size;
}

function palette(h, black){
  if(black){
    return {main:`hsl(${h},100%,50%)`,accent:"#ffffff",dark:"#050505",glow:`hsl(${h},100%,45%)`,outline:"#000000"};
  }
  return {main:`hsl(${h},100%,55%)`,accent:`hsl(${(h+38)%360},100%,68%)`,dark:`hsl(${h},95%,25%)`,glow:`hsl(${h},100%,55%)`,outline:"#070707"};
}

function drawTelopFx(w,h,key,p,black){
  if(key==="light") return;
  const cx=w/2, cy=h/2;
  const g=ctx.createRadialGradient(cx,cy,5,cx,cy,500);
  g.addColorStop(0,hsla(p.accent,.18)); g.addColorStop(.42,hsla(p.main,.10)); g.addColorStop(1,"rgba(0,0,0,0)");
  ctx.fillStyle=g; ctx.fillRect(0,0,w,h);

  const count = key==="allin" || key==="alarm" ? 52 : key==="fear" ? 34 : 22;
  for(let i=0;i<count;i++){
    const a=Math.random()*Math.PI*2, len=65+Math.random()*210;
    ctx.globalAlpha=black ? .20 : .15;
    ctx.strokeStyle=i%2?p.accent:p.main;
    ctx.lineWidth=2+Math.random()*7;
    ctx.beginPath();
    ctx.moveTo(cx+Math.cos(a)*55, cy+Math.sin(a)*14);
    ctx.lineTo(cx+Math.cos(a)*len, cy+Math.sin(a)*len*.26);
    ctx.stroke();
  }
  ctx.globalAlpha=1;
}

function drawTelopText(text,x,y,font,p,black){
  ctx.font=font; ctx.textAlign="center"; ctx.textBaseline="middle"; ctx.lineJoin="round";
  ctx.shadowColor=p.glow; ctx.shadowBlur=black ? 18 : 22;
  ctx.strokeStyle=p.outline; ctx.lineWidth=black ? 34 : 21; ctx.strokeText(text,x,y);
  ctx.strokeStyle=black ? "#111111" : "#fff3c8"; ctx.lineWidth=black ? 18 : 10; ctx.strokeText(text,x,y);
  ctx.strokeStyle=p.main; ctx.lineWidth=black ? 6 : 4; ctx.strokeText(text,x,y);
  const g=ctx.createLinearGradient(0,y-90,0,y+90);
  g.addColorStop(0,p.accent); g.addColorStop(.48,p.main); g.addColorStop(1,p.dark);
  ctx.fillStyle=g; ctx.fillText(text,x,y);
  ctx.save(); ctx.globalAlpha=.28; ctx.fillStyle="#fff"; ctx.fillText(text,x,y-18); ctx.restore();
}

function renderHud(){
  $("previewTitle").textContent = "プレイヤーHUDプレビュー";
  $("previewWrap").className = "previewWrap hudPreview";
  canvas.width=1200; canvas.height=250;
  ctx.clearRect(0,0,canvas.width,canvas.height);
  drawHudBase(40,36,1110,170,["#260603","#821509","#ff3b1f"]);
  drawAvatar(60,22,200,"#ff3b1f",hudImage);
  drawCards(318,14,$("hRank1").value,$("hSuit1").value,$("hRank2").value,$("hSuit2").value,true);
  drawHudLabels($("hudName").value || "PLAYER",$("hudPos").value,$("hudAct").value,formatAmount($("hudAmount").value),"#fff6ca");
}

function renderEnemy(){
  $("previewTitle").textContent = "相手HUDプレビュー";
  $("previewWrap").className = "previewWrap hudPreview";
  canvas.width=1200; canvas.height=235;
  ctx.clearRect(0,0,canvas.width,canvas.height);
  drawHudBase(40,36,1110,158,["#08090d","#25262d","#dfe6f3"]);
  drawAvatar(64,28,170,"#dfe6f3",null);
  const mode=$("enemyCardMode").value;
  if(mode==="back") drawCards(300,14,"A","♠","K","♠",false);
  if(mode==="select") drawCards(300,14,$("eRank1").value,$("eSuit1").value,$("eRank2").value,$("eSuit2").value,true);
  drawHudLabels($("enemyName").value || "プレイヤー",$("enemyPos").value,$("enemyAct").value,formatAmount($("enemyAmount").value),"#ffffff");
}

function drawHudBase(x,y,w,h,colors){
  ctx.save();
  ctx.shadowColor=colors[2]; ctx.shadowBlur=14;
  roundRect(ctx,x,y,w,h,18);
  const g=ctx.createLinearGradient(x,y,x+w,y+h);
  g.addColorStop(0,colors[0]); g.addColorStop(.58,colors[1]); g.addColorStop(1,"#030304");
  ctx.fillStyle=g; ctx.fill();
  ctx.lineWidth=4; ctx.strokeStyle=colors[2]; ctx.stroke();
  ctx.restore();
  ctx.save(); ctx.globalAlpha=.18;
  for(let i=0;i<8;i++){
    ctx.strokeStyle=colors[2]; ctx.lineWidth=2;
    ctx.beginPath(); ctx.moveTo(x+w*.48+i*28,y+10); ctx.lineTo(x+w-25,y+h-16-i*4); ctx.stroke();
  }
  ctx.restore();
}

function drawAvatar(x,y,size,color,img){
  ctx.save();
  ctx.shadowColor=color; ctx.shadowBlur=18;
  ctx.beginPath(); ctx.arc(x+size/2,y+size/2,size/2,0,Math.PI*2);
  ctx.fillStyle="#050507"; ctx.fill();
  ctx.lineWidth=8; ctx.strokeStyle=color; ctx.stroke();
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
  if(face){ drawCard(x,y,r1,s1); drawCard(x+86,y,r2,s2); }
  else { drawBack(x,y); drawBack(x+86,y); }
}

function drawCard(x,y,r,s){
  const red=s==="♥"||s==="♦";
  ctx.save();
  roundRect(ctx,x,y,74,101,8); ctx.fillStyle="#fffdf6"; ctx.fill(); ctx.lineWidth=4; ctx.strokeStyle="#2d1a14"; ctx.stroke();
  ctx.fillStyle=red?"#d80e12":"#080808";
  ctx.font='900 30px "Arial Black",sans-serif'; ctx.textAlign="left"; ctx.textBaseline="top";
  ctx.fillText(r,x+8,y+5);
  ctx.font='900 27px serif'; ctx.fillText(s,x+9,y+38);
  ctx.font='900 40px Georgia,serif'; ctx.textAlign="center"; ctx.fillText(r,x+37,y+52);
  ctx.restore();
}

function drawBack(x,y){
  ctx.save();
  roundRect(ctx,x,y,74,101,8);
  const g=ctx.createLinearGradient(x,y,x+74,y+101); g.addColorStop(0,"#3b3b42"); g.addColorStop(1,"#070707");
  ctx.fillStyle=g; ctx.fill(); ctx.lineWidth=4; ctx.strokeStyle="#aaa"; ctx.stroke();
  ctx.globalAlpha=.28; ctx.beginPath(); ctx.arc(x+37,y+50,21,0,Math.PI*2); ctx.strokeStyle="#eee"; ctx.lineWidth=5; ctx.stroke();
  ctx.restore();
}

function drawHudLabels(name,pos,act,amount,accent){
  ctx.textBaseline="middle"; ctx.lineJoin="round";
  ctx.textAlign="left";
  ctx.font='900 48px "Hiragino Sans","Yu Gothic",sans-serif';
  outlined(name,535,94,"#fff");
  ctx.font='900 42px "Arial Black","Hiragino Sans",sans-serif';
  outlined(`${act} ${amount}`.trim(),535,152,accent);
  ctx.textAlign="right";
  ctx.font='900 58px "Arial Black",sans-serif';
  outlined(pos,1090,90,"#fff");
}

function outlined(text,x,y,fill){
  ctx.strokeStyle="#050505"; ctx.lineWidth=8; ctx.strokeText(text,x,y);
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
  localStorage.setItem("v6_players", JSON.stringify(players));
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
  root.querySelectorAll("[data-del]").forEach(b=>b.onclick=()=>{ players.splice(Number(b.dataset.del),1); localStorage.setItem("v6_players",JSON.stringify(players)); updateTemplateSelect(); renderPlayerList(); });
}

function getCurrentItem(){
  if(currentTab==="telop") return {type:"telop", title:$("tText").value, state:{
    tText:$("tText").value, tAction:$("tAction").value, tSide:$("tSide").value, selfName:$("selfName").value,
    tAmount:$("tAmount").value, tResult:$("tResult").value, colorIndex, fontIndex
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
  localStorage.setItem("v6_queue",JSON.stringify(queue));
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
function saveQueue(){ localStorage.setItem("v6_queue",JSON.stringify(queue)); renderQueue(); }

function loadQueueItem(i){
  const q=queue[i];
  if(q.type==="telop"){
    switchTab("telop");
    Object.entries(q.state).forEach(([k,v])=>{
      if(k==="colorIndex") colorIndex=v;
      else if(k==="fontIndex") fontIndex=v;
      else $(k).value=v;
    });
    updateThemeLabels();
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
    oppCall:["opponent","ロクヤマ","","コール",""],
    selfThink:["self","ロクヤマ","","長考",""],
    oppThink:["opponent","ロクヤマ","","長考",""]
  }[k];
  $("tSide").value=p[0]; $("selfName").value=p[1]; $("tAmount").value=p[2]; $("tAction").value=p[3]; $("tResult").value=p[4];
  updateTelopText(); autoThemeForTelop(); render();
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
      switchTab("telop");
      Object.entries(q.state).forEach(([k,v])=>{
        if(k==="colorIndex") colorIndex=v;
        else if(k==="fontIndex") fontIndex=v;
        else $(k).value=v;
      });
      updateThemeLabels(); render(); resolve();
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
