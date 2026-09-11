import { z } from "zod";
import { api, checkOrigin, readJson, requireViewer, rateLimitAction } from "@/lib/http";
import { ratingSchema } from "@/lib/validation";
import { setRating } from "@/services/stalls";
export const POST = api(async (request) => {
  checkOrigin(request);
  const viewer = await requireViewer();
  await rateLimitAction(viewer.id, "rating", 30);
  const id = z.uuid().parse(new URL(request.url).pathname.split("/").at(-2));
  const { stars } = ratingSchema.parse(await readJson(request));
  await setRating(id, stars, viewer);
  return Response.json({ ok: true });
});
