import { getFunctions, httpsCallable } from 'firebase/functions';
import { getApp } from 'firebase/app';

let functions = null;

function getFunctionsInstance() {
  if (!functions) {
    try {
      const app = getApp();
      functions = getFunctions(app, 'us-central1');
    } catch {
      return null;
    }
  }
  return functions;
}

export default {
  async createBoostCheckout(adId, boostOptionId) {
    const f = getFunctionsInstance();
    if (!f) return null;
    try {
      const createCheckout = httpsCallable(f, 'createBoostCheckout');
      const { data } = await createCheckout({ adId, boostOptionId });
      return data?.url ?? null;
    } catch (err) {
      console.error(err);
      throw err;
    }
  },
};
