import { createServer } from 'node:http';
import { readFileSync, writeFileSync, renameSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { Store } from './store.js';
import { Meetings } from './meeting.js';
import { Capabilities } from '../shared/capabilities.js';
import { inventory, resolveExecutable } from '../providers/cli.js';
import { resolveLanguage } from '../shared/language.js';
const uiDir = resolve(dirname(fileURLToPath(import.meta.url)), '../../ui');
async function body(request) {
  let raw = '';
  for await (const chunk of request) { raw += chunk; if (raw.length > 65536) throw new Error('请求超过大小上限'); }
  try { return JSON.parse(raw || '{}'); } catch { throw new Error('请求不是有效 JSON'); }
}
export async function startService({ dataDir, port = 0, runner, nodePath, getSystemLanguages = () => [Intl.DateTimeFormat().resolvedOptions().locale], onPreferencesChanged } = {}) {
  if (!dataDir) throw new Error('需要数据目录');
  const languageIds = JSON.parse(readFileSync(join(uiDir, 'locales/manifest.json'), 'utf8')).languages.map(p => p.id);
  const store = new Store(join(dataDir, 'meetings'));
  const capabilities = new Capabilities(join(dataDir, 'shared'), nodePath || resolveExecutable('node') || process.execPath);
  const meetings = new Meetings({ store, capabilities, runner, getSystemLanguages, languageIds, protectedRoots: [resolve('.roundtable'), resolve('output/verification')] });
  const preferencesFile = join(dataDir, 'preferences.json');
  let languageChoice = existsSync(preferencesFile) ? JSON.parse(readFileSync(preferencesFile, 'utf8')).languageChoice : 'system';
  const preferences = () => ({ languageChoice, language: resolveLanguage(languageChoice, getSystemLanguages(), languageIds), systemLanguages: getSystemLanguages() });
  const token = randomBytes(32).toString('hex'); const clients = new Set();
  const server = createServer(async (req, res) => {
    const json = (data, status = 200) => { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(data)); };
    try {
      const base = `http://127.0.0.1:${server.address().port}`;
      if (req.headers.host !== new URL(base).host || (req.headers.origin && req.headers.origin !== base)) return json({ error: '拒绝非本机来源' }, 403);
      const url = new URL(req.url, base);
      if (!url.pathname.startsWith('/api/')) {
        const files = { '/': 'index.html', '/app.js': 'app.js', '/style.css': 'style.css', '/i18n.js': 'i18n.js', '/language.js': '../src/shared/language.js', '/locales/manifest.json': 'locales/manifest.json' };
        const manifest = JSON.parse(readFileSync(join(uiDir, 'locales/manifest.json'), 'utf8'));
        for (const pack of manifest.languages) files[`/locales/${pack.id}.json`] = `locales/${pack.id}.json`;
        const file = files[url.pathname];
        if (req.method !== 'GET' || !file) return json({ error: 'Not found' }, 404);
        res.writeHead(200, { 'Content-Type': file.endsWith('.js') ? 'text/javascript' : file.endsWith('.json') ? 'application/json; charset=utf-8' : file.endsWith('.css') ? 'text/css' : 'text/html; charset=utf-8', 'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' data:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'", 'X-Content-Type-Options': 'nosniff' });
        return res.end(readFileSync(join(uiDir, file)));
      }
      const supplied = (req.headers.authorization || '').replace(/^Bearer /, '');
      if (supplied.length !== token.length || !timingSafeEqual(Buffer.from(supplied), Buffer.from(token))) return json({ error: '需要本地会话授权' }, 401);
      if (req.method === 'GET' && url.pathname === '/api/events') {
        res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
        res.write(': connected\n\n'); clients.add(res); req.on('close', () => clients.delete(res)); return;
      }
      if (req.method === 'GET' && url.pathname === '/api/config') return json({ providers: inventory(), capabilities: capabilities.info(), maxRounds: 10, preferences: preferences() });
      if (url.pathname === '/api/preferences') {
        if (req.method === 'GET') return json(preferences());
        if (req.method === 'PUT') {
          const data = await body(req); if (typeof data.languageChoice !== 'string') throw new Error('需要语言选项'); resolveLanguage(data.languageChoice, getSystemLanguages(), languageIds); languageChoice = data.languageChoice;
          writeFileSync(preferencesFile + '.tmp', JSON.stringify({ languageChoice }), { mode: 0o600 }); renameSync(preferencesFile + '.tmp', preferencesFile);
          onPreferencesChanged?.(preferences()); return json(preferences());
        }
      }
      if (req.method === 'PUT' && url.pathname === '/api/capabilities') {
        if (meetings.active) return json({ error: '请等当前调用结束后再修改共享配置' }, 409);
        capabilities.update(await body(req)); return json(capabilities.info());
      }
      if (url.pathname === '/api/meetings') {
        if (req.method === 'GET') return json(meetings.list());
        if (req.method === 'POST') return json(meetings.create(await body(req)), 201);
      }
      const match = url.pathname.match(/^\/api\/meetings\/([a-zA-Z0-9-]+)(?:\/(start|pause|finish|messages|export|summarizer|skip|retry|restart|summary|decision))?$/);
      if (match) {
        const [,id,action] = match;
        if (req.method === 'GET' && !action) return json(meetings.view(id));
        if (req.method === 'GET' && action === 'export') {
          res.setHeader('Content-Disposition', `attachment; filename="roundtable-${id}.json"`);
          return json(meetings.export(id));
        }
        if (req.method === 'POST') {
          if (action === 'messages') return json(meetings.send(id, (await body(req)).text));
          if (action === 'summarizer') return json(meetings.setSummarizer(id, (await body(req)).participant));
          if (action === 'skip') return json(meetings.skip(id, (await body(req)).participant));
          if (action === 'retry') return json(meetings.retry(id, (await body(req)).participant));
          if (action === 'restart') return json(meetings.restartInvestigation(id, await body(req)));
          if (action === 'summary') return json(meetings.retrySummary(id));
          if (action === 'decision') return json(meetings.decide(id, await body(req)));
          if (['start','pause','finish'].includes(action)) return json(meetings[action](id));
        }
      }
      return json({ error: 'Not found' }, 404);
    } catch (error) { if (!res.headersSent) json({ error: error.message, code: 'request.invalid' }, 400); else res.end(); }
  });
  meetings.on('change', m => { for (const client of clients) client.write(`event: meeting\ndata: ${JSON.stringify(m)}\n\n`); });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(port, '127.0.0.1', resolve); });
  const url = `http://127.0.0.1:${server.address().port}`;
  return { url, token, meetings, store, capabilities, preferences, async close() { await meetings.shutdown(); for (const client of clients) client.end(); server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); } };
}
