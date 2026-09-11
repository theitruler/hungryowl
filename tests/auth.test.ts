import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("../src/db", () => ({ getDb: () => ({}) }));
vi.mock("@better-auth/drizzle-adapter", async () => {
  const { memoryAdapter } = await import("better-auth/adapters/memory");
  return {
    drizzleAdapter: () =>
      memoryAdapter({ user: [], session: [], account: [], verification: [], rateLimit: [] }),
  };
});

describe("Google-only authentication", () => {
  let auth: ReturnType<typeof import("../src/lib/auth").getAuth>;
  beforeAll(async () => {
    vi.stubEnv("DATABASE_URL", "test-only");
    vi.stubEnv("BETTER_AUTH_SECRET", "test-only-auth-secret-at-least-32-characters");
    vi.stubEnv("BETTER_AUTH_URL", "http://localhost:3000");
    vi.stubEnv("GOOGLE_CLIENT_ID", "test-only-client.apps.googleusercontent.com");
    vi.stubEnv("GOOGLE_CLIENT_SECRET", "test-only-secret");
    auth = (await import("../src/lib/auth")).getAuth();
  });
  afterAll(() => vi.unstubAllEnvs());
  it.each([
    "sign-in/email",
    "sign-up/email",
    "request-password-reset",
    "reset-password",
    "change-password",
    "set-password",
    "send-verification-email",
    "verify-email",
  ])("disables the %s endpoint on the server", async (endpoint) => {
    const response = await auth.handler(
      new Request(`http://localhost:3000/api/auth/${endpoint}`, {
        method: endpoint === "verify-email" ? "GET" : "POST",
        headers: { origin: "http://localhost:3000", "content-type": "application/json" },
        ...(endpoint === "verify-email"
          ? {}
          : {
              body: JSON.stringify({
                email: "qa@example.invalid",
                password: "test-only-password",
                name: "Test",
              }),
            }),
      }),
    );
    expect(response.status).toBe(404);
  });
  it("starts Google OAuth with the configured callback and keeps the secret private", async () => {
    const response = await auth.api.signInSocial({
      body: { provider: "google", callbackURL: "/", disableRedirect: true },
      asResponse: true,
      headers: new Headers({ origin: "http://localhost:3000" }),
    });
    expect(response.status).toBe(200);
    const body = await response.json();
    const url = new URL(body.url);
    expect(url.hostname).toBe("accounts.google.com");
    expect(url.searchParams.get("redirect_uri")).toBe(
      "http://localhost:3000/api/auth/callback/google",
    );
    expect(url.searchParams.get("state")).toBeTruthy();
    expect(body.url).not.toContain("test-only-secret");
  });
});
