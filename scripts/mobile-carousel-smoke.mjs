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
    const cubeEnd = await holdMouseDrag(cdp, sessionId, [[300, 420], [260, 420], [220, 420], [195, 420]]);
    const cubeMid = await readCubeState(cdp, sessionId);
    assert(cubeMid.dragging, 'feed carousel should enter its drag state during a horizontal gesture');
    assert(cubeMid.outgoingRotation < 0, `outgoing cube face should rotate away on the left, got ${cubeMid.outgoingRotation}deg`);
    assert(cubeMid.incomingRotation > 0, `incoming cube face should rotate in from the right, got ${cubeMid.incomingRotation}deg`);
    assert(cubeMid.outgoingOrigin === 'right center', `outgoing cube face should hinge on its right edge, got ${cubeMid.outgoingOrigin}`);
    assert(cubeMid.incomingOrigin === 'left center', `incoming cube face should hinge on its left edge, got ${cubeMid.incomingOrigin}`);
    await releaseMouseDrag(cdp, sessionId, cubeEnd);
    await sleep(500);

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

    // tapping a trend's metadata opens its detail page, then back returns to the feed
    await evaluate(cdp, sessionId, `document.querySelector('#feed .topic [data-go]').click()`);
    await waitFor(cdp, sessionId, `document.getElementById('s-detail').classList.contains('active')`, 'trend detail from card tap');
    await evaluate(cdp, sessionId, `document.getElementById('det-back').click()`);
    await waitFor(cdp, sessionId, `document.getElementById('s-feed').classList.contains('active')`, 'feed return from detail');

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

async function readCubeState(cdp, sessionId) {
  return evaluate(cdp, sessionId, `(() => {
    const track = document.querySelector('#feed .topic [data-track]');
    const slides = Array.from(track.querySelectorAll('.media'));
    const rotation = (slide) => {
      const match = slide.style.transform.match(/rotateY\\((-?[\\d.]+)deg\\)/);
      return match ? Number(match[1]) : 0;
    };
    return {
      dragging: track.classList.contains('dragging'),
      outgoingRotation: rotation(slides[0]),
      incomingRotation: rotation(slides[1]),
      outgoingOrigin: slides[0].style.transformOrigin,
      incomingOrigin: slides[1].style.transformOrigin,
    };
  })()`);
}

async function readComposerState(cdp, sessionId) {
  return evaluate(cdp, sessionId, `(() => {
    const sheet = document.getElementById('cmpsheet');
    const picker = document.getElementById('cmp-dd');
    const preview = picker.querySelector('.cmp-opt-media[data-vsrc]');
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
