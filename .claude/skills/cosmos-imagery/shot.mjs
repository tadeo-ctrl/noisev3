import pw from 'playwright';
const { chromium } = pw;
const URL = process.env.URL || 'http://localhost:8787/slideshow.html';
const OUT = process.env.OUT || '/tmp/slideshow-shot.png';
const sleep = (ms)=>new Promise(r=>setTimeout(r,ms));
try { const l = await (await fetch('http://localhost:9222/json')).json(); if(!l.some(t=>t.type==='page')) await fetch('http://localhost:9222/json/new?about:blank',{method:'PUT'}); } catch {}
const b = await chromium.connectOverCDP('http://localhost:9222',{timeout:120000});
const ctx = b.contexts()[0];
const p = await ctx.newPage();
await p.setViewportSize({ width: 1440, height: 900 });
await p.goto(URL, { waitUntil:'domcontentloaded' });
await sleep(2000);
const downs = parseInt(process.env.DOWN || '0', 10);
for (let i=0;i<downs;i++){ await p.keyboard.press('ArrowDown'); await sleep(300); }
await sleep(1200);
await p.screenshot({ path: OUT });
await p.close();
await b.close();
console.log('shot saved', OUT);
