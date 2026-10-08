'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const { generate, fallback } = require('./lib');

const PORT = process.env.PORT || 3000;
const API_KEY = process.env.ANTHROPIC_API_KEY;
const MODEL = process.env.CLAUDE_MODEL || 'claude-sonnet-5-5';
const WORQ_EMAIL = process.env.WORQ_EMAIL || '';
const PUB = path.join(__dirname, 'public');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml' };

const send = (res, code, body, type = 'application/json') => {
  res.writeHead(code, { 'content-type': type });
  res.end(typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body));
};

function readBody(req, limit = 25 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on('data', (c) => { size += c.length; if (size > limit) { reject(new Error('Too large')); req.destroy(); } else chunks.push(c); });
    req.on('end', () => resolve(Buffer.concat(chunks).toString()));
    req.on('error', reject);
  });
}

http.createServer(async (req, res) => {
  try {
    if (req.method === 'GET' && req.url === '/api/config') return send(res, 200, { email: WORQ_EMAIL, ai: !!API_KEY });
    if (req.method === 'POST' && req.url === '/api/generate') {
      const body = JSON.parse(await readBody(req));
      if (!['closure', 'worq'].includes(body.mode)) return send(res, 400, { error: 'Invalid mode' });
      if (!body.description?.trim() && !body.images?.length && !body.ocrText?.trim()) return send(res, 400, { error: 'Add a description or screenshot' });
      try {
        return send(res, 200, await generate(body, API_KEY, MODEL));
      } catch (e) {
        console.error(e.message);
        return send(res, 200, { text: fallback(body.mode, body.description, body.vendor, body.ocrText, body.variant), source: 'template', warning: 'AI unavailable, used template' });
      }
    }
    if (req.method === 'GET') {
      const file = path.join(PUB, req.url === '/' ? 'index.html' : decodeURIComponent(req.url.split('?')[0]));
      if (file.startsWith(PUB + path.sep) && fs.existsSync(file) && fs.statSync(file).isFile()) {
        return send(res, 200, fs.readFileSync(file), TYPES[path.extname(file)] || 'application/octet-stream');
      }
    }
    send(res, 404, { error: 'Not found' });
  } catch (e) {
    send(res, 400, { error: e.message });
  }
}).listen(PORT, () => console.log(`WORQ app on http://localhost:${PORT} (${API_KEY ? 'AI on' : 'no ANTHROPIC_API_KEY: template mode'})`));
