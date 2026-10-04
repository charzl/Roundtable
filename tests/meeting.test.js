import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Store } from '../src/service/store.js';
import { Capabilities } from '../src/shared/capabilities.js';
import { Meetings } from '../src/service/meeting.js';
const delay=ms=>new Promise(r=>setTimeout(r,ms));
async function until(fn){for(let i=0;i<300;i++){if(fn())return;await delay(5);}throw new Error('test timed out');}
function fixture(t,custom){const root=mkdtempSync(join(tmpdir(),'roundtable-test-'));t.after(()=>rmSync(root,{recursive:true,force:true}));let active=0,maxActive=0;const calls=[];
 const runner=async(id,opts)=>{active++;maxActive=Math.max(active,maxActive);calls.push({id,prompt:opts.prompt});try{
 opts.onEvent({type:'process_started'});if(custom)return await custom(id,opts,calls);
 const phase=opts.prompt.includes('"recommendation"');return {ok:true,text:JSON.stringify(phase?{recommendation:'Fixture decision',options:[{name:'option',pros:['pro'],cons:['con'],evidenceIds:['C-001']}],disagreements:['fixture dissent'],unknowns:[]}:{statement:`fixture ${id}`,replyTo:['M-001'],claims:[{text:'fixture inference',kind:'inference',sources:[],method:'fixture calculation 1+1=2',limitations:'test only'}],readyToConclude:false,openQuestions:['fixture unresolved']}),model:'test-fixture',sessionId:'test',toolCalls:[]};
 }finally{active--;}};
 const service=new Meetings({store:new Store(join(root,'meetings')),capabilities:new Capabilities(join(root,'shared')),runner});return {service,calls,maxActive:()=>maxActive,root};}
test('10 rounds are serial; later agents receive earlier output; summary retains valid evidence',async t=>{
 const f=fixture(t);const m=f.service.create({organizer:null,topic:'fixture question',participants:['codex','claude'],maxRounds:10});f.service.start(m.id);await until(()=>!f.service.active);
 const done=f.service.view(m.id);assert.equal(done.status,'completed');assert.equal(done.round,10);assert.equal(done.messages.length,21);assert.equal(f.calls.length,21);assert.equal(f.maxActive(),1);assert.match(f.calls[1].prompt,/fixture codex/);assert.equal(done.decision.status,'provider-draft');assert.deepEqual(done.decision.options[0].evidenceIds,['C-001']);
});
test('a single ready agent cannot end the meeting; unanimous ready can end early',async t=>{
 const f=fixture(t,async(id,opts,calls)=>({ok:true,text:JSON.stringify(opts.prompt.includes('"recommendation"')?{recommendation:'fixture',options:[{name:'x',pros:[],cons:[],evidenceIds:['C-001']}],disagreements:[],unknowns:[]}:{statement:'fixture',replyTo:['M-001'],claims:[{text:'fixture',kind:'proposal',sources:[],method:'fixture',limitations:''}],readyToConclude: id==='codex'||calls.length>2,openQuestions:[]}),toolCalls:[]}));
 const m=f.service.create({organizer:null,topic:'fixture',participants:['codex','claude']});f.service.start(m.id);await until(()=>!f.service.active);assert.equal(f.service.view(m.id).round,2);assert.equal(f.calls.length,5);
});
test('human speech waits for boundary; pause and resume never duplicate or overlap public turns',async t=>{
 let release;const gate=new Promise(r=>release=r);let once=true;
 const f=fixture(t,async(id,opts)=>{if(once){once=false;await gate;}return {ok:true,text:JSON.stringify({statement:'fixture '+id,replyTo:['M-001'],claims:[],readyToConclude:false,openQuestions:['pending']}),toolCalls:[]};});
 const m=f.service.create({organizer:null,topic:'fixture',participants:['codex','claude'],maxRounds:2});f.service.start(m.id);await until(()=>f.calls.length===1);f.service.send(m.id,'queued human');f.service.pause(m.id);
 assert.equal(f.service.view(m.id).messages.length,1);assert.equal(f.service.view(m.id).pending.length,1);release();await until(()=>!f.service.active);
 let paused=f.service.view(m.id);assert.equal(paused.status,'paused');assert.equal(paused.messages[1].author,'codex');assert.equal(paused.messages[2].author,'human');assert.equal(paused.turnIndex,1);
 f.service.start(m.id);await until(()=>!f.service.active);assert.match(f.calls[1].prompt,/queued human/);assert.equal(f.maxActive(),1);
});
test('failed output is not published; retry stays on the same participant',async t=>{
 let failed=true;const f=fixture(t,async()=>{if(failed){failed=false;return {ok:false,error:'fixture auth failure',toolCalls:[]};}return {ok:true,text:'{"statement":"fixture","replyTo":["M-001"],"claims":[],"readyToConclude":false,"openQuestions":["unknown"]}',toolCalls:[]};});
 const m=f.service.create({organizer:null,topic:'fixture',participants:['codex','claude'],maxRounds:1});f.service.start(m.id);await until(()=>!f.service.active);assert.equal(f.service.view(m.id).status,'paused');assert.equal(f.service.view(m.id).messages.length,1);f.service.start(m.id);await until(()=>!f.service.active);assert.equal(f.calls[0].id,f.calls[1].id);
});
test('invalid citations rejected; interrupted persisted meetings become paused on reload',async t=>{
 const f=fixture(t,async()=>({ok:true,text:'{"statement":"fixture","replyTo":["M-999"],"claims":[],"readyToConclude":true,"openQuestions":[]}',toolCalls:[]}));
 const m=f.service.create({organizer:null,topic:'fixture',participants:['codex','claude']});f.service.start(m.id);await until(()=>!f.service.active);assert.equal(f.service.view(m.id).messages.length,1);assert.match(f.service.view(m.id).error,/不存在/);
 const stored=f.service.get(m.id);stored.status='running';f.service.store.save(stored);const reloaded=new Meetings({store:f.service.store,capabilities:f.service.capabilities});assert.equal(reloaded.view(m.id).status,'paused');
});
test('round and identity validation; simultaneous meetings cannot start',async t=>{
 let release;const f=fixture(t,()=>new Promise(r=>release=()=>r({ok:false,error:'test stop',toolCalls:[]})));
 assert.throws(()=>f.service.create({organizer:null,topic:'x',participants:['codex','codex']}));assert.throws(()=>f.service.create({organizer:null,topic:'x',participants:['codex','claude'],maxRounds:11}));
 const a=f.service.create({organizer:null,topic:'a',participants:['codex','claude']}),b=f.service.create({organizer:null,topic:'b',participants:['codex','claude']});f.service.start(a.id);assert.throws(()=>f.service.start(b.id));release();await until(()=>!f.service.active);
});
