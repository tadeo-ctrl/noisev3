import { createReadStream } from 'node:fs';
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);

function argument(name, fallback) {
  const index = args.indexOf(`--${name}`);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
}

const host = argument('host', process.env.HOST || '127.0.0.1');
const port = Number(argument('port', process.env.PORT || '4173'));

if (!Number.isInteger(port) || port < 0 || port > 65535) {
  throw new Error(`Invalid port: ${port}`);
}

const contentTypes = new Map([
  ['.avif', 'image/avif'],
  ['.css', 'text/css; charset=utf-8'],
  ['.gif', 'image/gif'],
  ['.html', 'text/html; charset=utf-8'],
  ['.ico', 'image/x-icon'],
  ['.jpeg', 'image/jpeg'],
  ['.jpg', 'image/jpeg'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.mjs', 'text/javascript; charset=utf-8'],
  ['.mov', 'video/quicktime'],
  ['.mp4', 'video/mp4'],
  ['.png', 'image/png'],
  ['.svg', 'image/svg+xml'],
  ['.webp', 'image/webp'],
  ['.woff', 'font/woff'],
  ['.woff2', 'font/woff2'],
]);

function parseRange(header, size) {
  const match = /^bytes=(\d*)-(\d*)$/.exec(header || '');
  if (!match) return null;

  let start;
  let end;
  if (match[1] === '') {
    const suffixLength = Number(match[2]);
    if (!Number.isInteger(suffixLength) || suffixLength <= 0) return null;
    start = Math.max(0, size - suffixLength);
    end = size - 1;
  } else {
    start = Number(match[1]);
    end = match[2] === '' ? size - 1 : Number(match[2]);
  }

  if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || start >= size || end < start) {
    return null;
  }
  return { start, end: Math.min(end, size - 1) };
}

function sendText(res, statusCode, message, headers = {}) {
  res.writeHead(statusCode, {
    'Cache-Control': 'no-store',
    'Content-Type': 'text/plain; charset=utf-8',
    ...headers,
  });
  res.end(message);
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url || '/', `http://${host}`);
    let pathname = decodeURIComponent(url.pathname);
    if (pathname === '/favicon.ico') {
      res.writeHead(204, { 'Cache-Control': 'no-store' });
      res.end();
      return;
    }
    if (pathname === '/') pathname = '/index.html';

    const file = path.resolve(repoRoot, `.${pathname}`);
    if (file !== repoRoot && !file.startsWith(`${repoRoot}${path.sep}`)) {
      sendText(res, 403, 'Forbidden');
      return;
    }

    const stat = await fs.stat(file);
    if (!stat.isFile()) {
      sendText(res, 404, 'Not found');
      return;
    }

    const type = contentTypes.get(path.extname(file).toLowerCase()) || 'application/octet-stream';
    const headers = {
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'no-store',
      'Content-Type': type,
    };
    const range = req.headers.range ? parseRange(req.headers.range, stat.size) : null;

    if (req.headers.range && !range) {
      sendText(res, 416, 'Requested range not satisfiable', {
        'Content-Range': `bytes */${stat.size}`,
      });
      return;
    }

    if (range) {
      headers['Content-Length'] = range.end - range.start + 1;
      headers['Content-Range'] = `bytes ${range.start}-${range.end}/${stat.size}`;
      res.writeHead(206, headers);
      if (req.method === 'HEAD') res.end();
      else createReadStream(file, range).pipe(res);
      return;
    }

    headers['Content-Length'] = stat.size;
    res.writeHead(200, headers);
    if (req.method === 'HEAD') res.end();
    else createReadStream(file).pipe(res);
  } catch (error) {
    if (error?.code === 'ENOENT' || error?.code === 'ENOTDIR') {
      sendText(res, 404, 'Not found');
      return;
    }
    console.error(error);
    sendText(res, 500, 'Internal server error');
  }
});

server.listen(port, host, () => {
  const address = server.address();
  const actualPort = typeof address === 'object' && address ? address.port : port;
  console.log(`NOISE curator prototype: http://${host}:${actualPort}`);
});

function shutdown() {
  server.close((error) => {
    if (error) {
      console.error(error);
      process.exitCode = 1;
    }
  });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
