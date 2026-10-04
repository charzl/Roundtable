export function publicMessages(meeting) {
  return [...meeting.messages, ...(meeting.followups || []).flatMap(f => [f.questionMessage, f.answerMessage].filter(Boolean))];
}
export function validateReferences(answer, meeting) {
  const messages = publicMessages(meeting), known = new Set(messages.flatMap(m => [m.id, ...(m.claims || []).map(c => c.id)]));
  if (!answer || typeof answer.reason !== 'string' || !answer.reason.trim() || answer.reason.length > 6000 || !Array.isArray(answer.evidenceIds) || answer.evidenceIds.length > 30 || answer.evidenceIds.some(id => !known.has(id))) throw new Error('Organizer 需要有效理由与真实公开引用');
}
export function validatePlan(answer, meeting, candidates) {
  validateReferences(answer, meeting);
  if (!Array.isArray(answer.order) || answer.order.length !== candidates.length || new Set(answer.order).size !== candidates.length || answer.order.some(p => !candidates.includes(p))) throw new Error('Organizer 必须安排所有本轮待发言者各一次');
  if (typeof answer.focus !== 'string' || answer.focus.length > 6000 || typeof answer.suggestSummary !== 'boolean' || !Array.isArray(answer.unresolvedQuestions) || answer.unresolvedQuestions.length > 20 || answer.unresolvedQuestions.some(q => typeof q !== 'string' || !q.trim() || q.length > 6000)) throw new Error('Organizer 主持内容无效');
}
export function validateRoute(answer, meeting, candidates) {
  validateReferences(answer, meeting);
  if (typeof answer.needsClarification !== 'boolean' || typeof answer.clarification !== 'string' || answer.clarification.length > 6000 || (answer.needsClarification ? answer.target !== '' || !answer.clarification.trim() : !candidates.includes(answer.target))) throw new Error('Organizer 必须指定一位有效回答者或请求澄清');
}
