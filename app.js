const $ = id => document.getElementById(id);
const canvas = $("canvas");
const ctx = canvas.getContext("2d");

const styles = {
  allin:{label:"激アツ", font:'900 {size}px "Arial Black","Hiragino Sans","Yu Gothic",sans-serif', tilt:-4, fx:"burst"},
  raise:{label:"レイズ風", font:'900 {size}px Impact,"Arial Black","Hiragino Sans",sans-serif', tilt:-2, fx:"speed"},
  scared:{label:"慄き・衝撃", font:'900 {size}px "Arial Black","Yu Gothic",sans-serif', tilt:-7, fx:"shake"},
  cool:{label:"相手・水色", font:'900 {size}px "Trebuchet MS","Hiragino Sans",sans-serif', tilt:-2, fx:"cool"},
  win:{label:"勝利・金", font:'900 {size}px Georgia,"Hiragino Mincho ProN","Yu Mincho",serif', tilt:-3, fx:"shine"},
  lose:{label:"敗北・紫", font:'900 {size}px "Arial Black","Hiragino Sans",sans-serif', tilt:-5, fx:"danger"},
  simple:{label:"見やすい白", font:'900 {size}px "Hiragino Sans","Yu Gothic",sans-serif', tilt:0, fx:"none"},
  comic:{label:"バラエティ", font:'900 {size}px "Comic Sans MS","Arial Black","Yu Gothic",sans-serif', tilt:-3, fx:"pop"}
};

let state = { actor:"ロクヤマ", style:"allin" };

function init(){
  Object.entries(styles).forEach(([key,s])=>{
    const b=document.createElement("button");
    b.textContent=s.label; b.dataset.style=key;
    if(key===state.style)b.classList.add("active");
    b.onclick=()=>{state.style=key; updateStyleButtons(); smartHue(); render();};
    $("styleGrid").appendChild(b);
  });

  document.querySelectorAll("#actorGroup button").forEach(b=>{
    b.onclick=()=>{
      state.actor=b.dataset.value;
      document.querySelectorAll("#actorGroup button").forEach(x=>x.classList.remove("active"));
      b.classList.add("active");
      render();
    };
  });

  ["amount","action","extra","pattern","customText","hue","power"].forEach(id=>{
    $(id).addEventListener("input", ()=>{ if(id==="action") smartFromAction(); render(); });
  });
  $("refreshBtn").onclick=render;
  $("downloadBtn").onclick=download;
  $("randomBtn").onclick=randomSuggest;
  smartFromAction();
  render();
}

function updateStyleButtons(){
  document.querySelectorAll("#styleGrid button").forEach(b=>b.classList.toggle("active", b.dataset.style===state.style));
}

function smartFromAction(){
  const a=$("action").value;
  if(a.includes("オールイン")) state.style="allin";
  else if(a.includes("レイズ") || a.includes("3ベット")) state.style="raise";
  else if(a.includes("敗北") || a.includes("フラッシュ")) state.style="lose";
  else if(a.includes("勝率") || a.includes("完成")) state.style="win";
  else if(a.includes("チェック") || a.includes("コール")) state.style="cool";
  updateStyleButtons();
  smartHue();
}

function smartHue(){
  const map={allin:14,raise:22,scared:340,cool:190,win:45,lose:300,simple:0,comic:55};
  $("hue").value=map[state.style] ?? 18;
}

function makeText(){
  if($("pattern").value==="custom") return $("customText").value.trim();

  const actor=state.actor;
  const amount=$("amount").value.trim();
  const action=$("action").value;
  const extra=$("extra").value;
  const hasAmount=amount && !["チェック","コール","フォールド","リバーへ","ショーダウン","敗北","フラッシュ完成","セット完成","フルハウス完成","激ヤバ展開"].includes(action);

  if($("pattern").value==="shock"){
    if(hasAmount) return `${actor ? actor + "、" : ""}${amount}点の${action}！？`;
    return `${actor ? actor + "、" : ""}${action}！？`;
  }
  if($("pattern").value==="result"){
    if(extra) return `${actor ? actor + "、" : ""}${extra}で${action}`;
    return `${actor ? actor + "、" : ""}${action}`;
  }
  if($("pattern").value==="short"){
    if(extra) return `${extra}！`;
    if(hasAmount) return `${amount}点${action}！`;
    return `${action}！`;
  }

  if($("pattern").value==="auto"){
    if(action==="チェック" && actor==="お互い") return "お互いチェックでリバーへ";
    if(action==="オールイン") return `${actor ? actor + "、" : ""}オールイン`;
    if(action==="3ベット") return `${actor ? actor + "、" : ""}${amount || "?"}点の3ベット`;
    if(action==="セット完成" || action==="フラッシュ完成" || action==="フルハウス完成") return `${actor ? actor + "、" : ""}${extra || action}が完成`;
    if(action==="敗北") return `${actor ? actor + "、" : ""}${extra || "勝負"}で敗北`;
    if(hasAmount) return `${actor ? actor + "、" : ""}${amount}点${action}`;
    return `${actor ? actor + "が" : ""}${action}`;
  }

  if(hasAmount) return `${actor ? actor + "、" : ""}${amount}点の${action}`;
  return `${actor ? actor + "が" : ""}${action}`;
}

function palette(){
  const h=Number($("hue").value);
  return {
    main:`hsl(${h}, 100%, 55%)`,
    accent:`hsl(${(h+42)%360}, 100%, 68%)`,
    dark:`hsl(${h}, 95%, 28%)`,
    glow:`hsl(${h}, 100%, 55%)`
  };
}

function render(){
  const w=1600,h=520,size=142;
  canvas.width=w; canvas.height=h;
  ctx.clearRect(0,0,w,h);

  const st=styles[state.style];
  const p=palette();
  const power=Number($("power").value)/100;
  drawFx(w,h,st.fx,p,power);

  const text=makeText();
  const lines=text.split("\n").filter(Boolean);
  const tilt=st.tilt*Math.PI/180;
  ctx.save();
  ctx.translate(w/2,h/2); ctx.rotate(tilt); ctx.translate(-w/2,-h/2);
  const lineH=size*1.12;
  const start=h/2-(lines.length-1)*lineH/2;
  lines.forEach((line,i)=>drawLine(line,w/2,start+i*lineH,size,st,p));
  ctx.restore();
}

function drawFx(w,h,fx,p,power){
  if(fx==="none") return;
  const cx=w/2,cy=h/2;
  const g=ctx.createRadialGradient(cx,cy,20,cx,cy,620);
  g.addColorStop(0, hsla(p.accent,.24*power));
  g.addColorStop(.38, hsla(p.main,.12*power));
  g.addColorStop(1,"rgba(0,0,0,0)");
  ctx.fillStyle=g; ctx.fillRect(0,0,w,h);

  const count=Math.floor(24+60*power);
  for(let i=0;i<count;i++){
    const a=Math.random()*Math.PI*2;
    const len=120+Math.random()*320*power;
    ctx.globalAlpha=.12+.18*power;
    ctx.strokeStyle=i%2?p.accent:p.main;
    ctx.lineWidth=2+10*power*Math.random();
    ctx.beginPath();
    ctx.moveTo(cx+Math.cos(a)*90,cy+Math.sin(a)*28);
    ctx.lineTo(cx+Math.cos(a)*len,cy+Math.sin(a)*len*.45);
    ctx.stroke();
  }
  ctx.globalAlpha=1;
  if(fx==="shake"||fx==="danger"){
    for(let i=0;i<10;i++){
      ctx.globalAlpha=.15*power;
      ctx.strokeStyle="#fff";
      ctx.lineWidth=5;
      ctx.beginPath();
      const x=Math.random()*w,y=Math.random()*h;
      ctx.moveTo(x,y); ctx.lineTo(x+80-Math.random()*160,y+80-Math.random()*160);
      ctx.stroke();
    }
    ctx.globalAlpha=1;
  }
}

function drawLine(text,cx,y,size,st,p){
  ctx.font=st.font.replace("{size}",size);
  ctx.textAlign="center"; ctx.textBaseline="middle"; ctx.lineJoin="round";
  ctx.shadowColor=p.glow; ctx.shadowBlur=34;

  // black outline
  ctx.strokeStyle="#070707"; ctx.lineWidth=26; ctx.strokeText(text,cx,y);
  // cream outline
  ctx.strokeStyle="#fff4c2"; ctx.lineWidth=12; ctx.strokeText(text,cx,y);
  // colored outline
  ctx.strokeStyle=p.main; ctx.lineWidth=5; ctx.strokeText(text,cx,y);

  const grad=ctx.createLinearGradient(0,y-size,0,y+size);
  grad.addColorStop(0,p.accent);
  grad.addColorStop(.48,p.main);
  grad.addColorStop(1,p.dark);
  ctx.fillStyle=grad; ctx.fillText(text,cx,y);

  ctx.save();
  ctx.globalAlpha=.32;
  ctx.fillStyle="#fff";
  ctx.fillText(text,cx,y-size*.18);
  ctx.restore();
}

function hsla(hsl,a){ return hsl.replace("hsl","hsla").replace(")",`, ${a})`); }

function randomSuggest(){
  const actors=["ロクヤマ","相手","お互い"];
  const actions=["ベット","レイズ","コール","オールイン","3ベット","チェック","敗北","セット完成","フラッシュ完成"];
  const extras=["","Jのセット","フラッシュ","フルハウス","ブラフキャッチ","ナッツ"];
  state.actor=actors[Math.floor(Math.random()*actors.length)];
  $("amount").value=["2,400","18,000","32,000","76,000","193,000"][Math.floor(Math.random()*5)];
  $("action").value=actions[Math.floor(Math.random()*actions.length)];
  $("extra").value=extras[Math.floor(Math.random()*extras.length)];
  document.querySelectorAll("#actorGroup button").forEach(b=>b.classList.toggle("active",b.dataset.value===state.actor));
  smartFromAction(); render();
}

function download(){
  render();
  const a=document.createElement("a");
  const name=makeText().replace(/[\\/:*?"<>|\s]/g,"_").slice(0,50) || "telop";
  a.download=name+".png";
  a.href=canvas.toDataURL("image/png");
  a.click();
}

init();
