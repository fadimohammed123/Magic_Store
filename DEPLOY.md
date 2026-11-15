# Magic: deploy checklist (Vercel + Supabase + Stripe)

Total time: about 30 minutes. Do the steps in order.

## How the pieces fit

```
Browser ──▶ Server Actions ──▶ Supabase (service role)   subscribe, mending, pending order
   │                      └──▶ Stripe Checkout session     createCheckout()
   ▼
Stripe Checkout (hosted, takes the payment)
   │  checkout.session.completed
   ▼
/api/webhooks/stripe ──▶ Supabase: order becomes PAID, stock decrements
                                          │ Realtime (admins only, via RLS)
                                          ▼
                              /admin  (Studio dashboard)
```

Prices and stock are always read from the database on the server. The browser never decides what something costs.

---

## 1. Supabase

1. Create a project at supabase.com. Note the region.
2. **SQL Editor > New query**, paste all of `supabase/schema.sql`, run it. It creates the five tables, RLS policies, the realtime publication and seeds the six launch products.
3. **Project Settings > API**: copy the Project URL, the `anon` (publishable) key and the `service_role` (secret) key.
4. **Authentication > Sign In / Providers**: turn **off** "Allow new users to sign up". Only people you add by hand should ever exist.
5. **Authentication > Users > Add user > Create new user**: your email and a long password, with "Auto Confirm User" on.
6. Back in the SQL Editor, make that user an admin:
   ```sql
   insert into public.admins (user_id)
   select id from auth.users where email = 'you@yourdomain.com';
   ```
7. Check **Database > Publications > supabase_realtime** lists `orders`, `order_items`, `mending_requests`, `subscribers`, `products`.

## 2. Stripe

1. Create or open your Stripe account. Stay in **Test mode** until step 7.
2. **Developers > API keys**: copy the Secret key (`sk_test_...`).
3. Optional but recommended: **Settings > Emails**, turn on successful-payment receipts. **Settings > Tax**, enable Stripe Tax and add `automatic_tax: { enabled: true }` to the session in `src/app/actions.ts` if you collect sales tax.
4. Do **not** create the production webhook yet. You need your live URL first (step 5).

## 3. Run it locally

```bash
cp .env.example .env.local      # fill in the Supabase keys and sk_test_ key
npm install
npm run dev
```

In a second terminal, forward Stripe events to your machine:

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

It prints a `whsec_...` secret. Put it in `.env.local` as `STRIPE_WEBHOOK_SECRET`, restart `npm run dev`.

Test: add a jersey to the bag, check out with card `4242 4242 4242 4242`, any future date, any CVC. Then open `/admin/login`, sign in, and confirm the order appears under Orders as **paid** and stock dropped by one.

## 4. Deploy to Vercel

1. Push this folder to a GitHub repo.
2. **vercel.com > Add New > Project**, import the repo. Framework is detected as Next.js. Do not change the build settings.
3. Add these Environment Variables (Production and Preview):

   | Name | Value |
   |---|---|
   | `NEXT_PUBLIC_SITE_URL` | your production URL, e.g. `https://magic.yourdomain.com` |
   | `NEXT_PUBLIC_SUPABASE_URL` | Project URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon / publishable key |
   | `SUPABASE_SERVICE_ROLE_KEY` | service_role / secret key |
   | `STRIPE_SECRET_KEY` | `sk_test_...` for now |
   | `STRIPE_WEBHOOK_SECRET` | fill in after step 5 |

4. Deploy. Under **Settings > Domains**, add your custom domain, then set `NEXT_PUBLIC_SITE_URL` to it and redeploy.
5. Optional: **Settings > Functions**, set the region closest to your Supabase region.

## 5. Connect the production webhook

1. Stripe **Developers > Webhooks > Add endpoint**.
2. Endpoint URL: `https://YOUR-DOMAIN/api/webhooks/stripe`
3. Select these events:
   - `checkout.session.completed`
   - `checkout.session.async_payment_succeeded`
   - `checkout.session.async_payment_failed`
   - `checkout.session.expired`
4. Copy the endpoint's **Signing secret** (`whsec_...`) into Vercel as `STRIPE_WEBHOOK_SECRET`, then **redeploy**.

## 6. Verify production (still in test mode)

- [ ] Home page loads, loader plays, products appear.
- [ ] Subscribe form: the email shows up in Studio under First Thread.
- [ ] Mending form: the request shows up in Studio under Mending, live, without a refresh.
- [ ] Test purchase with `4242 4242 4242 4242`: you land on `/checkout/success`, the order shows as **paid**, stock decrements, the bag empties.
- [ ] Stripe > Webhooks > your endpoint shows `200` responses.
- [ ] `/admin` while signed out redirects to `/admin/login`.
- [ ] Signing in with a non-admin account is refused.

## 7. Go live

1. In Stripe, switch to **Live mode** and complete account activation.
2. Copy the **live** secret key (`sk_live_...`) and create the webhook endpoint again in live mode (same URL, same four events) to get a **live** `whsec_...`.
3. Replace `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` in Vercel with the live values and redeploy.
4. Place one real low-value order and refund it from Stripe.

---

## Things to know

- **Stock is tracked per product**, not per size. Per-size stock means adding a `product_variants` table.
- **Shipping** is a flat $15, free over $500. Change `FLAT_SHIPPING_CENTS`, `FREE_SHIPPING_CENTS` and `SHIP_TO` in `src/lib/config.ts`.
- **Refunds** are issued in Stripe. "Mark refunded" in Studio only updates the order's status here.
- **Abandoned checkouts**: a `pending` order is created when Checkout starts and becomes `cancelled` when the Stripe session expires (31 minutes). Pending orders are hidden by default in Studio.
- **Spam protection** on the public forms is a honeypot plus validation. If you get abused, put Vercel's WAF or Upstash rate limiting in front of the server actions.
- **Photography**: paste an image URL (Supabase Storage works well) into a product's "Photo URL" field in Studio and it replaces the drawn art.
- **Secrets**: `SUPABASE_SERVICE_ROLE_KEY` bypasses RLS. It lives only in server code (`src/lib/supabase/service.ts` imports `server-only`). Never prefix it with `NEXT_PUBLIC_`.

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| Webhook returns 400 | Wrong `STRIPE_WEBHOOK_SECRET` (test vs live, or local vs dashboard). Redeploy after changing it. |
| Order stays `pending` after payment | Webhook not reaching the site, or `checkout.session.completed` not selected. Check Stripe > Webhooks > recent deliveries. |
| Studio says "Connecting" forever | Tables missing from the `supabase_realtime` publication, or you are signed out. |
| Sign-in says "doesn't have studio access" | The `insert into public.admins` step was skipped or used a different email. |
| Store shows no products | Schema seed not run, or all products have `active = false`. |
| Checkout redirects to the wrong domain | `NEXT_PUBLIC_SITE_URL` is wrong. It is baked in at build time, so redeploy after changing it. |
