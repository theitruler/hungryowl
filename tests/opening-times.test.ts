import { describe, expect, it } from "vitest";
import { nextOpening, openingLabel } from "../src/lib/geo-time";

const stall = { opensAt: "23:00", closesAt: "06:00", closedUntil: null as string | null };
const at = (time: string) => new Date(`2026-09-11T${time}:00+05:30`);
describe("next opening in Bangalore time", () => {
  it("shows a countdown before opening and handles the exact opening boundary", () => {
    expect(nextOpening(stall, at("20:30"))).toEqual(at("23:00"));
    expect(openingLabel(stall, at("20:30"))).toContain("Opens in 2h 30m");
    expect(openingLabel(stall, at("23:00"))).toBe("Open now");
  });
  it("keeps overnight hours open after midnight and excludes the closing boundary", () => {
    expect(nextOpening(stall, at("02:00"))).toBeNull();
    expect(nextOpening(stall, at("06:00"))).toEqual(at("23:00"));
  });
  it("finds the next day for same-day early morning stalls", () => {
    expect(nextOpening({ ...stall, opensAt: "01:00", closesAt: "05:00" }, at("06:00")))
      .toEqual(new Date("2026-09-12T01:00:00+05:30"));
  });
  it("resumes at the end of a temporary closure during opening hours", () => {
    expect(nextOpening({ ...stall, closedUntil: at("03:00").toISOString() }, at("01:00"))).toEqual(at("03:00"));
  });
  it("waits for normal hours if a temporary closure ends during closed hours", () => {
    expect(nextOpening({ ...stall, closedUntil: at("10:00").toISOString() }, at("01:00"))).toEqual(at("23:00"));
  });
  it("handles 24-hour stalls and multi-day closures", () => {
    const allDay = { opensAt: "00:00", closesAt: "00:00", closedUntil: null };
    expect(nextOpening(allDay, at("12:00"))).toBeNull();
    expect(openingLabel({ ...allDay, closedUntil: "2026-09-13T14:00:00+05:30" }, at("12:00")))
      .toContain("Opens in 2d 2h");
  });
  it("ignores expired closures and rounds partial minutes up", () => {
    expect(openingLabel({ ...stall, closedUntil: at("00:00").toISOString() }, at("02:00"))).toBe("Open now");
    expect(openingLabel(stall, new Date("2026-09-11T22:59:30+05:30"))).toContain("Opens in 1m");
  });
});
