const presets = {
  fire:   { label:"激しめ・炎・オールイン", main:"#ff2a18", accent:"#ffe45c", glow:"#ff5a00", lower:"#b30000", tilt:-4, size:142, fx:"burst" },
  raise:  { label:"レイズ風・赤黄ポップ", main:"#ff2a18", accent:"#fff06a", glow:"#ffb000", lower:"#d4140a", tilt:-2, size:132, fx:"speed" },
  cool:   { label:"相手アクション・水色", main:"#50eaff", accent:"#e9ffff", glow:"#00c8ff", lower:"#0088c8", tilt:-2, size:128, fx:"cool" },
  gold:   { label:"勝負所・金文字", main:"#ffd83d", accent:"#fff7a8", glow:"#ff9b00", lower:"#c87500", tilt:-3, size:136, fx:"shine" },
  danger: { label:"危険・ショック・負け", main:"#ff2b7a", accent:"#e0b3ff", glow:"#b000ff", lower:"#7a0038", tilt:-5, size:132, fx:"danger" },
  simple: { label:"白文字・黒フチ", main:"#ffffff", accent:"#ffffff", glow:"#000000", lower:"#d9d9d9", tilt:0, size:118, fx:"none" },
};

const $ = (id) => document.getElementById(id);
const canvas = $("telopCanvas");
const ctx = canvas.getContext("2d");

function init(){
  Object.entries(presets).forEach(([key,p])=>{
    const opt = document.createElement("option");
    opt.value = key; opt.textContent = p.label;
    $("presetSelect").appendChild(opt);
  });

  $("presetSelect").value = "fire";
  Object.keys(presets).forEach(()=>{});
  bind();
  applyPreset("fire");
  render();
}

function bind(){
  ["textInput","canvasW","canvasH","fontSize","tilt","mainColor","accentColor","wordRules"].forEach(id=>{
    $(id).addEventListener("input", render);
  });
  $("presetSelect").addEventListener("change", e => applyPreset(e.target.value));
  $("sizePreset").addEventListener("change", applySizePreset);
  $("downloadBtn").addEventListener("click", downloadPNG);
  $("copyBtn").addEventListener("click", copySettings);

  document.querySelectorAll(".quick button").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      $("textInput").value = btn.dataset.text;
      $("presetSelect").value = btn.dataset.preset;
      applyPreset(btn.dataset.preset);
    });
  });
}

function applyPreset(key){
  const p = presets[key];
  $("mainColor").value = p.main;
  $("accentColor").value = p.accent;
  $("fontSize").value = p.size;
  $("tilt").value = p.tilt;
  render();
}

function applySizePreset(){
  const v = $("sizePreset").value;
  if(v==="wide"){ $("canvasW").value=1600; $("canvasH").value=520; }
  if(v==="shorts"){ $("canvasW").value=1080; $("canvasH").value=360; }
  if(v==="square"){ $("canvasW").value=1200; $("canvasH").value=500; }
  render();
}

function parseRules(){
  const raw = $("wordRules").value.trim();
  const rules = [];
  raw.split(",").forEach(pair=>{
    const idx = pair.indexOf(":");
    if(idx < 0) return;
    const word = pair.slice(0,idx).trim();
    const color = pair.slice(idx+1).trim();
    if(word && /^#[0-9a-fA-F]{6}$/.test(color)) rules.push({word,color});
  });
  return rules.sort((a,b)=>b.word.length-a.word.length);
}

function splitByRules(text, rules){
  let parts = [{text, color:null}];
  for(const rule of rules){
    const next = [];
    for(const part of parts){
      if(part.color){ next.push(part); continue; }
      const segs = part.text.split(rule.word);
      segs.forEach((seg,i)=>{
        if(seg) next.push({text:seg,color:null});
        if(i < segs.length-1) next.push({text:rule.word,color:rule.color});
      });
    }
    parts = next;
  }
  return parts;
}

function render(){
  const w = Math.max(300, Number($("canvasW").value)||1600);
  const h = Math.max(200, Number($("canvasH").value)||520);
  const fontSize = Number($("fontSize").value)||130;
  const tilt = (Number($("tilt").value)||0) * Math.PI / 180;
  const preset = presets[$("presetSelect").value] || presets.fire;

  canvas.width = w;
  canvas.height = h;
  ctx.clearRect(0,0,w,h);

  drawEffects(w,h,preset);

  const lines = ($("textInput").value || "").split("\n").filter(Boolean);
  const lineHeight = fontSize * 1.12;
  const startY = h/2 - ((lines.length-1)*lineHeight)/2;

  ctx.save();
  ctx.translate(w/2,h/2);
  ctx.rotate(tilt);
  ctx.translate(-w/2,-h/2);
  ctx.shadowColor = preset.glow;
  ctx.shadowBlur = preset.fx==="none" ? 0 : 32;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;

  lines.forEach((line,i)=>{
    const parts = splitByRules(line, parseRules());
    drawLine(parts, w/2, startY + i*lineHeight, fontSize, preset);
  });
  ctx.restore();
}

function drawEffects(w,h,preset){
  if(preset.fx==="none") return;
  const cx = w/2, cy = h/2;
  ctx.save();
  ctx.globalCompositeOperation = "source-over";

  const radial = ctx.createRadialGradient(cx,cy,10,cx,cy,Math.max(w,h)*0.45);
  radial.addColorStop(0, hexToRgba($("accentColor").value, .22));
  radial.addColorStop(.35, hexToRgba($("mainColor").value, .12));
  radial.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = radial;
  ctx.fillRect(0,0,w,h);

  const count = preset.fx==="burst" ? 64 : 34;
  for(let i=0;i<count;i++){
    const a = (Math.PI*2/count)*i + Math.random()*0.08;
    const inner = 100 + Math.random()*40;
    const outer = inner + 120 + Math.random()*260;
    ctx.globalAlpha = preset.fx==="cool" ? .16 : .22;
    ctx.strokeStyle = i%3===0 ? $("accentColor").value : $("mainColor").value;
    ctx.lineWidth = 3 + Math.random()*10;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a)*inner, cy + Math.sin(a)*inner*.38);
    ctx.lineTo(cx + Math.cos(a)*outer, cy + Math.sin(a)*outer*.48);
    ctx.stroke();
  }

  if(preset.fx==="danger"){
    ctx.globalAlpha = .16;
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 8;
    for(let i=0;i<8;i++){
      ctx.beginPath();
      ctx.moveTo(Math.random()*w, Math.random()*h);
      ctx.lineTo(Math.random()*w, Math.random()*h);
      ctx.stroke();
    }
  }
  ctx.restore();
}

function drawLine(parts, centerX, y, fontSize, preset){
  ctx.font = `900 ${fontSize}px "Arial Black","Hiragino Sans","Yu Gothic",Meiryo,sans-serif`;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.lineJoin = "round";

  const total = parts.reduce((sum,p)=>sum+ctx.measureText(p.text).width,0);
  let x = centerX - total/2;

  for(const part of parts){
    const fill = part.color || $("mainColor").value;
    const accent = $("accentColor").value;
    const grad = ctx.createLinearGradient(0,y-fontSize*.9,0,y+fontSize*.9);
    grad.addColorStop(0, accent);
    grad.addColorStop(.43, fill);
    grad.addColorStop(1, presets[$("presetSelect").value].lower);

    ctx.strokeStyle = "#080808";
    ctx.lineWidth = Math.max(18, fontSize*.16);
    ctx.strokeText(part.text, x, y);

    ctx.strokeStyle = "#fff8c9";
    ctx.lineWidth = Math.max(8, fontSize*.07);
    ctx.strokeText(part.text, x, y);

    ctx.strokeStyle = fill;
    ctx.lineWidth = Math.max(3, fontSize*.028);
    ctx.strokeText(part.text, x, y);

    ctx.fillStyle = grad;
    ctx.fillText(part.text, x, y);

    ctx.save();
    ctx.globalAlpha = .30;
    ctx.fillStyle = "#ffffff";
    ctx.fillText(part.text, x, y - fontSize*.17);
    ctx.restore();

    x += ctx.measureText(part.text).width;
  }
}

function downloadPNG(){
  render();
  const safe = ($("textInput").value || "telop")
    .replace(/[\\/:*?"<>|\s]/g,"_").slice(0,50);
  const a = document.createElement("a");
  a.download = `${safe}.png`;
  a.href = canvas.toDataURL("image/png");
  a.click();
}

async function copySettings(){
  const data = {
    text:$("textInput").value,
    preset:$("presetSelect").value,
    width:$("canvasW").value,
    height:$("canvasH").value,
    fontSize:$("fontSize").value,
    tilt:$("tilt").value,
    mainColor:$("mainColor").value,
    accentColor:$("accentColor").value,
    wordRules:$("wordRules").value
  };
  await navigator.clipboard.writeText(JSON.stringify(data,null,2));
  $("copyBtn").textContent = "コピー済み";
  setTimeout(()=>$("copyBtn").textContent="設定コピー", 1200);
}

function hexToRgba(hex, a){
  const n = parseInt(hex.slice(1),16);
  const r = (n>>16)&255, g=(n>>8)&255, b=n&255;
  return `rgba(${r},${g},${b},${a})`;
}

init();
