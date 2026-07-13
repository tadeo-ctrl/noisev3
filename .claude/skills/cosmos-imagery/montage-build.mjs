// Build a labeled contact-sheet montage per trend from its candidate posters/images.
// Output: cosmos imagery/_montages/<trend>.jpg   (grid; each cell labeled cNN TYPE WxH ar)
//   ONLY=tesla node montage-build.mjs
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT = '/Users/tadeo/Documents/Prophecy/NOISE/noise-curator-v3.1';
const CAND = path.join(ROOT, 'cosmos imagery', '_candidates');
const OUT  = path.join(ROOT, 'cosmos imagery', '_montages');
fs.mkdirSync(OUT, { recursive: true });

const trends = process.env.ONLY ? process.env.ONLY.split(',').map(s=>s.trim())
  : fs.readdirSync(CAND).filter(d => fs.existsSync(path.join(CAND, d, 'meta.json')));

for (const trend of trends) {
  const meta = JSON.parse(fs.readFileSync(path.join(CAND, trend, 'meta.json'), 'utf8'));
  const items = meta.items.filter(it => it.posterFile);
  if (!items.length) { console.log(`skip ${trend} (no items)`); continue; }
  const FONT = ['/System/Library/Fonts/Helvetica.ttc','/System/Library/Fonts/Supplemental/Arial.ttf','/Library/Fonts/Arial.ttf'].find(f=>fs.existsSync(f));
  const args = ['-background', '#0b0b0b', '-fill', '#f2f2f2', ...(FONT?['-font',FONT]:[]), '-pointsize', '22'];
  for (const it of items) {
    const cand = (it.posterFile || '').replace(/\.[a-z0-9]+$/i, '');
    const tag = it.type === 'video' ? `VID ${it.durationSec||'?'}s` : 'IMG';
    const label = `${cand}  ${tag}  ${it.width}x${it.height}  ${it.aspect}`;
    args.push('-label', label, path.join(CAND, trend, it.posterFile));
  }
  const cols = items.length > 24 ? 6 : 5, rows = Math.ceil(items.length / cols);
  args.push('-tile', `${cols}x${rows}`, '-geometry', '360x480+8+6', path.join(OUT, `${trend}.jpg`));
  try { execFileSync('montage', args, { stdio: ['ignore', 'pipe', 'pipe'] }); console.log(`✓ ${trend}.jpg (${items.length} cells)`); }
  catch (e) { console.log(`✗ ${trend}: ${String(e.message||e).split('\n')[0]}`); }
}
console.log('montages done');
