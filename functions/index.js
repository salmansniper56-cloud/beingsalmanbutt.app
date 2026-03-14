import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { onRequest } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { initializeApp } from 'firebase-admin/app';
import Stripe from 'stripe';

initializeApp();

const db = getFirestore();

function getBoostOptions() {
  const price24h = process.env.STRIPE_PRICE_24H || '';
  const price7d = process.env.STRIPE_PRICE_7D || '';
  return {
    '24h': { priceId: price24h, durationHours: 24 },
    '7d': { priceId: price7d, durationHours: 168 },
  };
}

function isValidPriceId(id) {
  return typeof id === 'string' && id.startsWith('price_') && id.length > 10;
}

export const createBoostCheckout = onCall({ region: 'us-central1' }, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Must be logged in');
  const { adId, boostOptionId } = request.data || {};
  if (!adId || !boostOptionId) throw new HttpsError('invalid-argument', 'adId and boostOptionId required');

  const BOOST_OPTIONS = getBoostOptions();
  const opt = BOOST_OPTIONS[boostOptionId];
  if (!opt || !isValidPriceId(opt.priceId)) {
    throw new HttpsError('failed-precondition', 'Boost is not configured. Add STRIPE_PRICE_24H and STRIPE_PRICE_7D in Firebase (e.g. firebase functions:config:set stripe.price_24h "price_xxx").');
  }

  const adRef = db.collection('ads').doc(adId);
  const adSnap = await adRef.get();
  if (!adSnap.exists) throw new HttpsError('not-found', 'Ad not found');
  if (adSnap.data()?.createdBy !== request.auth.uid) throw new HttpsError('permission-denied', 'Not your ad');

  const secretKey = process.env.STRIPE_SECRET_KEY || '';
  if (!secretKey || !secretKey.startsWith('sk_')) {
    throw new HttpsError('failed-precondition', 'Payment is not configured. Set STRIPE_SECRET_KEY in Firebase secrets.');
  }

  const stripeClient = new Stripe(secretKey, { apiVersion: '2023-10-16' });
  const origin = (request.rawRequest && request.rawRequest.headers && request.rawRequest.headers.origin) ? request.rawRequest.headers.origin : '';

  try {
    const session = await stripeClient.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [{ price: opt.priceId, quantity: 1 }],
      success_url: `${origin}/ad/${adId}?boost=success`,
      cancel_url: `${origin}/ad/${adId}/boost?cancel=1`,
      metadata: { adId, boostOptionId, uid: request.auth.uid },
    });
    return { url: session.url };
  } catch (err) {
    console.error('Stripe checkout error:', err.message || err);
    throw new HttpsError('internal', err.message || 'Payment setup failed. Please try again or contact support.');
  }
});

export const stripeWebhook = onRequest(
  { region: 'us-central1' },
  async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!endpointSecret || !sig) {
      res.status(400).send('Webhook secret missing');
      return;
    }
    const rawBody = req.rawBody ?? (typeof req.body === 'string' ? req.body : Buffer.from(JSON.stringify(req.body || {})));
    const stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY || '', { apiVersion: '2023-10-16' });
    let event;
    try {
      event = stripeClient.webhooks.constructEvent(rawBody, sig, endpointSecret);
    } catch (err) {
      res.status(400).send(`Webhook Error: ${err.message}`);
      return;
    }
    if (event.type !== 'checkout.session.completed') {
      res.json({ received: true });
      return;
    }
    const session = event.data.object;
    const { adId, boostOptionId } = session.metadata || {};
    if (!adId || !boostOptionId) {
      res.json({ received: true });
      return;
    }
    const BOOST_OPTIONS = getBoostOptions();
    const opt = BOOST_OPTIONS[boostOptionId];
    if (!opt || !opt.durationHours) {
      res.json({ received: true });
      return;
    }
    const expiresAt = new Date(Date.now() + opt.durationHours * 60 * 60 * 1000);
    await db.collection('ads').doc(adId).update({
      boostedAt: FieldValue.serverTimestamp(),
      boostExpiresAt: expiresAt,
      updatedAt: FieldValue.serverTimestamp(),
    });
    res.json({ received: true });
  }
);
