import { afterEach, describe, expect, it } from 'vitest';
import { detectLanguage, LANGUAGES, LOCALES, pct, setLanguage, t } from '@/i18n';
import { branchBlurb, branchShort, localFormName, skinName } from '@/i18n/gameText';
import { en } from '@/i18n/locales/en';
import { SKINS } from '@/game/skins';

const placeholders = (s: string): string[] =>
  [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1] ?? '').sort();

afterEach(() => {
  setLanguage('en');
});

describe('locales', () => {
  it('every language in the picker has a dictionary', () => {
    for (const { code } of LANGUAGES) expect(LOCALES[code]).toBeDefined();
    expect(Object.keys(LOCALES).sort()).toEqual(LANGUAGES.map((l) => l.code).sort());
  });

  it('every translation is non-empty and keeps exactly the English placeholders', () => {
    for (const [code, dict] of Object.entries(LOCALES)) {
      for (const key of Object.keys(en) as (keyof typeof en)[]) {
        const value = dict[key];
        expect(value.trim(), `${code}:${key} is empty`).not.toBe('');
        expect(placeholders(value), `${code}:${key} placeholders`).toEqual(placeholders(en[key]));
      }
    }
  });

  it('has a name for every skin in every language', () => {
    for (const { code } of LANGUAGES) {
      setLanguage(code);
      for (const skin of SKINS) expect(skinName(skin.id)).not.toBe(skin.id);
    }
  });
});

describe('detectLanguage', () => {
  it('prefers a saved choice', () => {
    expect(detectLanguage('uk', ['de-DE'])).toBe('uk');
  });

  it('matches browser languages on the primary subtag', () => {
    expect(detectLanguage(null, ['pt-BR', 'en-US'])).toBe('pt');
    expect(detectLanguage(null, ['xx', 'uk-UA'])).toBe('uk');
  });

  it('ignores unknown saved values and falls back to English', () => {
    expect(detectLanguage('klingon', ['ja-JP'])).toBe('en');
  });
});

describe('t', () => {
  it('fills placeholders and translates', () => {
    setLanguage('uk');
    expect(t('hud.rank', { rank: 3, total: 29 })).toBe('#3 з 29');
    setLanguage('en');
    expect(t('hud.rank', { rank: 3, total: 29 })).toBe('#3 of 29');
  });

  it('formats percentages for the locale', () => {
    setLanguage('en');
    expect(pct(0.18)).toBe('18%');
    expect(pct(0.022)).toBe('2.2%');
    setLanguage('de');
    expect(pct(0.022)).toMatch(/^2,2\s?%$/);
  });
});

describe('perk text', () => {
  it('reads numbers from the live perk data in every language', () => {
    for (const { code } of LANGUAGES) {
      setLanguage(code);
      const p15 = pct(0.15);
      expect(branchBlurb('swift'), code).toContain(p15);
      expect(branchShort('swift'), code).toContain(p15);
      expect(branchBlurb('armor'), code).toContain(pct(0.5));
      expect(branchShort('hunter'), code).toContain(pct(0.08));
      expect(branchBlurb('titan'), code).toContain(pct(0.4));
      expect(branchBlurb('venom'), code).toContain(pct(0.014));
      expect(branchBlurb('grazer')).not.toMatch(/\{\w+\}/);
    }
  });

  it('keeps complete form names as proper names and localizes the rest', () => {
    setLanguage('uk');
    expect(localFormName([])).toBe('Малюк');
    expect(localFormName(['swift'])).toBe('Спритність');
    expect(localFormName(['swift', 'venom', 'hunter', 'apex'])).toBe('Dart Viper');
  });
});
