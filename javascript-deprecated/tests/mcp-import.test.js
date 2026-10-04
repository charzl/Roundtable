import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, readFileSync, realpathSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { mergeMcpSources } from '../src/shared/mcp-import.js';
import { Capabilities } from '../src/shared/capabilities.js';
import { buildInvocation } from '../src/providers/cli.js';
test('imports deduplicate equivalent transports and retain conflicting definitions and original disabled state',()=>{
 const sources=[{runtime:'codex',path:'fixture/config.toml',servers:{research:{command:'fixture-command',env:{TOKEN:'FIXTURE-secret'}},off:{command:'fixture-off',enabled:false}}},{runtime:'claude',path:'fixture/claude.json',servers:{research:{command:'fixture-command',env:{TOKEN:'FIXTURE-secret'}}}},{runtime:'agy',path:'fixture/agy.json',servers:{web:{serverUrl:'http://localhost:12345/mcp'},research:{command:'different-fixture-command'}}},{runtime:'codex',path:'fixture/http.toml',servers:{web:{url:'http://localhost:12345/mcp'}}}];
 const merged=mergeMcpSources(sources);assert.deepEqual(Object.keys(merged.config.mcpServers),['research','off','web','agy_research']);assert.equal(merged.config.mcpServers.off.enabled,false);assert.equal(merged.provenance.research.length,2);assert.equal(merged.provenance.web.length,2);assert.ok(!JSON.stringify(merged.config).includes('FIXTURE-secret'));assert.ok(Object.values(merged.secrets).includes('FIXTURE-secret'));
 const again=mergeMcpSources(sources,merged.config,merged.secrets);assert.deepEqual(again.config,merged.config);assert.deepEqual(again.secrets,merged.secrets);assert.equal(again.deferred.length,0);assert.equal(sources[0].servers.research.env.TOKEN,'FIXTURE-secret');
});
test('private imported values feed adapters without entering public config or provider arguments; disabled servers never launch',t=>{
 const root=mkdtempSync(join(tmpdir(),'roundtable-import-'));t.after(()=>rmSync(root,{recursive:true,force:true}));const caps=new Capabilities(join(root,'shared'));
 const merged=mergeMcpSources([{runtime:'fixture',path:'fixture.json',servers:{research:{command:process.execPath,cwd:root,args:['-e','process.stdout.write(JSON.stringify({cwd:process.cwd()}))'],env:{UNIQUE_FIXTURE_CREDENTIAL:'FIXTURE-secret'},startup_timeout_sec:30},off:{command:'fixture-disabled',enabled:false,envRefs:{TOKEN:'ABSENT_FIXTURE_TOKEN'}}}}]);caps.update(merged.config);writeFileSync(join(caps.root,'mcp-secrets.json'),JSON.stringify(merged.secrets),{mode:0o600});
 const meetingDir=join(root,'meeting'),callDir=join(meetingDir,'call');mkdirSync(meetingDir);const prepared=caps.prepare({meetingDir,callDir,participant:'codex',callId:'fixture',snapshot:caps.info()});assert.equal(prepared.extraEnv.UNIQUE_FIXTURE_CREDENTIAL,'FIXTURE-secret');assert.equal(prepared.mcpServers.off,undefined);assert.equal(prepared.mcpServers.research.cwd,root);assert.equal(prepared.mcpServers.research.startup_timeout_sec,30);assert.ok(!JSON.stringify(caps.info()).includes('FIXTURE-secret'));
 const invocation=buildInvocation('codex',{...prepared,prompt:'fixture',workspace:root});assert.ok(!invocation.args.join(' ').includes('FIXTURE-secret'));const claude=JSON.parse(readFileSync(prepared.mcpFile)).mcpServers.research;assert.equal(claude.cwd,undefined);assert.equal(claude.startup_timeout_sec,undefined);const launched=spawnSync(claude.command,claude.args,{encoding:'utf8',env:{...process.env,...claude.env}});assert.equal(launched.status,0,launched.stderr);assert.equal(JSON.parse(launched.stdout).cwd,realpathSync(root));caps.revoke(meetingDir,callDir);assert.deepEqual(JSON.parse(readFileSync(join(callDir,'stdio-research.json'))),{redacted:true});
});
