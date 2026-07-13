// Find the Cosmos search API JSON and dump its element structure (image ids + mux playback ids).
import pw from 'playwright';
import fs from 'node:fs';
const { chromium } = pw;
const CDP_URL = 'http://localhost:9222';
const QUERY = process.env.Q || 'Tesla';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await chromium.connectOverCDP(CDP_URL, { timeout: 120000 });
const context = browser.contexts()[0];
const page = await context.newPage();
page.setDefaultTimeout(45000);

const jsons = [];
page.on('response', async (res) => {
  try {
    const ct = res.headers()['content-type'] || '';
    if (!ct.includes('application/json')) return;
    const url = res.url();
    if (/analytics|sentry|amplitude|segment|posthog|stats|privy|mux\.com\/metrics/i.test(url)) return;
    let body;
    try { body = await res.json(); } catch { return; }
    const s = JSON.stringify(body);
    if (s.length < 200) return;
    jsons.push({ url, size: s.length, body });
  } catch {}
});

await page.goto(`https://www.cosmos.so/search/elements/${encodeURIComponent(QUERY)}`, { waitUntil: 'domcontentloaded' });
await sleep(3500);
await page.evaluate(() => window.scrollBy(0, 2000)); await sleep(2500);

// Rank JSON payloads by how "element-like" they look.
function score(body) {
  const s = JSON.stringify(body);
  let n = 0;
  n += (s.match(/playback/gi) || []).length * 5;
  n += (s.match(/cdn\.cosmos\.so/gi) || []).length;
  n += (s.match(/"width"|"height"/gi) || []).length;
  n += (s.match(/mux/gi) || []).length * 3;
  return n;
}
jsons.sort((a, b) => score(b.body) - score(a.body));

console.log(`captured ${jsons.length} JSON payloads. Top candidates:`);
for (const j of jsons.slice(0, 5)) console.log(`  score=${score(j.body)} size=${j.size}  ${j.url.slice(0, 100)}`);

const top = jsons[0];
if (top) {
  fs.writeFileSync('/tmp/cosmos-api-sample.json', JSON.stringify(top.body, null, 2));
  console.log(`\nTOP API: ${top.url}`);
  // Try to locate an array of element records and print ONE record.
  function findArray(o, path = '') {
    if (Array.isArray(o) && o.length && typeof o[0] === 'object') {
      const s = JSON.stringify(o[0]);
      if (/cdn\.cosmos\.so|playback|mux|width|height/i.test(s)) return { path, sample: o[0], len: o.length };
    }
    if (o && typeof o === 'object') {
      for (const k of Object.keys(o)) { const r = findArray(o[k], path + '.' + k); if (r) return r; }
    }
    return null;
  }
  const found = findArray(top.body);
  if (found) {
    console.log(`element array at: ${found.path}  (length ${found.len})`);
    console.log('KEYS:', Object.keys(found.sample));
    console.log('SAMPLE RECORD:\n', JSON.stringify(found.sample, null, 2).slice(0, 2500));
  } else {
    console.log('no obvious element array; top-level keys:', Object.keys(top.body));
    console.log('(full body saved to /tmp/cosmos-api-sample.json)');
  }
}

await page.close();
await browser.close();
console.log('\nDONE');
