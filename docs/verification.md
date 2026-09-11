# Verification record

Validated on 10 September 2026 in the HungryOwl workspace.

## Automated checks

- `npm run typecheck` passed.
- `npm run lint` passed.
- `npm test` passed: 20 business-rule tests. Nine Neon/auth integration tests are opt-in and require `RUN_DB_TESTS=true`; the full suite previously passed with 29 tests against the disposable development branch.
- `npm run build` passed with the Webpack production build before the documentation-only and deployment-runbook edits in this final pass. The source changes after that build are limited to configuration-safe UI polish and test/deployment support; rerun it on the deployment host before release.
- `npm audit --omit=dev` previously passed with zero vulnerabilities after updating `sharp` and the dependency lockfile.

## Neon checks

- Project: `nytfood`, region `aws-us-east-2`.
- Default production branch: `production`.
- Development branch: `codex-hungryowl-development`.
- Production contains the Drizzle migration ledger and all HungryOwl application tables.
- Managed `neon_auth` tables remain unchanged.
- `hungryowl_runtime` exists on the production branch. Apply `deploy/runtime-grants.sql` before using it for the application connection.

## Manual release checks still required

These depend on the operator’s real services or physical device and cannot be honestly simulated:

- Google OAuth on the final HTTPS origin.
- Google-only sign-in; old email/password and recovery endpoints must reject requests.
- Browser geolocation accept, deny, timeout, accuracy and out-of-Bangalore behavior.
- Real JPEG/PNG/WebP uploads, admin moderation and owner verification calls.
- Final Nginx TLS configuration, backup restore, disk alerts, scheduled maintenance and privacy contact details.
