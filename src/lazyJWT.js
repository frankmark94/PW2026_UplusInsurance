let generateJWTKeyPromise;

const getGenerateJWTKey = async () => {
  if (!generateJWTKeyPromise) {
    generateJWTKeyPromise = import('./JWTToken').then((module) => module.default);
  }
  return generateJWTKeyPromise;
};

export const generateJWTToken = async (payload, secret) => {
  const generateJWTKey = await getGenerateJWTKey();
  return generateJWTKey(payload, secret);
};
