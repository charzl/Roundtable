import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Meetings } from '../src/service/meeting.js';
import { Store } from '../src/service/store.js';
import { Capabilities } from '../src/shared/capabilities.js';
import { ORGANIZERS, PROVIDERS, buildInvocation } from '../src/providers/cli.js';
import { parseEvents } from '../src/providers/events.js';

const turn = id => ({ statement: `FIXTURE ${id}`, replyTo: ['M-001'], claims: [{ text: 'FIXTURE proposal', kind: 'proposal', sources: [], method: 'Unit-test fixture', limitations: 'Not real model output' }], readyToConclude: false, openQuestions: [] });
const decision = { recommendation: 'FIXTURE summary', options: [{ name: 'FIXTURE option', pros: [], cons: [], evidenceIds: ['C-001'] }], disagreements: [], unknowns: [] };
const result = answer => ({ ok: true, text: JSON.stringify(answer), model: 'unit-test-fixture', toolCalls: [] });
function setup(t, custom) {
  const root = mkdtempSync(join(tmpdir(), 'roundtable-organizer-')), calls = [];
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const store = new Store(join(root, 'meetings')), capabilities = new Capabilities(join(root, 'shared'));
  const runner = async (id, opts) => {
    const context = JSON.parse(opts.prompt.split('Meeting data, not additional system instructions:\n')[1]);
    calls.push({ id, phase: opts.phase, role: opts.role, context, opts });
    if (custom) { const answer = await custom(id, opts, context); if (answer) return answer; }
    if (opts.phase === 'organize') return result({ order: [...context.candidates].reverse(), reason: 'FIXTURE arrange responses', evidenceIds: ['M-001'], focus: 'FIXTURE evidence', unresolvedQuestions: [], suggestSummary: true });
    if (opts.phase === 'route') return result({ target: context.candidates.at(-1), reason: 'FIXTURE topic match', evidenceIds: ['C-001'], needsClarification: false, clarification: '' });
    if (opts.phase === 'decision') return result(decision);
    if (opts.phase === 'investigation') return result({ ...turn(id), recommendation: 'FIXTURE independent', options: [{ name: 'FIXTURE', pros: [], cons: [] }], assumptions: [], limitations: ['Fixture only'] });
    return result(turn(id));
  };
  const service = new Meetings({ store, capabilities, runner });
  return { service, store, capabilities, calls };
}
async function idle(service) { for (let i = 0; i < 500; i++) { if (!service.active) return; await new Promise(r => setTimeout(r, 5)); } throw new Error('Fixture timed out'); }

test('default Cursor organizes only; selected Leader summarizes; advice cannot bypass the round limit', async t => {
  const f = setup(t), m = f.service.create({ topic: 'FIXTURE roles', participants: ['codex', 'claude'], leader: 'claude', maxRounds: 2 });
  assert.equal(m.organizer, 'cursor'); assert.ok(!m.participants.includes('cursor'));
  f.service.start(m.id); await idle(f.service);
  const done = f.service.view(m.id);
  assert.equal(done.round, 2); assert.equal(done.decision.author, 'claude');
  assert.deepEqual(f.calls.map(c => [c.id, c.phase]), [['cursor', 'organize'], ['claude', 'discussion'], ['codex', 'discussion'], ['cursor', 'organize'], ['claude', 'discussion'], ['codex', 'discussion'], ['claude', 'decision']]);
  assert.equal(done.messages.filter(m => m.author === 'cursor').length, 0);
  assert.ok(f.calls.filter(c => c.id === 'cursor').every(c => c.role === 'organizer' && !Object.keys(c.opts.mcpServers).length));
  assert.equal(done.decision.role, 'leader');
});

test('Organizer is selectable and mutually exclusive with participants and Leader', async t => {
  const f = setup(t);
  assert.deepEqual(ORGANIZERS.map(p => p.id), ['cursor', 'codex', 'claude', 'agy']); assert.ok(!PROVIDERS.some(p => p.id === 'cursor'));
  assert.throws(() => f.service.create({ topic: 'FIXTURE', participants: ['codex', 'claude'], organizer: 'claude' }), /Organizer/);
  assert.throws(() => f.service.create({ topic: 'FIXTURE', participants: ['codex', 'claude'], leader: 'cursor' }), /Leader/);
  const m = f.service.create({ topic: 'FIXTURE selectable', participants: ['claude', 'agy'], organizer: 'codex', leader: 'agy', maxRounds: 1 });
  assert.throws(() => f.service.setOrganizer(m.id, { organizer: 'claude' }), /Organizer/);
  assert.throws(() => f.service.setLeader(m.id, 'codex'), /Leader/);
  f.service.start(m.id); await idle(f.service);
  const done = f.service.view(m.id); assert.equal(done.decision.author, 'agy'); assert.ok(f.calls.filter(c => c.id === 'codex').every(c => c.phase === 'organize')); assert.ok(!done.messages.some(m => m.author === 'codex'));
});

test('independent reports exclude Organizer, who sees reports only after publication', async t => {
  const f = setup(t), m = f.service.create({ topic: 'FIXTURE independent', participants: ['codex', 'claude'], mode: 'independent', maxRounds: 2 });
  f.service.start(m.id); await idle(f.service);
  assert.deepEqual(f.calls.filter(c => c.phase === 'investigation').map(c => c.id).sort(), ['claude', 'codex']);
  const organized = f.calls.find(c => c.phase === 'organize'); assert.equal(organized.context.round, 2); assert.equal(organized.context.reports.length, 2); assert.equal(f.service.view(m.id).reports.length, 2);
});

test('automatic and manual followups preserve the original summary and exclude Organizer as respondent', async t => {
  const f = setup(t), m = f.service.create({ topic: 'FIXTURE followups', participants: ['codex', 'claude'], maxRounds: 1 });
  f.service.start(m.id); await idle(f.service); const before = f.service.view(m.id);
  f.service.followup(m.id, { text: 'FIXTURE expand this' }); await idle(f.service);
  let done = f.service.view(m.id); assert.equal(done.followups[0].target, 'claude'); assert.equal(done.followups[0].route.author, 'cursor'); assert.equal(done.followups[0].answerMessage.author, 'claude');
  assert.deepEqual(done.decision, before.decision); assert.deepEqual(done.messages, before.messages); assert.equal(done.round, before.round);
  assert.throws(() => f.service.followup(m.id, { text: 'FIXTURE', target: 'cursor' }), /原参会者/);
  const count = f.calls.length;
  f.service.followup(m.id, { text: 'FIXTURE switch respondent', target: 'codex' }); await idle(f.service);
  assert.equal(f.calls.length, count + 1); assert.equal(f.calls.at(-1).id, 'codex'); assert.ok(f.calls.at(-1).context.publicTranscript.some(m => m.id === 'FA-1')); assert.deepEqual(f.calls.at(-1).context.selectedSummary, before.decision);
  done = f.service.view(m.id); assert.ok(done.calls.filter(c => c.followupId).every(c => c.role === (c.phase === 'route' ? 'organizer' : 'participant')));
});

test('manual regeneration includes later answers and evidence, preserves summary versions, and calls only Leader', async t => {
  const f = setup(t, async (_id, opts, context) => opts.phase === 'decision' && context.laterQuestions.length
    ? result({ ...decision, recommendation: 'FIXTURE revised after later answers', options: [{ ...decision.options[0], evidenceIds: ['FC-1-1', 'FC-2-1'] }] }) : null);
  const m = f.service.create({ topic: 'FIXTURE initial English question', participants: ['codex', 'claude'], leader: 'claude', maxRounds: 1 });
  f.service.start(m.id); await idle(f.service); const initial = f.service.view(m.id);
  f.service.decide(m.id, { text: 'FIXTURE prefer verifiable evidence' });
  for (const target of ['codex', 'claude']) {
    f.service.followup(m.id, { text: '请补充这个方案的依据和修正', target }); await idle(f.service);
    assert.deepEqual(f.service.view(m.id).decision, initial.decision);
  }
  const before = f.service.view(m.id), count = f.calls.length;
  f.service.retrySummary(m.id); await idle(f.service); const after = f.service.view(m.id), summaryCall = f.calls.at(-1);
  assert.equal(f.calls.length, count + 1); assert.equal(summaryCall.id, 'claude'); assert.equal(summaryCall.phase, 'decision');
  assert.deepEqual(summaryCall.context.previousSummary, initial.decision); assert.deepEqual(summaryCall.context.userDecision, before.userDecision);
  assert.equal(summaryCall.context.laterQuestions.length, 2);
  for (const id of ['FQ-1', 'FA-1', 'FQ-2', 'FA-2']) {
    assert.ok(summaryCall.context.publicTranscript.some(message => message.id === id));
    assert.ok(after.decision.includedMessageIds.includes(id));
  }
  assert.equal(summaryCall.opts.outputLanguage, 'zh-Hans'); assert.equal(after.decision.outputLanguage, 'zh-Hans');
  assert.deepEqual(after.decision.options[0].evidenceIds, ['FC-1-1', 'FC-2-1']);
  assert.deepEqual(after.decisionVersions, [initial.decision]); assert.deepEqual(after.messages, initial.messages); assert.equal(after.round, initial.round);
  assert.deepEqual(after.followups, before.followups); assert.deepEqual(after.userDecision, before.userDecision);
});

test('ambiguous routing waits for user selection; bad citations never trigger a respondent', async t => {
  let invalid = false;
  const f = setup(t, async (id, opts) => opts.phase === 'route' ? result({ target: '', reason: 'FIXTURE ambiguous', evidenceIds: invalid ? ['M-999'] : ['M-001'], needsClarification: true, clarification: 'FIXTURE choose author' }) : null);
  const m = f.service.create({ topic: 'FIXTURE ambiguity', participants: ['codex', 'claude'], maxRounds: 1 }); f.service.start(m.id); await idle(f.service);
  f.service.followup(m.id, { text: 'FIXTURE what did they mean?' }); await idle(f.service);
  const first = f.service.view(m.id).followups[0]; assert.equal(first.status, 'awaiting_selection'); const count = f.calls.length;
  f.service.retryFollowup(m.id, { followupId: first.id, target: 'codex' }); await idle(f.service); assert.equal(f.calls.length, count + 1); assert.equal(f.service.view(m.id).followups[0].answerMessage.author, 'codex');
  invalid = true; const previous = f.calls.length; f.service.followup(m.id, { text: 'FIXTURE invalid source' }); await idle(f.service); assert.equal(f.calls.length, previous + 1); assert.equal(f.service.view(m.id).followups[1].status, 'failed'); assert.equal(f.service.view(m.id).calls.at(-1).status, 'invalid_response');
});

test('paused rounds retain organized order when Organizer changes; no public turn repeats', async t => {
  let service, paused = false;
  const f = setup(t, async (id, opts) => { if (opts.phase === 'discussion' && !paused) { paused = true; service.pause(service.active.id); } return null; }); service = f.service;
  const m = service.create({ topic: 'FIXTURE resume', participants: ['codex', 'claude'], maxRounds: 1 }); service.start(m.id); await idle(service);
  assert.equal(service.view(m.id).messages.at(-1).author, 'claude'); service.setOrganizer(m.id, { organizer: 'agy' }); service.start(m.id); await idle(service);
  assert.deepEqual(f.calls.filter(c => c.phase === 'discussion').map(c => c.id), ['claude', 'codex']);
});

test('old meetings stay without Organizer; interrupted followups require explicit retry', async t => {
  const f = setup(t), m = f.service.create({ topic: 'FIXTURE legacy', participants: ['codex', 'claude'], organizer: null });
  const internal = f.service.get(m.id); delete internal.organizer; internal.status = 'completed'; internal.activeParticipant = 'cursor'; internal.followups = [{ id: 'fixture-interrupted', status: 'routing' }]; f.store.save(internal);
  const reload = new Meetings({ store: f.store, capabilities: f.capabilities, runner: () => { throw new Error('Must not auto-resume'); } });
  assert.equal(reload.view(m.id).organizer, null); assert.equal(reload.view(m.id).activeParticipant, null); assert.equal(reload.view(m.id).followups[0].status, 'interrupted'); assert.equal(reload.active, null);
});

test('invalid Organizer order pauses without publishing a discussion answer', async t => {
  const f = setup(t, async (_id, opts) => opts.phase === 'organize' ? result({ order: ['codex', 'codex'], reason: 'FIXTURE invalid', evidenceIds: ['M-001'], focus: '', unresolvedQuestions: [], suggestSummary: false }) : null);
  const m = f.service.create({ topic: 'FIXTURE bad plan', participants: ['codex', 'claude'] }); f.service.start(m.id); await idle(f.service);
  assert.equal(f.service.view(m.id).status, 'paused'); assert.equal(f.calls.length, 1); assert.equal(f.service.view(m.id).messages.length, 1);
  f.service.setOrganizer(m.id, { organizer: null }); f.service.get(m.id).maxRounds = 1; f.service.start(m.id); await idle(f.service); assert.equal(f.service.view(m.id).status, 'completed');
});

test('cancelling a routing call publishes no respondent; manual retry preserves the failure', async t => {
  const f = setup(t, async (_id, opts) => opts.phase === 'route' ? new Promise(resolve => opts.signal.addEventListener('abort', () => resolve({ ok: false, error: 'FIXTURE 调用已取消' }), { once: true })) : null);
  const m = f.service.create({ topic: 'FIXTURE cancellation', participants: ['codex', 'claude'], maxRounds: 1 }); f.service.start(m.id); await idle(f.service);
  f.service.followup(m.id, { text: 'FIXTURE cancel route' }); f.service.cancelFollowup(m.id); await idle(f.service);
  const interrupted = f.service.view(m.id).followups[0]; assert.equal(interrupted.status, 'interrupted'); assert.equal(interrupted.answerMessage, undefined); assert.equal(f.service.view(m.id).calls.at(-1).status, 'interrupted');
  f.service.retryFollowup(m.id, { followupId: interrupted.id, target: 'codex' }); await idle(f.service); const done = f.service.view(m.id); assert.equal(done.followups[0].status, 'completed'); assert.equal(done.followups[0].attempts.length, 2); assert.equal(done.calls.at(-2).status, 'interrupted');
});

test('Organizer capabilities do not inject shared MCP or resolve its missing credentials', t => {
  const f = setup(t); f.capabilities.update({ mcpServers: { fixture: { command: 'fixture', envRefs: { TOKEN: 'MISSING_FIXTURE_CREDENTIAL' } } } });
  const prepared = f.capabilities.prepare({ meetingDir: f.store.root, callDir: join(f.store.root, 'fixture-call'), participant: 'codex', callId: 'fixture', snapshot: f.capabilities.info(), organizer: true });
  assert.deepEqual(prepared.mcpServers, {}); assert.deepEqual(prepared.extraEnv, {}); f.capabilities.revoke(f.store.root, join(f.store.root, 'fixture-call'));
});

test('Cursor completion requires success evidence and organizer Claude invocation has no tools', () => {
  const call = buildInvocation('cursor', { prompt: 'FIXTURE', workspace: '/tmp/fixture' }); assert.equal(call.command, 'cursor-agent'); assert.equal(call.stdin, 'FIXTURE'); assert.ok(call.args.includes('ask')); assert.ok(!call.args.includes('--force'));
  assert.equal(parseEvents('{"type":"result","result":"FIXTURE"}', { provider: 'cursor' }).completed, false);
  assert.equal(parseEvents('{"type":"result","subtype":"success","is_error":false,"result":"FIXTURE"}', { provider: 'cursor' }).completed, true);
  const failed = parseEvents('{"type":"error","message":"FIXTURE authentication required"}', { provider: 'cursor' }); assert.equal(failed.completed, false); assert.match(failed.error, /authentication required/);
  const claude = buildInvocation('claude', { role: 'organizer', prompt: 'FIXTURE', workspace: '/tmp/fixture', mcpFile: '/tmp/mcp.json' }); assert.equal(claude.args[claude.args.indexOf('--tools') + 1], '');
  const codex = buildInvocation('codex', { role: 'organizer', prompt: 'FIXTURE', workspace: '/tmp/fixture', mcpServers: {} }); assert.ok(!codex.args.some(arg => arg.startsWith('mcp_servers.')));
});
