import { z } from "zod";
import { api, checkOrigin, readJson, requireViewer, rateLimitAction } from "@/lib/http";
import { stallUpdateSchema } from "@/lib/validation";
import { updateStall } from "@/services/stalls";
export const PATCH = api(async (request) => {
  checkOrigin(request);
  const viewer = await requireViewer();
  await rateLimitAction(viewer.id, "edit", 30);
  const id = z.uuid().parse(new URL(request.url).pathname.split("/").pop());
  return Response.json(
    await updateStall(id, stallUpdateSchema.parse(await readJson(request)), viewer),
  );
});
