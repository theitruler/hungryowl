import { toNextJsHandler } from "better-auth/next-js";
import { getAuth } from "@/lib/auth";
import { authConfigured, isDemo } from "@/lib/runtime";
async function handle(request: Request) {
  if (!authConfigured() || isDemo())
    return Response.json(
      { error: "Live sign-in is not enabled in this preview." },
      { status: 503 },
    );
  try {
    const handlers = toNextJsHandler(getAuth());
    return request.method === "GET" ? handlers.GET(request) : handlers.POST(request);
  } catch {
    return Response.json({ error: "Sign-in is temporarily unavailable." }, { status: 503 });
  }
}
export const GET = handle;
export const POST = handle;
