# Upstream modifications

PostVoice is maintained independently from gitroomhq/postiz-app under AGPL-3.0. Preserve the upstream remote, Git history, licence, attribution, database migrations, package scopes, environment variable names, provider IDs, workflow/activity names and stored tenancy values.

## Plan 2: Signal Field rebrand

PostVoice-owned additions are libraries/helpers/src/postvoice/brand.ts, apps/frontend/src/components/postvoice/brand.tsx, apps/frontend/src/app/postvoice/tokens.scss, public/og-postvoice.png and docs/POSTVOICE_REBRAND.md. The design handoff is the source of truth.

Necessary upstream edits and merge handling:

| Area | Reason and merge guidance |
| --- | --- |
| Frontend colors.scss, global.scss and tailwind.config.cjs | Map existing semantic tokens to Field Green/Coral and remove hard-coded product purple. Retain the import of PostVoice tokens when merging. Legacy custom token definitions remain upstream-compatible. |
| Public logo.svg, logo-text.svg, postiz.svg, postiz-text.svg, postiz-fav.png, favicon.ico, favicon.png; two logo components | Replace the upstream identity while preserving asset names and component imports. Keep PostVoice artwork and the shared logo wrapper. |
| Frontend app page metadata and three root layouts | Product titles, share metadata, licensed-editor gate, and independently configured optional services. Review new layouts for the same gates when merging. |
| Frontend components, shared button styles and font configuration | Visible copy, neutral marketing content, brand colours and radii; source links in navigation and settings. Preserve upstream behavioural changes and reapply only the presentation edits. |
| All 16 translation JSON files | Brand names and fork links in values; existing keys are preserved. Rebrand new upstream strings after merging. |
| EmailService, backend auth subjects, digest workflow, newsletter subject, user account messages | Branded shared email wrapper, sender fallback and notification text. Workflow names and email transport contracts are unchanged. |
| MCP tool descriptions/server display names, Swagger title, OAuth/error text and social-provider error messages | User-visible identity only; protocol URIs, tool names, provider identifiers, CLI package names and commands are unchanged. No publishing logic was rewritten. |
| subscriptions/pricing.ts | Set featured_by_gitroom to false without renaming the entitlement. |
| Lifetime page, affiliate menu, Chatbase and Dub components, onboarding and MCP setup UI | Disable inherited commercial services/listings; optional services require operator-owned configuration. No marketplace routes are present in this checkout. |
| README.md | Add PostVoice introduction above preserved upstream content. |

These edits increase merge overlap in UI copy, translations and layouts. There is no upstream white-label configuration for all these strings or inline logos; shared tokens, assets and the PostVoice wrapper isolate the reusable portions. Review these areas during each upstream merge rather than globally renaming identifiers.

Manual deployment and verification requirements are documented in docs/POSTVOICE_REBRAND.md. Do not deploy a modified release before its corresponding source is available from the public source link. No database migration, Git remote, payment entitlement scoping, authentication protocol or publishing workflow changes are part of this rebrand.

## Neutral dashboard backgrounds

Dark app and authentication surfaces use PostVoice-owned neutral canvas/surface tokens in apps/frontend/src/app/postvoice/tokens.scss. The upstream colors.scss maps --new-bgColor, --new-bgColorInner and legacy --color-primary to these tokens; preserve those mappings during merges. The admin toolbar in components/layout/impersonate.tsx uses the existing theme surface and text utilities instead of the green action colour. These small presentation edits add limited merge overlap; dashboard components continue using existing semantic utilities. Brand green remains available for actions and identity.
