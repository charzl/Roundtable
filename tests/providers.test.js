import test from 'node:test';import assert from 'node:assert/strict';
import {parseEvents,parseAnswer} from '../src/providers/events.js';import {buildInvocation} from '../src/providers/cli.js';
test('startup and partial stdout are never accepted as a completed answer',()=>{
 assert.equal(parseEvents('{"type":"thread.started","thread_id":"fixture"}\n').completed,false);
 assert.equal(parseEvents('{"type":"item.completed","item":{"type":"agent_message","text":"partial"}}\n').completed,false);
 assert.equal(parseEvents('{"type":"result","is_error":true,"result":"error"}\n').completed,false);
 assert.equal(parseEvents('not JSON').text,'');assert.throws(()=>parseAnswer('unstructured answer'));
});
test('provider output and session metadata extracted only from structured events',()=>{
 const result=parseEvents('{"type":"system","model":"fixture-model","session_id":"fixture"}\n{"type":"result","result":"{\\"statement\\":\\"fixture\\"}"}\n');assert.equal(result.completed,true);assert.equal(result.model,'fixture-model');assert.equal(parseAnswer(result.text).statement,'fixture');
});
test('Codex invocation isolates configuration and explicitly supplies shared MCP',()=>{
 const call=buildInvocation('codex',{prompt:'fixture',workspace:'/tmp/fixture',mcpServers:{roundtable:{command:'/node',args:['/mcp'],env:{TOKEN:'fixture'}}}});assert.ok(call.args.includes('--ignore-user-config'));assert.ok(call.args.includes('read-only'));assert.ok(call.args.includes('mcp_servers.roundtable.command="/node"'));assert.equal(call.stdin,'fixture');
});

test('AGY native event/result protocol is accepted and its failures are rejected',()=>{
 const good=parseEvents(JSON.stringify({event:'result',result:{status:'SUCCESS',response:'{"statement":"fixture"}',conversation_id:'agy-fixture'}}));assert.equal(good.completed,true);assert.equal(parseAnswer(good.text).statement,'fixture');assert.equal(good.sessionId,'agy-fixture');
 assert.equal(parseEvents(JSON.stringify({event:'result',result:{status:'ERROR',response:'no'}})).completed,false);
});

test('AGY commentary is preserved in raw events but only final response becomes public speech',()=>{
 const events=[{event:'step_update',step_update:{step_index:1,step_type:'agent_response',text_delta:'commentary'}},{event:'step_update',step_update:{step_index:4,step_type:'agent_response',text_delta:'{"statement":'}},{event:'step_update',step_update:{step_index:4,step_type:'agent_response',text_delta:'"fixture"}'}},{event:'result',result:{status:'SUCCESS',response:'commentary\\n{"statement":"fixture"}'}}];
 assert.equal(parseAnswer(parseEvents(events.map(e=>JSON.stringify(e)).join('\n')).text).statement,'fixture');
});
