import { z } from "zod";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { photos, stallPhotos, stalls } from "@/db/schema";
import { getViewer } from "@/lib/auth";
import { api, ApiError } from "@/lib/http";
export const GET = api(async (request) => {
  const id = z.uuid().parse(new URL(request.url).pathname.split("/").pop());
  const [record] = await getDb()
    .select({
      uploader: photos.uploadedBy,
      data: photos.data,
      status: stalls.status,
      owner: stalls.ownerId,
    })
    .from(photos)
    .leftJoin(stallPhotos, eq(photos.id, stallPhotos.photoId))
    .leftJoin(stalls, eq(stalls.id, stallPhotos.stallId))
    .where(eq(photos.id, id));
  if (!record) throw new ApiError(404, "Photo not found.");
  if (record.status !== "approved") {
    const viewer = await getViewer();
    if (
      !viewer ||
      (viewer.id !== record.uploader && viewer.id !== record.owner && viewer.role !== "admin")
    )
      throw new ApiError(404, "Photo not found.");
  }
  if (!record.data) throw new ApiError(404, "Photo not found.");
  return new Response(new Uint8Array(record.data), {
    headers: {
      "Content-Type": "image/webp",
      "X-Content-Type-Options": "nosniff",
      "Cache-Control":
        record.status === "approved" ? "public, max-age=3600" : "private, no-store",
    },
  });
});
