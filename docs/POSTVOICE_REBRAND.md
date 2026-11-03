# PostVoice rebrand

The approved identity is direction 2c, Signal Field, from design_handoff_postvoice_brand. The app imports a PostVoice-owned copy of its tokens from apps/frontend/src/app/postvoice/tokens.scss. The shared identity and public source URL live in libraries/helpers/src/postvoice/brand.ts. The website is https://postvoice.co.

## Assets and themes

Public logo.svg and logo-text.svg are the light variants; postiz.svg and postiz-text.svg are the dark variants. These filenames remain compatible with upstream references. Logo text is outlined from the bundled Plus Jakarta Sans at weight 700; no installed system font is needed to render the SVGs. The primary app icon supplies postiz-fav.png; the simplified small icon supplies favicon.png and favicon.ico. og-postvoice.png is a 1200 by 630 share image. The handoff originals remain untouched.

Both themes map existing semantic tokens to the new palette. Deprecated custom colour tokens remain as upstream compatibility definitions; purple usages in the product now use semantic brand tokens. Social network branding and Facebook's selectable post backgrounds retain their own colours. Chart.js uses equivalent RGB values because canvas cannot resolve CSS custom properties. The existing local Plus Jakarta Sans font is used at weights 400 through 800.

Dark dashboards and authentication screens use neutral charcoal backgrounds (#141414 canvas, #1E1E1E surfaces), separate from the green brand charcoal token. Navigation, headers, form surfaces and the admin toolbar inherit these semantic backgrounds; green remains an action/brand colour. Light theme surfaces retain their existing palette.

## Optional services

All these settings belong in deployment configuration. No live .env values were changed. Public NEXT_PUBLIC values require a frontend rebuild.

| Setting | Behaviour |
| --- | --- |
| PLAUSIBLE_ENABLED=true and PLAUSIBLE_DOMAIN | Explicitly enable Plausible for your domain; independent of billing. |
| DATAFAST_WEBSITE_ID and DATAFAST_DOMAIN | Use your own DataFast website; domain defaults to FRONTEND_URL's hostname. Leave the ID unset to disable. |
| NEXT_PUBLIC_DUB_ENABLED=true and NEXT_PUBLIC_DUB_REFER_DOMAIN | Enable Dub using your own referral domain. |
| CHATBASE_ENABLED=true, CHATBASE_TOKEN and NEXT_PUBLIC_CHATBASE_BOT_ID | Enable your own Chatbase bot and SSO secret. |
| NEXT_PUBLIC_AFFILIATE_URL | Show your affiliate link. Unset hides it. |
| POLOTNO_COMMERCIAL_LICENSE=true and NEXT_PUBLIC_POLOTNO | Expose the image editor only after obtaining a valid commercial SaaS licence. Otherwise both editor buttons are hidden and editor modals cannot open. |
| POSTVOICE_LIFETIME_ENABLED=true | Opt in to the legacy lifetime deal page. Default is a 404. |
| EMAIL_FROM_ADDRESS | Verified sender address for the configured SMTP or Resend provider. |
| EMAIL_FROM_NAME | Custom sender name; missing names and legacy Postiz/Gitroom names use PostVoice. |

Upstream directory connectors are hidden because their listings belong to Postiz. Direct MCP configuration, existing CLI package names and commands, OAuth and provider identifiers are preserved. The featured_by_gitroom entitlement is disabled for every pricing tier. This checkout has no marketplace page or route; unused agency database services are retained for merge compatibility. Upstream testimonials, audience counts and the marketing video are removed from the active product screens.

Legal links now point to https://postvoice.co/terms and https://postvoice.co/privacy. Ensure those pages contain your published policies. Documentation links point to this fork's README until separate product documentation is available.

## Release checks

1. Keep LICENSE and upstream copyright notices; keep the fork public and publish the exact deployed source revision.
2. Use your verified sender address and trigger activation and password reset in staging. Confirm subject, wrapper and sender.
3. Check login, registration, calendar, composer, billing, settings, analytics and previews in light and dark mode. Confirm tab titles, both logo variants, favicon, Source code and legal links.
4. In the network panel confirm there are no automatic requests to postiz.com or inherited company services. Optional services must use your own accounts. Existing upstream CLI commands and external browser-extension store identifiers intentionally retain their technical names.
5. Run the frontend TypeScript check and a production build. Audit the generated .next output, distinguishing preserved identifiers and unused upstream compatibility content from rendered branding.

Root pnpm lint currently has no script; invoking ESLint directly also fails in the existing root FlatCompat configuration with a circular configuration error. This rebrand does not change that unrelated tooling.

## Implementation validation (2026-11-02)

- Frontend TypeScript check passed with no emit. Backend type checking reports existing implicit-any errors in seven untouched files (wallet.provider.ts, agent.graph.insert.service.ts, agent.graph.service.ts, autopost.service.ts, media.repository.ts, emails/empty.provider.ts and short-linking/providers/empty.ts).
- Theme Sass compiled; both theme primary mappings and Tailwind opacity variants were checked.
- All 16 locale JSON files parsed, contained no old product name in values, and retained their existing keys.
- Four logo SVGs contain outlined paths and no live text; the share image was visually inspected.
- The configured source repository was verified public.
- git diff --check passed.
- The production build could not complete: the sandbox initially blocked compiler subprocesses; a run outside the sandbox reached compilation and exhausted Node's heap. Built-output and interactive browser checks remain release checks.
- Root lint is unavailable as noted above. The new brand component was also checked with the frontend ESLint config: no code errors, two existing-style img-element warnings.

Live email delivery, external-account configuration and staging click-through were not exercised in this checkout.
