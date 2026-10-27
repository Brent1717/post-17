# PostVoice Plan 3: Production deployment (single VPS)

> Part 3 of 4. The others are `POSTVOICE_PLAN_1_PAYMENTS.md`, `POSTVOICE_PLAN_2_REBRAND.md` and `POSTVOICE_PLAN_4_LAUNCH_READINESS.md`.
> PostVoice is a rebranded, self-hosted fork of Postiz (AGPL-3.0). The launch channels are Meta (Facebook, Instagram, Threads), and it's hosted on a single VPS.

## Context
PostVoice runs on one VPS using Docker Compose: the app image, Postgres, Redis and Temporal. HTTPS is automatic, backups run nightly, and there's basic monitoring. The repo already builds an all-in-one image: in `Dockerfile.dev`, nginx on port 5000 routes `/api` to the backend on 3000 and everything else to the frontend on 4200, and `pnpm pm2-run` runs `prisma-db-push` on start.

**Depends on:** a domain and DNS access.
**Blocks:** Plan 4, because Meta and Lemon Squeezy both need live URLs. Stage A (staging) should be up in week 1.

## Steps

### Stage A: server and staging (week 1)
1. **Server:** Hetzner CPX41 or CCX23 class (8 vCPU, 16 GB RAM; Temporal's Elasticsearch alone needs about 1–2 GB) running Ubuntu 24.04 with Docker. Use the `ufw` firewall (allow only 22, 80, 443), SSH-key login only, and unattended security upgrades.
2. **Image:** fork `.github/workflows/build-containers.yml` so it pushes to `ghcr.io/brent1717/postvoice` instead of `ghcr.io/gitroomhq/postiz-app`, triggered by a version tag.
3. **Compose:** base `docker-compose.prod.yaml` on `docker-compose.yaml`, with these changes:
   - the image becomes your GHCR image
   - all secrets move to an `.env` file on the server
   - Postgres, Redis, Temporal and Temporal UI are **not** exposed publicly
   - a **Caddy** container serves `app.<domain>` (and `staging.<domain>`) with automatic HTTPS, proxying to `postiz:5000`
   - Temporal UI is reached only through an SSH tunnel
   - Spotlight is removed
4. **DNS:** `<domain>` points to the marketing site, and `app.<domain>` and `staging.<domain>` point to the VPS. Add SPF, DKIM and DMARC records for email.

### Stage B: production config (week 3)
5. **Production env:**
   - `MAIN_URL` and `FRONTEND_URL` set to `https://app.<domain>`, and `NEXT_PUBLIC_BACKEND_URL` set to `https://app.<domain>/api`
   - a strong `JWT_SECRET` and database password, with `NOT_SECURED` left unset
   - `PAYMENT_PROVIDER=lemonsqueezy` and the `LEMONSQUEEZY_*` variables (from Plan 1)
   - `STORAGE_PROVIDER=cloudflare` with an R2 bucket and a public URL, because Meta has to fetch media from a public HTTPS URL
   - `EMAIL_PROVIDER=resend` with a verified domain and `EMAIL_FROM_NAME/ADDRESS`, needed for account activation and password resets
   - `NEXT_PUBLIC_SENTRY_DSN`, `OPENAI_API_KEY` (for the AI features, which have a cost per use)
   - `FACEBOOK_APP_ID/SECRET`, `THREADS_APP_ID/SECRET`, with every other channel's keys left empty so those channels stay hidden
   - `DISABLE_REGISTRATION=false`
6. **Backups:** a nightly `pg_dump` to R2 or Backblaze with 14-day retention, run by a cron job on the host.
7. **Monitoring:** an uptime monitor (BetterStack or UptimeRobot) on `/` and `/api`, Sentry alerts, Docker log rotation, and disk-usage alerts.
8. **Runbook** (`DEPLOY.md`): deploy a new tag, roll back to the previous tag, restore a backup, rotate secrets.
9. **Upstream updates:** periodically run `git fetch upstream`, merge into `develop`, test on staging, then tag and deploy.

## Verification
1. Push a tag. Expected: the image builds and appears in GHCR.
2. On the VPS, run `docker compose -f docker-compose.prod.yaml up -d`. Expected: `https://app.<domain>` loads with a valid certificate, and `/api` responds.
3. From outside the server, scan ports 5432, 6379, 7233 and 8080. Expected: all closed.
4. Register an account. Expected: the activation email arrives through Resend.
5. Upload media. Expected: it's served from the R2 public URL.
6. Restore last night's backup into a scratch database. Expected: row counts match.
7. Stop the app container. Expected: the uptime monitor alerts within a few minutes.
8. Deploy the previous tag using the runbook. Expected: rollback works.
