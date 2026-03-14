# CampusKart

Student marketplace to sell books and electronics, chat with buyers, and boost ads with Stripe.

## Stack

- **Frontend:** React 18 + Vite + React Router
- **Backend:** Firebase (Auth, Firestore, Storage) + Cloud Functions (Stripe)

## Setup

### 1. Environment

Copy `.env.example` to `.env` and set your Firebase config (and optional Stripe publishable key):

```bash
cp .env.example .env
```

The repo includes a working `.env` for the existing Firebase project. Replace with your own for production.

### 2. Install and run

```bash
npm install
npm run dev
```

Open http://localhost:5173

### 3. Firebase

- Enable **Google** sign-in and **Firebase Storage** in [Firebase Console](https://console.firebase.google.com).
- Deploy Firestore rules and indexes (optional but recommended):

```bash
firebase deploy --only firestore
```

### 4. Stripe (Boost ads)

1. Create a Stripe account and products/prices (e.g. "Boost 24h", "Boost 7 days").
2. Install Cloud Functions deps and set secrets:

```bash
cd functions
npm install
firebase functions:secrets:set STRIPE_SECRET_KEY
firebase functions:secrets:set STRIPE_WEBHOOK_SECRET
firebase functions:config:set stripe.price_24h="price_xxx" stripe.price_7d="price_yyy"
```

3. In `functions/index.js`, set `BOOST_OPTIONS` to use your Stripe price IDs (or env vars).
4. Deploy functions:

```bash
firebase deploy --only functions
```

5. In Stripe Dashboard, add a webhook pointing to your `stripeWebhook` URL (e.g. `https://us-central1-<project>.cloudfunctions.net/stripeWebhook`).

## Scripts

- `npm run dev` – start dev server
- `npm run build` – production build
- `npm run preview` – preview production build

## Features

- **Auth:** Email/password + Google Sign-In (Firebase Auth)
- **Profiles:** Display name, photo, bio; follow/unfollow; like ads
- **Ads:** Create ads (books/electronics) with images and full description; view feed and ad detail
- **Feed ranking:** Boosted ads surface first; then by recency and likes
- **Chat:** Real-time messages between buyer and seller (Firestore)
- **Boost:** Pay with Stripe to boost an ad for 24h or 7 days (Cloud Functions + webhook)
