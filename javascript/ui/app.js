import { I18n } from '/i18n.js';
const $ = selector => document.querySelector(selector);
const i18n = new I18n(), t = (key, params) => i18n.t(key, params);
const state = { token: null, url: location.origin, meetings: [], current: null, config: null, selectedClaim: null, tab: 'discussion', eventAbort: null, connected: false, decisionDrafts: {} };
const label = status => t('status.' + (status === 'completed' ? 'completed' : status || 'created'));
function element(tag, text, className) { const n = document.createElement(tag); if (text !== undefined) n.textContent = text; if (className) n.className = className; return n; }
function renderError(root, details) { root.replaceChildren(element('span', t('error.generic'))); if (details) { const d = element('details'); d.append(element('summary', t('error.details')), element('div', details)); root.append(d); } root.hidden = false; }
function messageError(error) { const dialog = document.querySelector('dialog[open]'); const root = dialog ? dialog.querySelector('.dialog-error') || dialog.appendChild(element('div', undefined, 'dialog-error error')) : $('#error'); renderError(root, error.details || error.message || String(error)); }
async function api(path, options = {}) {
  const response = await fetch(state.url + path, { ...options, headers: { Authorization: `Bearer ${state.token}`, 'Content-Type': 'application/json', ...options.headers } });
  const data = await response.json(); if (!response.ok) { const e = new Error(t('error.generic')); e.details = data.error; e.code = data.code; throw e; } return data;
}
async function action(path, data = {}) { $('#error').hidden = true; document.querySelectorAll('.dialog-error').forEach(e => e.remove()); try { return await api(path, { method: 'POST', body: JSON.stringify(data) }); } catch (e) { messageError(e); throw e; } }
const providerName = id => id === 'human' ? t('participants.human') : state.config?.providers.find(p => p.id === id)?.name || id;
const activeReport = (m, p) => m.reports?.find(r => r.participant === p && r.inputVersion === m.inputVersion && ['sealed', 'published'].includes(r.status));
const investigating = m => m?.mode === 'independent' && ['investigation', 'awaiting_reports'].includes(m.phase);
function languageOptions(select, value) { select.replaceChildren(); const system = element('option', t('language.system')); system.value = 'system'; select.append(system); for (const p of i18n.manifest.languages) { const o = element('option', p.name); o.value = p.id; select.append(o); } select.value = value || 'system'; }
function openNew() { languageOptions($('#meeting-language'), i18n.choice); updateMode(); $('#new-dialog').showModal(); $('#topic-input').focus(); }
function setCurrent(meeting) { state.current = meeting; state.selectedClaim = null; state.tab = 'discussion'; render(); }
function renderList() {
  const list = $('#meeting-list'); list.replaceChildren(); if (!state.meetings.length) list.append(element('p', t('meetings.none'), 'muted'));
  for (const m of state.meetings) { const b = element('button', undefined, 'meeting-link' + (state.current?.id === m.id ? ' selected' : '')); b.append(element('strong', m.topic), element('small', `${label(m.status)} · ${new Date(m.createdAt).toLocaleDateString(i18n.language)}`)); b.onclick = () => setCurrent(m); list.append(b); }
}
function renderParticipants() {
  const root = $('#participants'); root.replaceChildren(); const m = state.current; if (!m) return; root.append(element('h2', t('participants.title')));
  for (const id of ['human', ...m.participants]) {
    const row = element('div', undefined, 'participant' + (m.activeParticipants?.includes(id) || m.activeParticipant === id ? ' active' : ''));
    row.append(element('span', id === 'human' ? t('participants.human') : providerName(id).slice(0, 2), 'avatar'));
    const content = element('div'), status = m.participantStates[id], latest = m.calls.findLast(c => c.participant === id);
    content.append(element('strong', providerName(id))); if (id === m.leader) content.append(element('span', t('participants.leader'), 'badge')); content.append(element('small', id === 'human' ? t('participants.host') : status === 'completed' ? t('status.completedCall') : status ? label(status) : t('participants.wait')));
    if (latest?.model) content.append(element('small', latest.model));
    if (id !== 'human' && investigating(m) && m.status === 'paused' && !activeReport(m, id) && !m.skipped.includes(id)) {
      const controls = element('div', undefined, 'small-actions');
      for (const verb of ['retry', 'skip']) { const b = element('button', t('action.' + verb)); b.onclick = async () => { try { state.current = await action(`/api/meetings/${m.id}/${verb}`, { participant: id }); render(); } catch {} }; controls.append(b); } content.append(controls);
    }
    row.append(content); root.append(row);
  }
}
function selectClaim(id) { state.selectedClaim = id; renderEvidence(); document.querySelectorAll('[data-claim]').forEach(b => b.classList.toggle('selected', b.dataset.claim === id)); }
function claimButton(c, text) { const b = element('button', text || `${c.id} · ${t('claim.' + c.kind)} · ${t(c.status === 'missing-source' ? 'claim.missing' : 'claim.pending')}`); b.dataset.claim = c.id; b.onclick = () => selectClaim(c.id); return b; }
function renderMessages() {
  const root = $('#messages'); root.replaceChildren();
  for (const m of state.current.messages) {
    const article = element('article', undefined, 'message'); article.id = m.id; const head = element('div', undefined, 'message-head');
    head.append(element('span', m.author === 'human' ? t('participants.human') : providerName(m.author).slice(0, 2), 'avatar'), element('strong', providerName(m.author)), element('small', t('message.meta', { id: m.id, round: m.round, origin: t(m.origin === 'provider' ? 'message.provider' : 'message.human') })));
    article.append(head); if (m.replyTo?.length) article.append(element('div', t('message.reply', { ids: m.replyTo.join(', ') }), 'reply')); article.append(element('div', m.text, 'message-text'));
    if (m.claims.length) { const refs = element('div', undefined, 'claim-list'); for (const c of m.claims) refs.append(claimButton(c)); article.append(refs); } root.append(article);
  }
  $('#pending').replaceChildren(); for (const pending of state.current.pending) $('#pending').append(element('div', t('message.queued', { text: pending.text }), 'pending'));
}
function renderEvidence() {
  const root = $('#evidence-content'); root.replaceChildren(); const m = state.current, c = m?.messages.flatMap(x => x.claims).find(x => x.id === state.selectedClaim);
  if (!c) { root.append(element('div', t('evidence.select'), 'empty')); return; }
  root.append(element('h3', `${c.id} · ${providerName(c.author)}`), element('span', t(c.status === 'missing-source' ? 'claim.missing' : 'claim.unverified'), 'badge'), element('p', c.text), element('h3', t('evidence.sources')));
  if (!c.sources.length) root.append(element('p', t('evidence.noSources'), 'muted'));
  for (const s of c.sources) { const p = element('p'), a = element('a', s.title); a.href = s.url; a.target = '_blank'; a.rel = 'noopener noreferrer'; p.append(a); root.append(p); }
  root.append(element('h3', t('evidence.method')), element('p', c.method), element('h3', t('evidence.limits')), element('p', c.limitations || t('evidence.noLimits')));
  for (const check of m.research.filter(e => e.type === 'verification' && e.claimId === c.id)) root.append(element('h3', t(check.participant === c.author ? 'evidence.self' : 'evidence.peer', { author: providerName(check.participant) })), element('p', `${check.method}\n${check.result}`), element('span', t('verdict.' + check.verdict), 'badge'));
}
function renderResearch() { const root = $('#research'); root.replaceChildren(); if (!state.current?.research.length) return; root.append(element('h3', t('evidence.research'))); for (const e of state.current.research) { const block = element('div', undefined, 'research-item'), d = element('details'); d.append(element('summary', `${providerName(e.participant)} · ${e.question || e.claimId}`), element('pre', JSON.stringify(e, null, 2))); block.append(d); root.append(block); } }
function appendList(root, key, values) { root.append(element('h3', t(key))); const ul = element('ul'); values.forEach(v => ul.append(element('li', v))); root.append(ul); }
function optionBox(option) { const box = element('div', undefined, 'decision-option'); box.append(element('h3', option.name)); const comparison = element('div', undefined, 'comparison'); for (const [key, values] of [['decision.pros', option.pros], ['decision.cons', option.cons]]) { const c = element('div'); c.append(element('strong', t(key))); const ul = element('ul'); values.forEach(v => ul.append(element('li', v))); c.append(ul); comparison.append(c); } box.append(comparison); return box; }
function renderReports() {
  const root = $('#reports-panel'); root.replaceChildren(); const m = state.current, reports = m.reports?.filter(r => r.status === 'published' && r.inputVersion === m.inputVersion).sort((a, b) => m.participants.indexOf(a.participant) - m.participants.indexOf(b.participant)) || [];
  if (!reports.length) { root.append(element('p', t('reports.none'), 'empty')); return; }
  if (m.maxRounds === 1) root.append(element('p', t('meeting.noCrossDiscussion'), 'muted'));
  if (reports.length < m.participants.length) root.append(element('p', t('meeting.incomplete'), 'muted'));
  const grid = element('div', undefined, 'report-grid');
  for (const r of reports) { const card = element('article', undefined, 'report-card'); card.append(element('h2', providerName(r.participant)), element('small', r.messageId, 'muted'), element('h3', t('reports.recommendation')), element('div', r.answer.recommendation, 'message-text')); for (const option of r.answer.options) card.append(optionBox(option)); appendList(card, 'reports.assumptions', r.answer.assumptions); appendList(card, 'reports.limits', r.answer.limitations); appendList(card, 'reports.questions', r.answer.openQuestions); const b = element('button', t('reports.original')); b.onclick = () => { state.tab = 'discussion'; render(); $('#' + r.messageId)?.scrollIntoView(); }; card.append(b); grid.append(card); } root.append(grid);
}
function renderDecision() {
  const root = $('#decision-panel'), prior = $('#user-decision-input'); if (prior) state.decisionDrafts[prior.dataset.meetingId] = prior.value;
  root.replaceChildren(); const m = state.current, d = m.decision;
  if (!d) { root.append(element('div', t(m.status === 'finalizing' ? 'decision.working' : 'decision.pending'), 'empty')); return; }
  root.append(element('p', d.status === 'provider-draft' ? t('decision.author', { author: providerName(d.author) }) : t('decision.failed'), 'muted'), element('h3', t('decision.recommendation')), element('div', d.recommendation, 'decision-text'));
  for (const option of d.options) { const box = optionBox(option), refs = element('div', undefined, 'claim-list'); option.evidenceIds.forEach(id => { const c = m.messages.flatMap(x => x.claims).find(c => c.id === id); if (c) refs.append(claimButton(c, id)); }); box.append(refs); root.append(box); }
  for (const [key, values] of [['decision.dissent', d.disagreements], ['decision.unknowns', d.unknowns]]) appendList(root, key, values.length ? values : [t('decision.empty')]);
  if (m.status === 'completed' && m.messages.some(x => x.origin === 'provider')) { const b = element('button', t('action.retrySummary')); b.id = 'retry-summary'; b.onclick = async () => { try { state.current = await action(`/api/meetings/${m.id}/summary`); render(); } catch {} }; root.append(b); }
  if (m.decisionVersions?.length) { const history = element('details'); history.append(element('summary', t('decision.history'))); for (const version of m.decisionVersions) history.append(element('pre', JSON.stringify(version, null, 2))); root.append(history); }
  if (m.status === 'completed') { const form = element('form'); form.id = 'user-decision-form'; const l = element('label', t('decision.yours')); l.htmlFor = 'user-decision-input'; const input = element('textarea'); input.id = 'user-decision-input'; input.dataset.meetingId = m.id; input.rows = 3; input.maxLength = 12000; input.required = true; input.placeholder = t('decision.userPlaceholder'); input.value = state.decisionDrafts[m.id] ?? m.userDecision?.text ?? ''; const b = element('button', t('action.saveDecision'), 'primary'); b.type = 'submit'; form.append(l, input, b); form.onsubmit = async e => { e.preventDefault(); try { state.current = await action(`/api/meetings/${m.id}/decision`, { text: input.value }); render(); } catch {} }; root.append(form); }
}
function summaryOptions(select, participants, selected) { select.replaceChildren(); for (const id of participants) { const o = element('option', providerName(id)); o.value = id; select.append(o); } select.value = participants.includes(selected) ? selected : participants[0] || ''; }
function render() {
  renderList(); renderParticipants(); const m = state.current; $('#welcome').hidden = !!m; $('#meeting').hidden = !m; if (!m) { $('#research').replaceChildren(); renderEvidence(); return; }
  const heading = m.topic.split('\n')[0]; $('#topic').textContent = heading.length > 60 ? heading.slice(0, 60) + '…' : heading; $('#topic').title = m.topic;
  $('#history-notice').hidden = !m.recovery?.missingRawArtifacts; if (m.recovery?.missingRawArtifacts) $('#history-notice').textContent = t('history.recoveredWithoutArtifacts');
  $('#round-label').textContent = t('meeting.progress', { round: m.round, max: m.maxRounds, phase: t('phase.' + (m.phase || 'discussion')), status: label(m.status) });
  const active = m.activeParticipants?.length ? m.activeParticipants : m.activeParticipant ? [m.activeParticipant] : [];
  $('#turn-state').textContent = active.length ? active.map(p => `${providerName(p)} · ${label(m.participantStates[p])}`).join(' / ') + (m.pauseRequested ? t('meeting.pauseRequested') : '') : label(m.status);
  $('#start-button').hidden = !['created', 'paused'].includes(m.status); $('#start-button').textContent = t(m.status === 'paused' ? 'action.resume' : investigating(m) ? 'action.investigate' : 'action.start');
  $('#pause-button').hidden = m.status !== 'running'; $('#pause-button').disabled = m.pauseRequested; $('#finish-button').hidden = ['completed', 'finalizing'].includes(m.status);
  $('#restart-button').hidden = !(investigating(m) && m.status === 'paused'); $('#meeting-error').hidden = !m.error; if (m.error) renderError($('#meeting-error'), m.error);
  $('#message-input').disabled = ['completed', 'finalizing'].includes(m.status); $('#composer button').disabled = $('#message-input').disabled; $('#compose-note').textContent = t(investigating(m) ? 'composer.independent' : m.status === 'running' ? 'composer.running' : 'composer.normal');
  summaryOptions($('#meeting-leader'), m.participants, m.leader || m.summarizer || m.participants[0]); $('#meeting-leader').disabled = m.status === 'finalizing';
  $('#output-language-label').textContent = t('meeting.output', { language: i18n.manifest.languages.find(p => p.id === m.outputLanguage)?.name || t('language.system') });
  $('[data-tab=reports]').hidden = m.mode !== 'independent'; for (const b of document.querySelectorAll('[data-tab]')) b.setAttribute('aria-selected', String(b.dataset.tab === state.tab));
  for (const tab of ['discussion', 'reports', 'decision']) $('#' + tab + '-panel').hidden = state.tab !== tab;
  const progress = $('#investigation-progress'); progress.hidden = !investigating(m); if (!progress.hidden) { progress.className = 'investigation-status'; progress.replaceChildren(element('strong', t('reports.progress', { completed: m.participants.filter(p => activeReport(m, p)).length, total: m.participants.filter(p => !m.skipped.includes(p)).length })), element('p', t('reports.wait'), 'muted')); }
  renderMessages(); renderEvidence(); renderResearch(); renderReports(); renderDecision();
}
function updateMode() {
  const independent = $('#mode-input').value === 'independent'; $('#mode-note').hidden = !independent; $('#timeout-row').hidden = !independent;
  for (const p of state.config.providers) { const input = $('#provider-' + p.id); input.disabled = !p.executable || (independent && !p.independent); if (input.disabled) input.checked = false; }
  const participants = [...document.querySelectorAll('input[name=participant]:checked')].map(n => n.value); summaryOptions($('#leader-input'), participants, $('#leader-input').value);
}
function renderConfig(preserve = true) {
  const prior = preserve ? [...document.querySelectorAll('input[name=participant]:checked')].map(n => n.value) : null;
  const modelValues = Object.fromEntries([...document.querySelectorAll('.model-input')].map(n => [n.id, n.value]));
  const overview = $('#provider-overview'), choices = $('#provider-choices'); overview.replaceChildren(); choices.replaceChildren();
  for (const p of state.config.providers) {
    const card = element('div', undefined, 'provider-card'); card.append(element('strong', p.name), element('span', label(p.status))); overview.append(card);
    const choice = element('div', undefined, 'provider-choice'), input = element('input'); input.type = 'checkbox'; input.value = p.id; input.name = 'participant'; input.id = 'provider-' + p.id; input.disabled = !p.executable; input.checked = !!p.executable && (prior ? prior.includes(p.id) : true); input.onchange = updateMode;
    const l = element('label', p.name); l.htmlFor = input.id; l.append(element('small', label(p.status) + (p.id === 'agy' ? ' · ' + t('provider.agy') : ' · ' + p.provider))); if (p.id === 'agy' && p.independent) l.append(element('small', t('provider.agyIndependent')));
    if (!p.independent) l.append(element('small', t('provider.noIndependent')));
    const model = element('input'); model.type = 'text'; model.id = 'model-' + p.id; model.placeholder = t('provider.defaultModel'); model.setAttribute('aria-label', t('provider.model', { name: p.name })); model.maxLength = 160; model.className = 'model-input'; model.disabled = !p.executable; model.value = modelValues[model.id] || ''; choice.append(input, l, model); choices.append(choice);
  }
  updateMode();
}
async function applyPreferences(preferences) { state.config.preferences = preferences; i18n.set(preferences); i18n.apply(); languageOptions($('#interface-language'), preferences.languageChoice); const meetingChoice = $('#meeting-language').value; languageOptions($('#meeting-language'), meetingChoice || preferences.languageChoice); renderConfig(); render(); $('#connection').textContent = t(state.connected ? 'connection.connected' : 'connection.reconnecting'); }
async function listen() {
  state.eventAbort = new AbortController();
  try { const response = await fetch(state.url + '/api/events', { headers: { Authorization: `Bearer ${state.token}` }, signal: state.eventAbort.signal }); if (!response.ok) throw new Error(t('error.request')); const reader = response.body.getReader(), decoder = new TextDecoder(); let buffer = '';
    while (true) { const { done, value } = await reader.read(); if (done) break; buffer += decoder.decode(value, { stream: true }); let end; while ((end = buffer.indexOf('\n\n')) >= 0) { const packet = buffer.slice(0, end); buffer = buffer.slice(end + 2); const line = packet.split('\n').find(l => l.startsWith('data: ')); if (!line) continue; const m = JSON.parse(line.slice(6)), index = state.meetings.findIndex(x => x.id === m.id); if (index < 0) state.meetings.unshift(m); else state.meetings[index] = m; if (state.current?.id === m.id) state.current = m; render(); } } throw new Error(t('error.request'));
  } catch (e) { if (e.name !== 'AbortError') { state.connected = false; $('#connection').textContent = t('connection.reconnecting'); setTimeout(async () => { try { state.meetings = await api('/api/meetings'); if (state.current) state.current = state.meetings.find(m => m.id === state.current.id); state.connected = true; render(); $('#connection').textContent = t('connection.connected'); listen(); } catch { listen(); } }, 1500); } }
}
for (const selector of ['#new-button', '#welcome-new']) $(selector).onclick = openNew;
document.querySelectorAll('[data-close]').forEach(b => b.onclick = () => $('#' + b.dataset.close).close());
document.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { state.tab = b.dataset.tab; render(); });
$('#mode-input').onchange = updateMode;
$('#new-form').onsubmit = async e => { e.preventDefault(); try { const participants = [...document.querySelectorAll('input[name=participant]:checked')].map(n => n.value); if (participants.length < 2) throw new Error(t('error.selectParticipants')); const models = Object.fromEntries(participants.map(id => [id, $('#model-' + id).value.trim()]).filter(([, m]) => m)); const meeting = await action('/api/meetings', { topic: $('#topic-input').value, participants, models, maxRounds: Number($('#round-input').value), mode: $('#mode-input').value, leader: $('#leader-input').value, languageChoice: $('#meeting-language').value, investigationTimeoutMinutes: Number($('#timeout-input').value) }); $('#new-dialog').close(); $('#topic-input').value = ''; state.meetings = await api('/api/meetings'); setCurrent(meeting); } catch (error) { if (!error.code) messageError(error); } };
$('#composer').onsubmit = async e => { e.preventDefault(); try { state.current = await action(`/api/meetings/${state.current.id}/messages`, { text: $('#message-input').value }); $('#message-input').value = ''; render(); } catch {} };
for (const verb of ['start', 'pause', 'finish']) $('#' + verb + '-button').onclick = async () => { try { state.current = await action(`/api/meetings/${state.current.id}/${verb}`); render(); } catch {} };
$('#meeting-leader').onchange = async () => { try { state.current = await action(`/api/meetings/${state.current.id}/leader`, { participant: $('#meeting-leader').value }); render(); } catch {} };
$('#restart-button').onclick = () => { $('#restart-topic').value = state.current.topic; languageOptions($('#restart-language'), state.current.languageChoice); $('#restart-dialog').showModal(); };
$('#restart-form').onsubmit = async e => { e.preventDefault(); try { state.current = await action(`/api/meetings/${state.current.id}/restart`, { topic: $('#restart-topic').value, languageChoice: $('#restart-language').value }); $('#restart-dialog').close(); render(); } catch {} };
$('#interface-language').onchange = async () => { try { await applyPreferences(await api('/api/preferences', { method: 'PUT', body: JSON.stringify({ languageChoice: $('#interface-language').value }) })); } catch (e) { messageError(e); } };
window.addEventListener('focus', async () => { if (!state.config) return; try { const prefs = await api('/api/preferences'); if (prefs.language !== i18n.language || prefs.languageChoice !== i18n.choice) await applyPreferences(prefs); } catch {} });
$('#settings-button').onclick = async () => { try { state.config = await api('/api/config'); $('#skill-info').textContent = state.config.capabilities.directory + '\n' + t('shared.version', { hash: state.config.capabilities.skillHash.slice(0, 12) }); $('#mcp-config').value = JSON.stringify(state.config.capabilities.config, null, 2); $('#settings-dialog').showModal(); } catch (e) { messageError(e); } };
$('#save-settings').onclick = async () => { try { await api('/api/capabilities', { method: 'PUT', body: JSON.stringify(JSON.parse($('#mcp-config').value)) }); $('#settings-dialog').close(); } catch (e) { messageError(e); } };
$('#export-button').onclick = async () => { try { if (window.roundtableDesktop) await window.roundtableDesktop.exportMeeting(state.current.id); else { const data = await api(`/api/meetings/${state.current.id}/export`), blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }), url = URL.createObjectURL(blob), a = element('a'); a.href = url; a.download = `roundtable-${state.current.id}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); } } catch (e) { messageError(e); } };
(async () => { try {
  if (window.roundtableDesktop) { const bootstrap = await window.roundtableDesktop.bootstrap(); state.url = bootstrap.url; state.token = bootstrap.token; }
  else { state.token = new URLSearchParams(location.hash.slice(1)).get('token'); history.replaceState(null, '', location.pathname); }
  // Load fallback strings before reporting authorization or configuration failures.
  await i18n.init({ languageChoice: 'system', systemLanguages: navigator.languages }); i18n.apply(); if (!state.token) throw new Error(t('error.auth'));
  state.config = await api('/api/config'); state.meetings = await api('/api/meetings'); state.current = state.meetings[0] || null; state.connected = true;
  renderConfig(false); await applyPreferences(state.config.preferences); listen();
} catch (e) { $('#connection').textContent = i18n.packs ? t('connection.offline') : 'Not connected'; if (i18n.packs) messageError(e); else $('#error').textContent = 'Unable to load language resources.'; } })();
