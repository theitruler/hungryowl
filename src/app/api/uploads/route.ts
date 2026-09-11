import { mkdir, writeFile, unlink } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { getDb } from "@/db";
import { photos } from "@/db/schema";
import {
  api,
  ApiError,
  checkOrigin,
  requireViewer,
  rateLimitAction,
  limitedBody,
} from "@/lib/http";
import { MAX_PHOTO_BYTES } from "@/lib/config";
export const POST = api(async (request) => {
  checkOrigin(request);
  const viewer = await requireViewer();
  await rateLimitAction(viewer.id, "photo", 20);
  if (!request.headers.get("content-type")?.startsWith("multipart/form-data;"))
    throw new ApiError(415, "Select an image file.");
  const bytes = await limitedBody(request, MAX_PHOTO_BYTES + 20000);
  const bounded = new Request(request.url, {
    method: "POST",
    headers: { "content-type": request.headers.get("content-type")! },
    body: new Uint8Array(bytes),
  });
  const form = await bounded.formData();
  const file = form.get("photo");
  if (
    !(file instanceof File) ||
    file.size > MAX_PHOTO_BYTES ||
    file.size === 0 ||
    !["image/jpeg", "image/png", "image/webp"].includes(file.type)
  )
    throw new ApiError(400, "Use a JPG, PNG or WebP image under 5 MB.");
  let output: Buffer;
  try {
    const source = sharp(Buffer.from(await file.arrayBuffer()), {
      limitInputPixels: 24_000_000,
      failOn: "warning",
    });
    const metadata = await source.metadata();
    if (
      !["jpeg", "png", "webp"].includes(metadata.format || "") ||
      (metadata.pages ?? 1) !== 1 ||
      (metadata.width ?? 0) < 200 ||
      (metadata.height ?? 0) < 200
    )
      throw new Error("Invalid photo");
    // Re-encoding strips EXIF/GPS metadata and rejects SVGs and animated images.
    output = await source
      .rotate()
      .resize(1600, 1600, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();
  } catch {
    throw new ApiError(
      400,
      "This image could not be read. Use a clear, non-animated photo at least 200 × 200 pixels.",
    );
  }
  const id = randomUUID(),
    dir = path.resolve(process.env.UPLOAD_DIR || "./data/uploads"),
    filename = path.join(dir, `${id}.webp`);
  await mkdir(dir, { recursive: true });
  await writeFile(filename, output, { flag: "wx" });
  try {
    await getDb().insert(photos).values({ id, uploadedBy: viewer.id });
  } catch (error) {
    await unlink(filename).catch(() => {});
    throw error;
  }
  return Response.json({ id, url: `/api/photos/${id}` }, { status: 201 });
});
