import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { resolveLanguage } from '../src/shared/language.js';
import { startService } from '../src/service/server.js';
test('system language respects preferences, scripts and fallback; added packs need no resolver changes', () => {
  assert.equal(resolveLanguage('system', ['fr-FR', 'zh-CN', 'en']), 'zh-Hans'); assert.equal(resolveLanguage('system', ['en-GB', 'zh-CN']), 'en'); assert.equal(resolveLanguage('system', ['zh-TW']), 'en'); assert.equal(resolveLanguage('system', ['de-DE']), 'en'); assert.equal(resolveLanguage('zh-Hans', ['en']), 'zh-Hans'); assert.throws(() => resolveLanguage('bogus', ['en'])); assert.equal(resolveLanguage('system', ['ja-JP'], ['en', 'zh-Hans', 'ja']), 'ja'); assert.equal(resolveLanguage('ja', ['en'], ['en', 'ja']), 'ja');
});
test('English and Chinese packs cover static and dynamic keys with matching placeholders', () => {
  const en = JSON.parse(readFileSync('ui/locales/en.json')), zh = JSON.parse(readFileSync('ui/locales/zh-Hans.json')); assert.deepEqual(Object.keys(en).sort(), Object.keys(zh).sort());
  for (const key of Object.keys(en)) assert.deepEqual([...en[key].matchAll(/\{(\w+)\}/g)].map(m => m[1]).sort(), [...zh[key].matchAll(/\{(\w+)\}/g)].map(m => m[1]).sort(), key);
  const html = readFileSync('ui/index.html', 'utf8'), app = readFileSync('ui/app.js', 'utf8'); for (const m of html.matchAll(/data-i18n(?:-aria|-placeholder)?="([^"]+)"/g)) assert.ok(en[m[1]], m[1]); for (const m of app.matchAll(/\bt\('([^']+)'[),]/g)) if (!m[1].endsWith('.')) assert.ok(en[m[1]], m[1]);
});
test('persisted language preferences and system changes never change a frozen meeting language or original text', async t => {
  const dir = mkdtempSync(join(tmpdir(), 'roundtable-language-')); let system = ['zh-CN']; let service = await startService({ dataDir: dir, getSystemLanguages: () => system }); t.after(async () => { await service.close(); rmSync(dir, { recursive: true, force: true }); });
  let headers = { Authorization: 'Bearer ' + service.token, 'Content-Type': 'application/json' }; const request = async (path, opts = {}) => (await fetch(service.url + path, { ...opts, headers })).json();
  assert.equal((await request('/api/preferences')).languageChoice, 'system'); assert.equal((await request('/api/preferences')).language, 'zh-Hans'); await request('/api/preferences', { method: 'PUT', body: JSON.stringify({ languageChoice: 'en' }) }); system = ['zh-CN']; assert.equal((await request('/api/preferences')).language, 'en');
  const m = service.meetings.create({ topic: '保留原文 FIXTURE', participants: ['codex', 'claude'], languageChoice: 'system' }); const internal = service.meetings.get(m.id); internal.outputLanguage = 'zh-Hans'; service.meetings.changed(internal); system = ['en-US']; assert.equal(service.meetings.view(m.id).outputLanguage, 'zh-Hans'); assert.equal(service.meetings.view(m.id).messages[0].text, '保留原文 FIXTURE');
  await service.close(); service = await startService({ dataDir: dir, getSystemLanguages: () => system }); headers = { ...headers, Authorization: 'Bearer ' + service.token }; assert.equal((await request('/api/preferences')).languageChoice, 'en'); assert.equal(service.meetings.view(m.id).outputLanguage, 'zh-Hans'); const bad = await fetch(service.url + '/api/preferences', { method: 'PUT', headers, body: '{"languageChoice":"bogus"}' }); assert.equal(bad.status, 400);
});
