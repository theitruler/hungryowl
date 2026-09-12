import { beforeEach, describe, expect, it, vi } from "vitest";
import { canManageStall, isStallOwner } from "../src/lib/stall-access";
import type { Viewer } from "../src/lib/config";
import { stallUpdateSchema } from "../src/lib/validation";

vi.mock("server-only", () => ({}));
vi.mock("../src/lib/auth", () => ({ getViewer: vi.fn() }));
const state = vi.hoisted(() => ({ row: {} as Record<string, unknown>, photoRows: [] as unknown[], updates: vi.fn(), inserts: vi.fn() }));
vi.mock("../src/db", async () => {
  const schema = await import("../src/db/schema");
  const db = {
    select: () => {
      let rows: unknown[] = [];
      const query = {
        from: (table: unknown) => { rows = table === schema.stalls ? [state.row] : table === schema.stallPhotos ? state.photoRows : []; return query; },
        where: () => query,
        orderBy: () => query,
        groupBy: () => query,
        for: () => Promise.resolve(rows),
        then: (resolve: (value: unknown[]) => void) => Promise.resolve(rows).then(resolve),
      };
      return query;
    },
    update: () => ({ set: (values: unknown) => { state.updates(values); return { where: async () => {} }; } }),
    insert: () => ({ values: state.inserts }),
    transaction: async (callback: (tx: unknown) => unknown) => callback(db),
  };
  return { getDb: () => db };
});
import { getStall, updateStall, setRating, moderate } from "../src/services/stalls";

const viewer: Viewer = { id: "submitter", name: "Test Owl", email: "test@example.invalid", role: "user" };
const other = { ...viewer, id: "other" };
const admin = { ...other, role: "admin" as const };
const ownership = { submittedBy: viewer.id, relationship: "mine" as const, ownerId: null };
const id = "00000000-0000-4000-8000-000000000001";
const edit = { name: "Edited stall", description: "Updated", area: "Bangalore", diets: ["veg" as const], opensAt: "23:00", closesAt: "06:00", closedUntil: null, menu: [{ name: "Dosa", price: 50, diet: "veg" as const }] };

beforeEach(() => {
  vi.clearAllMocks();
  state.photoRows = [];
  state.row = { ...edit, ...ownership, id, status: "pending", contactPhone: "9876543210", latitude: 12.9352, longitude: 77.6245, rejectionReason: null, createdAt: new Date(), approvedAt: null };
});

describe("stall approval ownership", () => {
  beforeEach(() => {
    state.photoRows = [{ photoId: "photo-one" }, { photoId: "photo-two" }];
  });

  it("assigns the submitter when approving their own stall", async () => {
    await moderate(id, { action: "approve" }, admin);
    expect(state.updates).toHaveBeenCalledWith(expect.objectContaining({
      status: "approved", ownerId: viewer.id, approvedAt: expect.any(Date),
    }));
  });

  it("leaves someone else's stall unassigned after approval", async () => {
    state.row.relationship = "other";
    await moderate(id, { action: "approve" }, admin);
    expect(state.updates).toHaveBeenCalledWith(expect.objectContaining({
      status: "approved", ownerId: null,
    }));
  });

  it("preserves an existing owner during approval", async () => {
    state.row.ownerId = other.id;
    await moderate(id, { action: "approve" }, admin);
    expect(state.updates).toHaveBeenCalledWith(expect.objectContaining({ ownerId: other.id }));
  });

  it("does not assign ownership when rejecting an own-stall submission", async () => {
    await moderate(id, { action: "reject", reason: "Details need correction" }, admin);
    expect(state.updates.mock.calls[0][0]).not.toHaveProperty("ownerId");
  });

  it("requires admin access and two photos before approving ownership", async () => {
    await expect(moderate(id, { action: "approve" }, viewer)).rejects.toMatchObject({ status: 403 });
    state.photoRows = [];
    await expect(moderate(id, { action: "approve" }, admin)).rejects.toMatchObject({ status: 400 });
    expect(state.updates).not.toHaveBeenCalled();
  });
});

describe("stall management permissions", () => {
  it("grants My stall submitters access immediately, without requiring verification", async () => {
    expect(canManageStall(ownership, viewer)).toBe(true);
    await updateStall(id, edit, viewer);
    expect(state.updates).toHaveBeenCalledWith(expect.objectContaining({ menu: edit.menu, opensAt: "23:00" }));
    expect(state.updates.mock.calls[0][0]).not.toHaveProperty("status");
    expect((await getStall(id, viewer))?.canManage).toBe(true);
  });
  it("blocks Someone else’s stall submitters at the service boundary", async () => {
    state.row.relationship = "other";
    await expect(updateStall(id, edit, viewer)).rejects.toMatchObject({ status: 403 });
    expect(state.updates).not.toHaveBeenCalled();
    expect((await getStall(id, viewer))?.canManage).toBe(false);
  });
  it("blocks strangers and signed-out viewers", async () => {
    expect(canManageStall(ownership, null)).toBe(false);
    await expect(updateStall(id, edit, other)).rejects.toMatchObject({ status: 403 });
    expect(await getStall(id, other)).toBeNull();
  });
  it("uses the assigned owner once admin verification is complete", async () => {
    state.row.ownerId = other.id;
    expect(isStallOwner({ ...ownership, ownerId: other.id }, viewer)).toBe(false);
    await expect(updateStall(id, edit, viewer)).rejects.toMatchObject({ status: 403 });
    await updateStall(id, edit, other);
    await updateStall(id, edit, admin);
    expect(state.updates).toHaveBeenCalledTimes(2);
  });
  it("prevents self-declared owners rating their own approved stalls", async () => {
    state.row.status = "approved";
    await expect(setRating(id, 5, viewer)).rejects.toMatchObject({ status: 403 });
    expect(state.inserts).not.toHaveBeenCalled();
  });
  it("only includes private submission details for authorized viewers", async () => {
    const review = await getStall(id, admin);
    expect(review?.submission).toMatchObject({ relationship: "mine", contactPhone: "9876543210" });
    state.row.status = "approved";
    expect(await getStall(id, other)).not.toHaveProperty("submission");
    expect(await getStall(id, null)).not.toHaveProperty("submission");
  });
  it("does not let edit input change relationship or ownership", () => {
    const parsed = stallUpdateSchema.parse({ ...edit, relationship: "mine", ownerId: viewer.id, submittedBy: viewer.id });
    expect(parsed).not.toHaveProperty("relationship");
    expect(parsed).not.toHaveProperty("ownerId");
    expect(parsed).not.toHaveProperty("submittedBy");
  });
});
