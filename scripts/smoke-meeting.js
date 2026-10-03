import { resolve,join } from 'node:path';
import { mkdirSync,readFileSync,writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { startService } from '../src/service/server.js';
const service=await startService({dataDir:resolve('.roundtable')});
try{
 const meeting=service.meetings.create({topic:'真实接入验收会议：本场验收设置上限 2 轮，是产品最多 10 轮允许范围内的测试配置，不存在上限冲突。AGY 尚没有本项目 MCP 工具，可直接读取下面随提示词提供的完整记录；其他参会者若有 roundtable_history 则实际读取。我们规定每轮每位 agent 各公开发言一次，最多 10 轮；人类插话和最终总结不计入讨论轮数。现在评估“只要某一位 agent 说可以结束，就立即结束全场”是否合理。给出可检验的逻辑反例和折中方案。若有 roundtable_history 请实际读取共同记录；若已有另一位参会者的关键观点，可用 roundtable_verify 登记对其逻辑的核查。不要把计划称为已执行的程序测试，无须网页检索或写文件。发言尽量简短；如果已有可执行方案，可以在第一轮建议总结。',participants:process.argv.includes('--agy')?['codex','claude','agy']:['codex','claude'],maxRounds:2});
 service.meetings.on('change',m=>{if(m.id===meeting.id)console.log(JSON.stringify({status:m.status,round:m.round,active:m.activeParticipant,messages:m.messages.length,error:m.error}));});
 service.meetings.start(meeting.id);
 while(service.meetings.active)await new Promise(r=>setTimeout(r,1000));
 const done=service.meetings.view(meeting.id);
 const dir=resolve('output/verification/real-meeting',done.id);mkdirSync(dir,{recursive:true});writeFileSync(join(dir,'meeting.json'),JSON.stringify(done,null,2));
 assert.equal(done.status,'completed');assert.equal(done.decision.status,'provider-draft');
 const agentMessages=done.messages.filter(m=>m.origin==='provider');assert.ok(agentMessages.some(m=>m.author==='codex'));assert.ok(agentMessages.some(m=>m.author==='claude'));
 const codex=agentMessages.find(m=>m.author==='codex'),claude=agentMessages.find(m=>m.author==='claude');
 const call=done.calls.find(c=>c.id===claude.callId),prompt=readFileSync(join(service.store.dir(done.id),call.artifacts,'prompt.md'),'utf8');
 assert.ok(prompt.includes(JSON.stringify(codex.text).slice(1,-1)));assert.ok(claude.replyTo.includes(codex.id));
 assert.ok(done.calls.every(c=>c.status==='completed'));
 const result={ok:true,meetingId:done.id,participants:done.participants,round:done.round,messages:agentMessages.length,decision:done.decision.status,toolEvents:done.calls.map(c=>({participant:c.participant,toolCalls:c.toolCalls,model:c.model})),research:done.research.length};
 writeFileSync(join(dir,'result.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}finally{await service.close();}
