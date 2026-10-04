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
