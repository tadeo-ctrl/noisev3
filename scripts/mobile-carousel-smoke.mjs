import { spawn } from 'node:child_process';
import { createReadStream } from 'node:fs';
import fs from 'node:fs/promises';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const chromeCandidates = [
  process.env.CHROME_PATH,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
].filter(Boolean);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function exists(file) {
  try {
    await fs.access(file);
    return true;
  } catch {
    return false;
  }
}

async function findChrome() {
  for (const candidate of chromeCandidates) {
    if (await exists(candidate)) return candidate;
  }
  throw new Error('Chrome executable not found. Set CHROME_PATH to run the mobile carousel smoke test.');
}

function contentType(file) {
  if (file.endsWith('.html')) return 'text/html; charset=utf-8';
  if (file.endsWith('.css')) return 'text/css; charset=utf-8';
  if (file.endsWith('.js')) return 'text/javascript; charset=utf-8';
  if (file.endsWith('.json')) return 'application/json; charset=utf-8';
  if (file.endsWith('.jpg') || file.endsWith('.jpeg')) return 'image/jpeg';
  if (file.endsWith('.png')) return 'image/png';
  if (file.endsWith('.avif')) return 'image/avif';
  if (file.endsWith('.svg')) return 'image/svg+xml';
  if (file.endsWith('.mp4')) return 'video/mp4';
  return 'application/octet-stream';
}

async function startServer() {
  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url || '/', 'http://127.0.0.1');
      let pathname = decodeURIComponent(url.pathname);
      if (pathname === '/favicon.ico') {
        res.writeHead(204);
        res.end();
        return;
      }
      if (pathname === '/') pathname = '/index.html';
      const file = path.normalize(path.join(repoRoot, pathname));
      if (!file.startsWith(repoRoot + path.sep)) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
      }
      const stat = await fs.stat(file);
      if (!stat.isFile()) {
        res.writeHead(404);
        res.end('Not found');
        return;
      }
      res.writeHead(200, { 'Content-Type': contentType(file), 'Content-Length': stat.size });
      createReadStream(file).pipe(res);
    } catch {
      res.writeHead(404);
      res.end('Not found');
    }
  });

  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  return {
    server,
    url: `http://127.0.0.1:${server.address().port}/?v=mobile-carousel-smoke`,
  };
}

class CdpClient {
  constructor(socket) {
    this.socket = socket;
    this.nextId = 1;
    this.pending = new Map();
    this.events = [];
    socket.addEventListener('message', (event) => this.onMessage(event));
  }

  onMessage(event) {
    const message = JSON.parse(event.data);
    if (message.id && this.pending.has(message.id)) {
      const { resolve, reject } = this.pending.get(message.id);
      this.pending.delete(message.id);
      if (message.error) reject(new Error(message.error.message));
      else resolve(message.result || {});
      return;
    }
    this.events.push(message);
  }

  send(method, params = {}, sessionId) {
    const id = this.nextId++;
    const message = { id, method, params };
    if (sessionId) message.sessionId = sessionId;
    this.socket.send(JSON.stringify(message));
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      setTimeout(() => {
        if (!this.pending.has(id)) return;
        this.pending.delete(id);
        reject(new Error(`CDP command timed out: ${method}`));
      }, 10000);
    });
  }
}

async function connect(wsUrl) {
  assert(globalThis.WebSocket, 'This Node.js runtime does not expose WebSocket.');
  const socket = new WebSocket(wsUrl);
  await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true });
    socket.addEventListener('error', reject, { once: true });
  });
  return new CdpClient(socket);
}

async function launchChrome(chromePath) {
  const userDataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'noise-carousel-chrome-'));
  const child = spawn(chromePath, [
    '--headless=new',
    '--disable-gpu',
    '--disable-background-networking',
    '--disable-default-apps',
    '--disable-extensions',
    '--no-default-browser-check',
    '--no-first-run',
    '--remote-debugging-port=0',
    `--user-data-dir=${userDataDir}`,
    'about:blank',
  ], { stdio: ['ignore', 'pipe', 'pipe'] });

  const wsUrl = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Timed out waiting for Chrome DevTools URL.')), 10000);
    const inspect = (chunk) => {
      const match = String(chunk).match(/DevTools listening on (ws:\/\/[^\s]+)/);
      if (!match) return;
      clearTimeout(timer);
      resolve(match[1]);
    };
    child.stdout.on('data', inspect);
    child.stderr.on('data', inspect);
    child.once('exit', (code) => {
      clearTimeout(timer);
      reject(new Error(`Chrome exited before DevTools was ready: ${code}`));
    });
  });

  return { child, userDataDir, wsUrl };
}

async function sleep(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const chromePath = await findChrome();
  const { server, url } = await startServer();
  const chrome = await launchChrome(chromePath);
  const cdp = await connect(chrome.wsUrl);

  try {
    const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' });
    const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });
    await cdp.send('Page.enable', {}, sessionId);
    await cdp.send('Runtime.enable', {}, sessionId);
    await cdp.send('Log.enable', {}, sessionId);
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: 390,
      height: 844,
      deviceScaleFactor: 3,
      mobile: true,
    }, sessionId);
    await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 }, sessionId);
    await cdp.send('Page.navigate', { url }, sessionId);

    await waitForApp(cdp, sessionId);
    const before = await readState(cdp, sessionId);
    assert(before.cardCount >= 8, `expected a populated single-trend feed, got ${before.cardCount} topics`);
    assert(before.singleMode, 'Home should open in the immersive single-trend feed mode');
    assert(before.firstCardId === 'humanoidrobots', `highest-degree trend should lead the feed, got ${before.firstCardId}`);
    assert(before.carouselIndicators === 0, `top carousel indicators should not render, got ${before.carouselIndicators}`);
    assert(before.mountedVideos <= 4, `too many videos mounted initially: ${before.mountedVideos}`);

    // A left drag should hinge both panels around their shared edge as the outside of a cube:
    // the outgoing (left) face rotates negative and the incoming (right) face rotates positive.
    const cubeEnd = await holdMouseDrag(cdp, sessionId, [[300, 420], [260, 420], [210, 420], [155, 420], [105, 420]]);
    const cubeMid = await readCubeState(cdp, sessionId);
    assert(cubeMid.dragging, 'feed carousel should enter its drag state during a horizontal gesture');
    assert(cubeMid.outgoingRotation < 0, `outgoing cube face should rotate away on the left, got ${cubeMid.outgoingRotation}deg`);
    assert(cubeMid.incomingRotation > 0, `incoming cube face should rotate in from the right, got ${cubeMid.incomingRotation}deg`);
    assert(Math.abs(cubeMid.outgoingRotation + 45) < 0.2, `outgoing face should be -45deg at midpoint, got ${cubeMid.outgoingRotation}deg`);
    assert(Math.abs(cubeMid.incomingRotation - 45) < 0.2, `incoming face should be 45deg at midpoint, got ${cubeMid.incomingRotation}deg`);
    assert(cubeMid.outgoingOrigin === 'right center', `outgoing cube face should hinge on its right edge, got ${cubeMid.outgoingOrigin}`);
    assert(cubeMid.incomingOrigin === 'left center', `incoming cube face should hinge on its left edge, got ${cubeMid.incomingOrigin}`);
    assert(cubeMid.seamGap < 0.05, `cube faces should share one hinge, got a ${cubeMid.seamGap}% gap`);
    assert(cubeMid.outgoingOpacity === 1 && cubeMid.incomingOpacity === 1, 'both cube faces should remain opaque during the drag');
    assert(cubeMid.incomingMounted, 'incoming cube face should mount as soon as the drag begins');
    assert(cubeMid.incomingHasVisual, 'incoming cube face should show its poster or video during the drag');
    assert(cubeMid.trackBackground === 'rgb(15, 15, 19)', `cube underlay should be dark, got ${cubeMid.trackBackground}`);
    await releaseMouseDrag(cdp, sessionId, cubeEnd);
    await sleep(500);

    // The N° control moves through three presentations as one continuous zoom. Each state keeps a
    // visual bridge while the next is built, and bounds the amount of media work done on a phone.
    await evaluate(cdp, sessionId, `document.getElementById('feed-menu').click()`);
    await sleep(80);
    const boardEarly = await readZoomState(cdp, sessionId);
    assert(boardEarly.mode === 'board', `first N° tap should open the board, got ${boardEarly.mode}`);
    assert(boardEarly.busy, 'single-to-board transition should report its brief busy state');
    assert(boardEarly.ghosts === 1, `single-to-board transition should retain one visual bridge, got ${boardEarly.ghosts}`);
    assert(boardEarly.cards === before.cardCount, `board should already contain the full ${before.cardCount}-trend feed during the transition, got ${boardEarly.cards} cards`);
    assert(boardEarly.visualCards === boardEarly.cards, `every board card should have a visual fallback, got ${boardEarly.visualCards}/${boardEarly.cards}`);
    await sleep(500);
    const board = await readZoomState(cdp, sessionId);
    assert(!board.busy && board.ghosts === 0, 'single-to-board transition should clean up its temporary state');
    assert(board.feedDescendants < 450, `board DOM is unexpectedly heavy: ${board.feedDescendants} descendants`);
    assert(board.mountedVideos <= 4, `too many videos mounted on board: ${board.mountedVideos}`);

    await evaluate(cdp, sessionId, `document.getElementById('feed-menu').click()`);
    await sleep(100);
    const galaxyEarly = await readZoomState(cdp, sessionId);
    assert(galaxyEarly.mode === 'galaxy', `second N° tap should open the galaxy, got ${galaxyEarly.mode}`);
    assert(galaxyEarly.busy, 'board-to-galaxy transition should report its brief busy state');
    assert(galaxyEarly.galaxyTiles >= 30 && galaxyEarly.galaxyTiles <= 90, `galaxy buffer should stay bounded, got ${galaxyEarly.galaxyTiles} tiles`);
    assert(galaxyEarly.loadedGalaxyTiles === galaxyEarly.galaxyTiles, `every galaxy tile should have an immediate visual, got ${galaxyEarly.loadedGalaxyTiles}/${galaxyEarly.galaxyTiles}`);
    assert(galaxyEarly.visibleUnreadyVideos === 0, `unready galaxy videos must not cover their fallback, got ${galaxyEarly.visibleUnreadyVideos}`);
    await sleep(500);
    const galaxy = await readZoomState(cdp, sessionId);
    assert(!galaxy.busy, 'board-to-galaxy transition should settle');
    assert(galaxy.mountedVideos <= 6, `too many videos mounted in galaxy: ${galaxy.mountedVideos}`);
    assert(galaxy.prematureVideoReveals === 0, `warming videos must keep their poster visible, got ${galaxy.prematureVideoReveals}`);

    await evaluate(cdp, sessionId, `document.getElementById('feed-menu').click()`);
    await sleep(100);
    const singleEarly = await readZoomState(cdp, sessionId);
    assert(singleEarly.mode === 'single', `third N° tap should wrap to the single feed, got ${singleEarly.mode}`);
    assert(singleEarly.busy, 'galaxy-to-single transition should report its brief busy state');
    assert(singleEarly.galaxyTiles > 0, 'outgoing galaxy should remain as a visual bridge during its fade');
    await sleep(550);
    const single = await readZoomState(cdp, sessionId);
    assert(!single.busy && single.galaxyTiles === 0, 'galaxy-to-single transition should clean up its temporary state');
    assert(single.hydratedTopics <= 4, `single feed should hydrate only nearby carousels, got ${single.hydratedTopics}`);
    assert(single.feedDescendants < 950, `single feed DOM is unexpectedly heavy: ${single.feedDescendants} descendants`);
    assert(single.mountedVideos <= 4, `too many videos mounted after zoom cycle: ${single.mountedVideos}`);

    // scrolling the feed reveals more trends without exceeding the video cap
    await cdp.send('Input.dispatchMouseEvent', {
      type: 'mouseWheel',
      x: 195,
      y: 420,
      deltaX: 0,
      deltaY: 900,
    }, sessionId);
    await sleep(800);
    const afterScroll = await readState(cdp, sessionId);
    assert(afterScroll.scrollTop > 300, `vertical scroll should move the feed, got ${afterScroll.scrollTop}`);
    assert(afterScroll.mountedVideos <= 4, `too many videos mounted after scroll: ${afterScroll.mountedVideos}`);

    // Tapping a trend's metadata opens its detail page. Its media, Collections, and Related
    // rails should all use hidden-overflow pointer dragging, with no accidental card opens.
    await evaluate(cdp, sessionId, `document.querySelector('#feed .topic [data-go]').click()`);
    await waitFor(cdp, sessionId, `document.getElementById('s-detail').classList.contains('active')`, 'trend detail from card tap');
    await waitFor(cdp, sessionId, `document.querySelectorAll('#d-car .dtile').length > 1 && document.querySelectorAll('#d-colls .cs-card').length > 1 && Boolean(document.querySelector('#d-relfeed .rel-scroll'))`, 'trend detail rails');
    const detailBefore = await readDetailRailState(cdp, sessionId);
    assert(detailBefore.postsHeading === 'Posts', `trend detail discussion heading should be Posts, got ${detailBefore.postsHeading}`);
    assert(detailBefore.composeLabel === 'Create a post', `trend detail compose action should use post language, got ${detailBefore.composeLabel}`);
    assert(!detailBefore.hasConversationCopy, 'product UI should not display Conversations copy');
    for (const rail of detailBefore.rails) {
      assert(rail.itemCount > 1, `${rail.name} should contain multiple cards`);
      assert(rail.scrollWidth > rail.clientWidth, `${rail.name} should have draggable overflow`);
      assert(rail.overflowX === 'hidden', `${rail.name} should hide native horizontal overflow, got ${rail.overflowX}`);
      assert(rail.touchAction === 'pan-y', `${rail.name} should preserve vertical page panning, got ${rail.touchAction}`);
    }
    for (const selector of ['#d-car', '#d-colls', '#d-relfeed .rel-scroll']) {
      const dragResult = await dragRail(cdp, sessionId, selector);
      assert(dragResult.scrollLeft > 20, `${selector} should move with click-and-drag, got scrollLeft ${dragResult.scrollLeft}`);
      assert(dragResult.activeScreen === 's-detail', `${selector} drag should stay on the detail screen, got ${dragResult.activeScreen}`);
    }

    // The shared primary CTA stays black in both enabled and disabled states; disabled styling
    // comes from the shared button contract. Selected Rise and Cool use the same black treatment.
    await evaluate(cdp, sessionId, `document.querySelector('#s-detail [data-forecast]').click()`);
    await waitFor(cdp, sessionId, `document.getElementById('sheet').classList.contains('open')`, 'Signal sheet');
    const riseDirection = await readSignalDirectionState(cdp, sessionId);
    assert(riseDirection.rise.pressed === 'true' && riseDirection.cool.pressed === 'false', 'Rise should be selected when the Signal sheet opens');
    assert(riseDirection.rise.background === 'rgb(10, 10, 10)', `selected Rise should use the black button background, got ${riseDirection.rise.background}`);
    assert(riseDirection.rise.border === 'rgb(10, 10, 10)', `selected Rise should use the black button border, got ${riseDirection.rise.border}`);
    assert(riseDirection.rise.label === 'rgb(255, 255, 255)', `selected Rise label should be white, got ${riseDirection.rise.label}`);
    assert(riseDirection.rise.detail === 'rgba(255, 255, 255, 0.72)', `selected Rise backing text should be white, got ${riseDirection.rise.detail}`);
    await evaluate(cdp, sessionId, `document.querySelector('#sheet [data-dir="cool"]').click()`);
    await sleep(200);
    const coolDirection = await readSignalDirectionState(cdp, sessionId);
    assert(coolDirection.cool.pressed === 'true' && coolDirection.rise.pressed === 'false', 'Cool should expose its selected state after a tap');
    assert(coolDirection.cool.background === 'rgb(10, 10, 10)', `selected Cool should use the black button background, got ${coolDirection.cool.background}`);
    assert(coolDirection.cool.border === 'rgb(10, 10, 10)', `selected Cool should use the black button border, got ${coolDirection.cool.border}`);
    assert(coolDirection.cool.label === 'rgb(255, 255, 255)', `selected Cool label should be white, got ${coolDirection.cool.label}`);
    assert(coolDirection.cool.detail === 'rgba(255, 255, 255, 0.72)', `selected Cool backing text should be white, got ${coolDirection.cool.detail}`);
    const disabledSignal = await readSignalCtaState(cdp, sessionId);
    assert(disabledSignal.mode === 'disabled', `empty Signal CTA should be disabled, got ${disabledSignal.mode}`);
    assert(disabledSignal.ariaDisabled === 'true', 'empty Signal CTA should expose its disabled state');
    assert(disabledSignal.background === 'rgb(10, 10, 10)', `disabled Signal CTA should stay black, got ${disabledSignal.background}`);
    assert(disabledSignal.color === 'rgb(255, 255, 255)', `disabled Signal CTA text should stay white, got ${disabledSignal.color}`);
    assert(disabledSignal.opacity === 0.4, `disabled Signal CTA should use shared 40% opacity, got ${disabledSignal.opacity}`);
    assert(disabledSignal.borderRadius === disabledSignal.pillRadius, `Signal sheet CTA should use the shared pill radius, got ${disabledSignal.borderRadius} instead of ${disabledSignal.pillRadius}`);
    await evaluate(cdp, sessionId, `(() => { const input=document.getElementById('amt'); input.value='50'; input.dispatchEvent(new Event('input',{bubbles:true})); })()`);
    await sleep(200);
    const enabledSignal = await readSignalCtaState(cdp, sessionId);
    assert(enabledSignal.mode === 'place', `funded Signal CTA should be enabled, got ${enabledSignal.mode}`);
    assert(enabledSignal.ariaDisabled === 'false', 'funded Signal CTA should expose its enabled state');
    assert(enabledSignal.background === 'rgb(10, 10, 10)', `enabled Signal CTA should stay black, got ${enabledSignal.background}`);
    assert(enabledSignal.opacity === 1, `enabled Signal CTA should be fully opaque, got ${enabledSignal.opacity}`);
    await evaluate(cdp, sessionId, `document.getElementById('scrim').click()`);
    await waitFor(cdp, sessionId, `!document.getElementById('sheet').classList.contains('open')`, 'Signal sheet close');
    await evaluate(cdp, sessionId, `document.getElementById('det-back').click()`);
    await waitFor(cdp, sessionId, `document.getElementById('s-feed').classList.contains('active')`, 'feed return from detail');

    // Search result media strips are the other live card/media rail with the same interaction.
    await evaluate(cdp, sessionId, `document.querySelector('[data-tab="explore"]').click()`);
    await waitFor(cdp, sessionId, `document.getElementById('s-explore').classList.contains('active') && Boolean(document.querySelector('#ex-list .ex-car'))`, 'search media rail');
    const exploreRail = await evaluate(cdp, sessionId, `(() => {
      const el = document.querySelector('#ex-list .ex-car');
      const style = getComputedStyle(el);
      return { overflowX: style.overflowX, touchAction: style.touchAction, scrollWidth: el.scrollWidth, clientWidth: el.clientWidth };
    })()`);
    assert(exploreRail.scrollWidth > exploreRail.clientWidth, 'search media rail should have draggable overflow');
    assert(exploreRail.overflowX === 'hidden', `search media rail should hide native horizontal overflow, got ${exploreRail.overflowX}`);
    assert(exploreRail.touchAction === 'pan-y', `search media rail should preserve vertical page panning, got ${exploreRail.touchAction}`);
    const exploreDrag = await dragRail(cdp, sessionId, '#ex-list .ex-car');
    assert(exploreDrag.scrollLeft > 20, `search media rail should move with click-and-drag, got scrollLeft ${exploreDrag.scrollLeft}`);
    assert(exploreDrag.activeScreen === 's-explore', `search media drag should stay on Search, got ${exploreDrag.activeScreen}`);

    await evaluate(cdp, sessionId, `document.querySelector('[data-tab="posts"]').click()`);
    await waitFor(cdp, sessionId, `document.getElementById('s-posts').classList.contains('active')`, 'posts screen');
    await evaluate(cdp, sessionId, `document.getElementById('post-fab').click()`);
    await waitFor(cdp, sessionId, `document.getElementById('cmpsheet').classList.contains('open')`, 'compose sheet');
    await evaluate(cdp, sessionId, `document.getElementById('cmp-select').click()`);
    await waitFor(cdp, sessionId, `!document.getElementById('cmp-dd').hidden && Boolean(document.querySelector('.cmp-opt-media[data-vsrc]'))`, 'compose trend picker');
    await sleep(700);
    const composer = await readComposerState(cdp, sessionId);
    assert(composer.sheetOpen, 'compose sheet should stay open');
    assert(composer.pickerOpen, 'trend picker should stay open');
    assert(composer.previewCount === composer.videoBackedCount, `every trend picker row should be video-backed, got ${composer.videoBackedCount}/${composer.previewCount}`);
    assert(composer.rowAlign === 'flex-start', `trend picker row text should top-align with previews, got ${composer.rowAlign}`);
    assert(composer.previewWidth <= 37, `trend picker preview exceeds former swatch width: ${composer.previewWidth}`);
    assert(composer.previewHeight > composer.previewWidth, `trend picker preview should use vertical post aspect, got ${composer.previewWidth}x${composer.previewHeight}`);
    assert(composer.previewVideos > 0, 'trend picker should mount at least one visible video preview');
    assert(composer.mountedVideos <= 4, `too many videos mounted in compose picker: ${composer.mountedVideos}`);
    assert(composer.postMode === 'disabled' && composer.postAriaDisabled === 'true', 'incomplete composer CTA should expose its shared disabled state');
    assert(composer.postBackground === 'rgb(10, 10, 10)', `disabled composer CTA should stay black, got ${composer.postBackground}`);
    assert(composer.postOpacity === 0.4, `disabled composer CTA should use shared 40% opacity, got ${composer.postOpacity}`);

    const seriousLogs = cdp.events.filter((event) => (
      event.method === 'Runtime.exceptionThrown' ||
      (event.method === 'Log.entryAdded' && ['error', 'warning'].includes(event.params?.entry?.level))
    ));
    assert(seriousLogs.length === 0, `browser reported console/runtime issues:\n${JSON.stringify(seriousLogs, null, 2)}`);

    console.log('mobile carousel smoke checks passed');
  } finally {
    try { await cdp.send('Browser.close'); } catch {}
    chrome.child.kill('SIGKILL');
    server.close();
    await fs.rm(chrome.userDataDir, { recursive: true, force: true });
  }
}

async function waitForApp(cdp, sessionId) {
  await waitFor(cdp, sessionId, 'Boolean(document.querySelector("#feed .topic [data-go]"))', 'single-trend feed');
}

async function waitFor(cdp, sessionId, expression, label) {
  const deadline = Date.now() + 10000;
  while (Date.now() < deadline) {
    const ready = await evaluate(cdp, sessionId, expression);
    if (ready) return;
    await sleep(100);
  }
  throw new Error(`Timed out waiting for ${label}.`);
}

async function evaluate(cdp, sessionId, expression) {
  const result = await cdp.send('Runtime.evaluate', {
    expression,
    returnByValue: true,
    awaitPromise: true,
  }, sessionId);
  if (result.exceptionDetails) throw new Error(`Runtime evaluation failed: ${JSON.stringify(result.exceptionDetails)}`);
  return result.result.value;
}

async function readState(cdp, sessionId) {
  return evaluate(cdp, sessionId, `(() => {
    const feed = document.getElementById('feed');
    const cards = Array.from(document.querySelectorAll('#feed .topic'));
    return {
      scrollTop: Math.round(feed.scrollTop),
      cardCount: cards.length,
      firstCardId: cards[0] && cards[0].getAttribute('data-id'),
      singleMode: feed.classList.contains('single'),
      carouselIndicators: document.querySelectorAll('[data-dots], .dots').length,
      mountedVideos: document.querySelectorAll('#feed video').length,
    };
  })()`);
}

async function readZoomState(cdp, sessionId) {
  return evaluate(cdp, sessionId, `(() => {
    const feed = document.getElementById('feed');
    const galaxy = document.getElementById('galaxy');
    const cards = Array.from(feed.querySelectorAll('.fcard'));
    return {
      mode: galaxy.classList.contains('on') ? 'galaxy' : (feed.classList.contains('single') ? 'single' : 'board'),
      busy: document.getElementById('feed-menu').getAttribute('aria-busy') === 'true',
      ghosts: document.querySelectorAll('.feed-transition-ghost').length,
      cards: cards.length,
      visualCards: cards.filter((card) => card.querySelector('img, video, .gc-fallback') || card.style.backgroundImage).length,
      galaxyTiles: galaxy.querySelectorAll('.gx-tile').length,
      loadedGalaxyTiles: galaxy.querySelectorAll('.gx-tile.loaded').length,
      hydratedTopics: feed.querySelectorAll('.topic[data-hydrated="1"]').length,
      feedDescendants: feed.querySelectorAll('*').length,
      mountedVideos: document.querySelectorAll('#s-feed video').length,
      visibleUnreadyVideos: Array.from(document.querySelectorAll('#s-feed video')).filter((video) => video.readyState < 2 && Number(getComputedStyle(video).opacity) > 0).length,
      prematureVideoReveals: Array.from(document.querySelectorAll('#s-feed video')).filter((video) => video.currentTime < Math.min(1.1, (video.duration || 2.2) * .5) && Number(getComputedStyle(video).opacity) > 0).length,
    };
  })()`);
}

async function readCubeState(cdp, sessionId) {
  return evaluate(cdp, sessionId, `(() => {
    const track = document.querySelector('#feed .topic [data-track]');
    const slides = Array.from(track.querySelectorAll('.media'));
    const rotation = (slide) => {
      const match = slide.style.transform.match(/rotateY\\((-?[\\d.]+)deg\\)/);
      return match ? Number(match[1]) : 0;
    };
    const translation = (slide) => {
      const match = slide.style.transform.match(/translate3d\\((-?[\\d.]+)%/);
      return match ? Number(match[1]) : 0;
    };
    const outgoingTranslation = translation(slides[0]);
    const incomingTranslation = translation(slides[1]);
    return {
      dragging: track.classList.contains('dragging'),
      outgoingRotation: rotation(slides[0]),
      incomingRotation: rotation(slides[1]),
      outgoingOrigin: slides[0].style.transformOrigin,
      incomingOrigin: slides[1].style.transformOrigin,
      seamGap: Math.abs((100 + outgoingTranslation) - incomingTranslation),
      outgoingOpacity: Number(slides[0].style.opacity),
      incomingOpacity: Number(slides[1].style.opacity),
      incomingMounted: slides[1].getAttribute('data-slide-mount') === '1',
      incomingHasVisual: slides[1].style.backgroundImage.includes('url(') || Boolean(slides[1].querySelector('video')),
      trackBackground: getComputedStyle(track).backgroundColor,
    };
  })()`);
}

async function readDetailRailState(cdp, sessionId) {
  return evaluate(cdp, sessionId, `(() => {
    const specs = [['Hero', '#d-car'], ['Collections', '#d-colls'], ['Related', '#d-relfeed .rel-scroll']];
    return {
      postsHeading: document.querySelector('#sec-posts .tsec-h span').textContent.trim(),
      composeLabel: document.getElementById('dp-compose').textContent.trim(),
      hasConversationCopy: document.body.textContent.includes('Conversations'),
      rails: specs.map(([name, selector]) => {
        const el = document.querySelector(selector);
        const style = getComputedStyle(el);
        return {
          name,
          itemCount: el.children.length,
          scrollWidth: Math.round(el.scrollWidth),
          clientWidth: Math.round(el.clientWidth),
          overflowX: style.overflowX,
          touchAction: style.touchAction,
        };
      }),
    };
  })()`);
}

async function readSignalCtaState(cdp, sessionId) {
  return evaluate(cdp, sessionId, `(() => {
    const cta = document.getElementById('place');
    const style = getComputedStyle(cta);
    return {
      mode: cta.dataset.mode,
      ariaDisabled: cta.getAttribute('aria-disabled'),
      background: style.backgroundColor,
      color: style.color,
      opacity: Number(style.opacity),
      borderRadius: style.borderRadius,
      pillRadius: getComputedStyle(document.documentElement).getPropertyValue('--r-pill').trim(),
    };
  })()`);
}

async function dragRail(cdp, sessionId, selector) {
  const point = await evaluate(cdp, sessionId, `(async () => {
    const el = document.querySelector(${JSON.stringify(selector)});
    el.scrollIntoView({ block: 'center' });
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const box = el.getBoundingClientRect();
    return {
      startX: Math.min(innerWidth - 35, box.right - 35),
      endX: Math.max(35, box.left + 55),
      y: Math.max(80, Math.min(innerHeight - 100, box.top + Math.min(box.height / 2, 150))),
    };
  })()`);
  const end = await holdMouseDrag(cdp, sessionId, [
    [point.startX, point.y],
    [point.startX - (point.startX - point.endX) * 0.35, point.y],
    [point.startX - (point.startX - point.endX) * 0.7, point.y],
    [point.endX, point.y],
  ]);
  await releaseMouseDrag(cdp, sessionId, end);
  await sleep(500);
  return evaluate(cdp, sessionId, `(() => ({
    scrollLeft: Math.round(document.querySelector(${JSON.stringify(selector)}).scrollLeft),
    activeScreen: document.querySelector('.screen.active').id,
  }))()`);
}

async function readSignalDirectionState(cdp, sessionId) {
  return evaluate(cdp, sessionId, `(() => {
    const state = {};
    document.querySelectorAll('#sheet [data-dir]').forEach((button) => {
      const style = getComputedStyle(button);
      state[button.dataset.dir] = {
        pressed: button.getAttribute('aria-pressed'),
        background: style.backgroundColor,
        border: style.borderColor,
        label: getComputedStyle(button.querySelector('b')).color,
        detail: getComputedStyle(button.querySelector('small')).color,
      };
    });
    return state;
  })()`);
}

async function readComposerState(cdp, sessionId) {
  return evaluate(cdp, sessionId, `(() => {
    const sheet = document.getElementById('cmpsheet');
    const picker = document.getElementById('cmp-dd');
    const preview = picker.querySelector('.cmp-opt-media[data-vsrc]');
    const post = document.getElementById('cmp-post');
    const postStyle = getComputedStyle(post);
    const rect = preview.getBoundingClientRect();
    return {
      sheetOpen: sheet.classList.contains('open'),
      pickerOpen: !picker.hidden,
      previewCount: picker.querySelectorAll('.cmp-opt-media').length,
      videoBackedCount: picker.querySelectorAll('.cmp-opt-media[data-vsrc]').length,
      rowAlign: getComputedStyle(picker.querySelector('.cmp-opt')).alignItems,
      previewWidth: Math.round(rect.width),
      previewHeight: Math.round(rect.height),
      previewVideos: picker.querySelectorAll('.cmp-opt-media video').length,
      mountedVideos: document.querySelectorAll('video').length,
      postMode: post.dataset.mode,
      postAriaDisabled: post.getAttribute('aria-disabled'),
      postBackground: postStyle.backgroundColor,
      postOpacity: Number(postStyle.opacity),
    };
  })()`);
}

async function holdMouseDrag(cdp, sessionId, points) {
  const [start, ...rest] = points;
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: start[0], y: start[1], button: 'none' }, sessionId);
  await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: start[0], y: start[1], button: 'left', buttons: 1, clickCount: 1 }, sessionId);
  for (const [x, y] of rest) {
    await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y, button: 'left', buttons: 1 }, sessionId);
    await sleep(40);
  }
  return points[points.length - 1];
}

async function releaseMouseDrag(cdp, sessionId, end) {
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: end[0], y: end[1], button: 'left', buttons: 0, clickCount: 1 }, sessionId);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
