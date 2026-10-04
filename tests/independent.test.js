import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, readFileSync, appendFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { Meetings } from '../src/service/meeting.js';
import { Store } from '../src/service/store.js';
import { Capabilities } from '../src/shared/capabilities.js';
import { isolateInvocation, isolationAvailable } from '../src/providers/isolation.js';
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function until(fn) { for (let i = 0; i < 400; i++) { if (fn()) return; await sleep(5); } throw new Error('fixture timed out'); }
const turn = (id, ready = false) => ({ statement: 'FIXTURE statement ' + id, replyTo: ['M-001'], claims: [{ text: 'FIXTURE claim ' + id, kind: 'proposal', method: 'fixture method', sources: [], limitations: 'fixture only' }], readyToConclude: ready, openQuestions: ['fixture question'] });
const report = (id, ready = false) => ({ ...turn(id, ready), recommendation: 'PRIVATE FIXTURE conclusion ' + id, options: [{ name: 'fixture option', pros: ['fixture pro'], cons: ['fixture con'] }], assumptions: ['fixture assumption'], limitations: ['fixture only'] });
const result = answer => ({ ok: true, text: JSON.stringify(answer), model: 'test-fixture', toolCalls: [] });
function setup(t, custom) {
  const root = mkdtempSync(join(tmpdir(), 'roundtable-investigation-')); t.after(() => rmSync(root, { recursive: true, force: true }));
  let active = 0, max = 0; const calls = [];
  const runner = async (id, o) => { active++; max = Math.max(max, active); calls.push({ id, ...o }); try { o.onEvent({ type: 'process_started' }); if (custom) return await custom(id, o); return result(o.phase === 'decision' ? { recommendation: 'FIXTURE summary', options: [{ name: 'fixture', pros: [], cons: [], evidenceIds: ['C-001'] }], disagreements: ['fixture dissent'], unknowns: [] } : o.phase === 'investigation' ? report(id) : turn(id)); } finally { active--; } };
  const s = new Meetings({ store: new Store(join(root, 'meetings')), capabilities: new Capabilities(join(root, 'shared')), runner, getSystemLanguages: () => ['en-GB'] });
  return { s, root, calls, max: () => max, create: opts => s.create({ topic: 'FIXTURE same baseline', participants: ['codex', 'claude'], mode: 'independent', maxRounds: 2, ...opts }) };
}
test('parallel independent calls seal reports; prompt, MCP, API, export and SSE views withhold peers until batch publication', async t => {
  let release; const gate = new Promise(r => release = r);
  const f = setup(t, async (id, o) => { if (o.phase === 'investigation') { if (id === 'claude') await gate; appendFileSync(join(o.scopeDir, 'research.jsonl'), JSON.stringify({ id: 'R-' + id, participant: id, callId: f.s.get(m.id).calls.findLast(c => c.participant === id).id, type: 'research', result: 'PRIVATE RESEARCH ' + id }) + '\n'); return result(report(id)); } return result(o.phase === 'decision' ? { recommendation: 'fixture', options: [{ name: 'fixture', pros: [], cons: [], evidenceIds: ['C-001'] }], disagreements: [], unknowns: [] } : turn(id)); });
  const m = f.create({ summarizer: 'claude' }), events = []; f.s.on('change', view => events.push(view)); f.s.start(m.id); await until(() => f.s.get(m.id).reports.length === 1);
  const view = f.s.view(m.id); assert.equal(view.messages.length, 1); assert.equal(view.research.length, 0); assert.equal(view.reports[0].answer, undefined);
  assert.ok(!JSON.stringify(view).includes('PRIVATE FIXTURE')); assert.ok(!JSON.stringify(events).includes('PRIVATE RESEARCH')); assert.equal(f.s.export(m.id).artifacts.length, 0);
  assert.ok(!f.calls[1].prompt.includes('PRIVATE FIXTURE')); const scope = JSON.parse(readFileSync(join(f.calls[1].scopeDir, 'meeting.json'))); assert.equal(scope.messages.length, 1); assert.equal(readFileSync(join(f.calls[1].scopeDir, 'research.jsonl'), 'utf8'), '');
  assert.equal(f.calls[0].inputHash, f.calls[1].inputHash); assert.equal(f.max(), 2); release(); await until(() => !f.s.active);
  const done = f.s.view(m.id); assert.equal(done.round, 2); assert.equal(done.messages.length, 5); assert.equal(done.reports.length, 2); assert.equal(done.research.length, 2); assert.equal(done.decision.author, 'claude'); assert.match(f.calls.find(c => c.phase === 'discussion').prompt, /PRIVATE FIXTURE conclusion claude/); assert.equal(done.events.filter(e => e.type === 'reports_published').length, 1);
});
test('failed participant retry preserves completed report, failure record, round number and input; queued human input reaches both after publication', async t => {
  let failure = true; const f = setup(t, async (id, o) => { if (o.phase === 'investigation' && id === 'claude' && failure) { failure = false; return { ok: false, error: 'FIXTURE failure' }; } return result(o.phase === 'investigation' ? report(id) : o.phase === 'decision' ? { recommendation: 'fixture', options: [{ name: 'x', pros: [], cons: [], evidenceIds: ['C-001'] }], disagreements: [], unknowns: [] } : turn(id)); });
  const m = f.create(); f.s.start(m.id); await until(() => !f.s.active); f.s.send(m.id, 'QUEUED fixture clarification'); assert.equal(f.s.view(m.id).messages.length, 1);
  f.s.retry(m.id, 'claude'); await until(() => !f.s.active); assert.equal(f.calls.filter(c => c.id === 'codex' && c.phase === 'investigation').length, 1); assert.equal(f.calls.filter(c => c.id === 'claude' && c.phase === 'investigation').length, 2); assert.ok(f.s.view(m.id).calls.some(c => c.status === 'failed')); assert.equal(f.s.view(m.id).round, 2);
  for (const c of f.calls.filter(c => c.phase === 'discussion')) assert.match(c.prompt, /QUEUED fixture clarification/);
});
test('pause cancels concurrent calls and persists sealed reports; restart revokes scoped tokens and never retries automatically', async t => {
  const f = setup(t, async (id, o) => id === 'codex' ? result(report(id)) : await new Promise(r => o.signal.addEventListener('abort', () => r({ ok: false, error: 'fixture cancelled' }))));
  const m = f.create(); f.s.start(m.id); await until(() => f.s.get(m.id).reports.length === 1); f.s.pause(m.id); await until(() => !f.s.active);
  const paused = f.s.view(m.id); assert.equal(paused.status, 'paused'); assert.equal(paused.reports[0].status, 'sealed'); assert.equal(paused.messages.length, 1); assert.equal(paused.calls.find(c => c.participant === 'claude').status, 'interrupted');
  const reloaded = new Meetings({ store: f.s.store, capabilities: f.s.capabilities }); assert.equal(reloaded.view(m.id).reports[0].status, 'sealed'); assert.equal(reloaded.active, null); for (const c of f.calls) assert.deepEqual(JSON.parse(readFileSync(join(c.scopeDir, 'access.json'))), {});
});
test('revising a paused investigation archives old private reports and fixes a fresh common language/input version', async t => {
  const f = setup(t, async (id, o) => id === 'claude' ? { ok: false, error: 'fixture fail' } : result(report(id))); const m = f.create(); f.s.start(m.id); await until(() => !f.s.active);
  f.s.restartInvestigation(m.id, { topic: 'FIXTURE revised question', languageChoice: 'zh-Hans' }); f.s.start(m.id); await until(() => !f.s.active);
  const done = f.s.view(m.id); assert.equal(done.inputVersion, 2); assert.equal(done.outputLanguage, 'zh-Hans'); assert.equal(done.reports.length, 2); assert.ok(done.reports.every(r => !r.answer)); assert.equal(done.messages.filter(m => m.origin === 'provider').length, 0); assert.match(f.calls.at(-1).prompt, /FIXTURE revised question/); assert.match(f.calls.at(-1).prompt, /Simplified Chinese/);
});
test('one-round investigation summarizes without cross-discussion; selected summary retries keep previous drafts and user decisions', async t => {
  const f = setup(t); const m = f.create({ maxRounds: 1, leader: 'claude' }); f.s.start(m.id); await until(() => !f.s.active);
  assert.equal(f.calls.filter(c => c.phase === 'discussion').length, 0); assert.equal(f.s.view(m.id).round, 1); assert.equal(f.s.view(m.id).decision.author, 'claude'); f.s.decide(m.id, { text: 'FIXTURE user decision' }); assert.equal(f.s.view(m.id).leader, 'claude'); assert.match(f.calls.find(c => c.phase === 'decision').prompt, /designated Leader/); f.s.setLeader(m.id, 'codex'); f.s.retrySummary(m.id); await until(() => !f.s.active); const done = f.s.view(m.id); assert.equal(done.decision.author, 'codex'); assert.equal(done.decisionVersions.length, 1); assert.equal(done.userDecision.text, 'FIXTURE user decision'); assert.equal(done.leader, 'codex'); assert.equal(done.decision.role, 'leader'); assert.ok(done.events.some(e => e.type === 'leader_changed' && e.to === 'codex')); const legacy = f.s.store.load(m.id); delete legacy.leader; f.s.store.save(legacy); const restored = new Meetings({ store: f.s.store, capabilities: f.s.capabilities }); assert.equal(restored.view(m.id).leader, 'codex'); assert.equal(restored.view(m.id).decision.author, 'codex');
});
test('early finish publishes only complete reports and records missing participants; skip never impersonates a response', async t => {
  const f = setup(t, async (id, o) => { if (o.phase === 'decision') return result({ recommendation: 'fixture partial', options: [{ name: 'x', pros: [], cons: [], evidenceIds: ['C-001'] }], disagreements: [], unknowns: ['fixture missing peer'] }); if (id === 'codex') return result(report(id)); return await new Promise(r => o.signal.addEventListener('abort', () => r({ ok: false, error: 'fixture cancelled' }))); });
  const m = f.create(); f.s.start(m.id); await until(() => f.s.get(m.id).reports.length === 1); f.s.finish(m.id); await until(() => !f.s.active); const done = f.s.view(m.id); assert.equal(done.status, 'completed'); assert.equal(done.reports.filter(r => r.status === 'published').length, 1); assert.equal(done.messages.filter(x => x.author === 'claude').length, 0);
});
test('10 total rounds include investigation; external shared MCP omitted until reports are public', async t => {
  const f = setup(t); f.s.capabilities.update({ mcpServers: { sharedMemory: { command: 'fixture-only' } } }); const m = f.create({ maxRounds: 10 }); f.s.start(m.id); await until(() => !f.s.active);
  assert.equal(f.s.view(m.id).round, 10); assert.equal(f.calls.length, 21); for (const c of f.calls.filter(c => c.phase === 'investigation')) assert.deepEqual(Object.keys(c.mcpServers), ['roundtable']); for (const c of f.calls.filter(c => c.phase === 'discussion')) assert.ok(c.mcpServers.sharedMemory);
});
test('OS sandbox denies peer files and inherited child access while allowing own scope', { skip: !isolationAvailable() }, t => {
  const root = mkdtempSync(join(tmpdir(), 'roundtable-isolation-')); t.after(() => rmSync(root, { recursive: true, force: true })); const own = join(root, 'own'), peer = join(root, 'peer'); mkdirSync(own); mkdirSync(peer); writeFileSync(join(own, 'allowed'), 'own'); writeFileSync(join(peer, 'secret'), 'peer');
  const script = `const fs=require('node:fs');const cp=require('node:child_process');if(fs.readFileSync(${JSON.stringify(join(own,'allowed'))},'utf8')!=='own')process.exit(1);try{fs.readFileSync(${JSON.stringify(join(peer,'secret'))});process.exit(2);}catch(e){if(!['EPERM','EACCES'].includes(e.code))throw e;}const child=cp.spawnSync('/bin/cat',[${JSON.stringify(join(peer,'secret'))}]);if(child.status===0)process.exit(3);`;
  const launch = isolateInvocation(process.execPath, ['-e', script], { callDir: own, protectedRoots: [root] }); const r = spawnSync(launch.command, launch.args, { encoding: 'utf8' }); assert.equal(r.status, 0, r.stderr);
});
test('explicitly skipping a failed third participant preserves absence; two reports continue and no third statement is invented', async t => {
 const f=setup(t,async(id,o)=> id==='agy'?{ok:false,error:'fixture unavailable'}:result(o.phase==='investigation'?report(id):o.phase==='decision'?{recommendation:'fixture',options:[{name:'x',pros:[],cons:[],evidenceIds:['C-001']}],disagreements:[],unknowns:['third participant absent']}:turn(id)));
 const m=f.create({participants:['codex','claude','agy'],maxRounds:1});f.s.start(m.id);await until(()=>!f.s.active);assert.equal(f.s.view(m.id).messages.length,1);f.s.skip(m.id,'agy');f.s.start(m.id);await until(()=>!f.s.active);const done=f.s.view(m.id);assert.deepEqual(done.skipped,['agy']);assert.equal(done.messages.filter(x=>x.author==='agy').length,0);assert.equal(done.status,'completed');assert.equal(f.calls.filter(x=>x.id==='agy').length,1);
});
