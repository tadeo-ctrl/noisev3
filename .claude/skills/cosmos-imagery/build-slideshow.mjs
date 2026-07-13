// build-slideshow.mjs — generate a self-contained per-trend 9:16 slideshow at
//   "cosmos imagery/slideshow.html"
// Reads _selections/<id>.json (the judged picks) + _candidates/<id>/meta.json, and renders each
// pick inside a 9:16 frame (CSS object-fit:cover = exact preview of the final crop).
// If a trend has no selection yet it is skipped. Images referenced by relative path so the file
// works when opened locally from the "cosmos imagery" folder.
import fs from 'node:fs';
import path from 'node:path';

const ROOT = '/Users/tadeo/Documents/Prophecy/NOISE/noise-curator-v3.1';
const IMG  = path.join(ROOT, 'cosmos imagery');
const SEL  = path.join(IMG, '_selections');
const CAND = path.join(IMG, '_candidates');
const DATA_JS = path.join(ROOT, 'scripts', 'data.js');

// display names from data.js
const names = {};
{ const src = fs.readFileSync(DATA_JS,'utf8'); const re=/^  ([a-z0-9]+):\{name:"([^"]+)"/gim; let m; while((m=re.exec(src))) names[m[1]]=m[2]; }

const order = Object.keys(names); // data.js order
const trends = [];
for (const id of order) {
  const selPath = path.join(SEL, `${id}.json`);
  const metaPath = path.join(CAND, id, 'meta.json');
  if (!fs.existsSync(selPath) || !fs.existsSync(metaPath)) continue;
  let sel, meta;
  try { sel = JSON.parse(fs.readFileSync(selPath,'utf8')); meta = JSON.parse(fs.readFileSync(metaPath,'utf8')); } catch { continue; }
  const byCand = new Map(meta.items.map(it => [ (it.posterFile||it.file||'').replace(/\.[a-z0-9]+$/i,''), it ]));
  const items = [];
  for (const pick of (sel.selected||[])) {
    const cand = typeof pick === 'string' ? pick : pick.cand;
    const it = byCand.get(cand); if (!it) continue;
    const pf = it.posterFile || it.file; if (!pf) continue;
    items.push({
      src: `_candidates/${id}/${pf}`,
      type: it.type || 'image',
      source: it.source || 'cosmos',
      w: it.width||0, h: it.height||0,
      caption: (it.caption||'').slice(0,140),
      reason: (typeof pick==='object' ? pick.reason : '')||'',
    });
  }
  if (!items.length) continue;
  trends.push({ id, name: names[id]||id, count: items.length, shortfall: !!sel.shortfall, items });
}

const DATA = JSON.stringify(trends);
const totalImgs = trends.reduce((a,t)=>a+t.items.length,0);

const html = `<meta charset="utf-8">
<title>NOISE — Cosmos imagery review</title>
<style>
  :root{--bg:#0a0a0b;--panel:#111113;--line:#26262b;--fg:#efeff2;--dim:#8a8a94;--accent:#e8613c}
  *{box-sizing:border-box}
  body{margin:0;background:var(--bg);color:var(--fg);font:14px/1.5 -apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;height:100vh;overflow:hidden}
  .app{display:grid;grid-template-columns:250px 1fr;height:100vh}
  /* sidebar */
  .side{border-right:1px solid var(--line);background:var(--panel);overflow-y:auto;padding:14px 0}
  .brand{padding:6px 18px 14px;font-weight:700;letter-spacing:.14em;font-size:12px;color:var(--dim)}
  .brand b{color:var(--fg)}
  .tr{display:flex;justify-content:space-between;align-items:center;gap:8px;padding:8px 18px;cursor:pointer;border-left:2px solid transparent;color:var(--dim)}
  .tr:hover{background:#17171a;color:var(--fg)}
  .tr.on{background:#1b1b1f;color:var(--fg);border-left-color:var(--accent)}
  .tr .n{font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .tr .c{font-size:11px;color:var(--dim);flex:none}
  .tr.short .c{color:#d99}
  /* main */
  .main{display:flex;flex-direction:column;min-width:0;height:100vh}
  .head{display:flex;align-items:baseline;gap:14px;padding:16px 22px 8px}
  .head h1{margin:0;font-size:20px;font-weight:650}
  .head .meta{color:var(--dim);font-size:12px}
  .stage{flex:1;display:flex;align-items:center;justify-content:center;gap:18px;padding:6px 22px;min-height:0}
  .frame{position:relative;height:min(78vh,calc((100vw - 620px)*16/9));aspect-ratio:9/16;background:#000;border-radius:18px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,.5);flex:none}
  .frame img,.frame video{width:100%;height:100%;object-fit:cover;display:block}
  .badge{position:absolute;top:12px;left:12px;background:rgba(0,0,0,.6);backdrop-filter:blur(6px);border:1px solid rgba(255,255,255,.15);color:#fff;font-size:10px;letter-spacing:.08em;padding:4px 8px;border-radius:999px;text-transform:uppercase}
  .nav{background:#141416;border:1px solid var(--line);color:var(--fg);width:44px;height:44px;border-radius:50%;font-size:20px;cursor:pointer;flex:none;opacity:.8}
  .nav:hover{opacity:1;border-color:var(--accent)}
  .cap{padding:6px 22px 4px;color:var(--dim);font-size:12px;text-align:center;min-height:20px}
  .cap .src{color:var(--accent);text-transform:uppercase;font-size:10px;letter-spacing:.08em;margin-right:8px}
  .strip{display:flex;gap:8px;overflow-x:auto;padding:12px 22px 18px}
  .th{height:76px;aspect-ratio:9/16;border-radius:8px;overflow:hidden;cursor:pointer;flex:none;opacity:.5;border:2px solid transparent}
  .th.on{opacity:1;border-color:var(--accent)}
  .th img{width:100%;height:100%;object-fit:cover;display:block}
  .counter{font-variant-numeric:tabular-nums}
  .toolbar{display:flex;gap:10px;align-items:center;margin-left:auto}
  .btn{background:#141416;border:1px solid var(--line);color:var(--fg);padding:6px 12px;border-radius:8px;cursor:pointer;font-size:12px}
  .btn:hover{border-color:var(--accent)}
  kbd{background:#1c1c20;border:1px solid var(--line);border-radius:4px;padding:1px 5px;font-size:11px;color:var(--dim)}
</style>
<div class="app">
  <div class="side" id="side">
    <div class="brand"><b>NOISE</b> · COSMOS IMAGERY</div>
  </div>
  <div class="main">
    <div class="head">
      <h1 id="tname"></h1>
      <span class="meta" id="tmeta"></span>
      <div class="toolbar">
        <span class="meta">${trends.length} trends · ${totalImgs} picks</span>
        <button class="btn" id="play">▶ Slideshow</button>
      </div>
    </div>
    <div class="stage">
      <button class="nav" id="prev">‹</button>
      <div class="frame" id="frame"></div>
      <button class="nav" id="next">›</button>
    </div>
    <div class="cap" id="cap"></div>
    <div class="strip" id="strip"></div>
  </div>
</div>
<script>
const TRENDS = ${DATA};
let ti = 0, ii = 0, playing = false, timer = null;
const side = document.getElementById('side');
TRENDS.forEach((t,i)=>{
  const d = document.createElement('div');
  d.className = 'tr'+(t.shortfall?' short':'');
  d.innerHTML = '<span class="n">'+t.name+'</span><span class="c">'+t.count+(t.shortfall?' ⚠':'')+'</span>';
  d.onclick = ()=>{ti=i;ii=0;render()};
  side.appendChild(d);
});
function render(){
  const t = TRENDS[ti], it = t.items[ii];
  document.querySelectorAll('.tr').forEach((el,i)=>el.classList.toggle('on',i===ti));
  document.getElementById('tname').textContent = t.name;
  document.getElementById('tmeta').textContent = t.count+' picks'+(t.shortfall?'  · under 10':'');
  const f = document.getElementById('frame');
  f.innerHTML = '<span class="badge">'+it.source+(it.type==='video'?' · video':'')+'</span>' +
    '<img src="'+encodeURI(it.src)+'" alt="">';
  document.getElementById('cap').innerHTML = '<span class="counter">'+(ii+1)+' / '+t.count+'</span>  ·  '+
    (it.caption||it.reason||'');
  const strip = document.getElementById('strip'); strip.innerHTML='';
  t.items.forEach((x,j)=>{
    const th=document.createElement('div'); th.className='th'+(j===ii?' on':'');
    th.innerHTML='<img src="'+encodeURI(x.src)+'">'; th.onclick=()=>{ii=j;render()};
    strip.appendChild(th);
  });
  const on = strip.querySelector('.th.on'); if(on) on.scrollIntoView({inline:'center',block:'nearest'});
  document.querySelector('.tr.on')?.scrollIntoView({block:'nearest'});
}
function next(){const t=TRENDS[ti]; ii++; if(ii>=t.items.length){ii=0; ti=(ti+1)%TRENDS.length;} render();}
function prev(){const t=TRENDS[ti]; ii--; if(ii<0){ti=(ti-1+TRENDS.length)%TRENDS.length; ii=TRENDS[ti].items.length-1;} render();}
document.getElementById('next').onclick=next;
document.getElementById('prev').onclick=prev;
document.getElementById('play').onclick=function(){playing=!playing; this.textContent=playing?'❚❚ Pause':'▶ Slideshow'; if(playing){timer=setInterval(next,2200);}else{clearInterval(timer);}};
document.addEventListener('keydown',e=>{
  if(e.key==='ArrowRight')next(); else if(e.key==='ArrowLeft')prev();
  else if(e.key==='ArrowDown'){ti=(ti+1)%TRENDS.length;ii=0;render();}
  else if(e.key==='ArrowUp'){ti=(ti-1+TRENDS.length)%TRENDS.length;ii=0;render();}
});
render();
</script>`;

fs.writeFileSync(path.join(IMG, 'slideshow.html'), html);
console.log(`slideshow.html written — ${trends.length} trends, ${totalImgs} picks`);
if (!trends.length) console.log('(no selections found yet — run the judging stage first)');
