// pinterest-collect.mjs — enrich each trend's candidate pool with Pinterest pins.
// Appends p01.jpg, p02.jpg ... into  "cosmos imagery/_candidates/<trend>/"  and extends meta.json
// (source:"pinterest"). Reuses the same cinematic queries. Uses the logged-in debug Chrome (:9222).
//   ONLY=tesla,analog TARGET=16 node pinterest-collect.mjs

import pw from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
const { chromium } = pw;

const CDP_URL  = 'http://localhost:9222';
const ROOT     = '/Users/tadeo/Documents/Prophecy/NOISE/noise-curator-v3.1';
const DATA_JS  = path.join(ROOT, 'scripts', 'data.js');
const CAND_DIR = path.join(ROOT, 'cosmos imagery', '_candidates');
const TARGET   = parseInt(process.env.TARGET || '16', 10);
const SCROLLS  = parseInt(process.env.SCROLLS || '10', 10);
const MIN_AR = 0.45, MAX_AR = 1.05;    // portrait-ish only
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// same cinematic query map as cosmos-collect.mjs
const QUERIES = {
  tesla:'Tesla car cinematic photography', elonmusk:'Elon Musk cinematic portrait',
  figureai:'humanoid robot cinematic dark studio', onex:'humanoid robot cinematic minimal',
  humanoidrobots:'humanoid robot cinematic dark', starwars:'Star Wars cinematic landscape',
  irl:'friends film photography golden hour', bearmarket:'stock trading floor cinematic moody',
  coinbase:'bitcoin crypto cinematic dark', claude:'warm minimal abstract cinematic light',
  chatgpt:'artificial intelligence abstract cinematic glow', agi:'artificial intelligence abstract cinematic',
  looksmaxxing:'male model cinematic portrait', vibecoding:'programmer night screen glow cinematic',
  wearables:'wearable tech product cinematic macro', runclubs:'running city cinematic motion',
  silvertsunami:'elderly portrait cinematic film', gtavi:'Vice City neon night cinematic',
  pokemon:'Pokemon cinematic nostalgic', microdramas:'cinematic film still moody couple',
  privatecredit:'finance skyscraper dusk cinematic', unemployment:'empty office window rain cinematic',
  eggs:'eggs still life cinematic', attentioneconomy:'phone glow dark room cinematic',
  sportsbetting:'stadium night lights cinematic',
  dopaminesites:'colorful gradient abstract cinematic glow', gameboymod:'Game Boy still life cinematic',
  ninetiesnostalgia:'90s film photography nostalgic', cgm:'skin macro cinematic medical',
  blindboxes:'designer toy figure cinematic product', tastewashing:'minimal still life editorial calm',
  snapspecs:'smart glasses product cinematic', prowrestling:'wrestling cinematic dramatic light',
  analog:'analog film photography grain moody', obsession:'moody cinematic portrait dark',
  calisthenics:'calisthenics silhouette cinematic', tcm:'chinese medicine herbs still life cinematic',
  zyns:'nicotine pouch tin product cinematic macro', ukunderground:'underground rave dark cinematic',
  peptides:'medical vials cinematic macro',
};

function loadTrends() {
  const src = fs.readFileSync(DATA_JS, 'utf8');
  const re = /^  ([a-z0-9]+):\{name:"([^"]+)",kind:"([a-z]+)"/gim;
  const out = []; let m;
  while ((m = re.exec(src))) out.push({ id: m[1], name: m[2], query: QUERIES[m[1]] || m[2] });
  return out;
}

// i.pinimg.com/<size>/<a>/<b>/<c>/<hash>.jpg  ->  originals
function toOriginal(u) { return u.replace(/i\.pinimg\.com\/(?:\d+x(?:\d+)?(?:_RS)?|originals)\//, 'i.pinimg.com/originals/'); }
function to736(u)      { return u.replace(/i\.pinimg\.com\/(?:\d+x(?:\d+)?(?:_RS)?|originals)\//, 'i.pinimg.com/736x/'); }
function pinKey(u)     { const m = u.match(/i\.pinimg\.com\/[^/]+\/(.+)$/); return m ? m[1] : u; }
const isAvatarish = (u) => /\/(?:\d{2,3}x\d{2,3}_RS|avatars|user_|75x75)/i.test(u);

async function ensurePage() {
  try { const l = await (await fetch(`${CDP_URL}/json`)).json(); if (!l.some(t=>t.type==='page')) await fetch(`${CDP_URL}/json/new?about:blank`, { method:'PUT' }); } catch {}
}
async function download(context, url, dest, timeout = 45000) {
  const res = await context.request.get(url, { timeout });
  if (!res.ok()) throw new Error(`HTTP ${res.status()}`);
  const body = await res.body();
  if (!body || body.length < 3000) throw new Error(`too small`);
  fs.writeFileSync(dest, body);
  return body.length;
}
function dims(f) { try { const w=+String(execFileSync('sips',['-g','pixelWidth',f])).match(/pixelWidth: (\d+)/)[1]; const h=+String(execFileSync('sips',['-g','pixelHeight',f])).match(/pixelHeight: (\d+)/)[1]; return {w,h}; } catch { return null; } }

async function harvest(page, seen) {
  let items = [];
  try {
    items = await page.$$eval('img', (imgs) => imgs.map((img) => ({ src: img.currentSrc || img.src || '', nw: img.naturalWidth||0, nh: img.naturalHeight||0 })));
  } catch {}
  for (const it of items) {
    if (!/i\.pinimg\.com/.test(it.src)) continue;
    const key = it.src.match(/i\.pinimg\.com\/[^/]+\/(.+)$/)?.[1];
    if (!key) continue;
    if (!seen.has(key)) seen.set(key, it);
    else { const p = seen.get(key); seen.set(key, { ...p, nw: Math.max(p.nw,it.nw), nh: Math.max(p.nh,it.nh) }); }
  }
}

async function main() {
  const ALL = loadTrends();
  const ONLY = process.env.ONLY ? process.env.ONLY.split(',').map(s=>s.trim()) : null;
  const TRENDS = ONLY ? ALL.filter(t=>ONLY.includes(t.id)) : ALL;

  await ensurePage();
  const browser = await chromium.connectOverCDP(CDP_URL, { timeout: 120000 });
  const context = browser.contexts()[0];
  const page = await context.newPage();
  page.setDefaultTimeout(45000);

  // cross-trend dedupe seeded from everything already saved
  const usedKeys = new Set();
  for (const d of fs.readdirSync(CAND_DIR)) {
    const mp = path.join(CAND_DIR, d, 'meta.json'); if (!fs.existsSync(mp)) continue;
    try { for (const it of JSON.parse(fs.readFileSync(mp,'utf8')).items) if (it.mediaKey) usedKeys.add(it.mediaKey); } catch {}
  }

  const summary = [];
  for (const t of TRENDS) {
    const outDir = path.join(CAND_DIR, t.id);
    fs.mkdirSync(outDir, { recursive: true });
    let existing = [];
    const mp = path.join(outDir, 'meta.json');
    if (fs.existsSync(mp)) { try { existing = JSON.parse(fs.readFileSync(mp,'utf8')).items || []; } catch {} }
    const pCount = existing.filter(i => /^p\d+\./.test(i.file || i.posterFile || '')).length;

    const url = `https://www.pinterest.com/search/pins/?q=${encodeURIComponent(t.query)}`;
    process.stdout.write(`\n──── ${t.id}  "${t.query}"\n`);
    const seen = new Map();
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded' });
      await sleep(3000);
      await harvest(page, seen);
      for (let i=0;i<SCROLLS;i++){ await page.evaluate(()=>window.scrollBy(0, 2200)); await sleep(900); await harvest(page, seen); }
    } catch (e) { console.log(`   ! nav error: ${e.message.split('\n')[0]}`); }

    const cands = [...seen.values()].filter(it => {
      if (isAvatarish(it.src)) return false;
      const ar = it.nw && it.nh ? it.nw/it.nh : 0;
      if (!ar || ar < MIN_AR || ar > MAX_AR) return false;
      const key = pinKey(toOriginal(it.src));
      return !usedKeys.has(key);
    });
    console.log(`   harvested ${seen.size} pins · ${cands.length} pass aspect filter · adding up to ${TARGET}`);

    const meta = [...existing];
    let n = 0;
    for (const it of cands) {
      if (n >= TARGET) break;
      const idx = String(pCount + n + 1).padStart(2, '0');
      const file = `p${idx}.jpg`, dest = path.join(outDir, file);
      const key = pinKey(toOriginal(it.src));
      let ok = false;
      for (const cand of [toOriginal(it.src), to736(it.src)]) {
        try { await download(context, cand, dest); ok = true; break; } catch {}
      }
      if (!ok) continue;
      const d = dims(dest) || { w: it.nw, h: it.nh };
      if (d.w < 500 || d.h < 650) { fs.rmSync(dest, { force: true }); continue; }  // reject low-res originals
      const ar = +(d.w/d.h).toFixed(3);
      if (ar > MAX_AR) { fs.rmSync(dest, { force: true }); continue; }
      usedKeys.add(key);
      meta.push({ id: `pin-${key.slice(0,16)}`, source: 'pinterest', type: 'image', file, posterFile: file,
                  mediaKey: key, width: d.w, height: d.h, aspect: ar, sourceUrl: `https://i.pinimg.com/originals/${key}`, caption: '', author: '' });
      process.stdout.write(`   ✓ ${file} ${d.w}x${d.h} ${ar}\n`);
      n++;
    }
    fs.writeFileSync(mp, JSON.stringify({ trend: t, count: meta.length, items: meta }, null, 2));
    summary.push({ id: t.id, added: n, total: meta.length });
    await sleep(1200);
  }

  console.log('\n════════ PINTEREST SUMMARY ════════');
  for (const s of summary) console.log(`  ${s.id.padEnd(18)} +${s.added}  (pool ${s.total})`);
  try { await page.close(); } catch {}
  try { await browser.close(); } catch {}
  console.log('\nDONE');
}
main().catch(e => { console.error(e); process.exit(1); });
