export const LANGUAGE_CHOICES = ['system', 'zh-Hans', 'en'];
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
