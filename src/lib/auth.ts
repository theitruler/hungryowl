import "server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { headers } from "next/headers";

import { getDb } from "@/db";
import * as schema from "@/db/schema";
import { authConfigured, isDemo } from "./runtime";
import type { Viewer } from "./config";
export function googleConfigured() {
  return !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}
function createAuth() {
  if (!authConfigured()) throw new Error("Authentication is not configured.");
  return betterAuth({
    appName: "HungryOwl",
    baseURL: process.env.BETTER_AUTH_URL!,
    secret: process.env.BETTER_AUTH_SECRET!,
    database: drizzleAdapter(getDb(), { provider: "pg", schema, transaction: true }),
    trustedOrigins: [process.env.BETTER_AUTH_URL!],
    emailAndPassword: { enabled: false },
    disabledPaths: [
      "/sign-in/email",
      "/sign-up/email",
      "/request-password-reset",
      "/reset-password",
      "/reset-password/:token",
      "/change-password",
      "/set-password",
      "/send-verification-email",
      "/verify-email",
    ],
    socialProviders: googleConfigured()
      ? {
          google: {
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
          },
        }
      : {},
    user: {
      additionalFields: {
        role: { type: "string", required: false, defaultValue: "user", input: false },
      },
    },
    account: { accountLinking: { enabled: false } },
    session: { expiresIn: 7 * 86400, updateAge: 86400 },
    rateLimit: {
      enabled: true,
      storage: "database",
      window: 60,
      max: 60,
      customRules: {
        "/sign-in/social": { window: 60, max: 5 },
      },
    },
    advanced: {
      useSecureCookies: process.env.BETTER_AUTH_URL!.startsWith("https://"),
      ipAddress: { ipAddressHeaders: ["x-real-ip"] },
    },
  });
}
let instance: ReturnType<typeof createAuth> | undefined;
export function getAuth() {
  return (instance ??= createAuth());
}
export async function getViewer(): Promise<Viewer | null> {
  if (isDemo() || !authConfigured()) return null;
  const result = await getAuth().api.getSession({ headers: await headers() });
  if (!result?.user.emailVerified) return null;
  return {
    id: result.user.id,
    name: result.user.name,
    email: result.user.email,
    role: result.user.role === "admin" ? "admin" : "user",
  };
}
