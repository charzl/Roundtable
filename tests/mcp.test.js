import test from 'node:test';import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';import { mkdtempSync,rmSync,writeFileSync,readFileSync } from 'node:fs';import { tmpdir } from 'node:os';import {resolve,join} from 'node:path';
test('MCP history, research, and verification are scoped to a valid active call token',async t=>{
 const root=mkdtempSync(join(tmpdir(),'roundtable-mcp-test-'));t.after(()=>rmSync(root,{recursive:true,force:true}));
 writeFileSync(join(root,'access.json'),JSON.stringify({token:'fixture',participant:'codex',callId:'call'}));writeFileSync(join(root,'meeting.json'),JSON.stringify({messages:[{id:'M-001',claims:[{id:'C-001'}]}]}));
 const child=spawn(process.execPath,[resolve('src/shared/mcp-server.js')],{env:{...process.env,ROUNDTABLE_MEETING_DIR:root,ROUNDTABLE_TOKEN:'fixture',ROUNDTABLE_PARTICIPANT:'codex',ROUNDTABLE_CALL_ID:'call'}});t.after(()=>child.kill());
 let buffer='',seq=0;const pending=new Map();child.stdout.on('data',chunk=>{buffer+=chunk.toString();let end;while((end=buffer.indexOf('\n'))>=0){const e=JSON.parse(buffer.slice(0,end));buffer=buffer.slice(end+1);pending.get(e.id)?.(e);pending.delete(e.id);}});
 function rpc(method,params={}){const id=++seq;return new Promise(resolve=>{pending.set(id,resolve);child.stdin.write(JSON.stringify({jsonrpc:'2.0',id,method,params})+'\n');});}
 const init=await rpc('initialize',{protocolVersion:'2025-03-26'});assert.equal(init.result.serverInfo.name,'roundtable-evidence');
 const listed=await rpc('tools/list');assert.equal(listed.result.tools.length,4);assert.equal(listed.result.tools[0].annotations.readOnlyHint,true);
 const history=await rpc('tools/call',{name:'roundtable_history',arguments:{}});assert.equal(JSON.parse(history.result.content[0].text)[0].id,'M-001');
 const check=await rpc('tools/call',{name:'roundtable_verify',arguments:{claimId:'C-999',method:'fixture',result:'fixture',sources:[],verdict:'supported'}});assert.equal(check.result.isError,true);
 const research=await rpc('tools/call',{name:'roundtable_research',arguments:{question:'fixture',method:'fixture',inputs:'1+1',result:'2',sources:[]}});assert.equal(research.result.isError,undefined);const entry=JSON.parse(readFileSync(join(root,'research.jsonl'),'utf8'));assert.equal(entry.participant,'codex');assert.equal(entry.result,'2');
 writeFileSync(join(root,'access.json'),'{}');const expired=await rpc('tools/call',{name:'roundtable_history'});assert.equal(expired.result.isError,true);assert.match(expired.result.content[0].text,/过期/);
});
