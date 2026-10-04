export const LANGUAGE_CHOICES = ['system', 'zh-Hans', 'en'];
// Meeting language is independent of the interface. Legacy "system" meetings
// follow the question on future calls; their original answers remain unchanged.
export function questionLanguage(text, fallback = 'en') {
  const prose = String(text).replace(/```[\s\S]*?```/g, '').replace(/https?:\/\/\S+/g, '');
  const chinese = (prose.match(/\p{Script=Han}/gu) || []).length;
  const english = (prose.match(/[A-Za-z]+/g) || []).length;
  if (chinese >= 2 && chinese >= english) return 'zh-Hans';
  if (english >= 2) return 'en';
  return fallback;
}
export function resolveMeetingLanguage(choice = 'auto', question = '', preferred = [], supported = ['zh-Hans', 'en']) {
  if (['auto', 'system'].includes(choice)) return questionLanguage(question, resolveLanguage('system', preferred, supported));
  return resolveLanguage(choice, preferred, supported);
}
export function resolveLanguage(choice = 'system', preferred = [], supported = ['zh-Hans', 'en']) {
  if (choice !== 'system' && !supported.includes(choice)) throw new Error('无效语言选项');
  if (choice !== 'system') return choice;
  for (const language of preferred) {
    const tag = String(language).replaceAll('_', '-').toLowerCase();
    const exact = supported.find(id => id.toLowerCase() === tag); if (exact) return exact;
    if (/^zh(?:-|$)/.test(tag)) {
      const script = /(hant|tw|hk|mo)/.test(tag) ? 'zh-Hant' : 'zh-Hans';
      const match = supported.find(id => id.toLowerCase() === script.toLowerCase()); if (match) return match;
      continue;
    }
    const base = tag.split('-')[0], match = supported.find(id => id.toLowerCase() === base); if (match) return match;
  }
  return 'en';
}
