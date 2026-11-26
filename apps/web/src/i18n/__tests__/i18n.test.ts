import { describe, expect, it } from 'vitest';
import en from '../locales/en.json';
import ptBR from '../locales/pt-BR.json';
import { resolveLanguage } from '../index';

/**
 * Translation completeness.
 *
 * The game ships two languages from day one; a missing key would silently show
 * the key itself to a player. This test flattens both files and compares them,
 * and it also rejects empty strings.
 */
function flatten(value: unknown, prefix = ''): Record<string, string> {
  if (typeof value !== 'object' || value === null) return { [prefix]: String(value) };
  return Object.entries(value as Record<string, unknown>).reduce<Record<string, string>>(
    (accumulator, [key, child]) => ({
      ...accumulator,
      ...flatten(child, prefix ? `${prefix}.${key}` : key),
    }),
    {},
  );
}

const pt = flatten(ptBR);
const english = flatten(en);

describe('translations', () => {
  it('has the exact same keys in Portuguese and English', () => {
    const missingInEnglish = Object.keys(pt).filter((key) => !(key in english));
    const missingInPortuguese = Object.keys(english).filter((key) => !(key in pt));
    expect(missingInEnglish).toEqual([]);
    expect(missingInPortuguese).toEqual([]);
  });

  it('has no empty strings', () => {
    for (const [key, value] of Object.entries(pt)) {
      expect(value.trim(), `pt-BR ${key}`).not.toBe('');
    }
    for (const [key, value] of Object.entries(english)) {
      expect(value.trim(), `en ${key}`).not.toBe('');
    }
  });

  it('keeps the same interpolation placeholders in both languages', () => {
    const placeholders = (value: string) => (value.match(/{{\s*\w+\s*}}/g) ?? []).sort();
    for (const key of Object.keys(pt)) {
      expect(placeholders(english[key] ?? ''), key).toEqual(placeholders(pt[key] ?? ''));
    }
  });
});

describe('resolveLanguage', () => {
  it('maps browser tags to the closest supported language', () => {
    expect(resolveLanguage('pt-BR')).toBe('pt-BR');
    expect(resolveLanguage('pt-PT')).toBe('pt-BR');
    expect(resolveLanguage('en-US')).toBe('en');
    expect(resolveLanguage('en')).toBe('en');
  });

  it('falls back to Portuguese for unknown or missing values', () => {
    expect(resolveLanguage('fr-FR')).toBe('pt-BR');
    expect(resolveLanguage(null)).toBe('pt-BR');
    expect(resolveLanguage(undefined)).toBe('pt-BR');
  });
});
