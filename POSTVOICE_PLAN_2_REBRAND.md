# PostVoice Plan 2: Rebrand to PostVoice

> Part 2 of 4. The others are `POSTVOICE_PLAN_1_PAYMENTS.md`, `POSTVOICE_PLAN_3_DEPLOYMENT.md` and `POSTVOICE_PLAN_4_LAUNCH_READINESS.md`.
> PostVoice is a rebranded, self-hosted fork of Postiz (AGPL-3.0). The launch channels are Meta (Facebook, Instagram, Threads), and it's hosted on a single VPS.

## Context
Nothing users see should say Postiz. That's needed for trademark reasons and for the product's identity. The PostVoice logo and colours are ready. The AGPL licence also requires offering users the modified source code.

**Depends on:** the logo files and colour hex values.
**Blocks:** Plan 4's Meta App Review screencasts and Lemon Squeezy store review, since both reviewers see the product.

## Ground rule
Change **only what users see**. Do **not** rename package scopes (`@gitroom/*`), env var names (`POSTIZ_GENERIC_OAUTH`, …), database values, Temporal workflow or activity names, or provider identifiers. Doing so breaks things and makes upstream merges painful.

## Steps
1. **Colours:** put the brand colours into the tokens in `apps/frontend/src/app/colors.scss` (`--new-btn-primary` and the related purple tokens, in both the light and dark blocks) and `apps/frontend/tailwind.config.cjs`. Replace the hard-coded `#612bd3` purple in the files that use it directly with the token: `billing/main.billing.component.tsx`, `billing/billing.history.component.tsx`, `launches/statistics.tsx`, `layout/loading.tsx`, `notifications/notification.component.tsx`, `platform-analytics/render.analytics.tsx` and `libraries/nestjs-libraries/src/chat/ui/clipping.widget.ts`. Don't use the deprecated `--color-custom*` tokens.
2. **Logo and icons:** replace `apps/frontend/public/logo.svg`, `logo-text.svg`, `postiz.svg`, `postiz-text.svg`, `postiz-fav.png`, `favicon.ico` and `favicon.png`, keeping the same filenames so the roughly 12 code references still work. Add OG and social-share images.
3. **Name in the UI:** "Postiz" appears in about 70 source files and 16 translation files.
   - Page titles use the pattern `` `${isGeneralServerSide() ? 'Postiz' : 'Gitroom'} …` `` in `apps/frontend/src/app/**/page.tsx`. Change `'Postiz'` to `'PostVoice'`.
   - UI copy in `apps/frontend/src/components/**`.
   - Translations in `libraries/react-shared-libraries/src/translation`.
4. **Emails:** subjects, bodies and the sender name in the templates sent through `libraries/nestjs-libraries/src/emails/*`.
5. **Postiz-company integrations** in `apps/frontend/src/app/(app)/layout.tsx`. Point these at your own accounts or turn them off:
   - the DataFast script hard-codes `data-domain="postiz.com"`; make it use your domain
   - Plausible and Dub are switched on by the Stripe key; give them their own env flags
   - Chatbase, the "featured by gitroom" pricing flag in `pricing.ts`, the lifetime-deal page and the marketplace
6. **Polotno** (the image editor, `NEXT_PUBLIC_POLOTNO`) needs a **paid commercial licence key** for SaaS use. Buy one, or hide the editor.
7. **Licence (AGPL-3.0):** keep `LICENSE` and the copyright notices. Add a "Source code" link in the app footer or settings that points to the public fork, and keep that repo public, or publish each deployed version.
8. **README:** a short PostVoice section at the top of `README.md`, with the upstream attribution kept.

## Verification
1. Grep the source and the built `.next` output for `Postiz`, `postiz.svg` and `postiz.com`. Expected: only non-visible identifiers remain (env names, package scopes, provider IDs).
2. Click through login, register, the calendar, the post editor, billing, settings and analytics in both light and dark mode. Expected: the PostVoice logo and colours throughout, no leftover purple, and correct browser tab titles and favicon.
3. Trigger the activation and password-reset emails. Expected: they're PostVoice-branded and come from the PostVoice sender.
4. Expected: the "Source code" link opens the public repo.
5. Expected: nothing loads from postiz.com in the browser network tab.
6. `pnpm lint` passes from the root.
