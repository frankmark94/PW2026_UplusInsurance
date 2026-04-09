export const buildI18nResources = (
  settings,
  runtimeWindow = window,
  logger = console,
) => {
  const messages = {};
  const datetimeFormats = {};
  const numberFormats = {};
  const localePayloadWarnings = new Set();

  const readLocalePayload = (prefix, languageKey, lang) => {
    const payload = runtimeWindow[`${prefix}${languageKey}`];
    if (typeof payload === 'undefined') {
      const warningKey = `${prefix}:${languageKey}`;
      if (!localePayloadWarnings.has(warningKey)) {
        localePayloadWarnings.add(warningKey);
        logger.warn(
          `[i18n] Missing locale payload for '${lang}' (${prefix}${languageKey}). Falling back to empty format/messages object.`,
        );
      }
    }
    return payload;
  };

  let defaultLocaleLoaded = false;
  for (const i in settings.i18n.languages) {
    const lang = settings.i18n.languages[i];
    const languageKey = lang.toUpperCase();
    const localeMessage = readLocalePayload('lang', languageKey, lang);
    const localeDateFormat = readLocalePayload('dateFormat', languageKey, lang);
    const localeNumberFormat = readLocalePayload(
      'numberFormat',
      languageKey,
      lang,
    );

    messages[lang] = {
      message: localeMessage || {},
    };
    datetimeFormats[lang] = localeDateFormat || {};
    numberFormats[lang] = localeNumberFormat || {};

    if (lang === settings.i18n.defaultlocale) {
      defaultLocaleLoaded = true;
    }
  }

  const defaultLocale = defaultLocaleLoaded
    ? settings.i18n.defaultlocale
    : settings.i18n.languages[0];

  return {
    messages,
    datetimeFormats,
    numberFormats,
    defaultLocale,
  };
};
