import fs from 'node:fs';
import vm from 'node:vm';

const html = fs.readFileSync('index.html', 'utf8');
const dataJs = fs.readFileSync('scripts/data.js', 'utf8');
const appJs = fs.readFileSync('scripts/app.js', 'utf8');
const css = fs.readFileSync('styles/app.css', 'utf8');

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

assert(html.includes('<link rel="stylesheet" href="styles/app.css">'), 'index.html must load styles/app.css');
assert(
  html.indexOf('<script src="scripts/data.js">') >= 0 &&
  html.indexOf('<script src="scripts/data.js">') < html.indexOf('<script src="scripts/app.js">'),
  'index.html must load data.js before app.js'
);
assert(!html.match(/<style>[\s\S]*<\/style>/), 'index.html should not contain inline CSS');
assert(!html.match(/<script>[\s\S]*<\/script>/), 'index.html should not contain inline JavaScript');
assert(css.includes('@font-face'), 'app.css should contain the embedded font definitions');
assert(css.includes('touch-action:pan-y'), 'feed carousel must preserve native vertical panning');
assert(css.includes('transform-style:preserve-3d'), 'feed carousel should keep a 3D transform context');
assert(!css.includes('.dots{') && !appJs.includes('data-dots') && !appJs.includes('class="dots"'), 'feed carousel top indicators should not render');
assert(!appJs.includes('proMode') && !appJs.includes('chartHTML(') && !appJs.includes('function tickCharts'), 'Pro mode and the candlestick feed should be fully removed (single surface)');
assert(css.includes('.cmp-opt-media') && css.includes('aspect-ratio:205/444'), 'compose trend picker previews should match post video aspect ratio');
assert(css.includes('.cmp-opt{display:flex;align-items:flex-start'), 'compose trend picker labels should align to the top of video previews');
new vm.Script(dataJs, { filename: 'scripts/data.js' });
new vm.Script(appJs, { filename: 'scripts/app.js' });

assert(appJs.includes('var MAXVIDS = isPhone ? 4 : 12;'), 'mobile video cap should remain bounded');
assert(appJs.includes("v.preload=isPhone?'metadata':'auto'"), 'mobile videos should preload metadata only');
assert(appJs.includes('function releaseMediaIn(container)'), 'media cleanup helper is required');
assert(appJs.includes('function refreshActiveMedia(container)'), 'active-screen media refresh helper is required');
assert(appJs.includes('function clipAttrs(id,n,thumb,extra)'), 'clip attribute helper is required');
assert(appJs.includes('function renderCubePosition'), 'feed carousel cube renderer is required');
assert(appJs.includes('rotateY'), 'feed carousel should use a 3D cube-style transition');
assert(appJs.includes('Math.min(90,d*90)'), 'feed carousel faces should rotate outward as a convex cube');
assert(appJs.includes('Math.min(100,d*100)'), 'feed carousel faces should translate to one shared hinge');
assert(css.includes('.feed.single') && css.includes('background:#0f0f13'), 'single feed should keep a dark cube underlay');
assert(appJs.includes('setPointerCapture'), 'feed carousel should capture horizontal drags after axis lock');
assert(appJs.includes('if(c.n<2)'), 'single-slide feed tracks should skip horizontal carousel dragging');
assert(appJs.includes("var feedMode='single'") && appJs.includes('function renderFeedSingle(') && css.includes('.feed.single'), 'Home should default to the immersive one-trend feed');
assert(appJs.includes('function cardHTML(') && appJs.includes('colHtml[c]+=cardHTML(') && css.includes('.feedcol'), 'the zoomed-out feed should retain its Cosmos-style masonry board');
assert(appJs.includes('var FEED_RATIOS=') && appJs.match(/FEED_RATIOS=\[\[.*\],\[.*\]/) && css.includes('.fcard') && css.includes('aspect-ratio:9/16'), 'zoomed-out feed cards should use mixed placeholder ratios via inline aspect-ratio');
assert(appJs.includes('function previewClipId(id)') && appJs.includes('class="cmp-opt-media"') && appJs.includes('clipAttrs(vid,1,true)'), 'compose trend picker should render video-backed trend previews');
assert(!html.includes('LEEME_EDDY') && !dataJs.includes('LEEME_EDDY') && !appJs.includes('LEEME_EDDY'), 'personal handoff filename should not be referenced');
assert(!appJs.match(/querySelectorAll\('\[data-vsrc\]'\)\.forEach\(function\(el\)\{mountVid\(el\);/), 'avoid eager mounting entire containers');
assert(!dataJs.includes('document.'), 'data.js should stay free of DOM work');

const clipManifest = dataJs.match(/var CLIPS=\{([^}]+)\}/);
assert(clipManifest, 'CLIPS manifest is required');

const missingThumbs = [];
const missingFeedAssets = [];
const missingPosters = [];
for (const [, slug, countText] of clipManifest[1].matchAll(/([a-z0-9]+):([0-9]+)/g)) {
  const count = Number(countText);
  for (let i = 1; i <= count; i += 1) {
    const thumb = `media/thumbs/${slug}/0${i}.mp4`;
    const full = `media/${slug}/0${i}.mp4`;
    const poster = `media/${slug}/0${i}.jpg`;
    if (!fs.existsSync(thumb)) missingThumbs.push(thumb);
    if (!fs.existsSync(full)) missingFeedAssets.push(full);
    // Posters are OPTIONAL. Delete any you don't want — the clip slide falls back to the
    // trend's colour until the video decodes. Reported, never fatal.
    if (!fs.existsSync(poster)) missingPosters.push(poster);
  }
}

assert(missingThumbs.length === 0, `missing thumbnail clips:\n${missingThumbs.join('\n')}`);
assert(missingFeedAssets.length === 0, `missing full-screen feed clips:\n${missingFeedAssets.join('\n')}`);

if (missingPosters.length) {
  console.log(`note: ${missingPosters.length} clip(s) have no poster frame — those slides will show the trend's colour until the video decodes (not an error):`);
  for (const p of missingPosters.slice(0, 10)) console.log(`  ${p}`);
}

console.log('basic regression checks passed');
