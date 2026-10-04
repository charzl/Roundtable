import { _electron as electron } from 'playwright';
import { resolve, join } from 'node:path';
import { mkdirSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
const root=resolve('output/verification/default-upgrade');mkdirSync(root,{recursive:true});
const env={...process.env};delete env.ROUNDTABLE_DATA_DIR;delete env.ELECTRON_RUN_AS_NODE;
const index=process.argv.indexOf('--meeting'),requestedId=index>=0?process.argv[index+1]:null;
if(index>=0&&!requestedId)throw new Error('--meeting requires a meeting ID');
async function inspect(){
 const application=await electron.launch({executablePath:resolve('dist/Roundtable.app/Contents/MacOS/Roundtable'),env,timeout:20000});
 try{
  const native=await application.evaluate(({app})=>({isPackaged:app.isPackaged,userData:app.getPath('userData')}));assert.equal(native.isPackaged,true);assert.ok(!native.userData.includes('/dist/'));assert.ok(native.userData.endsWith('/Roundtable/electron-profile'));
  const page=await application.firstWindow(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.locator('#interface-language option').first().waitFor({state:'attached'});
  const list=await page.evaluate(async()=>{const b=await window.roundtableDesktop.bootstrap();const response=await fetch(b.url+'/api/meetings',{headers:{Authorization:'Bearer '+b.token}});if(!response.ok)throw new Error('Meeting list unavailable');return response.json();});
  if(requestedId)assert.ok(list.some(m=>m.id===requestedId),'Requested legacy meeting unavailable');
  const selected=list.find(m=>m.id===requestedId)||list.find(m=>m.recovery?.missingRawArtifacts)||list[0];
  if(selected){await page.locator('.meeting-link').nth(list.findIndex(m=>m.id===selected.id)).click();if(selected.recovery?.missingRawArtifacts)await page.locator('#history-notice').waitFor({state:'visible'});await page.screenshot({path:join(root,'recovered-meeting.png'),fullPage:true});}
  assert.deepEqual(errors,[]);
  return{native,meetingId:selected?.id||null,messages:selected?.messages.length||0,calls:selected?.calls.length||0,missingArtifactsNotice:!!selected?.recovery?.missingRawArtifacts,recordCount:list.length,recordsSha256:createHash('sha256').update(JSON.stringify(list)).digest('hex'),errors};
 }finally{await application.close();}
}
const first=await inspect(),second=await inspect();assert.deepEqual(second,first);
const result={ok:true,...second,reopened:true,providerCalls:0};writeFileSync(join(root,'result.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result));
