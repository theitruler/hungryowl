import "server-only";
import { and, or, eq, inArray, sql, desc, isNull } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { stalls, photos, stallPhotos, ratings, reports, user, auditLog } from "@/db/schema";
import { ApiError } from "@/lib/http";
import { inBangalore } from "@/lib/geo-time";
import { canManageStall, isStallOwner } from "@/lib/stall-access";
import {
  nearbySchema,
  stallCreateSchema,
  stallUpdateSchema,
  moderationSchema,
} from "@/lib/validation";
import type { Stall, StallDetails, Viewer } from "@/lib/config";
type StallRow = typeof stalls.$inferSelect;
type DbTransaction = Parameters<Parameters<ReturnType<typeof getDb>["transaction"]>[0]>[0];
async function serialize(rows: StallRow[]): Promise<Stall[]> {
  if (!rows.length) return [];
  const db = getDb(),
    ids = rows.map((s) => s.id);
  const [imageRows, ratingRows] = await Promise.all([
    db
      .select()
      .from(stallPhotos)
      .where(inArray(stallPhotos.stallId, ids))
      .orderBy(stallPhotos.position),
    db
      .select({
        stallId: ratings.stallId,
        rating: sql<number>`avg(${ratings.stars})::float`,
        count: sql<number>`count(*)::int`,
      })
      .from(ratings)
      .where(inArray(ratings.stallId, ids))
      .groupBy(ratings.stallId),
  ]);
  return rows.map((s) => {
    const rating = ratingRows.find((r) => r.stallId === s.id);
    return {
      id: s.id,
      name: s.name,
      description: s.description,
      area: s.area,
      latitude: s.latitude,
      longitude: s.longitude,
      diets: s.diets,
      opensAt: s.opensAt,
      closesAt: s.closesAt,
      closedUntil: s.closedUntil?.toISOString() ?? null,
      menu: s.menu,
      ownerId: s.ownerId,
      status: s.status,
      createdAt: s.createdAt.toISOString(),
      approvedAt: s.approvedAt?.toISOString() ?? null,
      photos: imageRows.filter((i) => i.stallId === s.id).map((i) => `/api/photos/${i.photoId}`),
      rating: rating?.rating ?? null,
      ratingCount: rating?.count ?? 0,
    };
  });
}
export async function nearby(input: z.input<typeof nearbySchema>) {
  if (!inBangalore(input)) return { stalls: [], hasMore: false };
  const { latitude, longitude, radius, offset, q, diet, sort } = nearbySchema.parse(input),
    db = getDb();
  const pattern = `%${q.replace(/[\\%_]/g, "\\$&")}%`;
  const query = await db.execute<{ id: string; distance: number }>(sql`
    with nearby_stalls as (
      select id, (select coalesce(avg(stars), -1) from ratings where ratings.stall_id = stalls.id) as rating, 6371 * acos(least(1.0, greatest(-1.0,
        cos(radians(${latitude}::float)) * cos(radians(latitude)) * cos(radians(longitude) - radians(${longitude}::float)) +
        sin(radians(${latitude}::float)) * sin(radians(latitude))))) as distance
      from stalls where status = 'approved'
      and (${diet} = 'all' or ${diet} = any(diets))
      and (${q} = '' or name ilike ${pattern} or area ilike ${pattern} or menu::text ilike ${pattern})
      and latitude between ${latitude - radius / 110} and ${latitude + radius / 110}
      and longitude between ${longitude - radius / (110 * Math.cos((latitude * Math.PI) / 180))} and ${longitude + radius / (110 * Math.cos((latitude * Math.PI) / 180))}
    ) select * from nearby_stalls where distance <= ${radius} order by ${sort === "rating" ? sql`rating desc, distance, id` : sql`distance, id`} limit 25 offset ${offset}`);
  const chosen = query.rows.slice(0, 24);
  if (!chosen.length) return { stalls: [], hasMore: false };
  const rows = await serialize(
    await db
      .select()
      .from(stalls)
      .where(
        inArray(
          stalls.id,
          chosen.map((r) => r.id),
        ),
      ),
  );
  return {
    stalls: chosen.map((r) => ({ ...rows.find((s) => s.id === r.id)!, distance: r.distance })),
    hasMore: query.rows.length > 24,
  };
}
export async function getStall(id: string, viewer: Viewer | null): Promise<StallDetails | null> {
  if (!z.uuid().safeParse(id).success) return null;
  const [row] = await getDb().select().from(stalls).where(eq(stalls.id, id));
  if (
    !row ||
    (row.status !== "approved" &&
      row.submittedBy !== viewer?.id &&
      row.ownerId !== viewer?.id &&
      viewer?.role !== "admin")
  )
    return null;
  const [stall] = await serialize([row]);
  const canManage = canManageStall(row, viewer);
  return {
    ...stall,
    canManage,
    ...(canManage || row.submittedBy === viewer?.id ? {
      submission: {
        relationship: row.relationship,
        contactPhone: row.contactPhone,
        rejectionReason: row.rejectionReason,
      },
    } : {}),
  };
}
async function attachPhotos(
  tx: DbTransaction,
  ids: string[],
  stallId: string,
  uploaderId: string,
  replacing = false,
) {
  const candidates = await tx.select({ id: photos.id, uploadedBy: photos.uploadedBy })
    .from(photos).where(inArray(photos.id, ids)).for("update");
  if (candidates.length !== 2) throw new ApiError(400, "Upload two stall photos first.");
  const existing = await tx.select().from(stallPhotos).where(inArray(stallPhotos.photoId, ids));
  for (const photo of candidates) {
    const attachment = existing.find((p) => p.photoId === photo.id);
    if (attachment && attachment.stallId !== stallId)
      throw new ApiError(409, "These photos are already attached to a stall.");
    if (photo.uploadedBy !== uploaderId && attachment?.stallId !== stallId)
      throw new ApiError(403, "Use your own uploaded photos.");
  }
  if (replacing) await tx.delete(stallPhotos).where(eq(stallPhotos.stallId, stallId));
  await tx
    .insert(stallPhotos)
    .values(ids.map((photoId, position) => ({ photoId, position, stallId })));
}
export async function createStall(input: z.infer<typeof stallCreateSchema>, viewer: Viewer) {
  const { photoIds, locationCapturedAt: _captured, accuracy: _accuracy, ...values } = input;
  void _captured;
  void _accuracy;
  return getDb().transaction(async (tx) => {
    // Serialize submissions with the same normalized name to handle double requests.
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtext(${values.name.toLowerCase().replace(/\s+/g, " ")}))`,
    );
    const duplicates = await tx
      .select({ id: stalls.id })
      .from(stalls)
      .where(
        and(
          sql`lower(${stalls.name}) = lower(${values.name})`,
          sql`abs(${stalls.latitude} - ${values.latitude}) < 0.0004`,
          sql`abs(${stalls.longitude} - ${values.longitude}) < 0.0004`,
          sql`${stalls.status} <> 'rejected'`,
        ),
      );
    if (duplicates.length)
      throw new ApiError(409, "This stall already appears to have been submitted nearby.");
    const [created] = await tx
      .insert(stalls)
      .values({ ...values, submittedBy: viewer.id })
      .returning({ id: stalls.id });
    await attachPhotos(tx, photoIds, created.id, viewer.id);
    await tx
      .insert(auditLog)
      .values({ actorId: viewer.id, stallId: created.id, action: "submitted" });
    return created;
  });
}
export async function updateStall(
  id: string,
  input: z.infer<typeof stallUpdateSchema>,
  viewer: Viewer,
) {
  return getDb().transaction(async (tx) => {
    const [row] = await tx.select().from(stalls).where(eq(stalls.id, id)).for("update");
    if (!row) throw new ApiError(404, "Stall not found.");
    if (!canManageStall(row, viewer))
      throw new ApiError(403, "Only the stall owner or an administrator can edit this stall.");
    const { photoIds, closedUntil, location, ...values } = input;
    await tx
      .update(stalls)
      .set({
        ...values,
        ...(location ? { latitude: location.latitude, longitude: location.longitude } : {}),
        closedUntil: closedUntil ? new Date(closedUntil) : null,
        updatedAt: new Date(),
      })
      .where(eq(stalls.id, id));
    if (photoIds) await attachPhotos(tx, photoIds, id, viewer.id, true);
    await tx.insert(auditLog).values({ actorId: viewer.id, stallId: id, action: "updated" });
    return { id };
  });
}
export async function setRating(id: string, stars: number, viewer: Viewer) {
  const [stall] = await getDb()
    .select()
    .from(stalls)
    .where(and(eq(stalls.id, id), eq(stalls.status, "approved")));
  if (!stall) throw new ApiError(404, "Stall not found.");
  if (isStallOwner(stall, viewer)) throw new ApiError(403, "You cannot rate your own stall.");
  await getDb()
    .insert(ratings)
    .values({ stallId: id, userId: viewer.id, stars })
    .onConflictDoUpdate({
      target: [ratings.stallId, ratings.userId],
      set: { stars, updatedAt: new Date() },
    });
}
export async function reportClosed(id: string, note: string, viewer: Viewer) {
  const stall = await getStall(id, viewer);
  if (stall?.status !== "approved") throw new ApiError(404, "Stall not found.");
  const day = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
  const inserted = await getDb()
    .insert(reports)
    .values({ stallId: id, userId: viewer.id, note, day })
    .onConflictDoNothing()
    .returning({ id: reports.id });
  if (!inserted.length) throw new ApiError(409, "You’ve already reported this stall today.");
}
export async function myStalls(viewer: Viewer) {
  const rows = await getDb()
    .select()
    .from(stalls)
    .where(
      or(
        eq(stalls.ownerId, viewer.id),
        and(isNull(stalls.ownerId), eq(stalls.submittedBy, viewer.id)),
      ),
    )
    .orderBy(desc(stalls.createdAt));
  const serialized = await serialize(rows);
  return serialized.map((s) => ({
    ...s,
    canManage: canManageStall(rows.find((r) => r.id === s.id)!, viewer),
    rejectionReason: rows.find((r) => r.id === s.id)!.rejectionReason,
  }));
}
export async function adminQueue() {
  const db = getDb();
  const [listings, reportRows] = await Promise.all([
    db
      .select()
      .from(stalls)
      .where(
        sql`${stalls.status} = 'pending' or (${stalls.status} = 'approved' and ${stalls.ownerId} is null)`,
      )
      .orderBy(desc(stalls.createdAt))
      .limit(100),
    db
      .select({
        id: reports.id,
        stallId: reports.stallId,
        name: stalls.name,
        note: reports.note,
        createdAt: reports.createdAt,
      })
      .from(reports)
      .innerJoin(stalls, eq(stalls.id, reports.stallId))
      .where(isNull(reports.resolvedAt))
      .orderBy(desc(reports.createdAt))
      .limit(100),
  ]);
  return {
    listings: listings.map((s) => ({
      id: s.id,
      name: s.name,
      area: s.area,
      status: s.status,
      contactPhone: s.contactPhone,
      relationship: s.relationship,
      ownerId: s.ownerId,
    })),
    reports: reportRows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })),
  };
}
export async function moderate(
  id: string,
  input: z.infer<typeof moderationSchema>,
  viewer: Viewer,
) {
  if (viewer.role !== "admin") throw new ApiError(403, "Administrator access is required.");
  return getDb().transaction(async (tx) => {
    const [stall] = await tx.select().from(stalls).where(eq(stalls.id, id)).for("update");
    if (!stall) throw new ApiError(404, "Stall not found.");
    if (input.action === "approve") {
      if (stall.status !== "pending")
        throw new ApiError(409, "This submission has already been reviewed.");
      const images = await tx.select().from(stallPhotos).where(eq(stallPhotos.stallId, id));
      if (images.length !== 2)
        throw new ApiError(400, "A stall must have two photos before approval.");
      await tx
        .update(stalls)
        .set({
          status: "approved",
          ownerId: stall.ownerId ?? (stall.relationship === "mine" ? stall.submittedBy : null),
          approvedAt: new Date(),
          updatedAt: new Date(),
          rejectionReason: null,
        })
        .where(eq(stalls.id, id));
    } else if (input.action === "reject") {
      if (stall.status !== "pending")
        throw new ApiError(409, "This submission has already been reviewed.");
      await tx
        .update(stalls)
        .set({ status: "rejected", rejectionReason: input.reason, updatedAt: new Date() })
        .where(eq(stalls.id, id));
    } else if (input.action === "claim") {
      if (stall.status !== "approved")
        throw new ApiError(400, "Approve the stall before assigning an owner.");
      if (stall.ownerId) throw new ApiError(409, "This stall already has a verified owner.");
      const [owner] = await tx
        .select()
        .from(user)
        .where(
          and(sql`lower(${user.email}) = lower(${input.email})`, eq(user.emailVerified, true)),
        );
      if (!owner) throw new ApiError(400, "The owner must sign up and verify this email first.");
      await tx
        .update(stalls)
        .set({ ownerId: owner.id, updatedAt: new Date() })
        .where(eq(stalls.id, id));
    } else {
      if (stall.status !== "approved")
        throw new ApiError(400, "Only approved stalls can be marked closed.");
      await tx
        .update(stalls)
        .set({ closedUntil: new Date(Date.now() + input.hours * 3600000), updatedAt: new Date() })
        .where(eq(stalls.id, id));
      await tx.update(reports).set({ resolvedAt: new Date() }).where(eq(reports.stallId, id));
    }
    await tx
      .insert(auditLog)
      .values({
        actorId: viewer.id,
        stallId: id,
        action: input.action,
        details:
          input.action === "claim"
            ? { email: input.email, callConfirmed: true }
            : input.action === "reject"
              ? { reason: input.reason }
              : {},
      });
  });
}
