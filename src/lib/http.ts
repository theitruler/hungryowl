import "server-only";
import { ZodError } from "zod";
import { getViewer } from "./auth";
import { isDemo } from "./runtime";
import { sql } from "drizzle-orm";
import { getDb } from "@/db";
import { requestLimits } from "@/db/schema";
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export async function requireViewer() {
  if (isDemo()) throw new ApiError(503, "This is a sample preview. Live changes are disabled.");
  const viewer = await getViewer();
  if (!viewer) throw new ApiError(401, "Sign in with a verified account to continue.");
  return viewer;
}
export async function requireAdmin() {
  const viewer = await requireViewer();
  if (viewer.role !== "admin") throw new ApiError(403, "Administrator access is required.");
  return viewer;
}
export function checkOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const expected = new URL(process.env.BETTER_AUTH_URL || request.url).origin;
  if (!origin || origin !== expected)
    throw new ApiError(403, "The request could not be verified. Refresh and try again.");
}
export async function limitedBody(request: Request, maxBytes: number) {
  if (Number(request.headers.get("content-length")) > maxBytes)
    throw new ApiError(413, "This upload is too large.");
  const reader = request.body?.getReader();
  if (!reader) throw new ApiError(400, "A request body is required.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxBytes) {
      await reader.cancel();
      throw new ApiError(413, "This upload is too large.");
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks);
}
export async function readJson(request: Request) {
  if (!request.headers.get("content-type")?.includes("application/json"))
    throw new ApiError(415, "Send JSON data.");
  try {
    return JSON.parse((await limitedBody(request, 50000)).toString());
  } catch (e) {
    if (e instanceof ApiError) throw e;
    throw new ApiError(400, "Invalid request data.");
  }
}
export function api(handler: (request: Request) => Promise<Response>) {
  return async (request: Request) => {
    try {
      return await handler(request);
    } catch (e) {
      if (e instanceof ApiError) return Response.json({ error: e.message }, { status: e.status });
      if (e instanceof ZodError)
        return Response.json(
          {
            error: e.issues[0]?.message || "Please check your input.",
            fields: e.flatten().fieldErrors,
          },
          { status: 400 },
        );
      console.error("Request failed", { type: e instanceof Error ? e.name : "UnknownError" });
      return Response.json(
        { error: "Something went wrong. Please try again shortly." },
        { status: 500 },
      );
    }
  };
}
export async function rateLimitAction(
  userId: string,
  action: string,
  limit: number,
  seconds = 3600,
) {
  const key = `${action}:${userId}`;
  const db = getDb();
  const [result] = await db
    .insert(requestLimits)
    .values({ key, count: 1, expiresAt: new Date(Date.now() + seconds * 1000) })
    .onConflictDoUpdate({
      target: requestLimits.key,
      set: {
        count: sql`case when ${requestLimits.expiresAt} < now() then 1 else ${requestLimits.count} + 1 end`,
        expiresAt: sql`case when ${requestLimits.expiresAt} < now() then now() + ${seconds} * interval '1 second' else ${requestLimits.expiresAt} end`,
      },
    })
    .returning();
  if (result.count > limit)
    throw new ApiError(429, "You’ve made several requests. Please try again later.");
}
