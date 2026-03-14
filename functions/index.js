import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { onRequest } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { initializeApp } from 'firebase-admin/app';
import Stripe from 'stripe';

initializeApp();

const db = getFirestore();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', { apiVersion: '2023-10-16' });

const BOOST_OPTIONS = {
  '24h': { priceId: process.env.STRIPE_PRICE_24H || 'price_24h', durationHours: 24 },
  '7d': { priceId: process.env.STRIPE_PRICE_7D || 'price_7d', durationHours: 168 },
};

export const createBoostCheckout = onCall({ region: 'us-central1' }, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Must be logged in');
  const { adId, boostOptionId } = request.data || {};
  if (!adId || !boostOptionId) throw new HttpsError('invalid-argument', 'adId and boostOptionId required');

  const opt = BOOST_OPTIONS[boostOptionId];
  if (!opt?.priceId) throw new HttpsError('failed-precondition', 'Stripe not configured');

  const adRef = db.collection('ads').doc(adId);
  const adSnap = await adRef.get();
  if (!adSnap.exists) throw new HttpsError('not-found', 'Ad not found');
  if (adSnap.data()?.createdBy !== request.auth.uid) throw new HttpsError('permission-denied', 'Not your ad');

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    line_items: [{ price: opt.priceId, quantity: 1 }],
    success_url: `${request.rawRequest.headers.origin || ''}/ad/${adId}?boost=success`,
    cancel_url: `${request.rawRequest.headers.origin || ''}/ad/${adId}/boost?cancel=1`,
    metadata: { adId, boostOptionId, uid: request.auth.uid },
  });

  return { url: session.url };
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
    let event;
    try {
      event = stripe.webhooks.constructEvent(rawBody, sig, endpointSecret);
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
    const opt = BOOST_OPTIONS[boostOptionId];
    if (!opt) {
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
