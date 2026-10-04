const string = { type: 'string' }, strings = { type: 'array', items: string };
const object = properties => ({ type: 'object', properties, required: Object.keys(properties), additionalProperties: false });
const source = object({ title: string, url: string });
const claim = object({ text: string, kind: { type: 'string', enum: ['fact', 'inference', 'proposal'] }, sources: { type: 'array', items: source }, method: string, limitations: string });
const option = { name: string, pros: strings, cons: strings };
const turn = { statement: string, replyTo: strings, claims: { type: 'array', items: claim }, readyToConclude: { type: 'boolean' }, openQuestions: strings };
export function outputSchema(phase) {
  if (phase === 'decision') return object({ recommendation: string, options: { type: 'array', items: object({ ...option, evidenceIds: strings }) }, disagreements: strings, unknowns: strings });
  if (phase === 'investigation') return object({ ...turn, recommendation: string, options: { type: 'array', items: object(option) }, assumptions: strings, limitations: strings });
  return object(turn);
}
