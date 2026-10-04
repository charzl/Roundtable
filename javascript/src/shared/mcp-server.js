import { createInterface } from 'node:readline';
import { readFileSync, appendFileSync } from 'node:fs';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
const meetingDir = process.env.ROUNDTABLE_MEETING_DIR;
const tools = [
  { name: 'roundtable_history', description: '读取这场会议的公开记录与观点编号', inputSchema: { type: 'object', properties: {}, additionalProperties: false } },
  { name: 'roundtable_evidence', description: '读取共享研究和交叉核查记录，避免重复研究', inputSchema: { type: 'object', properties: {}, additionalProperties: false } },
  { name: 'roundtable_research', description: '登记已经执行的研究结果，不得登记尚未执行的计划', inputSchema: { type: 'object', properties: { question: { type: 'string' }, method: { type: 'string' }, inputs: { type: 'string' }, result: { type: 'string' }, sources: { type: 'array', items: { type: 'string' } } }, required: ['question', 'method', 'inputs', 'result', 'sources'], additionalProperties: false } },
  { name: 'roundtable_verify', description: '记录对一条已发表观点的具体核查；结果是核查者的报告，不是系统自动认证', inputSchema: { type: 'object', properties: { claimId: { type: 'string' }, method: { type: 'string' }, result: { type: 'string' }, sources: { type: 'array', items: { type: 'string' } }, verdict: { type: 'string', enum: ['supported', 'disputed', 'inconclusive'] } }, required: ['claimId', 'method', 'result', 'sources', 'verdict'], additionalProperties: false } },
];
for (const tool of tools) tool.annotations = { readOnlyHint: ['roundtable_history', 'roundtable_evidence'].includes(tool.name), destructiveHint: false, openWorldHint: false };
function authorize() {
  if (!meetingDir) throw new Error('缺少会议授权');
  const access = JSON.parse(readFileSync(join(meetingDir, 'access.json'), 'utf8'));
  if (!access.token || access.token !== process.env.ROUNDTABLE_TOKEN || access.participant !== process.env.ROUNDTABLE_PARTICIPANT || access.callId !== process.env.ROUNDTABLE_CALL_ID) throw new Error('会议工具授权已过期');
  return access;
}
function entries() { try { return readFileSync(join(meetingDir, 'research.jsonl'), 'utf8').split('\n').filter(Boolean).map(JSON.parse); } catch { return []; } }
function call(name, args = {}) {
  const access = authorize();
  if (name === 'roundtable_history') return JSON.parse(readFileSync(join(meetingDir, 'meeting.json'), 'utf8')).messages;
  if (name === 'roundtable_evidence') return entries();
  const tool = tools.find(t => t.name === name); if (!tool) throw new Error('未知工具');
  if (tool.inputSchema.required?.some(k => !Object.hasOwn(args, k))) throw new Error('缺少研究或核查字段');
  for (const [key, definition] of Object.entries(tool.inputSchema.properties)) {
    if (definition.type === 'string' && (typeof args[key] !== 'string' || !args[key].trim())) throw new Error(`${key} 不能为空`);
    if (definition.type === 'array' && (!Array.isArray(args[key]) || args[key].some(s => typeof s !== 'string'))) throw new Error(`${key} 需要字符串数组`);
    if (definition.enum && !definition.enum.includes(args[key])) throw new Error('无效核查结果');
  }
  if (Object.keys(args).some(k => !Object.hasOwn(tool.inputSchema.properties, k))) throw new Error('含未知字段');
  if (JSON.stringify(args).length > 32000) throw new Error('研究记录超过长度上限');
  if (name === 'roundtable_verify') {
    const meeting = JSON.parse(readFileSync(join(meetingDir, 'meeting.json'), 'utf8'));
    if (!meeting.messages.some(m => m.claims?.some(c => c.id === args.claimId))) throw new Error('观点编号不存在');
  }
  const entry = { id: `R-${randomUUID()}`, type: name === 'roundtable_verify' ? 'verification' : 'research', participant: access.participant, callId: access.callId, at: new Date().toISOString(), ...args };
  appendFileSync(join(meetingDir, 'research.jsonl'), JSON.stringify(entry) + '\n');
  return entry;
}
async function handle(request) {
  const { id, method, params } = request;
  if (id === undefined) return;
  let result;
  if (method === 'initialize') result = { protocolVersion: params.protocolVersion, capabilities: { tools: { listChanged: false } }, serverInfo: { name: 'roundtable-evidence', version: '0.1.0' } };
  else if (method === 'ping') result = {};
  else if (method === 'tools/list') { authorize(); result = { tools }; }
  else if (method === 'tools/call') {
    try { result = { content: [{ type: 'text', text: JSON.stringify(call(params.name, params.arguments)) }] }; }
    catch (e) { result = { isError: true, content: [{ type: 'text', text: e.message }] }; }
  } else { process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id, error: { code: -32601, message: 'Method not found' } }) + '\n'); return; }
  process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id, result }) + '\n');
}
createInterface({ input: process.stdin }).on('line', line => {
  try { const req = JSON.parse(line); handle(req).catch(e => process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id: req.id, error: { code: -32603, message: e.message } }) + '\n')); }
  catch { /* stdout is exclusively MCP JSON-RPC. */ }
});
