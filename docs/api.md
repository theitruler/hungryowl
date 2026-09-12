# API responsibilities

All live endpoints use secure cookie sessions. Mutations require a matching `Origin`; JSON requests require `Content-Type: application/json`. Errors use `{ "error": "User-safe message" }`, with optional validation `fields`. Schema/type contracts live in `src/lib/validation.ts` and `src/lib/config.ts`.

| Method   | Route                    | Responsibility                                                                                       |
| -------- | ------------------------ | ---------------------------------------------------------------------------------------------------- |
| GET/POST | `/api/auth/*`            | Better Auth: Google OAuth, sign-out and sessions; email/password endpoints are disabled              |
| GET      | `/api/stalls`            | Verified user: coordinates, radius, offset, optional q/diet/sort; returns `{stalls,hasMore}`         |
| POST     | `/api/stalls`            | Verified user: validate fresh GPS, exactly two own uploads and stall data; create pending submission |
| PATCH    | `/api/stalls/:id`        | Assigned owner, “My stall” submitter (unless reassigned), or admin: update details, contact, hours, reopening time, optional GPS relocation and photos |
| POST     | `/api/stalls/:id/rating` | Set/update authenticated user's 1–5 star rating                                                      |
| POST     | `/api/stalls/:id/report` | Submit a closure report, optional note                                                               |
| POST     | `/api/uploads`           | Upload one multipart `photo`; returns `{id,url}`                                                     |
| GET      | `/api/photos/:id`        | Serve approved images or authorize private pending images                                            |
| POST     | `/api/admin/stalls/:id`  | Admin: approve, reject with reason, phone-verified claim, temporary close                            |
| POST     | `/api/admin/reports/:id` | Admin: dismiss unresolved report                                                                     |
| GET      | `/api/health`            | Minimal health state; database probe in live mode                                                    |

HTTP statuses: 400 validation; 401 missing verified identity; 403 access/origin rejected; 404 missing/inaccessible resource; 409 duplicate or stale action; 413 oversized payload; 415 unsupported media; 429 rate limit; 503 unavailable integration or disabled sample mutation.

Public discovery includes approved stalls within the selected distance, including stalls outside their opening hours and temporarily closed stalls. The client displays when they next open.

Credentials are never returned. Contact numbers and private moderation details are excluded from public discovery and public stall details; authorized detail views include them only for the submitter, managing owner or admin. “Someone else’s stall” submissions are read-only for their submitters. There is no endpoint granting admin roles or accepting an owner ID from a customer submission.
