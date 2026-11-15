# Magic

Luxury jerseys and artifacts. Next.js 15 (App Router), Supabase, Stripe, GSAP, Tailwind.

**Start here: [DEPLOY.md](./DEPLOY.md)**

```
supabase/schema.sql              tables, RLS, realtime, seed products
src/app/page.tsx                 storefront (reads products from Supabase)
src/app/actions.ts               server actions: subscribe, submitMending, createCheckout
src/app/api/webhooks/stripe/     verifies Stripe events, marks orders paid, decrements stock
src/app/checkout/success/        post-payment page
src/app/admin/                   Studio: login, dashboard, admin server actions
src/middleware.ts                session refresh + /admin gate
src/lib/                         config, Supabase clients (public, cookie, service), Stripe, auth
src/components/                  Storefront, Hero, WearIn, ProductGrid, CartDrawer, Forms, ...
src/components/admin/            LoginForm, AdminStudio (live orders, products, mending, subscribers)
```

Commands: `npm run dev`, `npm run build`, `npm run typecheck`.
