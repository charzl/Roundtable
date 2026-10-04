import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { spawn } from 'node:child_process';
import { Capabilities } from '../src/shared/capabilities.js';
const root=resolve(process.argv[2]||'output/verification/mcp-import/staged-shared');const caps=new Capabilities(root),config=caps.config();
const initialize={jsonrpc:'2.0',id:1,method:'initialize',params:{protocolVersion:'2024-11-05',capabilities:{},clientInfo:{name:'Roundtable config verification',version:'0.2.2'}}};
const tools={jsonrpc:'2.0',id:2,method:'tools/list',params:{}};
async function stdio(server){return new Promise(resolveDone=>{
 const env={...process.env,...server.env};for(const [key,reference]of Object.entries(server.envRefs||{}))env[key]=caps.privateValue(reference);
 const child=spawn(server.command,server.args||[],{cwd:server.cwd,env,stdio:['pipe','pipe','pipe'],shell:false});let buffer='',done=false;
 const finish=result=>{if(done)return;done=true;clearTimeout(timer);child.kill('SIGTERM');resolveDone(result);};const timer=setTimeout(()=>finish({status:'timeout',toolCalls:0}),15000);
 child.stdin.on('error',()=>{});child.stderr.on('data',()=>{});child.once('error',()=>finish({status:'launch-failed',toolCalls:0}));child.once('close',()=>finish({status:'process-closed',toolCalls:0}));child.stdout.setEncoding('utf8');
 child.stdout.on('data',chunk=>{buffer+=chunk;const lines=buffer.split('\n');buffer=lines.pop();for(const line of lines){let response;try{response=JSON.parse(line)}catch{continue}if(response.id===1){if(response.error){finish({status:'initialize-failed',toolCalls:0});return;}child.stdin.write(JSON.stringify({jsonrpc:'2.0',method:'notifications/initialized'})+'\n');child.stdin.write(JSON.stringify(tools)+'\n');}if(response.id===2){finish(response.error?{status:'tools-list-failed',toolCalls:0}:{status:'tools-listed',toolNames:response.result.tools.map(t=>t.name),toolCalls:0});}}});child.stdin.write(JSON.stringify(initialize)+'\n');
 });}
async function http(server){
 const headers={'Content-Type':'application/json',Accept:'application/json, text/event-stream'};
 if(server.bearer_token_env_var)headers.Authorization='Bearer '+caps.privateValue(server.bearer_token_env_var);
 let response=await fetch(server.url,{method:'POST',headers,body:JSON.stringify(initialize),signal:AbortSignal.timeout(12000)});
 if(!response.ok)return{status:response.status===401||response.status===403?'authentication-required':'http-error',httpStatus:response.status,toolCalls:0};
 const session=response.headers.get('mcp-session-id');if(session)headers['Mcp-Session-Id']=session;headers['Mcp-Protocol-Version']='2024-11-05';await response.text();
 await fetch(server.url,{method:'POST',headers,body:JSON.stringify({jsonrpc:'2.0',method:'notifications/initialized'}),signal:AbortSignal.timeout(12000)});
 response=await fetch(server.url,{method:'POST',headers,body:JSON.stringify(tools),signal:AbortSignal.timeout(12000)});if(!response.ok)return{status:'tools-list-http-error',httpStatus:response.status,toolCalls:0};
 const raw=await response.text();let result;try{result=JSON.parse(raw)}catch{for(const line of raw.split('\n').filter(l=>l.startsWith('data: '))){try{const event=JSON.parse(line.slice(6));if(event.id===2)result=event;}catch{}}}
 if(session)await fetch(server.url,{method:'DELETE',headers,signal:AbortSignal.timeout(5000)}).catch(()=>{});
 return result?.result?.tools?{status:'tools-listed',toolNames:result.result.tools.map(t=>t.name),toolCalls:0}:{status:'tools-list-invalid',toolCalls:0};
}
const results=[];for(const [name,server]of Object.entries(config.mcpServers)){
 if(server.enabled===false){results.push({name,status:'disabled-as-source',toolCalls:0});continue;}
 if(name==='node_repl'){results.push({name,status:'desktop-runtime-dependent-unverified',toolCalls:0});continue;}
 try{results.push({name,...await(server.url?http(server):stdio(server))});}catch{results.push({name,status:'connection-failed',toolCalls:0});}
}
const artifact=resolve('output/verification/mcp-import');mkdirSync(artifact,{recursive:true});writeFileSync(join(artifact,'connections.json'),JSON.stringify({results,providerCalls:0,toolsCalled:0},null,2));console.log(JSON.stringify({results,providerCalls:0,toolsCalled:0}));
