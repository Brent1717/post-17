# PostVoice Plan 4: Launch readiness (Meta, legal, store approval, marketing)

> Part 4 of 4. The others are `POSTVOICE_PLAN_1_PAYMENTS.md`, `POSTVOICE_PLAN_2_REBRAND.md` and `POSTVOICE_PLAN_3_DEPLOYMENT.md`.
> PostVoice is a rebranded, self-hosted fork of Postiz (AGPL-3.0). The launch channels are Meta (Facebook, Instagram, Threads), and it's hosted on a single VPS.

## Context
These are the non-code and mostly external steps that block a paid launch. Meta App Review is the longest lead time (1–4 weeks), so it sets the launch date. Lemon Squeezy will only approve the store, and so enable payouts, once there's a live site with pricing and policies.

**Depends on:** Plan 3 Stage A (live staging URL). Plan 2 should be done before the Meta screencasts.
**Blocks:** the public launch.

## Steps
1. **Legal pages** on the marketing site: Terms of Service, Privacy Policy, Refund Policy, Cookie notice, and a **data-deletion instructions** page (Meta requires one). Link them from the app footer.
2. **Meta Business verification:** verify the business in Meta Business Manager. This needs legal business documents and a matching domain.
3. **Meta app** (one app with Facebook Login for Business, the Instagram Graph API and the Threads API):
   - Redirect URIs: `https://app.<domain>/integrations/social/facebook`, `/instagram` and `/threads`.
   - Request exactly the scopes the code uses:
     - Facebook: `pages_show_list, business_management, pages_manage_posts, pages_manage_engagement, pages_read_engagement, read_insights`
     - Instagram: `instagram_basic, instagram_content_publish, instagram_manage_comments, instagram_manage_insights` (plus `pages_show_list, pages_read_engagement, business_management`)
     - Threads: `threads_basic, threads_content_publish, threads_manage_replies, threads_manage_insights`
   - These come from `libraries/nestjs-libraries/src/integrations/social/facebook.provider.ts`, `instagram.provider.ts` and `threads.provider.ts`.
   - Set the privacy policy URL, the data-deletion URL, the app icon and the category.
   - Add a test user, then record **one screencast per permission** on the PostVoice-branded staging site: connect the account, create a post, publish it, view analytics.
   - Submit for App Review. Until it's approved, only test users can connect accounts.
4. **Lemon Squeezy store approval:** submit once the marketing site shows the product, pricing, policies and a support contact. After approval, switch from test mode to live and update the env (Plan 1, step 9).
5. **Scope v1 down:** hide or disable what isn't launching:
   - every non-Meta channel (leave its env keys empty)
   - the Chrome extension and the mobile/RevenueCat flow
   - the public API and MCP, unless you document them
   - the AI video and clipping features (they cost money per use), or put limits on them in `pricing.ts`
6. **Support:** a support email, `NEXT_PUBLIC_DISCORD_SUPPORT` or a help widget, a status page, and a basic FAQ (the billing FAQ already exists in `apps/frontend/src/components/billing/faq.component.tsx`).
7. **Marketing site:** landing page, pricing (matching the Lemon Squeezy variants), features, FAQ, blog, SEO meta tags, OG images, analytics (your own Plausible or DataFast), and a waitlist or beta signup form.
8. **Launch marketing:** a beta list (friends, communities) in week 4 for a soft launch, then a public launch on Product Hunt, Indie Hackers, relevant subreddits and your own social channels (scheduled with PostVoice itself).

## Timeline
| Week | Work |
|---|---|
| 1 | Domain and DNS, staging deploy (Plan 3 Stage A), legal pages live, Meta Business verification submitted, Lemon Squeezy store created, Polotno licence decision |
| 2 | Plans 1 and 2 coded and on staging. Meta App Review submitted with screencasts on the branded staging site. |
| 3 | Plan 3 Stage B (production, backups, monitoring), marketing site, end-to-end QA in Lemon Squeezy test mode |
| 4 | Lemon Squeezy live mode, Meta approval received, beta soft launch, then public launch |

## Verification (pre-launch go/no-go checklist)
1. Expected: the legal pages and the data-deletion page are publicly reachable, and linked from the site and the app.
2. Expected: Meta App Review shows every requested permission as approved, and a **non-test** user can connect an FB Page, an IG business account and a Threads profile.
3. Publish a text post and an image post to each Meta channel through a scheduled post. Expected: they're published on time, which proves the orchestrator and Temporal work.
4. Expected: the Lemon Squeezy store shows as approved and in live mode. Make one real low-value purchase and refund it.
5. Expected: Plan 1, Plan 2 and Plan 3 verification all pass on production.
6. Expected: only Meta channels appear in "Add channel", and the disabled features aren't reachable.
7. Expected: the support email is monitored and the status page is live.
