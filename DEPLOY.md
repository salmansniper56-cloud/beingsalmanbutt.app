# Deploy CampusKart to beingsalmanbutt.app

Use **Vercel** (free) to deploy from GitHub and attach your domain.

---

## Step 1: Deploy on Vercel

1. Go to **https://vercel.com** and sign in (use **Continue with GitHub**).
2. Click **Add New…** → **Project**.
3. **Import** the repo: `salmansniper56-cloud/beingsalmanbutt.app`.
4. Vercel will detect Vite. Keep:
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
   - **Install Command:** `npm install`
5. Under **Environment Variables**, add your Firebase (and optional Stripe) vars. Use the same names as in `.env`:
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_STORAGE_BUCKET`
   - `VITE_FIREBASE_MESSAGING_SENDER_ID`
   - `VITE_FIREBASE_APP_ID`  
   (Copy values from your local `.env`.)
6. Click **Deploy**. Wait for the build to finish. You’ll get a URL like `beingsalmanbutt-app.vercel.app`.

---

## Step 2: Add custom domain beingsalmanbutt.app

1. In Vercel, open your project → **Settings** → **Domains**.
2. Enter **beingsalmanbutt.app** and click **Add**.
3. Vercel will show how to point your domain.

### Where you bought the domain (e.g. Namecheap, GoDaddy, Google Domains, Cloudflare)

**Option A – Use Vercel nameservers (simplest)**  
- In the domain’s DNS settings at your registrar, set **Nameservers** to:
  - `ns1.vercel-dns.com`
  - `ns2.vercel-dns.com`
- In Vercel, the domain will then be managed by Vercel and should verify automatically.

**Option B – Keep your current DNS**  
- At your registrar, add a record:
  - **Type:** `A`
  - **Name:** `@` (or leave blank for root)
  - **Value:** `76.76.21.21`
- For **www.beingsalmanbutt.app** (optional):
  - **Type:** `CNAME`
  - **Name:** `www`
  - **Value:** `cname.vercel-dns.com`

4. Wait a few minutes up to 48 hours for DNS to propagate. Vercel will show **Valid Configuration** when it’s correct.

---

## Step 3: Firebase allowed domains

1. In **Firebase Console** → your project → **Authentication** → **Settings** → **Authorized domains**.
2. Add:
   - `beingsalmanbutt.app`
   - `www.beingsalmanbutt.app`
   - Your Vercel URL (e.g. `beingsalmanbutt-app.vercel.app`) if you want to test before DNS is ready.

After that, your app will be live at **https://beingsalmanbutt.app**.

---

## Blank or white screen?

1. **Redeploy after adding env vars**  
   Vercel only injects Environment Variables at **build** time. After adding or changing them: **Deployments** → three dots on latest deployment → **Redeploy**.

2. **Confirm all six variables**  
   In **Settings → Environment Variables** you must have:  
   `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`.  
   No typos, and no extra spaces when pasting.

3. **Firebase Authorized domains**  
   In Firebase Console → **Authentication** → **Settings** → **Authorized domains**, add:  
   `beingsalmanbutt.app` and `www.beingsalmanbutt.app`.

4. **Browser console**  
   Open DevTools (F12) → **Console**. Any red errors there will point to the problem.

---

## Stripe (Boost ad payments)

To fix "internal" or "Boost is not configured" when boosting an ad:

1. **Stripe Dashboard** – Create two products with one-time prices (e.g. "Boost 24h", "Boost 7 days"). Copy each **Price ID** (starts with `price_`).

2. **Firebase secrets** – Run `firebase functions:secrets:set STRIPE_SECRET_KEY` and enter your Stripe secret key (starts with `sk_`).

3. **Env vars for price IDs** – Deploy with:  
   `firebase deploy --only functions --set-env-vars STRIPE_PRICE_24H=price_xxx,STRIPE_PRICE_7D=price_yyy`  
   (use your real Stripe price IDs).

4. **Webhook** – In Stripe add endpoint to your `stripeWebhook` URL; set `STRIPE_WEBHOOK_SECRET` in Firebase and redeploy.
