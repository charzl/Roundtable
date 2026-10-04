import { resolveLanguage } from '/language.js';
export class I18n {
  async init(preferences) {
    this.manifest = await (await fetch('/locales/manifest.json')).json();
    this.packs = Object.fromEntries(await Promise.all(this.manifest.languages.map(async p => [p.id, await (await fetch(`/locales/${p.id}.json`)).json()])));
    this.set(preferences);
  }
  set(preferences) { this.choice = preferences.languageChoice; this.language = preferences.language || resolveLanguage(this.choice, preferences.systemLanguages, this.manifest.languages.map(p => p.id)); document.documentElement.lang = this.language; document.documentElement.dir = this.manifest.languages.find(p => p.id === this.language)?.direction || 'ltr'; }
  t(key, params = {}) { let text = this.packs[this.language]?.[key] ?? this.packs.en[key] ?? this.packs.en['error.generic']; if (typeof text === 'object') text = text[new Intl.PluralRules(this.language).select(params.count || 0)] ?? text.other; return text.replace(/\{(\w+)\}/g, (_m, name) => typeof params[name] === 'number' ? new Intl.NumberFormat(this.language).format(params[name]) : String(params[name] ?? '')); }
  apply() {
    document.querySelectorAll('[data-i18n]').forEach(n => n.textContent = this.t(n.dataset.i18n));
    document.querySelectorAll('[data-i18n-placeholder]').forEach(n => n.placeholder = this.t(n.dataset.i18nPlaceholder));
    document.querySelectorAll('[data-i18n-aria]').forEach(n => n.setAttribute('aria-label', this.t(n.dataset.i18nAria)));
    document.title = this.t('app.name');
  }
}
