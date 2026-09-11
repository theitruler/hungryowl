-- Create a LOGIN role named hungryowl_runtime using the Neon console first.
-- Apply as the database owner after migrations. Use this role for DATABASE_URL;
-- keep the owner/direct URL only in migration and maintenance jobs.
GRANT USAGE ON SCHEMA public TO hungryowl_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON
  app_user, app_session, app_account, app_verification, auth_rate_limit,
  stalls, photos, stall_photos, ratings, closure_reports, request_limits
TO hungryowl_runtime;
GRANT SELECT, INSERT ON audit_log TO hungryowl_runtime;
REVOKE CREATE ON SCHEMA public FROM hungryowl_runtime;
