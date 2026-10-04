import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync, mkdirSync, writeFileSync, copyFileSync, chmodSync, renameSync } from 'node:fs';
import { homedir } from 'node:os';
import { resolve, join } from 'node:path';
import { mergeMcpSources } from '../src/shared/mcp-import.js';
import { validateMcp } from '../src/shared/capabilities.js';
const sources = JSON.parse(execFileSync('python3', [resolve('scripts/import-mcp.py')], { encoding: 'utf8', maxBuffer: 4*1024*1024 }));
const option=process.argv.indexOf('--shared-dir');const root=option>=0?resolve(process.argv[option+1]):join(homedir(),'Library/Application Support/Roundtable/data/shared');
mkdirSync(root,{recursive:true,mode:0o700});
const configFile=join(root,'mcp.json'),secretsFile=join(root,'mcp-secrets.json');
const existing=existsSync(configFile)?JSON.parse(readFileSync(configFile,'utf8')):{mcpServers:{}};
const previous=existsSync(secretsFile)?JSON.parse(readFileSync(secretsFile,'utf8')):{};
const imported=mergeMcpSources(sources,existing,previous);validateMcp(imported.config);
const backup=join(root,'backups','mcp-'+new Date().toISOString().replace(/[:.]/g,'-'));mkdirSync(backup,{recursive:true,mode:0o700});
for(const file of [configFile,secretsFile,join(root,'mcp-import.json')])if(existsSync(file)){copyFileSync(file,join(backup,file.split('/').at(-1)));chmodSync(join(backup,file.split('/').at(-1)),0o600);}
const atomic=(file,data)=>{writeFileSync(file+'.tmp',JSON.stringify(data,null,2),{mode:0o600});chmodSync(file+'.tmp',0o600);renameSync(file+'.tmp',file);};
// Resolve private values before publishing configuration references.
atomic(secretsFile,imported.secrets);atomic(configFile,imported.config);
const summary={at:new Date().toISOString(),servers:Object.keys(imported.config.mcpServers),enabled:Object.entries(imported.config.mcpServers).filter(([,s])=>s.enabled!==false).map(([n])=>n),provenance:imported.provenance,deferred:imported.deferred,status:'imported; connectivity and runtime usage are separate checks',sourceConfigsModified:false};
atomic(join(root,'mcp-import.json'),summary);console.log(JSON.stringify({servers:summary.servers,enabled:summary.enabled,deferred:summary.deferred,sharedDirectory:root,sourceConfigsModified:false}));
