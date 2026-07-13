// cosmos-finalize.mjs  —  STAGE 3 of the pipeline.
// Reads the judge's per-trend selections + candidate meta, then builds the final structure:
//   cosmos imagery/<trend>/NN.jpg|mp4         (full-res originals, ranked order)
//   cosmos imagery/<trend>/crops/NN.jpg|mp4   (exact 9:16, 1080x1920, center-cover crop)
//   cosmos imagery/<trend>/meta.json          (source/caption/dims per final item)
// Images cropped with `sips`, videos downloaded at Mux high.mp4 then cropped with `ffmpeg`.
//
//   ONLY=tesla,eggs node cosmos-finalize.mjs

import pw from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
const { chromium } = pw;

const CDP_URL  = 'http://localhost:9222';
const ROOT     = '/Users/tadeo/Documents/Prophecy/NOISE/noise-curator-v3.1';
const IMG_DIR  = path.join(ROOT, 'cosmos imagery');
const CAND_DIR = path.join(IMG_DIR, '_candidates');
const SEL_DIR  = path.join(IMG_DIR, '_selections');
const CW = 1080, CH = 1920;                 // exact 9:16 crop target
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function sh(cmd, args) { return execFileSync(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] }); }

// Center-cover crop an image to CW x CH using sips (no upscaling beyond what cover needs).
function cropImage(src, dst) {
  fs.copyFileSync(src, dst);
  const w = +String(sh('sips', ['-g', 'pixelWidth', dst])).match(/pixelWidth: (\d+)/)[1];
  const h = +String(sh('sips', ['-g', 'pixelHeight', dst])).match(/pixelHeight: (\d+)/)[1];
  const arS = w / h, arT = CW / CH;
  if (arS > arT) sh('sips', ['--resampleHeight', String(CH), dst]);   // wider → lock height
  else           sh('sips', ['--resampleWidth',  String(CW), dst]);   // taller/equal → lock width
  sh('sips', ['-c', String(CH), String(CW), dst]);                    // centered crop to HxW
}

// Center-cover crop a video to CW x CH with ffmpeg.
function cropVideo(src, dst) {
  sh('ffmpeg', ['-y', '-i', src,
    '-vf', `scale=${CW}:${CH}:force_original_aspect_ratio=increase,crop=${CW}:${CH}`,
    '-c:v', 'libx264', '-crf', '20', '-preset', 'veryfast', '-pix_fmt', 'yuv420p',
    '-an', '-movflags', '+faststart', dst]);
}

async function downloadVideo(context, urls, dst) {
  for (const u of urls) {
    try {
      const res = await context.request.get(u, { timeout: 120000 });
      if (!res.ok()) continue;
      const body = await res.body();
      if (body && body.length > 20000) { fs.writeFileSync(dst, body); return { ok: true, url: u, bytes: body.length }; }
    } catch {}
  }
  return { ok: false };
}

async function main() {
  const trends = (process.env.ONLY ? process.env.ONLY.split(',').map(s=>s.trim())
                  : fs.readdirSync(SEL_DIR).filter(f=>f.endsWith('.json')).map(f=>f.replace('.json','')));

  await (async () => { try { const l = await (await fetch(`${CDP_URL}/json`)).json(); if(!l.some(t=>t.type==='page')) await fetch(`${CDP_URL}/json/new?about:blank`,{method:'PUT'}); } catch {} })();
  const browser = await chromium.connectOverCDP(CDP_URL, { timeout: 120000 });
  const context = browser.contexts()[0];

  const master = {};
  for (const trend of trends) {
    const selPath = path.join(SEL_DIR, `${trend}.json`);
    const metaPath = path.join(CAND_DIR, trend, 'meta.json');
    if (!fs.existsSync(selPath) || !fs.existsSync(metaPath)) { console.log(`skip ${trend} (missing sel/meta)`); continue; }
    const sel = JSON.parse(fs.readFileSync(selPath, 'utf8'));
    const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
    const byCand = new Map(meta.items.map(it => [ (it.posterFile||it.file||'').replace(/\.[a-z0-9]+$/i,''), it ]));

    const outDir = path.join(IMG_DIR, trend);
    const cropDir = path.join(outDir, 'crops');
    fs.rmSync(outDir, { recursive: true, force: true });
    fs.mkdirSync(cropDir, { recursive: true });

    const finals = [];
    let n = 0;
    for (const pick of (sel.selected || [])) {
      const cand = typeof pick === 'string' ? pick : pick.cand;
      const it = byCand.get(cand);
      if (!it) { console.log(`  ${trend}: no meta for ${cand}`); continue; }
      const idx = String(n + 1).padStart(2, '0');
      try {
        if (it.type === 'image') {
          const srcJpg = path.join(CAND_DIR, trend, it.file);
          const orig = path.join(outDir, `${idx}.jpg`);
          fs.copyFileSync(srcJpg, orig);
          cropImage(orig, path.join(cropDir, `${idx}.jpg`));
          finals.push({ n: idx, type: 'image', file: `${idx}.jpg`, crop: `crops/${idx}.jpg`, width: it.width, height: it.height, caption: it.caption, sourceUrl: it.sourceUrl, author: it.author, shareUrl: it.shareUrl });
          process.stdout.write(`  ✓ ${trend}/${idx}.jpg (img)\n`);
        } else {
          const origMp4 = path.join(outDir, `${idx}.mp4`);
          const dl = await downloadVideo(context, it.videoUrls || [], origMp4);
          if (!dl.ok) { process.stdout.write(`  ✗ ${trend} ${cand} video dl failed\n`); continue; }
          cropVideo(origMp4, path.join(cropDir, `${idx}.mp4`));
          // also keep a poster next to it for previews
          const posterSrc = path.join(CAND_DIR, trend, it.posterFile || '');
          if (it.posterFile && fs.existsSync(posterSrc)) fs.copyFileSync(posterSrc, path.join(outDir, `${idx}.jpg`));
          finals.push({ n: idx, type: 'video', file: `${idx}.mp4`, crop: `crops/${idx}.mp4`, poster: `${idx}.jpg`, width: it.width, height: it.height, durationSec: it.durationSec, caption: it.caption, sourceUrl: it.sourceUrl, author: it.author, shareUrl: it.shareUrl });
          process.stdout.write(`  ✓ ${trend}/${idx}.mp4 (vid ${(dl.bytes/1e6).toFixed(1)}MB)\n`);
        }
        n++;
      } catch (e) { process.stdout.write(`  ✗ ${trend} ${cand}: ${String(e.message||e).split('\n')[0]}\n`); }
    }
    fs.writeFileSync(path.join(outDir, 'meta.json'), JSON.stringify({ trend, count: finals.length, shortfall: finals.length < 10, items: finals }, null, 2));
    master[trend] = { count: finals.length, images: finals.filter(f=>f.type==='image').length, videos: finals.filter(f=>f.type==='video').length, shortfall: finals.length < 10 };
    console.log(`── ${trend}: ${finals.length} finals (${master[trend].images} img / ${master[trend].videos} vid)${master[trend].shortfall?'  ⚠ under 10':''}`);
  }

  fs.writeFileSync(path.join(IMG_DIR, 'manifest.json'), JSON.stringify(master, null, 2));
  try { await browser.close(); } catch {}
  console.log('\nFINALIZE DONE. Wrote manifest.json');
}
main().catch(e => { console.error(e); process.exit(1); });
