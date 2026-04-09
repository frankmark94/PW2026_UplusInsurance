import { describe, test, expect } from 'vitest';
import { getNextLocale } from '@/i18nLanguageCycle';

describe('language cycling', () => {
  test('wraps to first language when current locale is the last one', () => {
    expect(getNextLocale('es', ['en', 'es'])).toBe('en');
  });

  test('falls back to first language when current locale is missing', () => {
    expect(getNextLocale('fr', ['en', 'es'])).toBe('en');
  });
});
