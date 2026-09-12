# HungryOwl

A mobile-first late-night food discovery app for Bangalore. Built with Next.js, TypeScript, Better Auth, Drizzle and Neon PostgreSQL; designed for a self-hosted Node server.

## Implemented

- Nearby stalls with open-now or next-opening labels, current GPS permission, a 1–30 km radius editable after sign-in, dietary filters, text search and sorting.
- Overnight schedules, temporary closures, straight-line distance, star ratings, new badges and owner-confirmation labels.
- Google-only sign-in, automatic account creation and sign-out.
- GPS-only stall submissions with exactly two processed photos, owner contact, menu and optional prices.
- Admin approval, rejection reasons, phone-verified owner assignment, closure reports and audit records.
- Immediate editing for “My stall” submitters, read-only access for “Someone else’s stall” submissions, complete admin review details, and a swipeable photo carousel with arrow and dot controls.

## Current status

The local preview uses clearly labeled illustrative stalls. Sample mode never writes real submissions or ratings and cannot authenticate. Your Neon project `nytfood` has the app migrations applied on its default production branch and a separate `codex-hungryowl-development` branch for disposable tests. Existing managed Neon Auth tables were not modified.

**Public launch still needs:** Google OAuth setup for the deployment domain, your server/domain/TLS configuration, a verified admin account, finalized operator privacy contact/retention policy, and a real browser/device acceptance pass. A real Google sign-in must be verified on the deployment domain. No genuine food stalls have been invented or seeded into the database.

## Local setup

Use Node.js 24 and npm. Dependencies are pinned and the lockfile is committed with the source.

```sh
npm ci
cp .env.example .env.local
npm run dev
```

The existing task workspace already contains a private `.env.local` connected to the development branch. **Do not overwrite it** if continuing in that workspace. Open the local URL printed by Next.js (normally http://127.0.0.1:3000). The app has no offline service worker because open/closed data needs to remain fresh; supported browsers can add it to the home screen using its web manifest.

Set `DEMO_MODE=true` for the sample preview. To use real data, set `DEMO_MODE=false` and configure the database, auth secret, Google OAuth settings. Missing services show disabled sign-in options rather than simulated success. Never expose the sample as if it were a live food directory.

## Environment

See `.env.example`. Keep credentials in private `.env` or `.env.local` files. Next.js gives `.env.local` precedence over `.env`; restart the server after changing auth credentials. Google client secrets must never use a `NEXT_PUBLIC_` prefix.

| Variable                                   | Purpose                                                                          |
| ------------------------------------------ | -------------------------------------------------------------------------------- |
| `DATABASE_URL`                             | Neon pooled application connection with `sslmode=verify-full`                    |
| `DATABASE_URL_UNPOOLED`                    | Same branch/database, direct non-pooler connection for migrations                |
| `BETTER_AUTH_URL`                          | Exact app origin; HTTPS in production, matching the browser URL                  |
| `BETTER_AUTH_SECRET`                       | Random secret of at least 32 characters; generate with `openssl rand -base64 48` |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Google OAuth web application credentials                                         |
| `DEMO_MODE`                                | Explicit sample fixture mode; set `false` for live operation                     |

## GitHub and Vercel deployment

Push this repository to GitHub, then import the GitHub repository into Vercel. The included Vercel build configuration automatically runs the photo-table migration for production deployments before building the app. In Vercel, add the same production values for every variable in `.env.example`; `DATABASE_URL_UNPOOLED` is required during the production build and `DATABASE_URL` is used by the live app. Do not add `UPLOAD_DIR` or any Vercel Blob variables.

### Google setup

In Google Cloud, configure the OAuth consent screen and create a **Web application** OAuth client. Add the app origin and this authorized redirect URI:

```text
https://YOUR_DOMAIN/api/auth/callback/google
```

For local testing, also register `http://127.0.0.1:3000/api/auth/callback/google` and/or the exact localhost origin you use. If the consent screen is in testing mode, add your intended test accounts. No SMS service is used.

### Location names

The navbar and nearby view share the browser's current GPS fix. BigDataCloud's [client-side reverse geocoding API](https://www.bigdatacloud.com/geocoding-apis/free-reverse-geocode-to-city-api) resolves its area/city name directly from the browser, without an API key. Only permission-granted current device coordinates are sent; no IP fallback or stored stall coordinates are used. A lookup failure leaves discovery usable and shows “Current location”. GPS denial shows “Location access not permitted”. Names and coordinates remain in memory for the page session; a refresh requests a fresh fix. See the privacy page for provider disclosure.

### Database and administrator

```sh
npm run db:generate   # Only after a schema change
npm run db:migrate    # Uses DATABASE_URL_UNPOOLED
npm run db:admin -- verified-owner@example.com
```

The administrator command requires an existing verified account. Test migrations on a Neon branch before applying them to your live database. The app uses separate `app_*` auth tables; do not point it at `neon_auth` as a replacement adapter.

For production, a dedicated `hungryowl_runtime` login role now exists on the Neon production branch. Before switching the app to that role, run the grant statements in `deploy/runtime-grants.sql` as the database owner, then use the role’s pooled URL in `DATABASE_URL`. Keep the database owner connection for migrations and maintenance only. The SQL grant step is intentionally separate from role creation so privileges are reviewed before they are applied.

## Server deployment

1. Install Docker with Compose on your server, or Node.js 24 for a direct deployment.
2. Create `.env.production` from the example, set `DEMO_MODE=false`, fill credentials, and use your HTTPS domain for `BETTER_AUTH_URL`.
3. Point the database URLs at your intended deployment branch. Run migrations first:

   ```sh
   docker compose --profile tools run --rm --build migrate
   docker compose up -d --build app
   ```

4. Install `deploy/nginx.conf` as your site config and `deploy/hungryowl-proxy.conf` as `/etc/nginx/snippets/hungryowl-proxy.conf`. Replace the example domain, provision TLS, validate with `nginx -t`, then reload Nginx. Expose 80/443 only; app port 3000 is loopback-bound.
5. Register Google callbacks for that domain, verify Google sign-in, create a verified admin account and assign its role using the migration image:

   ```sh
   docker compose --profile tools run --rm migrate npm run db:admin -- admin@example.com
   ```

6. Back up the `stall-photos` volume and Neon data, schedule maintenance, monitor `/api/health`, and perform the launch checks below.

Daily maintenance command: `docker compose --profile tools run --rm migrate npm run maintenance`. It removes expired sessions/limits/tokens and unattached photos older than 24 hours. Keep the photo volume mounted for this job. Configure the host scheduler according to your operating system.

For direct Node deployment: `npm ci`, `npm run build`, run the migration and environment check, then run `npm start` under a process supervisor with a persistent upload directory and a loopback binding/reverse proxy. The Docker path enforces configuration checks automatically and runs as a non-root user.

## Validation

```sh
npm run typecheck
npm run lint
npm test
npm run build
npm audit --omit=dev
```

Database/auth integration tests are opt-in and refuse to run against a different database hostname from the isolated development branch. They create uniquely identified test records, use test-only signed sessions for authorization checks, and clean up their rows. On PowerShell:

```powershell
$env:RUN_DB_TESTS='true'
npm test
```

On a POSIX shell: `RUN_DB_TESTS=true npm test`. Update the explicit safety guard in `tests/integration.test.ts` only when deliberately moving tests to another disposable branch.

## Launch checks

- Google login, rejected email/password endpoints, cancelled OAuth and logout on the final HTTPS origin.
- Real-device geolocation: accept, deny, timeout, inaccurate fix and out-of-Bangalore location.
- Submit real photos, review as admin, assign a verified owner, edit and temporarily close the stall.
- Check midnight/6 am boundaries, ratings, reports, responsive layouts and keyboard/screen-reader behavior.
- Verify backups and restoration, volume permissions, proxy header overwrites, disk limits and alerting.
- Finalize the public privacy page with the operator contact and retention policy.

See `docs/architecture.md`, `docs/api.md`, and `docs/verification.md` for implementation details and recorded test results. The food hero is an AI-generated illustrative image. Sample listings and ratings are fictional, never live records.
