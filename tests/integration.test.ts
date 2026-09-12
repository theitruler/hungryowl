import { beforeAll, afterAll, describe, expect, it, vi } from "vitest";
import { config } from "dotenv";
import { createHmac, randomUUID } from "node:crypto";
import { unlink } from "node:fs/promises";
import path from "node:path";
import { and, eq, inArray, sql } from "drizzle-orm";
config({ path: ".env.local", quiet: true });
const context = vi.hoisted(() => ({ cookie: "" }));
vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ headers: async () => new Headers({ cookie: context.cookie }) }));
const run = process.env.RUN_DB_TESTS === "true" ? describe : describe.skip;
run("Neon development branch integration", () => {
  const ids = {
    submitter: `qa-${randomUUID()}`,
    owner: `qa-${randomUUID()}`,
    admin: `qa-${randomUUID()}`,
    other: `qa-${randomUUID()}`,
  };
  const images = [randomUUID(), randomUUID()];
  let stallId = "",
    getDb: typeof import("../src/db").getDb,
    tables: typeof import("../src/db/schema"),
    services: typeof import("../src/services/stalls"),
    getAuth: typeof import("../src/lib/auth").getAuth;
  const viewer = (id: string, role: "user" | "admin" = "user") => ({
    id,
    role,
    name: "QA Owl",
    email: `${id}@example.invalid`,
  });
  beforeAll(async () => {
    if (!process.env.DATABASE_URL?.includes("ep-wispy-field-a5kq8vj1"))
      throw new Error(
        "Database tests are restricted to the isolated HungryOwl development branch.",
      );
    process.env.DEMO_MODE = "false";
    process.env.UPLOAD_DIR = path.resolve("data/test-uploads");
    ({ getDb } = await import("../src/db"));
    tables = await import("../src/db/schema");
    services = await import("../src/services/stalls");
    ({ getAuth } = await import("../src/lib/auth"));
    await getDb()
      .insert(tables.user)
      .values(
        Object.values(ids).map((id) => ({
          id,
          name: "QA Owl",
          email: `${id}@example.invalid`,
          emailVerified: true,
          role: id === ids.admin ? ("admin" as const) : ("user" as const),
        })),
      );
    await getDb()
      .insert(tables.photos)
      .values(images.map((id) => ({ id, uploadedBy: ids.submitter })));
  });
  afterAll(async () => {
    if (!getDb) return;
    const db = getDb(),
      userIds = Object.values(ids);
    await db.delete(tables.auditLog).where(inArray(tables.auditLog.actorId, userIds));
    await db.delete(tables.reports).where(inArray(tables.reports.userId, userIds));
    await db.delete(tables.stalls).where(inArray(tables.stalls.submittedBy, userIds));
    const uploaded = await db
      .select()
      .from(tables.photos)
      .where(inArray(tables.photos.uploadedBy, userIds));
    for (const photo of uploaded) {
      const dir = path.resolve(process.env.UPLOAD_DIR!);
      const filename = path.resolve(dir, `${photo.id}.webp`);
      if (path.dirname(filename) !== dir) throw new Error("Unsafe test cleanup path.");
      await unlink(filename).catch((e: NodeJS.ErrnoException) => {
        if (e.code !== "ENOENT") throw e;
      });
    }
    await db.delete(tables.photos).where(inArray(tables.photos.uploadedBy, userIds));
    await db.delete(tables.user).where(inArray(tables.user.id, userIds));
    await db.delete(tables.verification).where(sql`${tables.verification.identifier} like 'qa-%'`);
    const globalDb = globalThis as unknown as { hungryPool?: { end: () => Promise<void> } };
    await globalDb.hungryPool?.end();
    globalDb.hungryPool = undefined;
  });
  it("creates a pending stall atomically with exactly two photos", async () => {
    const result = await services.createStall(
      {
        name: `QA Night Dosa ${ids.submitter}`,
        description: "Integration test fixture",
        area: "Koramangala",
        latitude: 12.9352,
        longitude: 77.6245,
        diets: ["veg"],
        opensAt: "00:00",
        closesAt: "00:00",
        menu: [{ name: "Dosa", price: 80, diet: "veg" }],
        relationship: "other",
        contactPhone: "9876543210",
        photoIds: images,
        locationCapturedAt: Date.now(),
        accuracy: 10,
      },
      viewer(ids.submitter),
    );
    stallId = result.id;
    const stall = await services.getStall(stallId, viewer(ids.submitter));
    expect(stall?.status).toBe("pending");
    expect(stall?.ownerId).toBeNull();
    expect(stall?.photos).toHaveLength(2);
    expect(stall).not.toHaveProperty("contactPhone");
  });
  it("hides pending listings from others and discovery", async () => {
    expect(await services.getStall(stallId, viewer(ids.other))).toBeNull();
    expect(
      (
        await services.nearby({ latitude: 12.9352, longitude: 77.6245, radius: 5, offset: 0 })
      ).stalls.some((s) => s.id === stallId),
    ).toBe(false);
  });
  it("rejects unauthorized moderation and ownership edits", async () => {
    await expect(
      services.moderate(stallId, { action: "approve" }, viewer(ids.submitter)),
    ).rejects.toMatchObject({ status: 403 });
    const original = await services.getStall(stallId, viewer(ids.submitter));
    await expect(
      services.updateStall(
        stallId,
        {
          name: "Changed",
          description: "",
          area: "Bangalore",
          diets: ["veg"],
          opensAt: "23:00",
          closesAt: "06:00",
          closedUntil: null,
          menu: [],
        },
        viewer(ids.other),
      ),
    ).rejects.toMatchObject({ status: 403 });
    expect(original?.name).toContain("QA Night Dosa");
  });
  it("allows approval once, then verified owner assignment", async () => {
    expect((await services.myStalls(viewer(ids.submitter))).some((s) => s.id === stallId)).toBe(true);
    await services.moderate(stallId, { action: "approve" }, viewer(ids.admin, "admin"));
    expect((await services.myStalls(viewer(ids.submitter))).some((s) => s.id === stallId)).toBe(true);
    expect((await services.getStall(stallId, viewer(ids.submitter)))?.ownerId).toBeNull();
    await expect(
      services.moderate(stallId, { action: "approve" }, viewer(ids.admin, "admin")),
    ).rejects.toMatchObject({ status: 409 });
    await expect(
      services.moderate(
        stallId,
        { action: "claim", email: "missing@example.invalid", callConfirmed: true },
        viewer(ids.admin, "admin"),
      ),
    ).rejects.toMatchObject({ status: 400 });
    await services.moderate(
      stallId,
      { action: "claim", email: `${ids.owner}@example.invalid`, callConfirmed: true },
      viewer(ids.admin, "admin"),
    );
    expect((await services.getStall(stallId, viewer(ids.owner)))?.ownerId).toBe(ids.owner);
    expect((await services.myStalls(viewer(ids.submitter))).some((s) => s.id === stallId)).toBe(false);
    expect((await services.myStalls(viewer(ids.owner))).find((s) => s.id === stallId)?.canManage).toBe(true);
    expect((await services.myStalls(viewer(ids.other))).some((s) => s.id === stallId)).toBe(false);
  });
  it("approves an own-stall submission without a separate owner assignment", async () => {
    const ownPhotos = [randomUUID(), randomUUID()];
    await getDb().insert(tables.photos).values(ownPhotos.map((id) => ({ id, uploadedBy: ids.submitter })));
    const ownStall = await services.createStall({
      name: `QA Own Stall ${ids.submitter}`,
      description: "Own-stall approval fixture", area: "Koramangala",
      latitude: 12.9352, longitude: 77.6245, diets: ["veg"],
      opensAt: "23:00", closesAt: "06:00", menu: [],
      relationship: "mine", contactPhone: "9876543210", photoIds: ownPhotos,
      locationCapturedAt: Date.now(), accuracy: 10,
    }, viewer(ids.submitter));
    await services.moderate(ownStall.id, { action: "approve" }, viewer(ids.admin, "admin"));
    expect(await services.getStall(ownStall.id, viewer(ids.submitter))).toMatchObject({
      status: "approved", ownerId: ids.submitter, canManage: true,
    });
    expect((await services.myStalls(viewer(ids.submitter))).some((s) => s.id === ownStall.id)).toBe(true);
    expect((await services.adminQueue()).listings.some((s) => s.id === ownStall.id)).toBe(false);
    await expect(services.moderate(ownStall.id, {
      action: "claim", email: `${ids.owner}@example.invalid`, callConfirmed: true,
    }, viewer(ids.admin, "admin"))).rejects.toMatchObject({ status: 409 });
  });
  it("upserts one rating per user and prevents owner self-ratings", async () => {
    await services.setRating(stallId, 3, viewer(ids.other));
    await services.setRating(stallId, 5, viewer(ids.other));
    const stall = await services.getStall(stallId, viewer(ids.other));
    expect(stall?.rating).toBe(5);
    expect(stall?.ratingCount).toBe(1);
    await expect(services.setRating(stallId, 5, viewer(ids.owner))).rejects.toMatchObject({
      status: 403,
    });
  });
  it("owner closure keeps the stall visible with its reopening time", async () => {
    expect(
      (
        await services.nearby({ latitude: 12.9352, longitude: 77.6245, radius: 5, offset: 0 })
      ).stalls.some((s) => s.id === stallId),
    ).toBe(true);
    await services.updateStall(
      stallId,
      {
        name: "QA temporarily closed",
        description: "",
        area: "Koramangala",
        diets: ["veg"],
        opensAt: "00:00",
        closesAt: "00:00",
        menu: [],
        closedUntil: new Date(Date.now() + 3600000).toISOString(),
      },
      viewer(ids.owner),
    );
    const nearby = await services.nearby({ latitude: 12.9352, longitude: 77.6245, radius: 5, offset: 0 });
    expect(nearby.stalls.find((s) => s.id === stallId)?.closedUntil).toBeTruthy();
  });
  it("deduplicates daily closure reports and allows admin resolution", async () => {
    await services.reportClosed(stallId, "Shutters closed", viewer(ids.other));
    await expect(services.reportClosed(stallId, "Again", viewer(ids.other))).rejects.toMatchObject({
      status: 409,
    });
    await services.moderate(stallId, { action: "close", hours: 12 }, viewer(ids.admin, "admin"));
    const [report] = await getDb()
      .select()
      .from(tables.reports)
      .where(and(eq(tables.reports.stallId, stallId), eq(tables.reports.userId, ids.other)));
    expect(report.resolvedAt).toBeInstanceOf(Date);
  });
  it("enforces database rating constraints", async () => {
    await expect(
      getDb().insert(tables.ratings).values({ stallId, userId: ids.submitter, stars: 8 }),
    ).rejects.toThrow();
  });
  it("validates signed sessions, upload access, CSRF, and logout using a test-only session", async () => {
    const auth = getAuth();
    const authContext = await auth.$context;
    const session = await authContext.internalAdapter.createSession(ids.other);
    const signature = createHmac("sha256", process.env.BETTER_AUTH_SECRET!)
      .update(session.token)
      .digest("base64");
    context.cookie =
      authContext.authCookies.sessionToken.name +
      "=" +
      encodeURIComponent(session.token + "." + signature);
    const { requireViewer, checkOrigin, requireAdmin } = await import("../src/lib/http");
    expect((await requireViewer()).id).toBe(ids.other);
    await expect(requireAdmin()).rejects.toMatchObject({ status: 403 });
    expect(() =>
      checkOrigin(
        new Request("http://127.0.0.1:3000/api/stalls", {
          headers: { origin: "https://attacker.invalid" },
        }),
      ),
    ).toThrow();
    const { POST: upload } = await import("../src/app/api/uploads/route");
    const sendPhoto = (file: File) => {
      const body = new FormData();
      body.set("photo", file);
      return upload(
        new Request(`${process.env.BETTER_AUTH_URL}/api/uploads`, {
          method: "POST",
          headers: { origin: process.env.BETTER_AUTH_URL! },
          body,
        }),
      );
    };
    expect(
      (await sendPhoto(new File(["<svg onload='alert(1)'/>"], "fake.jpg", { type: "image/jpeg" })))
        .status,
    ).toBe(400);
    const sharp = (await import("sharp")).default;
    const fixture = await sharp({
      create: { width: 256, height: 256, channels: 3, background: "#efc75e" },
    })
      .png()
      .toBuffer();
    const uploadResponse = await sendPhoto(
      new File([new Uint8Array(fixture)], "fixture.png", { type: "image/png" }),
    );
    expect(uploadResponse.status).toBe(201);
    const uploadedPhoto = await uploadResponse.json();
    const { GET: readPhoto } = await import("../src/app/api/photos/[id]/route");
    expect(
      (await readPhoto(new Request(`${process.env.BETTER_AUTH_URL}${uploadedPhoto.url}`))).status,
    ).toBe(200);
    const signedCookie = context.cookie;
    context.cookie = "";
    expect(
      (await readPhoto(new Request(`${process.env.BETTER_AUTH_URL}${uploadedPhoto.url}`))).status,
    ).toBe(404);
    const { POST: submitStall } = await import("../src/app/api/stalls/route");
    expect(
      (
        await submitStall(
          new Request(`${process.env.BETTER_AUTH_URL}/api/stalls`, {
            method: "POST",
            headers: { origin: process.env.BETTER_AUTH_URL!, "content-type": "application/json" },
            body: "{}",
          }),
        )
      ).status,
    ).toBe(401);
    context.cookie = signedCookie;
    await auth.api.signOut({ headers: new Headers({ cookie: context.cookie }) });
    await expect(requireViewer()).rejects.toMatchObject({ status: 401 });
    context.cookie = "";
  });
});
