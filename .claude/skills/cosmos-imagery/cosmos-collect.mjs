// cosmos-collect.mjs  —  STAGE 1 of the Cosmos imagery pipeline.
// Harvests the SearchGlobalElements GraphQL results (structured: true dims, caption,
// mux playback) while the logged-in page paginates, filters to portrait/safe/high-res
// candidates (photos + videos), downloads them into  "cosmos imagery/_candidates/<trend>/",
// and writes a meta.json per trend for the visual-judging stage.
//
// Prereq: debug Chrome on :9222 (setup-debug-chrome.sh) with at least one tab open.
//   ONLY=tesla,eggs node cosmos-collect.mjs   # limit to specific trend ids
//   TARGET=18 SCROLLS=8 node cosmos-collect.mjs

import pw from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
const { chromium } = pw;

const CDP_URL   = 'http://localhost:9222';
const ROOT      = '/Users/tadeo/Documents/Prophecy/NOISE/noise-curator-v3.1';
const DATA_JS   = path.join(ROOT, 'scripts', 'data.js');
const CAND_DIR  = path.join(ROOT, 'cosmos imagery', '_candidates');
const TARGET    = parseInt(process.env.TARGET || '20', 10);   // candidates to download per trend
const SCROLLS   = parseInt(process.env.SCROLLS || '9', 10);
const SCROLL_PAUSE = 900;
const BETWEEN   = 1200;
const MIN_W = 560, MIN_H = 760;      // reject tiny
const MAX_AR = 1.05;                 // width/height; keep portrait..~square, reject landscape
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---- cinematic-tuned search queries: bias toward calm, atmospheric, text-free PHOTOGRAPHY
// (many trends default to memes/UI/screenshots on Cosmos; mood words steer away from slop).
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

// ---- parse the authoritative trend list from data.js (keys of T)
function loadTrends() {
  const src = fs.readFileSync(DATA_JS, 'utf8');
  const re = /^  ([a-z0-9]+):\{name:"([^"]+)",kind:"([a-z]+)"/gim;
  const out = []; let m;
  while ((m = re.exec(src))) out.push({ id: m[1], name: m[2], kind: m[3], query: QUERIES[m[1]] || m[2] });
  return out;
}

const jpg  = (u, w = 1600) => { try { const x = new URL(u); x.searchParams.set('format','jpg'); x.searchParams.set('w', String(w)); return x.toString(); } catch { return u; } };

async function ensurePage() {
  // Make sure the debug browser has at least one page so connectOverCDP won't error.
  try {
    const list = await (await fetch(`${CDP_URL}/json`)).json();
    if (!list.some((t) => t.type === 'page')) await fetch(`${CDP_URL}/json/new?about:blank`, { method: 'PUT' });
  } catch {}
}

async function download(context, url, dest, timeout = 60000) {
  const res = await context.request.get(url, { timeout });
  if (!res.ok()) throw new Error(`HTTP ${res.status()}`);
  const body = await res.body();
  if (!body || body.length < 1024) throw new Error(`too small (${body?.length || 0}b)`);
  fs.writeFileSync(dest, body);
  return body.length;
}

function candidateFromItem(it) {
  const m = it.media; if (!m) return null;
  if (m.notSafeForWorkStatus && m.notSafeForWorkStatus !== 'SAFE') return null;
  const w = m.width || 0, h = m.height || 0;
  if (!w || !h) return null;
  const ar = w / h;
  if (ar > MAX_AR) return null;                 // landscape -> can't fill a 9:16 frame nicely
  if (w < MIN_W || h < MIN_H) return null;       // too small
  const base = {
    id: it.id, shareUrl: it.shareUrl,
    caption: (it.generatedCaption?.text || '').replace(/<\/?n>/g, ''),
    sourceUrl: it.source?.url || '', author: it.source?.author?.fullName || it.source?.author?.username || '',
    width: w, height: h, aspect: +(ar.toFixed(3)), aiGenerated: !!m.aiGenerated,
  };
  if (m.__typename === 'StaticImage') return { ...base, type: 'image', mediaKey: m.url.split('?')[0], dlUrl: jpg(m.url, 2000) };
  if (m.__typename === 'Video') {
    // Prefer Mux high.mp4 (crisp) → cosmos cdn .mp4 → Mux low.mp4. Downloaded only for WINNERS.
    const videoUrls = [m.mux?.downloadableUrl, m.url, m.mux?.mp4Url].filter(Boolean);
    return { ...base, type: 'video', durationSec: m.duration || 0,
      mediaKey: (m.mediaId || m.url || '').split('?')[0],
      videoUrls, posterUrl: jpg(m.thumbnail?.url || '', 1400) };
  }
  return null;
}

async function main() {
  const ALL = loadTrends();
  const ONLY = process.env.ONLY ? process.env.ONLY.split(',').map((s) => s.trim()) : null;
  const TRENDS = ONLY ? ALL.filter((t) => ONLY.includes(t.id)) : ALL;
  const MORE = !!process.env.MORE;   // append TARGET more candidates to existing pools (no re-download)
  fs.mkdirSync(CAND_DIR, { recursive: true });

  await ensurePage();
  const browser = await chromium.connectOverCDP(CDP_URL, { timeout: 120000 });
  const context = browser.contexts()[0];
  const page = await context.newPage();
  page.setDefaultTimeout(45000);

  // Accumulate every SearchGlobalElements item across pagination, per navigation.
  let bucket = new Map();
  page.on('response', async (res) => {
    try {
      if (!/graphql\?q=SearchGlobalElements/.test(res.url())) return;
      const j = await res.json();
      const items = j?.data?.searchElements?.items || [];
      for (const it of items) if (!bucket.has(it.id)) bucket.set(it.id, it);
    } catch {}
  });

  const usedKeys = new Set();
  // In MORE mode, seed cross-trend dedupe with everything already saved anywhere.
  if (MORE) {
    for (const d of fs.readdirSync(CAND_DIR)) {
      const mp = path.join(CAND_DIR, d, 'meta.json');
      if (!fs.existsSync(mp)) continue;
      try { for (const it of JSON.parse(fs.readFileSync(mp, 'utf8')).items) if (it.mediaKey) usedKeys.add(it.mediaKey); } catch {}
    }
  }
  const summary = [];

  for (const t of TRENDS) {
    bucket = new Map();
    const outDir = path.join(CAND_DIR, t.id);
    let existing = [];
    if (MORE && fs.existsSync(path.join(outDir, 'meta.json'))) {
      try { existing = JSON.parse(fs.readFileSync(path.join(outDir, 'meta.json'), 'utf8')).items || []; } catch {}
    }
    const startIndex = existing.length;
    if (!MORE) { fs.rmSync(outDir, { recursive: true, force: true }); }
    fs.mkdirSync(outDir, { recursive: true });
    const url = `https://www.cosmos.so/search/elements/${encodeURIComponent(t.query)}`;
    process.stdout.write(`\n──── ${t.id}  "${t.query}"\n`);
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded' });
      await sleep(2500);
      if (!/\/search\/elements\//.test(page.url())) { console.log('   ! fell back to feed, skipping'); summary.push({ id: t.id, seen: 0, saved: 0, note: 'feed fallback' }); continue; }
      for (let i = 0; i < SCROLLS; i++) { await page.evaluate(() => window.scrollBy(0, 2200)); await sleep(SCROLL_PAUSE); }
      await sleep(1200);

      const items = [...bucket.values()];
      const cands = [];
      for (const it of items) {
        const c = candidateFromItem(it);
        if (!c) continue;
        if (usedKeys.has(c.mediaKey)) continue;   // cross-trend dedupe
        cands.push(c);
      }
      console.log(`   seen ${items.length} elements · ${cands.length} pass filter · downloading up to ${TARGET}`);

      const meta = [...existing];
      let n = 0;
      for (const c of cands) {
        if (n >= TARGET) break;
        const idx = String(startIndex + n + 1).padStart(2, '0');
        try {
          if (c.type === 'image') {
            const file = `c${idx}.jpg`;
            const kb = await download(context, c.dlUrl, path.join(outDir, file));
            usedKeys.add(c.mediaKey);
            meta.push({ ...c, file, posterFile: file, bytes: kb });
            process.stdout.write(`   ✓ img ${file} ${(kb/1024|0)}KB ${c.width}x${c.height}\n`);
          } else {
            // VIDEO: download only the poster still for judging; keep mux urls for the finalize step.
            const pfile = `c${idx}.jpg`;
            if (!c.posterUrl) { process.stdout.write(`   ✗ vid c${idx} no poster, skip\n`); continue; }
            try { await download(context, c.posterUrl, path.join(outDir, pfile)); }
            catch (e) { process.stdout.write(`   ✗ vid c${idx} poster failed: ${e.message}\n`); continue; }
            usedKeys.add(c.mediaKey);
            meta.push({ ...c, file: null, posterFile: pfile });
            process.stdout.write(`   ◧ vid poster ${pfile} ${c.width}x${c.height} ${c.durationSec}s\n`);
          }
          n++;
        } catch (e) { process.stdout.write(`   ✗ c${idx} ${e.message}\n`); }
      }
      fs.writeFileSync(path.join(outDir, 'meta.json'), JSON.stringify({ trend: t, count: meta.length, items: meta }, null, 2));
      summary.push({ id: t.id, seen: items.length, saved: meta.length });
    } catch (e) {
      console.log(`   ! error: ${e.message.split('\n')[0]}`);
      summary.push({ id: t.id, seen: bucket.size, saved: 0, note: e.message.split('\n')[0] });
    }
    await sleep(BETWEEN);
  }

  fs.writeFileSync(path.join(CAND_DIR, 'summary.json'), JSON.stringify(summary, null, 2));
  console.log('\n════════ COLLECT SUMMARY ════════');
  for (const s of summary) console.log(`  ${s.id.padEnd(18)} seen ${String(s.seen).padStart(3)}  saved ${String(s.saved).padStart(2)}${s.note ? '  ('+s.note+')' : ''}`);

  try { await page.close(); } catch {}
  try { await browser.close(); } catch {}
  console.log('\nDONE');
}
main().catch((e) => { console.error(e); process.exit(1); });
