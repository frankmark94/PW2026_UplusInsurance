import { describe, test, expect, vi } from 'vitest';
import { buildI18nResources } from '@/i18nBootstrap';

describe('i18n bootstrap resources', () => {
  test('falls back to first locale when default locale is missing from list', () => {
    const settings = {
      i18n: {
        defaultlocale: 'fr',
        languages: ['en', 'es'],
      },
    };

    const runtimeWindow = {
      langEN: { greeting: 'Hello' },
      dateFormatEN: { short: { year: 'numeric' } },
      numberFormatEN: { decimal: { style: 'decimal' } },
    };

    const logger = { warn: vi.fn() };

    const resources = buildI18nResources(settings, runtimeWindow, logger);

    expect(resources.defaultLocale).toBe('en');
    expect(resources.messages.en.message).toEqual({ greeting: 'Hello' });
    expect(resources.messages.es.message).toEqual({});
    expect(resources.datetimeFormats.es).toEqual({});
    expect(resources.numberFormats.es).toEqual({});
    expect(logger.warn).toHaveBeenCalledTimes(3);
  });
});
