import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { onRequest } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { initializeApp } from 'firebase-admin/app';
import Stripe from 'stripe';
import OpenAI from 'openai';

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

const ALLOWED_AI_MODELS = new Set([
  'deepseek-ai/deepseek-v3.1',
  'meta/llama-3.1-70b-instruct',
]);

function sanitizeMessages(messages = []) {
  if (!Array.isArray(messages)) return [];
  return messages
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .map((m) => ({ role: m.role, content: m.content.trim().slice(0, 4000) }))
    .filter((m) => m.content.length > 0)
    .slice(-16);
}

export const askCampusAI = onCall(
  { region: 'us-central1', secrets: ['NVIDIA_API_KEY'] },
  async (request) => {
    const input = (request.data && typeof request.data === 'object') ? request.data : {};
    const model = ALLOWED_AI_MODELS.has(input.model) ? input.model : 'deepseek-ai/deepseek-v3.1';
    const messages = sanitizeMessages(input.messages);

    if (!messages.length) {
      throw new HttpsError('invalid-argument', 'At least one valid message is required.');
    }

    const apiKey = process.env.NVIDIA_API_KEY || '';
    if (!apiKey) {
      throw new HttpsError('failed-precondition', 'NVIDIA_API_KEY is not configured in Firebase Functions secrets.');
    }

    const client = new OpenAI({
      baseURL: process.env.NVIDIA_BASE_URL || 'https://integrate.api.nvidia.com/v1',
      apiKey,
    });

    try {
      const completion = await client.chat.completions.create({
        model,
        temperature: 0.2,
        top_p: 0.7,
        max_tokens: 1024,
        messages: [
          {
            role: 'system',
            content: 'You are CampusKart AI, a concise and friendly study assistant for Pakistani university students. Keep answers practical and clear.',
          },
          ...messages,
        ],
      });

      const reply = completion.choices?.[0]?.message?.content?.trim();
      if (!reply) {
        throw new Error('No response received from NVIDIA model.');
      }

      return { reply, model };
    } catch (err) {
      console.error('askCampusAI error:', err?.message || err);
      throw new HttpsError('internal', err?.message || 'AI request failed');
    }
  }
);

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
