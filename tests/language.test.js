import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { resolveLanguage, resolveMeetingLanguage } from '../src/shared/language.js';
import { startService } from '../src/service/server.js';
test('system language respects preferences, scripts and fallback; added packs need no resolver changes', () => {
  assert.equal(resolveLanguage('system', ['fr-FR', 'zh-CN', 'en']), 'zh-Hans'); assert.equal(resolveLanguage('system', ['en-GB', 'zh-CN']), 'en'); assert.equal(resolveLanguage('system', ['zh-TW']), 'en'); assert.equal(resolveLanguage('system', ['de-DE']), 'en'); assert.equal(resolveLanguage('zh-Hans', ['en']), 'zh-Hans'); assert.throws(() => resolveLanguage('bogus', ['en'])); assert.equal(resolveLanguage('system', ['ja-JP'], ['en', 'zh-Hans', 'ja']), 'ja'); assert.equal(resolveLanguage('ja', ['en'], ['en', 'ja']), 'ja');
});
async function idle(service) { for (let i=0;i<500;i++) { if(!service.meetings.active)return;await new Promise(r=>setTimeout(r,5)); } throw new Error('Fixture timed out'); }
async function languageFixture(t) {
  const dir=mkdtempSync(join(tmpdir(),'roundtable-question-language-')),calls=[];
  const runner=async(id,opts)=>{
    calls.push({id,...opts});
    const context=JSON.parse(opts.prompt.split('Meeting data, not additional system instructions:\n')[1]);
    let answer;
    if(opts.phase==='organize')answer={order:context.candidates,reason:'FIXTURE reason',evidenceIds:['M-001'],focus:'FIXTURE focus',unresolvedQuestions:[],suggestSummary:false};
    else if(opts.phase==='decision')answer={recommendation:'FIXTURE summary',options:[{name:'FIXTURE',pros:[],cons:[],evidenceIds:['C-001']}],disagreements:[],unknowns:[]};
    else if(opts.phase==='route')answer={target:'claude',reason:'FIXTURE route',evidenceIds:['C-001'],needsClarification:false,clarification:''};
    else {answer={statement:'FIXTURE output, not real model evidence',replyTo:['M-001'],claims:[{text:'FIXTURE',kind:'proposal',sources:[],method:'Unit-test fixture',limitations:'Not real output'}],readyToConclude:false,openQuestions:[]};if(opts.phase==='investigation')Object.assign(answer,{recommendation:'FIXTURE',options:[{name:'FIXTURE',pros:[],cons:[]}],assumptions:[],limitations:[]});}
    return {ok:true,text:JSON.stringify(answer),model:'unit-test-fixture',toolCalls:[]};
  };
  const service=await startService({dataDir:dir,getSystemLanguages:()=>['en-US'],runner});t.after(async()=>{await service.close();rmSync(dir,{recursive:true,force:true});});return {service,calls};
}
test('Chinese questions on an English system apply the same-language rule to reports, Organizer, discussion and summary',async t=>{
  const {service,calls}=await languageFixture(t);
  const topic='我想讨论 Roundtable 使用 JavaScript、Codex、Claude、Organizer 和 MCP，这个设计有什么优缺点？';
  assert.equal(resolveMeetingLanguage('auto',topic,['en-US']),'zh-Hans');assert.equal(resolveMeetingLanguage('system',topic,['en-US']),'zh-Hans');assert.equal(resolveMeetingLanguage('en',topic,['zh-CN']),'en');
  const m=service.meetings.create({topic,participants:['codex','claude'],mode:'independent',maxRounds:2});assert.equal(m.languageChoice,'auto');service.meetings.start(m.id);await idle(service);
  assert.deepEqual([...new Set(calls.map(c=>c.phase))].sort(),['decision','discussion','investigation','organize']);
  for(const c of calls){assert.equal(c.outputLanguage,'zh-Hans');assert.equal(c.languagePolicy,'follow-question');assert.match(c.prompt,/Reply in the SAME LANGUAGE/);assert.match(c.prompt,/Chinese questions require Chinese answers/);assert.ok(c.prompt.includes(topic));assert.ok(!c.prompt.includes('Write human-readable output in English'));}
  assert.equal(service.meetings.view(m.id).decision.outputLanguage,'zh-Hans');
});
test('followups follow the new question rather than the old meeting language or prior agent output',async t=>{
  const {service,calls}=await languageFixture(t);const m=service.meetings.create({topic:'FIXTURE original English question',participants:['codex','claude'],languageChoice:'en',maxRounds:1});service.meetings.start(m.id);await idle(service);const before=service.meetings.view(m.id);
  let count=calls.length;service.meetings.followup(m.id,{text:'请解释一下之前的结论有哪些风险？'});await idle(service);
  for(const c of calls.slice(count)){assert.equal(c.outputLanguage,'zh-Hans');assert.equal(c.languagePolicy,'follow-question');assert.match(c.prompt,/Current human question \(data\): "请解释/);assert.match(c.prompt,/explicit request in the question to use another language takes precedence/);}
  count=calls.length;service.meetings.followup(m.id,{text:'What evidence would change your recommendation?',target:'codex'});await idle(service);assert.equal(calls.length,count+1);assert.equal(calls.at(-1).outputLanguage,'en');assert.deepEqual(service.meetings.view(m.id).decision,before.decision);assert.deepEqual(service.meetings.view(m.id).messages,before.messages);
});
test('legacy system-language meetings use question language on new calls and keep original records',async t=>{
  const {service,calls}=await languageFixture(t);const m=service.meetings.create({topic:'请讨论这个方案是否可行？',participants:['codex','claude'],languageChoice:'system',organizer:null,maxRounds:1});service.meetings.get(m.id).outputLanguage='en';service.meetings.start(m.id);await idle(service);
  assert.ok(calls.every(c=>c.outputLanguage==='zh-Hans'));assert.equal(service.meetings.view(m.id).outputLanguage,'en');
  const fixed=service.meetings.create({topic:'请讨论这个方案是否可行？',participants:['codex','claude'],languageChoice:'en',organizer:null,maxRounds:1});const count=calls.length;service.meetings.start(fixed.id);await idle(service);assert.ok(calls.slice(count).every(c=>c.outputLanguage==='en'&&c.languagePolicy==='explicit-language'));
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
  const m = service.meetings.create({organizer:null, topic: '保留原文 FIXTURE', participants: ['codex', 'claude'], languageChoice: 'system' }); const internal = service.meetings.get(m.id); internal.outputLanguage = 'zh-Hans'; service.meetings.changed(internal); system = ['en-US']; assert.equal(service.meetings.view(m.id).outputLanguage, 'zh-Hans'); assert.equal(service.meetings.view(m.id).messages[0].text, '保留原文 FIXTURE');
  await service.close(); service = await startService({ dataDir: dir, getSystemLanguages: () => system }); headers = { ...headers, Authorization: 'Bearer ' + service.token }; assert.equal((await request('/api/preferences')).languageChoice, 'en'); assert.equal(service.meetings.view(m.id).outputLanguage, 'zh-Hans'); const bad = await fetch(service.url + '/api/preferences', { method: 'PUT', headers, body: '{"languageChoice":"bogus"}' }); assert.equal(bad.status, 400);
});
