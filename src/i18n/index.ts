import { de } from './locales/de';
import { en } from './locales/en';
import type { MessageKey, Messages } from './locales/en';
import { es } from './locales/es';
import { fr } from './locales/fr';
import { id } from './locales/id';
import { it } from './locales/it';
import { pl } from './locales/pl';
import { pt } from './locales/pt';
import { ru } from './locales/ru';
import { tr } from './locales/tr';
import { uk } from './locales/uk';

export type { MessageKey };

/** Supported languages with their names written in that language, for the picker. */
export const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'uk', name: 'Українська' },
  { code: 'es', name: 'Español' },
  { code: 'pt', name: 'Português' },
  { code: 'fr', name: 'Français' },
  { code: 'de', name: 'Deutsch' },
  { code: 'it', name: 'Italiano' },
  { code: 'pl', name: 'Polski' },
  { code: 'tr', name: 'Türkçe' },
  { code: 'ru', name: 'Русский' },
  { code: 'id', name: 'Bahasa Indonesia' },
] as const;

export type LangCode = (typeof LANGUAGES)[number]['code'];

export const LOCALES: Readonly<Record<LangCode, Messages>> = {
  en,
  uk,
  es,
  pt,
  fr,
  de,
  it,
  pl,
  tr,
  ru,
  id,
};

export function isLangCode(code: string): code is LangCode {
  return Object.prototype.hasOwnProperty.call(LOCALES, code);
}

/**
 * Picks the language: an explicit saved choice wins, then the first browser language we
 * support (matching on the primary subtag, so "pt-BR" -> "pt"), then English.
 */
export function detectLanguage(saved: string | null, preferred: readonly string[]): LangCode {
  if (saved && isLangCode(saved)) return saved;
  for (const tag of preferred) {
    const primary = tag.toLowerCase().split(/[-_]/)[0] ?? '';
    if (isLangCode(primary)) return primary;
  }
  return 'en';
}

let current: LangCode = 'en';

export function setLanguage(code: LangCode): void {
  current = code;
  if (typeof document !== 'undefined') document.documentElement.lang = code;
}

export function getLanguage(): LangCode {
  return current;
}

export type Params = Record<string, string | number>;

/** Translate a key, filling {placeholders}. Falls back to English for anything missing. */
export function t(key: MessageKey, params?: Params): string {
  const template = LOCALES[current][key] || en[key];
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) => {
    const value = params[name];
    return value === undefined ? match : String(value);
  });
}

/** Percentage in the current locale, e.g. 0.18 -> "18%", 0.022 -> "2.2%" (or "2,2 %" in French). */
export function pct(fraction: number): string {
  const value = Math.round(fraction * 1000) / 10;
  return new Intl.NumberFormat(current, {
    style: 'percent',
    maximumFractionDigits: Number.isInteger(value) ? 0 : 1,
  }).format(value / 100);
}
