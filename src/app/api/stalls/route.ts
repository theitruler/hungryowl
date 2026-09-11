import { api, checkOrigin, readJson, requireViewer, rateLimitAction } from "@/lib/http";
import { nearbySchema, stallCreateSchema } from "@/lib/validation";
import { nearby, createStall } from "@/services/stalls";
export const GET = api(async (request) => {
  const viewer = await requireViewer();
  await rateLimitAction(viewer.id, "nearby", 120, 60);
  const params = new URL(request.url).searchParams;
  const input = nearbySchema.parse({
    latitude: Number(params.get("latitude")),
    longitude: Number(params.get("longitude")),
    radius: Number(params.get("radius")),
    offset: Number(params.get("offset") || 0),
    q: params.get("q") || "",
    diet: params.get("diet") || "all",
    sort: params.get("sort") || "distance",
  });
  return Response.json(await nearby(input), { headers: { "Cache-Control": "private, no-store" } });
});
export const POST = api(async (request) => {
  checkOrigin(request);
  const viewer = await requireViewer();
  await rateLimitAction(viewer.id, "submit", 5);
  const input = stallCreateSchema.parse(await readJson(request));
  return Response.json(await createStall(input, viewer), { status: 201 });
});
