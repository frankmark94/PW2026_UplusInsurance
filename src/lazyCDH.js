let cdhModulePromise;

const getCDHModule = async () => {
  if (!cdhModulePromise) {
    cdhModulePromise = import('./CDHIntegration');
  }
  return cdhModulePromise;
};

export const sendClickStreamEventLazy = (config, eventType, pageType, pageTime) => {
  void getCDHModule()
    .then((module) => {
      module.sendClickStreamEvent(config, eventType, pageType, pageTime);
    })
    .catch((error) => {
      console.error('[cdh] Failed to send click stream event.', error);
    });
};
