import { _electron as electron } from 'playwright';
import { resolve } from 'node:path';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const packaged=process.argv.includes('--packaged');
const root=resolve('output/verification/'+(packaged?'packaged-desktop-smoke':'desktop-smoke'));mkdirSync(root,{recursive:true});
const dataDir=resolve(root,'data');rmSync(dataDir,{recursive:true,force:true});
const env={...process.env,ROUNDTABLE_DATA_DIR:dataDir};delete env.ELECTRON_RUN_AS_NODE;
const app=await electron.launch(packaged?{executablePath:resolve('dist/Roundtable.app/Contents/MacOS/Electron'),env,timeout:20000}:{args:[resolve('.')],env,timeout:20000});
try{
 const page=await app.firstWindow();const errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.getByText('本地服务已连接',{exact:true}).waitFor();
 await page.getByRole('button',{name:'开始一场圆桌会议'}).click();
 await page.locator('#topic-input').fill('桌面验收：讨论应用的验证方法（只创建，不调用模型）');
 await page.getByRole('button',{name:'创建会议',exact:true}).click();
 await page.locator('#meeting:not([hidden])').waitFor();
 await page.locator('#message-input').fill('这条人类补充需要持久化。');await page.getByRole('button',{name:'提交发言'}).click();
 await page.getByText('这条人类补充需要持久化。',{exact:true}).waitFor();
 await page.getByRole('tab',{name:'决策稿'}).click();await page.getByText('讨论结束后会自动整理建议、优缺点与剩余异议。',{exact:true}).waitFor();
 await page.getByRole('tab',{name:'公开讨论'}).click();
 await page.getByRole('button',{name:'共享能力',exact:true}).click();await page.locator('#mcp-config').fill('{"mcpServers":{}}');await page.getByRole('button',{name:'保存配置'}).click();
 const bootstrap=await page.evaluate(()=>window.roundtableDesktop.bootstrap());
 const meetings=await page.evaluate(async({url,token})=>(await fetch(url+'/api/meetings',{headers:{Authorization:'Bearer '+token}})).json(),bootstrap);
 assert.equal(meetings.length,1);assert.equal(meetings[0].messages.length,2);assert.equal(meetings[0].calls.length,0);
 const protectedState=await page.evaluate(()=>({node:typeof window.require,bridge:Object.keys(window.roundtableDesktop)}));assert.equal(protectedState.node,'undefined');
 await page.screenshot({path:resolve(root,'desktop.png'),fullPage:true});
 await page.reload();await page.getByText('本地服务已连接',{exact:true}).waitFor();await page.locator('.meeting-link').click();await page.getByText('这条人类补充需要持久化。',{exact:true}).waitFor();
 assert.deepEqual(errors,[]);writeFileSync(resolve(root,'result.json'),JSON.stringify({ok:true,errors,protectedState,meetings:meetings.length,providerCalls:0},null,2));console.log('Desktop smoke passed: native window, human messages, tabs, settings, persistence, renderer isolation; no provider calls.');
}finally{await app.close();}
