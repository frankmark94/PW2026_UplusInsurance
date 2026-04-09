<template>
  <button
    v-on:click="changeLanguage"
    :title="$t('message.change_language')"
    class="simple"
  >
    {{ $t('message.lang_' + currentLocale) }}
  </button>
</template>

<script>
import { mainconfig, i18n } from '../../global';
import { getNextLocale } from '../../i18nLanguageCycle';

export default {
  data() {
    return { ...mainconfig, currentLocale: i18n.global.locale };
  },
  methods: {
    changeLanguage() {
      this.currentLocale = getNextLocale(
        i18n.global.locale,
        this.settings.i18n.languages,
      );
      i18n.global.locale = this.currentLocale;
      mainconfig.currentLocale = this.currentLocale;
    },
  },
};
</script>
