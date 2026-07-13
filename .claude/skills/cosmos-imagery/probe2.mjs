// Probe the NETWORK to find the real (non-blob) video URLs Cosmos fetches.
import pw from 'playwright';
const { chromium } = pw;
const CDP_URL = 'http://localhost:9222';
const QUERY = process.env.Q || 'Tesla';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await chromium.connectOverCDP(CDP_URL, { timeout: 120000 });
const context = browser.contexts()[0];
const page = await context.newPage();
page.setDefaultTimeout(45000);

const media = new Map(); // url -> {type, ct, status}
page.on('response', async (res) => {
  try {
    const req = res.request();
    const rt = req.resourceType();
    const url = res.url();
    const ct = res.headers()['content-type'] || '';
    if (rt === 'media' || ct.startsWith('video/') || /\.mp4|\.webm|\.m3u8|\/video/i.test(url)) {
      media.set(url, { rt, ct, status: res.status() });
    }
  } catch {}
});

await page.goto(`https://www.cosmos.so/search/elements/${encodeURIComponent(QUERY)}`, { waitUntil: 'domcontentloaded' });
await sleep(2500);

// Hover over videos to trigger full load, scrolling through.
for (let i = 0; i < 5; i++) {
  const boxes = await page.$$('video');
  for (const v of boxes.slice(0, 12)) {
    try { await v.hover({ timeout: 1000 }); await sleep(250); } catch {}
  }
  await page.evaluate(() => window.scrollBy(0, 1800));
  await sleep(900);
}
await sleep(1500);

console.log('==== media/video network requests ====');
for (const [url, m] of media) console.log(`[${m.status}] ${m.rt} ${m.ct}\n   ${url}`);
console.log(`(total ${media.size})`);

// Also: for each video element, dump poster uuid + try to read a resolved src from the element's fetch.
const vinfo = await page.$$eval('video', (vs) => vs.slice(0, 6).map((v) => ({
  poster: v.poster, src: v.src, vw: v.videoWidth, vh: v.videoHeight,
})));
console.log('\n==== video elements ====');
console.log(JSON.stringify(vinfo, null, 2));

// Test whether poster uuid resolves to a video via known url shapes.
const testPoster = vinfo[0]?.poster?.split('/').pop()?.split('?')[0];
if (testPoster) {
  const tries = [
    `https://cdn.cosmos.so/${testPoster}.mp4`,
    `https://cdn.cosmos.so/${testPoster}?format=mp4`,
    `https://cdn.cosmos.so/${testPoster}/video.mp4`,
  ];
  console.log('\n==== probing poster->video url shapes for', testPoster, '====');
  for (const t of tries) {
    try { const r = await context.request.get(t, { timeout: 8000 }); console.log(`  ${r.status()} ${r.headers()['content-type']||''}  ${t}`); }
    catch (e) { console.log(`  ERR ${t} :: ${e.message.split('\n')[0]}`); }
  }
}

await page.close();
await browser.close();
console.log('\nDONE');
