export const getNextLocale = (currentLocale, languages = []) => {
  if (!Array.isArray(languages) || languages.length === 0) {
    return currentLocale;
  }

  const currentIndex = languages.indexOf(currentLocale);
  if (currentIndex === -1 || currentIndex === languages.length - 1) {
    return languages[0];
  }

  return languages[currentIndex + 1];
};
