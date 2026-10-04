import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync,rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { startService } from '../src/service/server.js';
test('loopback service requires bearer auth, rejects foreign origins, exports without secret config',async t=>{
 const root=mkdtempSync(join(tmpdir(),'roundtable-http-test-'));const service=await startService({dataDir:root});t.after(async()=>{await service.close();rmSync(root,{recursive:true,force:true});});
 assert.equal((await fetch(service.url+'/api/meetings')).status,401);
 const headers={Authorization:'Bearer '+service.token,'Content-Type':'application/json'};
 assert.equal((await fetch(service.url+'/api/meetings',{headers:{...headers,Origin:'https://evil.example'}})).status,403);
 const created=await fetch(service.url+'/api/meetings',{method:'POST',headers,body:JSON.stringify({topic:'fixture',participants:['codex','claude']})});assert.equal(created.status,201);const m=await created.json();
 const exported=await(await fetch(service.url+`/api/meetings/${m.id}/export`,{headers})).json();assert.equal(exported.format,'roundtable/1');assert.equal(exported.meeting.capabilitySnapshot,undefined);
 const page=await fetch(service.url);assert.match(page.headers.get('Content-Security-Policy'),/script-src 'self'/);
});
test('HTTP role configuration defaults to Cursor and rejects role overlap without changing the meeting', async t => {
 const root=mkdtempSync(join(tmpdir(),'roundtable-roles-http-')),service=await startService({dataDir:root}); t.after(async()=>{await service.close();rmSync(root,{recursive:true,force:true});});
 const headers={Authorization:'Bearer '+service.token,'Content-Type':'application/json'};
 const config=await(await fetch(service.url+'/api/config',{headers})).json();assert.equal(config.defaultOrganizer,'cursor');assert.deepEqual(config.organizers.map(p=>p.id),['cursor','codex','claude','agy']);
 const created=await(await fetch(service.url+'/api/meetings',{method:'POST',headers,body:JSON.stringify({topic:'FIXTURE roles',participants:['codex','claude'],leader:'claude'})})).json();assert.equal(created.organizer,'cursor');
 const conflict=await fetch(service.url+`/api/meetings/${created.id}/organizer`,{method:'POST',headers,body:JSON.stringify({organizer:'claude'})});assert.equal(conflict.status,400);assert.equal(service.meetings.view(created.id).organizer,'cursor');
 const changed=await(await fetch(service.url+`/api/meetings/${created.id}/organizer`,{method:'POST',headers,body:JSON.stringify({organizer:'agy',model:'fixture-model'})})).json();assert.equal(changed.organizer,'agy');assert.equal(changed.leader,'claude');assert.equal(changed.calls.length,0);
});
