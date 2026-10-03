const $ = selector => document.querySelector(selector);
const state = { token: null, url: location.origin, meetings: [], current: null, config: null, selectedClaim: null, tab: 'discussion', eventAbort: null };
const labels = { created:'尚未开始', running:'讨论中', paused:'已暂停', finalizing:'正在整理决策稿', completed:'已结束', installed:'已找到 CLI · 接入待验证', missing:'未找到 CLI', launching:'准备调用', process_started:'进程已启动', provider_event:'收到运行时事件', output_received:'收到输出', completedCall:'已取得完整输出', failed:'调用失败', invalid_response:'发言格式不符合要求', interrupted:'调用中断 · 完成情况未知' };
function element(tag, text, className) { const node = document.createElement(tag); if (text !== undefined) node.textContent = text; if (className) node.className = className; return node; }
function messageError(error) {
  const dialog = document.querySelector('dialog[open]');
  const root = dialog ? dialog.querySelector('.dialog-error') || dialog.appendChild(element('div', undefined, 'dialog-error error')) : $('#error');
  root.textContent = error.message || String(error); root.hidden = false;
}
async function api(path, options = {}) {
  const response = await fetch(state.url + path, { ...options, headers: { Authorization: `Bearer ${state.token}`, 'Content-Type':'application/json', ...options.headers } });
  const data = await response.json(); if (!response.ok) throw new Error(data.error || '请求失败'); return data;
}
async function action(path, data) { $('#error').hidden = true; document.querySelectorAll('.dialog-error').forEach(e => e.remove()); try { return await api(path, { method:'POST', body:JSON.stringify(data || {}) }); } catch (e) { messageError(e); throw e; } }
function providerName(id) { return id === 'human' ? '你' : state.config?.providers.find(p => p.id === id)?.name || id; }
function openNew() { $('#new-dialog').showModal(); $('#topic-input').focus(); }
function setCurrent(meeting) { state.current = meeting; state.selectedClaim = null; state.tab = 'discussion'; render(); }
function renderList() {
  const list = $('#meeting-list'); list.replaceChildren();
  if (!state.meetings.length) list.append(element('p','还没有会议','muted'));
  for (const m of state.meetings) {
    const button = element('button', undefined, 'meeting-link' + (state.current?.id === m.id ? ' selected' : ''));
    button.append(element('strong', m.topic), element('small', `${labels[m.status]} · ${new Date(m.createdAt).toLocaleDateString('zh-CN')}`));
    button.onclick = () => setCurrent(m); list.append(button);
  }
}
function renderParticipants() {
  const root = $('#participants'); root.replaceChildren(); if (!state.current) return;
  root.append(element('h2','参会者'));
  for (const id of ['human', ...state.current.participants]) {
    const row = element('div',undefined,'participant' + (state.current.activeParticipant === id ? ' active' : ''));
    row.append(element('span', id === 'human' ? '你' : providerName(id).slice(0,2),'avatar'));
    const content = element('div'); const status = state.current.participantStates[id];
    const latest = state.current.calls.findLast(c => c.participant === id);
    content.append(element('strong', providerName(id)), element('small', id === 'human' ? '会议发起人' : status === 'completed' ? '已取得完整输出' : labels[status] || '等待发言'));
    if (latest?.model) content.append(element('small',latest.model));
    row.append(content); root.append(row);
  }
}
function selectClaim(id) { state.selectedClaim = id; renderEvidence(); document.querySelectorAll('[data-claim]').forEach(button => button.classList.toggle('selected', button.dataset.claim === id)); }
function claimButton(claim, text) { const button = element('button',text || `${claim.id} · ${claim.kind === 'fact' ? '事实' : claim.kind === 'proposal' ? '建议' : '推断'} · ${claim.status === 'missing-source' ? '缺少来源' : '待核查'}`); button.dataset.claim = claim.id; button.onclick = () => selectClaim(claim.id); return button; }
function renderMessages() {
  const root = $('#messages'); root.replaceChildren();
  for (const m of state.current.messages) {
    const article = element('article',undefined,'message'); article.id = m.id;
    const head = element('div',undefined,'message-head');
    head.append(element('span',m.author === 'human' ? '你' : providerName(m.author).slice(0,2),'avatar'),element('strong',m.name),element('small',`${m.id} · 第 ${m.round} 轮 · ${m.origin === 'provider' ? '真实 CLI 输出' : '人类发言'}`));
    article.append(head);
    if (m.replyTo?.length) article.append(element('div',`回应 ${m.replyTo.join('、')}`,'reply'));
    article.append(element('div',m.text,'message-text'));
    if (m.claims.length) { const references = element('div',undefined,'claim-list'); for (const c of m.claims) references.append(claimButton(c)); article.append(references); }
    root.append(article);
  }
  $('#pending').replaceChildren();
  for (const pending of state.current.pending) $('#pending').append(element('div',`等待回合边界公开：${pending.text}`,'pending'));
}
function renderEvidence() {
  const root = $('#evidence-content'); root.replaceChildren();
  const m = state.current;
  const claim = m?.messages.flatMap(message => message.claims).find(c => c.id === state.selectedClaim);
  if (!claim) { root.append(element('div','选择一条观点，查看它的依据、方法和限制。','empty')); return; }
  root.append(element('h3',`${claim.id} · ${providerName(claim.author)}`),element('span',claim.status === 'missing-source' ? '缺少来源' : '尚未独立核查','badge'),element('p',claim.text));
  root.append(element('h3','来源'));
  if (!claim.sources.length) root.append(element('p','未提供外部来源','muted'));
  for (const source of claim.sources) {
    const paragraph = element('p'), a = element('a',source.title); a.href = source.url; a.target = '_blank'; a.rel = 'noopener noreferrer'; paragraph.append(a); root.append(paragraph);
  }
  root.append(element('h3','分析方法与输入'),element('p',claim.method),element('h3','限制与未验证事项'),element('p',claim.limitations || '作者未补充限制；仍待核查。'));
  const verifications = m.research.filter(entry => entry.type === 'verification' && entry.claimId === claim.id);
  for (const check of verifications) {
    root.append(element('h3',`${providerName(check.participant)} 的${check.participant === claim.author ? '自查' : '交叉核查'}`),element('p',`${check.method}\n${check.result}`),element('span',check.verdict,'badge'));
  }
}
function renderResearch() {
  const root = $('#research'); root.replaceChildren(); if (!state.current?.research.length) return;
  root.append(element('h3','共享研究与核查'));
  for (const entry of state.current.research) {
    const block = element('div',undefined,'research-item'), details = element('details');
    details.append(element('summary',`${providerName(entry.participant)} · ${entry.question || entry.claimId}`),element('pre',JSON.stringify(entry,null,2)));
    block.append(details); root.append(block);
  }
}
function renderDecision() {
  const root = $('#decision-panel'); root.replaceChildren(); const decision = state.current.decision;
  if (!decision) { root.append(element('div',state.current.status === 'finalizing' ? '正在根据公开记录整理决策稿。' : '讨论结束后会自动整理建议、优缺点与剩余异议。','empty')); return; }
  root.append(element('p',decision.status === 'provider-draft' ? `${providerName(decision.author)} 整理的决策稿 · 不是全员确认或最终决定` : '总结未成功 · 以下仅保留原始观点','muted'),element('h3','供你判断的建议'),element('div',decision.recommendation,'decision-text'));
  for (const option of decision.options) {
    const box = element('div',undefined,'decision-option'); box.append(element('h3',option.name)); const comparison = element('div',undefined,'comparison');
    for (const [name, values] of [['优点',option.pros],['代价 / 风险',option.cons]]) { const column = element('div'); column.append(element('strong',name)); const list = element('ul'); values.forEach(v => list.append(element('li',v))); column.append(list); comparison.append(column); }
    box.append(comparison); const refs = element('div',undefined,'claim-list');
    option.evidenceIds.forEach(id => { const claim = state.current.messages.flatMap(m => m.claims).find(c => c.id === id); if (claim) refs.append(claimButton(claim,id)); }); box.append(refs); root.append(box);
  }
  for (const [label, values] of [['保留的异议',decision.disagreements],['仍待验证',decision.unknowns]]) {
    root.append(element('h3',label)); const list = element('ul'); if (!values.length) list.append(element('li','决策稿未列出；不代表所有参会者已确认。')); values.forEach(v => list.append(element('li',v))); root.append(list);
  }
}
function render() {
  renderList(); renderParticipants(); const m = state.current;
  $('#welcome').hidden = !!m; $('#meeting').hidden = !m;
  if (!m) { $('#research').replaceChildren(); renderEvidence(); return; }
  const heading = m.topic.split('\n')[0]; $('#topic').textContent = heading.length > 60 ? heading.slice(0,60)+'…' : heading; $('#topic').title = m.topic;
  $('#round-label').textContent = `第 ${m.round} 轮 / 最多 ${m.maxRounds} 轮 · ${labels[m.status]}`;
  $('#turn-state').textContent = m.activeParticipant ? `${providerName(m.activeParticipant)} · ${labels[m.participantStates[m.activeParticipant]] || '调用中'}${m.pauseRequested ? ' · 本回合结束后暂停' : ''}` : `${labels[m.status]}${m.endReason ? ' · '+m.endReason : ''}`;
  $('#start-button').hidden = !['created','paused'].includes(m.status);
  $('#start-button').textContent = m.status === 'paused' ? '继续讨论' : '开始讨论';
  $('#pause-button').hidden = m.status !== 'running'; $('#pause-button').disabled = m.pauseRequested;
  $('#finish-button').hidden = ['completed','finalizing'].includes(m.status);
  $('#meeting-error').hidden = !m.error; $('#meeting-error').textContent = m.error || '';
  $('#message-input').disabled = ['completed','finalizing'].includes(m.status); $('#composer button').disabled = $('#message-input').disabled;
  $('#compose-note').textContent = m.status === 'running' ? '当前 agent 发言结束后公开，后续参会者会读取。' : '发言会加入共同会议记录。';
  document.querySelectorAll('[data-tab]').forEach(button => button.setAttribute('aria-selected',String(button.dataset.tab === state.tab)));
  $('#discussion-panel').hidden = state.tab !== 'discussion'; $('#decision-panel').hidden = state.tab !== 'decision';
  renderMessages(); renderEvidence(); renderResearch(); renderDecision();
}
function renderConfig() {
  const overview = $('#provider-overview'), choices = $('#provider-choices'); overview.replaceChildren(); choices.replaceChildren();
  for (const p of state.config.providers) {
    const card = element('div',undefined,'provider-card'); card.append(element('strong',p.name),element('span',labels[p.status])); overview.append(card);
    const choice = element('div',undefined,'provider-choice'), input = element('input'); input.type='checkbox'; input.value=p.id; input.name='participant'; input.id='provider-'+p.id;
    input.disabled = !p.executable; input.checked = !!p.executable && p.id !== 'agy';
    const label = element('label',p.name); label.htmlFor=input.id;
    label.append(element('small',p.id === 'agy' ? `${labels[p.status]} · 底层模型与共享 MCP 待验证` : `${labels[p.status]} · ${p.provider}`));
    const model = element('input'); model.type = 'text'; model.id = 'model-'+p.id; model.placeholder = 'CLI 默认模型'; model.setAttribute('aria-label',p.name+' 模型（可选）'); model.maxLength = 160; model.className = 'model-input'; model.disabled = !p.executable;
    choice.append(input,label,model); choices.append(choice);
  }
}
async function listen() {
  state.eventAbort = new AbortController();
  try {
    const response = await fetch(state.url+'/api/events',{ headers:{Authorization:`Bearer ${state.token}`},signal:state.eventAbort.signal });
    if (!response.ok) throw new Error('事件连接失败');
    const reader=response.body.getReader(), decoder=new TextDecoder(); let buffer='';
    while (true) {
      const {done,value}=await reader.read(); if(done) break; buffer+=decoder.decode(value,{stream:true});
      let end; while ((end=buffer.indexOf('\n\n'))>=0) {
        const packet=buffer.slice(0,end); buffer=buffer.slice(end+2); const line=packet.split('\n').find(l=>l.startsWith('data: ')); if(!line) continue;
        const meeting=JSON.parse(line.slice(6)); const index=state.meetings.findIndex(m=>m.id===meeting.id);
        if(index<0) state.meetings.unshift(meeting); else state.meetings[index]=meeting;
        if(state.current?.id===meeting.id) state.current=meeting; render();
      }
    }
    throw new Error('本地服务连接已断开');
  } catch(e) { if(e.name!=='AbortError'){ $('#connection').textContent='本地连接中断 · 正在重连'; setTimeout(async()=>{try{state.meetings=await api('/api/meetings'); if(state.current) state.current=state.meetings.find(m=>m.id===state.current.id); render(); $('#connection').textContent='本地服务已连接'; listen();}catch{listen();}},1500); } }
}
for (const button of ['#new-button','#welcome-new']) $(button).onclick=openNew;
document.querySelectorAll('[data-close]').forEach(button=>button.onclick=()=>$('#'+button.dataset.close).close());
document.querySelectorAll('[data-tab]').forEach(button=>button.onclick=()=>{state.tab=button.dataset.tab;render();});
$('#new-form').onsubmit=async event=>{event.preventDefault();try{
  const participants=[...document.querySelectorAll('input[name=participant]:checked')].map(input=>input.value);
  const models=Object.fromEntries(participants.map(id=>[id,$('#model-'+id).value.trim()]).filter(([,model])=>model));
  const meeting=await action('/api/meetings',{topic:$('#topic-input').value,participants,models,maxRounds:Number($('#round-input').value)});
  $('#new-dialog').close(); $('#topic-input').value=''; state.meetings=await api('/api/meetings');setCurrent(meeting);
}catch{}};
$('#composer').onsubmit=async event=>{event.preventDefault();try{state.current=await action(`/api/meetings/${state.current.id}/messages`,{text:$('#message-input').value});$('#message-input').value='';render();}catch{}};
for(const verb of ['start','pause','finish']) $('#'+verb+'-button').onclick=async()=>{try{state.current=await action(`/api/meetings/${state.current.id}/${verb}`);render();}catch{}};
$('#settings-button').onclick=async()=>{try{state.config=await api('/api/config');$('#skill-info').textContent=state.config.capabilities.directory+'\n规范版本：'+state.config.capabilities.skillHash.slice(0,12);$('#mcp-config').value=JSON.stringify(state.config.capabilities.config,null,2);$('#settings-dialog').showModal();}catch(e){messageError(e);}};
$('#save-settings').onclick=async()=>{try{await api('/api/capabilities',{method:'PUT',body:JSON.stringify(JSON.parse($('#mcp-config').value))});$('#settings-dialog').close();}catch(e){messageError(e);}};
$('#export-button').onclick=async()=>{try{
  if(window.roundtableDesktop) await window.roundtableDesktop.exportMeeting(state.current.id);
  else {const data=await api(`/api/meetings/${state.current.id}/export`),blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=element('a');a.href=url;a.download=`roundtable-${state.current.id}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
}catch(e){messageError(e);}};
(async()=>{try{
  if(window.roundtableDesktop){const bootstrap=await window.roundtableDesktop.bootstrap();state.url=bootstrap.url;state.token=bootstrap.token;}
  else {state.token=new URLSearchParams(location.hash.slice(1)).get('token');history.replaceState(null,'',location.pathname);}
  if(!state.token)throw new Error('缺少本地会话授权，请通过桌面应用或服务启动地址进入。');
  state.config=await api('/api/config');state.meetings=await api('/api/meetings');state.current=state.meetings[0] || null;$('#connection').textContent='本地服务已连接';renderConfig();render();listen();
}catch(e){$('#connection').textContent='未连接';messageError(e);}})();
