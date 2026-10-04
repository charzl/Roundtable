// Adapted from ai-us-stock-lab/roundtable/src/runner.js (MIT), pinned
// ec07e195e802d52a6754a09eac8fda21c70143f7. See third_party/roundtable/LICENSE.
// Changes: never treat raw process output as a valid assistant answer;
// require a successful terminal provider event, and preserve model metadata.
export function extractChunkText(event) {
  if (event.type === 'assistant' && Array.isArray(event.message?.content)) {
    return event.message.content.filter(c => c.type === 'text').map(c => c.text).join('\n');
  }
  if (event.type === 'item.completed' && event.item?.type === 'agent_message') return event.item.text || '';
  return '';
}
export function extractSessionId(event) {
  return event.session_id || (event.type === 'thread.started' ? event.thread_id : null);
}
export function parseEvents(raw) {
  const events = raw.split('\n').filter(Boolean).flatMap(line => {
    try { return [JSON.parse(line)]; } catch { return []; }
  });
  const error = events.find(e => (e.event === 'result' && e.result?.status !== 'SUCCESS') || e.type === 'turn.failed' || (e.type === 'result' && (e.is_error || e.subtype?.startsWith('error'))));
  const agyResult = events.findLast(e => e.event === 'result');
  const terminal = events.findLast(e => e.type === 'result') || events.findLast(e => e.type === 'turn.completed') || agyResult;
  let text = typeof terminal?.result === 'string' ? terminal.result : '';
  if (!text && terminal?.structured_output) text = JSON.stringify(terminal.structured_output);
  if (!text && agyResult) {
    const steps = new Map();
    for (const event of events) {
      const update = event.step_update;
      if (event.event === 'step_update' && update?.step_type === 'agent_response' && typeof update.text_delta === 'string') steps.set(update.step_index, (steps.get(update.step_index) || '') + update.text_delta);
    }
    text = [...steps.values()].at(-1)?.trim() || agyResult.result?.response || '';
  }
  if (!text) text = events.filter(e => e.type === 'item.completed' && e.item?.type === 'agent_message').at(-1)?.item.text || events.map(extractChunkText).filter(Boolean).join('\n');
  return {
    text, events, completed: !!terminal && !error,
    error: error ? JSON.stringify(error.error || error.result || error.subtype).slice(0, 1200) : null,
    sessionId: events.map(extractSessionId).find(Boolean) || agyResult?.result?.conversation_id || null,
    model: events.find(e => e.model)?.model || events.find(e => e.message?.model)?.message.model || null,
    toolCalls: events.filter(e => (e.type === 'item.completed' && /tool_call|command_execution|web_search/.test(e.item?.type || '')) ||
      (e.type === 'assistant' && e.message?.content?.some(c => c.type === 'tool_use')) || (e.event === 'step_update' && e.step_update?.step_type === 'tool' && e.step_update?.state === 'DONE')),
  };
}
export function parseAnswer(text) {
  const value = text.trim().replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
  try { return JSON.parse(value); } catch { throw new Error('参会者未返回有效的 JSON 发言；原始输出已保留。'); }
}
