<template>
  <div class="col col-2">
    <div
      class="secondary-card"
      v-if="
        settings.pega_marketing.Host === '' ||
        settings.pega_marketing.accountPage.placement === '' ||
        settings.pega_marketing.accountPage.containerName === '' ||
        (loading && !settings.pega_marketing.showLoadingIndicator) ||
        errorloading
      "
    >
      <section v-if="app.industry === 'insurance'" class="ai-assistant-promo">
        <div class="ai-assistant-icon-wrap">
          <svg class="ai-assistant-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="56" height="56" fill="none">
            <circle cx="32" cy="32" r="30" fill="var(--brandColor)" opacity="0.1"/>
            <path d="M44 36h-1.5l-2.5-7c-.4-1.1-1.4-1.9-2.6-1.9H26.6c-1.2 0-2.2.8-2.6 1.9l-2.5 7H20c-1.1 0-2 .9-2 2v6c0 .6.4 1 1 1h2c.6 0 1-.4 1-1v-1h20v1c0 .6.4 1 1 1h2c.6 0 1-.4 1-1v-6c0-1.1-.9-2-2-2z" fill="var(--brandColor)" opacity="0.8"/>
            <circle cx="24" cy="39" r="2" fill="#fff"/>
            <circle cx="40" cy="39" r="2" fill="#fff"/>
            <rect x="28" y="37" width="8" height="3" rx="1" fill="#fff" opacity="0.7"/>
          </svg>
        </div>
        <h3 class="ai-assistant-title">{{ $t('message.ai_assistant_title') }}</h3>
        <p class="ai-assistant-msg">{{ $t('message.ai_assistant_msg') }}</p>
        <a href="./new-quote.html" class="ai-assistant-cta">
          {{ $t('message.ai_assistant_cta') }}
        </a>
      </section>
      <section
        class="offer-card-col"
        v-for="item in app.offers"
        :key="item.title"
      >
        <img
          class="offer-img"
          :src="'./img/' + item.img"
          :alt="$t('message.' + item.title)"
        />
        <div class="content">
          <h3>{{ $t('message.' + item.title) }}</h3>
          <p>{{ $t('message.' + item.message) }}</p>
          <a v-on:click="gotoOfferPage" href="./offer.html">{{
            $t('message.learnmore')
          }}</a>
        </div>
      </section>
    </div>
    <div
      class="secondary-card loading-container"
      style="min-height: 300px"
      v-else-if="
        settings.pega_marketing.Host !== '' &&
        loading &&
        settings.pega_marketing.showLoadingIndicator
      "
    >
      <span class="loading">
        <span class="dot"></span>
        <span class="dot"></span>
        <span class="dot"></span>
      </span>
    </div>
    <div class="secondary-card" v-else>
      <div
        v-for="(item, index) in data"
        :key="item.title"
        @mouseover="checkRTSEventHover(index, item, true)"
        @mouseleave="checkRTSEventHover(index, item, false)"
      >
        <Offer
          v-bind:offer="item"
          :data-offer-index="index"
          class="offer-container"
        />
      </div>
    </div>
  </div>
</template>

<script>
import Offer from '../widgets/Offer.vue';
import { mainconfig } from '../../global';
import {
  initNBAM,
  captureResponse,
  sendRTSEvent,
  sendClickStreamEvent,
} from '../../CDHIntegration';

export default {
  data() {
    return {
      ...mainconfig,
      errorloading: false,
      loading: true,
      data: [],
      RTSstate: {
        index: -1,
        id: 0,
      },
    };
  },
  mounted() {
    if (
      this.settings.pega_marketing.Host !== '' &&
      this.settings.pega_marketing.accountPage.placement !== '' &&
      this.settings.pega_marketing.accountPage.containerName !== ''
    ) {
      const self = this;
      let customerID = '';
      if (this.userId !== -1 && this.settings.users[this.userId].customerID) {
        customerID = this.settings.users[this.userId].customerID;
      }
      setTimeout(() => {
        initNBAM(
          self,
          'accountPage',
          customerID,
          self.previousPage,
          'account.html',
        );
      }, 200);
    }
  },
  updated() {
    if (
      window.IntersectionObserver &&
      mainconfig.settings.pega_marketing.useCaptureByChannel === true
    ) {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              const idx = entry.target.getAttribute('data-offer-index');
              captureResponse(this, this.data[idx], 'Impression');
              observer.unobserve(entry.target);
            }
          });
        },
        { threshold: 1 },
      );
      document.querySelectorAll('.offer-container').forEach((offer) => {
        observer.observe(offer);
      });
    }
  },
  components: {
    Offer,
  },
  methods: {
    gotoOfferPage(event) {
      mainconfig.currentPage = 'offer.html';
      if (this.$gtag) {
        this.$gtag.pageview({
          page_path: mainconfig.currentPage,
        });
      }
      sendClickStreamEvent(mainconfig, 'PageView', 'Offer', window.loadPage);
      window.loadPage = new Date();
      const stateObj = mainconfig.isAuthenticated
        ? { userId: mainconfig.userId }
        : {};
      window.history.pushState(stateObj, '', 'offer.html');
      mainconfig.offerIndex = 0;
      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 0);
      event.preventDefault();
    },
    checkRTSEventHover(index, item, state) {
      if (mainconfig.isRTSEnabled === true) {
        if (this.RTSstate.index === -1) {
          this.RTSstate.index = index;
          this.RTSstate.id = setTimeout(() => {
            this.generateRTSEvent(item);
          }, 3000);
        } else if (this.RTSstate.index === index && state === false) {
          clearTimeout(this.RTSstate.id);
          this.RTSstate.id = 0;
          this.RTSstate.index = -1;
        }
      }
    },
    generateRTSEvent(item) {
      const el = document.querySelector('.comment');
      const today = new Date();
      let month = today.getMonth() + 1;
      if (month < 10) {
        month = `0${month}`;
      }
      const date = `${today.getFullYear()}-${month}-${today.getDate()}`;
      const time = `${today.getHours()}:${today.getMinutes()}:${today.getSeconds()}`;
      el.innerHTML += `<p>${date} ${time} - Sending event - group:${item.category} - value:${item.name}</p`;
      el.scrollTop = el.scrollHeight;
      sendRTSEvent(this, item);
    },
  },
};
</script>
