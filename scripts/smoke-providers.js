import { resolve } from 'node:path';
import { mkdirSync, writeFileSync } from 'node:fs';
import { Capabilities } from '../src/shared/capabilities.js';
import { Store } from '../src/service/store.js';
import { runCli } from '../src/providers/cli.js';
const root=resolve('output/verification/provider-probes'), caps=new Capabilities(resolve('.roundtable/shared'));
mkdirSync(root,{recursive:true});
const ids=process.argv.slice(2).length?process.argv.slice(2):['codex','claude','agy','cursor'];
for(const id of ids){
  const dir=resolve(root,id),callDir=resolve(dir,'probe'),workspace=resolve(dir,'workspace');mkdirSync(workspace,{recursive:true});
  writeFileSync(resolve(dir,'meeting.json'),JSON.stringify({messages:[{id:'M-001',author:'human',text:'接入验证：确认你能读取当前会议记录。',claims:[]}]}));
  const prepared=caps.prepare({meetingDir:dir,callDir,participant:id,callId:'probe',snapshot:caps.info()});
  const prompt=id==='agy'?'你正在协助开发 Roundtable。不要使用工具、不要修改文件。用中文只返回一个 JSON 对象，含 statement 字段：简短指出单人轮流发言、多 agent 共享记录软件最需要验证的一项风险。':'This is a real CLI and shared MCP integration probe. Do not edit files or run commands. Call roundtable_history once if available and then return ONLY JSON with a statement field describing the actual history you read. If the tool is unavailable, state that clearly. Do not impersonate another participant.';
  try{const result=await runCli(id,{...prepared,prompt,workspace,artifactDir:callDir,timeoutMs:90000,onEvent:e=>console.log(id,e.type)});console.log(JSON.stringify({id,ok:result.ok,exitCode:result.exitCode,error:result.error,model:result.model,toolCalls:result.toolCalls.length,text:result.text.slice(0,1200),stderr:result.stderr.slice(-600)}));}
  finally{caps.revoke(dir,callDir);}
}
