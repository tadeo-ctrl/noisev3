// Probe how Cosmos serves media (images vs videos) in the search grid.
import pw from 'playwright';
const { chromium } = pw;

const CDP_URL = 'http://localhost:9222';
const QUERY = process.env.Q || 'Tesla';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await chromium.connectOverCDP(CDP_URL, { timeout: 120000 });
const context = browser.contexts()[0];
const page = await context.newPage();
page.setDefaultTimeout(45000);

const url = `https://www.cosmos.so/search/elements/${encodeURIComponent(QUERY)}`;
console.log('GOTO', url);
await page.goto(url, { waitUntil: 'domcontentloaded' });
await sleep(3000);
console.log('LANDED ON', page.url());
console.log('TITLE', await page.title());

// Scroll a few times to load grid.
for (let i = 0; i < 4; i++) { await page.evaluate(() => window.scrollBy(0, 2200)); await sleep(700); }

// Inspect videos.
const vids = await page.$$eval('video', (vs) => vs.slice(0, 8).map((v) => {
  const r = v.getBoundingClientRect();
  const sources = [...v.querySelectorAll('source')].map((s) => ({ src: s.src, type: s.type }));
  return {
    src: v.currentSrc || v.src || null,
    poster: v.poster || null,
    sources,
    vw: v.videoWidth, vh: v.videoHeight,
    w: Math.round(r.width), h: Math.round(r.height),
    outer: v.outerHTML.slice(0, 220),
  };
}));
console.log('\n==== VIDEOS (' + (await page.$$eval('video', v => v.length)) + ' total) ====');
console.log(JSON.stringify(vids, null, 2));

// Inspect a few imgs incl. any that might be video posters.
const imgs = await page.$$eval('img', (is) => {
  const seen = [];
  for (const img of is) {
    const src = img.currentSrc || img.src || '';
    if (!src) continue;
    const r = img.getBoundingClientRect();
    seen.push({ src, w: Math.round(r.width), h: Math.round(r.height), nw: img.naturalWidth, nh: img.naturalHeight });
  }
  return seen.slice(0, 10);
});
console.log('\n==== IMGS sample ====');
console.log(JSON.stringify(imgs, null, 2));

// Distinct hostnames among media-ish resources.
const hosts = await page.evaluate(() => {
  const set = new Set();
  document.querySelectorAll('img,video,source').forEach((el) => {
    const s = el.currentSrc || el.src || '';
    if (s) try { set.add(new URL(s).host); } catch {}
  });
  return [...set];
});
console.log('\n==== media hosts ====', hosts);

await page.close();
await browser.close();
console.log('\nDONE');
