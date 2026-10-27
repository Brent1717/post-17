# PostVoice — Agent Development Instructions

## Project

PostVoice is an independent commercial SaaS fork of gitroomhq/postiz-app, licensed under AGPL-3.0.

Postiz is the upstream project. PostVoice is our independently maintained product.

## Primary Objective

Build PostVoice features while preserving the ability to regularly merge upstream Postiz updates.

## Development Rules

1. Never push changes to the original Postiz repository.
2. Preserve the upstream Git history and remote.
3. Prefer additive modules and configuration over modifying upstream core functionality.
4. Before editing an upstream file, investigate extension points and alternative approaches.
5. Keep upstream modifications minimal and isolated.
6. Document necessary upstream modifications in UPSTREAM.md.
7. Do not rewrite existing publishing integrations unless required.
8. Preserve existing database migration history.
9. Follow existing monorepo conventions.
10. Preserve AGPL-3.0 licensing and required attribution.

## PostVoice-Specific Functionality

- Lemon Squeezy subscription billing
- PostVoice branding
- AI content generation
- AI brand voice profiles
- MCP and agent integrations
- Custom onboarding and pricing

Reuse upstream functionality where practical.

## Billing

Lemon Squeezy is the target payment provider.

Prefer a provider abstraction and isolated integration over replacing Stripe logic throughout the application.

Subscription entitlements must be scoped to the correct workspace or existing tenancy entity.

## Upstream Synchronisation

When merging upstream changes:

- Never discard PostVoice customisations without review.
- Identify conflicts and breaking changes.
- Preserve production data and migration compatibility.
- Run relevant automated tests.
- Verify billing, publishing, authentication and MCP.
- Document changes requiring manual intervention.

## Before Every Implementation

Explain:

1. Which files need changing.
2. Whether they belong to upstream Postiz or PostVoice.
3. Whether the change increases future merge conflicts.
4. Whether a more isolated implementation is possible.

Prioritise maintainability over short-term implementation speed.