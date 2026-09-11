# API responsibilities

All live endpoints use secure cookie sessions. Mutations require a matching `Origin`; JSON requests require `Content-Type: application/json`. Errors use `{ "error": "User-safe message" }`, with optional validation `fields`. Schema/type contracts live in `src/lib/validation.ts` and `src/lib/config.ts`.

| Method   | Route                    | Responsibility                                                                                       |
| -------- | ------------------------ | ---------------------------------------------------------------------------------------------------- |
| GET/POST | `/api/auth/*`            | Better Auth: Google OAuth, sign-out and sessions; email/password endpoints are disabled              |
| GET      | `/api/stalls`            | Verified user: coordinates, radius, offset, optional q/diet/sort; returns `{stalls,hasMore}`         |
| POST     | `/api/stalls`            | Verified user: validate fresh GPS, exactly two own uploads and stall data; create pending submission |
| PATCH    | `/api/stalls/:id`        | Verified owner/admin: update details, optional GPS relocation and replacement photo IDs              |
| POST     | `/api/stalls/:id/rating` | Set/update authenticated user's 1–5 star rating                                                      |
| POST     | `/api/stalls/:id/report` | Submit a closure report, optional note                                                               |
| POST     | `/api/uploads`           | Upload one multipart `photo`; returns `{id,url}`                                                     |
| GET      | `/api/photos/:id`        | Serve approved images or authorize private pending images                                            |
| POST     | `/api/admin/stalls/:id`  | Admin: approve, reject with reason, phone-verified claim, temporary close                            |
| POST     | `/api/admin/reports/:id` | Admin: dismiss unresolved report                                                                     |
| GET      | `/api/health`            | Minimal health state; database probe in live mode                                                    |

HTTP statuses: 400 validation; 401 missing verified identity; 403 access/origin rejected; 404 missing/inaccessible resource; 409 duplicate or stale action; 413 oversized payload; 415 unsupported media; 429 rate limit; 503 unavailable integration or disabled sample mutation.

Credentials, contact numbers and private moderation details must never be returned from public discovery or stall detail DTOs. There is no endpoint granting admin roles or accepting an owner ID from a customer submission.
