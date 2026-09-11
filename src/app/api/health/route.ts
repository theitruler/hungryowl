import { isDemo, authConfigured } from "@/lib/runtime";
import { getDb } from "@/db";
import { sql } from "drizzle-orm";
export const dynamic = "force-dynamic";
export async function GET() {
  if (isDemo())
    return Response.json({ status: "preview" }, { headers: { "Cache-Control": "no-store" } });
  if (!authConfigured()) return Response.json({ status: "unavailable" }, { status: 503 });
  try {
    await getDb().execute(sql`select 1`);
    return Response.json({ status: "ok" }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ status: "unavailable" }, { status: 503 });
  }
}
