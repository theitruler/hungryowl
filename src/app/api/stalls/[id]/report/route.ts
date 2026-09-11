import { z } from "zod";
import { api, checkOrigin, readJson, requireViewer, rateLimitAction } from "@/lib/http";
import { reportSchema } from "@/lib/validation";
import { reportClosed } from "@/services/stalls";
export const POST = api(async (request) => {
  checkOrigin(request);
  const viewer = await requireViewer();
  await rateLimitAction(viewer.id, "report", 10);
  const id = z.uuid().parse(new URL(request.url).pathname.split("/").at(-2));
  const { note } = reportSchema.parse(await readJson(request));
  await reportClosed(id, note, viewer);
  return Response.json({ ok: true }, { status: 201 });
});
