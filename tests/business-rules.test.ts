import { describe, it, expect } from "vitest";
import {
  distanceKm,
  isOpen,
  servesLateNight,
  formatTime,
  isNew,
  inBangalore,
} from "../src/lib/geo-time";
import {
  nearbySchema,
  stallCreateSchema,
  stallUpdateSchema,
  ratingSchema,
  moderationSchema,
} from "../src/lib/validation";
const hours = { opensAt: "23:00", closesAt: "06:00", closedUntil: null };
const at = (local: string) => new Date(`2026-09-10T${local}:00+05:30`);
describe("Bangalore overnight opening hours", () => {
  it.each([
    ["22:59", false],
    ["23:00", true],
    ["23:59", true],
    ["00:00", true],
    ["05:59", true],
    ["06:00", false],
    ["12:00", false],
  ])("at %s open=%s", (time, expected) => expect(isOpen(hours, at(time))).toBe(expected));
  it("temporary closure overrides saved hours until expiry", () => {
    const stall = { ...hours, closedUntil: at("03:00").toISOString() };
    expect(isOpen(stall, at("02:00"))).toBe(false);
    expect(isOpen(stall, at("03:00"))).toBe(true);
  });
  it("same-day early morning hours have exclusive closing boundaries", () => {
    const stall = { opensAt: "01:00", closesAt: "05:00", closedUntil: null };
    expect(isOpen(stall, at("00:59"))).toBe(false);
    expect(isOpen(stall, at("01:00"))).toBe(true);
    expect(isOpen(stall, at("05:00"))).toBe(false);
  });
  it("equal opening and closing hours explicitly mean 24 hours", () =>
    expect(isOpen({ opensAt: "00:00", closesAt: "00:00", closedUntil: null }, at("12:00"))).toBe(
      true,
    ));
  it("rejects stalls whose hours never overlap the night window", () => {
    expect(servesLateNight("06:00", "23:00")).toBe(false);
    expect(servesLateNight("22:00", "02:00")).toBe(true);
    expect(servesLateNight("23:30", "23:50")).toBe(true);
  });
  it("formats midnight and noon correctly", () => {
    expect(formatTime("00:00")).toBe("12 am");
    expect(formatTime("12:30")).toBe("12:30 pm");
  });
  it("new badges start at approval and expire after 14 days", () => {
    expect(isNew(null, at("01:00"))).toBe(false);
    expect(isNew("2026-09-01T00:00:00Z", new Date("2026-09-14T23:59:59Z"))).toBe(true);
    expect(isNew("2026-09-01T00:00:00Z", new Date("2026-09-15T00:00:00Z"))).toBe(false);
  });
});
describe("location and input rules", () => {
  const point = { latitude: 12.9352, longitude: 77.6245 };
  const valid = () => ({
    name: "Night Dosa",
    description: "",
    area: "Koramangala",
    ...point,
    locationCapturedAt: Date.now(),
    accuracy: 15,
    diets: ["veg"],
    opensAt: "23:00",
    closesAt: "06:00",
    menu: [],
    relationship: "other",
    contactPhone: "9876543210",
    photoIds: ["00000000-0000-4000-8000-000000000001", "00000000-0000-4000-8000-000000000002"],
  });
  it("calculates zero and known approximate distances", () => {
    expect(distanceKm(point, point)).toBe(0);
    expect(distanceKm({ latitude: 0, longitude: 0 }, { latitude: 1, longitude: 0 })).toBeCloseTo(
      111.195,
      2,
    );
  });
  it("restricts submissions to the Bangalore launch boundary", () => {
    expect(inBangalore(point)).toBe(true);
    expect(
      stallCreateSchema.safeParse({ ...valid(), latitude: 19.07, longitude: 72.87 }).success,
    ).toBe(false);
  });
  it("requires fresh accurate GPS and two unique photos", () => {
    expect(stallCreateSchema.safeParse(valid()).success).toBe(true);
    expect(stallCreateSchema.safeParse({ ...valid(), accuracy: 300 }).success).toBe(false);
    expect(
      stallCreateSchema.safeParse({ ...valid(), locationCapturedAt: Date.now() - 660000 }).success,
    ).toBe(false);
    const photo = valid().photoIds[0];
    expect(stallCreateSchema.safeParse({ ...valid(), photoIds: [photo, photo] }).success).toBe(
      false,
    );
  });
  it("rejects invalid prices, time strings, radius and ratings", () => {
    expect(stallCreateSchema.safeParse({ ...valid(), opensAt: "25:00" }).success).toBe(false);
    expect(
      stallCreateSchema.safeParse({ ...valid(), menu: [{ name: "Dosa", price: -1, diet: "veg" }] })
        .success,
    ).toBe(false);
    expect(nearbySchema.safeParse({ ...point, radius: 31 }).success).toBe(false);
    expect(ratingSchema.safeParse({ stars: 5.1 }).success).toBe(false);
  });
  it("requires explicit completed phone verification to claim", () => {
    expect(
      moderationSchema.safeParse({
        action: "claim",
        email: "owner@example.com",
        callConfirmed: false,
      }).success,
    ).toBe(false);
  });
  it("strips attempts to self-assign status or ownership", () => {
    const result = stallCreateSchema.parse({ ...valid(), status: "approved", ownerId: "attacker" });
    expect(result).not.toHaveProperty("status");
    expect(result).not.toHaveProperty("ownerId");
  });
  it("requires all GPS fields when relocating a stall", () => {
    expect(
      stallUpdateSchema.safeParse({ ...valid(), closedUntil: null, location: point }).success,
    ).toBe(false);
  });
});
