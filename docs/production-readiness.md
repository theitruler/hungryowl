# Production readiness runbook

HungryOwl’s source, schema, deployment image and operational checks are ready for a controlled launch. The final production gate is deliberately configuration-dependent: it needs the owner’s real domain, Google OAuth credentials and an operator-created administrator account.

## Neon production branch

The existing `nytfood` project’s default branch is the production branch. The HungryOwl tables and Drizzle migration ledger are present there. The separate development branch remains available for disposable integration tests. Existing `neon_auth` tables were not modified. Enable branch protection in the Neon console if your plan and workflow support it.

The `hungryowl_runtime` login role has been created on production. Apply `deploy/runtime-grants.sql` from the Neon SQL editor while signed in as the database owner. Verify that the role can connect, select approved stalls, insert ratings/reports, upload photo records and update only through the application service. Use the owner/direct URL only for migrations and maintenance; use the pooled runtime URL for the app.

Suggested prelaunch checks in Neon:

```sql
select current_database(), current_user;
select table_schema, table_name
from information_schema.tables
where table_schema = 'public'
order by table_name;
select count(*) from stalls;
select count(*) from app_user;
```

The application should not seed illustrative stalls into this branch. Add real listings through the reviewed app flow. Keep the branch protected, leave public connections blocked only if your server egress is allowlisted, and set an IP allowlist in Neon when your server’s fixed egress IP is known. If your server IP changes, update the allowlist before enforcing it.

Neon’s current free project has a 6-hour history retention window. That is not a sufficient recovery policy for a public service by itself. Upgrade the plan or export database and photo backups on a schedule that matches the service’s recovery needs. Back up the Docker `stall-photos` volume together with the database.

## App configuration

Copy `.env.example` to `.env.production` on the server. Set `DEMO_MODE=false`, `BETTER_AUTH_URL` to the final HTTPS origin, a fresh secret of at least 32 random characters, the pooled runtime URL and the direct owner URL only for migration jobs. Add Google web credentials with `/api/auth/callback/google` registered for the exact origin.

Do not copy the workspace `.env.local` into production. It is a local development configuration and should be rotated if it has ever been shared outside the server. Never commit any dotenv file.

## Deployment gate

Run the migration image first, then start the app and confirm `/api/health` reports `ok`. Nginx must terminate TLS, overwrite `X-Real-IP`, limit auth and upload request sizes, and keep port 3000 bound to loopback. The container runs as a non-root user and stores processed photos in a persistent volume.

Before public launch, complete these manual tests on the final HTTPS origin:

1. Confirm email/password endpoints are disabled and sign-out revokes the session.
2. Sign in with Google and confirm the callback returns to the final origin.
3. Accept and deny location; verify the denied message. Test an out-of-Bangalore fix.
4. Submit two real photos from the stall, approve as admin, call and assign the owner, then edit and temporarily close it.
5. Verify that pending/rejected data is private, owner phone numbers never appear publicly, owners cannot rate themselves, and closure reports need admin review.
6. Test 22:59, 23:00, 05:59 and 06:00 boundaries, mobile layouts, keyboard navigation and reduced motion.

The codebase includes automated business and Neon integration coverage, but Google OAuth, browser geolocation and final HTTPS behavior require the operator’s services and device.
