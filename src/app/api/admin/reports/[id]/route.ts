import { z } from "zod";
import { and, eq, isNull } from "drizzle-orm";
import { api, checkOrigin, requireAdmin, ApiError } from "@/lib/http";
import { getDb } from "@/db";
import { reports, auditLog } from "@/db/schema";
export const POST = api(async (request) => {
  checkOrigin(request);
  const viewer = await requireAdmin();
  const id = z.uuid().parse(new URL(request.url).pathname.split("/").pop());
  await getDb().transaction(async (tx) => {
    const [report] = await tx
      .update(reports)
      .set({ resolvedAt: new Date() })
      .where(and(eq(reports.id, id), isNull(reports.resolvedAt)))
      .returning();
    if (!report) throw new ApiError(404, "Unresolved report not found.");
    await tx
      .insert(auditLog)
      .values({
        actorId: viewer.id,
        stallId: report.stallId,
        action: "report_dismissed",
        details: { reportId: report.id },
      });
  });
  return Response.json({ ok: true });
});
