import "server-only";
export function isDemo() {
  return (
    process.env.DEMO_MODE === "true" ||
    (!process.env.DATABASE_URL && process.env.NODE_ENV !== "production")
  );
}
export function authConfigured() {
  return !!(
    process.env.DATABASE_URL &&
    process.env.BETTER_AUTH_SECRET &&
    process.env.BETTER_AUTH_URL
  );
}
