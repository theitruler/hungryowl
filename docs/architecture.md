# HungryOwl architecture

HungryOwl is a single deployable Next.js application. React client components handle interaction; server-rendered pages load identity and protected data. Route handlers authenticate, authorize and validate requests, then delegate business rules to services. Drizzle owns the schema and migration history. A reusable node-postgres pool connects to Neon.

## Boundaries

- `src/app`: route entry points, metadata, loading and failure boundaries.
- `src/components`: navigation, reusable cards, forms and feature screens.
- `src/hooks`: browser location and device search-radius subscriptions.
- `src/lib`: shared constraints, validation, time/distance rules, authentication and API handling.
- `src/services`: submission, discovery, ownership, ratings and moderation rules.
- `src/db` and `drizzle`: typed schema and generated SQL migrations.
- `tests`: business rules and integration tests against an isolated Neon branch.
- `deploy`: TLS reverse proxy examples; Docker and Compose are at the root.

## Authentication

Better Auth uses its Drizzle adapter with separate `app_*` tables. Existing managed Neon Auth tables are untouched. Google is the only sign-in provider. Email/password registration, login and recovery endpoints are disabled. Google credentials are configured only on the server. Client requests cannot set their role; granting an administrator uses the operator-only database CLI. Automatic provider account linking is disabled to avoid accidental identity merges.

Session cookies are HTTP-only, secure on HTTPS, and same-origin. Every custom mutation verifies the request Origin and authenticated identity. PostgreSQL-backed limits apply to write actions; authentication has its own rate limits. Nginx must overwrite `X-Real-IP`, which the authentication service trusts. Keep the app port private.

## Data and permissions

- Users create pending submissions; submission does **not** grant ownership.
- Admins approve or reject pending submissions. Only approved stalls appear in discovery.
- After calling an owner, an admin can assign the approved stall to that owner's existing verified email account. Claims are recorded in an audit log and cannot silently replace an existing owner.
- Verified owners edit their own listings without another approval. They can refresh stall coordinates using current GPS, update both photos, menu and hours, and set temporary closures.
- Ratings have a `(stall_id, user_id)` primary key; repeated ratings update rather than accumulate. Owners cannot rate their own stalls.
- Closure reports are limited to one per user/stall/Bangalore calendar day. Admin review is required before a report changes opening status.
- Public DTOs omit owner phone numbers, submitter IDs, emails and moderation notes.

## Discovery rules

Daily opening hours are interpreted in Asia/Kolkata. When opening time is later than closing time, service crosses midnight. The closing boundary is exclusive. Equal opening and closing times mean 24 hours. Each listing must serve some part of the 11 pm–6 am window. The app remains available during the day and shows qualifying stalls if their own hours say they are open.

Temporary closures override opening hours and expire automatically. Unclaimed stalls use submitted hours with an explicit “Not confirmed by owner” label. “New” means fewer than 14 days since approval.

Search radius is 1–30 km, default 5 km, stored per device. Latitude/longitude bounding-box indexes reduce candidates; great-circle distance provides accurate straight-line sorting/filtering. These are not road distances or ETAs. SQL handles filters and rating sort before pagination (24 per page). Refreshes every minute, with request cancellation on location/filter changes.

The Bangalore launch boundary is a conservative bounding rectangle (12.7–13.3 latitude, 77.3–77.9 longitude), not a municipal polygon. Browser geolocation can be spoofed: fresh timestamps and accuracy checks help quality but do not prove physical presence. Admin photo review remains necessary.

## Uploads and scale

The server bounds request bodies, validates actual decoded images, limits dimensions to 24 million pixels, rejects animation and SVG, and re-encodes images to WebP without EXIF/GPS metadata. Exactly two uniquely attached photos are required per stall. Unapproved photos are accessible only to their uploader, owner, or an admin. Photos live in a persistent Docker volume outside public assets; database records control access.

This deployment is suitable for a single server. Before adding multiple app replicas, move photos to shared private object storage and configure a shared Next.js cache. PostgreSQL limits and sessions already survive process restarts. Add PostGIS if volume makes the initial bounding-box query insufficient. Do not introduce those services until needed.

## Operational notes

Back up Neon and the photo volume together. Monitor health, error rates, disk space and Google sign-in failures. Redact sensitive request bodies and coordinates from logs. Schedule `npm run maintenance` daily to remove expired limits, sessions, tokens and orphaned photos older than 24 hours. Audit records and approved contributions are retained until an operator-reviewed removal; define public retention/contact policy before launch.

The production privacy page must contain the operator's contact and finalized retention policy. No analytics or tracking SDK is installed.

## Reference documentation

- [Next.js self-hosting](https://nextjs.org/docs/app/guides/self-hosting)
- [Better Auth integration](https://better-auth.com/docs/integrations/next)
- [Drizzle with Neon](https://orm.drizzle.team/docs/connect-neon)
