import { resolve, join } from 'node:path';
import { mkdirSync, writeFileSync } from 'node:fs';
import { startService } from '../src/service/server.js';
const root=resolve('output/verification/three-independent-real');mkdirSync(root,{recursive:true});
const service=await startService({dataDir:resolve('.roundtable'),getSystemLanguages:()=>['zh-CN']});
try{
 const m=service.meetings.create({topic:'真实接入验收（非演示）：圆桌会议如何让三个 agent 先独立给意见，再讨论，并由指定 Leader 负责最后 summary？请提出一个简洁、可操作的会议流程，重点说明意见不同、证据不足和某位失败时该怎样结束。最多两轮：第1轮提交独立报告，readyToConclude=false；第2轮针对另一位已公开的真实意见回应，然后可以建议总结。不要为反驳而反驳。仅分析给定需求，不需要联网或执行代码；每条观点请用 kind=proposal 或 inference，明确自己的推理和未验证事项，不虚构事实、来源、工具或实验。每份报告最多两条观点、两个备选方案，尽量简短。能调用内置会议 MCP 的参会者可验证公开输入并保存自己的推理；AGY 可以直接使用提示词所附的同一会议材料。Leader 最后保留三方意见、优缺点及未解决问题，引用实际 C 编号，交由用户判断。',participants:['codex','claude','agy'],leader:'claude',mode:'independent',languageChoice:'zh-Hans',maxRounds:2,investigationTimeoutMinutes:5});
 writeFileSync(join(root,'meeting-id.txt'),m.id);console.log(JSON.stringify({meetingId:m.id,leader:m.leader}));
 service.meetings.on('change',view=>{if(view.id!==m.id)return;console.log(JSON.stringify({phase:view.phase,status:view.status,calls:view.calls.length,states:view.participantStates,reports:view.reports.filter(r=>r.inputVersion===view.inputVersion).map(r=>({participant:r.participant,status:r.status}))}));});
 service.meetings.start(m.id);while(service.meetings.active)await new Promise(r=>setTimeout(r,1000));
 const done=service.meetings.view(m.id),investigation=done.calls.filter(c=>c.phase==='investigation'&&c.status==='completed'),published=done.reports.filter(r=>r.status==='published');
 const result={ok:done.status==='completed'&&published.length===3&&done.decision?.status==='provider-draft'&&done.decision.author===done.leader,meetingId:m.id,leader:done.leader,summaryAuthor:done.decision?.author,publishedReports:published.map(r=>r.participant),status:done.status,round:done.round,calls:done.calls.length,failedAttempts:done.calls.filter(c=>c.status!=='completed').length,sharedInputHash:new Set(investigation.map(c=>c.inputHash)).size===1,parallelCalls:investigation.length===3&&Math.max(...investigation.map(c=>Date.parse(c.startedAt)))<Math.min(...investigation.map(c=>Date.parse(c.completedAt))),actualSpeakers:[...new Set(done.messages.filter(x=>x.origin==='provider').map(x=>x.author))],agyProjectMcpVerified:false,externalMcpIsolation:'AGY global configuration unverified; user requested participation',error:done.error};
 for(const [name,data] of [['meeting.json',done],['export.json',service.meetings.export(m.id)],['result.json',result]])writeFileSync(join(root,name),JSON.stringify(data,null,2));console.log(JSON.stringify(result));if(!result.ok)process.exitCode=1;
}finally{await service.close();}
