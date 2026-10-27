# PostVoice Plan 1: Lemon Squeezy payments (Stripe kept)

> Part 1 of 4. The others are `POSTVOICE_PLAN_2_REBRAND.md`, `POSTVOICE_PLAN_3_DEPLOYMENT.md` and `POSTVOICE_PLAN_4_LAUNCH_READINESS.md`.
> PostVoice is a rebranded, self-hosted fork of Postiz (AGPL-3.0). The launch channels are Meta (Facebook, Instagram, Threads), and it's hosted on a single VPS.

## Context
PostVoice will charge through Lemon Squeezy. As merchant of record, Lemon Squeezy handles VAT and sales tax. Stripe must keep working, so switching back is a configuration change rather than a code change. The code already has a payment-provider abstraction, so this is mostly one new provider class plus a few generic changes.

**Depends on:** nothing to start coding. Going live needs Lemon Squeezy store approval (Plan 4) and the production URL (Plan 3).
**Blocks:** Plan 4 end-to-end QA, and launch.

## What exists already (reuse it, don't rebuild)
- A provider abstraction: `libraries/nestjs-libraries/src/services/payment/payment.provider.interface.ts` (`PaymentProviderAbstract` plus the `@PaymentProvider({ provider })` decorator).
- `payment.provider.manager.ts` and `payment.service.ts` route every billing action to the provider that owns the organisation's subscription.
- `providers/revenuecat.provider.ts` is the **template to copy**. It's a small provider that calls a REST API with `fetch`, validates the webhook, and calls `SubscriptionService.createOrUpdateSubscriptionByOrg(...)` / `deleteSubscriptionByOrgId(...)`.
- A generic webhook route already exists: `POST /payment/:provider` (`apps/backend/src/api/routes/payment.controller.ts`), with the raw body available. So Lemon Squeezy uses `POST /payment/lemonsqueezy`, and no new controller is needed.
- The `Subscription` table already has `provider` (default `"stripe"`) and `identifier` columns, so Stripe and Lemon Squeezy subscriptions can coexist and **no schema migration is needed**.

## Steps
1. **Provider constant:** add `LEMONSQUEEZY_PROVIDER = 'lemonsqueezy'` in `services/payment/payment.providers.ts`.
2. **New provider:** create `services/payment/providers/lemonsqueezy.provider.ts`, extending `PaymentProviderAbstract` with `platform = 'web'`. It talks to `https://api.lemonsqueezy.com/v1` using `fetch` and `LEMONSQUEEZY_API_KEY`, following the RevenueCat style.
   - `validateWebhook`: HMAC-SHA256 of the raw body with `LEMONSQUEEZY_WEBHOOK_SECRET`, compared to the `X-Signature` header using `timingSafeEqual`.
   - `processWebhook`: handle `subscription_created / updated / cancelled / resumed / expired / payment_success`. Read `meta.custom_data.organization_id` (set at checkout) and map the variant ID to a tier and period. Upsert with `createOrUpdateSubscriptionByOrg(isTrial, orgId, LEMONSQUEEZY_PROVIDER, subscriptionId, pricing[tier].channel, tier, period, cancelAt)`, and call `deleteSubscriptionByOrgId` when a subscription expires. **No `throw` inside processing.** Wrap everything in try/catch and log, as CLAUDE.md requires for webhook code.
   - `subscribe`: `POST /checkouts` with the store and variant IDs, `checkout_data.email` and `custom` (org ID, user ID), and `product_options.redirect_url` pointing to `/billing?check=…`. Returns `{ url }`.
   - `setToCancel`: toggle using `PATCH /subscriptions/:id {cancelled}`. `cancelAllSubscriptions` uses `DELETE /subscriptions/:id` and must never throw.
   - `portalLink`: return `subscription.attributes.urls.customer_portal`.
   - `getInvoices`: `GET /subscription-invoices?filter[subscription_id]=…`, mapped to `PaymentInvoice`.
   - `getRenewalDate`: from `renews_at` / `trial_ends_at` / `status === 'on_trial'`.
   - `checkSubscription`: the poll after checkout.
   - `prorate` and plan changes: `PATCH /subscriptions/:id {variant_id}` (Lemon Squeezy prorates automatically). The preview returns the new price only.
   - Admin features such as coupons, refunds and the Chatbase refund are left as `notSupported()` in v1. Use the Lemon Squeezy dashboard for those.
3. **Variant mapping:** create a `LEMONSQUEEZY_VARIANTS` env var holding JSON of `{ "<TIER>_<MONTHLY|YEARLY>": variantId }`, plus `LEMONSQUEEZY_STORE_ID`. Tiers come from `libraries/nestjs-libraries/src/database/prisma/subscriptions/pricing.ts`. Add all `LEMONSQUEEZY_*` variables and `PAYMENT_PROVIDER` to `.env.example`, commented.
4. **Register the provider** next to `RevenueCatProvider` in `apps/backend/src/api/api.module.ts` and `libraries/nestjs-libraries/src/database/prisma/database.module.ts`.
5. **Choose the default provider generically:** `PaymentProviderManager.getDefaultProvider()` currently picks the *first registered* provider for a platform. Change it to prefer `process.env.PAYMENT_PROVIDER` when it is set, and fall back to the current behaviour otherwise, so existing installs are unaffected. Switching back to Stripe later then means setting `PAYMENT_PROVIDER=stripe`. Existing Lemon Squeezy subscribers stay on Lemon Squeezy, because `payment.service.ts` routes by `subscription.provider`.
6. **Separate "billing enabled" from Stripe.** About 20 places use `!!process.env.STRIPE_PUBLISHABLE_KEY` (or `STRIPE_SECRET_KEY`) to mean "this is the paid SaaS". Without Stripe keys, **all plan limits silently turn off**. Add one helper next to the existing `libraries/helpers/src/utils/is.general.server.side.ts` (e.g. `isBillingEnabled()` = `!!process.env.PAYMENT_PROVIDER || !!process.env.STRIPE_PUBLISHABLE_KEY`, which stays backward compatible) and replace the checks in:
   - backend: `users.controller.ts`, `media.controller.ts`, `no.auth.integrations.controller.ts`, `permissions.service.ts`, `public.auth.middleware.ts`
   - libs: `organization.service.ts`, `organization.repository.ts`, `integration.service.ts`, `clipping.service.ts`, `chat/tools/generate.image.tool.ts`
   - orchestrator: `apps/orchestrator/src/activities/post.activity.ts`. This changes only an env check inside the activity body, not the activity's parameters or the workflow, so it doesn't conflict with the Temporal rules.
   - frontend layouts: `apps/frontend/src/app/(app)|(extension)|(provider)/layout.tsx` for `billingEnabled`.

   Leave Stripe's own internal uses in `stripe.service.ts` as they are. The Plausible and Dub flags in the layout are handled in Plan 2.
7. **Frontend checkout:** pass a new `paymentProvider` value through `VariableContextComponent` (`libraries/react-shared-libraries/src/helpers/variable.context.tsx`). In `apps/frontend/src/components/billing/first.billing.component.tsx`, keep the embedded Stripe checkout when the provider is Stripe. Otherwise call `/billing/subscribe` and `window.location.href = url` (Lemon Squeezy hosted checkout). Make the "Secure payments processed by Stripe" text in `embedded.billing.tsx` say the active provider. `main.billing.component.tsx` already uses `/billing/subscribe`, `/billing/portal`, `/billing/invoices` and `/billing/renewal`, all of which go through the provider, so it only needs a check.
8. **Pricing:** decide the PostVoice prices and update `pricing.ts` (`month_price`/`year_price`, limits) so they match the Lemon Squeezy variants.
9. **Lemon Squeezy dashboard (test mode first):**
   - create one product per tier with monthly and yearly variants, and set the free trial on the variants
   - create a webhook pointing to `https://app.<domain>/api/payment/lemonsqueezy` with the subscription and payment events
   - copy the API key, store ID, signing secret and variant IDs into the env

## Verification
1. On staging in Lemon Squeezy test mode, register, pick a plan and get redirected to the Lemon Squeezy checkout. Pay with a test card and return to `/billing`. Expected: the plan is active, its limits apply, and a `Subscription` row exists with `provider = 'lemonsqueezy'` and `identifier` set to the Lemon Squeezy subscription ID.
2. Cancel. Expected: `cancelAt` is set. Resume. Expected: `cancelAt` is cleared.
3. Change plan. Expected: the tier and channel count update after the webhook.
4. Open the customer portal and billing history. Expected: invoices are listed and downloadable.
5. Let a test subscription expire, or send an `expired` event. Expected: the org drops back to the free limits.
6. Send the webhook with a bad signature. Expected: 401 and no database change.
7. Set `PAYMENT_PROVIDER=stripe` with Stripe test keys. Expected: the embedded Stripe checkout works as before. Remove `PAYMENT_PROVIDER` and the Lemon Squeezy keys. Expected: behaviour is identical to upstream.
8. Configure only Lemon Squeezy (no Stripe keys). Expected: free-org limits are still enforced on channels, posts and AI.
9. `pnpm lint` passes from the root. Run the CLAUDE.md "matches existing patterns" review agent on the new provider.
