import { z } from "zod";
import { api, checkOrigin, readJson, requireAdmin } from "@/lib/http";
import { moderationSchema } from "@/lib/validation";
import { moderate } from "@/services/stalls";
export const POST = api(async (request) => {
  checkOrigin(request);
  const viewer = await requireAdmin();
  const id = z.uuid().parse(new URL(request.url).pathname.split("/").pop());
  await moderate(id, moderationSchema.parse(await readJson(request)), viewer);
  return Response.json({ ok: true });
});
