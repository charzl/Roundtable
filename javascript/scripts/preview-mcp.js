import { _electron as electron } from 'playwright';
import { resolve,join } from 'node:path';
import { mkdirSync,writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const root=resolve('output/verification/mcp-import/desktop');mkdirSync(root,{recursive:true});
const env={...process.env};delete env.ROUNDTABLE_DATA_DIR;delete env.ELECTRON_RUN_AS_NODE;
const application=await electron.launch({executablePath:resolve('dist/Roundtable.app/Contents/MacOS/Roundtable'),env,timeout:20000});
try{
 const page=await application.firstWindow(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.locator('#interface-language option').first().waitFor({state:'attached'});await page.locator('#settings-button').click();await page.locator('#settings-dialog').waitFor({state:'visible'});
 const config=JSON.parse(await page.locator('#mcp-config').inputValue());const names=Object.keys(config.mcpServers);assert.deepEqual(names,['node_repl','computer-use','broadcom','xiaohongshu','robinhood-trading']);assert.equal(config.mcpServers['computer-use'].enabled,false);assert.ok(Object.values(config.mcpServers).every(s=>!s.env));
 const b=await page.evaluate(()=>window.roundtableDesktop.bootstrap());const privateStatus=await page.evaluate(async b=>(await fetch(b.url+'/mcp-secrets.json')).status,b);assert.equal(privateStatus,404);
 await page.screenshot({path:join(root,'shared-config.png'),fullPage:true});assert.deepEqual(errors,[]);const result={ok:true,servers:names,disabled:['computer-use'],privateValuesInEditor:false,privateFileServed:false,providerCalls:0,errors};writeFileSync(join(root,'result.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}finally{await application.close();}
